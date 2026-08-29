// ==========================================================================
// Sensitivity / Uncertainty engine — scenarios.html
// Reproduces model.py's calculate_scenario() + calculate_lcow() exactly
// (verified offline to return $5.672/m3 at 10 units for the unmodified
// baseline — matches the site's established normal-scenario LCOW of $5.67).
// Used by both the Tornado chart (one-variable-at-a-time, deterministic)
// and the Monte Carlo panel (all uncertain variables sampled together).
// ==========================================================================

const BASE = {
  smrElec: 100.0, smrEff: 0.303, productionTotal: 1036000, msfShare: 0.702, roShare: 0.298,
  roKwh: 4.0, msfAuxKwh: 3.0, gor: 10.0, steamEnthalpy: 0.627, smrCf: 0.92,
  capexPerUnit: 1000, smrLcoe: 75, discountRate: 0.07, projectLife: 60,
  carbonPrice: 30, co2FactorGas: 56.1, gasLhv: 13.9, ccgtEff: 0.55,
};

const SCENARIOS = {
  normal: [1.00, 1.00], high_water: [1.20, 1.05], high_elec: [1.00, 1.20], peak: [1.30, 1.30],
};

function scenarioLoad(p, wm, em){
  const production = p.productionTotal * wm;
  const msfProd = production * p.msfShare;
  const steamPerM3 = 1000 / p.gor;
  const thermalMw = (msfProd * steamPerM3 * p.steamEnthalpy) / 24 / 1000;
  const roProd = production * p.roShare;
  const electricMw = (roProd * p.roKwh + msfProd * p.msfAuxKwh) * em / 24 / 1000;
  const totalEq = thermalMw + electricMw / p.smrEff;
  return { production, msfProd, roProd, thermalMw, electricMw, totalEq };
}

// Full LCOW calculation with any parameter overridable; unitsOverride skips
// peak-based fleet sizing (used by the "number of reactors" tornado variable).
function calcLCOWFull(overrides, unitsOverride){
  const p = Object.assign({}, BASE, overrides || {});
  const capPerUnit = p.smrElec / p.smrEff;

  let peakLoad = 0;
  Object.values(SCENARIOS).forEach(([wm, em]) => {
    peakLoad = Math.max(peakLoad, scenarioLoad(p, wm, em).totalEq);
  });
  const unitsNeeded = unitsOverride || Math.ceil(peakLoad / capPerUnit);

  const crf = (p.discountRate * Math.pow(1 + p.discountRate, p.projectLife)) /
              (Math.pow(1 + p.discountRate, p.projectLife) - 1);
  const totalCapex = unitsNeeded * p.capexPerUnit;
  const annualCapex = totalCapex * crf;

  const normal = scenarioLoad(p, 1.0, 1.0);
  const annualOpex = (normal.totalEq * 8760 * p.smrCf) * p.smrLcoe / 1_000_000;
  const totalAnnualCost = annualCapex + annualOpex;
  const lcow = (totalAnnualCost * 1_000_000) / (normal.production * 365);

  return { lcow, unitsNeeded, peakLoad, normal, capPerUnit };
}

// CO2 avoided per m3 at the normal-scenario operating point (combustion-based,
// same method as comparison.py) — used only for the illustrative carbon-price
// tornado variable and its "carbon-adjusted LCOW" derived metric.
function co2AvoidedPerM3(p){
  const normal = scenarioLoad(p, 1.0, 1.0);
  const gasKgDay = (normal.totalEq * 1000 / p.ccgtEff) / p.gasLhv * 24;
  const gjDay = gasKgDay * (p.gasLhv * 3.6 / 1000);
  const co2GasDay = gjDay * p.co2FactorGas / 1000; // tons/day
  const co2SmrDay = (normal.totalEq * 24 * 1000) * 0.012 / 1000; // tons/day, 12 gCO2/kWh
  return (co2GasDay - co2SmrDay) / normal.production; // tons CO2 / m3
}

/* ---------------------------------------------------------------- Tornado --- */
const TORNADO_VARS = [
  { key: 'reactorCapacity', label: 'قدرة المفاعل (MWe/وحدة)', low: 85, high: 115, base: 100,
    apply: (v) => calcLCOWFull({ smrElec: v }).lcow },
  { key: 'waterDemand', label: 'الطلب على المياه (م³/يوم)', low: BASE.productionTotal * 0.85, high: BASE.productionTotal * 1.15, base: BASE.productionTotal,
    apply: (v) => calcLCOWFull({ productionTotal: v }).lcow },
  { key: 'roEnergy', label: 'الاستهلاك الكهربائي لـRO (kWh/م³)', low: 3.4, high: 4.6, base: 4.0,
    apply: (v) => calcLCOWFull({ roKwh: v }).lcow },
  { key: 'msfThermal', label: 'الاستهلاك الحراري لـMSF (kWh/kg بخار)', low: 0.533, high: 0.721, base: 0.627,
    apply: (v) => calcLCOWFull({ steamEnthalpy: v }).lcow },
  { key: 'elecPrice', label: 'سعر الطاقة النووية المولَّدة ($/MWh)', low: 63.75, high: 86.25, base: 75,
    apply: (v) => calcLCOWFull({ smrLcoe: v }).lcow },
  { key: 'carbonPrice', label: 'سعر الكربون التوضيحي ($/طن، LCOW معدَّل)', low: 10, high: 50, base: 30,
    apply: (v) => {
      const base = calcLCOWFull({});
      return base.lcow - v * co2AvoidedPerM3(BASE);
    } },
  { key: 'capacityFactor', label: 'معامل قدرة المحطة (%)', low: 0.782, high: 1.0, base: 0.92,
    apply: (v) => calcLCOWFull({ smrCf: v }).lcow },
  { key: 'numUnits', label: 'عدد المفاعلات (وحدة)', low: 9, high: 12, base: 10,
    apply: (v) => calcLCOWFull({}, v).lcow },
];

function runTornado(){
  const baselineLcow = calcLCOWFull({}).lcow;
  const results = TORNADO_VARS.map(v => {
    const lcowLow = v.apply(v.low);
    const lcowHigh = v.apply(v.high);
    return {
      key: v.key, label: v.label, low: v.low, high: v.high, base: v.base,
      lcowLow, lcowHigh, impact: Math.abs(lcowHigh - lcowLow),
    };
  });
  results.sort((a, b) => b.impact - a.impact);
  return { baselineLcow, results };
}

/* ---------------------------------------------------------------- Monte Carlo --- */
// Box-Muller normal sampling — no external dependency.
function sampleNormal(mean, sigma){
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sigma;
}

function percentile(sortedArr, p){
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
}

// Reasonable-default 1-sigma = 10% of each central value, per the five
// requested uncertain variables. Explicitly an assumption (Estimated), not a
// measured statistic — documented in the UI next to the results.
function runMonteCarlo(n, sigmaFraction){
  n = n || 1000;
  sigmaFraction = sigmaFraction || 0.10;
  const lcowSamples = [];
  const co2Samples = [];

  for (let i = 0; i < n; i++){
    const roKwh = Math.max(0.5, sampleNormal(BASE.roKwh, BASE.roKwh * sigmaFraction));
    const productionTotal = Math.max(1000, sampleNormal(BASE.productionTotal, BASE.productionTotal * sigmaFraction));
    const smrCf = Math.min(1, Math.max(0.3, sampleNormal(BASE.smrCf, BASE.smrCf * sigmaFraction)));
    const smrLcoe = Math.max(10, sampleNormal(BASE.smrLcoe, BASE.smrLcoe * sigmaFraction));
    const co2FactorGas = Math.max(20, sampleNormal(BASE.co2FactorGas, BASE.co2FactorGas * sigmaFraction));

    const p = Object.assign({}, BASE, { roKwh, productionTotal, smrCf, smrLcoe, co2FactorGas });
    lcowSamples.push(calcLCOWFull(p).lcow);

    const normal = scenarioLoad(p, 1.0, 1.0);
    const gasKgDay = (normal.totalEq * 1000 / p.ccgtEff) / p.gasLhv * 24;
    const gjDay = gasKgDay * (p.gasLhv * 3.6 / 1000);
    const co2GasDay = gjDay * p.co2FactorGas / 1000;
    const co2SmrDay = (normal.totalEq * 24 * 1000) * 0.012 / 1000;
    co2Samples.push((co2GasDay - co2SmrDay) * 365 / 1_000_000); // million tons/year
  }

  lcowSamples.sort((a, b) => a - b);
  co2Samples.sort((a, b) => a - b);

  return {
    n, sigmaFraction,
    lcow: { p10: percentile(lcowSamples, 10), p50: percentile(lcowSamples, 50), p90: percentile(lcowSamples, 90) },
    co2: { p10: percentile(co2Samples, 10), p50: percentile(co2Samples, 50), p90: percentile(co2Samples, 90) },
  };
}
