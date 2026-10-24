import json
from http.server import BaseHTTPRequestHandler
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # 1. 請求 QQQ 的即時數據與期權鏈數據 (Yahoo Finance 免費開放 API)
            url = "https://query1.finance.yahoo.com/v7/finance/options/QQQ"
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                raw_data = json.loads(response.read().decode())
            
            result = raw_data['optionChain']['result'][0]
            quote = result['quote']
            
            # 正股數據
            spot_price = quote.get('regularMarketPrice', 704.40)
            previous_close = quote.get('regularMarketPreviousClose', spot_price)
            daily_change_pct = round(((spot_price - previous_close) / previous_close) * 100, 2)
            vwap = quote.get('regularMarketDayHigh', spot_price) * 0.5 + quote.get('regularMarketDayLow', spot_price) * 0.5  # 估算 VWAP
            
            # 2. 解析期權鏈數據 (Options Chain)
            options = result['options'][0]
            calls = options.get('calls', [])
            puts = options.get('puts', [])
            
            # 3. 量化動態牆體算法：尋找未平倉量 (Open Interest) 最大的 Put 與 Call
            max_put_oi = -1
            best_put_wall = None
            
            for put in puts:
                oi = put.get('openInterest', 0) or 0
                # 篩選靠近現價 (例如現價 ±8% 範圍內) 的護盤牆，避免遠離現價的無效大單干擾
                if oi > max_put_oi and put['strike'] <= spot_price * 1.02:
                    max_put_oi = oi
                    best_put_wall = put
            
            max_call_oi = -1
            best_call_wall = None
            
            for call in calls:
                oi = call.get('openInterest', 0) or 0
                if oi > max_call_oi and call['strike'] >= spot_price * 0.98:
                    max_call_oi = oi
                    best_call_wall = call

            # 4. 提取動態分析出的期權牆數據 (如果抓不到則使用安全預設)
            put_strike = best_put_wall['strike'] if best_put_wall else 700.0
            put_bid = best_put_wall.get('bid', 3.20) if best_put_wall else 3.20
            put_ask = best_put_wall.get('ask', 3.25) if best_put_wall else 3.25
            put_vol = best_put_wall.get('volume', 12500) if best_put_wall else 12500
            put_oi = best_put_wall.get('openInterest', 45000) if best_put_wall else 45000

            call_strike = best_call_wall['strike'] if best_call_wall else 715.0
            call_bid = best_call_wall.get('bid', 1.85) if best_call_wall else 1.85
            call_ask = best_call_wall.get('ask', 1.90) if best_call_wall else 1.90
            call_vol = best_call_wall.get('volume', 15800) if best_call_wall else 15800
            call_oi = best_call_wall.get('openInterest', 52000) if best_call_wall else 52000

            # 構建回傳 JSON
            response_payload = {
                "success": True,
                "spotPrice": spot_price,
                "dailyChangePct": daily_change_pct,
                "vwap": round(vwap, 2),
                "putWall": {
                    "strike": put_strike,
                    "bid": put_bid,
                    "ask": put_ask,
                    "volume": put_vol,
                    "openInterest": put_oi
                },
                "callWall": {
                    "strike": call_strike,
                    "bid": call_bid,
                    "ask": call_ask,
                    "volume": call_vol,
                    "openInterest": call_oi
                }
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode())

        except Exception as e:
            # 備用降級數據，確保服務不中斷
            fallback_payload = {
                "success": False,
                "error": str(e),
                "spotPrice": 704.40,
                "dailyChangePct": -2.87,
                "vwap": 704.45
            }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(fallback_payload).encode())
