// ==========================================================================
// "Run Scenario" builder — dashboard.html
// Reuses calcLCOWFull()/scenarioLoad() from sensitivity-engine.js — the same
// verified formulas used by the Tornado chart, applied to whichever
// reactor + desalination technology the user selects. No new equations.
// ==========================================================================

const REACTORS = {
  smart100: { label: 'SMART100', nameEn: 'SMART100', smrElec: 100.0, smrEff: 0.303, mwth: 330, official: true },
  acp100:   { label: 'ACP100', nameEn: 'ACP100 (Linglong One)', smrElec: 125.0, smrEff: 125 / 385, mwth: 385, official: true },
  'our-system': { label: 'نظامنا المقترح', pending: true },
};

const TECHS = {
  ro:     { label: 'RO — تناضح عكسي', msfShare: 0.0 },
  msf:    { label: 'MSF — تقطير ومضي', msfShare: 1.0 },
  hybrid: { label: 'Hybrid (70.2% MSF / 29.8% RO)', msfShare: 0.702 },
  med:    { label: 'MED — تقطير متعدد التأثير', pending: true },
};

function initRunScenario(){
  const reactorSel = document.getElementById('rsReactor');
  const techSel = document.getElementById('rsTech');
  const runBtn = document.getElementById('rsRun');
  if (!reactorSel || !techSel || !runBtn) return;

  runBtn.addEventListener('click', () => runScenario(reactorSel.value, techSel.value));

  document.querySelectorAll('.dash-run-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.classList.toggle('is-open');
    });
  });

  runScenario('smart100', 'hybrid'); // sensible default view on load
}

function runScenario(reactorKey, techKey){
  const resultsBox = document.getElementById('rsResults');
  const pendingBox = document.getElementById('rsPending');
  const reactor = REACTORS[reactorKey];
  const tech = TECHS[techKey];

  if (reactor.pending || tech.pending){
    resultsBox.style.display = 'none';
    pendingBox.style.display = 'block';
    pendingBox.textContent = reactor.pending
      ? '⚙️ "نظامنا المقترح" قيد التطوير ضمن هذا المشروع البحثي — لا توجد مواصفات محدَّدة بعد لتشغيل سيناريو عليه.'
      : '⚙️ تقنية MED (التقطير متعدد التأثير) غير مُنمذَجة ضمن معادلات هذا المشروع حاليًا — لا يوجد حساب حقيقي لعرضه بدل تلفيق رقم.';
    return;
  }

  pendingBox.style.display = 'none';
  resultsBox.style.display = 'block';

  const overrides = { smrElec: reactor.smrElec, smrEff: reactor.smrEff, msfShare: tech.msfShare, roShare: 1 - tech.msfShare };
  const { lcow, unitsNeeded, normal, capPerUnit } = calcLCOWFull(overrides);
  const co2PerM3 = co2AvoidedPerM3(Object.assign({}, BASE, overrides));
  const co2AvoidedTons = co2PerM3 * normal.production * 365;
  const nuclearEmissionsTons = (normal.totalEq * 24 * 1000) * 0.012 / 1000 * 365; // 12 gCO2/kWh lifecycle
  const specificEnergy = tech.msfShare * 62.7 + (1 - tech.msfShare) * (BASE.roKwh / reactor.smrEff);
  const utilization = (normal.totalEq / (unitsNeeded * capPerUnit)) * 100;
  const efficiency = reactor.smrEff * 100;

  document.getElementById('rsOutWater').textContent = normal.production.toLocaleString('en-US');
  document.getElementById('rsOutEnergy').textContent = specificEnergy.toFixed(1);
  document.getElementById('rsOutCo2Emit').textContent = (nuclearEmissionsTons / 1000).toFixed(1);
  document.getElementById('rsOutCo2Avoid').textContent = (co2AvoidedTons / 1_000_000).toFixed(2);
  document.getElementById('rsOutCost').textContent = lcow.toFixed(3);
  document.getElementById('rsOutEfficiency').textContent = efficiency.toFixed(1);
  document.getElementById('rsOutUtilization').textContent = utilization.toFixed(1);
  document.getElementById('rsOutUnits').textContent = unitsNeeded;

  const isEstablishedCase = reactorKey === 'smart100' && techKey === 'hybrid';
  document.getElementById('rsUtilNote').textContent = isEstablishedCase
    ? 'مطابق للرقم المعتمد بالنموذج (80.5% من محاكاة سنة كاملة).'
    : 'مشتق بنفس منهجية النموذج لهذا الاختيار تحديدًا — وليس رقم المحاكاة السنوية الكامل (المتاح فقط لسيناريو SMART100 + Hybrid المعتمد).';

  // Scenario ranking against the established reference set
  const reference = [
    { label: 'طلب مرتفع (مياه) — SMART100', lcow: 5.40 },
    { label: 'ذروة الطلب — SMART100', lcow: 5.46 },
    { label: 'عادي — SMART100', lcow: 5.67 },
    { label: 'طلب مرتفع (كهرباء) — SMART100', lcow: 5.82 },
  ];
  const current = { label: `${reactor.label} + ${tech.label} (هذا التشغيل)`, lcow, isCurrent: true };
  const ranked = [...reference, current].sort((a, b) => a.lcow - b.lcow);
  const rankHost = document.getElementById('rsRanking');
  rankHost.innerHTML = ranked.map((r, i) => `
    <div class="dash-run-rank-row${r.isCurrent ? ' is-current' : ''}">
      <span>${i + 1}. ${r.label}</span>
      <strong>$${r.lcow.toFixed(3)}</strong>
    </div>`).join('');

  // Assumptions / sources detail panel
  document.getElementById('rsAssumptions').innerHTML = `
    <table>
      <tr><td>القدرة</td><td>${reactor.smrElec} MWe / ${reactor.mwth} MWth لكل وحدة <span class="ev-badge ev-official">✓ Official</span></td></tr>
      <tr><td>كفاءة التحويل</td><td>${efficiency.toFixed(1)}% (محسوبة) <span class="ev-badge ev-calculated">🧮 Calculated</span></td></tr>
      <tr><td>معامل قدرة المحطة</td><td>${(BASE.smrCf * 100).toFixed(0)}% <span class="ev-badge ev-estimated">≈ Estimated</span></td></tr>
      <tr><td>استهلاك RO الكهربائي</td><td>${BASE.roKwh} kWh/م³ <span class="ev-badge ev-calculated">🧮 Calculated (model.py)</span></td></tr>
      <tr><td>GOR لـMSF</td><td>${BASE.gor} <span class="ev-badge ev-calculated">🧮 Calculated (model.py)</span></td></tr>
      <tr><td>تكلفة الطاقة النووية</td><td>$${BASE.smrLcoe}/MWh <span class="ev-badge ev-estimated">≈ Estimated</span></td></tr>
    </table>`;
  document.getElementById('rsSources').innerHTML = `
    <table>
      <tr><td>مواصفات المفاعل</td><td>${reactorKey === 'acp100' ? '<a href="acp100-benchmark.html" style="color:var(--nuclear-glow);">ACP100 Benchmark ↗</a>' : '<a href="reactor.html" style="color:var(--nuclear-glow);">مفاعل SMART100 ↗</a>'}</td></tr>
      <tr><td>معادلات LCOW/GOR</td><td><a href="https://github.com/Ahmedhala/smart100-ras-al-khair/tree/master/model" target="_blank" rel="noopener" style="color:var(--nuclear-glow);">model.py على GitHub ↗</a></td></tr>
      <tr><td>عوامل انبعاث الكربون</td><td><a href="integration.html#results" style="color:var(--nuclear-glow);">محرك حساب الكربون ↗</a></td></tr>
      <tr><td>كل المراجع</td><td><a href="references.html" style="color:var(--nuclear-glow);">صفحة المراجع الكاملة ↗</a></td></tr>
    </table>`;
}
