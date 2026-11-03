// Run scan: simulated discovery scan across selected connections (demo only, no real connectivity)
import { canPerform, getUserRole } from "../discoveryConfig.js";

const SCAN_STAGES = ["Connecting", "Reading metadata", "Sampling rows in place", "Classifying PII", "Completed"];

const SCAN_TYPES = [
  ["incremental", "Incremental", "Only tables changed since the last scan"],
  ["full", "Full scan", "Every schema, table and file in the source"],
  ["sample", "Metadata + 1,000-row sample", "Fastest; values are evaluated in place"]
];

let activeScan = null; // { timer, rows, startedAt, type }

function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function registerScanActions(context, ACT) {
  const { D, bar, closeOv, esc, ledgerAdd, modal, nowT, pill, render, toast, ui } = context;

  function countCols(conn) {
    const cols = (conn.tables || []).flatMap(t => t.cols || []);
    return {
      tables: (conn.tables || []).length,
      cols: cols.length,
      pii: cols.filter(c => c.rk === "VH" || c.rk === "H").length
    };
  }

  function sourceRow(conn) {
    const c = countCols(conn);
    const kindTag = conn.kind === "U" ? '<span class="tag">Unstructured</span>' : '<span class="tag">Structured</span>';
    const meta = conn.kind === "U" ? "Files and documents" : `${c.tables} tables · ${c.cols} columns`;
    const neverScanned = conn.lastScanned === null ? ' <span class="pill info" style="font-size:10.5px">New · not scanned yet</span>' : "";
    return `
      <label class="row" style="gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer">
        <input type="checkbox" class="dd-scan-src" value="${esc(conn.id)}" checked style="width:auto">
        <span style="flex:1;min-width:0"><b>${esc(conn.name)}</b>${neverScanned}<span class="sub dim" style="display:block;font-size:12px">${esc(conn.type || "")} · ${meta}</span></span>
        ${kindTag}
      </label>`;
  }

  ACT["dd-run-scan"] = function() {
    const role = getUserRole(D);
    if (!canPerform(role, "create")) {
      toast("Your role can view scans but can't start one");
      return;
    }
    if (activeScan && activeScan.done) activeScan = null; // a finished scan whose summary was dismissed
    if (activeScan) {
      showProgressModal();
      return;
    }

    const store = context.getStore();
    const conns = store.connections || [];
    if (!conns.length) {
      toast("Add a connection before running a scan");
      ACT["dd-open-catalog"]();
      return;
    }

    const body = `
      <div class="field">
        <label for="dd_scan_type">Scan type</label>
        <select id="dd_scan_type">
          ${SCAN_TYPES.map(t => `<option value="${t[0]}">${t[1]} – ${t[2]}</option>`).join("")}
        </select>
      </div>
      <div class="row" style="justify-content:space-between;align-items:center;margin-top:6px">
        <div class="sec-t" style="margin:0">Sources · ${conns.length}</div>
        <label class="row" style="gap:6px;align-items:center;font-size:12.5px;cursor:pointer">
          <input type="checkbox" checked data-change-act="dd-scan-toggle-all" style="width:auto"> Select all
        </label>
      </div>
      <div id="dd-scan-src-list" style="max-height:320px;overflow:auto">${conns.map(sourceRow).join("")}</div>
      <div class="banner t" style="margin-top:10px"><span>Metadata-first: raw values are evaluated inside each source and are not copied into PrivacySEK.</span></div>
      <div id="dd-scan-err" class="dim" style="color:var(--block);font-size:12.5px;min-height:16px"></div>
    `;
    const foot = `
      <button class="btn sm o" data-act="close">Cancel</button>
      <button class="btn sm p" data-act="dd-start-scan">Start scan</button>
    `;
    modal("Run discovery scan", "Choose sources and scan depth", body, foot, "modal-wide");
  };

  ACT["dd-scan-toggle-all"] = function(checked) {
    document.querySelectorAll(".dd-scan-src").forEach(cb => { cb.checked = checked === "true"; });
  };

  ACT["dd-start-scan"] = function() {
    const ids = Array.from(document.querySelectorAll(".dd-scan-src:checked")).map(cb => cb.value);
    const errEl = document.getElementById("dd-scan-err");
    if (!ids.length) {
      if (errEl) errEl.textContent = "Select at least one source to scan.";
      return;
    }
    const type = document.getElementById("dd_scan_type")?.value || "incremental";
    const store = context.getStore();
    const rows = ids
      .map(id => store.connections.find(c => c.id === id))
      .filter(Boolean)
      .map((conn, i) => ({
        id: conn.id,
        name: conn.name,
        kind: conn.kind,
        pct: 0,
        // Stagger speeds so the bars don't move in lockstep
        speed: (type === "full" ? 6 : type === "sample" ? 16 : 10) + ((i * 7) % 9),
        // Sources with a recorded failure fail again (keeps the demo honest about failed tables)
        willFail: (conn.failed || 0) > 0,
        stage: 0
      }));

    activeScan = { rows, type, startedAt: Date.now(), done: false };
    showProgressModal();
    activeScan.timer = setInterval(tick, 350);
  };

  function stageFor(pct) {
    if (pct >= 100) return 4;
    if (pct >= 70) return 3;
    if (pct >= 35) return 2;
    if (pct >= 10) return 1;
    return 0;
  }

  function progressBody() {
    const s = activeScan;
    const overall = Math.round(s.rows.reduce((a, r) => a + r.pct, 0) / s.rows.length);
    const typeLabel = (SCAN_TYPES.find(t => t[0] === s.type) || SCAN_TYPES[0])[1];
    return `
      <div class="row" style="justify-content:space-between;align-items:center">
        <span><b>${typeLabel}</b> · ${s.rows.length} source${s.rows.length > 1 ? "s" : ""}</span>
        <span id="dd-scan-overall-label" class="mono">${overall}%</span>
      </div>
      <div id="dd-scan-overall">${bar(overall)}</div>
      <div style="display:grid;gap:10px;margin-top:12px">
        ${s.rows.map(r => `
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:center">
            <div style="min-width:0"><b>${esc(r.name)}</b><span class="dim" id="dd-scan-st-${esc(r.id)}" style="display:block;font-size:12px">${SCAN_STAGES[r.stage]}</span></div>
            <div id="dd-scan-bar-${esc(r.id)}">${bar(r.pct, r.failedNow ? "r" : "")}</div>
          </div>`).join("")}
      </div>
      <p class="dim" style="font-size:12px;margin-top:12px">You can close this window. The scan keeps running and you'll get a notification when it finishes.</p>
    `;
  }

  function showProgressModal() {
    if (!activeScan) return;
    if (activeScan.done) { showSummary(activeScan.summary); return; }
    modal(
      "Scan in progress",
      "Discovery scan · started " + timeNow(),
      `<div id="dd-scan-progress">${progressBody()}</div>`,
      `<button class="btn sm o" data-act="close">Run in background</button>`,
      "modal-wide"
    );
  }

  function tick() {
    const s = activeScan;
    if (!s) return;
    s.rows.forEach(r => {
      if (r.pct >= 100) return;
      const limit = r.willFail ? 82 : 100;
      r.pct = Math.min(limit, r.pct + r.speed * (0.6 + Math.random() * 0.8));
      r.pct = Math.round(r.pct);
      r.stage = stageFor(r.pct);
      if (r.willFail && r.pct >= 82) { r.pct = 100; r.stage = 4; r.failedNow = true; }
    });

    const wrap = document.getElementById("dd-scan-progress");
    if (wrap) wrap.innerHTML = progressBody();
    s.rows.forEach(r => {
      const st = document.getElementById("dd-scan-st-" + r.id);
      if (st && r.failedNow) st.textContent = "Completed with 1 failed table (permission denied)";
    });

    if (s.rows.every(r => r.pct >= 100)) finishScan();
  }

  function finishScan() {
    const s = activeScan;
    clearInterval(s.timer);
    const store = context.getStore();
    const stamp = nowT();
    const label = "Today " + timeNow();
    let tables = 0, cols = 0, pii = 0, newPii = 0, failedSources = 0;

    s.rows.forEach(r => {
      const conn = store.connections.find(c => c.id === r.id);
      if (!conn) return;
      const c = countCols(conn);
      tables += c.tables; cols += c.cols; pii += c.pii;
      if (conn.lastScanned === null) newPii += c.pii; // first scan of a source added in the demo surfaces new findings
      conn.lastScanned = stamp;
      conn.updated = stamp;
      conn.status = r.failedNow ? "risk" : "ok";
      if (r.failedNow) failedSources += 1;
    });

    store.lastScan = label;
    const typeLabel = (SCAN_TYPES.find(t => t[0] === s.type) || SCAN_TYPES[0])[1];
    const secs = Math.max(1, Math.round((Date.now() - s.startedAt) / 1000));
    store.jobs = store.jobs || [];
    store.jobs.unshift({
      id: `j-manual-${Date.now()}`,
      name: `Manual_${s.type}_scan`,
      src: s.rows.length === 1 ? s.rows[0].name : `${s.rows.length} sources`,
      type: s.rows.every(r => r.kind === "U") ? "File Store" : s.rows.every(r => r.kind === "S") ? "Database" : "Mixed",
      dur: `${secs}s`,
      cron: "",
      samp: s.type !== "full",
      cr: stamp,
      up: stamp,
      st: failedSources ? "Completed with errors" : "Completed"
    });
    context.saveStore(store);

    const summary = { sources: s.rows.length, tables, cols, pii, newPii, failedSources, typeLabel, label };
    s.done = true;
    s.summary = summary;

    ledgerAdd("Discovery scan completed", `${summary.sources} sources · ${typeLabel} · ${pii} PII columns`);
    toast(`Scan finished: ${summary.sources} sources, ${newPii ? newPii + " new PII columns" : "no new PII types"}`);

    // Refresh the page behind (render only touches #content, never the open modal)
    const progressOpen = Boolean(document.getElementById("dd-scan-progress"));
    render();
    if (progressOpen) showSummary(summary);
    else activeScan = null;
  }

  function showSummary(sm) {
    const body = `
      <div class="g g4" style="gap:10px">
        <div class="clock"><small>Sources scanned</small><b>${sm.sources}</b></div>
        <div class="clock"><small>Tables profiled</small><b>${sm.tables.toLocaleString()}</b></div>
        <div class="clock"><small>PII columns</small><b>${sm.pii.toLocaleString()}</b></div>
        <div class="clock ${sm.newPii ? "hot" : ""}"><small>New since last scan</small><b>${sm.newPii}</b></div>
      </div>
      <dl class="kv" style="margin-top:12px">
        <dt>Scan type</dt><dd>${esc(sm.typeLabel)}</dd>
        <dt>Finished</dt><dd>${esc(sm.label)}</dd>
        <dt>Result</dt><dd>${sm.failedSources ? pill("risk", sm.failedSources + " source(s) had a failed table (permission denied). Check its credentials in Connections") : pill("ok", "All sources scanned successfully")}</dd>
      </dl>
      <div class="banner t"><span>The Overview shows the new scan time, and the run is listed under Jobs. It is also recorded in the Proof Ledger.</span></div>
    `;
    const foot = `
      <button class="btn sm o" data-act="dd-scan-close">Close</button>
      <button class="btn sm p" data-act="dd-scan-view-overview">View overview</button>
    `;
    modal("Scan complete", "Discovery scan summary", body, foot, "modal-wide");
  }

  ACT["dd-scan-close"] = function() {
    activeScan = null;
    closeOv();
    render();
  };

  ACT["dd-scan-view-overview"] = function() {
    activeScan = null;
    closeOv();
    ACT.tab("discovery|overview");
  };
}
