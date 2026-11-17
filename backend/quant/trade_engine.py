"""
Motor Determinista de Ideas de Operación y Dimensionamiento de Riesgo
INVERT · Market Terminal Pro

Garantiza:
- Stop Loss determinista (S1 y 1.5*ATR con cota mínima 0.75*ATR).
- Objetivos TP1 (1.5R) y TP2 (3.0R) acotados por resistencias/soportes.
- Dimensionamiento por riesgo fijo capital*risk_pct / R con tope al 25%.
- Filtros estrictos de abstención (NO_OPERAR).
- Idéntica lógica para ejecución en vivo y backtesting.
"""

import os
import json
import math
from typing import Dict, Any, Optional, Tuple, List

from backend.quant.integrity import (
    check_signal_eligibility,
    validate_and_sanitize_points,
    DATA_SOURCE_LIVE,
    DATA_SOURCE_CACHE,
    DATA_SOURCE_SYNTHETIC
)
from backend.quant.indicators import compute_all_indicators

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config", "weights.json")


def load_config() -> Dict[str, Any]:
    """Carga la configuración de pesos versionada desde config/weights.json."""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    # Configuración por defecto de contingencia
    return {
        "version": "1.0.0-default",
        "weights": {
            "trend": 25.0,
            "momentum": 20.0,
            "volume": 15.0,
            "patterns": 15.0,
            "sentiment": 10.0,
            "multi_timeframe": 15.0
        },
        "thresholds": {
            "min_long_score": 35.0,
            "max_short_score": -35.0,
            "min_adx": 15.0,
            "min_risk_reward": 1.5,
            "min_atr_stop_dist_mult": 0.75,
            "default_atr_stop_mult": 1.5,
            "tp1_r_mult": 1.5,
            "tp2_r_mult": 3.0,
            "max_capital_exposure_pct": 0.25,
            "max_contradictions": 1
        }
    }


def evaluate_factors(
    indicators: Dict[str, Any], 
    news_sentiment_ratio: float = 0.0,
    weekly_trend_aligned: Optional[bool] = None
) -> Tuple[Dict[str, float], float, List[str], List[str]]:
    """
    Evalúa los 6 factores cuantitativos y calcula el desglose de puntuación.
    Devuelve (score_breakdown, total_score, reasons, contradictions).
    """
    config = load_config()
    weights = config.get("weights", {})
    
    reasons = []
    contradictions = []

    price = indicators.get("current_price", 0.0)
    ema = indicators.get("ema", {})
    ema9 = ema.get("ema9")
    ema21 = ema.get("ema21")
    ema50 = ema.get("ema50")
    ema200 = ema.get("ema200")

    # 1. TENDENCIA (Weight ~ 25)
    trend_factor = 0.0
    if ema9 and ema21 and ema50:
        if price > ema9 > ema21 > ema50:
            trend_factor = 1.0
            reasons.append(f"Alineación alcista sólida de medias (Precio {price} > EMA9 > EMA21 > EMA50).")
        elif price > ema9 and ema9 > ema21:
            trend_factor = 0.6
            reasons.append("Estructura técnica de corto plazo alcista (Precio > EMA9 > EMA21).")
        elif price < ema9 < ema21 < ema50:
            trend_factor = -1.0
            reasons.append(f"Alineación bajista clara de medias (Precio {price} < EMA9 < EMA21 < EMA50).")
        elif price < ema9 and ema9 < ema21:
            trend_factor = -0.6
            reasons.append("Estructura de corto plazo bajista (Precio < EMA9 < EMA21).")
        else:
            trend_factor = 0.0
    if ema200:
        if price > ema200 and trend_factor > 0:
            trend_factor = min(1.0, trend_factor + 0.2)
            reasons.append("Precio cotiza por encima de la media estructural de largo plazo EMA200.")
        elif price < ema200 and trend_factor < 0:
            trend_factor = max(-1.0, trend_factor - 0.2)
            reasons.append("Precio cotiza por debajo de la media estructural de largo plazo EMA200.")
        elif price < ema200 and trend_factor > 0:
            contradictions.append("Alerta: El precio está por debajo de EMA200 en contexto de rebote alcista.")
        elif price > ema200 and trend_factor < 0:
            contradictions.append("Alerta: El precio está por encima de EMA200 en contexto de corrección bajista.")

    # 2. MOMENTUM (Weight ~ 20)
    momentum_factor = 0.0
    rsi = indicators.get("rsi", 50.0)
    macd = indicators.get("macd", {})
    hist = macd.get("histogram")
    stoch = indicators.get("stoch_rsi", {})
    stoch_k = stoch.get("k")
    stoch_d = stoch.get("d")

    if rsi is not None:
        if rsi >= 75.0:
            contradictions.append(f"Oscilador RSI en sobrecompra alta ({rsi:.1f}).")
            momentum_factor -= 0.3
        elif rsi <= 25.0:
            contradictions.append(f"Oscilador RSI en sobreventa extrema ({rsi:.1f}).")
            momentum_factor += 0.3
        else:
            momentum_factor += (rsi - 50.0) / 25.0 * 0.5

    if hist is not None:
        if hist > 0:
            momentum_factor += 0.4
            reasons.append("Histograma MACD en terreno positivo confirmando aceleración compradora.")
        elif hist < 0:
            momentum_factor -= 0.4
            reasons.append("Histograma MACD en terreno negativo confirmando presión vendedora.")

    if stoch_k is not None and stoch_d is not None:
        if stoch_k > stoch_d and stoch_k < 80:
            momentum_factor += 0.2
        elif stoch_k < stoch_d and stoch_k > 20:
            momentum_factor -= 0.2

    momentum_factor = max(-1.0, min(1.0, momentum_factor))

    # 3. VOLUMEN (Weight ~ 15)
    volume_factor = 0.0
    rvol = indicators.get("rvol", 1.0)
    vwap = indicators.get("vwap")
    
    if vwap is not None and vwap > 0:
        if price > vwap:
            volume_factor += 0.5
            reasons.append(f"Precio por encima del VWAP ({vwap}), indicando compras institucionales agresivas.")
        else:
            volume_factor -= 0.5
            reasons.append(f"Precio por debajo del VWAP ({vwap}), reflejando dominio de liquidación.")

    if rvol >= 1.25:
        volume_factor *= 1.2
        reasons.append(f"Volumen relativo elevado (RVOL {rvol:.2f}x sobre la media).")
    elif rvol < 0.70:
        volume_factor *= 0.7
        contradictions.append(f"Volumen relativo bajo (RVOL {rvol:.2f}x); falta de convicción en el movimiento.")

    volume_factor = max(-1.0, min(1.0, volume_factor))

    # 4. PATRONES DE VELAS (Weight ~ 15)
    patterns_factor = 0.0
    patterns = indicators.get("patterns", [])
    for p in patterns:
        ptype = p.get("type")
        pname = p.get("name")
        if ptype == "BULLISH":
            patterns_factor += 0.6
            reasons.append(f"Patrón de vela confirmado: {pname}.")
        elif ptype == "BEARISH":
            patterns_factor -= 0.6
            reasons.append(f"Patrón de vela confirmado: {pname}.")
        elif ptype == "NEUTRAL":
            contradictions.append(f"Formación de indecisión detectada: {pname}.")

    patterns_factor = max(-1.0, min(1.0, patterns_factor))

    # 5. SENTIMIENTO NLP (Weight ~ 10)
    sentiment_factor = max(-1.0, min(1.0, news_sentiment_ratio))
    if sentiment_factor > 0.3:
        reasons.append(f"Sentimiento de noticias predominantemente alcista (+{int(sentiment_factor*100)}%).")
    elif sentiment_factor < -0.3:
        reasons.append(f"Sentimiento de noticias predominantemente bajista ({int(sentiment_factor*100)}%).")

    # 6. MULTI-TEMPORALIDAD (Weight ~ 15)
    mtf_factor = 0.0
    if weekly_trend_aligned is True:
        mtf_factor = 1.0
        reasons.append("Tendencia semanal en total sintonía con la dirección diaria.")
    elif weekly_trend_aligned is False:
        mtf_factor = -1.0
        contradictions.append("Conflicto multitemporal directo con la tendencia del marco semanal.")

    # Desglose numérico ponderado
    w_trend = weights.get("trend", 25.0)
    w_momentum = weights.get("momentum", 20.0)
    w_volume = weights.get("volume", 15.0)
    w_patterns = weights.get("patterns", 15.0)
    w_sentiment = weights.get("sentiment", 10.0)
    w_mtf = weights.get("multi_timeframe", 15.0)

    score_breakdown = {
        "trend": round(trend_factor * w_trend, 1),
        "momentum": round(momentum_factor * w_momentum, 1),
        "volume": round(volume_factor * w_volume, 1),
        "patterns": round(patterns_factor * w_patterns, 1),
        "sentiment": round(sentiment_factor * w_sentiment, 1),
        "multi_timeframe": round(mtf_factor * w_mtf, 1)
    }

    total_score = round(sum(score_breakdown.values()), 1)
    return score_breakdown, total_score, reasons, contradictions


def calculate_pivot_points(points: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calcula puntos pivote Floor Trader basados en los últimos 20 períodos."""
    highs = [p.get("high", p["close"]) for p in points[-20:]]
    lows = [p.get("low", p["close"]) for p in points[-20:]]
    closes = [p["close"] for p in points[-20:]]

    hp = max(highs) if highs else closes[-1] * 1.02
    lp = min(lows) if lows else closes[-1] * 0.98
    cp = closes[-1]

    pp = (hp + lp + cp) / 3.0
    r1 = (2.0 * pp) - lp
    s1 = (2.0 * pp) - hp
    r2 = pp + (hp - lp)
    s2 = pp - (hp - lp)

    return {
        "pivot": round(pp, 2),
        "r1": round(r1, 2),
        "s1": round(s1, 2),
        "r2": round(r2, 2),
        "s2": round(s2, 2)
    }


def generate_trade_idea(
    symbol: str,
    chart_data: Dict[str, Any],
    timeframe: str = "1d",
    capital: float = 10000.0,
    risk_pct: float = 0.01,
    news_sentiment_ratio: float = 0.0,
    weekly_chart_data: Optional[Dict[str, Any]] = None,
    upcoming_earnings_days: Optional[int] = None,
    is_historical: bool = False
) -> Dict[str, Any]:
    """
    Función maestra para generar la Ficha de Operación determinista.
    Devuelve el contrato JSON completo especificado en la Fase 3.
    """
    config = load_config()
    thresholds = config.get("thresholds", {})
    min_adx = thresholds.get("min_adx", 15.0)
    min_rr = thresholds.get("min_risk_reward", 1.5)
    min_long_score = thresholds.get("min_long_score", 35.0)
    max_short_score = thresholds.get("max_short_score", -35.0)
    max_capital_exposure = thresholds.get("max_capital_exposure_pct", 0.25)

    disclaimer = "Herramienta de apoyo a la decisión, no es asesoría financiera. Puedes perder dinero."

    # PASO 1 · VERIFICAR INTEGRIDAD DE DATOS (Fase 1)
    is_eligible, blocked_reason = check_signal_eligibility(chart_data, is_historical=is_historical)
    if not is_eligible:
        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "data_source": chart_data.get("data_source", DATA_SOURCE_SYNTHETIC),
            "last_updated_ts": chart_data.get("last_updated_ts"),
            "status": "BLOQUEADO",
            "blocked_reason": blocked_reason,
            "direction": "BLOQUEADO",
            "entry": None,
            "stop_loss": None,
            "take_profit_1": None,
            "take_profit_2": None,
            "risk_reward": None,
            "sizing": None,
            "confidence": None,
            "score_breakdown": {},
            "total_score": 0.0,
            "reasons": [],
            "contradictions": [],
            "warnings": [blocked_reason],
            "invalidation": None,
            "disclaimer": disclaimer
        }

    history = chart_data.get("history", [])
    price = chart_data.get("price", history[-1]["close"])
    indicators = compute_all_indicators(history)

    # Evaluar multi-temporalidad semanal si existe
    weekly_aligned = None
    if weekly_chart_data and weekly_chart_data.get("history"):
        w_hist = weekly_chart_data["history"]
        w_ind = compute_all_indicators(w_hist)
        w_ema9 = w_ind.get("ema", {}).get("ema9")
        w_ema21 = w_ind.get("ema", {}).get("ema21")
        if w_ema9 and w_ema21:
            weekly_is_bullish = w_ema9 > w_ema21
            daily_is_bullish = price > (indicators.get("ema", {}).get("ema21") or price)
            weekly_aligned = (weekly_is_bullish == daily_is_bullish)

    # PASO 2 · EVALUACIÓN CUANTITATIVA Y FACTORES
    score_breakdown, total_score, reasons, contradictions = evaluate_factors(
        indicators, 
        news_sentiment_ratio=news_sentiment_ratio,
        weekly_trend_aligned=weekly_aligned
    )

    adx_val = indicators.get("adx", {}).get("adx")
    atr_val = indicators.get("atr14") or round(price * 0.02, 2)
    pivots = calculate_pivot_points(history)

    # Advertencias
    warnings = []
    if upcoming_earnings_days is not None and upcoming_earnings_days <= 14:
        warnings.append(f"Publicación de resultados (Earnings) programada para dentro de {upcoming_earnings_days} días.")
    if atr_val and price > 0 and (atr_val / price) > 0.04:
        warnings.append(f"Volatilidad ATR anormalmente alta ({atr_val/price*100:.1f}% del precio).")
    if indicators.get("rvol", 1.0) < 0.75:
        warnings.append(f"Volumen relativo deprimido ({indicators.get('rvol')}x); posible falta de liquidez.")

    # PASO 3 · FILTROS DE ABSTENCIÓN (NO_OPERAR)
    direction = "NO_OPERAR"
    no_trade_reason = None

    if adx_val is not None and adx_val < min_adx:
        no_trade_reason = f"Fuerza direccional insuficiente (ADX {adx_val:.1f} < {min_adx}). Mercado sin tendencia definida."
    elif weekly_aligned is False:
        no_trade_reason = "Conflicto con la tendencia semanal. Prohibido operar contra el marco temporal superior."
    elif len(contradictions) >= 2:
        no_trade_reason = f"Divergencias técnicas excesivas ({len(contradictions)} contradicciones detectadas)."
    elif total_score >= min_long_score:
        direction = "LONG"
    elif total_score <= max_short_score:
        direction = "SHORT"
    else:
        no_trade_reason = f"Puntuación técnica neutral ({total_score}). Sin ventaja estadística concluyente."

    if direction == "NO_OPERAR":
        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "data_source": chart_data.get("data_source", DATA_SOURCE_LIVE),
            "last_updated_ts": chart_data.get("last_updated_ts"),
            "status": "OPERABLE",
            "blocked_reason": None,
            "direction": "NO_OPERAR",
            "setup_name": "Mercado Neutral / Esperar Confirmación",
            "entry": None,
            "stop_loss": None,
            "take_profit_1": None,
            "take_profit_2": None,
            "risk_reward": None,
            "sizing": None,
            "confidence": {
                "value": None,
                "is_calibrated": False,
                "label": "Sin calibrar"
            },
            "score_breakdown": score_breakdown,
            "total_score": total_score,
            "reasons": reasons,
            "contradictions": contradictions,
            "warnings": warnings + ([no_trade_reason] if no_trade_reason else []),
            "invalidation": f"Abstención: {no_trade_reason}",
            "disclaimer": disclaimer
        }

    # PASO 4 · CÁLCULO DE NIVELES Y FORMULACIÓN DE STOP LOSS
    # Distancia mínima: 0.75 * ATR
    min_stop_distance = max(0.01, round(0.75 * atr_val, 2))
    default_stop_distance = max(min_stop_distance, round(1.5 * atr_val, 2))

    entry_market = round(price, 2)
    entry_pullback = round(indicators.get("ema", {}).get("ema21") or price, 2)

    if direction == "LONG":
        s1 = pivots["s1"]
        # Stop = el más cercano entre soporte S1 y (entrada − 1.5×ATR), con distancia mínima 0.75×ATR
        candidate_atr = round(entry_market - default_stop_distance, 2)
        candidate_s1 = s1

        # Elegir el más cercano al precio pero que respete la distancia mínima
        if (entry_market - candidate_s1) >= min_stop_distance and candidate_s1 > candidate_atr:
            stop_price = candidate_s1
            stop_basis = "SOPORTE_S1"
        else:
            stop_price = candidate_atr
            stop_basis = "ATR_1.5X"

        risk_distance = max(0.01, round(entry_market - stop_price, 2))
        
        # Objetivos 1.5R y 3R
        tp1_price = round(entry_market + (1.5 * risk_distance), 2)
        tp2_price = round(entry_market + (3.0 * risk_distance), 2)

        # Ajuste si hay resistencia inmediata R1 menor que TP1
        r1 = pivots["r1"]
        if r1 > entry_market and r1 < tp1_price:
            # Si R1 está demasiado cerca (< 1.5R), el R:B se ve comprometido -> NO_OPERAR
            if (r1 - entry_market) / risk_distance < min_rr:
                return {
                    "symbol": symbol.upper(),
                    "timeframe": timeframe,
                    "data_source": chart_data.get("data_source", DATA_SOURCE_LIVE),
                    "last_updated_ts": chart_data.get("last_updated_ts"),
                    "status": "OPERABLE",
                    "direction": "NO_OPERAR",
                    "setup_name": "Resistencia R1 Próxima Limita Ratio R:B",
                    "entry": None,
                    "stop_loss": None,
                    "take_profit_1": None,
                    "take_profit_2": None,
                    "risk_reward": None,
                    "sizing": None,
                    "confidence": {"value": None, "is_calibrated": False, "label": "Sin calibrar"},
                    "score_breakdown": score_breakdown,
                    "total_score": total_score,
                    "reasons": reasons,
                    "contradictions": contradictions + [f"Resistencia R1 ({r1}) reduce el Ratio Riesgo:Beneficio por debajo de {min_rr}."],
                    "warnings": warnings,
                    "invalidation": "Cancelada por R:B insuficiente ante resistencia inmediata.",
                    "disclaimer": disclaimer
                }

        invalidation_text = f"Cierre de vela de {timeframe} por debajo de {stop_price} o pérdida de soporte S1 ({s1})."
        setup_name = "Impulso Alcista con Confluencia de Medias y Soporte"

    else:  # SHORT
        r1 = pivots["r1"]
        candidate_atr = round(entry_market + default_stop_distance, 2)
        candidate_r1 = r1

        if (candidate_r1 - entry_market) >= min_stop_distance and candidate_r1 < candidate_atr:
            stop_price = candidate_r1
            stop_basis = "RESISTENCIA_R1"
        else:
            stop_price = candidate_atr
            stop_basis = "ATR_1.5X"

        risk_distance = max(0.01, round(stop_price - entry_market, 2))
        tp1_price = round(entry_market - (1.5 * risk_distance), 2)
        tp2_price = round(entry_market - (3.0 * risk_distance), 2)

        s1 = pivots["s1"]
        if s1 < entry_market and s1 > tp1_price:
            if (entry_market - s1) / risk_distance < min_rr:
                return {
                    "symbol": symbol.upper(),
                    "timeframe": timeframe,
                    "data_source": chart_data.get("data_source", DATA_SOURCE_LIVE),
                    "last_updated_ts": chart_data.get("last_updated_ts"),
                    "status": "OPERABLE",
                    "direction": "NO_OPERAR",
                    "setup_name": "Soporte S1 Próximo Limita Ratio R:B",
                    "entry": None,
                    "stop_loss": None,
                    "take_profit_1": None,
                    "take_profit_2": None,
                    "risk_reward": None,
                    "sizing": None,
                    "confidence": {"value": None, "is_calibrated": False, "label": "Sin calibrar"},
                    "score_breakdown": score_breakdown,
                    "total_score": total_score,
                    "reasons": reasons,
                    "contradictions": contradictions + [f"Soporte S1 ({s1}) reduce el Ratio R:B por debajo de {min_rr}."],
                    "warnings": warnings,
                    "invalidation": "Cancelada por R:B insuficiente ante soporte inmediato.",
                    "disclaimer": disclaimer
                }

        invalidation_text = f"Cierre de vela de {timeframe} por encima de {stop_price} o superación de resistencia R1 ({r1})."
        setup_name = "Presión Bajista con Ruptura y Confluencia de Resistencia"

    # PASO 5 · DIMENSIONAMIENTO DE POSICIÓN (Position Sizing)
    # Tamaño = (capital * risk_pct) / |entrada − stop|, redondeado hacia abajo
    target_risk_capital = capital * risk_pct
    raw_shares = math.floor(target_risk_capital / risk_distance) if risk_distance > 0 else 0

    # Límite de exposición máxima: 25% del capital
    max_position_capital = capital * max_capital_exposure
    capped_by_exposure = False
    
    if (raw_shares * entry_market) > max_position_capital:
        raw_shares = math.floor(max_position_capital / entry_market)
        capped_by_exposure = True

    if raw_shares < 1:
        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "data_source": chart_data.get("data_source", DATA_SOURCE_LIVE),
            "last_updated_ts": chart_data.get("last_updated_ts"),
            "status": "OPERABLE",
            "direction": "NO_OPERAR",
            "setup_name": "Capital Insuficiente para Gestión de Riesgo",
            "entry": None,
            "stop_loss": None,
            "take_profit_1": None,
            "take_profit_2": None,
            "risk_reward": None,
            "sizing": None,
            "confidence": {"value": None, "is_calibrated": False, "label": "Sin calibrar"},
            "score_breakdown": score_breakdown,
            "total_score": total_score,
            "reasons": reasons,
            "contradictions": contradictions,
            "warnings": warnings + ["El capital asignado no permite comprar al menos 1 acción respetando el riesgo máximo del 1%."],
            "invalidation": "Cancelada por capital o tamaño de lote inviable.",
            "disclaimer": disclaimer
        }

    actual_capital_at_risk = round(raw_shares * risk_distance, 2)
    position_value = round(raw_shares * entry_market, 2)
    exposure_pct = round((position_value / capital) * 100, 2)

    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "data_source": chart_data.get("data_source", DATA_SOURCE_LIVE),
        "last_updated_ts": chart_data.get("last_updated_ts"),
        "status": "OPERABLE",
        "blocked_reason": None,
        "direction": direction,
        "setup_name": setup_name,
        "entry": {
            "market": entry_market,
            "pullback_limit": entry_pullback
        },
        "stop_loss": {
            "price": stop_price,
            "distance": risk_distance,
            "distance_atr_mult": round(risk_distance / atr_val, 2) if atr_val > 0 else 1.5,
            "basis": stop_basis
        },
        "take_profit_1": {
            "price": tp1_price,
            "distance": round(abs(tp1_price - entry_market), 2),
            "risk_reward": 1.5,
            "close_ratio": 0.5
        },
        "take_profit_2": {
            "price": tp2_price,
            "distance": round(abs(tp2_price - entry_market), 2),
            "risk_reward": 3.0,
            "close_ratio": 0.5
        },
        "risk_reward_ratio": 2.25,
        "sizing": {
            "portfolio_capital": capital,
            "risk_percentage": risk_pct,
            "capital_at_risk": actual_capital_at_risk,
            "position_shares": raw_shares,
            "position_value": position_value,
            "portfolio_exposure_pct": exposure_pct,
            "capped_by_max_exposure": capped_by_exposure
        },
        "confidence": {
            "value": None,
            "is_calibrated": False,
            "model_version": None,
            "label": "Sin calibrar"
        },
        "score_breakdown": score_breakdown,
        "total_score": total_score,
        "reasons": reasons,
        "contradictions": contradictions,
        "warnings": warnings,
        "invalidation_condition": invalidation_text,
        "disclaimer": disclaimer
    }
