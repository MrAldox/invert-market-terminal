"""
Unit Tests for Data Integrity & Sanitization
INVERT · Market Terminal Pro
"""

import time
import pytest
from backend.quant.integrity import (
    validate_and_sanitize_points,
    check_signal_eligibility,
    DATA_SOURCE_LIVE,
    DATA_SOURCE_CACHE,
    DATA_SOURCE_SYNTHETIC
)


def test_sanitize_removes_zero_and_negative_prices():
    raw = [
        {"time": 100, "open": 100, "high": 105, "low": 95, "close": 102, "volume": 1000},
        {"time": 200, "open": 0, "high": 105, "low": 95, "close": 0, "volume": 1000},      # cero
        {"time": 300, "open": 102, "high": 106, "low": -10, "close": 104, "volume": 1000},  # negativo
        {"time": 400, "open": 104, "high": 108, "low": 101, "close": 106, "volume": 1000},
    ]
    clean, warnings = validate_and_sanitize_points(raw)
    assert len(clean) == 2
    assert clean[0]["time"] == 100
    assert clean[1]["time"] == 400
    assert len(warnings) == 2


def test_sanitize_removes_high_less_than_low():
    raw = [
        {"time": 100, "open": 100, "high": 105, "low": 95, "close": 102, "volume": 1000},
        {"time": 200, "open": 102, "high": 90, "low": 110, "close": 100, "volume": 1000},   # high < low
        {"time": 300, "open": 102, "high": 105, "low": 101, "close": 103, "volume": 1000},
    ]
    clean, warnings = validate_and_sanitize_points(raw)
    assert len(clean) == 2
    assert clean[0]["time"] == 100
    assert clean[1]["time"] == 300


def test_sanitize_filters_unexplained_jumps_above_40_percent():
    raw = [
        {"time": 100, "open": 100, "high": 102, "low": 99, "close": 100, "volume": 1000},
        {"time": 200, "open": 150, "high": 160, "low": 145, "close": 155, "volume": 1000},  # salto del 55%
        {"time": 300, "open": 101, "high": 103, "low": 100, "close": 102, "volume": 1000},
    ]
    clean, warnings = validate_and_sanitize_points(raw)
    assert len(clean) == 2
    assert clean[0]["close"] == 100.0
    assert clean[1]["close"] == 102.0
    assert any("Salto anómalo" in w for w in warnings)


def test_signal_blocked_on_synthetic_data():
    data = {
        "symbol": "AAPL",
        "data_source": DATA_SOURCE_SYNTHETIC,
        "last_updated_ts": int(time.time()),
        "price": 225.0,
        "history": [{"time": i, "open": 100, "high": 105, "low": 95, "close": 102, "volume": 100} for i in range(30)]
    }
    is_ok, reason = check_signal_eligibility(data)
    assert is_ok is False
    assert "BLOQUEADO" in reason
    assert "sintéticos" in reason.lower()


def test_signal_blocked_on_stale_data():
    stale_time = int(time.time()) - (45 * 60)  # 45 minutos atrás
    data = {
        "symbol": "MSFT",
        "data_source": DATA_SOURCE_LIVE,
        "last_updated_ts": stale_time,
        "price": 420.0,
        "history": [{"time": i, "open": 100, "high": 105, "low": 95, "close": 102, "volume": 100} for i in range(30)]
    }
    is_ok, reason = check_signal_eligibility(data, max_stale_minutes=20)
    assert is_ok is False
    assert "BLOQUEADO" in reason
    assert "obsoletos" in reason.lower()


def test_signal_blocked_on_insufficient_history():
    data = {
        "symbol": "NVDA",
        "data_source": DATA_SOURCE_LIVE,
        "last_updated_ts": int(time.time()),
        "price": 140.0,
        "history": [{"time": i, "open": 100, "high": 105, "low": 95, "close": 102, "volume": 100} for i in range(10)]
    }
    is_ok, reason = check_signal_eligibility(data)
    assert is_ok is False
    assert "insuficiente" in reason.lower()


def test_signal_allowed_on_clean_live_data():
    data = {
        "symbol": "AAPL",
        "data_source": DATA_SOURCE_LIVE,
        "last_updated_ts": int(time.time()) - 30,  # 30 segundos atrás
        "price": 228.0,
        "history": [{"time": i, "open": 220, "high": 230, "low": 219, "close": 228, "volume": 1000} for i in range(35)]
    }
    is_ok, reason = check_signal_eligibility(data)
    assert is_ok is True
    assert reason is None
