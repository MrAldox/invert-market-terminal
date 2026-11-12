/**
 * INVERT - High Performance Financial Canvas Chart Engine
 * Renders smooth sparklines for cards & full interactive charts with hover crosshairs.
 */

const ChartEngine = {
  // Render a mini sparkline on a stock card canvas
  renderSparkline(canvas, points, isPositive) {
    if (!canvas || !points || points.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 280;
    const height = rect.height || canvas.height || 50;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;
    const padY = 6;
    const effHeight = height - padY * 2;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - padY - ((val - min) / range) * effHeight;
      return { x, y };
    });

    const lineColor = isPositive ? '#10b981' : '#ef4444';
    const gradColor = isPositive ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';

    // Fill area under curve
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, gradColor);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + curr.y) / 2);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw main line
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + curr.y) / 2);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  },

  // State for active modal chart
  _activeChart: null,

  // Render full interactive chart inside modal
  renderInteractiveChart(canvas, historyPoints, symbol, isPositive, prevClose) {
    if (!canvas || !historyPoints || historyPoints.length === 0) return;

    this._activeChart = {
      canvas,
      points: historyPoints,
      symbol,
      isPositive,
      prevClose: prevClose || historyPoints[0].close,
      hoverIdx: null
    };

    const draw = () => {
      const c = this._activeChart;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 340;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const points = c.points;
      const prices = points.map(p => p.close || p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = (maxPrice - minPrice) || 1;

      const padTop = 30;
      const padBottom = 40;
      const padRight = width < 500 ? 55 : 75;
      const padLeft = width < 500 ? 10 : 15;

      const chartW = width - padLeft - padRight;
      const chartH = height - padTop - padBottom;

      // Draw Grid Lines & Price Axis
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';

      const steps = 4;
      for (let i = 0; i <= steps; i++) {
        const y = padTop + (chartH / steps) * i;
        const priceVal = maxPrice - (priceRange / steps) * i;

        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + chartW, y);
        ctx.stroke();

        ctx.fillText(`$${priceVal.toFixed(2)}`, padLeft + chartW + 8, y + 4);
      }

      // Coordinates mapping
      const coords = points.map((p, idx) => {
        const x = padLeft + (idx / (points.length - 1 || 1)) * chartW;
        const val = p.close || p.price;
        const y = padTop + chartH - ((val - minPrice) / priceRange) * chartH;
        return { x, y, price: val, time: p.time };
      });

      const lineColor = c.isPositive ? '#10b981' : '#ef4444';
      const gradColor = c.isPositive ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)';

      // Gradient Fill
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
      grad.addColorStop(0, gradColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const midX = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + curr.y) / 2);
      }
      ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
      ctx.lineTo(padLeft + chartW, padTop + chartH);
      ctx.lineTo(padLeft, padTop + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Main line
      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const midX = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + curr.y) / 2);
      }
      ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw Time labels at bottom
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      const timeSteps = 4;
      for (let i = 0; i <= timeSteps; i++) {
        const idx = Math.floor((points.length - 1) * (i / timeSteps));
        const p = points[idx];
        const x = coords[idx].x;
        const d = new Date(p.time * 1000);
        const timeStr = d.getHours() || d.getMinutes()
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        ctx.fillText(timeStr, x, height - 12);
      }

      // Hover Crosshair & Tooltip
      if (c.hoverIdx !== null && coords[c.hoverIdx]) {
        const target = coords[c.hoverIdx];

        // Vertical line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(target.x, padTop);
        ctx.lineTo(target.x, padTop + chartH);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(padLeft, target.y);
        ctx.lineTo(padLeft + chartW, target.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Focus point circle
        ctx.beginPath();
        ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tooltip box
        const chg = target.price - c.prevClose;
        const chgPct = (chg / c.prevClose) * 100;
        const sign = chg >= 0 ? '+' : '';
        const d = new Date(target.time * 1000);
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const tipText1 = `$${target.price.toFixed(2)}`;
        const tipText2 = `${sign}${chg.toFixed(2)} (${sign}${chgPct.toFixed(2)}%)`;
        const tipText3 = dateStr;

        ctx.font = 'bold 12px Inter, sans-serif';
        const isSmallScreen = width < 500;
        const boxW = isSmallScreen ? 135 : 160;
        const boxH = isSmallScreen ? 56 : 65;
        let boxX = target.x - boxW / 2;
        if (boxX < padLeft) boxX = padLeft;
        if (boxX + boxW > padLeft + chartW) boxX = padLeft + chartW - boxW;
        const boxY = Math.max(padTop + 6, target.y - boxH - 12);

        // Tooltip Background
        ctx.fillStyle = 'rgba(14, 20, 34, 0.95)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        // Tooltip Text
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = isSmallScreen ? 'bold 12px monospace' : 'bold 14px monospace';
        ctx.fillText(tipText1, boxX + 8, boxY + (isSmallScreen ? 16 : 20));

        ctx.fillStyle = chg >= 0 ? '#34d399' : '#f87171';
        ctx.font = isSmallScreen ? '600 10px monospace' : '600 11px monospace';
        ctx.fillText(tipText2, boxX + 8, boxY + (isSmallScreen ? 32 : 38));

        ctx.fillStyle = '#94a3b8';
        ctx.font = isSmallScreen ? '9px Inter, sans-serif' : '10px Inter, sans-serif';
        ctx.fillText(tipText3, boxX + 8, boxY + (isSmallScreen ? 47 : 54));
      }
    };

    draw();

    // Mouse and Touch event listeners for seamless desktop & mobile drag interaction
    if (!canvas._hasChartEvents) {
      const updateHoverAtX = (clientX) => {
        if (!this._activeChart) return;
        const rect = canvas.getBoundingClientRect();
        const posX = clientX - rect.left;
        const padL = rect.width < 500 ? 10 : 15;
        const padR = rect.width < 500 ? 55 : 75;
        const chartW = rect.width - padL - padR;
        const frac = Math.max(0, Math.min(1, (posX - padL) / chartW));
        const idx = Math.round(frac * (this._activeChart.points.length - 1));
        this._activeChart.hoverIdx = idx;
        draw();
      };

      canvas.addEventListener('mousemove', (e) => {
        updateHoverAtX(e.clientX);
      });

      canvas.addEventListener('mouseleave', () => {
        if (this._activeChart) {
          this._activeChart.hoverIdx = null;
          draw();
        }
      });

      // Mobile Touch Dragging Support
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          updateHoverAtX(e.touches[0].clientX);
        }
      }, { passive: true });

      canvas.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
          updateHoverAtX(e.touches[0].clientX);
        }
      }, { passive: true });

      canvas.addEventListener('touchend', () => {
        if (this._activeChart) {
          this._activeChart.hoverIdx = null;
          draw();
        }
      });

      canvas._hasChartEvents = true;
    }
  }
};
