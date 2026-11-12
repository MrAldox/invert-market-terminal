# INVERT · Terminal Bursátil en Tiempo Real & Centro de Noticias

Una plataforma web interactiva de alto rendimiento inspirada en terminales financieras profesionales (como Bloomberg y TradingView) para monitorear el mercado de valores de Nueva York (NYSE/NASDAQ), seguir cotizaciones en vivo con porcentajes en verde y rojo, y consultar las noticias de última hora con análisis de impacto directo en cada acción.

---

## ✨ Características Principales

1. **Dashboard Personalizable (Watchlist & Selección de Acciones)**:
   - **Elige qué acciones ver:** Agrega o quita cualquier acción (`NVDA`, `AAPL`, `TSLA`, `MSFT`, `AMZN`, `META`, `AMD`, `PLTR`, `COIN`, `SPY`, etc.) a tu lista personal con un solo clic en la estrella (⭐).
   - Tus preferencias se guardan automáticamente en tu navegador (`localStorage`).
   - Pestañas rápidas: **Mi Watchlist**, **Tech & Magnificent 7**, **Ganadoras (+)**, **Perdedoras (-)** y **Todas**.
   - Ordenamiento ágil por mayor ganancia %, mayor pérdida %, precio o nombre.

2. **Diferenciación Visual en Verde y Rojo**:
   - **Verde esmeralda fluorescente (`+X.XX% ▲`)**: Acciones que están subiendo hoy respecto a su cierre previo.
   - **Rojo carmesí vibrante (`-X.XX% ▼`)**: Acciones que están bajando en la jornada.
   - **Destellos en vivo:** Cada vez que el precio cambia en tiempo real, la tarjeta parpadea sutilmente en verde o rojo.
   - **Mini-gráficos (Sparklines):** Cada tarjeta muestra la curva intradía del día con gradiente en verde o rojo según la tendencia.

3. **Apartado de NOTICIAS (NEWS) Instantáneas con Análisis de Impacto**:
   - Monitoreo de noticias financieras en tiempo real (Bloomberg, Reuters, CNBC, Financial Times, WSJ).
   - **Análisis de Impacto Inteligente:**
     - 🟢 **Impacto Alcista (+):** Récord de ingresos, nuevos contratos de IA, alzas de precio objetivo.
     - 🔴 **Impacto Bajista (-):** Investigaciones regulatorias, demandas, caída en ventas o advertencias de márgenes.
     - 🟡 **Macro / Neutro:** Decisiones de la Reserva Federal (tasas de interés), inflación o reportes laborales.
   - **Filtrado por acción:** Haz clic en cualquier etiqueta de acción (ej: `#NVDA` o el botón "Noticias" de una tarjeta) y el feed filtrará instantáneamente las noticias que afectan a esa acción en específico.

4. **Gráfico Interactivo Detallado (Modal Canvas)**:
   - Haz clic en cualquier acción para abrir su gráfico completo en Canvas con línea suavizada y crosshair al pasar el mouse.
   - Rangos temporales: **1D (intradía), 5D, 1M, 6M, 1Y**.
   - Estadísticas clave: Rango del día, Cierre anterior, Rango 52 Semanas y Volumen negociado.

5. **Profesional y Fácil de Entender**:
   - Ticker tape superior con los principales índices (S&P 500, NASDAQ, DOW JONES, BITCOIN, ORO, PETRÓLEO).
   - Botón de **Glosario & Guía para Inversionistas** con explicaciones sencillas sobre volumen, P/E y lectura de variaciones.
   - Selector de **Tema Oscuro / Claro**.
   - Reloj de mercado en vivo y selector de actualización automática (cada 10 segundos con pausa/reanudación).

---

## 🚀 Cómo Iniciar el Dashboard

### Opción 1: Con 1 Clic en Windows (Recomendada)
Haz doble clic en el archivo:
```text
iniciar_dashboard.bat
```
Esto iniciará el servidor backend de Python y abrirá automáticamente tu navegador en `http://localhost:8000`.

### Opción 2: Desde la Terminal PowerShell o CMD
```powershell
python server.py
```
Luego abre tu navegador en: [http://localhost:8000](http://localhost:8000)

### Opción 3: Modo Directo sin Servidor (Offline / Portátil)
Puedes hacer doble clic directamente en `index.html` o en `static/index.html`. El sistema detectará automáticamente el modo local e iniciará el motor de simulación en vivo de cotizaciones y noticias.

---

## 🛠️ Tecnologías Utilizadas
- **Frontend:** HTML5 semántico, CSS3 moderno (Variables CSS, Glassmorphism, animaciones fluidas), JavaScript Vanilla modular (sin dependencias pesadas).
- **Motor de Gráficos:** Canvas HTML5 interactivo de alta definición (Retina DPR).
- **Backend:** FastAPI (Python 3.13) + Uvicorn con memoria caché optimizada (15s TTL).
- **Fuente de Datos:** Cotizaciones y noticias bursátiles con fallback continuo de alta fidelidad.
