import { OVERVIEW_SEED } from "../discoveryData.js";
import { RISK_LEVELS } from "../discoveryConfig.js";
import { CLASSES, REVIEW_THRESHOLD, reviewAll } from "../overview/discoveryInsights.js";
import { classBadge } from "../overview/insightPanels.js";

const FLAG_TEXT = {
  "low-confidence": `Scored below ${REVIEW_THRESHOLD}% confidence, so it counts as Potential PII until a steward confirms it`,
  "out-of-context": "SPI found outside the systems expected to hold it: a false positive or an unapproved copy",
  "secondary-use": "SPI in an analytics or ML schema: check purpose limitation",
  "credential": "Credential data: a security risk as well as personal data"
};

export function registerOverviewActions(context, ACT) {
  const { $, S, drawer, esc, ledgerAdd, pill, render, toast, ui } = context;

  function renderRiskBadge(rkKey) {
    const rk = RISK_LEVELS[rkKey] || RISK_LEVELS.L;
    return `<span class="dd-risk-badge ${rk.key}">● ${rk.label}</span>`;
  }

  ACT["dd-set-mode"] = function(mode) {
    ui.mode = mode || "S";
    render();
  };

  ACT["dd-set-filter"] = function(val, el) {
    const filterKey = el?.getAttribute("data-arg");
    if (!filterKey) return;
    const explicitVal = el?.getAttribute("data-val");
    const targetVal = explicitVal !== null && explicitVal !== undefined ? explicitVal : (val || "");
    
    if (!ui.overviewFilters) ui.overviewFilters = {};
    ui.overviewFilters[filterKey] = targetVal;
    render();
  };

  ACT["dd-conf-slider"] = function(val) {
    const num = parseInt(val, 10);
    if (!ui.overviewFilters) ui.overviewFilters = {};
    ui.overviewFilters.minConf = num > 0 ? num : 0;
    render();
  };

  ACT["dd-remove-filter"] = function(filterKey) {
    if (!ui.overviewFilters) return;
    ui.overviewFilters[filterKey] = filterKey === "minConf" ? 0 : "";
    render();
  };

  ACT["dd-reset-filters"] = function(silent) {
    ui.overviewFilters = {
      type: "S",
      conn: "",
      cat: "",
      tab: "",
      col: "",
      rk: "",
      cls: "",
      minConf: 0,
      period: "last_scan",
      piiSearch: "",
      showAllPii: false
    };
    if (silent === true) return;
    render();
    toast("Filters reset");
  };

  ACT["dd-toggle-all-pii"] = function() {
    if (!ui.overviewFilters) ui.overviewFilters = {};
    ui.overviewFilters.showAllPii = !ui.overviewFilters.showAllPii;
    render();
  };

  ACT["dd-search-pii-types"] = function(val) {
    if (!ui.overviewFilters) ui.overviewFilters = {};
    ui.overviewFilters.piiSearch = val || "";
    render();
  };

  ACT["dd-toggle-conn-expand"] = function(connId) {
    if (!ui.expandedConnections) ui.expandedConnections = {};
    ui.expandedConnections[connId] = !ui.expandedConnections[connId];
    render();
  };

  ACT["dd-toggle-table-expand"] = function(tableKey) {
    if (!ui.expandedTables) ui.expandedTables = {};
    ui.expandedTables[tableKey] = !ui.expandedTables[tableKey];
    render();
  };

  ACT["dd-expand-all-conns"] = function() {
    if (!ui.expandedConnections) ui.expandedConnections = {};
    if (!ui.expandedTables) ui.expandedTables = {};
    OVERVIEW_SEED.bySource.forEach(s => {
      ui.expandedConnections[s[0]] = true;
    });
    const findings = context.getStore().overviewFindings || [];
    findings.forEach(f => {
      ui.expandedConnections[f.connName] = true;
      ui.expandedTables[`${f.connName}::${f.tableName}`] = true;
    });
    render();
    toast("All connections and tables expanded");
  };

  ACT["dd-collapse-all-conns"] = function() {
    ui.expandedConnections = {};
    ui.expandedTables = {};
    render();
    toast("All connections collapsed");
  };

  ACT["dd-export-csv"] = function() {
    toast("CSV export started – downloading report summary");
    ledgerAdd("Discovery report exported", "Full CSV metadata findings exported for audit");
  };

  ACT["dd-nav-tab"] = function(targetTab) {
    if (S && S.tab) {
      S.tab.discovery = targetTab;
    }
    ui.tab = targetTab;
    render();
  };

  ACT["dd-heatmap-click"] = function(val, el) {
    const conn = el?.getAttribute("data-conn");
    const cat = el?.getAttribute("data-cat");
    if (!ui.overviewFilters) ui.overviewFilters = {};
    
    // Toggle if already selected
    if (ui.overviewFilters.conn === conn && ui.overviewFilters.cat === cat) {
      ui.overviewFilters.conn = "";
      ui.overviewFilters.cat = "";
    } else {
      ui.overviewFilters.conn = conn || "";
      ui.overviewFilters.cat = cat || "";
    }
    render();
  };

  function goTab(tab) {
    if (S && S.tab) S.tab.discovery = tab;
    ui.tab = tab;
  }

  // Drill-down from a dashboard element: open a tab, optionally with one Detections filter
  // (data-key / data-val) or a sub-view (data-view)
  ACT["dd-drill"] = function(tab, el) {
    const key = el?.getAttribute("data-key");
    const view = el?.getAttribute("data-view");
    if (key) {
      ACT["dd-reset-filters"](true);
      ui.overviewFilters[key] = el.getAttribute("data-val") || "";
    }
    if (tab === "detections") ui.detView = view || "cols";
    if (tab === "posture" && view) ui.postureView = view;
    goTab(tab || "overview");
    render();
    const content = document.getElementById("content");
    if (content) content.scrollTop = 0;
  };

  // Sub-view switch inside a tab, data-arg is "uiKey:value"
  ACT["dd-set-view"] = function(arg) {
    const [k, v] = String(arg || "").split(":");
    if (k) ui[k] = v;
    render();
  };

  ACT["dd-goto-needs-review"] = function() {
    if (ui.mode === "U") {
      ui.detView = "files";
    } else {
      ACT["dd-reset-filters"](true);
      ui.overviewFilters.cls = "POT";
      ui.detView = "cols";
    }
    goTab("detections");
    render();
  };

  ACT["dd-view-failed-tables"] = function() {
    const failedList = OVERVIEW_SEED.failedTablesList || [];

    drawer(
      "Failed Tables Report",
      "Schema reflection exceptions during scheduled discovery run",
      `
        <div style="margin-bottom:14px;color:var(--text-2);font-size:13px">
          The following <b>3 database tables</b> could not be profiled during schema reflection due to access permissions or network timeouts.
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="t">
            <thead>
              <tr>
                <th>Source Connection</th>
                <th>Table Name</th>
                <th>Error Reason</th>
                <th>Failed Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${failedList.map(item => `
                <tr>
                  <td><b>${esc(item.conn)}</b></td>
                  <td class="mono font-semibold">${esc(item.table)}</td>
                  <td class="dim" style="font-size:12px">${esc(item.reason)}</td>
                  <td class="dim" style="font-size:12px">${esc(item.failedAt)}</td>
                  <td>${pill("act", "Failed")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="row" style="margin-top:16px;justify-content:flex-end;gap:8px">
          <button class="btn sm o" data-act="close">Close</button>
          <button class="btn sm p" data-act="scan">Retry Reflection Scan</button>
        </div>
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  ACT["dd-view-pii-type-drawer"] = function(piiType) {
    const store = context.getStore();
    const allFindings = store.overviewFindings || [];
    const matched = allFindings.filter(f => f.type.toLowerCase() === (piiType || "").toLowerCase());

    drawer(
      `Detected Columns: ${esc(piiType)}`,
      `${matched.length} columns classified as ${esc(piiType)} across connected databases`,
      `
        <div style="margin-bottom:12px;font-size:13px;color:var(--text-2)">
          Detailed column findings matching the <b>${esc(piiType)}</b> recognizer profile:
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="t">
            <thead>
              <tr>
                <th>Connection</th>
                <th>Table</th>
                <th>Column</th>
                <th>Score</th>
                <th>Risk Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${matched.slice(0, 50).map(c => `
                <tr class="click" data-act="dd-view-column-detail" data-id="${esc(c.id)}">
                  <td><b>${esc(c.connName)}</b></td>
                  <td class="mono">${esc(c.tableName)}</td>
                  <td class="mono font-semibold">${esc(c.colName)}</td>
                  <td class="mono font-semibold">${c.conf}%</td>
                  <td>${renderRiskBadge(c.rk)}</td>
                  <td>${c.accepted ? pill("ok", "Auto-accepted") : pill("act", "Needs review")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${matched.length > 50 ? `
          <div class="dim" style="margin-top:8px;font-size:12px;text-align:center">
            Showing first 50 of ${matched.length} classified columns
          </div>
        ` : ''}
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  ACT["dd-view-column-detail"] = function(val, el) {
    const colId = el?.getAttribute("data-id") || val;
    const store = context.getStore();
    const allFindings = store.overviewFindings || [];
    const c = allFindings.find(f => f.id === colId);
    if (!c) return;
    const rv = reviewAll(allFindings).get(c.id);

    drawer(
      `Column Classification: ${esc(c.colName)}`,
      `Source: ${esc(c.connName)} · Table: ${esc(c.tableName)}`,
      `
        <dl class="kv">
          <dt>Source Connection</dt>
          <dd><b>${esc(c.connName)}</b> (${c.connType.toUpperCase()})</dd>
          <dt>Schema & Table</dt>
          <dd class="mono">${esc(c.tableName)}</dd>
          <dt>Column Name</dt>
          <dd class="mono"><b>${esc(c.colName)}</b></dd>
          <dt>Data Category</dt>
          <dd><span class="tag">${esc(c.cat)}</span></dd>
          <dt>Recognized PII Type</dt>
          <dd><b>${esc(c.type)}</b></dd>
          <dt>Recognizer Risk</dt>
          <dd>${renderRiskBadge(c.rk)}</dd>
          <dt>Confidence Score</dt>
          <dd>
            <div class="row" style="margin:0;gap:8px">
              <span class="mono font-semibold" style="font-size:14px">${c.conf}%</span>
              <div class="dd-range-track" style="width:100px">
                <div class="dd-range-bar" style="left:0;width:${c.conf}%"></div>
              </div>
            </div>
          </dd>
          <dt>Acceptance Status</dt>
          <dd>${c.accepted ? pill("ok", "Auto-accepted (confidence ≥" + REVIEW_THRESHOLD + "%)") : pill("act", "Steward review pending (<" + REVIEW_THRESHOLD + "% confidence)")}</dd>
          <dt>Sensitivity Class</dt>
          <dd>${classBadge(esc, rv.cls)} <span class="dim" style="font-size:12px">${esc(CLASSES[rv.cls].long)}</span></dd>
          <dt>Basis</dt>
          <dd style="font-size:12.5px">${esc(rv.basis)}</dd>
          ${rv.flags.length ? `<dt>Review Notes</dt><dd style="font-size:12.5px">${rv.flags.map(fl => esc(FLAG_TEXT[fl] || fl)).join("<br>")}</dd>` : ""}
          <dt>Data Masking Sample</dt>
          <dd class="mono" style="background:var(--surface-2);padding:4px 8px;border-radius:4px">${esc(c.sample)}</dd>
        </dl>

        <div class="row" style="margin-top:20px;padding-top:14px;border-top:1px solid var(--line);gap:8px">
          <button class="btn sm p" data-act="dd-nav-tab" data-arg="assets">View in Asset Inventory</button>
          <button class="btn sm o" data-act="close">Close</button>
        </div>
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  ACT.scan = function() {
    if (S && S.tab) {
      S.tab.discovery = "overview";
    }
    render();
    const box = $("#scanbox");
    if (!box) return;

    const steps = [
      "Connecting 12 sources (read-only credential verification)",
      "Profiling schemas, indexes and foreign-key metadata",
      "Classifying columns with confidence scores and sensitivity classes",
      "Comparing with last scan: 18 new assets, 3 new SPI fields",
      "Updating data map, ROPA links, and security risk scores"
    ];
    let i = 0;

    box.innerHTML = `
      <section class="card" style="margin-bottom:16px">
        <div class="card-h"><h3>Scan in progress</h3><span class="pill info">Active</span></div>
        <div class="card-b" id="scl"></div>
      </section>
    `;

    const tick = function() {
      const el = $("#scl");
      if (!el) return;
      el.innerHTML = steps.map(function(s, k) {
        return `
          <div class="row" style="margin-bottom:6px">
            ${k < i ? pill("ok", "Done") : k === i ? pill("info", "Running") : pill("n", "Queued")}
            <span style="font-size:13px">${s}</span>
          </div>
        `;
      }).join("");

      if (i < steps.length) {
        i++;
        setTimeout(tick, 700);
      } else {
        toast("Scan complete: 18 new assets, 3 new SPI fields");
        ledgerAdd("Discovery scan completed", "12 sources profiled · 18 new assets");
        setTimeout(function() {
          const b = $("#scanbox");
          if (b) b.innerHTML = "";
        }, 3000);
      }
    };
    tick();
  };
}
