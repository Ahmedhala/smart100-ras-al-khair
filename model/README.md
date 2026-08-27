# Model Source Files — SMART100 × Ras Al-Khair

The three Python scripts behind every number on [the live site](https://ahmedhala.github.io/smart100-ras-al-khair/):

- **`model.py`** — the four core demand scenarios, unit sizing, LCOW, the MSF:RO ratio optimization sweep, and the N-1 maintenance reliability check.
- **`simulation.py`** — the 365-day seasonal simulation, the sequential backpressure-turbine scenario (Scenario 5), the maintenance-scheduling simulation, and the storage-buffer analysis.
- **`comparison.py`** — CO₂ emissions comparison against a natural-gas baseline.

Run in order: `model.py` → `simulation.py` → `comparison.py`. Each writes its outputs as CSV files consumed by the website's charts (`website/js/*.js`).

See [`references.html`](../references.html) on the live site for data sources and assumptions, and [`safety.html`](../safety.html) / the scope-disclaimer boxes throughout the site for what this model does and does not account for.
