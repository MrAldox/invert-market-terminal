"""
Librería de Indicadores Cuantitativos Vectorizados
INVERT · Market Terminal Pro

Implementación matemática precisa con NumPy:
- ATR(14)
- MACD(12, 26, 9)
- Bollinger Bands(20, 2)
- EMA(9, 21, 50, 200)
- Volumen Relativo (RVOL)
- ADX(14) con +DI y -DI
- Stochastic RSI(14, 14, 3, 3)
- VWAP intradía acumulado
- Patrones de velas: Martillo, Envolvente Alcista/Bajista, Doji, Estrella Mañana/Tarde
"""

import numpy as np
from typing import List, Dict, Any, Optional


def calculate_ema(values: np.ndarray, period: int) -> np.ndarray:
    """Calcula la Media Móvil Exponencial (EMA) sobre un array unidimensional."""
    n = len(values)
    ema = np.full(n, np.nan, dtype=np.float64)
    if n < period or period <= 0:
        return ema
    
    # Inicializar con la media simple de los primeros 'period' elementos
    ema[period - 1] = np.mean(values[:period])
    multiplier = 2.0 / (period + 1.0)
    
    for i in range(period, n):
        ema[i] = (values[i] - ema[i - 1]) * multiplier + ema[i - 1]
    return ema


def calculate_sma(values: np.ndarray, period: int) -> np.ndarray:
    """Calcula la Media Móvil Simple (SMA) de forma robusta ante valores NaN iniciales."""
    n = len(values)
    sma = np.full(n, np.nan, dtype=np.float64)
    if n < period or period <= 0:
        return sma
    
    for i in range(period - 1, n):
        window = values[i - period + 1 : i + 1]
        if not np.any(np.isnan(window)):
            sma[i] = np.mean(window)
    return sma


def calculate_atr(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14) -> np.ndarray:
    """Calcula el Average True Range (ATR) usando el método de suavizado de Wilder."""
    n = len(closes)
    atr = np.full(n, np.nan, dtype=np.float64)
    if n < period + 1:
        return atr
    
    tr = np.zeros(n, dtype=np.float64)
    tr[0] = highs[0] - lows[0]
    for i in range(1, n):
        hl = highs[i] - lows[i]
        hc = abs(highs[i] - closes[i - 1])
        lc = abs(lows[i] - closes[i - 1])
        tr[i] = max(hl, hc, lc)
    
    # Primer valor de ATR: media simple de TR
    atr[period] = np.mean(tr[1:period + 1])
    for i in range(period + 1, n):
        atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period
    return atr


def calculate_macd(closes: np.ndarray, fast: int = 12, slow: int = 26, signal_period: int = 9):
    """Calcula la línea MACD, la línea de señal y el histograma."""
    ema_fast = calculate_ema(closes, fast)
    ema_slow = calculate_ema(closes, slow)
    macd_line = ema_fast - ema_slow
    
    valid_idx = np.where(~np.isnan(macd_line))[0]
    signal_line = np.full(len(closes), np.nan, dtype=np.float64)
    histogram = np.full(len(closes), np.nan, dtype=np.float64)
    
    if len(valid_idx) >= signal_period:
        first_valid = valid_idx[0]
        sub_signal = calculate_ema(macd_line[first_valid:], signal_period)
        signal_line[first_valid:] = sub_signal
        histogram = macd_line - signal_line
        
    return macd_line, signal_line, histogram


def calculate_bollinger_bands(closes: np.ndarray, period: int = 20, num_std: float = 2.0):
    """Calcula las Bandas de Bollinger (media, banda superior, banda inferior, %B, Bandwidth)."""
    n = len(closes)
    middle = calculate_sma(closes, period)
    upper = np.full(n, np.nan, dtype=np.float64)
    lower = np.full(n, np.nan, dtype=np.float64)
    pct_b = np.full(n, np.nan, dtype=np.float64)
    bandwidth = np.full(n, np.nan, dtype=np.float64)
    
    for i in range(period - 1, n):
        window = closes[i - period + 1:i + 1]
        std = np.std(window, ddof=0)
        upper[i] = middle[i] + num_std * std
        lower[i] = middle[i] - num_std * std
        denom = upper[i] - lower[i]
        pct_b[i] = (closes[i] - lower[i]) / denom if denom > 0 else 0.5
        bandwidth[i] = denom / middle[i] if middle[i] > 0 else 0.0
        
    return middle, upper, lower, pct_b, bandwidth


def calculate_adx(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14):
    """Calcula el ADX (Average Directional Index) con líneas +DI y -DI."""
    n = len(closes)
    adx = np.full(n, np.nan, dtype=np.float64)
    plus_di = np.full(n, np.nan, dtype=np.float64)
    minus_di = np.full(n, np.nan, dtype=np.float64)
    
    if n < period * 2:
        return adx, plus_di, minus_di
    
    # Calcular movimientos direccionales
    plus_dm = np.zeros(n)
    minus_dm = np.zeros(n)
    tr = np.zeros(n)
    tr[0] = highs[0] - lows[0]
    
    for i in range(1, n):
        up_move = highs[i] - highs[i - 1]
        down_move = lows[i - 1] - lows[i]
        
        if up_move > down_move and up_move > 0:
            plus_dm[i] = up_move
        if down_move > up_move and down_move > 0:
            minus_dm[i] = down_move
            
        hl = highs[i] - lows[i]
        hc = abs(highs[i] - closes[i - 1])
        lc = abs(lows[i] - closes[i - 1])
        tr[i] = max(hl, hc, lc)
        
    # Suavizado de Wilder
    smooth_tr = np.full(n, np.nan)
    smooth_plus_dm = np.full(n, np.nan)
    smooth_minus_dm = np.full(n, np.nan)
    
    smooth_tr[period] = np.sum(tr[1:period + 1])
    smooth_plus_dm[period] = np.sum(plus_dm[1:period + 1])
    smooth_minus_dm[period] = np.sum(minus_dm[1:period + 1])
    
    for i in range(period + 1, n):
        smooth_tr[i] = smooth_tr[i - 1] - (smooth_tr[i - 1] / period) + tr[i]
        smooth_plus_dm[i] = smooth_plus_dm[i - 1] - (smooth_plus_dm[i - 1] / period) + plus_dm[i]
        smooth_minus_dm[i] = smooth_minus_dm[i - 1] - (smooth_minus_dm[i - 1] / period) + minus_dm[i]
        
    dx = np.full(n, np.nan)
    for i in range(period, n):
        if smooth_tr[i] > 0:
            plus_di[i] = 100.0 * (smooth_plus_dm[i] / smooth_tr[i])
            minus_di[i] = 100.0 * (smooth_minus_dm[i] / smooth_tr[i])
            di_sum = plus_di[i] + minus_di[i]
            dx[i] = 100.0 * (abs(plus_di[i] - minus_di[i]) / di_sum) if di_sum > 0 else 0.0
            
    # Suavizar DX para obtener ADX
    valid_dx_start = period * 2 - 1
    if n > valid_dx_start:
        adx[valid_dx_start] = np.mean(dx[period:valid_dx_start + 1])
        for i in range(valid_dx_start + 1, n):
            adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period
            
    return adx, plus_di, minus_di


def calculate_rsi(closes: np.ndarray, period: int = 14) -> np.ndarray:
    """Calcula el RSI clásico de 14 períodos."""
    n = len(closes)
    rsi = np.full(n, np.nan, dtype=np.float64)
    if n < period + 1:
        return rsi
    
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    if avg_loss == 0:
        rsi[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi[period] = 100.0 - (100.0 / (1.0 + rs))
        
    for i in range(period + 1, n):
        gain = gains[i - 1]
        loss = losses[i - 1]
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        if avg_loss == 0:
            rsi[i] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[i] = 100.0 - (100.0 / (1.0 + rs))
            
    return rsi


def calculate_stochastic_rsi(closes: np.ndarray, rsi_period: int = 14, stoch_period: int = 14, k_period: int = 3, d_period: int = 3):
    """Calcula el Stochastic RSI (%K y %D)."""
    rsi = calculate_rsi(closes, rsi_period)
    n = len(closes)
    stoch_rsi = np.full(n, np.nan, dtype=np.float64)
    
    for i in range(rsi_period + stoch_period - 1, n):
        window = rsi[i - stoch_period + 1:i + 1]
        min_rsi = np.nanmin(window)
        max_rsi = np.nanmax(window)
        rng = max_rsi - min_rsi
        stoch_rsi[i] = ((rsi[i] - min_rsi) / rng) * 100.0 if rng > 0 else 50.0
        
    k_line = calculate_sma(stoch_rsi, k_period)
    d_line = calculate_sma(k_line, d_period)
    return k_line, d_line


def calculate_vwap(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, volumes: np.ndarray) -> np.ndarray:
    """Calcula el VWAP (Volume Weighted Average Price) acumulativo."""
    n = len(closes)
    vwap = np.full(n, np.nan, dtype=np.float64)
    if n == 0:
        return vwap
    
    typical_price = (highs + lows + closes) / 3.0
    tp_vol = typical_price * volumes
    cum_tp_vol = np.cumsum(tp_vol)
    cum_vol = np.cumsum(volumes)
    
    for i in range(n):
        vwap[i] = cum_tp_vol[i] / cum_vol[i] if cum_vol[i] > 0 else closes[i]
    return vwap


def detect_candlestick_patterns(
    opens: np.ndarray, 
    highs: np.ndarray, 
    lows: np.ndarray, 
    closes: np.ndarray
) -> List[Dict[str, Any]]:
    """
    Identifica patrones clásicos de velas en los últimos 3 períodos:
    - Martillo (Hammer) / Martillo Invertido
    - Envolvente Alcista (Bullish Engulfing)
    - Envolvente Bajista (Bearish Engulfing)
    - Doji
    - Estrella de la Mañana (Morning Star)
    - Estrella del Atardecer (Evening Star)
    """
    patterns = []
    n = len(closes)
    if n < 3:
        return patterns

    # Analizar la última vela (índice -1)
    o = opens[-1]
    h = highs[-1]
    l = lows[-1]
    c = closes[-1]
    
    body = abs(c - o)
    candle_range = h - l
    upper_wick = h - max(o, c)
    lower_wick = min(o, c) - l

    # 1. Doji (cuerpo menor al 10% del rango total)
    if candle_range > 0 and (body / candle_range) <= 0.10:
        patterns.append({
            "name": "Doji",
            "type": "NEUTRAL",
            "description": "Indecisión de mercado. Equilibrio momentáneo entre oferta y demanda."
        })

    # 2. Martillo (Hammer)
    if candle_range > 0 and lower_wick >= 2.0 * body and upper_wick <= 0.2 * candle_range and c > l:
        patterns.append({
            "name": "Martillo (Hammer)",
            "type": "BULLISH",
            "description": "Rechazo contundente de precios bajos. Fuerte presión compradora."
        })

    # Analizar patrón de 2 velas (índices -2 y -1)
    prev_o = opens[-2]
    prev_c = closes[-2]
    
    # 3. Envolvente Alcista (Bullish Engulfing)
    if prev_c < prev_o and c > o:  # previa bajista, actual alcista
        if o <= prev_c and c >= prev_o:
            patterns.append({
                "name": "Envolvente Alcista",
                "type": "BULLISH",
                "description": "Cuerpo alcista actual cubre por completo el cuerpo bajista previo."
            })

    # 4. Envolvente Bajista (Bearish Engulfing)
    if prev_c > prev_o and c < o:  # previa alcista, actual bajista
        if o >= prev_c and c <= prev_o:
            patterns.append({
                "name": "Envolvente Bajista",
                "type": "BEARISH",
                "description": "Cuerpo bajista actual envuelve por completo la vela compradora previa."
            })

    # Analizar patrón de 3 velas (índices -3, -2 y -1)
    if n >= 3:
        o3, c3 = opens[-3], closes[-3]
        o2, c2 = opens[-2], closes[-2]
        body3 = abs(c3 - o3)
        body2 = abs(c2 - o2)
        
        # 5. Estrella de la Mañana (Morning Star)
        if c3 < o3 and body2 < (body3 * 0.5) and c > o and c > (o3 + c3) / 2:
            patterns.append({
                "name": "Estrella de la Mañana",
                "type": "BULLISH",
                "description": "Reversión alcista de 3 velas con agotamiento vendedor intermedio."
            })

        # 6. Estrella del Atardecer (Evening Star)
        if c3 > o3 and body2 < (body3 * 0.5) and c < o and c < (o3 + c3) / 2:
            patterns.append({
                "name": "Estrella del Atardecer",
                "type": "BEARISH",
                "description": "Reversión bajista de 3 velas tras consolidación en máximos."
            })

    return patterns


def compute_all_indicators(points: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Función maestra: procesa una lista limpia de velas y extrae todos los indicadores
    vectorizados sin duplicar cómputos.
    """
    if not points or len(points) < 5:
        return {}

    closes = np.array([p["close"] for p in points], dtype=np.float64)
    opens = np.array([p.get("open", p["close"]) for p in points], dtype=np.float64)
    highs = np.array([p.get("high", p["close"]) for p in points], dtype=np.float64)
    lows = np.array([p.get("low", p["close"]) for p in points], dtype=np.float64)
    volumes = np.array([p.get("volume", 0) for p in points], dtype=np.float64)

    # 1. EMAs
    ema9 = calculate_ema(closes, 9)
    ema21 = calculate_ema(closes, 21)
    ema50 = calculate_ema(closes, 50)
    ema200 = calculate_ema(closes, 200)

    # 2. ATR
    atr = calculate_atr(highs, lows, closes, 14)

    # 3. MACD
    macd_line, macd_signal, macd_hist = calculate_macd(closes, 12, 26, 9)

    # 4. Bandas de Bollinger
    bb_mid, bb_upper, bb_lower, bb_pct_b, bb_bandwidth = calculate_bollinger_bands(closes, 20, 2.0)

    # 5. ADX
    adx, plus_di, minus_di = calculate_adx(highs, lows, closes, 14)

    # 6. RSI y Stochastic RSI
    rsi = calculate_rsi(closes, 14)
    stoch_k, stoch_d = calculate_stochastic_rsi(closes, 14, 14, 3, 3)

    # 7. VWAP
    vwap = calculate_vwap(highs, lows, closes, volumes)

    # 8. RVOL (Volumen Relativo)
    vol_sma20 = calculate_sma(volumes, 20)
    last_vol = volumes[-1] if len(volumes) > 0 else 0
    last_vol_sma = vol_sma20[-1] if len(vol_sma20) > 0 and not np.isnan(vol_sma20[-1]) else 0
    rvol = float(last_vol / last_vol_sma) if last_vol_sma > 0 else 1.0

    # 9. Patrones de Velas
    candlestick_patterns = detect_candlestick_patterns(opens, highs, lows, closes)

    def safe_val(arr, default=None):
        if len(arr) == 0:
            return default
        v = arr[-1]
        return None if np.isnan(v) else round(float(v), 2)

    return {
        "current_price": float(closes[-1]),
        "ema": {
            "ema9": safe_val(ema9),
            "ema21": safe_val(ema21),
            "ema50": safe_val(ema50),
            "ema200": safe_val(ema200)
        },
        "atr14": safe_val(atr),
        "macd": {
            "macd": safe_val(macd_line),
            "signal": safe_val(macd_signal),
            "histogram": safe_val(macd_hist)
        },
        "bollinger": {
            "middle": safe_val(bb_mid),
            "upper": safe_val(bb_upper),
            "lower": safe_val(bb_lower),
            "pct_b": safe_val(bb_pct_b),
            "bandwidth": safe_val(bb_bandwidth)
        },
        "adx": {
            "adx": safe_val(adx),
            "plus_di": safe_val(plus_di),
            "minus_di": safe_val(minus_di)
        },
        "rsi": safe_val(rsi, default=50.0),
        "stoch_rsi": {
            "k": safe_val(stoch_k),
            "d": safe_val(stoch_d)
        },
        "vwap": safe_val(vwap),
        "rvol": round(rvol, 2),
        "patterns": candlestick_patterns
    }
