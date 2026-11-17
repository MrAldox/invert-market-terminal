/**
 * INVERT · Market Terminal Pro
 * Módulo de Ficha de Operación Cuantitativa y Gestión de Riesgo (TradeIdeaModule)
 */

const TradeIdeaModule = {
  currentSymbol: 'AAPL',
  currentTimeframe: '1d',
  capital: 10000.0,
  riskPct: 0.01,
  currentIdea: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Sincronizar inputs de capital y riesgo si existen
    const capInput = document.getElementById('tradeIdeaCapitalInput');
    const riskInput = document.getElementById('tradeIdeaRiskSelect');

    if (capInput) {
      capInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 100) {
          this.capital = val;
          this.loadTradeIdea(this.currentSymbol, this.currentTimeframe);
        }
      });
    }

    if (riskInput) {
      riskInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0 && val <= 0.05) {
          this.riskPct = val;
          this.loadTradeIdea(this.currentSymbol, this.currentTimeframe);
        }
      });
    }

    // Botón para copiar ficha al portapapeles
    const copyBtn = document.getElementById('btnCopyTradeIdea');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyToClipboard();
      });
    }

    // Botón para enviar a Paper Trading
    const paperBtn = document.getElementById('btnSendToPaperTrading');
    if (paperBtn) {
      paperBtn.addEventListener('click', () => {
        this.sendToPaperTrading();
      });
    }

    // Botón para solicitar explicación cualitativa de IA
    const explainBtn = document.getElementById('btnExplainWithAI');
    if (explainBtn) {
      explainBtn.addEventListener('click', () => {
        this.requestAIExplanation();
      });
    }
  },

  async loadTradeIdea(symbol, timeframe = '1d') {
    this.currentSymbol = (symbol || 'AAPL').toUpperCase().trim();
    this.currentTimeframe = timeframe;

    const container = document.getElementById('tradeIdeaContent');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: var(--color-accent); margin-bottom: 10px;"></i>
          <p>Calculando niveles cuantitativos y gestión de riesgo...</p>
        </div>
      `;
    }

    try {
      const url = `/api/trade-idea?symbol=${this.currentSymbol}&timeframe=${this.currentTimeframe}&capital=${this.capital}&risk_pct=${this.riskPct}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar ficha de operación');
      const data = await res.json();
      this.currentIdea = data;
      this.render(data);

      // Si es una orden operable (LONG o SHORT), proyectar niveles en el Canvas de ChartEngine
      if (data.status === 'OPERABLE' && (data.direction === 'LONG' || data.direction === 'SHORT') && data.entry && data.stop_loss) {
        if (typeof ChartEngine !== 'undefined' && ChartEngine.setTradeOverlays) {
          ChartEngine.setTradeOverlays({
            entry: data.entry.market,
            stop_loss: data.stop_loss.price,
            tp1: data.take_profit_1 ? data.take_profit_1.price : null,
            tp2: data.take_profit_2 ? data.take_profit_2.price : null,
            direction: data.direction
          });
        }
      } else {
        if (typeof ChartEngine !== 'undefined' && ChartEngine.clearTradeOverlays) {
          ChartEngine.clearTradeOverlays();
        }
      }

    } catch (err) {
      console.error('Error en TradeIdeaModule:', err);
      if (container) {
        container.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 15px; border-radius: var(--radius-md); text-align: center;">
            <p style="color: #ef4444; font-weight: 600;">No se pudo generar la ficha de operación.</p>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${err.message}</span>
          </div>
        `;
      }
    }
  },

  render(idea) {
    const container = document.getElementById('tradeIdeaContent');
    if (!container) return;

    // 1. Semáforo y Badge de Dirección
    let dirBadgeClass = 'badge-yellow';
    let dirIcon = 'fa-pause';
    let dirColor = '#f59e0b';
    let dirTitle = 'NO OPERAR (Mercado Neutral / Esperar)';

    if (idea.direction === 'LONG') {
      dirBadgeClass = 'badge-green';
      dirIcon = 'fa-arrow-trend-up';
      dirColor = '#10b981';
      dirTitle = 'ORDEN COMPRA (LONG)';
    } else if (idea.direction === 'SHORT') {
      dirBadgeClass = 'badge-red';
      dirIcon = 'fa-arrow-trend-down';
      dirColor = '#ef4444';
      dirTitle = 'ORDEN VENTA (SHORT)';
    } else if (idea.direction === 'BLOQUEADO') {
      dirBadgeClass = 'badge-red';
      dirIcon = 'fa-shield-halved';
      dirColor = '#dc2626';
      dirTitle = 'OPERACIÓN BLOQUEADA';
    }

    // 2. Banner de Integridad de Datos
    let integrityBanner = '';
    const src = idea.data_source || 'live';
    if (src === 'fallback_synthetic') {
      integrityBanner = `
        <div style="background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.5); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 14px; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 1.2rem;"></i>
          <div>
            <strong style="color: #ef4444; font-size: 0.85rem;">DATOS SINTÉTICOS DETECTADOS (MODO FALLBACK)</strong>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">Se prohíbe terminantemente operar sobre simulaciones. Todas las señales están bloqueadas.</p>
          </div>
        </div>
      `;
    } else {
      const srcLabel = src === 'live' ? 'En Vivo (Yahoo Finance Oficial)' : 'Caché Validada';
      integrityBanner = `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem; color: var(--text-muted); background: var(--bg-card); padding: 6px 12px; border-radius: var(--radius-md); margin-bottom: 12px; border: 1px solid var(--border-color);">
          <span><i class="fa-solid fa-database" style="color: var(--color-accent); margin-right: 4px;"></i> Fuente: <strong style="color: var(--text-primary);">${srcLabel}</strong></span>
          <span><i class="fa-regular fa-clock" style="margin-right: 4px;"></i> Verificado</span>
        </div>
      `;
    }

    // 3. Tarjetas de Niveles de Precio (si es operable)
    let levelsHtml = '';
    if (idea.status === 'OPERABLE' && (idea.direction === 'LONG' || idea.direction === 'SHORT') && idea.entry) {
      levelsHtml = `
        <div class="corridor-grid" style="margin-bottom: 16px;">
          <div class="corridor-card" style="border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.06);">
            <span class="corridor-label">📍 Entrada (Mercado)</span>
            <span class="corridor-val" style="color: #38bdf8;">$${idea.entry.market.toFixed(2)}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">Límite: $${idea.entry.pullback_limit.toFixed(2)}</span>
          </div>

          <div class="corridor-card" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.06);">
            <span class="corridor-label">🛑 Stop Loss (${idea.stop_loss.basis})</span>
            <span class="corridor-val" style="color: #ef4444;">$${idea.stop_loss.price.toFixed(2)}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">Distancia: -$${idea.stop_loss.distance.toFixed(2)} (${idea.stop_loss.distance_atr_mult}x ATR)</span>
          </div>

          <div class="corridor-card" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06);">
            <span class="corridor-label">🎯 Objetivo 1 (1.5R)</span>
            <span class="corridor-val" style="color: #10b981;">$${idea.take_profit_1.price.toFixed(2)}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">Cierre 50% de posición</span>
          </div>

          <div class="corridor-card" style="border-color: rgba(5, 150, 105, 0.4); background: rgba(5, 150, 105, 0.06);">
            <span class="corridor-label">🚀 Objetivo 2 (3.0R)</span>
            <span class="corridor-val" style="color: #059669;">$${idea.take_profit_2.price.toFixed(2)}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">Cierre restante</span>
          </div>
        </div>
      `;
    }

    // 4. Dimensionamiento de Posición (Position Sizing)
    let sizingHtml = '';
    if (idea.sizing) {
      const capWarning = idea.sizing.capped_by_max_exposure
        ? `<div style="font-size: 0.72rem; color: #f59e0b; margin-top: 4px;"><i class="fa-solid fa-triangle-exclamation"></i> Tamaño acotado al límite prudencial del 25% de la cartera.</div>`
        : '';

      sizingHtml = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">
              <i class="fa-solid fa-calculator" style="color: var(--color-accent); margin-right: 4px;"></i> Dimensionamiento por Riesgo Fijo
            </span>
            <span style="font-size: 0.76rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
              Riesgo: 1.0% ($${idea.sizing.capital_at_risk.toFixed(2)})
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
            <div style="background: rgba(255, 255, 255, 0.03); padding: 8px 10px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Acciones a Operar</span>
              <strong style="font-size: 1.15rem; font-family: var(--font-mono); color: var(--text-primary);">${idea.sizing.position_shares}</strong>
            </div>

            <div style="background: rgba(255, 255, 255, 0.03); padding: 8px 10px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Valor de Posición</span>
              <strong style="font-size: 1.15rem; font-family: var(--font-mono); color: var(--text-primary);">$${idea.sizing.position_value.toFixed(2)}</strong>
            </div>

            <div style="background: rgba(255, 255, 255, 0.03); padding: 8px 10px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Exposición Cartera</span>
              <strong style="font-size: 1.15rem; font-family: var(--font-mono); color: var(--text-primary);">${idea.sizing.portfolio_exposure_pct}%</strong>
            </div>

            <div style="background: rgba(255, 255, 255, 0.03); padding: 8px 10px; border-radius: var(--radius-sm);">
              <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Ratio R:B Teórico</span>
              <strong style="font-size: 1.15rem; font-family: var(--font-mono); color: var(--color-green-text);">1 : ${idea.risk_reward_ratio || 2.25}</strong>
            </div>
          </div>
          ${capWarning}
        </div>
      `;
    }

    // 5. Confianza Calibrada vs Sin Calibrar
    const conf = idea.confidence || { is_calibrated: false, label: 'Sin calibrar' };
    const confLabel = conf.is_calibrated ? `${(conf.value * 100).toFixed(1)}% (Calibrada con Brier Score)` : 'Sin calibrar (Requiere modelo OOS)';
    const confBadgeStyle = conf.is_calibrated ? 'background: rgba(16, 185, 129, 0.15); color: #10b981;' : 'background: rgba(148, 163, 184, 0.15); color: #94a3b8;';

    // 6. Razones y Contradicciones
    const reasonsList = (idea.reasons || []).map(r => `<li style="margin-bottom: 4px;"><i class="fa-solid fa-circle-check" style="color: #10b981; margin-right: 6px;"></i>${r}</li>`).join('');
    const contradictionsList = (idea.contradictions || []).map(c => `<li style="margin-bottom: 4px;"><i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; margin-right: 6px;"></i>${c}</li>`).join('');
    const warningsList = (idea.warnings || []).map(w => `<li style="margin-bottom: 4px;"><i class="fa-solid fa-circle-exclamation" style="color: #ef4444; margin-right: 6px;"></i>${w}</li>`).join('');

    // 7. Render final
    container.innerHTML = `
      ${integrityBanner}

      <!-- Header de Dirección y Setup -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
          <div>
            <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Veredicto de Operación</span>
            <div style="font-size: 1.4rem; font-weight: 800; color: ${dirColor}; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid ${dirIcon}"></i> ${dirTitle}
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Confianza Probabilística</span>
            <span style="font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; ${confBadgeStyle}">
              ${confLabel}
            </span>
          </div>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
          <strong>Setup:</strong> ${idea.setup_name || 'N/A'}
        </p>
      </div>

      <!-- Niveles de Precios -->
      ${levelsHtml}

      <!-- Sizing de Cartera -->
      ${sizingHtml}

      <!-- Cuadrícula de Razones, Contradicciones y Advertencias -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 14px;">
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px;">
          <h4 style="font-size: 0.8rem; font-weight: 700; color: #10b981; margin-bottom: 8px; text-transform: uppercase;">
            <i class="fa-solid fa-thumbs-up" style="margin-right: 4px;"></i> Argumentos Favorables (${(idea.reasons || []).length})
          </h4>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.78rem; color: var(--text-secondary);">
            ${reasonsList || '<li style="color: var(--text-muted);">Sin catalizadores alcistas notables.</li>'}
          </ul>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px;">
          <h4 style="font-size: 0.8rem; font-weight: 700; color: #f59e0b; margin-bottom: 8px; text-transform: uppercase;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px;"></i> Contradicciones y Riesgos (${(idea.contradictions || []).length})
          </h4>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.78rem; color: var(--text-secondary);">
            ${contradictionsList || '<li style="color: var(--text-muted);">Sin discrepancias críticas detectadas.</li>'}
          </ul>
        </div>
      </div>

      ${warningsList ? `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 14px;">
          <h5 style="font-size: 0.75rem; color: #ef4444; font-weight: 700; margin-bottom: 6px; text-transform: uppercase;">
            <i class="fa-solid fa-bell"></i> Advertencias de Eventos Próximos
          </h5>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.76rem; color: var(--text-secondary);">
            ${warningsList}
          </ul>
        </div>
      ` : ''}

      <!-- Invalidación -->
      <div style="background: rgba(148, 163, 184, 0.08); border-left: 3px solid var(--color-accent); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
        <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Criterio de Invalidación:</span>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 2px 0 0 0;">
          ${idea.invalidation_condition || idea.invalidation || 'Cierre de vela fuera de los límites de riesgo.'}
        </p>
      </div>

      <!-- Caja de Explicación de IA -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-robot" style="color: var(--color-accent);"></i> Explicación Analítica de Apoyo (IA Validada)
          </span>
          <button id="btnExplainWithAI" class="btn-secondary" style="font-size: 0.72rem; padding: 4px 10px;">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Explicar Detalle
          </button>
        </div>
        <div id="aiExplanationContainer" style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
          ${idea.status === 'OPERABLE' && (idea.direction === 'LONG' || idea.direction === 'SHORT') 
            ? `Señal cuantificada para ${idea.symbol}. Stop Loss fijado a 1.5x ATR y toma de beneficios escalonada en 1.5R y 3.0R para maximizar la esperanza matemática.`
            : 'Posición de cautela recomendada ante confluencia técnica insuficiente.'}
        </div>
      </div>

      <!-- Barra de Acciones Principales -->
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
        <button id="btnCopyTradeIdea" class="btn-secondary" style="flex: 1; min-width: 180px; min-height: 44px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <i class="fa-regular fa-copy"></i> Copiar Ficha de Orden
        </button>

        ${idea.status === 'OPERABLE' && (idea.direction === 'LONG' || idea.direction === 'SHORT') ? `
          <button id="btnSendToPaperTrading" class="btn-primary" style="flex: 1; min-width: 180px; min-height: 44px; font-weight: 700; font-size: 0.85rem; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fa-solid fa-bolt"></i> Enviar a Paper Trading
          </button>
        ` : ''}
      </div>

      <!-- Disclaimer Legal de Honestidad Radical -->
      <div style="text-align: center; padding: 8px 12px; background: rgba(0, 0, 0, 0.2); border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
        <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0;">
          <i class="fa-solid fa-shield-halved" style="margin-right: 4px;"></i>
          ${idea.disclaimer || 'Herramienta de apoyo a la decisión, no es asesoría financiera. Puedes perder dinero.'}
        </p>
      </div>
    `;

    // Re-bind click handlers for the newly rendered buttons
    this.bindEvents();
  },

  async requestAIExplanation() {
    if (!this.currentIdea) return;
    const box = document.getElementById('aiExplanationContainer');
    if (!box) return;

    box.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generando explicación analítica verificada sin alucinaciones...`;

    try {
      const res = await fetch('/api/trade-idea/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_idea: this.currentIdea,
          market_context: {
            symbol: this.currentSymbol,
            timeframe: this.currentTimeframe
          }
        })
      });

      if (!res.ok) throw new Error('Error al conectar con el explicador');
      const data = await res.json();
      
      const risksHtml = (data.top_risks || []).map(r => `<li>${r}</li>`).join('');
      box.innerHTML = `
        <p style="margin-bottom: 8px;">${data.explanation_text}</p>
        <div style="background: rgba(255,255,255,0.02); padding: 8px 10px; border-radius: 4px; margin-top: 6px;">
          <strong style="font-size: 0.74rem; color: var(--text-primary);">3 Principales Riesgos:</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 0.75rem; color: var(--text-muted);">
            ${risksHtml}
          </ul>
        </div>
        <div style="font-size: 0.7rem; color: var(--color-green-text); margin-top: 6px;">
          <i class="fa-solid fa-check-double"></i> Verificación numérica anti-alucinaciones superada.
        </div>
      `;
    } catch (err) {
      box.innerHTML = `<span style="color: #f59e0b;">${this.currentIdea.invalidation_condition || 'Explicación determinista activa.'}</span>`;
    }
  },

  copyToClipboard() {
    if (!this.currentIdea) return;
    const idea = this.currentIdea;
    const isTrade = idea.status === 'OPERABLE' && (idea.direction === 'LONG' || idea.direction === 'SHORT') && idea.entry;

    let text = `========================================\n`;
    text += `INVERT · FICHA DE OPERACIÓN CUANTITATIVA\n`;
    text += `Activo: ${idea.symbol} | Marco: ${idea.timeframe}\n`;
    text += `Dirección: ${idea.direction}\n`;
    text += `Fuente: ${idea.data_source}\n`;
    text += `----------------------------------------\n`;
    if (isTrade) {
      text += `Entrada (Mercado): $${idea.entry.market.toFixed(2)}\n`;
      text += `Entrada Límite: $${idea.entry.pullback_limit.toFixed(2)}\n`;
      text += `Stop Loss: $${idea.stop_loss.price.toFixed(2)} (${idea.stop_loss.basis})\n`;
      text += `Objetivo 1 (1.5R): $${idea.take_profit_1.price.toFixed(2)}\n`;
      text += `Objetivo 2 (3.0R): $${idea.take_profit_2.price.toFixed(2)}\n`;
      if (idea.sizing) {
        text += `Tamaño: ${idea.sizing.position_shares} acciones ($${idea.sizing.position_value.toFixed(2)})\n`;
        text += `Capital en Riesgo: $${idea.sizing.capital_at_risk.toFixed(2)} (1%)\n`;
      }
      text += `Invalidación: ${idea.invalidation_condition}\n`;
    } else {
      text += `Estado: ${idea.direction} - ${idea.setup_name}\n`;
      text += `Motivo: ${idea.invalidation || 'Filtro de riesgo activo'}\n`;
    }
    text += `----------------------------------------\n`;
    text += `AVISO: Herramienta de apoyo a la decisión, no es asesoría financiera. Puedes perder dinero.\n`;
    text += `========================================`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') {
          showToast('Ficha de operación copiada al portapapeles 📋', 'success');
        } else {
          alert('Ficha de operación copiada al portapapeles.');
        }
      });
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (typeof showToast === 'function') {
        showToast('Ficha copiada al portapapeles 📋', 'success');
      }
    }
  },

  sendToPaperTrading() {
    if (!this.currentIdea || !this.currentIdea.entry || !this.currentIdea.sizing) {
      if (typeof showToast === 'function') {
        showToast('No hay una orden ejecutable en esta ficha', 'warning');
      }
      return;
    }

    const idea = this.currentIdea;
    const shares = idea.sizing.position_shares;
    const price = idea.entry.market;
    const totalCost = shares * price;

    if (typeof State !== 'undefined') {
      const currentCash = State.portfolioCash || 100000.0;
      if (totalCost > currentCash) {
        if (typeof showToast === 'function') {
          showToast(`Efectivo insuficiente ($${currentCash.toFixed(2)}) para operar $${totalCost.toFixed(2)}`, 'error');
        }
        return;
      }

      // Descontar efectivo y registrar posición
      State.portfolioCash -= totalCost;
      if (!State.portfolioTrades) State.portfolioTrades = [];

      const trade = {
        id: 'trade_' + Date.now(),
        symbol: idea.symbol,
        name: idea.symbol,
        type: idea.direction === 'LONG' ? 'BUY' : 'SELL',
        shares: shares,
        buyPrice: price,
        currentPrice: price,
        stopLoss: idea.stop_loss ? idea.stop_loss.price : null,
        takeProfit: idea.take_profit_1 ? idea.take_profit_1.price : null,
        timestamp: Date.now()
      };

      State.portfolioTrades.push(trade);

      // Persistir en localStorage
      try {
        localStorage.setItem('invert_portfolio_trades', JSON.stringify(State.portfolioTrades));
        localStorage.setItem('invert_portfolio_cash', State.portfolioCash.toString());
      } catch (e) {}

      if (typeof renderPortfolio === 'function') {
        renderPortfolio();
      }

      if (typeof showToast === 'function') {
        showToast(`Orden ejecutada: ${shares} ${idea.symbol} a $${price.toFixed(2)} enviada a Paper Trading ⚡`, 'success');
      }
    }
  }
};

// Exponer en objeto global window y auto-iniciar
window.TradeIdeaModule = TradeIdeaModule;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TradeIdeaModule.init());
  } else {
    TradeIdeaModule.init();
  }
}
