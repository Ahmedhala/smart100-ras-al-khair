// ==========================================================================
// Interactive Carbon Calculation Engine — integration.html
// CO2 Avoided = Baseline Emissions (grid/CCGT) − Nuclear Scenario Emissions
// Carbon Reduction % = (CO2 Avoided / Baseline) × 100
//
// Methodology note: this is a bottom-up calculation (water production ×
// blended specific energy consumption → annual energy → × emission
// intensity), independent of the top-down daily-simulation figure used
// elsewhere on this site (comparison.py: installed fleet capacity × each
// day's actual simulated utilization, summed over the year — the source of
// the site's headline "8.27 million tons / 96.7%" figures). Both are
// legitimate; they will not produce identical numbers by construction. This
// calculator explains the gap rather than silently forcing a match.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initCarbonCalculator();
});

// Blended specific energy consumption at Ras Al Khair's actual 70.2% MSF /
// 29.8% RO split, expressed as thermal-equivalent kWh per m3 of water —
// same constants as model.py (steam_per_m3=100, steam_enthalpy=0.627,
// ro_kwh=4.0, smr_eff=0.303): 0.702*62.7 + 0.298*(4.0/0.303)
const DEFAULT_SPECIFIC_ENERGY = 0.702 * 62.7 + 0.298 * (4.0 / 0.303); // ≈ 47.95 kWh-eq/m3
const GAS_LHV_KWH_PER_KG = 13.9; // model.py / comparison.py constant, not user-adjustable here

function initCarbonCalculator(){
  const els = {
    waterProd: document.getElementById('ccWaterProd'),
    specificEnergy: document.getElementById('ccSpecificEnergy'),
    capacityFactor: document.getElementById('ccCapacityFactor'),
    gridIntensity: document.getElementById('ccGridIntensity'),
    fossilFactor: document.getElementById('ccFossilFactor'),
    nuclearIntensity: document.getElementById('ccNuclearIntensity'),
  };
  if (!els.waterProd) return; // calculator not on this page

  const defaults = {
    waterProd: 1036000,
    specificEnergy: DEFAULT_SPECIFIC_ENERGY,
    capacityFactor: 92,
    gridIntensity: 490,
    fossilFactor: 56.1,
    nuclearIntensity: 12,
  };

  const badges = {};
  Object.keys(els).forEach(key => {
    badges[key] = document.getElementById('ccBadge_' + key);
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
    const waterProd = parseFloat(els.waterProd.value) || 0;
    const specificEnergy = parseFloat(els.specificEnergy.value) || 0;
    const capacityFactor = (parseFloat(els.capacityFactor.value) || 0) / 100;
    const gridIntensity = parseFloat(els.gridIntensity.value) || 0;   // g CO2/kWh
    const fossilFactor = parseFloat(els.fossilFactor.value) || 0;     // kg CO2/GJ
    const nuclearIntensity = parseFloat(els.nuclearIntensity.value) || 0; // g CO2/kWh

    // Annual energy required (thermal-equivalent), bottom-up from production
    const annualEnergyMWh = waterProd * 365 * specificEnergy / 1000; // MWh/year
    const annualEnergyKWh = annualEnergyMWh * 1000;

    const baselineTons = annualEnergyKWh * gridIntensity / 1_000_000;
    const nuclearTons = annualEnergyKWh * nuclearIntensity / 1_000_000;
    const avoidedTons = baselineTons - nuclearTons;
    const reductionPct = baselineTons > 0 ? (avoidedTons / baselineTons) * 100 : 0;

    // Secondary: required installed capacity at this capacity factor
    const requiredCapacityMW = capacityFactor > 0 ? annualEnergyMWh / (8760 * capacityFactor) : 0;

    // Secondary: combustion cross-check via the fossil emission factor directly
    // (reproduces comparison.py's gas-avoided / barrels-of-oil-equivalent output)
    const gasEnergyGJ = fossilFactor > 0 ? (baselineTons * 1000) / fossilFactor : 0; // kg CO2 / (kg CO2/GJ)
    const gasMassTons = gasEnergyGJ / (GAS_LHV_KWH_PER_KG * 3.6 / 1000) / 1000; // GJ / (GJ/kg) / 1000 -> tons
    const barrelsEquiv = (gasMassTons * 1000 * GAS_LHV_KWH_PER_KG) / 1700;

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
