// ==========================================================================
// Ras Al-Khair Plant page — 8-stage interactive water-path diagram
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initReveal('.reveal');
  initCounters('.spec-value[data-count]');
  buildPlantDiagram();
  ProcessViewer.wire({
    data: PLANT_STAGES,
    svg: document.getElementById('plantSvg'),
    listId: 'plantList',
    gridId: 'plantGrid',
    panelIds: { empty: 'plantPanelEmpty', content: 'plantPanelContent', title: 'plantPanelTitle', en: 'plantPanelEn', desc: 'plantPanelDesc', meta: 'plantPanelMeta' },
  });
});

function buildPlantDiagram(){
  const svg = document.getElementById('plantSvg');
  if (!svg) return;
  const water = ProcessViewer.cssVar('--water');
  const thermal = ProcessViewer.cssVar('--thermal');
  const electric = ProcessViewer.cssVar('--electric');
  const brineColor = ProcessViewer.cssVar('--critical');
  const nuclearGlow = ProcessViewer.cssVar('--nuclear-glow');
  const byId = Object.fromEntries(PLANT_STAGES.map(s => [s.id, s]));

  const pos = {
    intake:     { x: 1180, y: 220, r: 42 },
    pretreat:   { x: 970,  y: 220, r: 40 },
    msf:        { x: 720,  y: 110, r: 46 },
    ro:         { x: 720,  y: 350, r: 46 },
    energy:     { x: 970,  y: 460, r: 40 },
    posttreat:  { x: 430,  y: 220, r: 40 },
    product:    { x: 190,  y: 130, r: 38 },
    brine:      { x: 430,  y: 430, r: 38 },
  };

  // flows (drawn first so nodes sit on top)
  ProcessViewer.flow(svg, `M${pos.intake.x - pos.intake.r},${pos.intake.y} L${pos.pretreat.x + pos.pretreat.r},${pos.pretreat.y}`, water);
  ProcessViewer.flow(svg, `M${pos.pretreat.x - 20},${pos.pretreat.y - 20} C${pos.pretreat.x - 120},${pos.pretreat.y - 90} ${pos.msf.x + 140},${pos.msf.y + 20} ${pos.msf.x + pos.msf.r + 10},${pos.msf.y}`, water);
  ProcessViewer.flow(svg, `M${pos.pretreat.x - 20},${pos.pretreat.y + 20} C${pos.pretreat.x - 120},${pos.pretreat.y + 90} ${pos.ro.x + 140},${pos.ro.y - 20} ${pos.ro.x + pos.ro.r + 10},${pos.ro.y}`, water);
  ProcessViewer.flow(svg, `M${pos.energy.x},${pos.energy.y - pos.energy.r} C${pos.energy.x - 60},${pos.energy.y - 160} ${pos.msf.x + 40},${pos.msf.y + 160} ${pos.msf.x},${pos.msf.y + pos.msf.r}`, thermal);
  ProcessViewer.flow(svg, `M${pos.energy.x - pos.energy.r},${pos.energy.y - 10} L${pos.ro.x + pos.ro.r},${pos.ro.y + 40}`, electric);
  ProcessViewer.flow(svg, `M${pos.msf.x - pos.msf.r},${pos.msf.y + 10} C${pos.msf.x - 150},${pos.msf.y + 60} ${pos.posttreat.x + 140},${pos.posttreat.y - 60} ${pos.posttreat.x + pos.posttreat.r},${pos.posttreat.y - 10}`, water);
  ProcessViewer.flow(svg, `M${pos.ro.x - pos.ro.r},${pos.ro.y - 10} C${pos.ro.x - 150},${pos.ro.y - 60} ${pos.posttreat.x + 140},${pos.posttreat.y + 60} ${pos.posttreat.x + pos.posttreat.r},${pos.posttreat.y + 10}`, water);
  ProcessViewer.flow(svg, `M${pos.posttreat.x - pos.posttreat.r},${pos.posttreat.y - 15} C${pos.posttreat.x - 120},${pos.posttreat.y - 70} ${pos.product.x + 100},${pos.product.y + 40} ${pos.product.x + pos.product.r - 4},${pos.product.y + 6}`, water);
  ProcessViewer.flow(svg, `M${pos.msf.x - 10},${pos.msf.y + pos.msf.r} C${pos.msf.x - 40},${pos.msf.y + 200} ${pos.brine.x + 30},${pos.brine.y - 140} ${pos.brine.x},${pos.brine.y - pos.brine.r}`, brineColor);
  ProcessViewer.flow(svg, `M${pos.ro.x - 10},${pos.ro.y + pos.ro.r} C${pos.ro.x - 40},${pos.ro.y + 90} ${pos.brine.x + 20},${pos.brine.y - 30} ${pos.brine.x + pos.brine.r - 6},${pos.brine.y - pos.brine.r + 12}`, brineColor);

  const colors = { intake: water, pretreat: water, msf: thermal, ro: electric, energy: nuclearGlow, posttreat: water, product: '#33c46a', brine: brineColor };
  Object.entries(pos).forEach(([id, p]) => {
    const s = byId[id];
    ProcessViewer.node(svg, { id, x: p.x, y: p.y, r: p.r, color: colors[id], icon: s.icon, label: s.nameAr });
  });

  svg.setAttribute('viewBox', '0 40 1300 480');
  svg.setAttribute('style', 'font-family:Tajawal,sans-serif; min-width:900px;');
}
