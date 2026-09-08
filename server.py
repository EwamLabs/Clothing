import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime, timedelta
import random

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DATA_FILE = os.path.join(BASE_DIR, "data", "products.json")

def load_products():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ALURA Server] Error reading products file: {e}")
        return []

class AluraRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json(self, status_code, data):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # 1. GET /api/products
        if path == "/api/products":
            products = load_products()
            category = params.get("category", [None])[0]
            sort = params.get("sort", [None])[0]
            q = params.get("q", [None])[0]

            results = list(products)

            if category and category.lower() != "all":
                results = [p for p in results if p.get("category", "").lower() == category.lower()]

            if q:
                query = q.lower().strip()
                results = [
                    p for p in results
                    if query in p.get("name", "").lower()
                    or query in p.get("subtitle", "").lower()
                    or query in p.get("category", "").lower()
                    or query in p.get("composition", "").lower()
                ]

            if sort == "price-asc":
                results.sort(key=lambda p: p.get("price", 0))
            elif sort == "price-desc":
                results.sort(key=lambda p: p.get("price", 0), reverse=True)
            elif sort == "name":
                results.sort(key=lambda p: p.get("name", ""))
            elif sort == "newest":
                results.reverse()

            return self._send_json(200, {
                "count": len(results),
                "products": results
            })

        # 2. GET /api/products/<id>
        if path.startswith("/api/products/"):
            prod_id = path.replace("/api/products/", "").strip()
            products = load_products()
            product = next((p for p in products if p.get("id", "").lower() == prod_id.lower()), None)
            if product:
                return self._send_json(200, product)
            return self._send_json(404, {"error": "Product not found"})

        # 3. GET /api/categories
        if path == "/api/categories":
            products = load_products()
            cat_map = {}
            for p in products:
                c = p.get("category", "Other")
                cat_map[c] = cat_map.get(c, 0) + 1

            categories = [{"name": "All", "count": len(products)}]
            for k, v in cat_map.items():
                categories.append({"name": k, "count": v})

            return self._send_json(200, {
                "total": len(products),
                "categories": categories
            })

        # Static files fallback (index.html, styles.css, app.js)
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"

        try:
            body = json.loads(post_data)
        except Exception:
            return self._send_json(400, {"error": "Invalid JSON body"})

        # POST /api/checkout
        if path == "/api/checkout":
            items = body.get("items", [])
            customer = body.get("customer", {})
            shipping_addr = body.get("shippingAddress", {})

            if not items or not isinstance(items, list):
                return self._send_json(400, {"error": "Bag items are required"})

            all_prods = load_products()
            subtotal = 0
            verified_items = []

            for it in items:
                p_id = it.get("id")
                prod = next((p for p in all_prods if p.get("id") == p_id), None)
                if prod:
                    qty = max(1, int(it.get("quantity", 1)))
                    item_total = prod.get("price", 0) * qty
                    subtotal += item_total
                    verified_items.append({
                        "id": prod.get("id"),
                        "name": prod.get("name"),
                        "size": it.get("size", "M"),
                        "color": it.get("color", "Default"),
                        "unitPrice": prod.get("price", 0),
                        "quantity": qty,
                        "total": item_total,
                        "image": prod.get("images", [""])[0]
                    })

            tax_est = round(subtotal * 0.0825)
            grand_total = subtotal + tax_est
            random_suffix = random.randint(100000, 999999)
            order_id = f"ALR-2026-{random_suffix}"

            deliv_date = datetime.now() + timedelta(days=3)
            arrival_str = deliv_date.strftime("%A, %B %d")

            confirmation = {
                "orderId": order_id,
                "status": "Confirmed & Sent to Atelier",
                "createdAt": datetime.now().isoformat(),
                "customer": {
                    "name": customer.get("name", "Valued Client"),
                    "email": customer.get("email", "client@alura.com")
                },
                "shippingAddress": shipping_addr,
                "delivery": {
                    "carrier": "ALURA White-Glove Courier",
                    "estimatedArrival": arrival_str,
                    "packaging": "Rigid Atelier Box with Silk Ribbon & Garment Dust Bag"
                },
                "pricing": {
                    "subtotal": subtotal,
                    "shipping": "Complimentary Express",
                    "tax": tax_est,
                    "grandTotal": grand_total
                },
                "items": verified_items
            }

            return self._send_json(201, confirmation)

        # POST /api/newsletter
        if path == "/api/newsletter":
            email = body.get("email", "").strip().lower()
            if not email or "@" not in email or "." not in email:
                return self._send_json(400, {"error": "Please enter a valid email address"})

            return self._send_json(200, {
                "success": True,
                "message": f"Your invitation to private salon presentations has been registered for {email}."
            })

        return self._send_json(404, {"error": "Endpoint not found"})

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run():
    port = PORT
    while port < PORT + 20:
        try:
            with ReusableTCPServer(("", port), AluraRequestHandler) as httpd:
                print("\n=================================================")
                print(f"  ALURA ATELIER — BACKEND ACTIVE (Python)")
                print(f"  Local Storefront: http://localhost:{port}")
                print(f"  API Endpoint:     http://localhost:{port}/api/products")
                print("=================================================\n")
                httpd.serve_forever()
        except OSError as e:
            if "address already in use" in str(e).lower() or e.errno == 10048:
                port += 1
            else:
                raise e

if __name__ == "__main__":
    run()
