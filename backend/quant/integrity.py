"""
Módulo de Integridad y Saneamiento de Datos de Mercado
INVERT · Market Terminal Pro

Garantiza que ninguna señal ni análisis cuantitativo sea generado
utilizando datos sintéticos, obsoletos o corruptos.
"""

import time
import math
from typing import List, Dict, Any, Tuple, Optional

DATA_SOURCE_LIVE = "live"
DATA_SOURCE_CACHE = "cache"
DATA_SOURCE_SYNTHETIC = "fallback_synthetic"

DEFAULT_MAX_STALE_MINUTES = 20
DEFAULT_MAX_JUMP_PCT = 0.40  # 40% de salto brusco sin split


def validate_and_sanitize_points(
    points: List[Dict[str, Any]], 
    max_jump_pct: float = DEFAULT_MAX_JUMP_PCT
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Detecta y filtra datos de velas corruptos:
    - Precios no positivos o nulos (close, open, high, low <= 0).
    - Inconsistencias lógicas (high < low).
    - Saltos artificiales extremos (> max_jump_pct entre velas consecutivas).
    - Huecos temporales severos.
    """
    clean_points = []
    warnings = []
    
    if not points:
        return clean_points, ["Serie histórica vacía."]

    prev_close = None
    prev_time = None
    expected_step = None

    for idx, p in enumerate(points):
        try:
            c = float(p.get("close", 0) or 0)
            o = float(p.get("open", c) or c)
            h = float(p.get("high", c) or c)
            l = float(p.get("low", c) or c)
            vol = float(p.get("volume", 0) or 0)
            t = int(p.get("time", 0) or 0)
        except (ValueError, TypeError):
            warnings.append(f"Vela en índice {idx} con formato inválido; descartada.")
            continue

        # 1. Filtro de precios no positivos o NaN
        if c <= 0 or o <= 0 or h <= 0 or l <= 0 or math.isnan(c) or math.isnan(o):
            warnings.append(f"Vela en índice {idx} con precio <= 0 o NaN; descartada.")
            continue

        # 2. Inconsistencia lógica entre High y Low
        if h < l:
            warnings.append(f"Vela en índice {idx} con High ({h}) menor que Low ({l}); descartada.")
            continue

        # 3. Detección de salto artificial no explicado (> 40%)
        if prev_close is not None and prev_close > 0:
            jump_pct = abs(c - prev_close) / prev_close
            if jump_pct > max_jump_pct:
                warnings.append(
                    f"Salto anómalo del {jump_pct*100:.1f}% detectado entre {prev_close} y {c} en t={t}; tramo descartado."
                )
                continue

        # 4. Chequeo de consistencia temporal
        if prev_time is not None:
            time_delta = t - prev_time
            if time_delta <= 0:
                # Timestamp duplicado o desordenado
                warnings.append(f"Timestamp desordenado o duplicado ({t} <= {prev_time}); descartado.")
                continue
            if expected_step is None and time_delta > 0:
                expected_step = time_delta
            elif expected_step and time_delta > expected_step * 5:
                # Hueco temporal significativo (ej: suspensión de cotización o fin de semana)
                pass

        prev_close = c
        prev_time = t
        clean_points.append({
            "time": t,
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(c, 2),
            "volume": int(vol) if vol >= 0 else 0
        })

    return clean_points, warnings


def check_signal_eligibility(
    data: Dict[str, Any], 
    max_stale_minutes: int = DEFAULT_MAX_STALE_MINUTES,
    is_historical: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Verifica si los datos de mercado cumplen con los requisitos mínimos de integridad
    para habilitar el motor determinista de ideas de trading.
    
    Devuelve (es_elegible, motivo_bloqueo).
    """
    if not data:
        return False, "BLOQUEADO: Sin datos disponibles para el activo."

    data_source = data.get("data_source", DATA_SOURCE_SYNTHETIC)
    
    # REGLA 1: Nunca generar operaciones con datos sintéticos / simulados
    if data_source == DATA_SOURCE_SYNTHETIC:
        return False, "BLOQUEADO: Datos de mercado sintéticos (modo fallback). Prohibido operar con simulaciones."

    # REGLA 2: Antigüedad de los datos (solo para operativa en tiempo real)
    last_updated = data.get("last_updated_ts")
    now = time.time()
    
    if not is_historical and last_updated:
        age_seconds = now - last_updated
        if age_seconds > (max_stale_minutes * 60):
            # Si los datos tienen más de N minutos en modo en vivo se bloquea por obsolescencia
            return False, f"BLOQUEADO: Datos obsoletos ({int(age_seconds // 60)} min de antigüedad, umbral: {max_stale_minutes} min)."

    # REGLA 3: Cantidad mínima de velas limpias
    history = data.get("history", [])
    if len(history) < 25:
        return False, f"BLOQUEADO: Historial insuficiente ({len(history)} velas). Se requieren mínimo 25 períodos."

    # REGLA 4: Precios coherentes
    price = data.get("price", 0)
    if price <= 0:
        return False, "BLOQUEADO: Precio actual inválido o menor o igual a cero."

    return True, None
