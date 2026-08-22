// ==========================================================================
// Integration page — system diagram, scenario tabs, simulation dashboard
// (charts/heatmap logic ported from the single-page prototype, retheme'd)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  registerCursorTooltipPositioner();
  initReveal('.reveal');
  initCounters('.integ-stat-value[data-count]');
  buildSystemDiagram();
  buildScenarioDiagrams();
  initScenarioTabs();
  initUtilChart();
  initLcowChart();
  initDaySlider();
  initHeatmap();
  initCo2Bars();
});

function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ================================================================ System diagram === */
function buildSystemDiagram(){
  const svg = document.getElementById('systemDiagramSvg');
  if (!svg) return;
  const nuclear = cssVar('--nuclear-glow'), thermal = cssVar('--thermal'), electric = cssVar('--electric'),
        water = cssVar('--water'), ink = cssVar('--ink'), inkMuted = cssVar('--ink-muted'), panel2 = cssVar('--panel-2');
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };

  const box = (x, y, w, h, label, sub, color) => {
    const g = el('g', {});
    g.appendChild(el('rect', { x, y, width: w, height: h, rx: 14, fill: panel2, stroke: color, 'stroke-width': 2 }));
    const t1 = el('text', { x: x + w / 2, y: y + h / 2 - 3, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: ink, 'font-family': 'Tajawal, sans-serif' });
    t1.textContent = label;
    const t2 = el('text', { x: x + w / 2, y: y + h / 2 + 16, 'text-anchor': 'middle', 'font-size': 10, fill: inkMuted, 'font-family': "'IBM Plex Mono', monospace" });
    t2.textContent = sub;
    g.appendChild(t1); g.appendChild(t2);
    svg.appendChild(g);
  };

  const flowPath = (d, color) => {
    svg.appendChild(el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.5 }));
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-dasharray': '6 12' });
    p.appendChild(el('animate', { attributeName: 'stroke-dashoffset', from: 72, to: 0, dur: '1.4s', repeatCount: 'indefinite' }));
    svg.appendChild(p);
  };

  // reactor (right, since RTL reading flows right->left)
  box(830, 130, 140, 80, '10× SMART100', 'Nuclear Reactors', nuclear);
  // thermal path -> MSF (top)
  flowPath('M830,150 C700,90 560,90 470,90', thermal);
  box(330, 55, 140, 70, 'وحدات MSF', 'Thermal Desalination', thermal);
  // electric path -> turbine -> RO (bottom)
  flowPath('M830,190 C740,240 700,240 660,240', electric);
  box(560, 205, 100, 70, 'التوربين', 'Turbine + Generator', electric);
  flowPath('M560,240 C480,240 420,240 400,240', electric);
  box(230, 205, 140, 70, 'وحدات RO', 'Electrical Desalination', electric);
  // both -> fresh water
  flowPath('M330,90 C220,90 170,140 170,165', water);
  flowPath('M230,240 C160,240 170,200 170,175', water);
  box(70, 130, 130, 80, 'مياه محلاة', 'Fresh Water Output', water);

  svg.setAttribute('style', 'font-family:Tajawal,sans-serif;');
}

/* ================================================================ Scenario diagrams === */
function buildScenarioDiagrams(){
  document.querySelectorAll('.scn-svg').forEach(svg => {
    const scenario = svg.dataset.scenarioSvg;
    drawScenario(svg, scenario);
  });
}

function drawScenario(svg, scenario){
  const nuclear = cssVar('--nuclear-glow'), thermal = cssVar('--thermal'), electric = cssVar('--electric'),
        water = cssVar('--water'), ink = cssVar('--ink'), inkMuted = cssVar('--ink-muted'), panel2 = cssVar('--panel-2');
  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };

  const node = (cx, cy, r, color, icon, label) => {
    svg.appendChild(el('circle', { cx, cy, r, fill: panel2, stroke: color, 'stroke-width': 2 }));
    const t = el('text', { x: cx, y: cy + 6, 'text-anchor': 'middle', 'font-size': 20 });
    t.textContent = icon;
    svg.appendChild(t);
    const l = el('text', { x: cx, y: cy + r + 20, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: ink, 'font-family': 'Tajawal, sans-serif' });
    l.textContent = label;
    svg.appendChild(l);
  };
  const flow = (d, color) => {
    svg.appendChild(el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.5 }));
    const p = el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-dasharray': '6 12' });
    p.appendChild(el('animate', { attributeName: 'stroke-dashoffset', from: 72, to: 0, dur: '1.4s', repeatCount: 'indefinite' }));
    svg.appendChild(p);
  };

  if (scenario === 'A'){
    node(380, 130, 42, nuclear, '⚛', 'SMART100');
    flow('M338,130 L262,130', thermal);
    node(230, 130, 38, thermal, '🔥', 'MSF');
    flow('M192,130 L116,130', water);
    node(80, 130, 38, water, '💧', 'مياه عذبة');
  } else if (scenario === 'B'){
    node(400, 130, 40, nuclear, '⚛', 'SMART100');
    flow('M360,130 L300,130', electric);
    node(270, 130, 34, electric, '🌀', 'توربين');
    flow('M236,130 L176,130', electric);
    node(140, 130, 36, electric, '🧪', 'RO');
    flow('M104,130 L60,130', water);
    node(30, 130, 26, water, '💧', '');
  } else {
    node(390, 60, 34, nuclear, '⚛', 'SMART100');
    flow('M362,45 C310,25 260,25 220,40', thermal);
    node(190, 45, 30, thermal, '🔥', 'MSF');
    flow('M362,75 C310,110 280,150 250,175', electric);
    node(220, 190, 30, electric, '🌀', 'توربين→RO');
    flow('M190,75 C170,110 165,150 165,175', water);
    flow('M220,220 C190,235 175,235 165,220', water);
    node(120, 230, 32, water, '💧', 'مياه عذبة');
  }
}

/* ================================================================ Scenario tabs === */
function initScenarioTabs(){
  const tabs = document.querySelectorAll('.scenario-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const s = tab.dataset.scenario;
      tabs.forEach(t => t.classList.toggle('is-active', t === tab));
      document.querySelectorAll('.scenario-panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === s));
    });
  });
}

/* ================================================================ Cursor tooltip positioner === */
function registerCursorTooltipPositioner(){
  if (typeof Chart === 'undefined') return;
  Chart.Tooltip.positioners.cursor = (els, eventPosition) => {
    if (!eventPosition) return false;
    return { x: eventPosition.x + 14, y: eventPosition.y - 12 };
  };
}

/* ================================================================ Charts === */
let utilChartInstance, lcowChartInstance;

function chartDefaults(){
  return {
    ink: cssVar('--ink-secondary'), muted: cssVar('--ink-muted'), grid: cssVar('--border'),
    surface: cssVar('--panel-raised'), util: cssVar('--nuclear-glow'), lcow: cssVar('--thermal'), critical: cssVar('--critical'),
  };
}

function initUtilChart(){
  const c = chartDefaults();
  const ctx = document.getElementById('utilChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const labels = YEAR_DATA.map(d => d.day);
  const values = YEAR_DATA.map(d => +(d.utilization * 100).toFixed(2));
  utilChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'نسبة الاستغلال (%)', data: values, borderColor: c.util, backgroundColor: hexToRgba(c.util, 0.12),
        borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: c.util,
        pointHoverBorderColor: c.surface, pointHoverBorderWidth: 2, fill: true, tension: 0.25 },
      { label: 'الحد الأقصى للسعة (100%)', data: labels.map(() => 100), borderColor: c.critical,
        borderWidth: 2, borderDash: [6, 5], pointRadius: 0, fill: false },
    ]},
    options: baseLineOptions(c, '%', 'اليوم'),
  });
}

function initLcowChart(){
  const c = chartDefaults();
  const ctx = document.getElementById('lcowChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const labels = YEAR_DATA.map(d => d.day);
  const values = YEAR_DATA.map(d => d.LCOW);
  lcowChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'LCOW ($/م³)', data: values, borderColor: c.lcow, backgroundColor: hexToRgba(c.lcow, 0.14),
        borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: c.lcow,
        pointHoverBorderColor: c.surface, pointHoverBorderWidth: 2, fill: true, tension: 0.25 },
    ]},
    options: baseLineOptions(c, '$/م³', 'اليوم'),
  });
}

function baseLineOptions(c, unit, xLabel){
  return {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, rtl: true, labels: { color: c.ink, usePointStyle: true, boxWidth: 8, boxHeight: 8, font: { family: 'Tajawal' } } },
      tooltip: {
        rtl: true, position: 'cursor', backgroundColor: c.surface, titleColor: cssVar('--ink'), bodyColor: cssVar('--ink'),
        borderColor: c.grid, borderWidth: 1, padding: 10, caretSize: 0,
        titleFont: { family: 'Tajawal', weight: '700' }, bodyFont: { family: 'Tajawal' },
        callbacks: {
          title: (items) => `اليوم ${items[0].label}`,
          label: (item) => `${item.dataset.label}: ${item.formattedValue} ${unit}`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: xLabel, color: c.muted, font: { family: 'Tajawal' } }, grid: { display: false }, ticks: { color: c.muted, maxTicksLimit: 12, font: { family: 'Tajawal' } } },
      y: { grid: { color: c.grid }, ticks: { color: c.muted, font: { family: 'Tajawal' } }, title: { display: true, text: unit, color: c.muted, font: { family: 'Tajawal' } } },
    },
  };
}

function hexToRgba(hex, alpha){
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ================================================================ Slider === */
function initDaySlider(){
  const slider = document.getElementById('daySlider');
  if (!slider) return;
  const dayLabel = document.getElementById('dayLabel');
  const ddProd = document.getElementById('ddProd'), ddUtil = document.getElementById('ddUtil'),
        ddLcow = document.getElementById('ddLcow'), ddStatus = document.getElementById('ddStatus');

  const update = (dayNum) => {
    const d = YEAR_DATA[dayNum - 1];
    dayLabel.textContent = `اليوم ${d.day}`;
    ddProd.textContent = Math.round(d.production_m3).toLocaleString('en-US') + ' م³';
    ddUtil.textContent = (d.utilization * 100).toFixed(1) + '%';
    ddLcow.textContent = '$' + d.LCOW.toFixed(3);
    ddStatus.textContent = d.suitable ? 'مناسب ✓' : 'يتجاوز السعة ✗';
    ddStatus.className = 'dd-value ' + (d.suitable ? 'status-good' : 'status-warn');
    highlightChartDay(dayNum - 1);
  };
  slider.addEventListener('input', () => update(parseInt(slider.value, 10)));
  update(parseInt(slider.value, 10));
}

function highlightChartDay(index){
  [utilChartInstance, lcowChartInstance].forEach(chart => {
    if (!chart) return;
    chart.setActiveElements([{ datasetIndex: 0, index }]);
    chart.tooltip.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
    chart.update();
  });
}

/* ================================================================ Heatmap === */
function initHeatmap(){
  const host = document.getElementById('heatmap');
  if (!host) return;
  const tooltip = document.getElementById('heatmapTooltip');

  const waterFactors = [...new Set(DATASET.map(d => d.water_factor))].sort((a, b) => a - b);
  const elecFactors = [...new Set(DATASET.map(d => d.elec_factor))].sort((a, b) => a - b);
  const lookup = {};
  DATASET.forEach(d => { lookup[`${d.water_factor}|${d.elec_factor}`] = d; });

  const lcowValues = DATASET.map(d => d.LCOW_usd_m3);
  const min = Math.min(...lcowValues), max = Math.max(...lcowValues), mid = (min + max) / 2;

  const legendMin = document.getElementById('legendMin'), legendMid = document.getElementById('legendMid'), legendMax = document.getElementById('legendMax');
  if (legendMin) legendMin.textContent = '$' + min.toFixed(2);
  if (legendMid) legendMid.textContent = '$' + mid.toFixed(2);
  if (legendMax) legendMax.textContent = '$' + max.toFixed(2);

  const colorFor = (v) => lerpColor3('#33c46a', '#f0a736', '#ef5757', (v - min) / (max - min));

  let html = `<div class="hm-corner">عامل الماء ↓<br>عامل الكهرباء →</div>`;
  elecFactors.forEach(ef => { html += `<div class="hm-axis">${ef}</div>`; });
  [...waterFactors].reverse().forEach(wf => {
    html += `<div class="hm-axis">${wf}</div>`;
    elecFactors.forEach(ef => {
      const rec = lookup[`${wf}|${ef}`];
      html += `<div class="hm-cell" style="background:${colorFor(rec.LCOW_usd_m3)}" data-wf="${wf}" data-ef="${ef}" data-lcow="${rec.LCOW_usd_m3}" data-util="${rec.utilization}" data-prod="${rec.production_m3_day}"></div>`;
    });
  });
  host.innerHTML = html;

  host.querySelectorAll('.hm-cell').forEach(cell => {
    cell.addEventListener('mousemove', (e) => {
      const { wf, ef, lcow, util, prod } = cell.dataset;
      tooltip.innerHTML = `عامل الماء: <b>${wf}</b> · عامل الكهرباء: <b>${ef}</b><br>
        LCOW: <b>$${parseFloat(lcow).toFixed(3)}</b> · الاستغلال: <b>${(parseFloat(util) * 100).toFixed(1)}%</b><br>
        الإنتاج: <b>${Math.round(parseFloat(prod)).toLocaleString('en-US')} م³/يوم</b>`;
      tooltip.classList.add('visible');
      positionTooltipNearCursor(tooltip, e.clientX, e.clientY);
    });
    cell.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
  });
}

function positionTooltipNearCursor(tooltip, clientX, clientY){
  const margin = 12;
  const rect = tooltip.getBoundingClientRect();
  let left = clientX + 16, top = clientY + 16;
  if (left + rect.width + margin > window.innerWidth) left = clientX - rect.width - 16;
  if (top + rect.height + margin > window.innerHeight) top = clientY - rect.height - 16;
  tooltip.style.left = Math.max(margin, left) + 'px';
  tooltip.style.top = Math.max(margin, top) + 'px';
}

function lerpColor3(hexA, hexB, hexC, t){
  const toRgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = toRgb(hexA), b = toRgb(hexB), cc = toRgb(hexC);
  let from, to, localT;
  if (t <= 0.5){ from = a; to = b; localT = t / 0.5; } else { from = b; to = cc; localT = (t - 0.5) / 0.5; }
  const r = Math.round(from[0] + (to[0] - from[0]) * localT);
  const g = Math.round(from[1] + (to[1] - from[1]) * localT);
  const bl = Math.round(from[2] + (to[2] - from[2]) * localT);
  return `rgb(${r},${g},${bl})`;
}

/* ================================================================ CO2 bars === */
function initCo2Bars(){
  const gasVal = 8.54, smrVal = 0.28, maxVal = gasVal;
  const bars = document.querySelectorAll('.co2-bar');
  if (!bars.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        bars.forEach(bar => { bar.style.width = (parseFloat(bar.dataset.value) / maxVal * 100) + '%'; });
        io.disconnect();
      }
    });
  }, { threshold: 0.4 });
  io.observe(bars[0].closest('.co2-bar-group'));
}
