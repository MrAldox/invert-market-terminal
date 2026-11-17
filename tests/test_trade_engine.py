"""
Unit Tests for Trade Idea Engine and Position Sizing
INVERT · Market Terminal Pro
"""

import time
import pytest
from backend.quant.trade_engine import (
    generate_trade_idea,
    calculate_pivot_points,
    evaluate_factors
)
from backend.quant.integrity import DATA_SOURCE_LIVE, DATA_SOURCE_SYNTHETIC


def build_synthetic_uptrend_candles(n=60, start_price=100.0):
    candles = []
    p = start_price
    for i in range(n):
        p += 0.8 + (i % 3) * 0.1
        candles.append({
            "time": 1700000000 + i * 300,
            "open": round(p - 0.2, 2),
            "high": round(p + 1.2, 2),
            "low": round(p - 0.4, 2),
            "close": round(p, 2),
            "volume": 10000 + (i * 200)
        })
    return candles


def test_trade_idea_blocked_on_synthetic_data():
    chart_data = {
        "symbol": "AAPL",
        "price": 220.0,
        "data_source": DATA_SOURCE_SYNTHETIC,
        "last_updated_ts": int(time.time()),
        "history": build_synthetic_uptrend_candles()
    }
    idea = generate_trade_idea("AAPL", chart_data)
    assert idea["direction"] == "BLOQUEADO"
    assert idea["status"] == "BLOQUEADO"
    assert "sintéticos" in idea["blocked_reason"].lower()


def test_trade_idea_no_operar_on_adx_below_15():
    # Mercado en rango plano -> ADX muy bajo
    flat_candles = []
    for i in range(50):
        flat_candles.append({
            "time": 1700000000 + i * 300,
            "open": 100.0,
            "high": 100.3,
            "low": 99.7,
            "close": 100.0,
            "volume": 5000
        })
    chart_data = {
        "symbol": "MSFT",
        "price": 100.0,
        "data_source": DATA_SOURCE_LIVE,
        "last_updated_ts": int(time.time()),
        "history": flat_candles
    }
    idea = generate_trade_idea("MSFT", chart_data)
    assert idea["direction"] == "NO_OPERAR"
    assert any("ADX" in w for w in idea["warnings"])


def test_trade_idea_long_stop_loss_and_sizing():
    candles = build_synthetic_uptrend_candles(n=60, start_price=100.0)
    current_p = candles[-1]["close"]
    chart_data = {
        "symbol": "NVDA",
        "price": current_p,
        "data_source": DATA_SOURCE_LIVE,
        "last_updated_ts": int(time.time()),
        "history": candles
    }
    capital = 20000.0
    risk_pct = 0.01  # 200 USD en riesgo

    idea = generate_trade_idea(
        "NVDA", 
        chart_data, 
        capital=capital, 
        risk_pct=risk_pct,
        news_sentiment_ratio=0.5
    )

    if idea["direction"] == "LONG":
        entry = idea["entry"]["market"]
        stop = idea["stop_loss"]["price"]
        risk_dist = idea["stop_loss"]["distance"]

        # Verificación de Stop Loss
        assert stop < entry
        assert risk_dist > 0
        assert idea["stop_loss"]["basis"] in ["SOPORTE_S1", "ATR_1.5X"]

        # Verificación de Objetivos (1.5R y 3.0R)
        tp1 = idea["take_profit_1"]["price"]
        tp2 = idea["take_profit_2"]["price"]
        assert tp1 == pytest.approx(entry + (1.5 * risk_dist), abs=0.05)
        assert tp2 == pytest.approx(entry + (3.0 * risk_dist), abs=0.05)

        # Verificación de Position Sizing
        shares = idea["sizing"]["position_shares"]
        max_capital_allowed = capital * 0.25
        assert (shares * entry) <= max_capital_allowed
        assert idea["sizing"]["capital_at_risk"] <= (capital * risk_pct * 1.05)

        # Verificación de Disclaimer obligatorio
        assert "no es asesoría financiera" in idea["disclaimer"].lower()
        assert idea["confidence"]["is_calibrated"] is False
        assert idea["confidence"]["label"] == "Sin calibrar"


def test_trade_idea_exposure_cap_at_25_percent():
    # Acción cara (1000 USD), capital pequeño (10000 USD)
    candles = build_synthetic_uptrend_candles(n=60, start_price=1000.0)
    chart_data = {
        "symbol": "GOOGL",
        "price": candles[-1]["close"],
        "data_source": DATA_SOURCE_LIVE,
        "last_updated_ts": int(time.time()),
        "history": candles
    }
    capital = 10000.0
    idea = generate_trade_idea("GOOGL", chart_data, capital=capital, risk_pct=0.02)
    
    if idea["direction"] == "LONG":
        # 25% de 10,000 es 2,500. A ~1050 USD por acción, max shares = 2.
        assert idea["sizing"]["position_value"] <= 2500.0
        assert idea["sizing"]["capped_by_max_exposure"] is True
