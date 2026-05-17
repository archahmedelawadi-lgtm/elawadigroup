import http.server
import socketserver
import json

PORT = 8080

class SafeHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "ok": True, 
            "message": "تم استلام الطلب بنجاح (يرجى استخدام flask_app.py للحصول على كافة الميزات)"
        }).encode())

if __name__ == "__main__":
    try:
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("", PORT), SafeHandler) as httpd:
            print(f"Simple Server started at http://localhost:{PORT}")
            print("تحذير: هذا السيرفر بسيط جداً، يفضل تشغيل flask_app.py بدلاً منه.")
            httpd.serve_forever()
    except Exception as e:
        print(f"Error: {e}")
