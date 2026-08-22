// ==========================================================================
// Home page — hero flow visualization + reveal/counters
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  buildHeroFlow();
  initReveal('.reveal');
  initCounters('.fact-value[data-count]');
});

function buildHeroFlow(){
  const svg = document.getElementById('heroFlowSvg');
  if (!svg) return;
  const css = getComputedStyle(document.documentElement);
  const nuclear = css.getPropertyValue('--nuclear').trim();
  const nuclearGlow = css.getPropertyValue('--nuclear-glow').trim();
  const thermal = css.getPropertyValue('--thermal').trim();
  const electric = css.getPropertyValue('--electric').trim();
  const water = css.getPropertyValue('--water').trim();
  const ink = css.getPropertyValue('--ink').trim();
  const inkMuted = css.getPropertyValue('--ink-muted').trim();
  const panel2 = css.getPropertyValue('--panel-2').trim();

  const ns = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };

  // ---- defs: glow filter ----
  const defs = el('defs', {});
  const filter = el('filter', { id: 'glow', x: '-60%', y: '-60%', width: '220%', height: '220%' });
  filter.appendChild(el('feGaussianBlur', { stdDeviation: '5', result: 'blur' }));
  const merge = el('feMerge', {});
  merge.appendChild(el('feMergeNode', { in: 'blur' }));
  merge.appendChild(el('feMergeNode', { in: 'SourceGraphic' }));
  filter.appendChild(merge);
  defs.appendChild(filter);
  svg.appendChild(defs);

  // ---- connecting paths (drawn first, under nodes) ----
  const paths = [
    { d: 'M210,110 C150,150 120,170 110,210', color: thermal, id: 'p1' },   // reactor -> heat
    { d: 'M210,110 C270,150 300,170 310,210', color: electric, id: 'p2' },  // reactor -> electricity
    { d: 'M110,250 C130,290 170,300 195,320', color: thermal, id: 'p3' },   // heat -> desal
    { d: 'M310,250 C290,290 250,300 225,320', color: electric, id: 'p4' },  // electricity -> desal
    { d: 'M210,360 C210,390 210,410 210,440', color: water, id: 'p5' },     // desal -> water
  ];
  paths.forEach(p => {
    svg.appendChild(el('path', {
      d: p.d, fill: 'none', stroke: p.color, 'stroke-width': '2.5',
      'stroke-linecap': 'round', opacity: '0.85'
    }));
    // animated flow dash
    const flow = el('path', {
      d: p.d, fill: 'none', stroke: p.color, 'stroke-width': '2.5',
      'stroke-linecap': 'round', 'stroke-dasharray': '6 14', opacity: '0.95'
    });
    const animEl = el('animate', {
      attributeName: 'stroke-dashoffset', from: '80', to: '0',
      dur: '1.6s', repeatCount: 'indefinite'
    });
    flow.appendChild(animEl);
    svg.appendChild(flow);
  });

  // ---- node factory ----
  const node = (cx, cy, r, color, icon, labelAr, labelEn) => {
    const g = el('g', {});
    const circle = el('circle', { cx, cy, r, fill: panel2, stroke: color, 'stroke-width': '2', filter: 'url(#glow)' });
    const glowCircle = el('circle', { cx, cy, r: r - 6, fill: color, opacity: '0.14' });
    const iconText = el('text', {
      x: cx, y: cy + 8, 'text-anchor': 'middle', 'font-size': '26', fill: color
    });
    iconText.textContent = icon;
    g.appendChild(circle);
    g.appendChild(glowCircle);
    g.appendChild(iconText);
    svg.appendChild(g);

    const labelY = cy + r + 22;
    const labelArEl = el('text', {
      x: cx, y: labelY, 'text-anchor': 'middle', 'font-size': '13', 'font-weight': '700', fill: ink,
      'font-family': 'Tajawal, sans-serif'
    });
    labelArEl.textContent = labelAr;
    svg.appendChild(labelArEl);

    const labelEnEl = el('text', {
      x: cx, y: labelY + 16, 'text-anchor': 'middle', 'font-size': '9', fill: inkMuted,
      'font-family': "'IBM Plex Mono', monospace"
    });
    labelEnEl.textContent = labelEn;
    svg.appendChild(labelEnEl);
  };

  node(210, 78, 44, nuclearGlow, '⚛', 'مفاعل SMART100', 'Nuclear Energy');
  node(90, 230, 34, thermal, '🔥', 'حرارة', 'Heat');
  node(330, 230, 34, electric, '⚡', 'كهرباء', 'Electricity');
  node(210, 340, 38, water, '🏭', 'التحلية', 'Desalination');
  node(210, 470, 30, water, '💧', 'مياه عذبة', 'Fresh Water');
}
