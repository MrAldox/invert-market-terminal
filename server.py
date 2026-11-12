"""
INVERT - Market Terminal Pro Backend
Servidor FastAPI para cotizaciones en tiempo real, histórico de precios y noticias del mercado.
"""

import time
import os
import requests
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="INVERT Market Terminal API", version="1.0.0")

# Permitir CORS para desarrollo y acceso local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache en memoria para mitigar límites y acelerar respuesta
CACHE = {
    "quotes": {},
    "charts": {},
    "news": {},
    "indices": {"timestamp": 0, "data": []}
}
CACHE_TTL = 15  # segundos de vigencia

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Palabras clave para análisis de impacto y sentimiento
BULLISH_KEYWORDS = [
    "surge", "surges", "jump", "jumps", "soar", "soars", "gain", "gains", "beat", "beats",
    "record", "rally", "rallies", "boost", "boosts", "rise", "rises", "climbs", "climbed",
    "top", "tops", "buy", "bull", "bullish", "dividend", "profit", "outperform", "higher",
    "upgrade", "breakout", "strong", "recovery", "positive", "partnership", "growth"
]

BEARISH_KEYWORDS = [
    "fall", "falls", "drop", "drops", "plunge", "plunges", "slump", "slumps", "slide", "slides",
    "dive", "dives", "miss", "misses", "cut", "cuts", "warn", "warns", "warning", "bear",
    "bearish", "tank", "tanks", "probe", "lawsuit", "loss", "losses", "down", "oust", "crisis",
    "downgrade", "investigation", "layoffs", "delay", "decline", "selloff", "weak", "plummets"
]

DEFAULT_SYMBOLS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "NFLX", "PLTR", "COIN", "SPY"]

def analyze_sentiment(title: str):
    t_lower = title.lower()
    bull_count = sum(1 for w in BULLISH_KEYWORDS if f" {w} " in f" {t_lower} ")
    bear_count = sum(1 for w in BEARISH_KEYWORDS if f" {w} " in f" {t_lower} ")
    
    if bull_count > bear_count:
        return {
            "sentiment": "bullish",
            "badge": "🟢 Impacto Alcista",
            "impactType": "positive",
            "impactText": "Catalizador positivo: Señal de crecimiento, buenos resultados o respaldo del mercado."
        }
    elif bear_count > bull_count:
        return {
            "sentiment": "bearish",
            "badge": "🔴 Impacto Bajista",
            "impactType": "negative",
            "impactText": "Riesgo de volatilidad a la baja: Preocupación entre analistas o presión vendedora."
        }
    else:
        return {
            "sentiment": "neutral",
            "badge": "🟡 Impacto Moderado / Macro",
            "impactType": "neutral",
            "impactText": "Desarrollo informativo relevante para el seguimiento macroeconómico de la empresa."
        }


def fetch_symbol_chart(symbol: str, range_val: str = "1d", interval: str = "5m"):
    cache_key = f"{symbol}:{range_val}:{interval}"
    now = time.time()
    if cache_key in CACHE["charts"]:
        entry = CACHE["charts"][cache_key]
        if now - entry["time"] < CACHE_TTL:
            return entry["data"]

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={range_val}&interval={interval}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            res = r.json().get("chart", {}).get("result", [])
            if not res:
                return None
            data = res[0]
            meta = data.get("meta", {})
            timestamps = data.get("timestamp", [])
            indicators = data.get("indicators", {}).get("quote", [{}])[0]
            closes = indicators.get("close", [])
            opens = indicators.get("open", [])
            highs = indicators.get("high", [])
            lows = indicators.get("low", [])
            volumes = indicators.get("volume", [])

            points = []
            for i in range(len(timestamps)):
                c = closes[i] if i < len(closes) else None
                if c is not None:
                    points.append({
                        "time": timestamps[i],
                        "open": round(opens[i], 2) if i < len(opens) and opens[i] is not None else round(c, 2),
                        "high": round(highs[i], 2) if i < len(highs) and highs[i] is not None else round(c, 2),
                        "low": round(lows[i], 2) if i < len(lows) and lows[i] is not None else round(c, 2),
                        "close": round(c, 2),
                        "volume": volumes[i] if i < len(volumes) and volumes[i] is not None else 0
                    })

            price = meta.get("regularMarketPrice")
            if price is None and points:
                price = points[-1]["close"]
            elif price is None:
                price = 100.0

            prev = meta.get("chartPreviousClose")
            if prev is None and points:
                prev = points[0]["close"]
            elif prev is None:
                prev = price

            change = price - prev
            change_pct = (change / prev) * 100 if prev else 0.0

            # Mini sparkline con los últimos 20 puntos
            sparkline = [p["close"] for p in points[-25:]] if points else [round(price, 2)]

            item = {
                "symbol": symbol.upper(),
                "name": meta.get("shortName") or meta.get("longName") or symbol.upper(),
                "currency": meta.get("currency", "USD"),
                "exchange": meta.get("exchangeName", "US"),
                "price": round(price, 2),
                "previousClose": round(prev, 2),
                "change": round(change, 2),
                "changePercent": round(change_pct, 2),
                "high": round(meta.get("regularMarketDayHigh", price), 2),
                "low": round(meta.get("regularMarketDayLow", price), 2),
                "volume": meta.get("regularMarketVolume", 0),
                "fiftyTwoWeekHigh": round(meta.get("fiftyTwoWeekHigh", 0), 2),
                "fiftyTwoWeekLow": round(meta.get("fiftyTwoWeekLow", 0), 2),
                "sparkline": sparkline,
                "history": points
            }

            CACHE["charts"][cache_key] = {"time": now, "data": item}
            return item
    except Exception as e:
        print(f"Error fetching chart for {symbol}: {e}")

    # Fallback local simulado en caso de error de red
    return generate_fallback_quote(symbol)


def generate_fallback_quote(symbol: str):
    presets = {
        "AAPL": {"name": "Apple Inc.", "price": 224.20, "prev": 221.50},
        "NVDA": {"name": "NVIDIA Corporation", "price": 141.80, "prev": 137.90},
        "TSLA": {"name": "Tesla, Inc.", "price": 218.40, "prev": 223.10},
        "MSFT": {"name": "Microsoft Corporation", "price": 428.50, "prev": 425.20},
        "AMZN": {"name": "Amazon.com, Inc.", "price": 186.40, "prev": 184.10},
        "GOOGL": {"name": "Alphabet Inc.", "price": 165.20, "prev": 166.80},
        "META": {"name": "Meta Platforms, Inc.", "price": 582.00, "prev": 570.50},
        "AMD": {"name": "Advanced Micro Devices", "price": 156.30, "prev": 152.00},
        "NFLX": {"name": "Netflix, Inc.", "price": 705.50, "prev": 698.00},
        "PLTR": {"name": "Palantir Technologies", "price": 42.10, "prev": 39.80},
        "COIN": {"name": "Coinbase Global", "price": 212.50, "prev": 204.00},
        "SPY": {"name": "SPDR S&P 500 ETF Trust", "price": 586.20, "prev": 584.00},
    }
    base = presets.get(symbol.upper(), {"name": symbol.upper(), "price": 150.00, "prev": 148.50})
    price = base["price"]
    prev = base["prev"]
    change = price - prev
    change_pct = (change / prev) * 100
    sparkline = [round(prev + (change * (i / 15.0)), 2) for i in range(16)]
    return {
        "symbol": symbol.upper(),
        "name": base["name"],
        "currency": "USD",
        "exchange": "NASDAQ",
        "price": round(price, 2),
        "previousClose": round(prev, 2),
        "change": round(change, 2),
        "changePercent": round(change_pct, 2),
        "high": round(price * 1.015, 2),
        "low": round(price * 0.985, 2),
        "volume": 25000000,
        "fiftyTwoWeekHigh": round(price * 1.25, 2),
        "fiftyTwoWeekLow": round(price * 0.75, 2),
        "sparkline": sparkline,
        "history": [{"time": int(time.time()) - (15-i)*300, "close": s} for i, s in enumerate(sparkline)]
    }


@app.get("/api/market-summary")
def get_market_summary():
    """Devuelve los principales índices globales para el ticker superior."""
    now = time.time()
    if now - CACHE["indices"]["timestamp"] < 30 and CACHE["indices"]["data"]:
        return CACHE["indices"]["data"]

    indices = [
        {"symbol": "^GSPC", "label": "S&P 500"},
        {"symbol": "^IXIC", "label": "NASDAQ"},
        {"symbol": "^DJI", "label": "DOW JONES"},
        {"symbol": "BTC-USD", "label": "BITCOIN"},
        {"symbol": "ETH-USD", "label": "ETHEREUM"},
        {"symbol": "CL=F", "label": "PETRÓLEO WTI"},
        {"symbol": "GC=F", "label": "ORO"}
    ]
    results = []
    for item in indices:
        data = fetch_symbol_chart(item["symbol"], range_val="1d", interval="15m")
        if data:
            results.append({
                "symbol": item["symbol"],
                "label": item["label"],
                "price": data["price"],
                "change": data["change"],
                "changePercent": data["changePercent"]
            })
        else:
            results.append({
                "symbol": item["symbol"],
                "label": item["label"],
                "price": 5000.0,
                "change": 15.2,
                "changePercent": 0.35
            })

    CACHE["indices"] = {"timestamp": now, "data": results}
    return results


@app.get("/api/quotes")
def get_quotes(symbols: str = Query(default=",".join(DEFAULT_SYMBOLS))):
    """Devuelve cotizaciones completas con porcentaje verde/rojo para las acciones seleccionadas."""
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    results = []
    for s in sym_list:
        data = fetch_symbol_chart(s, range_val="1d", interval="5m")
        if data:
            # Quitamos el array masivo de history para aligerar la lista de tarjetas
            card_data = {k: v for k, v in data.items() if k != "history"}
            results.append(card_data)
    return results


@app.get("/api/chart")
def get_chart(symbol: str = Query(...), range_val: str = Query(default="1d"), interval: str = Query(default="5m")):
    """Devuelve la serie de datos para el gráfico interactivo detallado."""
    valid_ranges = {
        "1d": "5m",
        "5d": "15m",
        "1mo": "1d",
        "6mo": "1d",
        "1y": "1wk"
    }
    actual_interval = valid_ranges.get(range_val, interval)
    data = fetch_symbol_chart(symbol.upper(), range_val=range_val, interval=actual_interval)
    if not data:
        raise HTTPException(status_code=404, detail="Símbolo no encontrado")
    return data


@app.get("/api/news")
def get_news(symbols: Optional[str] = Query(default=None), limit: int = Query(default=20)):
    """
    Obtiene noticias financieras en tiempo real con análisis de impacto
    (Positivo/Negativo/Neutro) y relación directa con las acciones.
    """
    cache_key = f"{symbols}:{limit}"
    now = time.time()
    if cache_key in CACHE["news"]:
        entry = CACHE["news"][cache_key]
        if now - entry["time"] < 30:
            return entry["data"]

    queries = []
    if symbols:
        sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        queries.extend(sym_list[:4])
    else:
        queries = ["stock market", "earnings", "tech stocks"]

    all_news = []
    seen_titles = set()

    for q in queries:
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={q}&newsCount={limit}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=4)
            if r.status_code == 200:
                items = r.json().get("news", [])
                for it in items:
                    title = it.get("title", "")
                    if title in seen_titles:
                        continue
                    seen_titles.add(title)

                    tickers = [t for t in it.get("relatedTickers", []) if not t.startswith("^")]
                    sentiment_info = analyze_sentiment(title)

                    thumb = None
                    if it.get("thumbnail") and it["thumbnail"].get("resolutions"):
                        thumb = it["thumbnail"]["resolutions"][0].get("url")

                    all_news.append({
                        "uuid": it.get("uuid", str(time.time())),
                        "title": title,
                        "publisher": it.get("publisher", "Mercado Financiero"),
                        "link": it.get("link", "#"),
                        "time": it.get("providerPublishTime", int(time.time())),
                        "tickers": tickers,
                        "thumbnail": thumb,
                        "sentiment": sentiment_info["sentiment"],
                        "badge": sentiment_info["badge"],
                        "impactType": sentiment_info["impactType"],
                        "impactExplanation": sentiment_info["impactText"]
                    })
        except Exception as e:
            print(f"Error fetching news for {q}: {e}")

    # Ordenar por fecha descendente
    all_news.sort(key=lambda x: x["time"], reverse=True)
    all_news = all_news[:limit]

    # Si no hubo noticias online, proporcionar noticias de mercado de respaldo
    if not all_news:
        all_news = [
            {
                "uuid": "mock-1",
                "title": "NVIDIA presenta nueva arquitectura de chips de IA con demanda proyectada récord",
                "publisher": "Financial Times",
                "link": "#",
                "time": int(time.time()) - 300,
                "tickers": ["NVDA", "AMD", "MSFT"],
                "thumbnail": None,
                "sentiment": "bullish",
                "badge": "🟢 Impacto Alcista",
                "impactType": "positive",
                "impactExplanation": "Impacto Positivo: Se anticipan ingresos históricos por aceleración en data centers."
            },
            {
                "uuid": "mock-2",
                "title": "Tesla incrementa capacidad de producción y anuncia prueba piloto de conducción autónoma FSD v13",
                "publisher": "Bloomberg",
                "link": "#",
                "time": int(time.time()) - 720,
                "tickers": ["TSLA"],
                "thumbnail": None,
                "sentiment": "bullish",
                "badge": "🟢 Impacto Alcista",
                "impactType": "positive",
                "impactExplanation": "Impacto Positivo: Avances tangibles en el modelo de ingresos por software y robotaxis."
            },
            {
                "uuid": "mock-3",
                "title": "La Reserva Federal evalúa el ritmo de recortes de tasas ante datos mixtos de empleo",
                "publisher": "Reuters",
                "link": "#",
                "time": int(time.time()) - 1500,
                "tickers": ["SPY", "QQQ"],
                "thumbnail": None,
                "sentiment": "neutral",
                "badge": "🟡 Impacto Moderado / Macro",
                "impactType": "neutral",
                "impactExplanation": "Impacto Moderado: Política monetaria influye en el costo de capital de todas las empresas."
            },
            {
                "uuid": "mock-4",
                "title": "Apple enfrenta desafíos regulatorios en Europa por interoperabilidad en servicios digitales",
                "publisher": "Wall Street Journal",
                "link": "#",
                "time": int(time.time()) - 2400,
                "tickers": ["AAPL"],
                "sentiment": "bearish",
                "badge": "🔴 Impacto Bajista",
                "impactType": "negative",
                "impactExplanation": "Riesgo de volatilidad: Posibles multas o ajustes en comisiones de la App Store europea."
            }
        ]

    CACHE["news"][cache_key] = {"time": now, "data": all_news}
    return all_news


@app.get("/api/search")
def search_stocks(q: str = Query(...)):
    """Busca símbolos y nombres de empresas."""
    query = q.strip().upper()
    if not query:
        return []

    # Búsqueda rápida en Yahoo Finance search
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=10&newsCount=0"
    try:
        r = requests.get(url, headers=HEADERS, timeout=4)
        if r.status_code == 200:
            quotes = r.json().get("quotes", [])
            results = []
            for item in quotes:
                sym = item.get("symbol", "")
                if not sym or sym.startswith("^"):
                    continue
                results.append({
                    "symbol": sym,
                    "name": item.get("shortname") or item.get("longname") or sym,
                    "exchange": item.get("exchange", "US"),
                    "type": item.get("quoteType", "EQUITY")
                })
            return results
    except Exception as e:
        print(f"Error searching for {query}: {e}")

    # Fallback si falla la red
    catalog = [
        {"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "exchange": "NASDAQ"},
        {"symbol": "TSLA", "name": "Tesla, Inc.", "exchange": "NASDAQ"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "exchange": "NASDAQ"},
        {"symbol": "AMZN", "name": "Amazon.com, Inc.", "exchange": "NASDAQ"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "exchange": "NASDAQ"},
        {"symbol": "META", "name": "Meta Platforms, Inc.", "exchange": "NASDAQ"},
        {"symbol": "AMD", "name": "Advanced Micro Devices", "exchange": "NASDAQ"},
        {"symbol": "NFLX", "name": "Netflix, Inc.", "exchange": "NASDAQ"},
        {"symbol": "PLTR", "name": "Palantir Technologies", "exchange": "NYSE"},
        {"symbol": "COIN", "name": "Coinbase Global", "exchange": "NASDAQ"},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "exchange": "NYSE"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "exchange": "NASDAQ"},
        {"symbol": "BABA", "name": "Alibaba Group", "exchange": "NYSE"},
        {"symbol": "DIS", "name": "Walt Disney Company", "exchange": "NYSE"},
        {"symbol": "UBER", "name": "Uber Technologies", "exchange": "NYSE"},
        {"symbol": "ARM", "name": "ARM Holdings", "exchange": "NASDAQ"},
        {"symbol": "SMCI", "name": "Super Micro Computer", "exchange": "NASDAQ"}
    ]
    return [c for c in catalog if query in c["symbol"] or query in c["name"].upper()]


# Montar archivos estáticos para la interfaz de usuario
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

css_dir = os.path.join(static_dir, "css")
js_dir = os.path.join(static_dir, "js")

if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

from fastapi.responses import Response

@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)

@app.get("/")
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Servidor INVERT activo. Coloque index.html en static/"}


if __name__ == "__main__":
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    import uvicorn
    print("\n" + "="*60)
    print(">> INVERT Market Terminal Pro iniciando en http://localhost:8000")
    print("="*60 + "\n")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)

