import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\eduardo.martinez\.gemini\antigravity\brain\804a61b2-1983-4229-887a-8ac01d50b674"


async def main():
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--remote-allow-origins=*",
        "--user-data-dir=c:\\Users\\eduardo.martinez\\.gemini\\antigravity\\scratch\\chrome_profile",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1280,900"
    ])
    time.sleep(2)

    try:
        tabs_info = json.loads(urllib.request.urlopen("http://localhost:9222/json").read())
        ws_url = tabs_info[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url) as ws:
            msg_id = 0

            async def send_cmd(method, params=None):
                nonlocal msg_id
                msg_id += 1
                payload = {"id": msg_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    resp = json.loads(await ws.recv())
                    if resp.get("id") == payload["id"]:
                        return resp

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")
            await send_cmd("DOM.enable")
            await send_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1280,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            print("Navigating to http://localhost:8000 ...")
            await send_cmd("Page.navigate", {"url": "http://localhost:8000"})
            await asyncio.sleep(3)

            async def take_screenshot(filename):
                shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
                import base64
                data = base64.b64decode(shot["result"]["data"])
                out_path = os.path.join(ARTIFACT_DIR, filename)
                with open(out_path, "wb") as f:
                    f.write(data)
                print(f"Saved screenshot: {out_path}")

            # 1. Open Chart Modal for NVDA
            print("Opening chart modal for NVDA...")
            await send_cmd("Runtime.evaluate", {"expression": "openChartModal('NVDA');"})
            await asyncio.sleep(1.5)
            await take_screenshot("test_chart_aspect_ratio.png")

            # Check canvas dimensions
            eval_res = await send_cmd("Runtime.evaluate", {
                "expression": """(() => {
                    const canvas = document.getElementById('interactiveCanvas');
                    return {
                        width: canvas ? canvas.width : 0,
                        height: canvas ? canvas.height : 0,
                        clientWidth: canvas ? canvas.clientWidth : 0,
                        clientHeight: canvas ? canvas.clientHeight : 0,
                        parentWidth: canvas && canvas.parentElement ? canvas.parentElement.clientWidth : 0
                    };
                })()""",
                "returnByValue": True
            })
            print("Canvas dimensions:", eval_res.get("result", {}).get("value"))

            # 2. Switch to Ficha de Operación tab
            print("Switching to Ficha de Operación...")
            await send_cmd("Runtime.evaluate", {"expression": "switchAnalysisTab('tradeIdea');"})
            await asyncio.sleep(2)
            await take_screenshot("test_trade_idea_card.png")

            # 3. Switch to Base de Datos (1 Año)
            print("Switching to Base de Datos (1 Año)...")
            await send_cmd("Runtime.evaluate", {"expression": "goToTradesDatabase();"})
            await asyncio.sleep(2)
            await take_screenshot("test_trades_database_view.png")

            # 4. Filter by symbol NVDA
            print("Filtering by NVDA in Trades Database...")
            await send_cmd("Runtime.evaluate", {
                "expression": """(() => {
                    const sym = document.getElementById('tradesDbSymbolFilter');
                    if (sym) {
                        sym.value = 'NVDA';
                        sym.dispatchEvent(new Event('change'));
                    }
                })()"""
            })
            await asyncio.sleep(1)
            await take_screenshot("test_trades_database_filtered.png")

            # 5. Click Retrain Model
            print("Clicking Retrain Model...")
            await send_cmd("Runtime.evaluate", {
                "expression": """(() => {
                    const btn = document.getElementById('btnRetrainModel');
                    if (btn) btn.click();
                })()"""
            })
            await asyncio.sleep(2.5)
            await take_screenshot("test_retrain_model_toast.png")
            print("All visual verification steps completed successfully!")

    finally:
        proc.kill()


if __name__ == "__main__":
    asyncio.run(main())
