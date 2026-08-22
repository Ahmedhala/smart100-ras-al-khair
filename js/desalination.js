// ==========================================================================
// Desalination Technologies page — MSF (linear) + RO (branching) diagrams
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initReveal('.reveal');
  buildMsfDiagram();
  buildRoDiagram();

  ProcessViewer.wire({
    data: MSF_STAGES,
    svg: document.getElementById('msfSvg'),
    listId: 'msfList',
    gridId: 'msfGrid',
    panelIds: { empty: 'msfPanelEmpty', content: 'msfPanelContent', title: 'msfPanelTitle', en: 'msfPanelEn', desc: 'msfPanelDesc', meta: 'msfPanelMeta' },
  });

  ProcessViewer.wire({
    data: RO_STAGES,
    svg: document.getElementById('roSvg'),
    listId: 'roList',
    gridId: 'roGrid',
    panelIds: { empty: 'roPanelEmpty', content: 'roPanelContent', title: 'roPanelTitle', en: 'roPanelEn', desc: 'roPanelDesc', meta: 'roPanelMeta' },
  });
});

function buildMsfDiagram(){
  const svg = document.getElementById('msfSvg');
  if (!svg) return;
  const byId = Object.fromEntries(MSF_STAGES.map(s => [s.id, s]));
  const order = ['brine-heater', 'pressure-stages', 'flash-evap', 'condensation', 'distillate'];
  const n = order.length;
  const startX = 950, endX = 110, y = 130, r = 42;
  const step = (startX - endX) / (n - 1);

  const positions = {};
  order.forEach((id, i) => { positions[id] = { x: startX - i * step, y, r }; });

  for (let i = 0; i < n - 1; i++){
    const a = positions[order[i]], b = positions[order[i + 1]];
    ProcessViewer.flow(svg, `M${a.x - a.r},${a.y} L${b.x + b.r},${b.y}`, byId[order[i + 1]].color);
  }
  order.forEach(id => {
    const s = byId[id], p = positions[id];
    ProcessViewer.node(svg, { id, x: p.x, y: p.y, r: p.r, color: s.color, icon: s.icon, label: s.nameAr });
  });

  svg.setAttribute('viewBox', '0 40 1060 180');
  svg.setAttribute('style', 'font-family:Tajawal,sans-serif; min-width:760px;');
}

function buildRoDiagram(){
  const svg = document.getElementById('roSvg');
  if (!svg) return;
  const byId = Object.fromEntries(RO_STAGES.map(s => [s.id, s]));

  const pos = {
    seawater:   { x: 800, y: 160, r: 40 },
    'hp-pump':  { x: 590, y: 160, r: 42 },
    membrane:   { x: 370, y: 160, r: 46 },
    permeate:   { x: 140, y: 90,  r: 36 },
    concentrate:{ x: 140, y: 240, r: 36 },
  };

  ProcessViewer.flow(svg, `M${pos.seawater.x - pos.seawater.r},${pos.seawater.y} L${pos['hp-pump'].x + pos['hp-pump'].r},${pos['hp-pump'].y}`, byId.seawater.color);
  ProcessViewer.flow(svg, `M${pos['hp-pump'].x - pos['hp-pump'].r},${pos['hp-pump'].y} L${pos.membrane.x + pos.membrane.r},${pos.membrane.y}`, byId['hp-pump'].color);
  ProcessViewer.flow(svg, `M${pos.membrane.x - pos.membrane.r + 6},${pos.membrane.y - 16} C${pos.membrane.x - 90},${pos.membrane.y - 70} ${pos.permeate.x + 90},${pos.permeate.y + 30} ${pos.permeate.x + pos.permeate.r},${pos.permeate.y}`, byId.permeate.color);
  ProcessViewer.flow(svg, `M${pos.membrane.x - pos.membrane.r + 6},${pos.membrane.y + 16} C${pos.membrane.x - 90},${pos.membrane.y + 70} ${pos.concentrate.x + 90},${pos.concentrate.y - 30} ${pos.concentrate.x + pos.concentrate.r},${pos.concentrate.y}`, byId.concentrate.color);

  // membrane illustration: a short dashed vertical line through the membrane node,
  // hinting at the semi-permeable barrier separating the two outgoing streams
  const memLine = ProcessViewer.svgEl('line', {
    x1: pos.membrane.x, y1: pos.membrane.y - pos.membrane.r + 8, x2: pos.membrane.x, y2: pos.membrane.y + pos.membrane.r - 8,
    stroke: byId.membrane.color, 'stroke-width': 1.5, 'stroke-dasharray': '3 4', opacity: 0.55,
  });
  svg.appendChild(memLine);

  Object.entries(pos).forEach(([id, p]) => {
    const s = byId[id];
    ProcessViewer.node(svg, { id, x: p.x, y: p.y, r: p.r, color: s.color, icon: s.icon, label: s.nameAr });
  });

  svg.setAttribute('viewBox', '0 30 870 300');
  svg.setAttribute('style', 'font-family:Tajawal,sans-serif; min-width:700px;');
}
