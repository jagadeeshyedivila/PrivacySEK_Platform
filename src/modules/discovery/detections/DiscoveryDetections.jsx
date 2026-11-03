import { OVERVIEW_SEED } from "../discoveryData.js";
import { CLASSES, TYPE_POLICY, reviewAll } from "../overview/discoveryInsights.js";
import { assetClassTag, classBadge, panelHead, riskBadge, subNav } from "../overview/insightPanels.js";

const HEATMAP_CATS = [
  ["Financial Information", "Fin"], ["Demographic Information", "Demogr."], ["Contact Information", "Contact"],
  ["Online Identifiers", "Online"], ["Biometric Identifiers", "Bio"], ["Authentication and Secrets", "Auth"]
];
const RISK_LABEL = { VH: "Very High", H: "High", M: "Medium", L: "Low" };

// Detections: every column detection with filters, the ranked data types, the source × category
// heatmap and the column tree. Files view lists classified unstructured files.
export function createDetectionsRenderer(context) {
  const { esc, tableEmptyState, ui } = context;

  // Categories that actually have detections (an empty column or option only confuses)
  function presentCats(all) {
    const have = new Set(all.map(f => f.cat));
    return HEATMAP_CATS.filter(c => have.has(c[0]));
  }

  function filterBar(F, cats) {
    const seed = OVERVIEW_SEED;
    const active = Boolean(F.conn || F.cat || F.rk || F.cls || F.minConf);
    const sel = (label, key, options, width) => `
      <div class="dd-filter-group" style="max-width:${width}px">
        <span class="dd-filter-label">${label}</span>
        <select class="dd-filter-select" data-act="dd-set-filter" data-arg="${key}" aria-label="${label}">
          ${options.map(([v, l]) => `<option value="${esc(v)}" ${String(F[key] || "") === v ? "selected" : ""}>${esc(l)}</option>`).join("")}
        </select>
      </div>`;
    const chip = (key, label) => `<span class="dd-filter-chip">${esc(label)}<button data-act="dd-remove-filter" data-arg="${key}" aria-label="Remove filter">×</button></span>`;
    return `
      <div class="dd-sticky-filter-bar">
        <div class="dd-filter-row">
          ${sel("Source", "conn", [["", "All sources"], ...seed.bySource.map(s => [s[0], s[0]])], 190)}
          ${sel("Class", "cls", [["", "All classes"], ...["SPI", "PII", "POT", "NON"].map(k => [k, CLASSES[k].label])], 160)}
          ${sel("Category", "cat", [["", "All categories"], ...cats.map(c => [c[0], c[0]])], 200)}
          ${sel("Recognizer risk", "rk", [["", "All levels"], ...Object.keys(RISK_LABEL).map(k => [k, RISK_LABEL[k]])], 150)}
          <div class="dd-filter-group" style="max-width:210px">
            <span class="dd-filter-label">Min. confidence</span>
            <div class="dd-conf-slider-wrap">
              <input type="range" class="dd-conf-slider" min="0" max="95" step="5" value="${F.minConf && F.minConf !== "review" ? F.minConf : "0"}" data-input-act="dd-conf-slider" aria-label="Minimum confidence" />
              <span class="dd-conf-val">${F.minConf === "review" ? "<80" : F.minConf ? `≥${F.minConf}%` : "All"}</span>
            </div>
          </div>
          <div style="flex:none;align-self:flex-end">
            <button class="btn sm o" data-act="dd-reset-filters">Reset filters</button>
          </div>
        </div>
        ${active ? `
          <div class="dd-filter-chips-wrap">
            ${F.conn ? chip("conn", `Source: ${F.conn}`) : ""}
            ${F.cls ? chip("cls", `Class: ${CLASSES[F.cls] ? CLASSES[F.cls].label : F.cls}`) : ""}
            ${F.cat ? chip("cat", `Category: ${F.cat}`) : ""}
            ${F.rk ? chip("rk", `Risk: ${RISK_LABEL[F.rk] || F.rk}`) : ""}
            ${F.minConf ? chip("minConf", `Confidence: ${F.minConf === "review" ? "below 80%" : `≥${F.minConf}%`}`) : ""}
            <button class="btn sm link" data-act="dd-reset-filters" style="padding:0;font-size:11.5px">Clear all</button>
          </div>` : ""}
      </div>`;
  }

  function renderTypes(filtered, reviews, F) {
    const map = {};
    filtered.forEach(f => {
      if (!map[f.type]) map[f.type] = { type: f.type, cat: f.cat, count: 0, minConf: f.conf, maxConf: f.conf, rk: f.rk, ooc: 0 };
      const t = map[f.type];
      t.count++;
      t.minConf = Math.min(t.minConf, f.conf);
      t.maxConf = Math.max(t.maxConf, f.conf);
      if (f.rk === "VH" || (f.rk === "H" && t.rk !== "VH")) t.rk = f.rk;
      if (reviews.get(f.id).flags.includes("out-of-context")) t.ooc++;
    });
    let ranked = Object.values(map).sort((a, b) => b.count - a.count);
    const q = (F.piiSearch || "").toLowerCase().trim();
    if (q) ranked = ranked.filter(t => t.type.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q));
    const shown = F.showAllPii ? ranked : ranked.slice(0, 8);

    return `
      <div class="card dd-ov-card">
        ${panelHead("Detected data types", "Columns per type, with confidence range and class",
          `<input type="text" class="dd-form-input dd-type-search" placeholder="Search types…" value="${esc(F.piiSearch || "")}" data-input-act="dd-search-pii-types" aria-label="Search data types" />`)}
        ${shown.length ? `
          <div class="dd-pii-types-list">
            <div class="dd-pii-type-item dd-pii-type-head">
              <span>#</span><span>Data type</span><span title="Range on a 70–100% track">Confidence</span><span style="text-align:right">Columns</span><span>Class</span><span>Risk</span>
            </div>
            ${shown.map((t, i) => {
              const left = Math.max(0, Math.min(100, ((t.minConf - 70) / 30) * 100));
              const width = Math.max(6, Math.min(100 - left, ((t.maxConf - t.minConf) / 30) * 100));
              return `
                <div class="dd-pii-type-item" data-act="dd-view-pii-type-drawer" data-arg="${esc(t.type)}" role="button" tabindex="0" title="View the ${t.count} columns detected as ${esc(t.type)}">
                  <span class="dim mono">${i + 1}</span>
                  <b style="color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.type)}</b>
                  <div>
                    <div class="dd-range-track"><div class="dd-range-bar" style="left:${left}%;width:${width}%"></div></div>
                    <div class="dd-range-score">${t.minConf}%–${t.maxConf}%${t.ooc ? ` · <span class="dd-verify">${t.ooc} to verify</span>` : ""}</div>
                  </div>
                  <span class="mono" style="text-align:right;font-weight:600">${t.count}</span>
                  <div>${classBadge(esc, (TYPE_POLICY[t.type] || {}).cls || "PII")}</div>
                  <div>${riskBadge(t.rk)}</div>
                </div>`;
            }).join("")}
          </div>
          <div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);justify-content:space-between">
            <span class="dim" style="font-size:12px">Showing ${shown.length} of ${ranked.length} data types</span>
            ${ranked.length > 8 ? `<button class="btn sm link" data-act="dd-toggle-all-pii" style="font-size:12px">${F.showAllPii ? "Show top 8 only" : `Show all ${ranked.length} types`}</button>` : ""}
          </div>
        ` : tableEmptyState("No matching data types", "Clear the search or reset filters.", "dd-reset-filters", "Reset filters")}
      </div>`;
  }

  function renderHeatmap(filtered, F, cats) {
    const conns = OVERVIEW_SEED.bySource.map(s => s[0]);
    const counts = {};
    let max = 1;
    filtered.forEach(f => {
      const k = `${f.connName}|${f.cat}`;
      counts[k] = (counts[k] || 0) + 1;
      max = Math.max(max, counts[k]);
    });
    return `
      <div class="card dd-ov-card">
        ${panelHead("Source × category", "Click a cell to filter")}
        <div class="dd-heatmap-wrap">
          <table class="dd-heatmap-table">
            <thead><tr><th style="text-align:left">Source</th>${cats.map(c => `<th title="${esc(c[0])}">${c[1]}</th>`).join("")}</tr></thead>
            <tbody>
              ${conns.map(conn => `
                <tr>
                  <td style="text-align:left;font-weight:600;font-size:11.5px;white-space:nowrap">${esc(conn)}</td>
                  ${cats.map(([cat]) => {
                    const n = counts[`${conn}|${cat}`] || 0;
                    const a = n ? Math.min(1, Math.max(0.15, n / max)) : 0;
                    const selected = F.conn === conn && F.cat === cat;
                    return `<td><div class="dd-heatmap-cell ${selected ? "selected" : ""}" data-act="dd-heatmap-click" data-conn="${esc(conn)}" data-cat="${esc(cat)}"
                      style="background:rgba(20, 184, 166, ${a});color:${a > 0.4 ? "#fff" : "var(--text)"};${selected ? "outline:2px solid var(--block);" : ""}"
                      title="${esc(conn)} × ${esc(cat)}: ${n} columns">${n || '<span class="dim" style="font-weight:400">·</span>'}</div></td>`;
                  }).join("")}
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderTree(filtered, reviews, active) {
    const tree = {};
    filtered.forEach(f => {
      if (!tree[f.connName]) tree[f.connName] = { connType: f.connType, tables: {} };
      (tree[f.connName].tables[f.tableName] = tree[f.connName].tables[f.tableName] || []).push(f);
    });
    return `
      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-h" style="padding:14px 16px;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--line)">
          <div>
            <h3 style="margin:0 0 4px">Column detections by source</h3>
            <span class="dim" style="font-size:12px">Showing ${filtered.length.toLocaleString()} column detections across ${Object.keys(tree).length} sources${active ? " (filtered)" : ""}</span>
          </div>
          <div class="row" style="margin:0;gap:8px;align-items:center">
            <button class="btn sm o" data-act="dd-expand-all-conns">▾ Expand all</button>
            <button class="btn sm o" data-act="dd-collapse-all-conns">▸ Collapse all</button>
            <button class="btn sm o" data-act="dd-export-csv">Export CSV</button>
          </div>
        </div>
        ${!filtered.length ? `<div style="padding:32px 16px">${tableEmptyState("No column detections match your filters", "Broaden the confidence threshold, source, class or category.", "dd-reset-filters", "Reset filters")}</div>` : `
          <div class="dd-tree-list" style="padding:14px 16px">
            ${Object.keys(tree).map(conn => {
              const c = tree[conn];
              const open = Boolean(ui.expandedConnections && ui.expandedConnections[conn]);
              const tables = Object.keys(c.tables);
              const total = tables.reduce((s, t) => s + c.tables[t].length, 0);
              return `
                <div class="dd-accordion-group dd-tree-connection-group" style="margin-bottom:12px">
                  <div class="dd-accordion-conn-header dd-tree-header" data-act="dd-toggle-conn-expand" data-arg="${esc(conn)}">
                    <div class="row" style="margin:0;gap:10px;align-items:center">
                      <span class="dd-accordion-arrow dd-tree-toggle-arrow ${open ? "open" : ""}">▶</span>
                      <b style="font-size:13.5px;color:var(--text)">${esc(conn)}</b>
                      <span class="mono dim" style="font-size:11.5px">(${esc(c.connType.toUpperCase())})</span>
                    </div>
                    <div class="row" style="margin:0;gap:8px;align-items:center">
                      <span class="tag">${tables.length} tables</span><span class="tag">${total} detections</span>
                    </div>
                  </div>
                  ${open ? `
                    <div class="dd-tree-content" style="padding:12px 14px 8px;background:var(--bg)">
                      ${tables.map(tableName => {
                        const cols = c.tables[tableName];
                        const key = `${conn}::${tableName}`;
                        const tOpen = Boolean(ui.expandedTables && ui.expandedTables[key]);
                        const spi = cols.filter(x => reviews.get(x.id).cls === "SPI").length;
                        return `
                          <div class="dd-accordion-table-item dd-table-subgroup" style="margin-bottom:8px">
                            <div class="dd-accordion-table-header dd-table-subgroup-title ${tOpen ? "open" : ""}" data-act="dd-toggle-table-expand" data-arg="${esc(key)}">
                              <div class="row" style="margin:0;gap:8px;align-items:center">
                                <span class="dd-accordion-arrow ${tOpen ? "open" : ""}">▶</span>
                                <span class="mono" style="font-weight:600;font-size:12.5px;color:var(--text)">${esc(tableName)}</span>
                              </div>
                              <div class="row" style="margin:0;gap:6px;align-items:center">
                                ${spi ? `<span class="tag spi" style="font-size:11px">${spi} SPI</span>` : ""}
                                <span class="tag" style="font-size:11px">${cols.length} classified columns</span>
                              </div>
                            </div>
                            ${tOpen ? `
                              <div style="overflow-x:auto;padding:4px 0">
                                <table class="t" style="margin:0;width:100%">
                                  <thead><tr><th>Column</th><th>Data type</th><th>Class</th><th>Category</th><th>Recognizer risk</th><th>Confidence</th><th>Status</th></tr></thead>
                                  <tbody>
                                    ${cols.map(x => {
                                      const rv = reviews.get(x.id);
                                      return `
                                        <tr class="click" data-act="dd-view-column-detail" data-id="${esc(x.id)}">
                                          <td class="mono"><b>${esc(x.colName)}</b></td>
                                          <td>${esc(x.type)}</td>
                                          <td>${classBadge(esc, rv.cls)}${rv.flags.includes("out-of-context") ? ' <span class="dd-verify">Verify location</span>' : ""}</td>
                                          <td><span class="tag">${esc(x.cat)}</span></td>
                                          <td>${riskBadge(x.rk)}</td>
                                          <td><div class="row" style="margin:0;gap:6px;align-items:center"><span class="mono font-semibold" style="font-size:12px">${x.conf}%</span><div class="dd-range-track" style="width:50px"><div class="dd-range-bar" style="left:0;width:${x.conf}%"></div></div></div></td>
                                          <td>${x.accepted ? `<span class="pill ok" style="font-size:10.5px">Auto-accepted</span>` : `<span class="pill act" style="font-size:10.5px">Needs review</span>`}</td>
                                        </tr>`;
                                    }).join("")}
                                  </tbody>
                                </table>
                              </div>` : ""}
                          </div>`;
                      }).join("")}
                    </div>` : ""}
                </div>`;
            }).join("")}
          </div>`}
      </div>`;
  }

  function renderFiles(data) {
    const files = data.unstructuredResults || [];
    return `
      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-h" style="padding:14px 16px">
          <div><h3 style="margin:0 0 4px">Classified files</h3><span class="dim" style="font-size:12px">Most recently classified files from object stores, call archives and drives</span></div>
          <button class="btn sm o" data-act="dd-export-csv">Export file list</button>
        </div>
        <div class="tw">
          <table class="t">
            <thead><tr><th>File</th><th>Source</th><th>Path</th><th>Sensitive entities</th><th>Risk</th><th>Scanned</th></tr></thead>
            <tbody>
              ${files.length ? files.map(f => `
                <tr>
                  <td><b>${esc(f.fileName)}</b></td>
                  <td class="mono">${esc(f.source)}</td>
                  <td class="dim mono" style="font-size:12px">${esc(f.path)}</td>
                  <td><div class="tags">${(f.categories || []).map(c => assetClassTag(esc, c)).join("")}</div></td>
                  <td>${riskBadge(f.risk)}</td>
                  <td class="dim" style="font-size:12px">${esc(f.scannedAt)}</td>
                </tr>`).join("") : `<tr><td colspan="6" class="empty">No classified files yet</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  return function renderDiscoveryDetections() {
    const data = context.getStore();
    const all = data.overviewFindings || [];
    const view = ui.detView || "cols";
    const nav = subNav(esc, "detView", view, [["cols", "Columns", all.length.toLocaleString()], ["files", "Files", (data.unstructuredResults || []).length]]);
    if (view === "files") return `<div class="dd-container">${nav}${renderFiles(data)}</div>`;

    const F = ui.overviewFilters || {};
    const reviews = reviewAll(all);
    const filtered = all.filter(f => {
      if (F.conn && f.connName !== F.conn) return false;
      if (F.cat && f.cat !== F.cat) return false;
      if (F.rk && f.rk !== F.rk) return false;
      if (F.cls && reviews.get(f.id).cls !== F.cls) return false;
      if (F.minConf === "review") return f.conf < 80;
      const min = parseInt(F.minConf, 10);
      return !(min > 0 && f.conf < min);
    });
    const active = Boolean(F.conn || F.cat || F.rk || F.cls || F.minConf);
    const cats = presentCats(all);

    return `
      <div class="dd-container">
        ${nav}
        ${filterBar(F, cats)}
        <div class="dd-dash-row dd-dash-row-a">
          ${renderTypes(filtered, reviews, F)}
          ${renderHeatmap(filtered, F, cats)}
        </div>
        ${renderTree(filtered, reviews, active)}
      </div>`;
  };
}
