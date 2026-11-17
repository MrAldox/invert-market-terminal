import pytest
from backend.quant.trades_db import generate_or_load_1y_trades, train_ml_with_1y_database


def test_generate_or_load_1y_trades():
    data = generate_or_load_1y_trades(force_refresh=False)
    assert "trades" in data
    assert "total_trades" in data
    assert "win_rate" in data
    assert "profit_factor" in data
    assert "expectancy_r" in data
    assert len(data["trades"]) > 0
    
    first_trade = data["trades"][0]
    assert "id" in first_trade
    assert "symbol" in first_trade
    assert "direction" in first_trade
    assert "outcome" in first_trade
    assert first_trade["outcome"] in ("WIN", "LOSS")
    assert "entry_price" in first_trade
    assert "stop_loss" in first_trade


def test_train_ml_with_1y_database():
    res = train_ml_with_1y_database(force_refresh=False)
    assert res.get("status") == "ENTRENADO_Y_CALIBRADO"
    assert "model_version" in res
    assert "metrics" in res
    assert "brier_score" in res["metrics"]
    assert "accuracy" in res["metrics"]
    assert res["sample_size"] > 0
