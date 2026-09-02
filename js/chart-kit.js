/* ==========================================================================
   SMART100 × رأس الخير — Chart Kit (Phase 1)
   Thin wrapper around Chart.js v4 (loaded via CDN by any page that needs
   charts) so every chart on the site shares one visual theme derived from
   the design tokens, instead of per-chart ad hoc styling.

   Usage (a page must load Chart.js BEFORE this file):
     <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
     <script src="js/chart-kit.js"></script>

   Phases 4-5 call createBarChart / createLineChart / createRadarChart.
   No chart is created by this file on its own — it only wires the shared
   theme and factory functions.
   ========================================================================== */
(function (global) {
  "use strict";

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = v && v.trim();
    return v || fallback;
  }

  // Read once — tokens don't change at runtime except via the (future)
  // Simple/Technical mode, which doesn't touch color tokens.
  var SMR_CHART_THEME = {
    fontFamily: "Tajawal, sans-serif",
    monoFontFamily: "'IBM Plex Mono', monospace",
    ink: cssVar("--ink", "#eef3f7"),
    inkSecondary: cssVar("--ink-secondary", "#a7b6c4"),
    inkMuted: cssVar("--ink-muted", "#7a8b99"),
    grid: "rgba(255,255,255,0.06)",
    panel: cssVar("--panel-raised", "#16222f"),
    border: cssVar("--border-strong", "rgba(255,255,255,0.16)"),
    nuclear: cssVar("--nuclear", "#3f8fd6"),
    nuclearGlow: cssVar("--nuclear-glow", "#6fb6ff"),
    thermal: cssVar("--thermal", "#ff7a45"),
    electric: cssVar("--electric", "#ffc23c"),
    water: cssVar("--water", "#22b8d6"),
    good: cssVar("--good", "#33c46a"),
    warn: cssVar("--warn", "#f0a736"),
    critical: cssVar("--critical", "#ef5757")
  };

  function applyDefaults() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = SMR_CHART_THEME.fontFamily;
    Chart.defaults.color = SMR_CHART_THEME.inkSecondary;
    Chart.defaults.plugins.legend.labels.color = SMR_CHART_THEME.inkSecondary;
    Chart.defaults.plugins.tooltip.backgroundColor = SMR_CHART_THEME.panel;
    Chart.defaults.plugins.tooltip.titleColor = SMR_CHART_THEME.ink;
    Chart.defaults.plugins.tooltip.bodyColor = SMR_CHART_THEME.inkSecondary;
    Chart.defaults.plugins.tooltip.borderColor = SMR_CHART_THEME.border;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { family: SMR_CHART_THEME.monoFontFamily, weight: "600" };
  }

  function baseScales(overrides) {
    var scale = {
      grid: { color: SMR_CHART_THEME.grid },
      ticks: { color: SMR_CHART_THEME.inkMuted, font: { family: SMR_CHART_THEME.monoFontFamily, size: 11 } }
    };
    return Object.assign({ x: Object.assign({}, scale), y: Object.assign({}, scale) }, overrides || {});
  }

  /**
   * createBarChart(canvasId, { labels, datasets, title, unit })
   * datasets: [{ label, data, color }]
   */
  function createBarChart(canvasId, cfg) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return null;
    applyDefaults();
    return new Chart(el, {
      type: "bar",
      data: {
        labels: cfg.labels,
        datasets: (cfg.datasets || []).map(function (d) {
          return {
            label: d.label,
            data: d.data,
            backgroundColor: d.color || SMR_CHART_THEME.nuclear,
            borderRadius: 4,
            maxBarThickness: 36
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: baseScales(),
        plugins: {
          legend: { display: (cfg.datasets || []).length > 1 },
          tooltip: {
            callbacks: cfg.unit ? {
              label: function (ctx) { return ctx.dataset.label + ": " + ctx.formattedValue + " " + cfg.unit; }
            } : undefined
          }
        }
      }
    });
  }

  /**
   * createLineChart(canvasId, { labels, datasets, unit })
   */
  function createLineChart(canvasId, cfg) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return null;
    applyDefaults();
    return new Chart(el, {
      type: "line",
      data: {
        labels: cfg.labels,
        datasets: (cfg.datasets || []).map(function (d) {
          return {
            label: d.label,
            data: d.data,
            borderColor: d.color || SMR_CHART_THEME.nuclear,
            backgroundColor: (d.color || SMR_CHART_THEME.nuclear) + "22",
            fill: !!d.fill,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: baseScales(),
        plugins: {
          legend: { display: (cfg.datasets || []).length > 1 },
          tooltip: {
            callbacks: cfg.unit ? {
              label: function (ctx) { return ctx.dataset.label + ": " + ctx.formattedValue + " " + cfg.unit; }
            } : undefined
          }
        }
      }
    });
  }

  /**
   * createRadarChart(canvasId, { labels, datasets })
   * Used for RO vs MSF comparison and the Decision Score breakdown.
   */
  function createRadarChart(canvasId, cfg) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return null;
    applyDefaults();
    return new Chart(el, {
      type: "radar",
      data: {
        labels: cfg.labels,
        datasets: (cfg.datasets || []).map(function (d) {
          return {
            label: d.label,
            data: d.data,
            borderColor: d.color || SMR_CHART_THEME.nuclear,
            backgroundColor: (d.color || SMR_CHART_THEME.nuclear) + "33",
            pointBackgroundColor: d.color || SMR_CHART_THEME.nuclear
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: SMR_CHART_THEME.grid },
            grid: { color: SMR_CHART_THEME.grid },
            pointLabels: { color: SMR_CHART_THEME.inkSecondary, font: { size: 11 } },
            ticks: { display: false, backdropColor: "transparent" }
          }
        },
        plugins: { legend: { display: (cfg.datasets || []).length > 1 } }
      }
    });
  }

  global.SMR_CHART_THEME = SMR_CHART_THEME;
  global.SMR_Charts = {
    createBarChart: createBarChart,
    createLineChart: createLineChart,
    createRadarChart: createRadarChart
  };
})(window);
