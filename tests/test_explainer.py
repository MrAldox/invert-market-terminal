"""
Unit Tests for AI Trade Explainer & Anti-Hallucination Number Verification
INVERT · Market Terminal Pro
"""

import pytest
from backend.quant.explainer import (
    verify_numbers_in_text,
    generate_deterministic_explanation,
    extract_allowed_numbers
)


def test_anti_hallucination_accepts_valid_numbers():
    allowed = [228.50, 222.10, 238.10, 247.70, 15, 100.0, 1.5, 3.0]
    valid_text = (
        "La orden LONG entra en 228.50 con un stop loss fijado en 222.10. "
        "El objetivo 1 está situado en 238.10 buscando 1.5R."
    )
    assert verify_numbers_in_text(valid_text, allowed) is True


def test_anti_hallucination_rejects_invented_prices():
    allowed = [228.50, 222.10, 238.10, 247.70]
    hallucinated_text = (
        "Recomiendo comprar en 228.50 y colocar una toma de ganancias en $299.75 porque romperá resistencia."
    )
    # 299.75 no existe en la ficha determinista
    assert verify_numbers_in_text(hallucinated_text, allowed) is False


def test_deterministic_explanation_structure():
    trade_idea = {
        "symbol": "AAPL",
        "direction": "LONG",
        "entry": {"market": 228.50, "pullback_limit": 226.00},
        "stop_loss": {"price": 222.10, "distance": 6.40},
        "take_profit_1": {"price": 238.10, "distance": 9.60},
        "take_profit_2": {"price": 247.70, "distance": 19.20},
        "sizing": {"position_shares": 15, "capital_at_risk": 96.0},
        "reasons": ["Estructura alcista EMA21 > EMA50", "Volumen relativo 1.4x"],
        "contradictions": ["RSI en 72 sobrecompra leve"],
        "warnings": ["Earnings en 12 días"],
        "invalidation_condition": "Cierre de vela por debajo de 222.10"
    }

    res = generate_deterministic_explanation(trade_idea)
    assert "explanation_text" in res
    assert "top_risks" in res
    assert len(res["top_risks"]) <= 3
    assert "invalidation_summary" in res
    assert res["verification_passed"] is True
    assert "no es asesoría financiera" in res["disclaimer"].lower()
