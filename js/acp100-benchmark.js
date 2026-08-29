// ==========================================================================
// acp100-benchmark.html — accordion timeline + ACP100 water-production
// calculator. Calculator formulas mirror model.py's calculate_scenario()
// exactly (same specific-energy constants), solved in the inverse direction:
// given available reactor capacity, find the achievable water production
// instead of given a target production, find the required capacity.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initReveal('.reveal');
  initTimeline();
  initCalculator();
});

/* ---------------------------------------------------------------- Timeline accordion --- */
function initTimeline(){
  document.querySelectorAll('.timeline-step').forEach(step => {
    step.addEventListener('click', () => {
      const wasOpen = step.classList.contains('is-open');
      document.querySelectorAll('.timeline-step').forEach(s => s.classList.remove('is-open'));
      if (!wasOpen) step.classList.add('is-open');
    });
  });
}

/* ---------------------------------------------------------------- Calculator --- */
const ACP100_MWTH = 385;
const ACP100_MWE = 125;
const ACP100_EFF = ACP100_MWE / ACP100_MWTH; // ≈ 0.3247 — thermal-to-electric conversion, ACP100's own rated efficiency

function initCalculator(){
  const els = {
    units: document.getElementById('calcUnits'),
    tech: document.getElementById('calcTech'),
    share: document.getElementById('calcShare'),
    shareRow: document.getElementById('calcShareRow'),
    shareValue: document.getElementById('calcShareValue'),
    cf: document.getElementById('calcCf'),
    cfValue: document.getElementById('calcCfValue'),
    specificTh: document.getElementById('calcSpecificTh'),
    specificThRow: document.getElementById('calcSpecificThRow'),
    specificEl: document.getElementById('calcSpecificEl'),
    specificElRow: document.getElementById('calcSpecificElRow'),
  };
  if (!els.units) return; // calculator not on this page

  const outs = {
    daily: document.getElementById('outDaily'),
    annual: document.getElementById('outAnnual'),
    thermalUsed: document.getElementById('outThermalUsed'),
    electricUsed: document.getElementById('outElectricUsed'),
    perUnit: document.getElementById('outPerUnit'),
    perMwe: document.getElementById('outPerMwe'),
    perMwth: document.getElementById('outPerMwth'),
  };

  function fmt(n, decimals){
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 });
  }

  function updateVisibility(){
    const tech = els.tech.value;
    els.shareRow.style.display = tech === 'hybrid' ? '' : 'none';
    els.specificThRow.style.display = (tech === 'msf' || tech === 'hybrid') ? '' : 'none';
    els.specificElRow.style.display = (tech === 'ro' || tech === 'hybrid') ? '' : 'none';
  }

  function calculate(){
    const units = Math.max(1, parseFloat(els.units.value) || 1);
    const tech = els.tech.value;
    const share = tech === 'msf' ? 1 : tech === 'ro' ? 0 : (parseFloat(els.share.value) || 0) / 100;
    const cf = (parseFloat(els.cf.value) || 0) / 100;
    const specificTh = parseFloat(els.specificTh.value) || 62.7;
    const specificEl = parseFloat(els.specificEl.value) || 4.0;

    const totalThermalCapacity = units * ACP100_MWTH * cf; // MWth available across all units
    const k1 = share * specificTh / 24000;
    const k2 = (1 - share) * specificEl / 24000;
    const denom = k1 + k2 / ACP100_EFF;
    const dailyProduction = denom > 0 ? totalThermalCapacity / denom : 0; // m3/day

    const msfProd = dailyProduction * share;
    const roProd = dailyProduction * (1 - share);
    const thermalUsed = msfProd * specificTh / 24000; // MWth
    const electricUsed = roProd * specificEl / 24000; // MWe

    els.shareValue.textContent = (share * 100).toFixed(1) + '%';
    els.cfValue.textContent = (cf * 100).toFixed(0) + '%';

    outs.daily.textContent = fmt(dailyProduction);
    outs.annual.textContent = fmt(dailyProduction * 365);
    outs.thermalUsed.textContent = fmt(thermalUsed, 1);
    outs.electricUsed.textContent = fmt(electricUsed, 1);
    outs.perUnit.textContent = fmt(dailyProduction / units);
    outs.perMwe.textContent = fmt(dailyProduction / (units * ACP100_MWE));
    outs.perMwth.textContent = fmt(dailyProduction / (units * ACP100_MWTH));
  }

  ['input', 'change'].forEach(evt => {
    els.units.addEventListener(evt, calculate);
    els.tech.addEventListener(evt, () => { updateVisibility(); calculate(); });
    els.share.addEventListener(evt, calculate);
    els.cf.addEventListener(evt, calculate);
    els.specificTh.addEventListener(evt, calculate);
    els.specificEl.addEventListener(evt, calculate);
  });

  updateVisibility();
  calculate();
}
