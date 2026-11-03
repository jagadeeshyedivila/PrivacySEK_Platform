import { OVERVIEW_SEED } from "../discoveryData.js";
import { computeDiscoveryModel } from "./discoveryInsights.js";
import {
  RISK_COLORS, drillAttrs, panelHead, renderAccuracy, renderClassMini, renderExposureSignals, renderFootprint,
  renderKpiStrip, renderPriorityFindings, renderSpiBySource, renderTrend
} from "./insightPanels.js";

// Overview: key metrics, priority findings and a few charts. Detail lives in the other tabs.
export function createOverviewRenderer(context) {
  const { D, esc, ui } = context;
  const fmt = n => Number(n || 0).toLocaleString();
  const k = n => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));
  const RISK_LABEL = { VH: "Very High", H: "High", M: "Medium", L: "Low" };

  function modeBar(mode, data, seed) {
    const u = seed.unstructured;
    return `
      <div class="dd-ov-top">
        <div class="dd-mode-toggle">
          <button class="dd-mode-btn ${mode === "S" ? "active" : ""}" data-act="dd-set-mode" data-arg="S">Structured (${seed.scan.totalTB} TB · ${fmt(seed.inventory.piiColumns)} cols)</button>
          <button class="dd-mode-btn ${mode === "U" ? "active" : ""}" data-act="dd-set-mode" data-arg="U">Unstructured (${u.totalTB} TB · ${k(u.totalFiles)} files)</button>
        </div>
        <span class="dd-ov-scan"><span class="dd-live-dot"></span>Last scan ${esc(data.lastScan || seed.scan.lastScan)}</span>
        <button class="btn sm o" ${drillAttrs(esc, "detections", null, null, mode === "U" ? "files" : "cols")}>${mode === "U" ? "View classified files" : "View all detections"}</button>
      </div>`;
  }

  function tile(val, label, sub, attrs = "", cls = "") {
    return `
      <button type="button" class="dd-inventory-tile card kpi ${cls}" ${attrs}>
        <span class="dd-inv-val"><b>${val}</b></span>
        <span class="dd-inv-label">${label}</span>
        <span class="dd-inv-sub">${sub}</span>
      </button>`;
  }

  // ----------------------------------------------------------------------------
  // Unstructured
  // ----------------------------------------------------------------------------
  function renderUnstructured(data, seed) {
    const u = seed.unstructured;
    const connections = data.connections || [];
    const stores = connections.filter(c => c.kind === "U").length;
    const audio = (u.metadataOnly || []).reduce((s, x) => s + x.count, 0);
    const scanned = u.scannedFiles || u.totalFiles;
    const DOC_COLORS = ["var(--dd-cat-1)", "var(--dd-cat-2)", "var(--dd-cat-3)", "var(--dd-cat-4)"];

    const footprint = renderFootprint(context, {
      title: "Unstructured data sensitivity footprint",
      sub: `Object stores, call archives and cloud drives · ${stores} sources`,
      stats: [
        { value: `${u.totalTB} TB`, label: `${fmt(u.totalFiles)} files` },
        { value: fmt(u.sensitiveFiles), label: `files with SPI or PII · ${((u.sensitiveFiles / scanned) * 100).toFixed(1)}% of ${k(scanned)} content-scanned`, tone: "danger" },
        { value: k(audio), label: "call recordings · classified from metadata" }
      ],
      parts: u.topEntities.map((e, i) => ({
        label: e.name, value: e.count, display: `${fmt(e.count)} files`, color: DOC_COLORS[i % DOC_COLORS.length],
        note: e.verify ? "Needs verification" : ""
      })),
      rest: { label: "without sensitive data", value: scanned - u.sensitiveFiles, display: `${fmt(scanned - u.sensitiveFiles)} files` }
    });

    const maxTypeCount = Math.max(...u.topTypes.map(t => t.count), ...(u.metadataOnly || []).map(x => x.count));
    const formats = `
      <div class="card dd-ov-card">
        ${panelHead("File formats", "Files per format and how many hold sensitive data")}
        <div class="dd-fmt-list">
          ${u.topTypes.map(t => `
            <div class="dd-fmt-row" title="${t.ext}: ${fmt(t.sensitive)} of ${fmt(t.count)} files hold sensitive data">
              <b class="mono">.${t.ext.toLowerCase()}</b>
              <span class="dd-fmt-track"><span class="dd-fmt-all" style="width:${(t.count / maxTypeCount) * 100}%"><span class="dd-fmt-sens" style="width:${(t.sensitive / t.count) * 100}%"></span></span></span>
              <span class="mono dd-fmt-val">${fmt(t.sensitive)} / ${fmt(t.count)}</span>
            </div>`).join("")}
          ${(u.metadataOnly || []).map(x => `
            <div class="dd-fmt-row" title="${esc(x.source)}: ${esc(x.holds)}">
              <b class="mono">.${x.ext.toLowerCase()}</b>
              <span class="dd-fmt-track"><span class="dd-fmt-all dd-fmt-meta" style="width:${(x.count / maxTypeCount) * 100}%"></span></span>
              <span class="mono dd-fmt-val">${fmt(x.count)} <small>metadata</small></span>
            </div>`).join("")}
        </div>
        <div class="dd-hbar-key" style="margin:12px 0 0"><span><i class="dd-swatch dd-fmt-sens-key"></i>Holds sensitive data</span><span><i class="dd-swatch dd-fmt-all-key"></i>All files</span><span><i class="dd-swatch dd-fmt-meta-key"></i>Classified from metadata</span></div>
      </div>`;

    const classes = `
      <div class="card dd-ov-card">
        ${panelHead("Document classes", "What each class contains decides how sensitive it is")}
        <div class="dd-doc-list">
          ${u.topEntities.map((e, i) => {
            const spiConfirmed = e.contains.some(c => c.cls === "SPI" && !c.unconfirmed);
            return `
              <div class="dd-doc ${e.verify ? "verify" : ""}">
                <div class="dd-doc-head">
                  <i style="background:${DOC_COLORS[i % DOC_COLORS.length]}"></i>
                  <b>${esc(e.name)}</b>
                  ${e.verify ? '<span class="dd-verify-pill">Needs verification</span>' : `<span class="dd-cls dd-cls-${spiConfirmed ? "SPI" : "PII"}">${spiConfirmed ? "SPI" : "PII"}</span>`}
                  <span class="mono dd-doc-n">${fmt(e.count)}</span>
                </div>
                <div class="dd-doc-tags">
                  ${e.contains.map(c => `<span class="tag ${c.unconfirmed ? "dd-tag-verify" : c.cls === "SPI" ? "spi" : "pii"}" title="${c.unconfirmed ? "Not extracted; unconfirmed" : c.cls}">${esc(c.name)}${c.unconfirmed ? " · unconfirmed" : ""}</span>`).join("")}
                  <span class="dd-ov-sub">confidence ${e.min}–${e.max}%</span>
                </div>
                ${e.verify ? `<p class="dd-ov-note">${esc(e.verify)}.</p>` : ""}
              </div>`;
          }).join("")}
        </div>
      </div>`;

    return `
      <div class="dd-container dd-dash">
        ${modeBar("U", data, seed)}
        <div class="dd-dash-row dd-dash-row-hero">
          ${footprint}
          ${renderAccuracy(context, { pct: u.accuracyPct, auto: u.autoAccepted, review: u.needsReview, unit: "sensitive files", sub: `${fmt(u.sensitiveFiles)} sensitive files` })}
        </div>
        <div class="dd-inventory-grid dd-kpi-strip">
          ${tile(stores, "Storage sources", "Sources connected", drillAttrs(esc, "connections"))}
          ${tile(u.fileTypesCount, "File formats", "Detected across sources")}
          ${tile(k(u.totalFiles), "Total files", `${k(scanned)} content-scanned`)}
          ${tile(k(audio), "Call recordings", "Classified from metadata")}
          ${tile(fmt(u.sensitiveFiles), "Sensitive files", "SPI or PII found", drillAttrs(esc, "detections", null, null, "files"))}
          ${tile(fmt(u.needsReview), "Need review", "Below 80% confidence", 'data-act="dd-goto-needs-review"')}
        </div>
        <div class="dd-dash-row dd-dash-row-b">
          ${formats}
          ${classes}
        </div>
      </div>`;
  }

  // ----------------------------------------------------------------------------
  // Structured
  // ----------------------------------------------------------------------------
  function renderStructured(data, seed) {
    const m = computeDiscoveryModel(data, D, seed);
    const tb = seed.scan.piiTBByRisk;
    const riskCols = { VH: 0, H: 0, M: 0, L: 0 };
    m.findings.forEach(f => { if (riskCols[f.rk] !== undefined) riskCols[f.rk]++; });
    const structuredSources = (data.connections || []).filter(c => c.kind === "S").length;
    const parts = [["VH", tb.veryHigh], ["H", tb.high], ["M", tb.medium], ["L", tb.low]].map(([rk, v]) => ({
      label: RISK_LABEL[rk], value: v, display: `${v.toFixed(1)} TB`, color: RISK_COLORS[rk],
      note: `${fmt(riskCols[rk])} columns`, attrs: drillAttrs(esc, "detections", "rk", rk)
    }));
    const clean = Math.round((seed.scan.totalTB - seed.scan.piiTB) * 10) / 10;

    const footprint = renderFootprint(context, {
      title: "Data sensitivity footprint",
      sub: `How much data was scanned and how much holds personal data, by recognizer risk`,
      stats: [
        { value: `${seed.scan.totalTB} TB`, label: `scanned across ${structuredSources} structured sources · ${fmt(seed.inventory.columnsScanned)} columns` },
        { value: `${seed.scan.piiTB.toFixed(1)} TB`, label: `holds personal data · ${Math.round((seed.scan.piiTB / seed.scan.totalTB) * 100)}% of scanned`, tone: "danger" },
        { value: fmt(m.findings.length), label: "columns with personal data" }
      ],
      parts,
      rest: { label: "without personal data", value: clean, display: `${clean.toFixed(1)} TB` }
    });

    return `
      <div class="dd-container dd-dash">
        ${modeBar("S", data, seed)}
        ${renderKpiStrip(context, m.kpis)}
        <div class="dd-dash-row dd-dash-row-hero">
          ${footprint}
          ${renderAccuracy(context, { pct: seed.accuracy.pct, auto: seed.accuracy.autoAccepted, review: seed.accuracy.needsReview, unit: "column detections", sub: `${fmt(m.findings.length)} column detections` })}
        </div>
        <div class="dd-dash-row dd-dash-row-a">
          ${renderPriorityFindings(context, m)}
          <div class="dd-dash-col">
            ${renderClassMini(context, m)}
            ${renderExposureSignals(context, m)}
          </div>
        </div>
        <div class="dd-dash-row dd-dash-row-b">
          ${renderSpiBySource(context, m)}
          ${renderTrend(context, seed.trend30d)}
        </div>
      </div>`;
  }

  return function renderDiscoveryOverview() {
    const data = context.getStore();
    return (ui.mode || "S") === "U" ? renderUnstructured(data, OVERVIEW_SEED) : renderStructured(data, OVERVIEW_SEED);
  };
}
