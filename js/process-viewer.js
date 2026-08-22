// ==========================================================================
// Shared "process viewer" toolkit — SVG flow drawing primitives + the
// list/panel/grid wiring pattern used across Plant, MSF and RO diagrams.
// Mirrors the interaction model built for reactor.html (list + detail card).
// ==========================================================================
const ProcessViewer = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };

  /** Draws one clickable node (circle + icon + label) into an SVG, tagged with data-proc-id. */
  function node(svg, { id, x, y, r, color, icon, label, sublabel }){
    const ink = cssVar('--ink'), inkMuted = cssVar('--ink-muted'), panel2 = cssVar('--panel-2');
    const g = svgEl('g', { class: 'pv-node', 'data-proc-id': id, style: 'cursor:pointer;' });
    g.appendChild(svgEl('circle', { cx: x, cy: y, r, fill: panel2, stroke: color, 'stroke-width': 2.2 }));
    const iconText = svgEl('text', { x, y: y + 7, 'text-anchor': 'middle', 'font-size': Math.max(16, r * 0.6) });
    iconText.textContent = icon;
    g.appendChild(iconText);
    if (label){
      const l = svgEl('text', { x, y: y + r + 20, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: ink, 'font-family': 'Tajawal, sans-serif' });
      l.textContent = label;
      g.appendChild(l);
    }
    if (sublabel){
      const sl = svgEl('text', { x, y: y + r + 36, 'text-anchor': 'middle', 'font-size': 9.5, fill: inkMuted, 'font-family': "'IBM Plex Mono', monospace" });
      sl.textContent = sublabel;
      g.appendChild(sl);
    }
    svg.appendChild(g);
    return g;
  }

  /** Draws an animated flowing connector between two points. */
  function flow(svg, d, color){
    svg.appendChild(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.5 }));
    const p = svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-dasharray': '6 12' });
    p.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', from: 72, to: 0, dur: '1.4s', repeatCount: 'indefinite' }));
    svg.appendChild(p);
  }

  function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  /**
   * Wires up: SVG node clicks + hover, a side "component list", a detail
   * panel (title/en/desc + inputs/outputs/relation rows), and an optional
   * full reference grid — all driven by one `data` array.
   */
  function wire({ data, svg, listId, gridId, panelIds, defaultId }){
    const byId = Object.fromEntries(data.map(d => [d.id, d]));

    function select(id){
      const d = byId[id];
      if (!d) return;
      document.getElementById(panelIds.empty).style.display = 'none';
      const content = document.getElementById(panelIds.content);
      content.style.display = 'block';
      document.getElementById(panelIds.title).textContent = d.nameAr;
      document.getElementById(panelIds.en).textContent = d.nameEn;
      document.getElementById(panelIds.desc).textContent = `${d.what} ${d.does}`;
      const meta = document.getElementById(panelIds.meta);
      if (meta){
        meta.innerHTML = `
          <div class="pv-meta-row"><span class="pv-k">المدخلات</span><span class="pv-v">${d.inputs}</span></div>
          <div class="pv-meta-row"><span class="pv-k">المخرجات</span><span class="pv-v">${d.outputs}</span></div>
          <div class="pv-meta-row"><span class="pv-k">العلاقة ببقية النظام</span><span class="pv-v">${d.relation}</span></div>`;
      }
      document.querySelectorAll(`#${listId} .component-btn`).forEach(btn => btn.classList.toggle('is-selected', btn.dataset.id === id));
      if (svg){
        svg.querySelectorAll('.pv-node').forEach(g => {
          const isSel = g.dataset.procId === id;
          g.style.transformOrigin = 'center';
          g.style.transformBox = 'fill-box';
          g.style.transform = isSel ? 'scale(1.14)' : 'scale(1)';
          g.style.transition = 'transform .15s';
          const circle = g.querySelector('circle');
          if (circle) circle.setAttribute('stroke-width', isSel ? 3.4 : 2.2);
        });
      }
    }

    if (svg){
      svg.querySelectorAll('.pv-node').forEach(g => {
        g.addEventListener('click', () => select(g.dataset.procId));
      });
    }

    const listHost = document.getElementById(listId);
    if (listHost){
      data.forEach(d => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'component-btn';
        btn.dataset.id = d.id;
        btn.innerHTML = `<span class="component-dot" style="background:${d.color}"></span><span>${d.nameAr}</span>`;
        btn.addEventListener('click', () => select(d.id));
        listHost.appendChild(btn);
      });
    }

    const gridHost = gridId ? document.getElementById(gridId) : null;
    if (gridHost){
      data.forEach((d, i) => {
        const card = document.createElement('div');
        card.className = 'component-card card reveal';
        card.innerHTML = `
          <span class="component-card-num">${String(i + 1).padStart(2, '0')}</span>
          <div>
            <h4 style="color:${d.color}">${d.nameAr}</h4>
            <span class="cc-en">${d.nameEn}</span>
            <p>${d.what} ${d.does}</p>
          </div>`;
        card.addEventListener('click', () => {
          select(d.id);
          svg && svg.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        gridHost.appendChild(card);
      });
      if (typeof initReveal === 'function') initReveal(`#${gridId} .component-card`);
    }

    if (defaultId) select(defaultId);
    return { select };
  }

  return { svgEl, node, flow, wire, cssVar };
})();
