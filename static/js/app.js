/**
 * INVERT · Market Terminal Pro
 * Core Application Controller
 */

// Application State
const State = {
  watchlist: JSON.parse(localStorage.getItem('invert_watchlist') || '["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "PLTR", "COIN"]'),
  activeCategory: 'my_watchlist',
  sortOrder: 'changeDesc',
  newsFilter: 'all',
  stockNewsFilter: null,
  quotesData: {},
  previousPrices: {},
  newsData: [],
  autoRefreshActive: true,
  refreshSeconds: 10,
  refreshIntervalId: null,
  activeModalSymbol: null,
  activeModalRange: '1d',
  theme: localStorage.getItem('invert_theme') || 'dark',
  isOnlineBackend: true
};

// Preset catalog for categories
const StockPresets = {
  tech: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"],
  all: ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "NFLX", "PLTR", "COIN", "SPY", "QQQ", "BABA", "DIS", "UBER", "ARM", "SMCI"]
};

// Realistic mock data fallback if backend is unreachable
const MockMarket = {
  generateQuotes(symbols) {
    const bases = {
      "NVDA": { name: "NVIDIA Corporation", price: 174.20, prev: 169.50, exchange: "NASDAQ", high: 175.80, low: 168.90, vol: 64200000, high52: 178.50, low52: 68.20 },
      "AAPL": { name: "Apple Inc.", price: 228.60, prev: 226.10, exchange: "NASDAQ", high: 229.40, low: 225.80, vol: 48900000, high52: 237.20, low52: 164.00 },
      "TSLA": { name: "Tesla, Inc.", price: 219.80, prev: 224.50, exchange: "NASDAQ", high: 226.00, low: 217.20, vol: 54100000, high52: 271.00, low52: 138.80 },
      "MSFT": { name: "Microsoft Corporation", price: 426.30, prev: 423.80, exchange: "NASDAQ", high: 428.10, low: 422.50, vol: 21000000, high52: 468.30, low52: 366.50 },
      "AMZN": { name: "Amazon.com, Inc.", price: 188.50, prev: 185.70, exchange: "NASDAQ", high: 189.40, low: 185.00, vol: 35000000, high52: 201.20, low52: 118.30 },
      "GOOGL": { name: "Alphabet Inc.", price: 166.40, prev: 168.20, exchange: "NASDAQ", high: 169.10, low: 165.70, vol: 28000000, high52: 191.70, low52: 120.20 },
      "META": { name: "Meta Platforms, Inc.", price: 586.20, prev: 574.90, exchange: "NASDAQ", high: 589.00, low: 573.10, vol: 18200000, high52: 602.90, low52: 279.40 },
      "AMD": { name: "Advanced Micro Devices", price: 154.60, prev: 151.20, exchange: "NASDAQ", high: 156.40, low: 150.30, vol: 41000000, high52: 227.30, low52: 94.00 },
      "PLTR": { name: "Palantir Technologies", price: 43.80, prev: 41.20, exchange: "NYSE", high: 44.50, low: 40.80, vol: 52000000, high52: 45.10, low52: 14.50 },
      "COIN": { name: "Coinbase Global, Inc.", price: 216.40, prev: 207.10, exchange: "NASDAQ", high: 220.00, low: 205.50, vol: 14300000, high52: 283.40, low52: 70.10 },
      "NFLX": { name: "Netflix, Inc.", price: 712.00, prev: 704.50, exchange: "NASDAQ", high: 716.40, low: 702.00, vol: 6200000, high52: 730.00, low52: 370.20 },
      "SPY": { name: "SPDR S&P 500 ETF", price: 588.40, prev: 585.80, exchange: "NYSE", high: 589.60, low: 585.20, vol: 62000000, high52: 590.20, low52: 410.00 },
      "QQQ": { name: "Invesco QQQ Trust", price: 498.20, prev: 494.50, exchange: "NASDAQ", high: 500.10, low: 493.80, vol: 45000000, high52: 503.50, low52: 350.00 },
      "BABA": { name: "Alibaba Group Holding", price: 92.50, prev: 94.20, exchange: "NYSE", high: 95.00, low: 91.80, vol: 32000000, high52: 117.50, low52: 68.00 },
      "DIS": { name: "Walt Disney Company", price: 98.40, prev: 97.20, exchange: "NYSE", high: 99.20, low: 96.80, vol: 11000000, high52: 123.70, low52: 78.70 },
      "UBER": { name: "Uber Technologies", price: 74.80, prev: 73.10, exchange: "NYSE", high: 75.60, low: 72.80, vol: 24000000, high52: 87.00, low52: 40.00 },
      "ARM": { name: "ARM Holdings plc", price: 142.30, prev: 138.50, exchange: "NASDAQ", high: 144.00, low: 137.20, vol: 16000000, high52: 188.70, low52: 46.50 },
      "SMCI": { name: "Super Micro Computer", price: 23.40, prev: 26.80, exchange: "NASDAQ", high: 27.50, low: 22.80, vol: 89000000, high52: 122.90, low52: 21.00 }
    };

    return symbols.map(sym => {
      const b = bases[sym] || {
        name: sym,
        price: 100.0,
        prev: 98.0,
        exchange: "NASDAQ",
        high: 102.0,
        low: 97.0,
        vol: 10000000,
        high52: 120.0,
        low52: 80.0
      };
      
      // Add slight dynamic noise to simulate real-time ticks
      const noise = (Math.random() - 0.49) * (b.price * 0.003);
      const currentPrice = Number((b.price + noise).toFixed(2));
      const change = Number((currentPrice - b.prev).toFixed(2));
      const changePct = Number(((change / b.prev) * 100).toFixed(2));
      
      // Generate sparkline
      const sparkline = [];
      let cur = b.prev;
      for (let i = 0; i < 20; i++) {
        cur += (currentPrice - b.prev) / 20 + (Math.random() - 0.5) * 0.3;
        sparkline.push(Number(cur.toFixed(2)));
      }
      sparkline.push(currentPrice);

      return {
        symbol: sym,
        name: b.name,
        exchange: b.exchange,
        price: currentPrice,
        previousClose: b.prev,
        change: change,
        changePercent: changePct,
        high: Math.max(b.high, currentPrice),
        low: Math.min(b.low, currentPrice),
        volume: b.vol,
        fiftyTwoWeekHigh: b.high52,
        fiftyTwoWeekLow: b.low52,
        sparkline: sparkline
      };
    });
  },

  generateNews() {
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        uuid: "n-1",
        title: "NVIDIA anuncia aceleración masiva en demanda de centros de datos para IA y supera previsiones",
        publisher: "Bloomberg Línea",
        link: "https://finance.yahoo.com/quote/NVDA",
        time: now - 180,
        tickers: ["NVDA", "AMD", "MSFT"],
        sentiment: "bullish",
        badge: "🟢 Impacto Alcista",
        impactType: "positive",
        impactExplanation: "Catalizador de ingresos: Los pedidos récord de semiconductores confirman el auge de inversión en inteligencia artificial."
      },
      {
        uuid: "n-2",
        title: "Tesla optimiza producción con nueva arquitectura de baterías y expande pruebas de conducción autónoma",
        publisher: "Reuters",
        link: "https://finance.yahoo.com/quote/TSLA",
        time: now - 520,
        tickers: ["TSLA"],
        sentiment: "bullish",
        badge: "🟢 Impacto Alcista",
        impactType: "positive",
        impactExplanation: "Margen operativo superior: La reducción de costos por batería amplía la rentabilidad estimada para los próximos trimestres."
      },
      {
        uuid: "n-3",
        title: "La Reserva Federal mantiene cautela en el ritmo de recorte de tipos de interés ante persistencia inflacionaria",
        publisher: "Wall Street Journal",
        link: "https://finance.yahoo.com",
        time: now - 1200,
        tickers: ["SPY", "QQQ"],
        sentiment: "neutral",
        badge: "🟡 Impacto Moderado / Macro",
        impactType: "neutral",
        impactExplanation: "Efecto macroeconómico: Tipos estables mantienen el costo del dinero y moderan la euforia en múltiplos bursátiles."
      },
      {
        uuid: "n-4",
        title: "Super Micro Computer bajo revisión tras retraso en entrega de informes contables anuales",
        publisher: "Financial Times",
        link: "https://finance.yahoo.com/quote/SMCI",
        time: now - 2100,
        tickers: ["SMCI"],
        sentiment: "bearish",
        badge: "🔴 Impacto Bajista",
        impactType: "negative",
        impactExplanation: "Riesgo de gobernanza: Incertidumbre sobre auditoría genera ventas masivas y salida de fondos institucionales."
      },
      {
        uuid: "n-5",
        title: "Apple prepara integración profunda de modelos de lenguaje en Siri y nuevo ciclo de renovación de iPhones",
        publisher: "CNBC",
        link: "https://finance.yahoo.com/quote/AAPL",
        time: now - 3400,
        tickers: ["AAPL"],
        sentiment: "bullish",
        badge: "🟢 Impacto Alcista",
        impactType: "positive",
        impactExplanation: "Impulso de ventas: Expectativa de superciclo de actualización de hardware entre los usuarios existentes."
      },
      {
        uuid: "n-6",
        title: "Palantir firma nuevo contrato multimillonario con agencias gubernamentales de defensa y seguridad",
        publisher: "Investor's Business Daily",
        link: "https://finance.yahoo.com/quote/PLTR",
        time: now - 4800,
        tickers: ["PLTR"],
        sentiment: "bullish",
        badge: "🟢 Impacto Alcista",
        impactType: "positive",
        impactExplanation: "Ingresos recurrentes garantizados: Mayor adopción del software empresarial AIP en contratos a largo plazo."
      },
      {
        uuid: "n-7",
        title: "Coinbase registra fuerte incremento de volumen ante el repunte de Bitcoin y activos digitales",
        publisher: "CoinDesk",
        link: "https://finance.yahoo.com/quote/COIN",
        time: now - 6200,
        tickers: ["COIN"],
        sentiment: "bullish",
        badge: "🟢 Impacto Alcista",
        impactType: "positive",
        impactExplanation: "Aumento directo en comisiones: Las transacciones spot y derivados impulsan el EBITDA de la plataforma."
      }
    ];
  }
};

// ==========================================
// CORE INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  loadData();
  startAutoRefresh();
});

// Setup Theme
function initTheme() {
  if (State.theme === 'light') {
    document.body.classList.add('light-theme');
    document.getElementById('themeIcon').className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('light-theme');
    document.getElementById('themeIcon').className = 'fa-solid fa-moon';
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  State.theme = isLight ? 'light' : 'dark';
  localStorage.setItem('invert_theme', State.theme);
  document.getElementById('themeIcon').className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  // Re-render sparklines so colors stay sharp
  renderStockCards();
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Theme toggle
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  // Category Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      State.activeCategory = target.dataset.category;
      renderStockCards();
    });
  });

  // Sort dropdown
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    State.sortOrder = e.target.value;
    renderStockCards();
  });

  // News Filter Pills
  document.querySelectorAll('.news-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.news-pill-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      State.newsFilter = target.dataset.newsFilter;
      renderNewsList();
    });
  });

  // Clear active stock news filter
  document.getElementById('clearStockFilterBtn').addEventListener('click', () => {
    State.stockNewsFilter = null;
    document.getElementById('activeStockFilterBox').style.display = 'none';
    renderNewsList();
  });

  // Manual refresh button
  document.getElementById('manualRefreshBtn').addEventListener('click', () => {
    const icon = document.querySelector('#manualRefreshBtn i');
    icon.classList.add('fa-spin');
    loadData().finally(() => {
      setTimeout(() => icon.classList.remove('fa-spin'), 600);
    });
  });

  // Toggle Auto-Refresh Play/Pause
  document.getElementById('toggleAutoRefreshBtn').addEventListener('click', () => {
    State.autoRefreshActive = !State.autoRefreshActive;
    const icon = document.getElementById('refreshPlayPauseIcon');
    if (State.autoRefreshActive) {
      icon.className = 'fa-solid fa-pause';
      document.getElementById('refreshTimer').style.color = 'var(--color-accent)';
    } else {
      icon.className = 'fa-solid fa-play';
      document.getElementById('refreshTimer').style.color = 'var(--text-muted)';
      document.getElementById('refreshTimer').innerText = 'Pausa';
    }
  });

  // Global Search Input
  const searchInput = document.getElementById('globalSearchInput');
  const searchDropdown = document.getElementById('searchResultsDropdown');
  searchInput.addEventListener('input', debounce((e) => {
    handleSearchInput(e.target.value, searchDropdown);
  }, 250));

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.style.display = 'none';
    }
  });

  // Modals Setup
  setupModals();
}

function setupModals() {
  // Add Stock Modal
  const addModal = document.getElementById('addStockModal');
  document.getElementById('openAddModalBtn').addEventListener('click', () => {
    addModal.classList.add('open');
    document.getElementById('modalSearchInput').focus();
  });
  document.getElementById('closeAddModalBtn').addEventListener('click', () => {
    addModal.classList.remove('open');
  });

  // Modal Search Input
  const modalSearchInput = document.getElementById('modalSearchInput');
  const modalResults = document.getElementById('modalSearchResults');
  modalSearchInput.addEventListener('input', debounce((e) => {
    handleSearchInput(e.target.value, modalResults, true);
  }, 250));

  // Quick Add Shortcuts
  document.querySelectorAll('.shortcut-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sym = btn.dataset.addSym;
      addStockToWatchlist(sym);
      addModal.classList.remove('open');
    });
  });

  // Chart Modal
  const chartModal = document.getElementById('chartModal');
  document.getElementById('closeChartModalBtn').addEventListener('click', () => {
    chartModal.classList.remove('open');
  });

  // Chart Timeframe Buttons
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      State.activeModalRange = e.currentTarget.dataset.range;
      loadDetailedChart(State.activeModalSymbol, State.activeModalRange);
    });
  });

  // Glossary Modal
  const glossaryModal = document.getElementById('glossaryModal');
  document.getElementById('openGlossaryBtn').addEventListener('click', () => {
    glossaryModal.classList.add('open');
  });
  document.getElementById('closeGlossaryModalBtn').addEventListener('click', () => {
    glossaryModal.classList.remove('open');
  });

  // Close modals on overlay backdrop click
  [addModal, chartModal, glossaryModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });
}

// ==========================================
// DATA FETCHING & SYNC
// ==========================================
async function loadData() {
  // Combine all symbols that might be displayed
  const allSymbols = Array.from(new Set([
    ...State.watchlist,
    ...StockPresets.tech,
    ...StockPresets.all
  ]));

  try {
    // Try fetching from real backend
    const API_BASE = window.INVERT_API_URL || '';
    const quotesRes = await fetch(`${API_BASE}/api/quotes?symbols=${allSymbols.join(',')}`, { signal: AbortSignal.timeout(4000) });
    const isJson = quotesRes.ok && (quotesRes.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      const quotes = await quotesRes.json();
      quotes.forEach(q => {
        // Track previous price for flash animation
        if (State.quotesData[q.symbol]) {
          State.previousPrices[q.symbol] = State.quotesData[q.symbol].price;
        }
        State.quotesData[q.symbol] = q;
      });
      State.isOnlineBackend = true;
    } else {
      throw new Error("Backend offline");
    }

    // Fetch news
    const newsRes = await fetch(`${API_BASE}/api/news?limit=25`, { signal: AbortSignal.timeout(4000) });
    if (newsRes.ok && (newsRes.headers.get('content-type') || '').includes('application/json')) {
      State.newsData = await newsRes.json();
    }

    // Fetch market indices for ribbon
    const indicesRes = await fetch(`${API_BASE}/api/market-summary`, { signal: AbortSignal.timeout(4000) });
    if (indicesRes.ok && (indicesRes.headers.get('content-type') || '').includes('application/json')) {
      renderTickerTape(await indicesRes.json());
    }

  } catch (err) {
    // Fallback to internal simulation engine
    State.isOnlineBackend = false;
    const fallbackQuotes = MockMarket.generateQuotes(allSymbols);
    fallbackQuotes.forEach(q => {
      if (State.quotesData[q.symbol]) {
        State.previousPrices[q.symbol] = State.quotesData[q.symbol].price;
      }
      State.quotesData[q.symbol] = q;
    });
    if (State.newsData.length === 0) {
      State.newsData = MockMarket.generateNews();
    }
  }

  // Update DOM counts & views
  document.getElementById('countMyWatchlist').innerText = State.watchlist.length;
  renderStockCards();
  renderNewsList();
  renderPortfolioSummary();
}

// Auto-Refresh timer loop
function startAutoRefresh() {
  if (State.refreshIntervalId) clearInterval(State.refreshIntervalId);
  State.refreshSeconds = 10;

  State.refreshIntervalId = setInterval(() => {
    if (!State.autoRefreshActive) return;

    State.refreshSeconds--;
    if (State.refreshSeconds <= 0) {
      State.refreshSeconds = 10;
      loadData();
    }
    const timerElem = document.getElementById('refreshTimer');
    if (timerElem) timerElem.innerText = `${State.refreshSeconds}s`;
  }, 1000);
}

// ==========================================
// RENDERING: TICKER TAPE (RIBBON SUPERIOR)
// ==========================================
function renderTickerTape(indices) {
  const container = document.getElementById('tickerTapeWrapper');
  if (!container || !indices || indices.length === 0) return;

  // Duplicate list to create seamless infinite loop
  const doubleList = [...indices, ...indices];

  container.innerHTML = doubleList.map(item => {
    const isUp = item.changePercent >= 0;
    const badgeClass = isUp ? 'badge-green' : 'badge-red';
    const sign = isUp ? '+' : '';
    const arrow = isUp ? '▲' : '▼';
    return `
      <div class="ticker-index-item" onclick="openChartModal('${item.symbol}')">
        <span class="ticker-index-name">${item.label || item.symbol}</span>
        <span class="ticker-index-price">$${formatNum(item.price)}</span>
        <span class="badge-pct ${badgeClass}">${sign}${item.changePercent.toFixed(2)}% ${arrow}</span>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDERING: STOCK CARDS (VERDE / ROJO)
// ==========================================
function renderStockCards() {
  const grid = document.getElementById('stocksGrid');
  if (!grid) return;

  // Determine which symbols to display based on category
  let symbols = [];
  if (State.activeCategory === 'my_watchlist') {
    symbols = [...State.watchlist];
  } else if (State.activeCategory === 'tech') {
    symbols = [...StockPresets.tech];
  } else if (State.activeCategory === 'gainers') {
    symbols = Object.values(State.quotesData)
      .filter(q => q.changePercent >= 0)
      .map(q => q.symbol);
  } else if (State.activeCategory === 'losers') {
    symbols = Object.values(State.quotesData)
      .filter(q => q.changePercent < 0)
      .map(q => q.symbol);
  } else {
    // All
    symbols = Array.from(new Set([...State.watchlist, ...StockPresets.all]));
  }

  // Retrieve quote objects
  let cards = symbols.map(sym => State.quotesData[sym]).filter(Boolean);

  // Sorting
  if (State.sortOrder === 'changeDesc') {
    cards.sort((a, b) => b.changePercent - a.changePercent);
  } else if (State.sortOrder === 'changeAsc') {
    cards.sort((a, b) => a.changePercent - b.changePercent);
  } else if (State.sortOrder === 'priceDesc') {
    cards.sort((a, b) => b.price - a.price);
  } else if (State.sortOrder === 'symbolAsc') {
    cards.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  if (cards.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-folder-open empty-icon"></i>
        <h3>No hay acciones en esta vista</h3>
        <p>Añade acciones a tu lista personal con el botón "+ Añadir Acción" o selecciona otra pestaña.</p>
        <button class="btn-primary" style="margin-top: 10px;" onclick="document.getElementById('openAddModalBtn').click()">
          <i class="fa-solid fa-plus"></i> Añadir Acciones Ahora
        </button>
      </div>
    `;
    return;
  }

  // Render cards HTML
  grid.innerHTML = cards.map(stock => {
    const isUp = stock.changePercent >= 0;
    const isPinned = State.watchlist.includes(stock.symbol);
    const badgeClass = isUp ? 'badge-green' : 'badge-red';
    const sign = isUp ? '+' : '';
    const arrow = isUp ? '▲' : '▼';
    const dollarColor = isUp ? 'var(--color-green-text)' : 'var(--color-red-text)';

    // Flash animation check
    const prevPrice = State.previousPrices[stock.symbol];
    let flashClass = '';
    if (prevPrice !== undefined && prevPrice !== stock.price) {
      flashClass = stock.price > prevPrice ? 'flash-up' : 'flash-down';
    }

    // Range calculation
    const rangeSpan = (stock.high - stock.low) || 1;
    const rangePct = Math.max(0, Math.min(100, ((stock.price - stock.low) / rangeSpan) * 100));

    return `
      <div class="stock-card ${flashClass}" id="card-${stock.symbol}" onclick="openChartModal('${stock.symbol}')">
        
        <!-- Top: Symbol & Pin -->
        <div class="card-top">
          <div class="stock-identity">
            <div class="stock-symbol-row">
              <span class="stock-symbol">${stock.symbol}</span>
              <span class="stock-exchange">${stock.exchange || 'US'}</span>
            </div>
            <span class="stock-name" title="${stock.name}">${stock.name}</span>
          </div>

          <button 
            class="card-pin-btn ${isPinned ? 'pinned' : ''}" 
            title="${isPinned ? 'Quitar de mi Watchlist' : 'Añadir a mi Watchlist'}"
            onclick="event.stopPropagation(); toggleWatchlistPin('${stock.symbol}')"
          >
            <i class="fa-${isPinned ? 'solid' : 'regular'} fa-star"></i>
          </button>
        </div>

        <!-- Price & Dynamic Percentage Badge (VERDE / ROJO) -->
        <div class="card-price-section">
          <div class="price-main">$${formatNum(stock.price)}</div>
          <div class="price-changes">
            <span class="badge-pct ${badgeClass}">
              ${sign}${stock.changePercent.toFixed(2)}% ${arrow}
            </span>
            <span class="dollar-change" style="color: ${dollarColor};">
              ${sign}$${Math.abs(stock.change).toFixed(2)}
            </span>
          </div>
        </div>

        <!-- Mini Sparkline Canvas -->
        <div class="card-sparkline-box">
          <canvas id="spark-${stock.symbol}" class="sparkline-canvas"></canvas>
        </div>

        <!-- Day High / Low Range Slider -->
        <div class="day-range-wrapper">
          <div class="range-labels">
            <span>Bajo: $${formatNum(stock.low)}</span>
            <span>Alto: $${formatNum(stock.high)}</span>
          </div>
          <div class="range-bar-track">
            <div class="range-bar-fill" style="left: ${rangePct}%; width: 6px; transform: translateX(-50%);"></div>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="card-footer">
          <span>Vol: ${formatVolume(stock.volume)}</span>
          <div style="display:flex; gap:10px;">
            <button class="card-action-btn" onclick="event.stopPropagation(); filterNewsForStock('${stock.symbol}')">
              <i class="fa-solid fa-newspaper"></i> Noticias
            </button>
            <button class="card-action-btn" onclick="event.stopPropagation(); openChartModal('${stock.symbol}')">
              <i class="fa-solid fa-chart-area"></i> Gráfico
            </button>
          </div>
        </div>

      </div>
    `;
  }).join('');

  // Draw sparklines for all rendered cards
  cards.forEach(stock => {
    const canvas = document.getElementById(`spark-${stock.symbol}`);
    if (canvas && stock.sparkline) {
      ChartEngine.renderSparkline(canvas, stock.sparkline, stock.changePercent >= 0);
    }
  });
}

// ==========================================
// RENDERING: PORTFOLIO SUMMARY BAR
// ==========================================
function renderPortfolioSummary() {
  const cards = Object.values(State.quotesData);
  if (cards.length === 0) return;

  // Active view count
  let visibleSymbols = [];
  if (State.activeCategory === 'my_watchlist') visibleSymbols = State.watchlist;
  else if (State.activeCategory === 'tech') visibleSymbols = StockPresets.tech;
  else visibleSymbols = cards.map(c => c.symbol);

  const activeCards = visibleSymbols.map(s => State.quotesData[s]).filter(Boolean);

  const total = activeCards.length;
  const greens = activeCards.filter(c => c.changePercent >= 0).length;
  const reds = activeCards.filter(c => c.changePercent < 0).length;

  const avgChange = total > 0 
    ? activeCards.reduce((acc, c) => acc + c.changePercent, 0) / total 
    : 0;

  document.getElementById('summaryTotalStocks').innerText = total;

  const avgElem = document.getElementById('summaryAvgPerformance');
  const sign = avgChange >= 0 ? '+' : '';
  avgElem.innerText = `${sign}${avgChange.toFixed(2)}%`;
  avgElem.style.color = avgChange >= 0 ? 'var(--color-green-text)' : 'var(--color-red-text)';

  document.getElementById('summaryGreenCount').innerText = `${greens} Subiendo ▲`;
  document.getElementById('summaryRedCount').innerText = `${reds} Bajando ▼`;
}

// ==========================================
// RENDERING: NEWS FEED (NOTICIAS INSTANTÁNEAS)
// ==========================================
function renderNewsList() {
  const container = document.getElementById('newsList');
  if (!container) return;

  let filtered = [...State.newsData];

  // Filter by stock if user clicked an action or ticker tag
  if (State.stockNewsFilter) {
    filtered = filtered.filter(n => n.tickers && n.tickers.includes(State.stockNewsFilter));
  }

  // Filter by sentiment pill
  if (State.newsFilter === 'positive') {
    filtered = filtered.filter(n => n.sentiment === 'bullish');
  } else if (State.newsFilter === 'negative') {
    filtered = filtered.filter(n => n.sentiment === 'bearish');
  } else if (State.newsFilter === 'breaking') {
    filtered = filtered.slice(0, 5);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-newspaper empty-icon"></i>
        <p>No hay noticias con los filtros seleccionados.</p>
        ${State.stockNewsFilter ? '<button class="clear-filter-btn" onclick="document.getElementById(\'clearStockFilterBtn\').click()">Restablecer filtro</button>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const timeAgo = formatTimeAgo(item.time);
    const impactClass = item.impactType || (item.sentiment === 'bullish' ? 'positive' : item.sentiment === 'bearish' ? 'negative' : 'neutral');
    
    // Ticker tags badges
    const tickerBadges = (item.tickers || []).map(t => `
      <span class="ticker-tag" onclick="filterNewsForStock('${t}')">#${t}</span>
    `).join('');

    return `
      <div class="news-card">
        
        <!-- Metadata: Publisher and Time -->
        <div class="news-meta">
          <span class="news-publisher"><i class="fa-regular fa-newspaper"></i> ${item.publisher}</span>
          <span class="news-time">${timeAgo}</span>
        </div>

        <!-- Headline -->
        <h3 class="news-headline">${item.title}</h3>

        <!-- Impact Explanation Box -->
        <div class="news-impact-box ${impactClass}">
          <div class="news-impact-title">
            <i class="fa-solid fa-circle-exclamation"></i>
            ${item.badge || 'Análisis de Mercado'}
          </div>
          <div>${item.impactExplanation || 'Información relevante para las expectativas de cotización.'}</div>
        </div>

        <!-- Footer: Tickers and Read link -->
        <div class="news-footer-tags">
          <div class="ticker-tags-group">
            ${tickerBadges}
          </div>
          <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="news-link-btn">
            Leer artículo <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>

      </div>
    `;
  }).join('');
}

// Filter news for a specific stock
function filterNewsForStock(symbol) {
  State.stockNewsFilter = symbol;
  const alertBox = document.getElementById('activeStockFilterBox');
  const tagElem = document.getElementById('activeFilteredStockTag');
  tagElem.innerText = symbol;
  alertBox.style.display = 'flex';

  renderNewsList();

  // Scroll to news section on mobile
  const newsSection = document.querySelector('.news-section');
  if (newsSection && window.innerWidth <= 1200) {
    newsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// ==========================================
// WATCHLIST ACTIONS (ADD / REMOVE / PIN)
// ==========================================
function toggleWatchlistPin(symbol) {
  const index = State.watchlist.indexOf(symbol);
  if (index >= 0) {
    State.watchlist.splice(index, 1);
  } else {
    State.watchlist.push(symbol);
  }
  localStorage.setItem('invert_watchlist', JSON.stringify(State.watchlist));
  document.getElementById('countMyWatchlist').innerText = State.watchlist.length;
  renderStockCards();
  renderPortfolioSummary();
}

function addStockToWatchlist(symbol) {
  const sym = symbol.toUpperCase().trim();
  if (!sym) return;

  if (!State.watchlist.includes(sym)) {
    State.watchlist.push(sym);
    localStorage.setItem('invert_watchlist', JSON.stringify(State.watchlist));
  }

  // Switch to personal watchlist tab to show immediate feedback
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tabMyWatchlist').classList.add('active');
  State.activeCategory = 'my_watchlist';

  loadData();
}

// ==========================================
// DETAILED CHART MODAL CONTROLLER
// ==========================================
async function openChartModal(symbol) {
  State.activeModalSymbol = symbol;
  const modal = document.getElementById('chartModal');
  const stock = State.quotesData[symbol] || {
    symbol: symbol,
    name: symbol,
    price: 150.0,
    change: 1.5,
    changePercent: 1.0,
    previousClose: 148.5,
    high: 152.0,
    low: 147.0,
    volume: 10000000,
    fiftyTwoWeekHigh: 180.0,
    fiftyTwoWeekLow: 90.0
  };

  // Populate Header
  document.getElementById('modalStockTitle').innerText = `${stock.name} (${stock.symbol})`;
  document.getElementById('modalStockPrice').innerText = `$${formatNum(stock.price)}`;

  const isUp = stock.changePercent >= 0;
  const sign = isUp ? '+' : '';
  const dollarElem = document.getElementById('modalStockDollarChange');
  dollarElem.innerText = `${sign}$${Math.abs(stock.change).toFixed(2)}`;
  dollarElem.style.color = isUp ? 'var(--color-green-text)' : 'var(--color-red-text)';

  const badgeElem = document.getElementById('modalStockBadge');
  badgeElem.className = `badge-pct ${isUp ? 'badge-green' : 'badge-red'}`;
  badgeElem.innerText = `${sign}${stock.changePercent.toFixed(2)}% ${isUp ? '▲' : '▼'}`;

  // Populate Key stats
  document.getElementById('modalStatRange').innerText = `$${formatNum(stock.low)} - $${formatNum(stock.high)}`;
  document.getElementById('modalStatPrevClose').innerText = `$${formatNum(stock.previousClose)}`;
  document.getElementById('modalStat52Week').innerText = `$${formatNum(stock.fiftyTwoWeekLow)} - $${formatNum(stock.fiftyTwoWeekHigh)}`;
  document.getElementById('modalStatVolume').innerText = formatVolume(stock.volume);

  // Populate Related News
  const newsContainer = document.getElementById('modalStockNewsContainer');
  const relatedNews = State.newsData.filter(n => n.tickers && n.tickers.includes(symbol));
  if (relatedNews.length > 0) {
    newsContainer.innerHTML = relatedNews.map(n => `
      <div style="background:var(--bg-card); padding:8px 12px; border-radius:6px; font-size:0.8rem; border-left:3px solid var(--color-accent);">
        <strong>${n.title}</strong>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${n.publisher} &bull; ${formatTimeAgo(n.time)}</div>
      </div>
    `).join('');
  } else {
    newsContainer.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">No hay noticias recientes que afecten directamente a ${symbol}.</p>`;
  }

  modal.classList.add('open');

  // Load chart data
  loadDetailedChart(symbol, State.activeModalRange);
}

async function loadDetailedChart(symbol, rangeVal) {
  const canvas = document.getElementById('interactiveCanvas');
  const stock = State.quotesData[symbol];
  const isUp = stock ? stock.changePercent >= 0 : true;
  const prevClose = stock ? stock.previousClose : 100;

  try {
    const API_BASE = window.INVERT_API_URL || '';
    const res = await fetch(`${API_BASE}/api/chart?symbol=${symbol}&range_val=${rangeVal}`, { signal: AbortSignal.timeout(4000) });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const chartData = await res.json();
      if (chartData.history && chartData.history.length > 0) {
        ChartEngine.renderInteractiveChart(canvas, chartData.history, symbol, chartData.changePercent >= 0, chartData.previousClose);
        return;
      }
    }
  } catch (e) {
    // Backend offline or error -> generate smooth simulated series
  }

  // Fallback points generation
  const points = [];
  const count = rangeVal === '1d' ? 30 : rangeVal === '5d' ? 40 : 60;
  const now = Math.floor(Date.now() / 1000);
  const base = stock ? stock.price : 150;
  let curr = stock ? stock.previousClose : base;

  for (let i = 0; i < count; i++) {
    curr += (base - curr) / (count - i) + (Math.random() - 0.49) * (base * 0.015);
    points.push({
      time: now - (count - i) * (rangeVal === '1d' ? 300 : 3600 * 4),
      close: Number(curr.toFixed(2))
    });
  }
  points.push({ time: now, close: base });

  ChartEngine.renderInteractiveChart(canvas, points, symbol, isUp, prevClose);
}

// ==========================================
// SEARCH AUTOCOMPLETE
// ==========================================
async function handleSearchInput(query, dropdownElem, isModal = false) {
  const q = query.trim().toUpperCase();
  if (!q) {
    dropdownElem.style.display = 'none';
    dropdownElem.innerHTML = '';
    return;
  }

  let results = [];
  try {
    const API_BASE = window.INVERT_API_URL || '';
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      results = await res.json();
    }
  } catch (e) {
    // Local catalog search fallback
    const catalog = [
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
      { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
      { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ" },
      { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
      { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ" },
      { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
      { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ" },
      { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ" },
      { symbol: "PLTR", name: "Palantir Technologies", exchange: "NYSE" },
      { symbol: "COIN", name: "Coinbase Global", exchange: "NASDAQ" },
      { symbol: "NFLX", name: "Netflix, Inc.", exchange: "NASDAQ" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSE" },
      { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ" }
    ];
    results = catalog.filter(c => c.symbol.includes(q) || c.name.toUpperCase().includes(q));
  }

  if (results.length === 0) {
    dropdownElem.innerHTML = `<div style="padding:10px 14px; font-size:0.8rem; color:var(--text-muted);">No se encontraron acciones para "${query}"</div>`;
    dropdownElem.style.display = 'block';
    return;
  }

  dropdownElem.innerHTML = results.slice(0, 8).map(item => `
    <div class="search-item" onclick="selectSearchedStock('${item.symbol}', ${isModal})">
      <div>
        <span class="search-item-sym">${item.symbol}</span>
        <span class="search-item-name">${item.name}</span>
      </div>
      <button class="search-item-btn">
        <i class="fa-solid fa-plus"></i> Añadir
      </button>
    </div>
  `).join('');

  dropdownElem.style.display = 'block';
}

function selectSearchedStock(symbol, isModal) {
  addStockToWatchlist(symbol);
  document.getElementById('searchResultsDropdown').style.display = 'none';
  document.getElementById('globalSearchInput').value = '';
  if (isModal) {
    document.getElementById('addStockModal').classList.remove('open');
    document.getElementById('modalSearchInput').value = '';
    document.getElementById('modalSearchResults').style.display = 'none';
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatNum(num) {
  if (num === undefined || num === null) return '0.00';
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(vol) {
  if (!vol) return 'N/A';
  if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
  return vol.toString();
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Reciente';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);

  if (diff < 60) return 'Hace unos segundos';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
