// Consistency checks for every figure the Discovery screens show. Run before UI work and in tests:
// a "fail" means two places in the data disagree; "verify" means a classification rests on a fact
// the data cannot confirm and must be shown as needing verification.
import { CLASSES, TYPE_POLICY, assetLabelPolicy, reviewAll, classSummary } from "./overview/discoveryInsights.js";

const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const parseCount = s => {
  const m = String(s || "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1));
};

export function runDiscoveryChecks(store, D, seed) {
  const out = [];
  const check = (area, label, ok, detail, status) => out.push({ area, label, status: status || (ok ? "pass" : "fail"), detail });
  const findings = store.overviewFindings || [];
  const connections = store.connections || [];
  const reviews = reviewAll(findings);

  // ---------------- Structured ----------------
  const inv = seed.inventory;
  check("Structured", "Detections = PII columns in inventory = last trend point",
    findings.length === inv.piiColumns && seed.trend30d[seed.trend30d.length - 1].cols === inv.piiColumns,
    `${findings.length} detections · inventory ${inv.piiColumns} · trend ${seed.trend30d[seed.trend30d.length - 1].cols}`);

  const rk = k => findings.filter(f => f.rk === k).length;
  check("Structured", "Recognizer risk split matches inventory",
    rk("VH") === seed.riskColumns.veryHigh && rk("H") === seed.riskColumns.high && rk("M") === seed.riskColumns.medium && rk("L") === seed.riskColumns.low,
    `${rk("VH")}/${rk("H")}/${rk("M")}/${rk("L")}`);

  const auto = findings.filter(f => f.conf >= 80).length;
  check("Structured", "Classification accuracy (auto-accepted at ≥80% confidence)",
    auto === seed.accuracy.autoAccepted && findings.length - auto === seed.accuracy.needsReview && Math.round((auto / findings.length) * 100) === seed.accuracy.pct,
    `${auto} of ${findings.length} = ${Math.round((auto / findings.length) * 100)}% · ${findings.length - auto} need review`);

  check("Structured", "Per-source schemas, tables and detections add up to inventory",
    sum(seed.bySource, s => s[4]) === inv.schemas && sum(seed.bySource, s => s[5]) === inv.tables && sum(seed.bySource, s => s[6]) === inv.piiColumns,
    `${sum(seed.bySource, s => s[4])} schemas · ${sum(seed.bySource, s => s[5])} tables · ${sum(seed.bySource, s => s[6])} detections`);

  seed.bySource.forEach(([name, , , , schemas, tables, cols]) => {
    const mine = findings.filter(f => f.connName === name);
    const t = new Set(mine.map(f => f.tableName)).size;
    const sc = new Set(mine.map(f => f.schema)).size;
    check("Structured", `${name}: detections, schemas and tables fit its inventory`,
      mine.length === cols && sc <= schemas && t <= tables,
      `${mine.length}/${cols} detections · ${sc}/${schemas} schemas · ${t}/${tables} tables with detections`);
  });

  const structured = connections.filter(c => c.kind === "S");
  const namedSources = seed.bySource.filter(s => s[1] !== "mixed").length;
  const otherN = parseInt((seed.bySource.find(s => s[1] === "mixed") || [""])[0].replace(/\D/g, ""), 10) || 0;
  check("Structured", "Structured connections = sources in coverage",
    structured.length === namedSources + otherN, `${structured.length} connections · ${namedSources} named + ${otherN} grouped`);

  const failedBy = {};
  (seed.failedTablesList || []).forEach(t => { failedBy[t.conn] = (failedBy[t.conn] || 0) + 1; });
  const failedMismatch = Object.keys(failedBy).filter(n => {
    const c = connections.find(x => x.name === n);
    return !c || (c.failed || 0) !== failedBy[n];
  });
  check("Structured", "Failed tables match each connection's failure count", !failedMismatch.length,
    failedMismatch.length ? `Mismatch on ${failedMismatch.join(", ")}` : `${inv.failedTables} failed tables`);

  const tbRisk = seed.scan.piiTBByRisk;
  check("Structured", "Footprint: personal-data terabytes by risk add up",
    Math.round((tbRisk.veryHigh + tbRisk.high + tbRisk.medium + tbRisk.low) * 100) / 100 === seed.scan.piiTB,
    `${tbRisk.veryHigh} + ${tbRisk.high} + ${tbRisk.medium} + ${tbRisk.low} = ${seed.scan.piiTB} TB`);
  check("Structured", "Scanned terabytes add up", Math.round(sum(seed.bySource, s => s[2]) * 10) / 10 === seed.scan.totalTB && Math.round(sum(seed.bySource, s => s[3]) * 100) / 100 === seed.scan.piiTB,
    `${seed.scan.totalTB} TB scanned · ${seed.scan.piiTB} TB personal data`);

  const s = classSummary(findings, reviews);
  check("Structured", "Classes cover every scanned column",
    s.counts.SPI + s.counts.PII + s.counts.POT + s.counts.NON === findings.length && findings.length <= inv.columnsScanned,
    `${s.counts.SPI} SPI + ${s.counts.PII} PII + ${s.counts.POT} Potential + ${s.counts.NON} Non-PII = ${findings.length}; ${inv.columnsScanned - findings.length} without a detection`);

  const noPolicy = [...new Set(findings.map(f => f.type))].filter(t => !TYPE_POLICY[t]);
  check("Structured", "Every detected type has a classification policy", !noPolicy.length, noPolicy.length ? noPolicy.join(", ") : "24 of 24 types");

  // Asset inventory labels against the classification policy
  (D.assets || []).forEach(a => {
    (a.cls || []).forEach(([label, tagKind]) => {
      const pol = assetLabelPolicy(label);
      if (!pol) return check("Assets", `${a.n}: "${label}" has a classification policy`, false, "No policy for this label");
      if (pol.cls === "VERIFY") return check("Assets", `${a.n}: "${label}"`, false, pol.basis, "verify");
      const seedCls = tagKind === "spi" ? "SPI" : "PII";
      if (pol.cls !== seedCls) check("Assets", `${a.n}: "${label}" tagged ${seedCls} in the inventory`, true,
        `Shown as ${CLASSES[pol.cls].label}: ${pol.basis}`, "corrected");
    });
  });

  // ---------------- Unstructured ----------------
  const u = seed.unstructured;
  check("Unstructured", "Document classes add up to sensitive files", sum(u.topEntities, e => e.count) === u.sensitiveFiles,
    `${sum(u.topEntities, e => e.count)} vs ${u.sensitiveFiles}`);
  check("Unstructured", "Sensitive files by format add up", sum(u.topTypes, t => t.sensitive) === u.sensitiveFiles,
    `${sum(u.topTypes, t => t.sensitive)} vs ${u.sensitiveFiles}`);
  check("Unstructured", "Classification accuracy adds up",
    u.autoAccepted + u.needsReview === u.sensitiveFiles && Math.round((u.autoAccepted / u.sensitiveFiles) * 100) === u.accuracyPct,
    `${u.autoAccepted} + ${u.needsReview} = ${u.autoAccepted + u.needsReview} · ${Math.round((u.autoAccepted / u.sensitiveFiles) * 100)}%`);
  const scanned = u.scannedFiles !== undefined ? u.scannedFiles : u.totalFiles;
  check("Unstructured", "Formats fit within content-scanned files", sum(u.topTypes, t => t.count) <= scanned,
    `${sum(u.topTypes, t => t.count).toLocaleString()} in top formats · ${scanned.toLocaleString()} content-scanned`);

  const unstructuredAssets = (D.assets || []).filter(a => /files/i.test(a.rows));
  const assetFiles = sum(unstructuredAssets, a => parseCount(a.rows) || 0);
  check("Unstructured", "Total files cover the file stores in the asset inventory", assetFiles <= u.totalFiles,
    `${unstructuredAssets.map(a => `${a.n} ${a.rows}`).join(" + ")} = ${assetFiles.toLocaleString()} · total ${u.totalFiles.toLocaleString()}`);

  const results = store.unstructuredResults || [];
  const exts = [...new Set(results.map(r => (r.fileName.split(".").pop() || "").toUpperCase()))];
  const known = new Set([...u.topTypes.map(t => t.ext), ...((u.metadataOnly || []).map(x => x.ext))]);
  const missing = exts.filter(e => !known.has(e));
  check("Unstructured", "Formats in classified files appear in the format breakdown", !missing.length,
    missing.length ? `Missing: ${missing.join(", ")}` : exts.join(", "));

  u.topEntities.forEach(e => {
    if (!e.contains) return check("Unstructured", `${e.name}: lists the entities that make it sensitive`, false, "No entity list");
    const spi = e.contains.filter(c => c.cls === "SPI" && !c.unconfirmed).map(c => c.name);
    if (e.verify) check("Unstructured", `${e.name}`, false, e.verify, "verify");
    else check("Unstructured", `${e.name}: class backed by its entities`, (e.risk === "VH") === spi.length > 0, `Contains ${e.contains.map(c => c.name).join(", ")}`);
  });

  results.forEach(r => {
    const pols = (r.categories || []).map(assetLabelPolicy);
    const hasSpi = pols.some(p => p && p.cls === "SPI");
    const ver = pols.find(p => p && p.cls === "VERIFY");
    if (ver) check("Unstructured", `${r.fileName}: entity classes`, false, ver.basis, "verify");
    check("Unstructured", `${r.fileName}: risk matches its entities`, !hasSpi || r.risk === "VH",
      `${r.categories.join(", ")} · risk ${r.risk}${hasSpi && r.risk !== "VH" ? " but it holds SPI" : ""}`);
  });

  return out;
}
