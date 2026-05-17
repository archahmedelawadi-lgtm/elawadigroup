import os
import json
import hashlib
import secrets
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, make_response
from werkzeug.exceptions import RequestEntityTooLarge
import urllib.request
import urllib.error
import unicodedata

app = Flask(__name__)
# Allow up to 500MB file uploads
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024 

@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(_error):
    return jsonify({
        "ok": False,
        "message": "حجم الملف أكبر من الحد المسموح (500MB)"
    }), 413

@app.after_request
def add_security_headers(response):
    # Dynamic CORS headers based on allowed origins
    origin = (request.headers.get("Origin") or "").strip()
    allowed = get_allowed_origins()
    if origin and (origin in allowed or "*" in allowed):
        response.headers['Access-Control-Allow-Origin'] = origin if "*" not in allowed else "*"
    response.headers['Vary'] = 'Origin'
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    
    # Add ORB/CORB protection headers
    if 'X-Content-Type-Options' not in response.headers:
        response.headers.add('X-Content-Type-Options', 'nosniff')
        
    # Add Referrer-Policy to help with cross-origin images like Unsplash
    response.headers.add('Referrer-Policy', 'no-referrer-when-downgrade')
        
    return response

@app.route('/api/exchange-rate', methods=['GET'])
def exchange_rate():
    result = get_highest_usd_egp_rate()
    status = 200 if result.get("ok") else 502
    return jsonify(result), status

@app.route('/api/<path:_path>', methods=['OPTIONS'])
def api_options(_path):
    return ("", 204)

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "content.json"
SESSIONS_FILE = BASE_DIR / "data" / "sessions.json"
MESSAGES_FILE = BASE_DIR / "data" / "messages.json"
UPLOADS_DIR = BASE_DIR / "uploads"

SESSION_EXPIRY = 86400  # Increase to 24 hours for better stability
MESSAGE_RATE_LIMIT_WINDOW_SEC = 60
MESSAGE_RATE_LIMIT_MAX_REQUESTS = 8
MESSAGE_RATE_LIMIT_BUCKETS = defaultdict(list)
SENSITIVE_PATH_PARTS = {
    ".env", ".git", ".gitignore", "env", "env.example", ".htaccess",
    "sessions.json", "messages.json", "admin_auth.json"
}
ARABIC_DIGITS_MAP = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")

def load_env_file():
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    os.environ[key] = value
            print(">>> Environment variables loaded from .env")
        except Exception as e:
            print(f">>> Error loading .env: {e}")

def get_allowed_origins():
    load_env_file()
    allowed_origins_raw = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
    if not allowed_origins_raw:
        return set()
    return {item.strip().rstrip('/') for item in allowed_origins_raw.split(",") if item.strip()}

def normalize_credential(value, lowercase=False):
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = (
        text.replace("\u200b", "")
        .replace("\u200c", "")
        .replace("\u200d", "")
        .replace("\u200e", "")
        .replace("\u200f", "")
        .replace("\u061c", "")
        .strip()
    )
    text = text.translate(ARABIC_DIGITS_MAP)
    return text.lower() if lowercase else text

def get_admin_credentials():
    auth_store = get_auth_store()
    stored_user = normalize_credential((auth_store.get("admin_user") or ""), lowercase=True)
    stored_hash = str(auth_store.get("admin_pass_hash") or "").strip().lower()
    if stored_user and len(stored_hash) == 64 and all(ch in "0123456789abcdef" for ch in stored_hash):
        return stored_user, stored_hash

    load_env_file()
    admin_user = normalize_credential((os.environ.get("ADMIN_USER", "admin") or "admin"), lowercase=True) or "admin"
    admin_hash_raw = (os.environ.get("ADMIN_PASS_HASH") or "").strip().lower()
    admin_password_raw = (os.environ.get("ADMIN_PASSWORD") or "").strip()

    if len(admin_hash_raw) == 64 and all(ch in "0123456789abcdef" for ch in admin_hash_raw):
        return admin_user, admin_hash_raw
    if admin_password_raw:
        return admin_user, hashlib.sha256(admin_password_raw.encode()).hexdigest()

    # Safe fallback for development only if env is not configured.
    return admin_user, hashlib.sha256("change-me-now".encode()).hexdigest()

def get_client_ip():
    forwarded_for = (request.headers.get("X-Forwarded-For") or "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return (request.remote_addr or "unknown").strip()

def is_sensitive_path(path):
    normalized = str(path or "").replace("\\", "/").strip().lower()
    if not normalized:
        return False
    parts = [p for p in normalized.split("/") if p]
    return any(p in SENSITIVE_PATH_PARTS or p.startswith(".env") for p in parts)

def is_rate_limited(ip):
    now = time.time()
    window_start = now - MESSAGE_RATE_LIMIT_WINDOW_SEC
    bucket = MESSAGE_RATE_LIMIT_BUCKETS[ip]
    bucket[:] = [ts for ts in bucket if ts > window_start]
    if len(bucket) >= MESSAGE_RATE_LIMIT_MAX_REQUESTS:
        return True
    bucket.append(now)
    return False

def ensure_storage():
    load_env_file()
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("{}", encoding="utf-8")
    if not SESSIONS_FILE.exists():
        SESSIONS_FILE.write_text("{}", encoding="utf-8")
    if not MESSAGES_FILE.exists():
        MESSAGES_FILE.write_text("[]", encoding="utf-8")

def get_sessions():
    try:
        if SESSIONS_FILE.exists():
            raw = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict) and "tokens" in raw and isinstance(raw.get("tokens"), dict):
                return raw.get("tokens", {})
            if isinstance(raw, dict):
                return raw
    except:
        pass
    return {}

def save_sessions(sessions):
    try:
        sessions = sessions if isinstance(sessions, dict) else {}
        auth_store = get_auth_store()
        auth_store["tokens"] = sessions
        save_auth_store(auth_store)
    except:
        pass

def get_auth_store():
    try:
        if SESSIONS_FILE.exists():
            raw = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                if "tokens" in raw:
                    return {
                        "tokens": raw.get("tokens", {}) if isinstance(raw.get("tokens"), dict) else {},
                        "admin_user": str(raw.get("admin_user") or "").strip(),
                        "admin_pass_hash": str(raw.get("admin_pass_hash") or "").strip().lower()
                    }
                return {
                    "tokens": raw if isinstance(raw, dict) else {},
                    "admin_user": "",
                    "admin_pass_hash": ""
                }
    except Exception:
        pass
    return {"tokens": {}, "admin_user": "", "admin_pass_hash": ""}

def save_auth_store(store):
    payload = {
        "tokens": store.get("tokens", {}) if isinstance(store.get("tokens"), dict) else {},
        "admin_user": str(store.get("admin_user") or "").strip(),
        "admin_pass_hash": str(store.get("admin_pass_hash") or "").strip().lower()
    }
    SESSIONS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

def _extract_token():
    # 1) Standard Authorization header
    token = (request.headers.get("Authorization") or "").strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    if token:
        return token

    # 2) Custom header (more reliable behind some proxies)
    token = (request.headers.get("X-Admin-Token") or "").strip()
    if token:
        return token

    # 3) Query parameter fallback
    token = (request.args.get("token") or "").strip()
    if token:
        return token

    # 4) JSON body fallback
    data = request.get_json(silent=True) or {}
    token = (data.get("_token") or data.get("token") or "").strip()
    if token:
        return token

    # 5) Form field fallback
    token = (request.form.get("_token") or request.form.get("token") or "").strip()
    return token

def is_authorized():
    token = _extract_token()
    if not token:
        return False
    
    sessions = get_sessions()
    if token in sessions and time.time() < sessions[token]:
        # Update expiry and save
        sessions[token] = time.time() + SESSION_EXPIRY
        save_sessions(sessions)
        return True
    return False

def get_highest_usd_egp_rate():
    sources = [
        ("open_er_api", "https://open.er-api.com/v6/latest/USD"),
        ("frankfurter", "https://api.frankfurter.app/latest?from=USD&to=EGP"),
        ("exchangerate_host", "https://api.exchangerate.host/latest?base=USD&symbols=EGP")
    ]
    rates = []
    errors = []

    for source_name, url in sources:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as response:
                raw = response.read().decode("utf-8", errors="replace")
                data = json.loads(raw)

            rate = None
            if isinstance(data, dict):
                rates_obj = data.get("rates")
                if isinstance(rates_obj, dict):
                    rate = rates_obj.get("EGP")
                if rate is None and "result" in data and isinstance(data.get("result"), (int, float)):
                    rate = data.get("result")

            rate_value = float(rate) if rate is not None else 0.0
            if rate_value > 0:
                rates.append({"source": source_name, "rate": rate_value})
            else:
                errors.append(f"{source_name}: invalid rate")
        except Exception as e:
            errors.append(f"{source_name}: {str(e)}")

    if not rates:
        return {
            "ok": False,
            "message": "تعذر جلب سعر الصرف من المصادر الخارجية",
            "errors": errors
        }

    max_item = max(rates, key=lambda x: x["rate"])
    return {
        "ok": True,
        "base": "USD",
        "target": "EGP",
        "rate": round(max_item["rate"], 4),
        "source": max_item["source"],
        "sources": rates,
        "updatedAt": datetime.now().isoformat(),
        "errors": errors
    }

# Routes
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html', mimetype='text/html')

@app.route('/admin.html')
def admin_page():
    return send_from_directory(BASE_DIR, 'admin.html', mimetype='text/html')

@app.route('/.env')
@app.route('/data/sessions.json')
@app.route('/data/messages.json')
@app.route('/data/content.json')
def block_sensitive_files(path=None):
    return jsonify({"error": "Access Denied"}), 403

@app.route('/portfolio.html')
def portfolio_page():
    return send_from_directory(BASE_DIR, 'portfolio.html', mimetype='text/html')

@app.route('/project-detail.html')
def project_detail_page():
    return send_from_directory(BASE_DIR, 'project-detail.html', mimetype='text/html')

@app.route('/services.html')
def services_page():
    return send_from_directory(BASE_DIR, 'services.html', mimetype='text/html')

@app.route('/blog.html')
def blog_page():
    return send_from_directory(BASE_DIR, 'blog.html', mimetype='text/html')

@app.route('/contact.html')
def contact_page():
    return send_from_directory(BASE_DIR, 'contact.html', mimetype='text/html')

@app.route('/about.html')
def about_page():
    return send_from_directory(BASE_DIR, 'about.html', mimetype='text/html')

@app.route('/courses.html')
def courses_page():
    return send_from_directory(BASE_DIR, 'courses.html', mimetype='text/html')

@app.route('/robots.txt')
def robots_file():
    return send_from_directory(BASE_DIR, 'robots.txt', mimetype='text/plain')

@app.route('/sitemap.xml')
def sitemap_file():
    return send_from_directory(BASE_DIR, 'sitemap.xml', mimetype='application/xml')

@app.route('/manifest.webmanifest')
def manifest_file():
    return send_from_directory(BASE_DIR, 'manifest.webmanifest', mimetype='application/manifest+json')

@app.route('/404.html')
def not_found_page():
    return send_from_directory(BASE_DIR, '404.html', mimetype='text/html')

@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    if is_sensitive_path(filename):
        return jsonify({"error": "Access Denied"}), 403
    return send_from_directory(UPLOADS_DIR, filename)

def get_branding_favicon_filename():
    """Return uploads filename for favicon, fallback to branding logo."""
    try:
        ensure_storage()
        if not DATA_FILE.exists():
            return None
        payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        branding = payload.get("branding") if isinstance(payload, dict) else {}
        if not isinstance(branding, dict):
            return None
        raw = (branding.get("favicon") or branding.get("logo") or "").strip()
        if not raw:
            return None
        if raw.startswith("http://") or raw.startswith("https://") or raw.startswith("data:"):
            return None

        normalized = raw.replace("\\", "/").lstrip("/")
        if normalized.startswith("uploads/"):
            filename = normalized[len("uploads/"):]
        else:
            filename = normalized
        filename = filename.strip("/")
        if not filename:
            return None

        candidate = (UPLOADS_DIR / filename).resolve()
        uploads_root = UPLOADS_DIR.resolve()
        if not str(candidate).startswith(str(uploads_root)):
            return None
        if not candidate.exists():
            return None
        return filename
    except Exception:
        return None

@app.route('/favicon.ico')
def dynamic_favicon():
    filename = get_branding_favicon_filename()
    if filename:
        return send_from_directory(UPLOADS_DIR, filename)
    fallback = BASE_DIR / "favicon.ico"
    if fallback.exists():
        return send_from_directory(BASE_DIR, "favicon.ico")
    return ("", 204)

@app.route('/api/content', methods=['GET'])
def get_content():
    ensure_storage()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        response = make_response(f.read())
        response.headers['Content-Type'] = 'application/json'
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        return response

@app.route('/api/content/admin', methods=['GET'])
def get_content_admin():
    ensure_storage()
    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        response = make_response(f.read())
        response.headers['Content-Type'] = 'application/json'
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        return response

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = normalize_credential(data.get("username", ""), lowercase=True)
    password = normalize_credential(data.get("password", ""), lowercase=False)
    admin_user, admin_pass_hash = get_admin_credentials()
    
    is_valid = False
    if username == admin_user:
        if hashlib.sha256(password.encode('utf-8')).hexdigest() == admin_pass_hash:
            is_valid = True
            
    if is_valid:
        token = secrets.token_hex(32)
        ensure_storage()
        sessions = get_sessions()
        sessions[token] = time.time() + SESSION_EXPIRY
        save_sessions(sessions)
        return jsonify({"ok": True, "token": token})
        
    return jsonify({"ok": False, "message": "اسم المستخدم أو كلمة المرور غير صحيحة"}), 401

@app.route('/api/content', methods=['POST'])
def save_content():
    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401
    
    ensure_storage()
    payload = request.get_json(silent=True) or {}
    payload.pop("_token", None)
    payload.pop("token", None)
    import time
    payload["_savedAt"] = time.time()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return jsonify({"ok": True, "savedAt": payload["_savedAt"]})

@app.route('/api/admin/credentials', methods=['GET'])
def get_admin_credentials_info():
    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401
    admin_user, _ = get_admin_credentials()
    return jsonify({"ok": True, "username": admin_user})

@app.route('/api/admin/credentials', methods=['POST'])
def update_admin_credentials():
    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    current_password = normalize_credential(payload.get("currentPassword", ""), lowercase=False)
    new_username = normalize_credential(payload.get("newUsername", ""), lowercase=True)
    new_password = normalize_credential(payload.get("newPassword", ""), lowercase=False)

    if not current_password:
        return jsonify({"ok": False, "message": "يرجى إدخال كلمة المرور الحالية"}), 400
    if not new_username or len(new_username) < 3:
        return jsonify({"ok": False, "message": "اسم المستخدم الجديد يجب أن يكون 3 أحرف على الأقل"}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({"ok": False, "message": "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"}), 400

    current_user, current_hash = get_admin_credentials()
    if hashlib.sha256(current_password.encode('utf-8')).hexdigest() != current_hash:
        return jsonify({"ok": False, "message": "كلمة المرور الحالية غير صحيحة"}), 400

    auth_store = get_auth_store()
    auth_store["admin_user"] = new_username
    auth_store["admin_pass_hash"] = hashlib.sha256(new_password.encode('utf-8')).hexdigest()

    current_token = _extract_token()
    sessions = get_sessions()
    auth_store["tokens"] = {current_token: sessions[current_token]} if current_token in sessions else {}
    save_auth_store(auth_store)

    return jsonify({"ok": True, "message": "تم تحديث بيانات الدخول بنجاح", "username": new_username})

@app.route('/api/logout', methods=['POST'])
def logout_api():
    token = _extract_token()
    if token:
        sessions = get_sessions()
        if token in sessions:
            del sessions[token]
            save_sessions(sessions)
    return jsonify({"ok": True})

@app.route('/api/messages', methods=['POST'])
def submit_message():
    ensure_storage()
    data = request.json
    if not data:
        return jsonify({"ok": False, "message": "No data provided"}), 400

    if is_rate_limited(get_client_ip()):
        return jsonify({"ok": False, "message": "طلبات كثيرة جدًا، حاول مرة أخرى بعد دقيقة"}), 429
    
    # Simple validation
    required = ["name", "phone", "message"]
    if not all(k in data for k in required):
        return jsonify({"ok": False, "message": "Missing fields"}), 400
    if len(str(data.get("name", "")).strip()) > 120 or len(str(data.get("message", "")).strip()) > 4000:
        return jsonify({"ok": False, "message": "البيانات المرسلة أطول من الحد المسموح"}), 400
        
    new_msg = {
        "id": secrets.token_hex(8),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "name": data["name"],
        "phone": data["phone"],
        "email": data.get("email", ""),
        "projectType": data.get("projectType", ""),
        "message": data["message"]
    }
    
    try:
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            messages = json.load(f)
    except:
        messages = []
        
    messages.insert(0, new_msg) # Newest first
    
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)
        
    return jsonify({"ok": True})

@app.route('/api/messages', methods=['GET'])
def get_messages():
    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401
    
    ensure_storage()
    try:
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            return f.read(), 200, {'Content-Type': 'application/json'}
    except:
        return jsonify([])

@app.route('/api/messages/<msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401
    
    ensure_storage()
    try:
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            messages = json.load(f)
        
        filtered = [m for m in messages if m["id"] != msg_id]
        
        with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
            json.dump(filtered, f, ensure_ascii=False, indent=2)
            
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500

@app.route('/api/courses/enroll', methods=['POST'])
def enroll_course():
    try:
        data = request.get_json(silent=True) or {}
        course_id = data.get("courseId")
        course_title = data.get("courseTitle")
        is_free = data.get("isFree", False)
        payment_verified = bool(data.get("paymentVerified", False))

        if not is_free and not payment_verified:
            return jsonify({
                "ok": False,
                "message": "لا يمكن تأكيد الاشتراك قبل تحقق الدفع فعليًا."
            }), 400

        print(">>> Enrollment Request Received")
        
        # Ensure data/enrollments.json exists and is writable
        enrollments_file = BASE_DIR / "data" / "enrollments.json"
        ensure_storage()
        
        enrollment_record = {
            "id": f"enroll_{int(time.time())}",
            "courseId": course_id,
            "courseTitle": course_title,
            "isFree": is_free,
            "timestamp": datetime.now().isoformat(),
            "status": "completed"
        }
        
        existing = []
        if enrollments_file.exists():
            try:
                with open(enrollments_file, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
            except:
                existing = []
        
        existing.append(enrollment_record)
        with open(enrollments_file, 'w', encoding='utf-8') as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
            
        return jsonify({
            "ok": True,
            "message": "تم تفعيل الكورس بنجاح" if is_free else "تم تأكيد الدفع وتفعيل الكورس بنجاح",
            "enrollmentId": enrollment_record["id"]
        })
    except Exception as e:
        print(f"!!! Enrollment Error: {str(e)}")
        return jsonify({"ok": False, "message": f"خطأ في السيرفر: {str(e)}"}), 500

def read_env_any(*names, default=""):
    for name in names:
        value = os.environ.get(name)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default

def to_int(value, fallback=0):
    try:
        return int(str(value).strip())
    except Exception:
        return fallback

@app.route('/api/paymob/token', methods=['POST'])
def paymob_token():
    try:
        data = request.get_json(silent=True) or {}
        amount = float(data.get('amount', 0))
        country_code = data.get('countryCode', 'EG')
        currency_mode = data.get('currencyMode', 'auto_by_country')
        requested_currency = data.get('currency', 'EGP')

        if currency_mode == "auto_by_country":
            currency = "EGP" if country_code == "EG" else "USD"
        else:
            currency = "USD" if requested_currency == "USD" else "EGP"

        # Support both legacy typo (PAZMOB_*) and correct (PAYMOB_*) env names.
        paymob_api_key = read_env_any('PAYMOB_API_KEY', 'PAZMOB_API_KEY')
        paymob_merchant_id = read_env_any('PAYMOB_MERCHANT_ID', 'PAZMOB_MERCHANT_ID')
        
        print(f">>> Paymob Request: Amount={amount}, Currency={currency}")
        print(f">>> Paymob API Key (first 10): {paymob_api_key[:10]}...")
        paymob_integration_id_raw = read_env_any('PAYMOB_INTEGRATION_ID', 'PAZMOB_INTEGRATION_ID')
        paymob_iframe_id_raw = read_env_any('PAYMOB_IFRAME_ID', 'PAZMOB_IFRAME_ID', default='0')
        # Optional per-currency overrides (recommended to avoid signature mismatch).
        paymob_integration_id_egp_raw = read_env_any('PAYMOB_INTEGRATION_ID_EGP', 'PAZMOB_INTEGRATION_ID_EGP')
        paymob_integration_id_usd_raw = read_env_any('PAYMOB_INTEGRATION_ID_USD', 'PAZMOB_INTEGRATION_ID_USD')
        paymob_iframe_id_egp_raw = read_env_any('PAYMOB_IFRAME_ID_EGP', 'PAZMOB_IFRAME_ID_EGP')
        paymob_iframe_id_usd_raw = read_env_any('PAYMOB_IFRAME_ID_USD', 'PAZMOB_IFRAME_ID_USD')

        if amount <= 0:
            return jsonify({"success": False, "message": "Invalid amount"}), 400

        if not paymob_api_key:
            return jsonify({"success": False, "message": "PAYMOB_API_KEY is missing on server"}), 200

        paymob_integration_id_default = to_int(paymob_integration_id_raw, 0)
        paymob_iframe_id_default = to_int(paymob_iframe_id_raw, 0)
        paymob_integration_id_egp = to_int(paymob_integration_id_egp_raw, 0)
        paymob_integration_id_usd = to_int(paymob_integration_id_usd_raw, 0)
        paymob_iframe_id_egp = to_int(paymob_iframe_id_egp_raw, 0)
        paymob_iframe_id_usd = to_int(paymob_iframe_id_usd_raw, 0)

        if currency == "USD":
            paymob_integration_id = paymob_integration_id_usd or paymob_integration_id_default
            paymob_iframe_id = paymob_iframe_id_usd or paymob_iframe_id_default
        else:
            paymob_integration_id = paymob_integration_id_egp or paymob_integration_id_default
            paymob_iframe_id = paymob_iframe_id_egp or paymob_iframe_id_default

        print(f">>> Selected Integration ID: {paymob_integration_id}")
        print(f">>> Selected Iframe ID: {paymob_iframe_id}")

        if paymob_integration_id <= 0:
            return jsonify({
                "success": False,
                "message": f"PAYMOB_INTEGRATION_ID invalid or missing for {currency}",
                "details": "يمكنك ضبط PAYMOB_INTEGRATION_ID_EGP و PAYMOB_INTEGRATION_ID_USD"
            }), 200

        if paymob_iframe_id <= 0:
            return jsonify({
                "success": False,
                "message": f"PAYMOB_IFRAME_ID invalid or missing for {currency}",
                "details": "استخدم iframe id من نفس بيئة Paymob (test/live) ونفس العملة. متغيرات مقترحة: PAYMOB_IFRAME_ID_EGP / PAYMOB_IFRAME_ID_USD"
            }), 200

        # 1. Get Auth Token
        token_url = "https://accept.paymob.com/api/auth/tokens"
        token_data = json.dumps({"api_key": paymob_api_key}).encode()
        token_req = urllib.request.Request(token_url, data=token_data, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(token_req, timeout=30) as token_response:
            token_raw = token_response.read().decode("utf-8", errors="replace")
            print(f">>> Paymob Token Response: {token_raw[:100]}...") # Log first 100 chars
            token_result = json.loads(token_raw)
            token = token_result.get('token')

        if not token:
            print(f"!!! Failed to get Paymob token. Response: {token_raw}")
            raise Exception("Failed to get Paymob token")

        # 2. Create Order
        order_url = "https://accept.paymob.com/api/ecommerce/orders"
        order_data = json.dumps({
            "auth_token": token,
            "delivery_needed": "false",
            "amount_cents": int(amount * 100),
            "currency": currency,
            "items": [],
            "merchant_id": paymob_merchant_id or None
        }).encode()
        order_req = urllib.request.Request(order_url, data=order_data, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(order_req, timeout=30) as order_response:
            order_raw = order_response.read().decode("utf-8", errors="replace")
            print(f">>> Paymob Order Response: {order_raw[:100]}...") # Log first 100 chars
            order_result = json.loads(order_raw)
            order_id = order_result.get('id')

        if not order_id:
            print(f"!!! Failed to create Paymob order. Response: {order_raw}")
            raise Exception("Failed to create Paymob order")

        # 3. Get Payment Key
        payment_key_url = "https://accept.paymob.com/api/acceptance/payment_keys"
        billing_country = "EG" if country_code == "EG" else "US"
        billing_city = "Cairo" if billing_country == "EG" else "NA"
        billing_state = "Cairo" if billing_country == "EG" else "NA"
        payment_key_data = json.dumps({
            "auth_token": token,
            "amount_cents": int(amount * 100),
            "currency": currency,
            "order_id": order_id,
            "billing_data": {
                "apartment": "NA",
                "email": "customer@example.com",
                "floor": "NA",
                "first_name": "Customer",
                "street": "NA",
                "building": "NA",
                "phone_number": "+201000000000",
                "shipping_method": "NA",
                "postal_code": "NA",
                "city": billing_city,
                "country": billing_country,
                "last_name": "Name",
                "state": billing_state
            },
            "integration_id": paymob_integration_id
        }).encode()
        payment_key_req = urllib.request.Request(payment_key_url, data=payment_key_data, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(payment_key_req, timeout=30) as pk_response:
            pk_raw = pk_response.read().decode("utf-8", errors="replace")
            pk_result = json.loads(pk_raw)
            payment_key = pk_result.get('token') or pk_result.get('payment_key')

        if not payment_key:
            raise Exception(f"Failed to create payment key: {pk_result}")

        iframe_id = str(paymob_iframe_id).strip()
        iframe_url = f"https://accept.paymob.com/api/acceptance/iframes/{iframe_id}?payment_token={payment_key}"

        return jsonify({
            "success": True,
            "iframe_url": iframe_url,
            "order_id": order_id
        })

    except urllib.error.HTTPError as e:
        error_text = e.read().decode("utf-8", errors="replace")
        print(f"Paymob HTTP error: {e.code} {error_text}")
        message = f"Paymob HTTP {e.code}"
        details = error_text
        lowered = (error_text or "").lower()
        if "invalid or expired signature" in lowered:
            message = "Invalid or expired signature from Paymob"
            details = "تحقق من تطابق PAYMOB_IFRAME_ID و PAYMOB_INTEGRATION_ID مع نفس البيئة (test/live) ونفس العملة (EGP/USD)."
        return jsonify({
            "success": False,
            "message": message,
            "details": details
        }), 200
    except Exception as e:
        print(f"Paymob token error: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 200

@app.route('/api/upload', methods=['POST'])
def upload():
    # TEMP TEST ENDPOINT - REMOVE AFTER TESTING
    print(f"[TEST UPLOAD] Content-Type: {request.headers.get('Content-Type', '')}")
    print(f"[TEST UPLOAD] Files received: {list(request.files.keys())}")
    print(f"[TEST UPLOAD] Auth check: {is_authorized()}")
    # END TEMP TEST

    if not is_authorized():
        return jsonify({"ok": False, "message": "Unauthorized"}), 401
    
    # Try to get any file part (image, video, or generic file)
    file = None
    for key in ['image', 'video', 'file']:
        if key in request.files:
            file = request.files[key]
            break
            
    if not file or file.filename == '':
        # Fallback: take the first file in request.files if any
        if request.files:
            file = next(iter(request.files.values()))
        else:
            return jsonify({"ok": False, "message": "No file part"}), 400
    
    ext = Path(file.filename).suffix.lower()
    name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}{ext}"
    try:
        ensure_storage()
        file.save(UPLOADS_DIR / name)
        return jsonify({"ok": True, "url": f"/uploads/{name}"})
    except Exception as e:
        return jsonify({"ok": False, "message": f"Server Error: {str(e)}"}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    ext = Path(filename).suffix.lower()
    mimetypes = {
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.usdz': 'model/vnd.usdz+zip'
    }
    return send_from_directory(UPLOADS_DIR, filename, mimetype=mimetypes.get(ext))

@app.route('/<path:path>')
def static_files(path):
    if is_sensitive_path(path):
        return ("", 404)
    # Mapping some extensions for explicit mimetypes
    ext = Path(path).suffix.lower()
    mimetypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json',
        '.usdz': 'model/vnd.usdz+zip',
        '.json': 'application/json'
    }
    mimetype = mimetypes.get(ext)
    return send_from_directory(BASE_DIR, path, mimetype=mimetype)

if __name__ == "__main__":
    ensure_storage()
    app.run(host='0.0.0.0', port=8080, debug=True)
