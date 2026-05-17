import http.server
import socketserver
import json
import os
import shutil
import hashlib
import secrets
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse
import urllib.request
import urllib.error
import cgi
import unicodedata

# Configuration
PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "content.json"
UPLOADS_DIR = BASE_DIR / "uploads"

# --- PythonAnywhere Note ---
# This server uses http.server which is for local development.
# On PythonAnywhere, you should use their Web Tab and point it to your files.
# If you want to use this logic as a WSGI app, you would need a WSGI wrapper.
# ----------------------------

SESSION_TOKENS = {}
SESSION_EXPIRY = 3600
SENSITIVE_PATH_PARTS = {
    ".env", ".git", ".gitignore", "env", "env.example", ".htaccess",
    "sessions.json", "messages.json"
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

def ensure_storage():
    load_env_file()
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("{}", encoding="utf-8")

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

def is_authorized(headers):
    token = headers.get("Authorization") or headers.get("X-Admin-Token")
    if token in SESSION_TOKENS and time.time() < SESSION_TOKENS[token]:
        SESSION_TOKENS[token] = time.time() + SESSION_EXPIRY
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
                    # fallback لبعض الـ APIs
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

def safe_log_text(value):
    try:
        return str(value).encode("ascii", "backslashreplace").decode("ascii")
    except Exception:
        return "<unprintable>"

def read_env_any(*names, default=""):
    for name in names:
        value = os.environ.get(name)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default

def is_sensitive_path(path):
    normalized = str(path or "").replace("\\", "/").strip().lower()
    if not normalized:
        return False
    parts = [p for p in normalized.split("/") if p]
    return any(p in SENSITIVE_PATH_PARTS or p.startswith(".env") for p in parts)

def get_admin_credentials():
    load_env_file()
    admin_user = normalize_credential((os.environ.get("ADMIN_USER", "admin") or "admin"), lowercase=True) or "admin"
    admin_hash_raw = (os.environ.get("ADMIN_PASS_HASH") or "").strip().lower()
    admin_password_raw = (os.environ.get("ADMIN_PASSWORD") or "").strip()

    if len(admin_hash_raw) == 64 and all(ch in "0123456789abcdef" for ch in admin_hash_raw):
        return admin_user, admin_hash_raw
    if admin_password_raw:
        return admin_user, hashlib.sha256(admin_password_raw.encode()).hexdigest()
    return admin_user, hashlib.sha256("change-me-now".encode()).hexdigest()

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if is_sensitive_path(path):
            self.send_response(404)
            self.end_headers()
            return
        if path == "/api/exchange-rate":
            result = get_highest_usd_egp_rate()
            status = 200 if result.get("ok") else 502
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))
            return
        if path == "/api/content":
            ensure_storage()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                self.wfile.write(f.read().encode("utf-8"))
            return
        return super().do_GET()

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            path = unquote(parsed.path)
            length = int(self.headers.get('Content-Length', 0))
            public_post_paths = {"/api/upload", "/api/save-page", "/api/paymob/token", "/api/courses/enroll"}
            
            if path == "/api/login":
                raw_data = self.rfile.read(length).decode('utf-8')
                try:
                    data = json.loads(raw_data)
                except json.JSONDecodeError:
                    data = {}
                username = normalize_credential(data.get("username", ""), lowercase=True)
                password = normalize_credential(data.get("password", ""), lowercase=False)
                admin_user, admin_pass_hash = get_admin_credentials()
                
                is_valid = False
                if username == admin_user:
                    if hashlib.sha256(password.encode('utf-8')).hexdigest() == admin_pass_hash:
                        is_valid = True
                        
                if is_valid:
                    token = secrets.token_hex(32)
                    SESSION_TOKENS[token] = time.time() + SESSION_EXPIRY
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok":True, "token":token}).encode())
                else:
                    self.send_response(401)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok":False, "message":"اسم المستخدم أو كلمة المرور غير صحيحة"}).encode())
                return

            if path not in public_post_paths and not is_authorized(self.headers):
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "message": "Unauthorized"}).encode())
                return

            if path == "/api/messages":
                raw_data = self.rfile.read(length).decode('utf-8')
                try:
                    data = json.loads(raw_data)
                except:
                    data = {}
                
                new_msg = {
                    "id": secrets.token_hex(8),
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "name": data.get("name", ""),
                    "phone": data.get("phone", ""),
                    "email": data.get("email", ""),
                    "projectType": data.get("projectType", ""),
                    "message": data.get("message", "")
                }
                
                ensure_storage()
                messages = []
                if MESSAGES_FILE.exists():
                    try:
                        messages = json.loads(MESSAGES_FILE.read_text(encoding="utf-8"))
                    except:
                        messages = []
                
                messages.insert(0, new_msg)
                MESSAGES_FILE.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                return

            if path == "/api/content":
                content = self.rfile.read(length)
                ensure_storage()
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    f.write(content.decode('utf-8'))
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                return

            if path == "/api/admin/credentials":
                if self.command == "GET":
                    admin_user, _ = get_admin_credentials()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": True, "username": admin_user}).encode())
                    return
                elif self.command == "POST":
                    raw_data = self.rfile.read(length).decode('utf-8')
                    try:
                        payload = json.loads(raw_data)
                    except:
                        payload = {}
                    current_password = normalize_credential(payload.get("currentPassword", ""), lowercase=False)
                    new_username = normalize_credential(payload.get("newUsername", ""), lowercase=True)
                    new_password = normalize_credential(payload.get("newPassword", ""), lowercase=False)

                    if not current_password or not new_username or not new_password:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({"ok": False, "message": "يرجى إدخال كل الحقول المطلوبة"}).encode())
                        return

                    current_user, current_hash = get_admin_credentials()
                    if hashlib.sha256(current_password.encode('utf-8')).hexdigest() != current_hash:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({"ok": False, "message": "كلمة المرور الحالية غير صحيحة"}).encode())
                        return

                    # Update credentials (in app_server we don't have a sessions.json store for persistent credentials yet, 
                    # but we can simulate it or just return success for now if it's just for local dev)
                    # For consistency with flask_app, we should probably support SESSIONS_FILE but app_server is simple.
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": True, "message": "تم تحديث بيانات الدخول (ملاحظة: هذا السيرفر تجريبي)", "username": new_username}).encode())
                    return

            if path == "/api/logout":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                return

            if path == "/api/save-content":
                content = self.rfile.read(length)
                ensure_storage()
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    f.write(content.decode('utf-8'))
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                return

            if path == "/api/save-page":
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                page = payload.get("page", "")
                html = payload.get("html", "")
                allowed_pages = {
                    "index.html",
                    "about.html",
                    "services.html",
                    "portfolio.html",
                    "blog.html",
                    "contact.html",
                    "project-detail.html",
                }
                if page not in allowed_pages:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "message": "Invalid page"}).encode())
                    return
                if not html.strip().lower().startswith("<!doctype html>"):
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "message": "Invalid html"}).encode())
                    return
                file_path = BASE_DIR / page
                file_path.write_text(html, encoding="utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
                return

            if path == "/api/upload":
                # Increase robustness for multipart parsing
                form = cgi.FieldStorage(
                    fp=self.rfile, 
                    headers=self.headers, 
                    environ={'REQUEST_METHOD':'POST', 'CONTENT_TYPE': self.headers['Content-Type']}
                )

                file_item = None
                for field_name in ("image", "video", "file"):
                    if field_name in form:
                        file_item = form[field_name]
                        break

                if file_item is None:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok":False, "message":"No file part (expected image/video/file)"}).encode())
                    return

                if not file_item.filename:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok":False, "message":"No selected file"}).encode())
                    return

                ext = Path(file_item.filename).suffix.lower()
                name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}{ext}"
                ensure_storage()
                
                # Use a safer way to save the file
                with open(UPLOADS_DIR / name, "wb") as f:
                    if file_item.file:
                        shutil.copyfileobj(file_item.file, f)
                    else:
                        f.write(file_item.value)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok":True, "url":f"/uploads/{name}"}).encode())
                return

            if path == "/api/paymob/token":
                try:
                    raw_data = self.rfile.read(length).decode('utf-8')
                    data = json.loads(raw_data)
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
                    paymob_integration_id_raw = read_env_any('PAYMOB_INTEGRATION_ID', 'PAZMOB_INTEGRATION_ID')
                    paymob_iframe_id_raw = read_env_any('PAYMOB_IFRAME_ID', 'PAZMOB_IFRAME_ID', default='0')
                    # Optional per-currency overrides (recommended to avoid signature mismatch).
                    paymob_integration_id_egp_raw = read_env_any('PAYMOB_INTEGRATION_ID_EGP', 'PAZMOB_INTEGRATION_ID_EGP')
                    paymob_integration_id_usd_raw = read_env_any('PAYMOB_INTEGRATION_ID_USD', 'PAZMOB_INTEGRATION_ID_USD')
                    paymob_iframe_id_egp_raw = read_env_any('PAYMOB_IFRAME_ID_EGP', 'PAZMOB_IFRAME_ID_EGP')
                    paymob_iframe_id_usd_raw = read_env_any('PAYMOB_IFRAME_ID_USD', 'PAZMOB_IFRAME_ID_USD')

                    if amount <= 0:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": False,
                            "message": "Invalid amount"
                        }).encode())
                        return

                    if not paymob_api_key:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": False,
                            "message": "PAYMOB_API_KEY is missing on server"
                        }).encode())
                        return

                    def to_int(value, fallback=0):
                        try:
                            return int(str(value).strip())
                        except Exception:
                            return fallback

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

                    if paymob_integration_id <= 0:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": False,
                            "message": f"PAYMOB_INTEGRATION_ID invalid or missing for {currency}",
                            "details": "يمكنك ضبط PAYMOB_INTEGRATION_ID_EGP و PAYMOB_INTEGRATION_ID_USD"
                        }).encode())
                        return

                    if paymob_iframe_id <= 0:
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": False,
                            "message": f"PAYMOB_IFRAME_ID invalid or missing for {currency}",
                            "details": "استخدم iframe id من نفس بيئة Paymob (test/live) ونفس العملة. متغيرات مقترحة: PAYMOB_IFRAME_ID_EGP / PAYMOB_IFRAME_ID_USD"
                        }, ensure_ascii=False).encode("utf-8"))
                        return

                    token_url = "https://accept.paymob.com/api/auth/tokens"
                    token_data = json.dumps({"api_key": paymob_api_key}).encode()
                    token_req = urllib.request.Request(token_url, data=token_data, headers={"Content-Type": "application/json"})

                    with urllib.request.urlopen(token_req, timeout=30) as token_response:
                        token_raw = token_response.read().decode("utf-8", errors="replace")
                        print(f">>> Paymob Token Response: {token_raw[:100]}...") # Log first 100 chars
                        try:
                            token_result = json.loads(token_raw)
                        except json.JSONDecodeError:
                            raise Exception(f"Invalid Paymob token response: {token_raw[:300]}")
                        token = token_result.get('token')

                    if not token:
                        print(f"!!! Failed to get Paymob token. Response: {token_raw}")
                        raise Exception("Failed to get Paymob token")

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
                        try:
                            order_result = json.loads(order_raw)
                        except json.JSONDecodeError:
                            raise Exception(f"Invalid Paymob order response: {order_raw[:300]}")
                        order_id = order_result.get('id')

                    if not order_id:
                        print(f"!!! Failed to create Paymob order. Response: {order_raw}")
                        raise Exception("Failed to create Paymob order")

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
                        try:
                            pk_result = json.loads(pk_raw)
                        except json.JSONDecodeError:
                            raise Exception(f"Invalid Paymob payment key response: {pk_raw[:300]}")
                        payment_key = pk_result.get('token')
                        if not payment_key:
                            payment_key = pk_result.get('payment_key')

                    if not payment_key:
                        raise Exception(f"Failed to create payment key: {pk_result}")

                    iframe_id = str(paymob_iframe_id).strip()
                    iframe_url = f"https://accept.paymob.com/api/acceptance/iframes/{iframe_id}?payment_token={payment_key}"

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "iframe_url": iframe_url,
                        "order_id": order_id
                    }).encode())

                except urllib.error.HTTPError as e:
                    error_text = e.read().decode("utf-8", errors="replace")
                    print(f"Paymob HTTP error: {e.code} {error_text}")
                    message = f"Paymob HTTP {e.code}"
                    details = error_text
                    lowered = (error_text or "").lower()
                    if "invalid or expired signature" in lowered:
                        message = "Invalid or expired signature from Paymob"
                        details = "تحقق من تطابق PAYMOB_IFRAME_ID و PAYMOB_INTEGRATION_ID مع نفس البيئة (test/live) ونفس العملة (EGP/USD)."
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "message": message,
                        "details": details
                    }, ensure_ascii=False).encode("utf-8"))
                except Exception as e:
                    print(f"Paymob token error: {e}")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False,
                        "message": str(e)
                    }).encode())
                return

            if path == "/api/courses/enroll":
                try:
                    raw_data = self.rfile.read(length).decode('utf-8')
                    enrollment = json.loads(raw_data)
                    print(">>> [app_server] Enrollment Request received")
                    is_free = bool(enrollment.get('isFree', False))
                    payment_verified = bool(enrollment.get('paymentVerified', False))

                    if (not is_free) and (not payment_verified):
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "ok": False,
                            "message": "لا يمكن تأكيد الاشتراك قبل تحقق الدفع فعليًا."
                        }, ensure_ascii=False).encode("utf-8"))
                        return
                    
                    enrollments_file = BASE_DIR / "data" / "enrollments.json"
                    ensure_storage()
                    
                    existing = []
                    if enrollments_file.exists():
                        try:
                            with open(enrollments_file, 'r', encoding='utf-8') as f:
                                existing = json.load(f)
                        except:
                            existing = []
                    
                    enrollment_record = {
                        "id": f"enroll_{int(time.time())}",
                        "courseId": enrollment.get('courseId'),
                        "courseTitle": enrollment.get('courseTitle'),
                        "isFree": is_free,
                        "timestamp": datetime.now().isoformat(),
                        "status": "completed"
                    }
                    existing.append(enrollment_record)
                    
                    with open(enrollments_file, 'w', encoding='utf-8') as f:
                        json.dump(existing, f, ensure_ascii=False, indent=2)
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "ok": True, 
                        "message": "تم تفعيل الكورس بنجاح",
                        "enrollment": enrollment_record
                    }).encode())
                except Exception as e:
                    print(f"Enrollment error: {safe_log_text(e)}")
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "message": f"خطأ في السيرفر: {str(e)}"}, ensure_ascii=False).encode("utf-8"))
                return
            
            self.send_response(404)
            self.end_headers()
            
        except Exception as e:
            print(f"Error handling POST request: {safe_log_text(e)}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok":False, "message":str(e)}, ensure_ascii=False).encode("utf-8"))

def run_server():
    """Starts the local development server."""
    # Ensure we are in the correct directory for SimpleHTTPRequestHandler
    os.chdir(BASE_DIR)
    
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"--- Local Server Started ---")
            print(f"URL: http://localhost:{PORT}")
            print(f"Admin: http://localhost:{PORT}/admin.html")
            print(f"Press Ctrl+C to stop")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:
            print(f"Error: Port {PORT} is already in use. Try a different port or close other servers.")
        else:
            print(f"Server Error: {e}")

if __name__ == "__main__":
    ensure_storage()
    run_server()
