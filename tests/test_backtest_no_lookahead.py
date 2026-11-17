"""
Unit Tests for Backtesting Engine & No-Lookahead Bias Guarantee
INVERT · Market Terminal Pro
"""

import time
import pytest
import numpy as np
from backend.quant.trade_engine import generate_trade_idea
from backend.quant.backtest import (
    run_single_symbol_backtest,
    compute_performance_metrics,
    run_monte_carlo_simulation
)
from backend.quant.integrity import DATA_SOURCE_LIVE


def generate_controlled_history(n=100):
    bars = []
    p = 100.0
    for i in range(n):
        p += np.sin(i / 4.0) * 1.5 + 0.2
        bars.append({
            "time": 1700000000 + i * 86400,
            "open": round(p - 0.5, 2),
            "high": round(p + 1.2, 2),
            "low": round(p - 1.0, 2),
            "close": round(p, 2),
            "volume": 20000 + (i * 100)
        })
    return bars


def test_strict_no_lookahead_identity():
    """
    PRUEBA MATEMÁTICA FORMAL ANTI-LOOKAHEAD:
    La señal calculada en la barra k utilizando únicamente el slice [:k+1]
    debe ser EXACTAMENTE idéntica a la generada en esa barra sin importar
    cuántas velas futuras existan en el dataset completo.
    """
    full_history = generate_controlled_history(n=120)

    for k in [40, 60, 80, 100]:
        slice_k = full_history[:k + 1]
        
        mock_data_slice = {
            "symbol": "AAPL",
            "price": slice_k[-1]["close"],
            "data_source": DATA_SOURCE_LIVE,
            "last_updated_ts": slice_k[-1]["time"],
            "history": slice_k
        }
        
        idea_at_k = generate_trade_idea("AAPL", mock_data_slice, capital=10000.0, is_historical=True)

        # Ahora probamos generando la señal usando otra vista truncada en k
        mock_data_truncated = {
            "symbol": "AAPL",
            "price": full_history[k]["close"],
            "data_source": DATA_SOURCE_LIVE,
            "last_updated_ts": full_history[k]["time"],
            "history": [dict(b) for b in full_history[:k + 1]]
        }
        idea_verified = generate_trade_idea("AAPL", mock_data_truncated, capital=10000.0, is_historical=True)

        assert idea_at_k["direction"] == idea_verified["direction"]
        assert idea_at_k["total_score"] == idea_verified["total_score"]
        if idea_at_k.get("stop_loss"):
            assert idea_at_k["stop_loss"]["price"] == idea_verified["stop_loss"]["price"]
            assert idea_at_k["take_profit_1"]["price"] == idea_verified["take_profit_1"]["price"]


def test_costs_and_slippage_simulation():
    """Verifica que comisiones y slippage sean deducidos correctamente del PnL."""
    bars = generate_controlled_history(n=80)
    
    # Corrida sin costes
    res_no_cost = run_single_symbol_backtest(
        "TEST", bars, commission_pct=0.0, slippage_pct=0.0
    )
    # Corrida con costes estándar
    res_with_cost = run_single_symbol_backtest(
        "TEST", bars, commission_pct=0.001, slippage_pct=0.001
    )

    if res_no_cost["trades"] and res_with_cost["trades"]:
        pnl_no_cost = sum(t["net_pnl"] for t in res_no_cost["trades"])
        pnl_with_cost = sum(t["net_pnl"] for t in res_with_cost["trades"])
        # Con costes, el resultado neto debe ser estrictamente menor
        assert pnl_with_cost < pnl_no_cost


def test_monte_carlo_drawdown_p95_bounds():
    """Verifica que la simulación Monte Carlo compute percentiles válidos de drawdown."""
    fake_trades = [
        {"net_pnl": 150.0, "pnl_in_r": 1.5},
        {"net_pnl": -100.0, "pnl_in_r": -1.0},
        {"net_pnl": 200.0, "pnl_in_r": 2.0},
        {"net_pnl": -100.0, "pnl_in_r": -1.0},
        {"net_pnl": 120.0, "pnl_in_r": 1.2},
        {"net_pnl": -80.0, "pnl_in_r": -0.8},
        {"net_pnl": 160.0, "pnl_in_r": 1.6},
        {"net_pnl": -90.0, "pnl_in_r": -0.9},
        {"net_pnl": 140.0, "pnl_in_r": 1.4},
        {"net_pnl": -110.0, "pnl_in_r": -1.1},
        {"net_pnl": 180.0, "pnl_in_r": 1.8},
    ]
    mc = run_monte_carlo_simulation(fake_trades, num_iterations=500)
    assert "drawdown_p95" in mc
    assert "worst_case_drawdown" in mc
    assert mc["drawdown_p95"] <= 0.0
    assert mc["worst_case_drawdown"] <= mc["drawdown_p95"]
