// Panels shared by the Discovery tabs, built on the model from discoveryInsights.js.
// Drill-downs use data-act="dd-drill": data-arg is the target tab, data-key/data-val an optional
// Detections filter and data-view an optional sub-view.
import { CLASSES, REVIEW_THRESHOLD, TYPE_POLICY, assetLabelPolicy, postureKind, priorityFindings } from "./discoveryInsights.js";
import { RISK_LEVELS } from "../discoveryConfig.js";

const fmt = n => Number(n || 0).toLocaleString();
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const RISK_LABEL = { VH: "Very High", H: "High", M: "Medium", L: "Low" };
export const RISK_COLORS = { VH: "#d64545", H: "#e8a020", M: "#2459C9", L: "#2fcf7c" };

export function drillAttrs(esc, tab, key, val, view) {
  return `data-act="dd-drill" data-arg="${esc(tab)}"${key ? ` data-key="${esc(key)}" data-val="${esc(val || "")}"` : ""}${view ? ` data-view="${esc(view)}"` : ""}`;
}

export function classBadge(esc, cls) {
  const c = CLASSES[cls] || CLASSES.PII;
  return `<span class="dd-cls dd-cls-${c.key}" title="${esc(c.def)}">${esc(c.label)}</span>`;
}

// Inventory label shown with its policy class (the inventory tag can be out of date)
export function assetClassTag(esc, label, seedTag) {
  const pol = assetLabelPolicy(label);
  const cls = pol ? pol.cls : (seedTag === "spi" ? "SPI" : "PII");
  const title = esc(pol ? pol.basis : "No classification policy for this label");
  if (cls === "VERIFY") return `<span class="tag dd-tag-verify" title="${title}">${esc(label)} · verify</span>`;
  if (cls === "POT") return `<span class="tag" title="Potential PII · ${title}">${esc(label)}</span>`;
  return `<span class="tag ${cls === "SPI" ? "spi" : "pii"}" title="${CLASSES[cls].label} · ${title}">${esc(label)}</span>`;
}

export function riskBadge(rkKey) {
  const rk = RISK_LEVELS[rkKey] || RISK_LEVELS.L;
  return `<span class="dd-risk-badge ${rk.key}">● ${rk.label}</span>`;
}

export function panelHead(title, sub, right = "") {
  return `
    <div class="dd-ov-head">
      <div><h3>${title}</h3>${sub ? `<span class="dd-ov-sub">${sub}</span>` : ""}</div>
      ${right ? `<div class="dd-ov-head-r">${right}</div>` : ""}
    </div>`;
}

// Segmented sub-navigation inside a tab (reuses the catalog segmented control)
export function subNav(esc, key, current, items) {
  return `
    <div class="dd-subnav">
      <div class="dd-cat-seg" role="tablist" aria-label="Sections">
        ${items.map(([id, label, count]) => `
          <button role="tab" class="${current === id ? "active" : ""}" aria-selected="${current === id}" data-act="dd-set-view" data-arg="${esc(key)}:${esc(id)}">
            ${esc(label)}${count !== undefined ? ` <span>${esc(String(count))}</span>` : ""}
          </button>`).join("")}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------------------------
export function renderKpiStrip(ctx, k) {
  const { esc } = ctx;
  const tile = (val, label, sub, attrs, cls = "") => `
    <button type="button" class="dd-inventory-tile card kpi ${cls}" ${attrs}>
      <span class="dd-inv-val"><b>${val}</b></span>
      <span class="dd-inv-label">${label}</span>
      <span class="dd-inv-sub">${sub}</span>
    </button>`;
  return `
    <div class="dd-inventory-grid dd-kpi-strip">
      ${tile(k.sources, "Data sources", k.unhealthy ? `<span class="dd-dot-warn"></span>${k.unhealthy} need attention` : "All healthy", drillAttrs(esc, "connections"))}
      ${tile(fmt(k.columnsScanned), "Columns scanned", `${k.tables} tables · ${k.schemas} schemas`, drillAttrs(esc, "assets"))}
      ${tile(fmt(k.personal), "Personal data columns", "PII and SPI", drillAttrs(esc, "detections"))}
      ${tile(fmt(k.spi), "SPI columns", k.spiVerify ? `${fmt(k.spiVerify)} to verify location` : "All in expected systems", drillAttrs(esc, "detections", "cls", "SPI"))}
      ${tile(fmt(k.review), "Needs review", `Potential PII · ${fmt(k.lowConf)} low confidence`, drillAttrs(esc, "detections", "cls", "POT"))}
      ${tile(k.failedTables, "Unclassified", k.failedTables ? "Tables not evaluated" : "Nothing skipped", 'data-act="dd-view-failed-tables"', k.failedTables ? "dd-kpi-warn" : "")}
    </div>`;
}

export function renderPriorityFindings(ctx, m) {
  const { esc } = ctx;
  const items = priorityFindings(m);
  const shown = items.slice(0, 6);
  const SEV = { act: ["act", "Critical"], risk: ["risk", "High"], med: ["med", "Medium"] };
  return `
    <div class="card dd-ov-card">
      ${panelHead("Priority findings", `${items.length} open items, most severe first`,
        `<button class="btn sm o" ${drillAttrs(esc, "posture", null, null, "findings")}>All findings</button>`)}
      <ul class="dd-prio">
        ${shown.map(it => {
          const g = it.go;
          return `
            <li>
              <button type="button" class="dd-prio-row" ${drillAttrs(esc, g.tab, g.key, g.val, g.view)}>
                <span class="dd-sev-tag ${SEV[it.sev][0]}">${SEV[it.sev][1]}</span>
                <span class="dd-prio-main">
                  <b>${esc(it.title)}</b>
                  <small><span class="dd-domain ${it.domain}">${it.domain === "privacy" ? "Privacy" : "Security"}</span>${esc(it.where)} · ${esc(it.meta)}</small>
                </span>
                <span class="dd-prio-go" aria-hidden="true">›</span>
              </button>
            </li>`;
        }).join("")}
      </ul>
    </div>`;
}

export function renderClassMini(ctx, m) {
  const { esc } = ctx;
  const s = m.summary;
  const parts = [["SPI", s.counts.SPI], ["PII", s.counts.PII], ["POT", s.counts.POT], ["NON", s.counts.NON + m.noMatch]];
  const total = parts.reduce((a, p) => a + p[1], 0);
  const reclassified = s.corrections.reduce((a, c) => a + c.count, 0);
  return `
    <div class="card dd-ov-card">
      ${panelHead("Sensitivity mix", `${fmt(total)} scanned columns`, `<button class="btn sm o" ${drillAttrs(esc, "classification")}>Details</button>`)}
      <div class="dd-seg-bar" role="img" aria-label="${parts.map(p => `${CLASSES[p[0]].label} ${p[1]}`).join(", ")}">
        ${parts.map(p => `<span class="dd-seg dd-seg-${p[0]}" style="flex-grow:${p[1]}" title="${CLASSES[p[0]].label}: ${fmt(p[1])} (${pct(p[1], total)}%)"></span>`).join("")}
      </div>
      <div class="dd-mini-legend">
        ${parts.map(p => `
          <button type="button" class="dd-mini-row" ${p[0] === "NON" ? drillAttrs(esc, "classification") : drillAttrs(esc, "detections", "cls", p[0])} title="${esc(CLASSES[p[0]].def)}">
            <span class="dd-swatch dd-seg-${p[0]}"></span>
            <span>${CLASSES[p[0]].long}</span>
            <b class="mono">${fmt(p[1])}</b>
            <small class="mono">${pct(p[1], total)}%</small>
          </button>`).join("")}
      </div>
      <p class="dd-ov-note">${fmt(reclassified)} detections reclassified on review · ${fmt(s.outOfContextTotal)} SPI to verify location</p>
    </div>`;
}

export function renderExposureSignals(ctx, m) {
  const { esc } = ctx;
  const SIGNALS = [
    ["public", "Public", "security"], ["unencryptedsensitivecolumn", "Unencrypted", "security"], ["overbroadaccess", "Over-broad access", "security"],
    ["unowned", "No owner", "security"], ["abroad", "Outside India", "privacy"], ["retentionbeyondschedule", "Past retention", "privacy"]
  ];
  const count = k => m.exposure.filter(e => e.signals.some(s => s.k === k)).length;
  return `
    <div class="card dd-ov-card">
      ${panelHead("Exposure signals", `Assets affected, of ${m.exposure.length} inventoried`, `<button class="btn sm o" ${drillAttrs(esc, "posture", null, null, "exposure")}>Details</button>`)}
      <div class="dd-sig-grid">
        ${SIGNALS.map(([k, label, domain]) => {
          const n = count(k);
          return `
            <button type="button" class="dd-sig ${n ? domain : "none"}" ${drillAttrs(esc, "posture", null, null, "exposure")}>
              <b class="mono">${n}</b><span>${label}</span>
            </button>`;
        }).join("")}
      </div>
    </div>`;
}

export function renderSpiBySource(ctx, m) {
  const { esc } = ctx;
  const rows = m.bySource.slice().sort((a, b) => b.SPI - a.SPI);
  const max = Math.max(1, ...rows.map(r => r.SPI + r.PII));
  return `
    <div class="card dd-ov-card">
      ${panelHead("Personal data by source", "Columns per source · click a source to see its detections")}
      <div class="dd-hbar-key"><span><i class="dd-swatch dd-seg-SPI"></i>SPI</span><span><i class="dd-swatch dd-seg-PII"></i>PII</span></div>
      <div class="dd-hbar">
        ${rows.map(r => `
          <button type="button" class="dd-hbar-row" ${drillAttrs(esc, "detections", "conn", r.key)} title="${esc(r.key)}: ${r.SPI} SPI, ${r.PII} PII">
            <span class="dd-hbar-label">${esc(r.key)}</span>
            <span class="dd-hbar-track dd-hbar-stack">
              <span class="dd-hbar-fill dd-seg-SPI" style="width:${(r.SPI / max) * 100}%"></span>
              <span class="dd-hbar-fill dd-seg-PII" style="width:${(r.PII / max) * 100}%"></span>
            </span>
            <span class="dd-hbar-val mono">${fmt(r.SPI)} / ${fmt(r.PII)}</span>
          </button>`).join("")}
      </div>
    </div>`;
}

export function renderTrend(ctx, trend) {
  const { esc } = ctx;
  if (!trend || !trend.length) return "";
  const tMin = Math.min(...trend.map(p => p.cols));
  const tMax = Math.max(...trend.map(p => p.cols));
  const tLo = Math.floor((tMin - 20) / 50) * 50;
  const tHi = Math.ceil((tMax + 10) / 50) * 50;
  const TW = 460, TH = 170, PL = 42, PR = 10, PT = 10, PB = 22;
  const tx = i => PL + (i / Math.max(1, trend.length - 1)) * (TW - PL - PR);
  const ty = v => PT + (1 - (v - tLo) / Math.max(1, tHi - tLo)) * (TH - PT - PB);
  const ticks = [tLo, Math.round((tLo + tHi) / 2), tHi];
  const path = trend.map((p, i) => `${i ? "L" : "M"}${tx(i).toFixed(1)},${ty(p.cols).toFixed(1)}`).join(" ");
  const area = `${path} L${tx(trend.length - 1).toFixed(1)},${TH - PB} L${tx(0).toFixed(1)},${TH - PB} Z`;
  const first = trend[0], last = trend[trend.length - 1];
  const w = (TW - PL - PR) / Math.max(1, trend.length - 1);
  return `
    <div class="card dd-ov-card">
      ${panelHead("Detections over 30 days", `Columns with personal data · <b class="dd-up">+${fmt(last.cols - first.cols)}</b> since ${esc(first.date)}`)}
      <svg class="dd-trend" viewBox="0 0 ${TW} ${TH}" role="img" aria-label="Detections rose from ${first.cols} to ${last.cols} columns over 30 days">
        ${ticks.map(v => `
          <line x1="${PL}" x2="${TW - PR}" y1="${ty(v).toFixed(1)}" y2="${ty(v).toFixed(1)}" class="dd-trend-grid"/>
          <text x="${PL - 6}" y="${(ty(v) + 3).toFixed(1)}" text-anchor="end" class="dd-trend-axis">${fmt(v)}</text>`).join("")}
        <path d="${area}" class="dd-trend-area"/>
        <path d="${path}" class="dd-trend-line"/>
        ${trend.map((p, i) => p.scan ? `<circle cx="${tx(i).toFixed(1)}" cy="${ty(p.cols).toFixed(1)}" r="4" class="dd-trend-dot"/>` : "").join("")}
        <text x="${tx(0).toFixed(1)}" y="${TH - 6}" class="dd-trend-axis">${esc(first.date)}</text>
        <text x="${tx(trend.length - 1).toFixed(1)}" y="${TH - 6}" text-anchor="end" class="dd-trend-axis">${esc(last.date)}</text>
        ${trend.map((p, i) => `<rect x="${(tx(i) - w / 2).toFixed(1)}" y="${PT}" width="${w.toFixed(1)}" height="${TH - PT - PB}" class="dd-trend-hit"><title>${esc(p.date)}: ${fmt(p.cols)} columns${p.scan ? " · " + esc(p.scan) : ""}</title></rect>`).join("")}
      </svg>
      <div class="dd-trend-legend"><span><i class="dd-trend-key-line"></i>Columns with personal data</span><span><i class="dd-trend-key-dot"></i>Scan with new detections</span></div>
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Classification tab
// ---------------------------------------------------------------------------------------------
export function renderClassification(ctx, m) {
  const { esc } = ctx;
  const s = m.summary;
  const parts = [["SPI", s.counts.SPI], ["PII", s.counts.PII], ["POT", s.counts.POT], ["NON", s.counts.NON + m.noMatch]];
  const total = parts.reduce((a, p) => a + p[1], 0);

  const legend = parts.map(([k, n]) => `
    <button type="button" class="dd-cls-row" ${k === "NON" ? `data-act="dd-drill" data-arg="detections" data-key="cls" data-val="NON"` : drillAttrs(esc, "detections", "cls", k)}>
      <span class="dd-swatch dd-seg-${k}"></span>
      <span class="dd-cls-name"><b>${CLASSES[k].long}</b><small>${esc(CLASSES[k].def)}</small></span>
      <span class="dd-cls-num"><b>${fmt(n)}</b><small>${pct(n, total)}%</small></span>
    </button>`).join("");

  return `
    <div class="card dd-ov-card">
      ${panelHead("Sensitivity classification", `All ${fmt(total)} scanned columns · click a class to see its detections`)}
      <div class="dd-seg-bar dd-seg-bar-lg" role="img" aria-label="${parts.map(p => `${CLASSES[p[0]].label} ${p[1]}`).join(", ")}">
        ${parts.map(p => `<span class="dd-seg dd-seg-${p[0]}" style="flex-grow:${p[1]}" title="${CLASSES[p[0]].label}: ${fmt(p[1])} (${pct(p[1], total)}%)"></span>`).join("")}
      </div>
      <div class="dd-cls-legend">${legend}</div>
      ${m.kpis.failedTables ? `<p class="dd-ov-note"><b>Unclassified:</b> ${m.kpis.failedTables} tables failed during the scan and were not evaluated. <button class="btn sm link" data-act="dd-view-failed-tables">See why</button></p>` : ""}
    </div>`;
}

export function renderRiskConfidence(ctx, m) {
  const { esc } = ctx;
  const f = m.findings;
  const n = f.length;
  const risk = { VH: 0, H: 0, M: 0, L: 0 };
  f.forEach(x => { if (risk[x.rk] !== undefined) risk[x.rk]++; });
  const bands = [
    ["90%–100%", f.filter(x => x.conf >= 90).length, "var(--allow)", "90"],
    ["80%–89%", f.filter(x => x.conf >= 80 && x.conf < 90).length, "var(--accent)", "80"],
    ["Below 80%", f.filter(x => x.conf < 80).length, "var(--block)", "review"]
  ];
  const auto = bands[0][1] + bands[1][1];
  return `
    <div class="card dd-ov-card">
      ${panelHead("Recognizer risk & confidence", "Risk level is set by the recognizer and is separate from the sensitivity class")}
      <div class="dd-stack" role="img" aria-label="${Object.keys(risk).map(k => `${RISK_LABEL[k]} ${risk[k]}`).join(", ")}">
        ${Object.keys(risk).map(k => `<span style="flex-grow:${risk[k]};background:${RISK_COLORS[k]}" title="${RISK_LABEL[k]}: ${risk[k]}"></span>`).join("")}
      </div>
      <div class="dd-risk-legend">
        ${Object.keys(risk).map(k => `
          <button type="button" ${drillAttrs(esc, "detections", "rk", k)}>
            <i style="background:${RISK_COLORS[k]}"></i>${RISK_LABEL[k]}<b class="mono">${fmt(risk[k])}</b>
          </button>`).join("")}
      </div>
      <div class="dd-ov-sec">Detection confidence</div>
      <div class="dd-band-list">
        ${bands.map(([label, c, color, val]) => `
          <div class="dd-band-row" ${drillAttrs(esc, "detections", "minConf", val)} role="button" tabindex="0">
            <b style="font-size:12px">${label}</b>
            <div class="dd-band-bar-track"><div class="dd-band-bar-fill" style="width:${pct(c, n)}%;background:${color}"></div></div>
            <span class="mono" style="text-align:right">${Math.round(pct(c, n))}% (${fmt(c)})</span>
          </div>`).join("")}
      </div>
      <p class="dd-ov-note"><b>${Math.round(pct(auto, n))}% classification accuracy</b>: detections auto-accepted at ${REVIEW_THRESHOLD}% confidence or higher (org policy). The rest go to steward review.</p>
    </div>`;
}

export function renderPolicyTable(ctx, m) {
  const { esc } = ctx;
  const byType = {};
  m.findings.forEach(f => {
    if (!byType[f.type]) byType[f.type] = { type: f.type, n: 0, rk: f.rk, ooc: 0, low: 0 };
    const t = byType[f.type];
    t.n++;
    if (f.rk === "VH" || (f.rk === "H" && t.rk !== "VH")) t.rk = f.rk;
    const fl = m.reviews.get(f.id).flags;
    if (fl.includes("out-of-context")) t.ooc++;
    if (fl.includes("low-confidence")) t.low++;
  });
  const order = { SPI: 0, PII: 1, POT: 2, NON: 3 };
  const rows = Object.values(byType)
    .map(t => ({ ...t, pol: TYPE_POLICY[t.type] || { cls: "PII", basis: "No review policy" } }))
    .sort((a, b) => (order[a.pol.cls] - order[b.pol.cls]) || (b.n - a.n));
  return `
    <div class="card" style="padding:0;overflow:hidden">
      <div class="dd-ov-card" style="padding-bottom:0">${panelHead("Classification policy", "How each detected type is classified, and why · click a row to see its columns")}</div>
      <div class="tw">
        <table class="t">
          <thead><tr><th>Data type</th><th>Class</th><th>Basis</th><th style="text-align:right">Columns</th><th>To check</th></tr></thead>
          <tbody>
            ${rows.map(t => `
              <tr class="click" data-act="dd-view-pii-type-drawer" data-arg="${esc(t.type)}">
                <td><b>${esc(t.type)}</b></td>
                <td>${classBadge(esc, t.pol.cls)}</td>
                <td class="dd-ov-sub" style="color:var(--text-2)">${esc(t.pol.basis)}</td>
                <td class="mono" style="text-align:right">${fmt(t.n)}</td>
                <td>${[t.ooc ? `<span class="dd-verify">${t.ooc} location</span>` : "", t.low ? `<span class="dd-verify">${t.low} low confidence</span>` : ""].filter(Boolean).join(" · ") || '<span class="dd-ov-sub">—</span>'}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Assets tab: coverage by source
// ---------------------------------------------------------------------------------------------
export function renderCoverage(ctx, m, bySourceSeed) {
  const { esc } = ctx;
  return `
    <div class="card dd-ov-card" style="margin-bottom:16px">
      ${panelHead("Coverage by source", "Terabytes scanned and terabytes holding personal data · click a source to see its detections")}
      <div class="dd-conn-coverage-list">
        ${bySourceSeed.map(([name, type, tb, tbPii, schemas, tables, cols]) => {
          const fill = Math.round((tbPii / tb) * 100);
          const spi = (m.bySource.find(b => b.key === name) || {}).SPI || 0;
          return `
            <div class="dd-conn-cov-row" ${drillAttrs(esc, "detections", "conn", name)} role="button" tabindex="0">
              <div><b style="font-size:13px;display:block">${esc(name)}</b><span class="dim mono" style="font-size:11.5px">${esc(type.toUpperCase())}</span></div>
              <div><div class="dd-cov-dual-bar"><div class="dd-cov-bar-fill" style="width:${fill}%"></div></div></div>
              <div style="text-align:right"><b class="mono" style="font-size:13px">${tb} / ${tbPii} TB</b><span class="dim" style="font-size:11px;display:block">(${fill}% personal data)</span></div>
              <div class="row" style="margin:0;justify-content:flex-end;gap:6px">
                <span class="tag">${schemas} schemas</span><span class="tag">${tables} tables</span><span class="tag">${cols} detections</span>
                ${spi ? `<span class="tag spi">${spi} SPI</span>` : ""}
              </div>
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Risk & posture tab: exposure, access & activity
// ---------------------------------------------------------------------------------------------
function riskItem(sev, title, detail) {
  return `
    <li class="dd-risk-item">
      <span class="dd-risk-sev ${sev}" aria-hidden="true"></span>
      <div><b>${title}</b><small>${detail}</small></div>
    </li>`;
}

export function renderPrivacySecurity(ctx, m) {
  const { esc, pill } = ctx;
  const { summary, exposure, posture, credentials, secondaryUse } = m;
  const abroad = exposure.filter(e => e.signals.some(s => s.k === "abroad"));
  const privacyPosture = posture.filter(f => !f.done && postureKind(f).domain === "privacy");
  const securityPosture = posture.filter(f => !f.done && postureKind(f).domain === "security");
  const unowned = exposure.filter(e => e.signals.some(s => s.k === "unowned"));

  const privacyItems = [
    abroad.length && riskItem("risk", `${abroad.length} assets with personal data stored outside India`,
      abroad.map(e => `${esc(e.asset.n)} (${esc(e.asset.loc)})`).join(" · ") + ". Confirm each transfer is recorded in the ROPA; DPDP s.16 restricts only notified countries."),
    privacyPosture.map(f => riskItem(f.sev, esc(f.n), `${esc(f.a)} · open ${esc(f.age)}`)).join(""),
    summary.outOfContextTotal && riskItem("risk", `${fmt(summary.outOfContextTotal)} SPI detections outside their expected systems`,
      "Possible copies beyond the purpose they were collected for. Verify before relying on the SPI count."),
    secondaryUse && riskItem("risk", `${fmt(secondaryUse)} SPI ${secondaryUse === 1 ? "column" : "columns"} in analytics or ML schemas`,
      "Identity or payment data in a secondary-use system is a purpose-limitation question.")
  ].filter(Boolean).join("");

  const securityItems = [
    securityPosture.map(f => riskItem(f.sev, esc(f.n), `${esc(f.a)} · ${esc(postureKind(f).kind)} · open ${esc(f.age)}`)).join(""),
    credentials && riskItem("risk", `${fmt(credentials)} password-hash columns outside an identity store`,
      "Credentials copied into business tables widen what a single leak exposes."),
    unowned.length && riskItem("risk", `${unowned.length} sensitive ${unowned.length === 1 ? "asset has" : "assets have"} no owner`,
      unowned.map(e => esc(e.asset.n)).join(" · ") + ". Nobody is accountable for access reviews.")
  ].filter(Boolean).join("");

  return `
    <div class="dd-ov-pair">
      <div class="card dd-ov-card">
        ${panelHead("Privacy risks", "Is personal data handled lawfully: purpose, location, retention")}
        <ul class="dd-risk-list" style="margin-top:0">${privacyItems || `<li class="dd-ov-note">No open privacy risks.</li>`}</ul>
      </div>
      <div class="card dd-ov-card">
        ${panelHead("Security risks", "Is the data protected: exposure, encryption, access, secrets")}
        <div class="dd-sev-sum">
          <div><b>${securityPosture.filter(f => f.sev === "act").length}</b><span>${pill("act", "Critical")}</span></div>
          <div><b>${securityPosture.filter(f => f.sev === "risk").length}</b><span>${pill("risk", "High")}</span></div>
          <div><b>${fmt(credentials)}</b><span class="dd-ov-sub">credentials outside an identity store</span></div>
        </div>
        <ul class="dd-risk-list">${securityItems || `<li class="dd-ov-note">No open security findings.</li>`}</ul>
      </div>
    </div>`;
}

export function renderExposure(ctx, exposure) {
  const { esc, sevPill } = ctx;
  const SIGNALS = [
    ["public", "Public"], ["unencryptedsensitivecolumn", "Unencrypted"], ["overbroadaccess", "Over-broad access"],
    ["unowned", "No owner"], ["abroad", "Outside India"], ["retentionbeyondschedule", "Past retention"]
  ];
  const flagged = exposure.filter(e => e.signals.length).length;
  return `
    <div class="card dd-ov-card">
      ${panelHead("Sensitive data exposure", `${flagged} of ${exposure.length} inventoried assets have an exposure signal`)}
      <div class="dd-exp-legend">
        <span><span class="dd-exp-dot security"></span>Security signal</span>
        <span><span class="dd-exp-dot privacy"></span>Privacy signal</span>
        <span class="dd-ov-sub">From asset location and owner, matched to open posture findings.</span>
      </div>
      <div class="tw">
        <table class="t dd-exp-table">
          <thead><tr><th>Asset</th><th>Sensitivity</th><th>SPI held</th>${SIGNALS.map(s => `<th class="dd-exp-cell">${s[1]}</th>`).join("")}</tr></thead>
          <tbody>
            ${exposure.map(e => `
              <tr>
                <td><b class="mono">${esc(e.asset.n)}</b><small class="dd-ov-sub" style="display:block">${esc(e.asset.src)}</small></td>
                <td>${sevPill(e.asset.sens)}</td>
                <td><div class="tags">${e.spi.map(x => `<span class="tag spi">${esc(x)}</span>`).join("")}${(e.verify || []).map(x => `<span class="tag dd-tag-verify" title="Biometric status unconfirmed">${esc(x)} · verify</span>`).join("")}${!e.spi.length && !(e.verify || []).length ? '<span class="dd-ov-sub">None</span>' : ""}</div></td>
                ${SIGNALS.map(([k, label]) => {
                  const sig = e.signals.find(s => s.k === k);
                  return `<td class="dd-exp-cell">${sig ? `<span class="dd-exp-dot ${sig.domain}" title="${esc(label)} · ${sig.domain} risk" aria-label="${esc(label)}"></span>` : '<span class="dd-exp-none" aria-label="No">·</span>'}</td>`;
                }).join("")}
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

export function renderAccessActivity(ctx, m) {
  const { esc, pill } = ctx;
  const accessFindings = m.posture.filter(f => !f.done && postureKind(f).kind === "Over-broad access");
  const DEC = { block: "act", approve: "risk", mix: "risk" };
  const g = m.guard;
  return `
    <div class="dd-ov-pair">
      <div class="card dd-ov-card">
        ${panelHead("Who can access sensitive data", "Users, groups and service accounts on assets that hold SPI", `<span class="dd-status-off"><i></i>Not connected</span>`)}
        ${accessFindings.length ? `
          <div class="dd-ov-sec" style="margin-top:0">From scan metadata</div>
          <ul class="dd-risk-list" style="margin-top:0">
            ${accessFindings.map(f => riskItem(f.sev, esc(f.n), `${esc(f.a)} · open ${esc(f.age)}`)).join("")}
          </ul>` : ""}
        <div class="dd-gap">
          <b>Connect permission sources to see who has access</b>
          <p>A per-asset access view needs entitlement data:</p>
          <ul>
            <li>Database grants (PostgreSQL, Oracle, SAP HANA roles)</li>
            <li>Cloud IAM and bucket policies (AWS, Azure RBAC, GCP)</li>
            <li>File sharing permissions (Google Drive, OneDrive)</li>
            <li>Directory groups to resolve who is in each role</li>
          </ul>
        </div>
      </div>

      <div class="card dd-ov-card">
        ${panelHead("Purpose Guard decisions", "Requests for sensitive data that data-flow policies blocked or held", `<button class="btn sm o" data-go="guard">Open Purpose Guard</button>`)}
        ${g.events.length ? `
          <div class="dd-ov-sec" style="margin-top:0">Blocked or held <span class="dd-ov-sub">${g.events.length} of the last ${g.feedSize} decisions</span></div>
          <ul class="dd-act-list">
            ${g.events.map(e => `
              <li>
                <span class="mono dd-ov-sub">${esc(e.time)}</span>
                <div><b>${esc(e.what)}</b><small>${esc(e.who)} → ${esc(e.dest)} · ${esc(e.records)} records</small></div>
                ${pill(DEC[e.decision] || "n", esc(e.label))}
              </li>`).join("")}
          </ul>` : ""}
        ${g.approvals.length ? `
          <div class="dd-ov-sec">Waiting for approval</div>
          <ul class="dd-act-list">
            ${g.approvals.map(a => `
              <li>
                <span class="mono dd-ov-sub">${esc(a.age)}</span>
                <div><b>${esc(a.n)}</b><small>${esc(a.by)} · ${esc(a.risk)}</small></div>
                ${pill("risk", "Pending")}
              </li>`).join("")}
          </ul>` : ""}
        <p class="dd-ov-note">These are policy decisions on requested data flows, not detected misuse. Anomaly detection needs database audit logs, cloud access logs and a behavioural baseline, which aren't connected.</p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Overview hero: sensitivity footprint and classification accuracy
// ---------------------------------------------------------------------------------------------
// parts: [{ key, label, value, color, act? }]; rest: { label, value } for the non-sensitive remainder
export function renderFootprint(ctx, o) {
  const { esc } = ctx;
  const total = o.parts.reduce((a, p) => a + p.value, 0) + o.rest.value;
  const pctOf = v => (total ? (v / total) * 100 : 0);
  return `
    <div class="card dd-ov-card">
      ${panelHead(esc(o.title), esc(o.sub))}
      <div class="dd-fp-stats">
        ${o.stats.map(s => `
          <div class="dd-fp-stat">
            <b class="${s.tone || ""}">${s.value}</b>
            <span>${s.label}</span>
          </div>`).join("")}
      </div>
      <div class="dd-fp-bar" role="img" aria-label="${o.parts.map(p => `${p.label} ${p.display}`).join(", ")}, ${esc(o.rest.label)} ${esc(o.rest.display)}">
        ${o.parts.map(p => `<span class="dd-fp-seg" style="flex-grow:${p.value};background:${p.color}" ${p.attrs || ""} title="${esc(p.label)}: ${esc(p.display)} (${pctOf(p.value).toFixed(1)}%)"></span>`).join("")}
        <span class="dd-fp-rest" style="flex-grow:${o.rest.value}" title="${esc(o.rest.label)}: ${esc(o.rest.display)}">${esc(o.rest.display)} ${esc(o.rest.label)}</span>
      </div>
      <div class="dd-fp-legend">
        ${o.parts.map(p => `
          <button type="button" class="dd-fp-key" ${p.attrs || ""}>
            <i style="background:${p.color}"></i><span>${esc(p.label)}</span><b class="mono">${esc(p.display)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ""}
          </button>`).join("")}
      </div>
      ${o.foot ? `<p class="dd-ov-note">${o.foot}</p>` : ""}
    </div>`;
}

export function renderAccuracy(ctx, o) {
  const len = 172.78;
  return `
    <div class="card dd-ov-card dd-acc-card">
      ${panelHead("Classification accuracy", o.sub)}
      <div class="dd-acc-gauge">
        <svg viewBox="0 0 140 85" width="168" height="102" role="img" aria-label="Classification accuracy ${o.pct}%">
          <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="var(--surface-2)" stroke-width="12" stroke-linecap="round"/>
          <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="var(--allow)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${len}" stroke-dashoffset="${(len * (1 - o.pct / 100)).toFixed(2)}"/>
          <text x="70" y="68" text-anchor="middle" font-size="26" font-weight="700" fill="var(--text)">${o.pct}%</text>
        </svg>
      </div>
      <div class="dd-acc-split">
        <div><b class="mono">${fmt(o.auto)}</b><span>Auto-accepted</span></div>
        <div><b class="mono">${fmt(o.review)}</b><span class="dd-review-link" data-act="dd-goto-needs-review" role="button" tabindex="0">Need review</span></div>
      </div>
      <p class="dd-ov-note">Share of ${esc(o.unit)} classified at ${REVIEW_THRESHOLD}% confidence or higher (org policy).</p>
    </div>`;
  function esc(s) { return ctx.esc(s); }
}
