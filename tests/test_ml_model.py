"""
Unit Tests for Machine Learning Calibration and Drift Monitoring
INVERT · Market Terminal Pro
"""

import numpy as np
import pytest
from backend.quant.ml_model import (
    train_and_calibrate_model,
    run_champion_challenger_pipeline,
    record_live_outcome_and_check_drift,
    get_model_status_summary
)


def test_train_and_calibrate_model():
    np.random.seed(42)
    n = 60
    # Generar features sintéticas
    X = np.random.randn(n, 7)
    # Target relacionado con la primera feature + ruido
    probs = 1.0 / (1.0 + np.exp(-X[:, 0]))
    y = (probs >= 0.5).astype(int)

    model, metrics = train_and_calibrate_model(X, y, model_type="gradient_boosting")
    assert model is not None
    assert "brier_score" in metrics
    assert 0.0 <= metrics["brier_score"] <= 0.5
    assert "accuracy" in metrics


def test_champion_challenger_tournament():
    np.random.seed(42)
    X_train = np.random.randn(80, 7)
    y_train = (X_train[:, 0] > 0).astype(int)

    X_test = np.random.randn(40, 7)
    y_test = (X_test[:, 0] > 0).astype(int)

    res = run_champion_challenger_pipeline(X_train, y_train, X_test, y_test)
    assert res["status"] == "COMPLETED"
    assert "champion" in res
    assert "verdict" in res


def test_drift_monitor_alerts_on_deterioration():
    # Inicializar registros con predicciones con alto error (predice 0.9 pero ocurre 0)
    for _ in range(25):
        record_live_outcome_and_check_drift(predicted_prob=0.95, actual_win=False)

    status = get_model_status_summary()
    assert status["drift_monitor"]["drift_detected"] is True
    assert status["drift_monitor"]["confidence_display"] == "Sin calibrar"
