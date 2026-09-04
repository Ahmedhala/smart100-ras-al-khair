// ==========================================================================
// Interactive Carbon Calculation Engine — integration.html
// CO2 Avoided = Baseline Emissions (gas combustion) − Nuclear Scenario Emissions
// Carbon Reduction % = (CO2 Avoided / Baseline) × 100
//
// Methodology: a full 365-day seasonal simulation, replicating comparison.py
// exactly — production_total × the same seasonal wave used by simulation.py
// (seasonal = 1.1 + 0.2*sin((day-100)/365*2*pi)), split each day into MSF's
// direct thermal load (fired by a boiler, boilerEff) and RO+aux's electric
// load (fired by a CCGT, ccgtEff) — instead of a flat single-point estimate
// or a generic grid-carbon-intensity baseline. Ras Al-Khair is a dedicated
// dual-purpose desalination plant with its own steam boiler, not a generic
// grid-connected load, so this two-path combustion split is the physically
// accurate baseline for this specific plant (see "Methodological
// Corrections" on references.html). At the default slider values this
// reproduces the site's headline figures EXACTLY (verified by construction,
// same algorithm and constants as comparison.py): 4,660,395 t/yr baseline,
// 279,236 t/yr nuclear, 4,381,159 t/yr avoided, 94.0% reduction.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initCarbonCalculator();
});

// Fixed constants — same as model.py / simulation.py / comparison.py, not
// exposed as sliders (the six interactive inputs are waterProd, boilerEff,
// capacityFactor, ccgtEff, fossilFactor, nuclearIntensity; the MSF/RO split,
// the seasonal demand wave, and per-unit consumption rates are the plant's
// own physical/operational constants, not free parameters of the carbon
// methodology itself).
const MSF_SHARE = 0.702, RO_SHARE = 0.298;
const GOR = 10.0, STEAM_ENTHALPY = 0.627; // MSF thermal path
const RO_KWH = 4.0, MSF_AUX_KWH = 3.0;    // RO/aux electric path
const SMR_EFF = 0.303;                     // reactor thermal->electric efficiency
const GAS_LHV_KWH_PER_KG = 13.9;           // model.py / comparison.py constant, not user-adjustable here

function initCarbonCalculator(){
  const els = {
    waterProd: document.getElementById('ccWaterProd'),
    boilerEff: document.getElementById('ccSpecificEnergy'),      // repurposed: was "specific energy", now boiler efficiency
    capacityFactor: document.getElementById('ccCapacityFactor'),
    ccgtEff: document.getElementById('ccGridIntensity'),         // repurposed: was "grid intensity", now CCGT efficiency (%)
    fossilFactor: document.getElementById('ccFossilFactor'),
    nuclearIntensity: document.getElementById('ccNuclearIntensity'),
  };
  if (!els.waterProd) return; // calculator not on this page

  const defaults = {
    waterProd: 1036000,
    boilerEff: 0.90,
    capacityFactor: 92,
    ccgtEff: 55,   // stored as a percentage on the slider, converted to a fraction below
    fossilFactor: 56.1,
    nuclearIntensity: 12,
  };

  const badgeKeyMap = { waterProd: 'waterProd', boilerEff: 'specificEnergy', capacityFactor: 'capacityFactor', ccgtEff: 'gridIntensity', fossilFactor: 'fossilFactor', nuclearIntensity: 'nuclearIntensity' };
  const badges = {};
  Object.keys(els).forEach(key => {
    badges[key] = document.getElementById('ccBadge_' + badgeKeyMap[key]);
  });

  const out = {
    avoided: document.getElementById('ccOutAvoided'),
    reductionPct: document.getElementById('ccOutReductionPct'),
    baseline: document.getElementById('ccOutBaseline'),
    nuclear: document.getElementById('ccOutNuclear'),
    capacity: document.getElementById('ccOutCapacity'),
    gasAvoided: document.getElementById('ccOutGasAvoided'),
    barrels: document.getElementById('ccOutBarrels'),
    gasBar: document.getElementById('ccGasBar'),
    nuclearBar: document.getElementById('ccNuclearBar'),
  };

  function fmt(n, decimals){
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 });
  }

  function updateBadges(){
    Object.keys(els).forEach(key => {
      const el = els[key];
      const badge = badges[key];
      if (!el || !badge) return;
      const val = parseFloat(el.value);
      const isDefault = Math.abs(val - defaults[key]) < 1e-6;
      badge.className = 'ev-badge ' + (isDefault ? badge.dataset.defaultClass : 'ev-user-input');
      badge.textContent = isDefault ? badge.dataset.defaultLabel : '✏️ User Input';
    });
  }

  function calculate(){
    const productionTotal = parseFloat(els.waterProd.value) || 0;   // m3/day design capacity
    const boilerEff = parseFloat(els.boilerEff.value) || 0;         // fraction 0-1
    const capacityFactor = (parseFloat(els.capacityFactor.value) || 0) / 100;
    const ccgtEff = (parseFloat(els.ccgtEff.value) || 0) / 100;     // slider is a %, convert to fraction
    const fossilFactor = parseFloat(els.fossilFactor.value) || 0;   // kg CO2/GJ
    const nuclearIntensity = parseFloat(els.nuclearIntensity.value) || 0; // g CO2/kWh
    const steamPerM3 = 1000 / GOR;

    // Full 365-day seasonal simulation - same wave as simulation.py, so the
    // annual sum matches comparison.py exactly, not just a single-point
    // estimate scaled by 365 (the seasonal wave is not flat, so those two
    // are NOT equivalent - verified numerically before shipping this).
    let totalGasKg = 0, totalCo2Gas = 0, totalCo2Smr = 0, totalEqSum = 0;
    for (let day = 1; day <= 365; day++){
      const seasonal = 1.1 + 0.2 * Math.sin((day - 100) / 365 * 2 * Math.PI);
      const waterMult = Math.round(seasonal * 1000) / 1000;
      const elecMult = Math.round(waterMult * 0.98 * 1000) / 1000;

      const prod = productionTotal * waterMult;
      const msfProd = prod * MSF_SHARE;
      const roProd = prod * RO_SHARE;
      const qThMw = (msfProd * steamPerM3 * STEAM_ENTHALPY) / 24 / 1000;
      const pElMw = (roProd * RO_KWH + msfProd * MSF_AUX_KWH) * elecMult / 24 / 1000;
      const totalEqMw = qThMw + pElMw / SMR_EFF;
      totalEqSum += totalEqMw;

      const gasThermalKwhDay = boilerEff > 0 ? (qThMw * 1000 * 24) / boilerEff : 0;
      const gasElectricKwhDay = ccgtEff > 0 ? (pElMw * 1000 * 24) / ccgtEff : 0;
      const gasKgDay = (gasThermalKwhDay + gasElectricKwhDay) / GAS_LHV_KWH_PER_KG;
      totalGasKg += gasKgDay;
      const gjDay = gasKgDay * (GAS_LHV_KWH_PER_KG * 3.6 / 1000);
      totalCo2Gas += gjDay * fossilFactor / 1000; // tons

      totalCo2Smr += (totalEqMw * 24 * 1000) * (nuclearIntensity / 1000) / 1000; // tons
    }

    const baselineTons = totalCo2Gas;
    const nuclearTons = totalCo2Smr;
    const avoidedTons = baselineTons - nuclearTons;
    const reductionPct = baselineTons > 0 ? (avoidedTons / baselineTons) * 100 : 0;

    // Secondary: required installed capacity at this capacity factor,
    // using the year's average thermal-equivalent load
    const avgTotalEqMw = totalEqSum / 365;
    const annualEnergyMWh = avgTotalEqMw * 8760;
    const requiredCapacityMW = capacityFactor > 0 ? annualEnergyMWh / (8760 * capacityFactor) : 0;

    // Secondary: gas mass avoided / barrels-of-oil-equivalent (reproduces
    // comparison.py's total_gas_kg / barrels_equiv output directly)
    const gasMassTons = totalGasKg / 1000;
    const totalGasKwh = totalGasKg * GAS_LHV_KWH_PER_KG;
    const barrelsEquiv = totalGasKwh / 1700;

    out.avoided.textContent = fmt(avoidedTons / 1_000_000, 2);
    out.reductionPct.textContent = fmt(reductionPct, 1);
    out.baseline.textContent = fmt(baselineTons / 1_000_000, 2);
    out.nuclear.textContent = fmt(nuclearTons / 1_000_000, 3);
    out.capacity.textContent = fmt(requiredCapacityMW);
    out.gasAvoided.textContent = fmt(gasMassTons);
    out.barrels.textContent = fmt(barrelsEquiv);

    const maxBar = Math.max(baselineTons, nuclearTons, 1);
    if (out.gasBar) out.gasBar.style.width = (baselineTons / maxBar * 100) + '%';
    if (out.nuclearBar) out.nuclearBar.style.width = (nuclearTons / maxBar * 100) + '%';

    updateBadges();
  }

  ['input', 'change'].forEach(evt => {
    Object.values(els).forEach(el => el.addEventListener(evt, calculate));
  });

  const resetBtn = document.getElementById('ccReset');
  if (resetBtn){
    resetBtn.addEventListener('click', () => {
      Object.keys(els).forEach(key => { els[key].value = defaults[key]; });
      calculate();
    });
  }

  calculate();
}
