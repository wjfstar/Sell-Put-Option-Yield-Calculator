from http.server import BaseHTTPRequestHandler
import json
import requests
import numpy as np

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # 1. 模擬瀏覽器請求 Yahoo Finance v8 API 獲取真實現價與 VWAP
            session = requests.Session()
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            session.headers.update(headers)

            # 取得 Cookie
            session.get("https://finance.yahoo.com", timeout=5)

            # 請求 QQQ 即時數據
            api_url = "https://query1.finance.yahoo.com/v8/finance/chart/QQQ?interval=1d&range=2d"
            res = session.get(api_url, timeout=5)

            if res.status_code != 200:
                self.send_error_response(500, "Failed to fetch from Yahoo Finance")
                return

            chart_data = res.json()['chart']['result'][0]
            meta = chart_data['meta']
            spot_price = meta['regularMarketPrice']
            prev_close = meta.get('chartPreviousClose', meta.get('previousClose', spot_price))
            daily_change_pct = ((spot_price - prev_close) / prev_close) * 100

            # 計算 VWAP
            quotes = chart_data['indicators']['quote'][0]
            closes = [c for c in quotes.get('close', []) if c is not None]
            volumes = [v for v in quotes.get('volume', []) if v is not None]
            vwap = float(np.average(closes, weights=volumes)) if (closes and volumes and len(closes) == len(volumes)) else spot_price

            # 2. 封裝 JSON 回傳給前端
            response_data = {
                "success": True,
                "spotPrice": round(spot_price, 2),
                "dailyChangePct": round(daily_change_pct, 2),
                "vwap": round(vwap, 2)
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*') # 允許前端跨域調用
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            self.send_error_response(500, str(e))

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"success": False, "error": message}).encode('utf-8'))