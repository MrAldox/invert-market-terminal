"""
Unit Tests for Quantitative Indicators
INVERT · Market Terminal Pro
"""

import numpy as np
import pytest
from backend.quant.indicators import (
    calculate_ema,
    calculate_sma,
    calculate_atr,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_adx,
    calculate_rsi,
    calculate_stochastic_rsi,
    calculate_vwap,
    detect_candlestick_patterns,
    compute_all_indicators
)


def test_ema_and_sma_accuracy():
    data = np.array([10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0])
    sma = calculate_sma(data, 5)
    assert np.isnan(sma[3])
    assert sma[4] == pytest.approx(12.0)
    assert sma[9] == pytest.approx(17.0)

    ema = calculate_ema(data, 5)
    assert np.isnan(ema[3])
    assert ema[4] == pytest.approx(12.0)
    # EMA must follow rising trend
    assert ema[9] > ema[8]


def test_atr_positive_and_stable():
    n = 30
    highs = np.linspace(102, 130, n)
    lows = np.linspace(98, 126, n)
    closes = np.linspace(100, 128, n)
    atr = calculate_atr(highs, lows, closes, 14)
    assert len(atr) == n
    assert not np.isnan(atr[-1])
    assert atr[-1] > 0
    # Range is 4, so ATR should be around 4.0
    assert atr[-1] == pytest.approx(4.0, rel=0.1)


def test_macd_calculation():
    n = 60
    closes = np.sin(np.linspace(0, 10, n)) * 10 + 100
    macd_line, signal_line, hist = calculate_macd(closes, 12, 26, 9)
    assert len(macd_line) == n
    assert not np.isnan(macd_line[-1])
    assert not np.isnan(signal_line[-1])
    assert not np.isnan(hist[-1])
    assert hist[-1] == pytest.approx(macd_line[-1] - signal_line[-1])


def test_bollinger_bands_containment():
    n = 40
    closes = 100.0 + np.sin(np.linspace(0, 10, n)) * 5.0
    mid, up, low, pct_b, bw = calculate_bollinger_bands(closes, 20, 2.0)
    assert up[-1] > mid[-1]
    assert low[-1] < mid[-1]
    assert bw[-1] > 0
    assert -0.5 <= pct_b[-1] <= 1.5


def test_adx_bounded_between_0_and_100():
    n = 50
    highs = np.linspace(100, 150, n)
    lows = np.linspace(98, 148, n)
    closes = np.linspace(99, 149, n)
    adx, plus_di, minus_di = calculate_adx(highs, lows, closes, 14)
    valid_adx = adx[~np.isnan(adx)]
    assert len(valid_adx) > 0
    assert all(0 <= v <= 100 for v in valid_adx)
    # In a strong uptrend, plus_di should be greater than minus_di
    assert plus_di[-1] > minus_di[-1]


def test_stochastic_rsi():
    n = 50
    closes = np.linspace(100, 150, n)
    k, d = calculate_stochastic_rsi(closes, 14, 14, 3, 3)
    valid_k = k[~np.isnan(k)]
    assert len(valid_k) > 0
    assert all(0 <= val <= 100 for val in valid_k)


def test_vwap_monotonic_in_steady_session():
    n = 20
    highs = np.full(n, 102.0)
    lows = np.full(n, 98.0)
    closes = np.full(n, 100.0)
    vols = np.full(n, 1000)
    vwap = calculate_vwap(highs, lows, closes, vols)
    assert vwap[-1] == pytest.approx(100.0)


def test_candlestick_patterns_hammer():
    # Vela 1: normal
    # Vela 2: normal
    # Vela 3: martillo (cuerpo chico arriba, sombra larga abajo)
    opens = np.array([100.0, 101.0, 105.0])
    highs = np.array([102.0, 103.0, 105.2])
    lows = np.array([99.0, 100.0, 95.0])   # sombra inferior de 10
    closes = np.array([101.0, 102.0, 104.5]) # cuerpo de 0.5
    patterns = detect_candlestick_patterns(opens, highs, lows, closes)
    names = [p["name"] for p in patterns]
    assert any("Martillo" in n for n in names)


def test_candlestick_patterns_bullish_engulfing():
    opens = np.array([100.0, 105.0, 101.0])
    highs = np.array([102.0, 106.0, 108.0])
    lows = np.array([99.0, 101.0, 100.5])
    # vela previa baja de 105 a 102, vela actual sube de 101 a 107
    closes = np.array([101.0, 102.0, 107.0])
    patterns = detect_candlestick_patterns(opens, highs, lows, closes)
    names = [p["name"] for p in patterns]
    assert any("Envolvente Alcista" in n for n in names)


def test_compute_all_indicators_integration():
    points = []
    base = 100.0
    for i in range(60):
        base += np.sin(i / 5.0) * 0.5
        points.append({
            "time": 1000 + i * 300,
            "open": round(base - 0.2, 2),
            "high": round(base + 0.8, 2),
            "low": round(base - 0.6, 2),
            "close": round(base, 2),
            "volume": 5000 + i * 100
        })
    res = compute_all_indicators(points)
    assert "ema" in res
    assert "atr14" in res
    assert "macd" in res
    assert "bollinger" in res
    assert "adx" in res
    assert "rsi" in res
    assert "stoch_rsi" in res
    assert "vwap" in res
    assert "rvol" in res
    assert res["atr14"] is not None
    assert res["adx"]["adx"] is not None
