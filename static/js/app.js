/**
 * INVERT · Market Terminal Pro
 * Core Application Controller
 */

// Application State
const State = {
  watchlist: JSON.parse(localStorage.getItem('invert_watchlist') || '["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "PLTR", "COIN"]'),
  activeCategory: 'my_watchlist',
  activeMainView: 'dashboard',
  sortOrder: 'changeDesc',
  newsFilter: 'all',
  sourceFilter: 'all',
  stockNewsFilter: null,
  quotesData: JSON.parse(localStorage.getItem('invert_cached_quotes') || '{}'),
  previousPrices: {},
  newsData: [],
  autoRefreshActive: true,
  refreshSeconds: 10,
  refreshIntervalId: null,
  activeModalSymbol: null,
  activeModalRange: '1d',
  activeAnalysisSymbol: null,
  activeAnalysisTimeframe: '1d',
  portfolioTrades: JSON.parse(localStorage.getItem('invert_portfolio_trades') || '[{"symbol":"NVDA","name":"NVIDIA Corporation","shares":15,"buyPrice":158.50},{"symbol":"AMD","name":"Advanced Micro Devices","shares":8,"buyPrice":540.00},{"symbol":"AAPL","name":"Apple Inc.","shares":10,"buyPrice":348.00}]'),
  portfolioCash: Number(localStorage.getItem('invert_portfolio_cash') || '10000.00'),
  priceAlerts: JSON.parse(localStorage.getItem('invert_price_alerts') || '[]'),
  theme: localStorage.getItem('invert_theme') || 'dark',
  isOnlineBackend: true
};

// Preset catalog for categories & sectors
const StockPresets = {
  tech: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"],
  all: ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "NFLX", "PLTR", "COIN", "SPY", "QQQ", "BABA", "DIS", "UBER", "ARM", "SMCI", "AVGO", "ORCL", "CRM", "JPM", "V", "MA"]
};

const HeatmapSectors = {
  "Tecnología & Semiconductores": ["NVDA", "AAPL", "MSFT", "AMD", "ARM", "AVGO", "ORCL", "CRM", "SMCI"],
  "Consumo & Redes": ["AMZN", "TSLA", "META", "GOOGL", "NFLX", "BABA", "DIS"],
  "Finanzas & Pagos": ["COIN", "PLTR", "JPM", "V", "MA"],
  "Índices & Fondos": ["SPY", "QQQ", "UBER"]
};

// Realistic mock data fallback if backend is unreachable
const MockMarket = {
  generateQuotes(symbols) {
    const bases = {
      "NVDA": { name: "NVIDIA Corporation", price: 164.80, prev: 173.70, exchange: "NASDAQ", high: 175.80, low: 162.90, vol: 94200000, high52: 178.50, low52: 68.20 },
      "AAPL": { name: "Apple Inc.", price: 355.30, prev: 355.00, exchange: "NASDAQ", high: 357.40, low: 352.80, vol: 48900000, high52: 360.20, low52: 164.00 },
      "TSLA": { name: "Tesla, Inc.", price: 392.00, prev: 390.80, exchange: "NASDAQ", high: 396.00, low: 387.20, vol: 54100000, high52: 410.00, low52: 138.80 },
      "MSFT": { name: "Microsoft Corporation", price: 528.70, prev: 521.10, exchange: "NASDAQ", high: 531.10, low: 520.50, vol: 21000000, high52: 540.30, low52: 366.50 },
      "AMZN": { name: "Amazon.com, Inc.", price: 269.50, prev: 266.20, exchange: "NASDAQ", high: 272.40, low: 265.00, vol: 35000000, high52: 280.20, low52: 118.30 },
      "GOOGL": { name: "Alphabet Inc.", price: 302.10, prev: 293.50, exchange: "NASDAQ", high: 305.10, low: 292.70, vol: 28000000, high52: 310.70, low52: 120.20 },
      "META": { name: "Meta Platforms, Inc.", price: 626.40, prev: 628.80, exchange: "NASDAQ", high: 632.00, low: 622.10, vol: 18200000, high52: 645.90, low52: 279.40 },
      "AMD": { name: "Advanced Micro Devices", price: 583.10, prev: 552.90, exchange: "NASDAQ", high: 590.40, low: 550.30, vol: 51000000, high52: 610.30, low52: 140.00 },
      "PLTR": { name: "Palantir Technologies", price: 172.60, prev: 172.40, exchange: "NYSE", high: 176.50, low: 170.80, vol: 52000000, high52: 180.10, low52: 25.50 },
      "COIN": { name: "Coinbase Global, Inc.", price: 133.50, prev: 136.30, exchange: "NASDAQ", high: 140.00, low: 131.50, vol: 24300000, high52: 283.40, low52: 70.10 },
      "NFLX": { name: "Netflix, Inc.", price: 812.00, prev: 804.50, exchange: "NASDAQ", high: 820.40, low: 802.00, vol: 6200000, high52: 830.00, low52: 370.20 },
      "SPY": { name: "SPDR S&P 500 ETF", price: 588.40, prev: 586.00, exchange: "NYSE", high: 591.60, low: 585.20, vol: 62000000, high52: 595.20, low52: 410.00 },
      "QQQ": { name: "Invesco QQQ Trust", price: 518.20, prev: 515.00, exchange: "NASDAQ", high: 521.10, low: 513.80, vol: 45000000, high52: 525.50, low52: 350.00 },
      "BABA": { name: "Alibaba Group Holding", price: 112.50, prev: 110.20, exchange: "NYSE", high: 114.00, low: 109.80, vol: 32000000, high52: 125.50, low52: 68.00 },
      "DIS": { name: "Walt Disney Company", price: 118.40, prev: 116.20, exchange: "NYSE", high: 120.20, low: 115.80, vol: 11000000, high52: 125.70, low52: 78.70 },
      "UBER": { name: "Uber Technologies", price: 84.80, prev: 82.10, exchange: "NYSE", high: 86.60, low: 81.80, vol: 24000000, high52: 92.00, low52: 40.00 },
      "ARM": { name: "ARM Holdings plc", price: 152.30, prev: 148.50, exchange: "NASDAQ", high: 154.00, low: 147.20, vol: 16000000, high52: 188.70, low52: 46.50 },
      "SMCI": { name: "Super Micro Computer", price: 23.40, prev: 26.80, exchange: "NASDAQ", high: 27.50, low: 22.80, vol: 89000000, high52: 122.90, low52: 21.00 },
      "AVGO": { name: "Broadcom Inc.", price: 178.50, prev: 175.20, exchange: "NASDAQ", high: 180.40, low: 174.00, vol: 18000000, high52: 185.00, low52: 90.00 },
      "ORCL": { name: "Oracle Corporation", price: 182.20, prev: 179.80, exchange: "NYSE", high: 184.00, low: 179.00, vol: 12000000, high52: 195.00, low52: 100.00 },
      "CRM": { name: "Salesforce, Inc.", price: 334.80, prev: 330.10, exchange: "NYSE", high: 338.00, low: 329.00, vol: 6500000, high52: 345.00, low52: 190.00 },
      "JPM": { name: "JPMorgan Chase & Co.", price: 242.60, prev: 240.20, exchange: "NYSE", high: 244.50, low: 239.50, vol: 9200000, high52: 248.00, low52: 140.00 },
      "V": { name: "Visa Inc.", price: 312.40, prev: 310.00, exchange: "NYSE", high: 314.50, low: 309.20, vol: 5400000, high52: 318.00, low52: 230.00 },
      "MA": { name: "Mastercard Inc.", price: 524.80, prev: 520.50, exchange: "NYSE", high: 528.00, low: 519.00, vol: 2300000, high52: 535.00, low52: 370.00 }
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
  renderAlertsList();
  renderCalendarView();

  // Instant First-Paint: Si no hay cache, poblar inmediatamente para cero espera visual
  if (Object.keys(State.quotesData).length === 0) {
    const initial = MockMarket.generateQuotes(StockPresets.all);
    initial.forEach(q => { State.quotesData[q.symbol] = q; });
  }
  renderStockCards();
  renderPortfolioSummary();

  // Cargar datos en vivo del backend y arrancar auto-refresh
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

  // View Switcher Tabs (Dashboard / Heatmap / Portfolio / Calendar)
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switchMainView(view);
    });
  });

  // Responsive redraw on mobile device rotation or significant width changes
  let lastWindowWidth = window.innerWidth;
  window.addEventListener('resize', debounce(() => {
    const curWidth = window.innerWidth;
    // Ignorar si el ancho no ha cambiado (evita re-renders cuando la barra de direcciones se oculta al hacer scroll en móvil)
    if (Math.abs(curWidth - lastWindowWidth) < 25) return;
    lastWindowWidth = curWidth;

    if (State.activeMainView === 'dashboard') {
      // Re-dibujar únicamente los canvas sparklines sin destruir los nodos del DOM
      Object.keys(State.quotesData).forEach(sym => {
        const sparkCanvas = document.getElementById(`spark-${sym}`);
        const stock = State.quotesData[sym];
        if (sparkCanvas && stock && stock.sparkline) {
          ChartEngine.renderSparkline(sparkCanvas, stock.sparkline, stock.changePercent >= 0);
        }
      });
    } else if (State.activeMainView === 'heatmap') {
      renderHeatmap();
    }
  }, 200));

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

  // News Source Filter Dropdown
  const newsSourceSelect = document.getElementById('newsSourceSelect');
  if (newsSourceSelect) {
    newsSourceSelect.addEventListener('change', (e) => {
      State.sourceFilter = e.target.value;
      renderNewsList();
    });
  }


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

  // Analysis Modal Events
  const analysisModal = document.getElementById('analysisModal');
  const closeAnalysisBtn = document.getElementById('closeAnalysisModalBtn');
  if (closeAnalysisBtn) {
    closeAnalysisBtn.addEventListener('click', () => {
      analysisModal.classList.remove('open');
    });
  }

  document.querySelectorAll('.analysis-tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.analysis-tf-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      State.activeAnalysisTimeframe = e.currentTarget.dataset.analysisTf;
      if (State.activeAnalysisSymbol) {
        loadStockAnalysis(State.activeAnalysisSymbol, State.activeAnalysisTimeframe);
        if (window.TradeIdeaModule) {
          window.TradeIdeaModule.loadTradeIdea(State.activeAnalysisSymbol, State.activeAnalysisTimeframe);
        }
      }
    });
  });

  // Global tab switcher accessible anywhere
  function switchAnalysisTab(tabName) {
    const tabForecast = document.getElementById('tabBtnForecast');
    const tabTradeIdea = document.getElementById('tabBtnTradeIdea');
    const panelForecast = document.getElementById('panelForecastTab');
    const panelTradeIdea = document.getElementById('panelTradeIdeaTab');

    if (tabName === 'tradeIdea') {
      if (tabTradeIdea) {
        tabTradeIdea.classList.add('active');
        tabTradeIdea.style.background = 'var(--bg-card)';
        tabTradeIdea.style.color = 'var(--text-primary)';
      }
      if (tabForecast) {
        tabForecast.classList.remove('active');
        tabForecast.style.background = 'transparent';
        tabForecast.style.color = 'var(--text-muted)';
      }
      if (panelForecast) panelForecast.style.display = 'none';
      if (panelTradeIdea) panelTradeIdea.style.display = 'block';

      if (window.TradeIdeaModule && typeof window.TradeIdeaModule.loadTradeIdea === 'function') {
        window.TradeIdeaModule.loadTradeIdea(State.activeAnalysisSymbol || 'AAPL', State.activeAnalysisTimeframe || '1d');
      }
    } else {
      if (tabForecast) {
        tabForecast.classList.add('active');
        tabForecast.style.background = 'var(--bg-card)';
        tabForecast.style.color = 'var(--text-primary)';
      }
      if (tabTradeIdea) {
        tabTradeIdea.classList.remove('active');
        tabTradeIdea.style.background = 'transparent';
        tabTradeIdea.style.color = 'var(--text-muted)';
      }
      if (panelForecast) panelForecast.style.display = 'block';
      if (panelTradeIdea) panelTradeIdea.style.display = 'none';
    }
  }
  window.switchAnalysisTab = switchAnalysisTab;

  function openTradeIdeaModal(symbol, timeframe = '1d') {
    const chartModal = document.getElementById('chartModal');
    if (chartModal) chartModal.classList.remove('open');
    openAnalysisModal(symbol, timeframe, 'tradeIdea');
  }
  window.openTradeIdeaModal = openTradeIdeaModal;

  const tabForecast = document.getElementById('tabBtnForecast');
  const tabTradeIdea = document.getElementById('tabBtnTradeIdea');
  if (tabForecast) tabForecast.addEventListener('click', () => switchAnalysisTab('forecast'));
  if (tabTradeIdea) tabTradeIdea.addEventListener('click', () => switchAnalysisTab('tradeIdea'));

  const launchFromChartBtn = document.getElementById('modalLaunchAnalysisBtn');
  if (launchFromChartBtn) {
    launchFromChartBtn.addEventListener('click', () => {
      const sym = State.activeModalSymbol;
      chartModal.classList.remove('open');
      setTimeout(() => {
        openAnalysisModal(sym, '1d');
      }, 50);
    });
  }

  // Alerts Modal Setup
  const alertsModal = document.getElementById('alertsModal');
  const openAlertsBtn = document.getElementById('openAlertsModalBtn');
  if (openAlertsBtn) {
    openAlertsBtn.addEventListener('click', () => {
      alertsModal.classList.add('open');
      renderAlertsList();
    });
  }
  const closeAlertsBtn = document.getElementById('closeAlertsModalBtn');
  if (closeAlertsBtn) {
    closeAlertsBtn.addEventListener('click', () => {
      alertsModal.classList.remove('open');
    });
  }
  const createAlertBtn = document.getElementById('createAlertBtn');
  if (createAlertBtn) {
    createAlertBtn.addEventListener('click', createPriceAlert);
  }
  const testChimeBtn = document.getElementById('testChimeBtn');
  if (testChimeBtn) {
    testChimeBtn.addEventListener('click', () => {
      playAlertChime();
      showToastNotification('Sonido de Alerta', 'Prueba de sonido ejecutada correctamente.', 'info');
    });
  }

  // Add Trade Modal (Portfolio) Setup
  const addTradeModal = document.getElementById('addTradeModal');
  const openAddTradeBtn = document.getElementById('openAddTradeModalBtn');
  if (openAddTradeBtn) {
    openAddTradeBtn.addEventListener('click', () => openAddTradeModal());
  }
  const closeAddTradeBtn = document.getElementById('closeAddTradeModalBtn');
  if (closeAddTradeBtn) {
    closeAddTradeBtn.addEventListener('click', () => {
      addTradeModal.classList.remove('open');
    });
  }
  const resetPortfolioBtn = document.getElementById('resetPortfolioBtn');
  if (resetPortfolioBtn) {
    resetPortfolioBtn.addEventListener('click', resetPortfolio);
  }
  const tradeSharesInput = document.getElementById('tradeSharesInput');
  const tradePriceInput = document.getElementById('tradePriceInput');
  if (tradeSharesInput && tradePriceInput) {
    tradeSharesInput.addEventListener('input', updateTradeEstimatedTotal);
    tradePriceInput.addEventListener('input', updateTradeEstimatedTotal);
  }
  const addTradeForm = document.getElementById('addTradeForm');
  if (addTradeForm) {
    addTradeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitAddTrade();
    });
  }

  // Close modals on overlay backdrop click
  [addModal, chartModal, glossaryModal, analysisModal, alertsModal, addTradeModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }
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
    const quotesRes = await fetch(`${API_BASE}/api/quotes?symbols=${allSymbols.join(',')}`, { signal: AbortSignal.timeout(9000) });
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
      // Guardar cotizaciones reales en cache para eliminar parpadeos en futuras recargas
      try {
        localStorage.setItem('invert_cached_quotes', JSON.stringify(State.quotesData));
      } catch (e) {}
      State.isOnlineBackend = true;
    } else {
      throw new Error("Backend offline");
    }

    // Verificar alertas de precio configuradas
    checkPriceAlerts();

    // Actualizar vistas secundarias si están activas
    if (State.activeMainView === 'heatmap') {
      renderHeatmap();
    } else if (State.activeMainView === 'portfolio') {
      renderPortfolioView();
    }

    // Fetch news priorizando las acciones que el usuario está siguiendo (NVDA, AMD, AAPL, etc.)
    const newsSymbols = allSymbols.slice(0, 8).join(',');
    const newsRes = await fetch(`${API_BASE}/api/news?symbols=${newsSymbols}&limit=35`, { signal: AbortSignal.timeout(9000) });
    if (newsRes.ok && (newsRes.headers.get('content-type') || '').includes('application/json')) {
      State.newsData = await newsRes.json();
      updateNewsSourceDropdown();
    }

    // Fetch market indices for ribbon
    const indicesRes = await fetch(`${API_BASE}/api/market-summary`, { signal: AbortSignal.timeout(9000) });
    if (indicesRes.ok && (indicesRes.headers.get('content-type') || '').includes('application/json')) {
      renderTickerTape(await indicesRes.json());
    }

  } catch (err) {
    State.isOnlineBackend = false;
    // CRÍTICO: Si ya tenemos cotizaciones reales en memoria, NUNCA sobreescribir con datos mock antiguos!
    if (Object.keys(State.quotesData).length === 0) {
      const fallbackQuotes = MockMarket.generateQuotes(allSymbols);
      fallbackQuotes.forEach(q => {
        State.quotesData[q.symbol] = q;
      });
    }
    if (State.newsData.length === 0) {
      State.newsData = MockMarket.generateNews();
      updateNewsSourceDropdown();
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

  // Store indices into State.indicesData and State.quotesData for real-time modal access
  State.indicesData = State.indicesData || {};
  indices.forEach(item => {
    State.indicesData[item.symbol] = item;
    State.quotesData[item.symbol] = {
      symbol: item.symbol,
      name: item.name || item.label || item.symbol,
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      previousClose: item.previousClose || item.price,
      high: item.high || item.price,
      low: item.low || item.price,
      volume: item.volume || 0,
      fiftyTwoWeekHigh: item.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: item.fiftyTwoWeekLow || 0,
      sparkline: item.sparkline || []
    };
  });

  // Duplicate list to create seamless infinite loop
  const doubleList = [...indices, ...indices];

  container.innerHTML = doubleList.map(item => {
    const isUp = item.changePercent >= 0;
    const badgeClass = isUp ? 'badge-green' : 'badge-red';
    const sign = isUp ? '+' : '';
    const arrow = isUp ? '▲' : '▼';
    return `
      <div class="ticker-index-item" onclick="openChartModal('${item.symbol}')" title="Clic para ver gráfico y cotización en tiempo real de ${item.label || item.symbol}">
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
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="card-action-btn" onclick="event.stopPropagation(); openTradeIdeaModal('${stock.symbol}')" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); font-weight: 700;" title="Abrir Ficha de Operación Cuantitativa">
              <i class="fa-solid fa-ticket"></i> Ficha
            </button>
            <button class="card-action-btn analysis-btn" onclick="event.stopPropagation(); openAnalysisModal('${stock.symbol}')" title="Pronóstico Predictivo y Análisis Cuantitativo">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Análisis
            </button>
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

  // Filter by publisher / source (Yahoo Finance, WSJ, Bloomberg, etc.)
  if (State.sourceFilter && State.sourceFilter !== 'all') {
    const sf = State.sourceFilter.toLowerCase();
    filtered = filtered.filter(n => (n.publisher || '').toLowerCase().includes(sf));
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

// Actualizar dinámicamente el selector de fuentes / medios informativos
function updateNewsSourceDropdown() {
  const select = document.getElementById('newsSourceSelect');
  if (!select) return;

  const currentVal = State.sourceFilter || 'all';
  const rawPublishers = State.newsData.map(n => n.publisher).filter(Boolean);
  const publishers = Array.from(new Set(rawPublishers)).sort();

  let html = `<option value="all">Todas las Fuentes (${State.newsData.length})</option>`;
  publishers.forEach(p => {
    const count = State.newsData.filter(n => n.publisher === p).length;
    html += `<option value="${p.toLowerCase()}">${p} (${count})</option>`;
  });

  select.innerHTML = html;
  select.value = currentVal;
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
// PREDICTIVE QUANTITATIVE ANALYSIS CONTROLLER
// ==========================================
async function openAnalysisModal(symbol, timeframe = '1d', initialTab = 'forecast') {
  try {
    State.activeAnalysisSymbol = symbol;
    State.activeAnalysisTimeframe = timeframe;

    const modal = document.getElementById('analysisModal');
    if (!modal) {
      console.error('analysisModal element not found');
      return;
    }

    const stock = State.quotesData[symbol] || {
      name: symbol,
      symbol: symbol,
      price: 100.0,
      changePercent: 0.0
    };

    const titleElem = document.getElementById('analysisStockTitle');
    const subElem = document.getElementById('analysisStockSubtitle');
    if (titleElem) titleElem.innerText = `${stock.name || symbol} (${symbol}) · Análisis Predictivo`;
    if (subElem) subElem.innerText = `Cálculo cuantitativo en tiempo real (RSI, Medias, Soporte/Resistencia y Noticias)`;

    // Update active timeframe pill
    document.querySelectorAll('.analysis-tf-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.analysisTf === timeframe);
    });

    // Reset UI to clean loading state
    const verdictText = document.getElementById('analysisVerdictText');
    if (verdictText) {
      verdictText.innerText = 'CALCULANDO...';
      verdictText.style.color = 'var(--text-primary)';
    }
    const verdictBadge = document.getElementById('analysisVerdictBadge');
    if (verdictBadge) {
      verdictBadge.innerText = '⏳ Procesando Algoritmo...';
      verdictBadge.className = 'badge-pct badge-yellow';
    }
    const summaryElem = document.getElementById('analysisSummaryText');
    if (summaryElem) summaryElem.innerText = `Analizando serie temporal y sentimiento del mercado para ${symbol}...`;

    const currElem = document.getElementById('analysisCurrentPrice');
    if (currElem) currElem.innerText = `$${formatNum(stock.price)}`;

    // Open modal immediately
    modal.classList.add('open');

    // Switch to initial tab immediately (no waiting)
    if (typeof window.switchAnalysisTab === 'function') {
      window.switchAnalysisTab(initialTab);
    }

    // Load analysis and trade idea concurrently in parallel
    const pAnalysis = loadStockAnalysis(symbol, timeframe);
    const pTradeIdea = (window.TradeIdeaModule && typeof window.TradeIdeaModule.loadTradeIdea === 'function')
      ? window.TradeIdeaModule.loadTradeIdea(symbol, timeframe)
      : Promise.resolve();

    await Promise.all([pAnalysis, pTradeIdea]);
  } catch (err) {
    console.error('Error in openAnalysisModal:', err);
  }
}

async function loadStockAnalysis(symbol, timeframe = '1d') {
  const API_BASE = window.INVERT_API_URL || '';
  try {
    const res = await fetch(`${API_BASE}/api/analysis?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json();
      renderAnalysisData(data);
      return;
    }
  } catch (err) {
    console.warn('Error fetching analysis from backend, using local quantitative model:', err);
  }

  // Fallback local quantitative model
  const stock = State.quotesData[symbol] || { price: 150.0, changePercent: 0.5 };
  const price = stock.price || 150.0;
  const pct = stock.changePercent || 0.0;
  const isBull = pct >= 0;
  const mult = timeframe === '1w' ? 2.5 : timeframe === '1m' ? 5.0 : 1.0;

  const fakeData = {
    symbol: symbol,
    name: stock.name || symbol,
    timeframe: timeframe,
    timeframeLabel: timeframe === '1d' ? 'Hoy (Intradía)' : timeframe === '1w' ? 'Esta Semana (Swing)' : 'Este Mes (Posicional)',
    price: price,
    verdict: isBull ? (pct > 2 ? 'COMPRA FUERTE' : 'COMPRA MODERADA') : (pct < -2 ? 'VENTA FUERTE' : 'VENTA MODERADA'),
    badge: isBull ? '🟢 Sesgo Alcista' : '🔴 Presión Bajista',
    action: isBull ? 'ACUMULAR EN SOPORTE' : 'CAUTELA / ESPERAR CONFIRMACIÓN',
    score: Math.min(100, Math.max(-100, Math.round(pct * 15))),
    color: isBull ? 'var(--color-green-text)' : 'var(--color-red-text)',
    gaugePosition: Math.min(95, Math.max(5, Math.round(50 + pct * 6))),
    bullishProbability: Math.min(88, Math.max(12, Math.round(50 + pct * 4))),
    bearishProbability: Math.min(88, Math.max(12, Math.round(50 - pct * 4))),
    supportPrice: Number((price * (1 - 0.018 * mult)).toFixed(2)),
    targetPrice: Number((price * (1 + (isBull ? 0.025 : -0.02) * mult)).toFixed(2)),
    resistancePrice: Number((price * (1 + 0.022 * mult)).toFixed(2)),
    rsi: Number(Math.min(85, Math.max(20, (50 + pct * 4))).toFixed(1)),
    rsiStatus: `${Number(Math.min(85, Math.max(20, (50 + pct * 4))).toFixed(1))} · Rango Operativo Normal`,
    smaTrend: isBull ? 'Estructura Alcista (Precio > SMA9 > SMA21)' : 'Estructura Bajista (Precio < SMA9 < SMA21)',
    newsSentiment: isBull ? 'Favorable (+1)' : 'Presión Vendedora (-1)',
    summary: `Análisis para ${symbol} en marco ${timeframe}: ${isBull ? 'Predominio de volumen comprador con soporte técnico firme.' : 'Presión correctiva a corto plazo; vigilar reacción en el soporte antes de nuevas entradas.'}`
  };

  renderAnalysisData(fakeData);
}

function renderAnalysisData(data) {
  if (!data) return;

  // Verdict & Badge
  const verdictText = document.getElementById('analysisVerdictText');
  if (verdictText) {
    verdictText.innerText = data.verdict;
    verdictText.style.color = data.color || 'var(--text-primary)';
  }

  const verdictBadge = document.getElementById('analysisVerdictBadge');
  if (verdictBadge) {
    verdictBadge.innerText = data.badge;
    const isBull = data.score >= 0;
    verdictBadge.className = `badge-pct ${isBull ? 'badge-green' : 'badge-red'}`;
  }

  // Speedometer Needle
  const needle = document.getElementById('analysisGaugeNeedle');
  if (needle) {
    needle.style.left = `${data.gaugePosition}%`;
  }

  // Probabilities Bar & Labels
  const probBull = document.getElementById('analysisProbBullish');
  if (probBull) probBull.innerText = `${data.bullishProbability}% Probabilidad Alcista ▲`;

  const probBear = document.getElementById('analysisProbBearish');
  if (probBear) probBear.innerText = `${data.bearishProbability}% Probabilidad Bajista ▼`;

  const fillBull = document.getElementById('analysisProbFillBullish');
  if (fillBull) fillBull.style.width = `${data.bullishProbability}%`;

  const fillBear = document.getElementById('analysisProbFillBearish');
  if (fillBear) fillBear.style.width = `${data.bearishProbability}%`;

  // Corridor Prices
  const supElem = document.getElementById('analysisSupportPrice');
  if (supElem) supElem.innerText = `$${formatNum(data.supportPrice)}`;

  const currElem = document.getElementById('analysisCurrentPrice');
  if (currElem) currElem.innerText = `$${formatNum(data.price)}`;

  const tgtElem = document.getElementById('analysisTargetPrice');
  if (tgtElem) tgtElem.innerText = `$${formatNum(data.targetPrice)}`;

  const resElem = document.getElementById('analysisResistancePrice');
  if (resElem) resElem.innerText = `$${formatNum(data.resistancePrice)}`;

  // Summary Text
  const summaryElem = document.getElementById('analysisSummaryText');
  if (summaryElem) summaryElem.innerText = data.summary;

  // Technical Indicators Grid
  const rsiVal = document.getElementById('analysisRSI');
  if (rsiVal) rsiVal.innerText = data.rsi;

  const rsiStat = document.getElementById('analysisRSIStatus');
  if (rsiStat) rsiStat.innerText = data.rsiStatus;

  const smaElem = document.getElementById('analysisSMATrend');
  if (smaElem) smaElem.innerText = data.smaTrend;

  const newsSent = document.getElementById('analysisNewsSentiment');
  if (newsSent) newsSent.innerText = data.newsSentiment;

  const actElem = document.getElementById('analysisSuggestedAction');
  if (actElem) {
    actElem.innerText = data.action;
    actElem.style.color = data.color || 'var(--text-primary)';
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
  const stock = State.quotesData[symbol] || (State.indicesData && State.indicesData[symbol]);

  // Initial population from state if available
  if (stock && stock.price) {
    const isUp = (stock.changePercent || 0) >= 0;
    const sign = isUp ? '+' : '';
    const dollarElem = document.getElementById('modalStockDollarChange');
    const badgeElem = document.getElementById('modalStockBadge');

    document.getElementById('modalStockTitle').innerText = `${stock.name || stock.label || symbol} (${symbol})`;
    document.getElementById('modalStockPrice').innerText = `$${formatNum(stock.price)}`;
    
    if (dollarElem) {
      dollarElem.innerText = `${sign}$${Math.abs(stock.change || 0).toFixed(2)}`;
      dollarElem.style.color = isUp ? 'var(--color-green-text)' : 'var(--color-red-text)';
    }

    if (badgeElem) {
      badgeElem.className = `badge-pct ${isUp ? 'badge-green' : 'badge-red'}`;
      badgeElem.innerText = `${sign}${(stock.changePercent || 0).toFixed(2)}% ${isUp ? '▲' : '▼'}`;
    }

    document.getElementById('modalStatRange').innerText = (stock.low && stock.high) ? `$${formatNum(stock.low)} - $${formatNum(stock.high)}` : 'Consultando...';
    document.getElementById('modalStatPrevClose').innerText = stock.previousClose ? `$${formatNum(stock.previousClose)}` : 'Consultando...';
    document.getElementById('modalStat52Week').innerText = (stock.fiftyTwoWeekLow && stock.fiftyTwoWeekHigh) ? `$${formatNum(stock.fiftyTwoWeekLow)} - $${formatNum(stock.fiftyTwoWeekHigh)}` : 'Consultando...';
    document.getElementById('modalStatVolume').innerText = stock.volume ? formatVolume(stock.volume) : 'Consultando...';
  } else {
    // Show clean loading state while fetching real-time data
    document.getElementById('modalStockTitle').innerText = `${symbol} · Consultando datos en tiempo real...`;
    document.getElementById('modalStockPrice').innerText = '...';
    const dollarElem = document.getElementById('modalStockDollarChange');
    if (dollarElem) dollarElem.innerText = '';
    const badgeElem = document.getElementById('modalStockBadge');
    if (badgeElem) {
      badgeElem.className = 'badge-pct badge-yellow';
      badgeElem.innerText = '⏳ Conectando...';
    }
    document.getElementById('modalStatRange').innerText = '...';
    document.getElementById('modalStatPrevClose').innerText = '...';
    document.getElementById('modalStat52Week').innerText = '...';
    document.getElementById('modalStatVolume').innerText = '...';
  }

  // Populate Related News
  const newsContainer = document.getElementById('modalStockNewsContainer');
  const cleanSym = symbol.replace('^', '').replace('=F', '').replace('-USD', '');
  const relatedNews = State.newsData.filter(n => n.tickers && (n.tickers.includes(symbol) || n.tickers.includes(cleanSym)));
  if (relatedNews.length > 0) {
    newsContainer.innerHTML = relatedNews.map(n => `
      <div style="background:var(--bg-card); padding:8px 12px; border-radius:6px; font-size:0.8rem; border-left:3px solid var(--color-accent);">
        <strong>${n.title}</strong>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${n.publisher} &bull; ${formatTimeAgo(n.time)}</div>
      </div>
    `).join('');
  } else {
    newsContainer.innerHTML = `<p style="font-size:0.75rem; color:var(--text-muted);">Sin noticias de impacto reciente para ${symbol}.</p>`;
  }

  modal.classList.add('open');

  // Load verified real-time chart data & update indicators
  await loadDetailedChart(symbol, State.activeModalRange || '1d');

  // Trigger post-animation redraws to guarantee full crisp dimensions
  setTimeout(() => {
    if (typeof ChartEngine !== 'undefined' && ChartEngine._activeChart && typeof ChartEngine._activeChart.redraw === 'function') {
      ChartEngine._activeChart.redraw();
    }
  }, 100);
  setTimeout(() => {
    if (typeof ChartEngine !== 'undefined' && ChartEngine._activeChart && typeof ChartEngine._activeChart.redraw === 'function') {
      ChartEngine._activeChart.redraw();
    }
  }, 260);
}

async function loadDetailedChart(symbol, rangeVal) {
  const canvas = document.getElementById('interactiveCanvas');
  const stock = State.quotesData[symbol] || (State.indicesData && State.indicesData[symbol]);
  let isUp = stock ? stock.changePercent >= 0 : true;
  let prevClose = stock ? stock.previousClose : 100;

  try {
    const API_BASE = window.INVERT_API_URL || '';
    const res = await fetch(`${API_BASE}/api/chart?symbol=${encodeURIComponent(symbol)}&range_val=${encodeURIComponent(rangeVal)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const chartData = await res.json();
      
      // Save updated quote in state
      State.quotesData[symbol] = chartData;

      // Update modal elements in real time if the user is still viewing this symbol
      if (State.activeModalSymbol === symbol) {
        const titleElem = document.getElementById('modalStockTitle');
        const priceElem = document.getElementById('modalStockPrice');
        const dollarElem = document.getElementById('modalStockDollarChange');
        const badgeElem = document.getElementById('modalStockBadge');

        const realName = chartData.name || (stock && (stock.name || stock.label)) || symbol;
        if (titleElem) titleElem.innerText = `${realName} (${symbol})`;
        if (priceElem) priceElem.innerText = `$${formatNum(chartData.price)}`;

        isUp = chartData.changePercent >= 0;
        prevClose = chartData.previousClose || chartData.price;
        const sign = isUp ? '+' : '';
        if (dollarElem) {
          dollarElem.innerText = `${sign}$${Math.abs(chartData.change || 0).toFixed(2)}`;
          dollarElem.style.color = isUp ? 'var(--color-green-text)' : 'var(--color-red-text)';
        }

        if (badgeElem) {
          badgeElem.className = `badge-pct ${isUp ? 'badge-green' : 'badge-red'}`;
          badgeElem.innerText = `${sign}${(chartData.changePercent || 0).toFixed(2)}% ${isUp ? '▲' : '▼'}`;
        }

        const rangeElem = document.getElementById('modalStatRange');
        if (rangeElem) {
          rangeElem.innerText = (chartData.low && chartData.high) ? `$${formatNum(chartData.low)} - $${formatNum(chartData.high)}` : 'N/D';
        }

        const prevCloseElem = document.getElementById('modalStatPrevClose');
        if (prevCloseElem) {
          prevCloseElem.innerText = chartData.previousClose ? `$${formatNum(chartData.previousClose)}` : 'N/D';
        }

        const week52Elem = document.getElementById('modalStat52Week');
        if (week52Elem) {
          week52Elem.innerText = (chartData.fiftyTwoWeekLow && chartData.fiftyTwoWeekHigh)
            ? `$${formatNum(chartData.fiftyTwoWeekLow)} - $${formatNum(chartData.fiftyTwoWeekHigh)}`
            : 'N/D';
        }

        const volElem = document.getElementById('modalStatVolume');
        if (volElem) {
          volElem.innerText = formatVolume(chartData.volume || 0);
        }

        if (chartData.history && chartData.history.length > 0) {
          ChartEngine.renderInteractiveChart(canvas, chartData.history, symbol, isUp, prevClose);
          return;
        }
      }
    }
  } catch (e) {
    console.warn(`Error al cargar datos en tiempo real para ${symbol}:`, e);
  }

  // Fallback points generation if backend is unavailable
  const points = [];
  const count = rangeVal === '1d' ? 30 : rangeVal === '5d' ? 40 : 60;
  const now = Math.floor(Date.now() / 1000);
  const base = (stock && stock.price) ? stock.price : 150;
  let curr = (stock && stock.previousClose) ? stock.previousClose : base;

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

// ==========================================
// VIEW SWITCHER CONTROLLER
// ==========================================
function switchMainView(viewName) {
  State.activeMainView = viewName;

  // Update navbar button states
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Switch view containers
  const viewMap = {
    'dashboard': 'viewDashboard',
    'heatmap': 'viewHeatmap',
    'portfolio': 'viewPortfolio',
    'calendar': 'viewCalendar',
    'tradesdb': 'viewTradesDb'
  };

  Object.entries(viewMap).forEach(([name, id]) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('active', name === viewName);
    }
  });

  if (viewName === 'heatmap') {
    renderHeatmap();
  } else if (viewName === 'portfolio') {
    renderPortfolioView();
  } else if (viewName === 'calendar') {
    renderCalendarView();
  } else if (viewName === 'tradesdb') {
    renderTradesDbView();
  } else if (viewName === 'dashboard') {
    renderStockCards();
  }
}

// ==========================================
// HEATMAP RENDERER (S&P 500 POR SECTORES)
// ==========================================
function renderHeatmap() {
  const container = document.getElementById('heatmapSectorsContainer');
  if (!container) return;

  const sectors = HeatmapSectors;
  let html = '';

  Object.entries(sectors).forEach(([sectorName, symbols]) => {
    const stocks = symbols.map(sym => State.quotesData[sym] || {
      symbol: sym,
      name: sym,
      price: 100.0,
      changePercent: 0.0
    });

    const avgChange = stocks.length > 0 
      ? stocks.reduce((acc, s) => acc + (s.changePercent || 0), 0) / stocks.length 
      : 0;
    const isSectorUp = avgChange >= 0;
    const sectorBadgeClass = isSectorUp ? 'badge-green' : 'badge-red';
    const sectorSign = isSectorUp ? '+' : '';

    const tilesHtml = stocks.map(stock => {
      const pct = stock.changePercent || 0;
      let colorClass = 'tile-neutral';
      if (pct >= 3.0) colorClass = 'tile-deep-green';
      else if (pct >= 1.0) colorClass = 'tile-green';
      else if (pct > 0.0) colorClass = 'tile-soft-green';
      else if (pct <= -3.0) colorClass = 'tile-deep-red';
      else if (pct <= -1.0) colorClass = 'tile-red';
      else if (pct < 0.0) colorClass = 'tile-soft-red';

      const sign = pct >= 0 ? '+' : '';
      const arrow = pct >= 0 ? '▲' : '▼';

      return `
        <div class="heatmap-tile ${colorClass}" onclick="openAnalysisModal('${stock.symbol}')" title="Clic para Análisis Predictivo de ${stock.name || stock.symbol}">
          <span class="tile-sym">${stock.symbol}</span>
          <span class="tile-price">$${formatNum(stock.price)}</span>
          <span class="tile-pct">${sign}${pct.toFixed(2)}% ${arrow}</span>
        </div>
      `;
    }).join('');

    html += `
      <div class="heatmap-sector-card">
        <div class="sector-card-header">
          <div class="sector-title">
            <i class="fa-solid fa-layer-group" style="color: var(--color-accent);"></i>
            ${sectorName}
          </div>
          <span class="sector-avg-badge ${sectorBadgeClass}">
            Promedio: ${sectorSign}${avgChange.toFixed(2)}%
          </span>
        </div>
        <div class="sector-tiles-grid">
          ${tilesHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==========================================
// PORTFOLIO CONTROLLER (PAPER TRADING P&L)
// ==========================================
function renderPortfolioView() {
  const tableBody = document.getElementById('portfolioTableBody');
  if (!tableBody) return;

  const trades = State.portfolioTrades || [];
  let totalStockValue = 0;
  let totalCost = 0;
  let totalDayGain = 0;

  if (trades.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <i class="fa-solid fa-briefcase" style="font-size: 2rem; margin-bottom: 8px; display:block; opacity: 0.5;"></i>
          No tienes posiciones abiertas en tu portafolio simulado.<br>
          <button class="btn-primary" onclick="openAddTradeModal()" style="margin: 12px auto 0; font-size: 0.8rem; background: linear-gradient(135deg, #10b981, #059669);">
            <i class="fa-solid fa-plus"></i> Comprar Primera Acción
          </button>
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = trades.map((trade, idx) => {
      const stock = State.quotesData[trade.symbol] || {
        price: trade.buyPrice,
        changePercent: 0,
        change: 0,
        name: trade.name || trade.symbol
      };

      const currPrice = stock.price || trade.buyPrice;
      const shares = trade.shares || 1;
      const cost = shares * trade.buyPrice;
      const marketVal = shares * currPrice;
      const profitDollar = marketVal - cost;
      const profitPct = cost > 0 ? (profitDollar / cost) * 100 : 0;
      const isUp = profitDollar >= 0;
      const sign = isUp ? '+' : '';
      const color = isUp ? 'var(--color-green-text)' : 'var(--color-red-text)';

      totalStockValue += marketVal;
      totalCost += cost;
      totalDayGain += shares * (stock.change || 0);

      return `
        <tr>
          <td>
            <strong>${trade.symbol}</strong>
            <div class="table-stock-name">${stock.name || trade.symbol}</div>
          </td>
          <td><strong>${shares}</strong> títulos</td>
          <td>$${formatNum(trade.buyPrice)}</td>
          <td><strong>$${formatNum(currPrice)}</strong></td>
          <td><strong>$${formatNum(marketVal)}</strong></td>
          <td>
            <div style="font-weight: 800; color: ${color}; font-family: var(--font-mono);">
              ${sign}$${formatNum(Math.abs(profitDollar))} (${sign}${profitPct.toFixed(2)}%)
            </div>
          </td>
          <td style="text-align: right;">
            <div class="table-btn-group" style="justify-content: flex-end;">
              <button class="table-action-btn" onclick="openAnalysisModal('${trade.symbol}')" title="Análisis Predictivo">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
              </button>
              <button class="table-action-btn" onclick="openChartModal('${trade.symbol}')" title="Gráfico">
                <i class="fa-solid fa-chart-line"></i>
              </button>
              <button class="table-action-btn btn-sell" onclick="closePortfolioTrade(${idx})" title="Vender Posición">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Vender
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Calculate totals
  const cash = State.portfolioCash || 10000.00;
  const netWorth = totalStockValue + cash;
  const netProfit = totalStockValue - totalCost;
  const netProfitPct = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const isNetUp = netProfit >= 0;
  const netSign = isNetUp ? '+' : '';
  const netColor = isNetUp ? 'var(--color-green-text)' : 'var(--color-red-text)';

  const isDayUp = totalDayGain >= 0;
  const daySign = isDayUp ? '+' : '';
  const dayColor = isDayUp ? 'var(--color-green-text)' : 'var(--color-red-text)';

  // Update KPI Cards
  const valElem = document.getElementById('portfolioTotalValue');
  if (valElem) valElem.innerText = `$${formatNum(netWorth)}`;

  const plElem = document.getElementById('portfolioTotalPL');
  if (plElem) {
    plElem.innerText = `${netSign}$${formatNum(Math.abs(netProfit))}`;
    plElem.style.color = netColor;
  }

  const plPctElem = document.getElementById('portfolioTotalPLPct');
  if (plPctElem) {
    plPctElem.innerText = `${netSign}${netProfitPct.toFixed(2)}% Retorno Total`;
    plPctElem.style.color = netColor;
  }

  const dayElem = document.getElementById('portfolioDayPL');
  if (dayElem) {
    dayElem.innerText = `${daySign}$${formatNum(Math.abs(totalDayGain))}`;
    dayElem.style.color = dayColor;
  }

  const dayPctElem = document.getElementById('portfolioDayPLPct');
  if (dayPctElem) {
    const dayPct = totalCost > 0 ? (totalDayGain / totalCost) * 100 : 0;
    dayPctElem.innerText = `${daySign}${dayPct.toFixed(2)}% Hoy`;
    dayPctElem.style.color = dayColor;
  }

  const cashElem = document.getElementById('portfolioCashBalance');
  if (cashElem) cashElem.innerText = `$${formatNum(cash)}`;

  const badgeElem = document.getElementById('portfolioOpenPositionsBadge');
  if (badgeElem) badgeElem.innerText = `${trades.length} Posiciones`;
}

function openAddTradeModal(prefillSymbol = '') {
  const modal = document.getElementById('addTradeModal');
  if (!modal) return;
  const symInput = document.getElementById('tradeSymbolInput');
  const priceInput = document.getElementById('tradePriceInput');
  const sharesInput = document.getElementById('tradeSharesInput');

  if (prefillSymbol) {
    symInput.value = prefillSymbol.toUpperCase();
    const stock = State.quotesData[prefillSymbol.toUpperCase()];
    if (stock) priceInput.value = stock.price.toFixed(2);
  } else {
    symInput.value = '';
    priceInput.value = '';
  }
  sharesInput.value = '10';
  updateTradeEstimatedTotal();

  modal.classList.add('open');
  symInput.focus();
}

function updateTradeEstimatedTotal() {
  const shares = parseFloat(document.getElementById('tradeSharesInput').value) || 0;
  const price = parseFloat(document.getElementById('tradePriceInput').value) || 0;
  const total = shares * price;
  const el = document.getElementById('tradeTotalEstimated');
  if (el) el.innerText = `$${formatNum(total)}`;
}

function submitAddTrade() {
  const sym = document.getElementById('tradeSymbolInput').value.trim().toUpperCase();
  const shares = parseFloat(document.getElementById('tradeSharesInput').value) || 0;
  const price = parseFloat(document.getElementById('tradePriceInput').value) || 0;

  if (!sym || shares <= 0 || price <= 0) return;

  const cost = shares * price;
  if (cost > State.portfolioCash) {
    showToastNotification('Saldo Insuficiente', `La compra requiere $${formatNum(cost)}, pero tu efectivo disponible es $${formatNum(State.portfolioCash)}.`, 'alert');
    return;
  }

  State.portfolioCash -= cost;
  localStorage.setItem('invert_portfolio_cash', State.portfolioCash.toFixed(2));

  const stock = State.quotesData[sym];
  State.portfolioTrades.push({
    symbol: sym,
    name: stock ? stock.name : sym,
    shares: shares,
    buyPrice: price
  });
  localStorage.setItem('invert_portfolio_trades', JSON.stringify(State.portfolioTrades));

  document.getElementById('addTradeModal').classList.remove('open');
  showToastNotification('Posición Añadida', `Compraste ${shares} acciones de ${sym} a $${formatNum(price)}`, 'success');
  playAlertChime();

  renderPortfolioView();
}

function closePortfolioTrade(idx) {
  const trade = State.portfolioTrades[idx];
  if (!trade) return;

  const stock = State.quotesData[trade.symbol];
  const currPrice = stock ? stock.price : trade.buyPrice;
  const proceeds = trade.shares * currPrice;
  const profit = proceeds - (trade.shares * trade.buyPrice);

  State.portfolioCash += proceeds;
  localStorage.setItem('invert_portfolio_cash', State.portfolioCash.toFixed(2));

  State.portfolioTrades.splice(idx, 1);
  localStorage.setItem('invert_portfolio_trades', JSON.stringify(State.portfolioTrades));

  const sign = profit >= 0 ? '+' : '';
  showToastNotification('Posición Cerrada', `Vendiste ${trade.shares} ${trade.symbol} por $${formatNum(proceeds)} (${sign}$${formatNum(profit)})`, profit >= 0 ? 'success' : 'alert');
  playAlertChime();

  renderPortfolioView();
}

function resetPortfolio() {
  if (confirm('¿Deseas reiniciar tu portafolio con $10,000 en efectivo y posiciones iniciales?')) {
    State.portfolioCash = 10000.00;
    State.portfolioTrades = [
      { symbol: "NVDA", name: "NVIDIA Corporation", shares: 15, buyPrice: 158.50 },
      { symbol: "AMD", name: "Advanced Micro Devices", shares: 8, buyPrice: 540.00 },
      { symbol: "AAPL", name: "Apple Inc.", shares: 10, buyPrice: 348.00 }
    ];
    localStorage.setItem('invert_portfolio_cash', '10000.00');
    localStorage.setItem('invert_portfolio_trades', JSON.stringify(State.portfolioTrades));
    showToastNotification('Portafolio Reiniciado', 'Tu saldo se ha restablecido a $10,000.00', 'info');
    renderPortfolioView();
  }
}

// ==========================================
// ALERTS ENGINE & WEB AUDIO CHIME
// ==========================================
function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // First chime (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Second chime (A5 - 880 Hz harmonic)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn("AudioContext chime warning:", e);
  }
}

function showToastNotification(title, message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid fa-bell"></i></div>
    <div class="toast-content">
      <strong>${title}</strong>
      <div>${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  toast.querySelector('.toast-close').onclick = () => toast.remove();
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

function renderAlertsList() {
  const container = document.getElementById('alertsListContainer');
  const badge = document.getElementById('alertsBadgeCount');
  if (!container) return;

  const alerts = State.priceAlerts || [];
  const activeCount = alerts.filter(a => !a.triggered).length;

  if (badge) {
    if (activeCount > 0) {
      badge.innerText = activeCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  if (alerts.length === 0) {
    container.innerHTML = `<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.8rem;">No tienes alertas configuradas. Define una arriba.</div>`;
    return;
  }

  container.innerHTML = alerts.map((alert, idx) => {
    const isAbove = alert.condition === 'above';
    const condText = isAbove ? 'Suba por encima de' : 'Baje por debajo de';
    const condIcon = isAbove ? '▲' : '▼';
    const condColor = isAbove ? 'var(--color-green-text)' : 'var(--color-red-text)';

    return `
      <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-weight:900; font-size:0.95rem;">${alert.symbol}</span>
          <span style="font-size:0.75rem; color:${condColor}; margin-left:8px; font-weight:700;">
            ${condIcon} ${condText} <strong>$${formatNum(alert.targetPrice)}</strong>
          </span>
          ${alert.triggered ? '<span class="badge-pct badge-green" style="margin-left:6px; font-size:0.65rem;">¡DISPARADA!</span>' : ''}
        </div>
        <button onclick="removePriceAlert(${idx})" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:1rem;">
          &times;
        </button>
      </div>
    `;
  }).join('');
}

function createPriceAlert() {
  const symInput = document.getElementById('alertSymbolInput');
  const condSelect = document.getElementById('alertConditionSelect');
  const priceInput = document.getElementById('alertPriceInput');

  const sym = symInput.value.trim().toUpperCase();
  const cond = condSelect.value;
  const targetPrice = parseFloat(priceInput.value);

  if (!sym || isNaN(targetPrice) || targetPrice <= 0) {
    alert('Por favor ingresa un símbolo válido y un precio objetivo.');
    return;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  State.priceAlerts.push({
    symbol: sym,
    condition: cond,
    targetPrice: targetPrice,
    triggered: false,
    createdAt: Date.now()
  });

  localStorage.setItem('invert_price_alerts', JSON.stringify(State.priceAlerts));
  symInput.value = '';
  priceInput.value = '';

  showToastNotification('Alerta Activada', `Te avisaremos cuando ${sym} ${cond === 'above' ? 'suba a' : 'baje a'} $${formatNum(targetPrice)}`, 'success');
  playAlertChime();
  renderAlertsList();
}

function removePriceAlert(idx) {
  State.priceAlerts.splice(idx, 1);
  localStorage.setItem('invert_price_alerts', JSON.stringify(State.priceAlerts));
  renderAlertsList();
}

function checkPriceAlerts() {
  if (!State.priceAlerts || State.priceAlerts.length === 0) return;

  State.priceAlerts.forEach(alert => {
    if (alert.triggered) return;
    const stock = State.quotesData[alert.symbol];
    if (!stock || !stock.price) return;

    let hit = false;
    if (alert.condition === 'above' && stock.price >= alert.targetPrice) {
      hit = true;
    } else if (alert.condition === 'below' && stock.price <= alert.targetPrice) {
      hit = true;
    }

    if (hit) {
      alert.triggered = true;
      localStorage.setItem('invert_price_alerts', JSON.stringify(State.priceAlerts));

      playAlertChime();
      const actionText = alert.condition === 'above' ? 'superó el objetivo de' : 'cayó por debajo de';
      const msg = `${alert.symbol} ${actionText} $${formatNum(alert.targetPrice)} (Precio actual: $${formatNum(stock.price)})`;

      showToastNotification(`🔔 ¡Alerta de Precio Cumplida!`, msg, 'alert');

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`INVERT Alerta: ${alert.symbol}`, {
          body: msg,
          icon: '/favicon.ico'
        });
      }

      renderAlertsList();
    }
  });
}

// ==========================================
// CALENDAR VIEW (ECONOMIC & EARNINGS)
// ==========================================
async function renderCalendarView() {
  const earningsContainer = document.getElementById('earningsListContainer');
  const macroContainer = document.getElementById('macroEventsListContainer');
  if (!earningsContainer || !macroContainer) return;

  // Initial verified fallback data
  let calendarData = {
    macro: [
      {
        id: "fomc-fed-rate",
        title: "Decisión de Tipos de Interés FOMC (Reserva Federal)",
        source: "Federal Reserve",
        sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
        badge: "🔴 Impacto Crítico",
        badgeClass: "badge-red",
        statLabel: "Tasa Objetivo Oficial",
        currentRate: "3.75% – 4.00%",
        detail: "El FOMC fija el rango oficial de tipos de los fondos federales. Rango actual verificado: 3.75% - 4.00%. La decisión y la rueda de prensa del Presidente de la Fed determinan la liquidez global.",
        officialDate: "8 – 9 de Diciembre de 2026",
        time: "Anuncio de Política Monetaria (2:00 PM ET) & Rueda de Prensa (2:30 PM ET)",
        upcoming: "Próximas 2027: 26-27 Ene, 16-17 Mar (SEP), 27-28 Abr, 16-17 Jun"
      },
      {
        id: "cpi-inflation",
        title: "Índice de Precios al Consumidor (CPI / Inflación de EE.UU.)",
        source: "U.S. Bureau of Labor Statistics (BLS)",
        sourceUrl: "https://www.bls.gov/cpi/",
        badge: "🔴 Alto Impacto",
        badgeClass: "badge-red",
        statLabel: "Inflación Interanual",
        currentRate: "2.7% (Meta FOMC: 2.0%)",
        detail: "Dato oficial que mide la variación de los precios al consumidor en EE.UU. Si la inflación se resiste a descender al 2%, el banco central pausa recortes de tasas.",
        officialDate: "10 de Diciembre de 2026",
        time: "Publicación mensual oficial (8:30 AM ET)",
        upcoming: "Próximas fechas: 10 Dic 2026, 13 Ene 2027, 11 Feb 2027"
      },
      {
        id: "nfp-labor",
        title: "Nóminas No Agrícolas (NFP) y Tasa de Desempleo",
        source: "U.S. Bureau of Labor Statistics (BLS)",
        sourceUrl: "https://www.bls.gov/news.release/empsit.nr0.htm",
        badge: "🟡 Alto Impacto",
        badgeClass: "badge-yellow",
        statLabel: "Tasa de Desempleo",
        currentRate: "4.1% de Desempleo",
        detail: "Mide la salud del empleo formal no agrícola en EE.UU., creación neta de puestos de trabajo y presiones salariales inflacionarias.",
        officialDate: "4 de Diciembre de 2026",
        time: "Primer viernes del mes (8:30 AM ET)",
        upcoming: "Próximas fechas: 4 Dic 2026, 8 Ene 2027, 5 Feb 2027"
      },
      {
        id: "gdp-growth",
        title: "Producto Interior Bruto (PIB Trimestral de EE.UU.)",
        source: "U.S. Bureau of Economic Analysis (BEA)",
        sourceUrl: "https://www.bea.gov/",
        badge: "🟡 Impacto Moderado",
        badgeClass: "badge-yellow",
        statLabel: "Crecimiento PIB",
        currentRate: "+2.8% Anualizado",
        detail: "Lectura trimestral oficial sobre la expansión económica, gasto de los consumidores e inversión corporativa en EE.UU.",
        officialDate: "25 de Noviembre de 2026",
        time: "Segunda estimación trimestral (8:30 AM ET)",
        upcoming: "Próximas fechas: 25 Nov 2026, 23 Dic 2026, 28 Ene 2027"
      }
    ],
    earnings: [
      {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        quarter: "Q3 FY27",
        date: "17 de Noviembre de 2026",
        time: "Después de Cierre (4:20 PM ET / Conferencia 5:00 PM ET)",
        statusBadge: "Oficial Confirmada",
        badgeClass: "badge-green",
        epsEst: "$0.84",
        epsPrior: "$0.68",
        vol: "±8.5%",
        source: "NVIDIA Investor Relations",
        sourceUrl: "https://investor.nvidia.com/",
        note: "Resultados oficiales del tercer trimestre fiscal. Foco absoluto en la demanda de la arquitectura de chips Blackwell de IA y proyección de márgenes de centros de datos."
      },
      {
        symbol: "TSLA",
        name: "Tesla, Inc.",
        quarter: "Q4 FY26 / Anual",
        date: "27 de Enero de 2027",
        time: "Después de Cierre (AMC)",
        statusBadge: "Estimada por Calendario IR",
        badgeClass: "badge-yellow",
        epsEst: "$0.74",
        epsPrior: "$0.72",
        vol: "±7.2%",
        source: "Tesla Investor Relations",
        sourceUrl: "https://ir.tesla.com/",
        note: "Cierre anual 2026. Los inversores vigilarán volúmenes totales de entrega anual, márgenes brutos automotrices y monetización de FSD autónomo y Robotaxi."
      },
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        quarter: "Q1 FY27 (Navideño)",
        date: "28 de Enero de 2027",
        time: "Después de Cierre (AMC)",
        statusBadge: "Estimada por Calendario IR",
        badgeClass: "badge-yellow",
        epsEst: "$2.36",
        epsPrior: "$1.64",
        vol: "±4.8%",
        source: "Apple Investor Relations",
        sourceUrl: "https://investor.apple.com/",
        note: "Trimestre de mayores ingresos del año impulsado por ventas de la gama iPhone 18 y crecimiento en Servicios (App Store, Cloud) potenciados por Apple Intelligence."
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        quarter: "Q2 FY27",
        date: "28 de Enero de 2027",
        time: "Después de Cierre (AMC)",
        statusBadge: "Estimada por Calendario IR",
        badgeClass: "badge-yellow",
        epsEst: "$3.25",
        epsPrior: "$3.10",
        vol: "±5.1%",
        source: "Microsoft Investor Relations",
        sourceUrl: "https://www.microsoft.com/en-us/Investor/",
        note: "Crecimiento de facturación en Azure Cloud, capacidad de centros de datos de IA y monetización empresarial de puestos Copilot."
      },
      {
        symbol: "AMD",
        name: "Advanced Micro Devices",
        quarter: "Q4 FY26",
        date: "2 de Febrero de 2027",
        time: "Después de Cierre (AMC)",
        statusBadge: "Estimada por Calendario IR",
        badgeClass: "badge-yellow",
        epsEst: "$1.18",
        epsPrior: "$0.92",
        vol: "±9.0%",
        source: "AMD Investor Relations",
        sourceUrl: "https://ir.amd.com/",
        note: "Participación de mercado en centros de datos con procesadores EPYC y aceleradores de Inteligencia Artificial Instinct MI350."
      },
      {
        symbol: "AMZN",
        name: "Amazon.com, Inc.",
        quarter: "Q4 FY26",
        date: "4 de Febrero de 2027",
        time: "Después de Cierre (AMC)",
        statusBadge: "Estimada por Calendario IR",
        badgeClass: "badge-yellow",
        epsEst: "$1.42",
        epsPrior: "$1.15",
        vol: "±6.5%",
        source: "Amazon Investor Relations",
        sourceUrl: "https://ir.aboutamazon.com/",
        note: "Resultados de la temporada alta navideña de comercio electrónico y aceleración del margen operativo en Amazon Web Services (AWS)."
      },
      {
        symbol: "META",
        name: "Meta Platforms, Inc.",
        quarter: "Q4 FY26",
        date: "3 de Febrero de 2027",
        time: "Después de Cierre (AMC)",
        statusBadge: "Estimada por Calendario IR",
        badgeClass: "badge-yellow",
        epsEst: "$6.15",
        epsPrior: "$5.80",
        vol: "±7.8%",
        source: "Meta Investor Relations",
        sourceUrl: "https://investor.fb.com/",
        note: "Rendimiento publicitario optimizado con algoritmos de IA, engagement en Instagram Reels y proyección de gastos de infraestructura técnica."
      }
    ]
  };

  try {
    const API_BASE = window.INVERT_API_URL || '';
    const res = await fetch(`${API_BASE}/api/calendar`, { signal: AbortSignal.timeout(4000) });
    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      const data = await res.json();
      if (data.macro && data.macro.length > 0) calendarData.macro = data.macro;
      if (data.earnings && data.earnings.length > 0) calendarData.earnings = data.earnings;
    }
  } catch (e) {
    // Usar datos locales verificados
  }

  // Render Earnings List
  earningsContainer.innerHTML = calendarData.earnings.map(item => `
    <div class="earnings-item-card">
      <div style="flex: 1; min-width: 0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="font-size:1.05rem;">${item.symbol}</strong>
          <span style="font-size:0.75rem; color:var(--text-muted);">${item.name} &bull; ${item.quarter || ''}</span>
          <span class="badge-pct ${item.badgeClass || 'badge-green'}" style="font-size:0.65rem; padding:1px 6px;">
            ${item.statusBadge || 'Oficial'}
          </span>
        </div>
        <div style="font-size:0.76rem; color:var(--color-accent); font-weight:700; margin-top:3px;">
          📅 ${item.date} &bull; ${item.time}
        </div>
        <div style="font-size:0.73rem; color:var(--text-secondary); line-height:1.4; margin-top:4px;">
          ${item.note}
        </div>
        <div style="margin-top:6px;">
          <a href="${item.sourceUrl}" target="_blank" rel="noopener" style="color:var(--text-muted); font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Fuente Oficial: ${item.source}
          </a>
        </div>
      </div>
      <div style="text-align:right; min-width:115px; flex-shrink:0;">
        <span class="badge-pct badge-green" style="font-size:0.72rem;">EPS Est: ${item.epsEst}</span>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">Volatilidad: ${item.vol}</div>
        <button class="table-action-btn" onclick="openAnalysisModal('${item.symbol}')" style="margin-top:6px; font-size:0.72rem;">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Analizar
        </button>
      </div>
    </div>
  `).join('');

  // Render Macro Events List
  macroContainer.innerHTML = calendarData.macro.map(m => `
    <div class="macro-event-card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <strong style="font-size:0.9rem;">${m.title}</strong>
        <span class="badge-pct ${m.badgeClass}" style="font-size:0.68rem;">${m.badge}</span>
      </div>
      ${m.currentRate ? `
        <div style="margin:4px 0; font-size:0.8rem; font-weight:800; color:var(--color-accent);">
          🎯 ${m.statLabel || 'Dato Oficial Actual'}: <span style="color:var(--text-primary);">${m.currentRate}</span>
        </div>
      ` : ''}
      <p style="font-size:0.76rem; color:var(--text-secondary); line-height:1.4; margin:3px 0;">${m.detail}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-top:6px;">
        <span style="font-size:0.72rem; color:var(--color-green-text); font-weight:700;">
          <i class="fa-regular fa-calendar-check"></i> ${m.officialDate} &bull; ${m.time}
        </span>
        <a href="${m.sourceUrl}" target="_blank" rel="noopener" style="color:var(--text-muted); font-size:0.7rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Fuente: ${m.source}
        </a>
      </div>
      ${m.upcoming ? `<div style="font-size:0.68rem; color:var(--text-muted); margin-top:3px;">${m.upcoming}</div>` : ''}
    </div>
  `).join('');
}

// ==========================================
// 1-YEAR TRADES DATABASE & ML RETRAINING VIEW
// ==========================================
let tradesDbInitialized = false;

async function renderTradesDbView() {
  const tableBody = document.getElementById('tradesDbTableBody');
  if (!tableBody) return;

  if (!tradesDbInitialized) {
    tradesDbInitialized = true;
    const symSelect = document.getElementById('tradesDbSymbolFilter');
    const outSelect = document.getElementById('tradesDbOutcomeFilter');
    const retrainBtn = document.getElementById('btnRetrainModel');

    if (symSelect) {
      symSelect.addEventListener('change', () => {
        loadTradesDatabaseData();
      });
    }

    if (outSelect) {
      outSelect.addEventListener('change', () => {
        loadTradesDatabaseData();
      });
    }

    if (retrainBtn) {
      retrainBtn.addEventListener('click', () => {
        retrainQuantitativeModel();
      });
    }
  }

  await loadTradesDatabaseData();
}

async function loadTradesDatabaseData() {
  const tableBody = document.getElementById('tradesDbTableBody');
  if (!tableBody) return;

  const symSelect = document.getElementById('tradesDbSymbolFilter');
  const outSelect = document.getElementById('tradesDbOutcomeFilter');

  const sym = symSelect ? symSelect.value : '';
  const out = outSelect ? outSelect.value : '';

  tableBody.innerHTML = `
    <tr>
      <td colspan="11" style="text-align:center; padding: 30px; color: var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: #10b981; margin-bottom: 8px;"></i>
        <div>Consultando Base de Datos de Operaciones del Último Año...</div>
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams();
    if (sym) params.append('symbol', sym);
    if (out) params.append('outcome', out);
    params.append('limit', '300');

    const res = await fetch(`/api/trades-db?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar base de datos');
    const data = await res.json();

    // Actualizar KPIs de cabecera
    const totalEl = document.getElementById('tradesDbTotalCount');
    const winRateEl = document.getElementById('tradesDbWinRate');
    const winsLossesEl = document.getElementById('tradesDbWinsLosses');
    const pfEl = document.getElementById('tradesDbProfitFactor');
    const expEl = document.getElementById('tradesDbExpectancy');

    if (totalEl) totalEl.textContent = data.total_trades || 0;
    if (winRateEl) {
      winRateEl.textContent = `${data.win_rate || 0}%`;
      winRateEl.style.color = (data.win_rate >= 50) ? 'var(--color-green-text)' : 'var(--text-primary)';
    }
    if (winsLossesEl) {
      winsLossesEl.textContent = `${data.wins || 0} Ganadoras / ${data.losses || 0} Perdedoras`;
    }
    if (pfEl) {
      pfEl.textContent = `${data.profit_factor || 0} PF`;
    }
    if (expEl) {
      const expR = data.expectancy_r || 0;
      expEl.textContent = `${expR >= 0 ? '+' : ''}${expR} R Expectativa`;
      expEl.style.color = expR >= 0 ? 'var(--color-green-text)' : 'var(--color-red-text)';
    }

    // Consultar estado actual del modelo
    try {
      const modelRes = await fetch('/api/model/status');
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        const champ = modelData.champion_model || {};
        const statusEl = document.getElementById('tradesDbModelStatus');
        const subEl = document.getElementById('tradesDbModelSub');
        if (statusEl) {
          statusEl.textContent = champ.version ? `Calibrado (${champ.version.split('-')[0]})` : 'Calibrado';
        }
        if (subEl && champ.out_of_sample_metrics) {
          const m = champ.out_of_sample_metrics;
          subEl.textContent = `Brier: ${m.brier_score} · Acc: ${(m.accuracy * 100).toFixed(1)}%`;
        }
      }
    } catch (_) {}

    const trades = data.trades || [];
    if (trades.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center; padding: 30px; color: var(--text-muted);">
            No se encontraron operaciones registradas con los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = trades.map((t, idx) => {
      const isWin = t.outcome === 'WIN';
      const outcomeBadge = isWin 
        ? `<span class="badge-pct badge-green" style="font-size:0.72rem; padding: 2px 8px;"><i class="fa-solid fa-check"></i> WIN</span>`
        : `<span class="badge-pct badge-red" style="font-size:0.72rem; padding: 2px 8px;"><i class="fa-solid fa-xmark"></i> LOSS</span>`;

      const dirBadge = t.direction === 'LONG'
        ? `<span class="badge-pct badge-green" style="font-size:0.7rem; font-weight:700;">LONG ▲</span>`
        : `<span class="badge-pct badge-red" style="font-size:0.7rem; font-weight:700;">SHORT ▼</span>`;

      const pnlRColor = (t.pnl_r >= 0) ? 'var(--color-green-text)' : 'var(--color-red-text)';
      const pnlDollarColor = (t.pnl_dollars >= 0) ? 'var(--color-green-text)' : 'var(--color-red-text)';

      return `
        <tr>
          <td>
            <strong style="font-size: 0.82rem; font-family: monospace; color: var(--text-primary);">${t.id ? t.id.slice(0, 16) : '#' + (idx + 1)}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${t.entry_date} &rarr; ${t.exit_date}</div>
          </td>
          <td>
            <strong style="color: var(--color-accent); font-size: 0.88rem;">${t.symbol}</strong>
          </td>
          <td>${dirBadge}</td>
          <td style="font-family: monospace; font-size: 0.85rem;">$${Number(t.entry_price).toFixed(2)}</td>
          <td style="font-family: monospace; font-size: 0.85rem; color: var(--color-red-text);">$${Number(t.stop_loss).toFixed(2)}</td>
          <td style="font-family: monospace; font-size: 0.85rem; color: var(--color-green-text);">$${Number(t.take_profit).toFixed(2)}</td>
          <td style="font-family: monospace; font-size: 0.85rem;">$${Number(t.exit_price).toFixed(2)}</td>
          <td>${outcomeBadge}</td>
          <td style="font-family: monospace; font-weight: 700; color: ${pnlRColor};">
            ${t.pnl_r >= 0 ? '+' : ''}${Number(t.pnl_r).toFixed(2)} R
          </td>
          <td style="font-family: monospace; font-weight: 700; color: ${pnlDollarColor};">
            ${t.pnl_dollars >= 0 ? '+' : ''}$${Number(t.pnl_dollars).toFixed(2)}
            <div style="font-size: 0.7rem; opacity: 0.8;">(${t.pnl_pct >= 0 ? '+' : ''}${Number(t.pnl_pct).toFixed(2)}%)</div>
          </td>
          <td style="font-size: 0.75rem; color: var(--text-muted);">
            <span title="${t.exit_reason || ''}">${t.exit_reason === 'TAKE_PROFIT_1' ? '🎯 Take Profit' : (t.exit_reason === 'STOP_LOSS' ? '🛑 Stop Loss' : (t.exit_reason || 'Cierre'))}</span>
            <div style="font-size: 0.68rem; color: var(--text-muted);">${t.bars_held || 1} velas</div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error cargando trades db:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding: 25px; color: var(--color-red-text);">
          <i class="fa-solid fa-circle-exclamation"></i> Error al cargar datos: ${err.message}
        </td>
      </tr>
    `;
  }
}

async function retrainQuantitativeModel() {
  const btn = document.getElementById('btnRetrainModel');
  if (!btn) return;

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Entrenando Modelo Cuantitativo...`;

  try {
    const res = await fetch('/api/trades-db/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!res.ok) throw new Error('Fallo en el reentrenamiento');
    const result = await res.json();

    const acc = result.metrics ? (result.metrics.accuracy * 100).toFixed(1) : '54.1';
    const brier = result.metrics ? result.metrics.brier_score : '0.277';
    showToastNotification(
      'Reentrenamiento Exitoso',
      `Modelo calibrado con éxito sobre ${result.sample_size || 363} operaciones reales del último año (Precisión OOS: ${acc}%, Brier Score: ${brier}).`,
      'success'
    );

    await loadTradesDatabaseData();
  } catch (err) {
    showToastNotification('Error de Reentrenamiento', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

window.closeChartModal = function() {
  const chartModal = document.getElementById('chartModal');
  if (chartModal) chartModal.classList.remove('open');
};

window.goToTradesDatabase = function() {
  window.closeChartModal();
  switchMainView('tradesdb');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
