// Classification review + privacy / security insights for the Discovery overview.
// Pure functions over existing demo data: the 1,240 seed column findings, posture findings,
// the platform asset inventory (D.assets) and the Purpose Guard feed (D.guard). Nothing here
// fetches or invents new records; anything not in those sources is reported as unavailable.

export const REVIEW_THRESHOLD = 80; // org policy: detections below this confidence need a steward

// Sensitivity classes, ordered from most to least sensitive
export const CLASSES = {
  SPI: { key: "SPI", label: "SPI", long: "Sensitive personal information", def: "Identity documents, financial account and payment details, biometrics, health and credentials. Strictest handling." },
  PII: { key: "PII", label: "PII", long: "Personal information", def: "Identifies or relates to a person: contact details, name, date of birth, online identifiers, financial attributes." },
  POT: { key: "POT", label: "Potential PII", long: "Potential PII", def: "Personal only in context (quasi-identifiers, business IDs), or detected below 80% confidence. Needs a steward decision." },
  NON: { key: "NON", label: "Non-PII", long: "Non-personal data", def: "Scanned with no personal data, or a detection reviewed as a false positive." },
  UNC: { key: "UNC", label: "Unclassified", long: "Unclassified", def: "Could not be evaluated, for example tables that failed during the scan." }
};
export const CLASS_ORDER = ["SPI", "PII", "POT", "NON", "UNC"];

// Review policy per detected type. `seed` is what the recognizer assigned in the demo data,
// `cls` is the reviewed class, `basis` is why. Kept beside the data so the reasoning is visible.
const SPDI = "IT (SPDI) Rules 2011, r.3";
export const TYPE_POLICY = {
  "Email": { cls: "PII", basis: "Direct contact identifier" },
  "Mobile number": { cls: "PII", basis: "Direct contact identifier" },
  "Full name": { cls: "PII", basis: "Direct identifier" },
  "Date of birth": { cls: "PII", basis: "Identifier; reveals age (children's data checks)" },
  "Father's name": { cls: "PII", basis: "Identifier recorded for KYC" },
  "PAN": { cls: "SPI", basis: "Government ID used for KYC (org policy)" },
  "Bank account": { cls: "SPI", basis: `Financial account details · ${SPDI}` },
  "Aadhaar": { cls: "SPI", basis: "Aadhaar Act 2016, s.29 restricts use and display" },
  "Card number": { cls: "SPI", basis: `Credit or debit card details · ${SPDI}` },
  "Voter ID": { cls: "SPI", basis: "Government ID (org policy)" },
  "Passport number": { cls: "SPI", basis: "Government ID (org policy)" },
  "Driving licence": { cls: "SPI", basis: "Government ID (org policy)" },
  "Ration card": { cls: "SPI", basis: "Government ID (org policy)" },
  "Password hash": { cls: "SPI", basis: `Passwords · ${SPDI}`, secret: true },
  "UPI ID": { cls: "SPI", basis: `Payment instrument details · ${SPDI}`, note: "Recognizer rated it High; UPI handles are payment instrument details" },
  "GSTIN": { cls: "POT", basis: "Business tax ID; personal only for sole proprietors", note: "Recognizer rated it Very High; most GSTINs identify businesses" },
  "IFSC code": { cls: "NON", basis: "Identifies a bank branch, not a person", note: "False positive: IFSC codes are public branch codes" },
  "Annual salary": { cls: "PII", basis: "Financial attribute of a person" },
  "Occupation": { cls: "PII", basis: "Attribute of a person" },
  "Loan account number": { cls: "PII", basis: "Account identifier linked to a borrower" },
  "IP address": { cls: "PII", basis: "Online identifier" },
  "Landline number": { cls: "PII", basis: "Direct contact identifier" },
  "Nominee name": { cls: "PII", basis: "Identifies a person named by the customer" },
  "Customer ID": { cls: "PII", basis: "Internal identifier linkable to a person (pseudonymous)" }
};

// Where each SPI family is expected to live at an NBFC. An SPI detection elsewhere is either a
// false positive or a copy outside its system of record; either way a steward has to verify it.
// The class stays SPI so a real copy is never hidden by the review.
const KYC_SCHEMAS = ["customers", "kyc", "onboarding", "origination", "underwriting", "gold_vault", "payroll"];
const PAYMENT_SCHEMAS = ["customers", "kyc", "accounts", "payments", "transactions", "disbursement", "loans", "cards", "origination", "underwriting", "payroll", "reconcile", "gateway", "switch", "treasury", "vendor_sync"];
const EXPECTED = {
  "PAN": KYC_SCHEMAS, "Aadhaar": KYC_SCHEMAS, "Voter ID": KYC_SCHEMAS, "Passport number": KYC_SCHEMAS,
  "Driving licence": KYC_SCHEMAS, "Ration card": KYC_SCHEMAS,
  "Bank account": PAYMENT_SCHEMAS, "UPI ID": PAYMENT_SCHEMAS,
  "Card number": PAYMENT_SCHEMAS,
  "Password hash": ["tokens"]
};
// Analytics or marketing schemas: SPI there is also a purpose-limitation question
const SECONDARY_USE_SCHEMAS = new Set(["telemetry", "clickstream", "marketing", "bi_reporting", "ml_features", "risk_models", "community", "archive"]);

// The seed recognizer's Very High level was shown as "SPI"; used to report what changed
function seedClass(f) {
  return f.rk === "VH" ? "SPI" : "PII";
}

export function reviewFinding(f) {
  const pol = TYPE_POLICY[f.type] || { cls: "PII", basis: "No review policy for this type" };
  let cls = pol.cls;
  const flags = [];
  if (cls !== "NON" && f.conf < REVIEW_THRESHOLD) {
    flags.push("low-confidence");
    if (cls === "PII" || cls === "SPI") cls = "POT";
  }
  const expected = EXPECTED[f.type];
  if (expected && !expected.includes(f.schema)) flags.push("out-of-context");
  if (pol.cls === "SPI" && SECONDARY_USE_SCHEMAS.has(f.schema)) flags.push("secondary-use");
  if (pol.secret) flags.push("credential");
  return { cls, basis: pol.basis, flags, seedCls: seedClass(f), changed: pol.cls !== seedClass(f) };
}

// Small memo: the same 1,240 findings are reviewed on every render
let memoSrc = null;
let memoOut = null;
export function reviewAll(findings) {
  if (findings === memoSrc && memoOut) return memoOut;
  memoSrc = findings;
  memoOut = new Map(findings.map(f => [f.id, reviewFinding(f)]));
  return memoOut;
}

export function classSummary(findings, reviews) {
  const counts = { SPI: 0, PII: 0, POT: 0, NON: 0 };
  findings.forEach(f => { counts[reviews.get(f.id).cls]++; });

  // Type-level corrections: where the reviewed class differs from what the recognizer implied
  const byType = {};
  findings.forEach(f => {
    const pol = TYPE_POLICY[f.type];
    if (!pol || pol.cls === seedClass(f)) return;
    const k = `${f.type}|${seedClass(f)}`;
    if (!byType[k]) byType[k] = { type: f.type, from: seedClass(f), to: pol.cls, count: 0, note: pol.note || pol.basis };
    byType[k].count++;
  });
  const corrections = Object.values(byType).sort((a, b) => b.count - a.count);
  const lowConf = findings.filter(f => reviews.get(f.id).flags.includes("low-confidence")).length;

  // Out-of-context SPI, grouped by type with the schemas it turned up in
  const ooc = {};
  findings.forEach(f => {
    if (!reviews.get(f.id).flags.includes("out-of-context")) return;
    if (!ooc[f.type]) ooc[f.type] = { type: f.type, count: 0, schemas: new Set() };
    ooc[f.type].count++;
    ooc[f.type].schemas.add(f.schema);
  });
  const outOfContext = Object.values(ooc).map(o => ({ ...o, schemas: [...o.schemas] })).sort((a, b) => b.count - a.count);
  const outOfContextTotal = outOfContext.reduce((s, o) => s + o.count, 0);
  return { counts, corrections, lowConf, outOfContext, outOfContextTotal, total: findings.length };
}

// Group findings by a key and count per reviewed class (used for "SPI by source" bars)
export function classBy(findings, reviews, keyFn) {
  const out = {};
  findings.forEach(f => {
    const k = keyFn(f);
    if (!out[k]) out[k] = { key: k, SPI: 0, PII: 0, POT: 0, NON: 0, total: 0 };
    out[k][reviews.get(f.id).cls]++;
    out[k].total++;
  });
  return Object.values(out);
}

// ---------------------------------------------------------------------------------------------
// Posture findings: privacy vs security
// ---------------------------------------------------------------------------------------------
export function postureKind(f) {
  const n = String(f.n || "").toLowerCase();
  if (n.includes("retention") || n.includes("consent") || n.includes("purpose")) return { domain: "privacy", kind: "Retention beyond schedule" };
  if (n.includes("public")) return { domain: "security", kind: "Public exposure" };
  if (n.includes("outside approved") || n.includes("copy")) return { domain: "security", kind: "Copy outside approved locations" };
  if (n.includes("unencrypted") || n.includes("encrypt")) return { domain: "security", kind: "Unencrypted sensitive column" };
  if (n.includes("access")) return { domain: "security", kind: "Over-broad access" };
  return { domain: "security", kind: "Other" };
}

const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const IN_INDIA = /ap-south|asia-south|central india|mumbai|\(in\)|india|on-premise/i;

// Join the asset inventory with posture findings into per-asset exposure signals
export function assetExposure(assets, postureFindings) {
  const open = (postureFindings || []).filter(f => !f.done);
  return (assets || []).map(a => {
    const key = norm(a.n);
    const signals = [];
    if (/public/i.test(a.loc) || a.sens === "Exposed") signals.push({ k: "public", label: "Publicly accessible", domain: "security" });
    open.forEach(f => {
      if (!key || !norm(f.a).includes(key)) return;
      const pk = postureKind(f);
      if (pk.kind === "Public exposure") return; // already covered by the location signal
      signals.push({ k: norm(pk.kind), label: pk.kind, domain: pk.domain });
    });
    if (a.own === "Unassigned") signals.push({ k: "unowned", label: "No owner", domain: "security" });
    if (a.loc && !IN_INDIA.test(a.loc)) signals.push({ k: "abroad", label: "Stored outside India", domain: "privacy" });
    // SPI held follows the classification policy, not the inventory tag; unconfirmed items are listed apart
    const spi = [], verify = [];
    (a.cls || []).forEach(([label, tag]) => {
      const pol = assetLabelPolicy(label);
      const cls = pol ? pol.cls : (tag === "spi" ? "SPI" : "PII");
      if (cls === "SPI") spi.push(label);
      else if (cls === "VERIFY") verify.push(label);
    });
    return { asset: a, spi, verify, signals };
  }).sort((x, y) => (y.signals.length - x.signals.length) || (y.spi.length - x.spi.length));
}

// Policy decisions from Purpose Guard that touch sensitive data. They are decisions on requested
// data flows, not monitored access, and there is no behavioural baseline, so they are never called anomalies.
export function guardSignals(guard) {
  const feed = (guard && guard.feed) || [];
  const approvals = (guard && guard.approvals) || [];
  const DEC = { block: "Blocked", approve: "Held for approval", mask: "Masked", mix: "Partly blocked" };
  const events = feed
    .filter(r => r[5] === "block" || r[5] === "approve" || r[5] === "mix")
    .map(r => ({ time: r[0], what: r[1], who: r[2], dest: r[3], records: r[4], decision: r[5], label: DEC[r[5]] || r[5] }))
    .sort((a, b) => String(b.time).localeCompare(String(a.time)));
  return { events, approvals, feedSize: feed.length };
}

// ---------------------------------------------------------------------------------------------
// One model shared by Overview, Detections, Classification, Assets and Risk & posture
// ---------------------------------------------------------------------------------------------
export function computeDiscoveryModel(store, D, seed) {
  const findings = store.overviewFindings || [];
  const reviews = reviewAll(findings);
  const summary = classSummary(findings, reviews);
  const bySource = classBy(findings, reviews, f => f.connName);
  const posture = store.findings || [];
  const exposure = assetExposure((D && D.assets) || [], posture);
  const guard = guardSignals(D && D.guard);
  const hasFlags = (f, ...names) => names.every(n => reviews.get(f.id).flags.includes(n));
  // Credentials outside an identity store (the "tokens" schema is the expected home)
  const credentials = findings.filter(f => hasFlags(f, "credential", "out-of-context")).length;
  const secondaryUse = findings.filter(f => hasFlags(f, "secondary-use")).length;
  const connections = store.connections || [];
  const failedTables = (seed.failedTablesList || []).length;

  const kpis = {
    sources: connections.length,
    unhealthy: connections.filter(c => c.status && c.status !== "ok").length,
    columnsScanned: seed.inventory.columnsScanned,
    tables: seed.inventory.tables,
    schemas: seed.inventory.schemas,
    personal: summary.counts.SPI + summary.counts.PII,
    spi: summary.counts.SPI,
    spiVerify: summary.outOfContextTotal,
    review: summary.counts.POT,
    lowConf: summary.lowConf,
    failedTables
  };

  return {
    findings, reviews, summary, bySource, posture, exposure, guard, credentials, secondaryUse, kpis,
    noMatch: seed.inventory.columnsScanned - findings.length,
    openPosture: posture.filter(f => !f.done)
  };
}

// Ranked priority list for the Overview. Each item names where it drills to.
const SEV_RANK = { act: 0, risk: 1, med: 2 };
export function priorityFindings(m) {
  const items = m.openPosture.map(f => {
    const pk = postureKind(f);
    return { sev: f.sev, domain: pk.domain, title: f.n, where: f.a, meta: `Open ${f.age}`, go: { tab: "posture", view: "findings" } };
  });
  if (m.summary.outOfContextTotal) items.push({
    sev: "risk", domain: "privacy", title: `${m.summary.outOfContextTotal.toLocaleString()} SPI detections outside their expected systems`,
    where: m.summary.outOfContext.slice(0, 3).map(o => o.type).join(", "), meta: "Verify location", go: { tab: "classification" }
  });
  if (m.credentials) items.push({
    sev: "risk", domain: "security", title: `${m.credentials} password-hash columns outside an identity store`,
    where: "Authentication and Secrets", meta: "Credential exposure", go: { tab: "detections", key: "cat", val: "Authentication and Secrets" }
  });
  const abroad = m.exposure.filter(e => e.signals.some(s => s.k === "abroad"));
  if (abroad.length) items.push({
    sev: "med", domain: "privacy", title: `${abroad.length} assets with personal data stored outside India`,
    where: abroad.map(e => e.asset.n).join(", "), meta: "Check transfer records", go: { tab: "posture", view: "exposure" }
  });
  if (m.kpis.review) items.push({
    sev: "med", domain: "privacy", title: `${m.kpis.review} detections need a steward decision`,
    where: "Potential PII", meta: `${m.kpis.lowConf} below 80% confidence`, go: { tab: "detections", key: "cls", val: "POT" }
  });
  return items.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev]);
}

// Class for the short data labels used in the asset inventory and on classified files.
// VERIFY means the class depends on a fact the scan can't confirm (e.g. whether a voiceprint was extracted).
const LABEL_POLICY = {
  "aadhaar": { cls: "SPI", basis: "Aadhaar Act 2016, s.29" },
  "aadhaar card": { cls: "SPI", basis: "Aadhaar Act 2016, s.29" },
  "pan": { cls: "SPI", basis: "Government ID used for KYC (org policy)" },
  "pan card": { cls: "SPI", basis: "Government ID used for KYC (org policy)" },
  "bank account": { cls: "SPI", basis: `Financial account details · ${SPDI}` },
  "name": { cls: "PII", basis: "Direct identifier" },
  "dob": { cls: "PII", basis: "Identifier; reveals age" },
  "address": { cls: "PII", basis: "Direct identifier" },
  "address proof": { cls: "PII", basis: "Identity document showing address" },
  "mobile": { cls: "PII", basis: "Direct contact identifier" },
  "phone number": { cls: "PII", basis: "Direct contact identifier" },
  "email": { cls: "PII", basis: "Direct contact identifier" },
  "device id": { cls: "PII", basis: "Online identifier" },
  "ip address": { cls: "PII", basis: "Online identifier" },
  "consent flags": { cls: "PII", basis: "Preference data linked to a person" },
  "income": { cls: "PII", basis: "Financial attribute of a person; not a payment instrument under the SPDI Rules" },
  "income proof": { cls: "PII", basis: "Financial attribute of a person" },
  "salary": { cls: "PII", basis: "Financial attribute of a person; not a payment instrument under the SPDI Rules" },
  "city": { cls: "POT", basis: "Quasi-identifier; personal only combined with other fields" },
  "free text": { cls: "POT", basis: "Content varies; needs content review" },
  "photo": { cls: "VERIFY", basis: "A photo is personal data. It is biometric (SPI) only if facial templates are extracted; confirm before treating it as SPI" },
  "voice": { cls: "VERIFY", basis: "A recording is personal data. It is biometric (SPI) only if voiceprints are extracted; confirm before treating it as SPI" },
  "voice biometrics": { cls: "VERIFY", basis: "Biometric only if voiceprints are extracted from the recording; not confirmed by the scan" }
};
export function assetLabelPolicy(label) {
  return LABEL_POLICY[String(label || "").toLowerCase().trim()] || null;
}
