// ROPA validation and compliance rule engine. Pure functions, no DOM.
// ctx = { store, systems, type, id, sdf, vendorRisk, consentProfiles, discovery }
import {
  OPTIONS, RECORD_TYPES, RETENTION_YEARS, GDPR_ROLES, DPDP_ROLES, DISCOVERY_CLASS_MAP,
  CAT_GOV, CAT_FIN, CAT_BIO, CAT_VOICE, DPC_CHILD, getSteps, regsFlags, isYes, has
} from "./ropaConfig.js";

/* ---------------- field helpers ---------------- */

export function isVisible(f, d) { return !f.showIf || !!f.showIf(d || {}); }

export function isReq(f, d, ctx) { return typeof f.req === "function" ? !!f.req(d || {}, ctx) : !!f.req; }

export function optionsFor(f, d, ctx) {
  let list = f.opts;
  if (typeof list === "function") list = list(d || {}, ctx);
  else if (typeof list === "string") list = OPTIONS[list];
  return (list || []).map(o => (typeof o === "object" ? o : { v: o, l: o }));
}

export function isEmpty(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
const isConsent = (law) => /^Consent/.test(law || "");
const article = (w) => (/^[aeiou]/i.test(w) ? "An " : "A ");
const domainOf = (s) => String(s || "").replace(/^https?:\/\//, "").split(/[\/@]/)[0].replace(/^www\./, "").toLowerCase();

// Clears values of hidden fields (and multi values no longer offered) until stable.
// Returns the keys that were cleared.
export function pruneHidden(type, data, ctx) {
  const cleared = [];
  const steps = getSteps(type, ctx);
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    steps.forEach(s => s.fields.forEach(f => {
      if (!isVisible(f, data) && !isEmpty(data[f.k])) { delete data[f.k]; cleared.push(f.k); changed = true; }
      else if (f.prune && Array.isArray(data[f.k])) {
        const allowed = optionsFor(f, data, ctx).map(o => o.v);
        const kept = data[f.k].filter(v => allowed.indexOf(v) > -1);
        if (kept.length !== data[f.k].length) { data[f.k] = kept; changed = true; }
      }
    }));
    if (!changed) break;
  }
  return cleared;
}

/* ---------------- V-xx field validation ---------------- */

const URL_RE = /^https:\/\/[^\s]+\.[^\s]{2,}/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UK_POST_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

export function validateField(spec, value, record, store, ctx) {
  const d = record || {};
  if (isEmpty(value)) return isReq(spec, d, ctx) ? { msg: spec.l + " is required" } : null; // V-01
  const s = typeof value === "string" ? value.trim() : value;

  if (spec.k === "name") {
    if (s.length < 3 || s.length > 80) return { msg: "Use 3 to 80 characters" }; // V-02
    if (spec.unique && ctx && ctx.type) { // V-03
      const dup = (store[ctx.type] || []).find(r => r.id !== ctx.id && String(r.name || "").trim().toLowerCase() === s.toLowerCase());
      if (dup) return { msg: article(RECORD_TYPES[ctx.type].noun) + RECORD_TYPES[ctx.type].noun + " called '" + dup.name + "' already exists (" + dup.id + ")", link: { type: ctx.type, id: dup.id } };
    }
  }
  if (spec.k === "desc") { // V-04
    if (s.length < 20) return { msg: "Add a little more detail (at least 20 characters)" };
    if (s.length > 600) return { msg: "Keep it to 600 characters or fewer" };
  }
  if (spec.t === "url") { // V-05
    if (/^http:\/\//i.test(s)) return { msg: "Use https:// for document links" };
    if (!URL_RE.test(s)) return { msg: "Enter a full https:// link" };
  }
  if (spec.t === "email" && !EMAIL_RE.test(s)) return { msg: "Enter a valid email, like name@aarohan.example" }; // V-06
  if (spec.t === "date" && spec.noFuture && s > today()) return { msg: "Date can't be in the future" }; // V-07
  if (spec.k === "zip") { // V-08
    const c = d.country;
    if (c === "India" && !/^[1-9][0-9]{5}$/.test(s)) return { msg: "Indian PIN codes have 6 digits and don't start with 0" };
    if ((c === "Germany" || c === "Netherlands") && !/^\d{4,5}$/.test(s)) return { msg: "Use a 4 or 5 digit postal code" };
    if (c === "United Kingdom" && !UK_POST_RE.test(s)) return { msg: "Enter a valid UK postcode, like EC2A 4NE" };
    if (["India", "Germany", "Netherlands", "United Kingdom"].indexOf(c) < 0 && !/^[A-Za-z0-9]{3,10}$/.test(s.replace(/\s/g, ""))) return { msg: "Use 3 to 10 letters or digits" };
  }
  if (spec.k === "cphone") { // V-09
    if (d.country === "India" || !d.country) {
      if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(s)) return { msg: "Enter a 10-digit Indian mobile number" };
    } else if (!/^\+\d{7,15}$/.test(s.replace(/[\s-]/g, ""))) return { msg: "Enter the number in international format, like +4930123456" };
  }
  if (spec.k === "ver" && !/^v\d+(\.\d+){0,2}$/.test(s)) return { msg: "Use a version like v3 or v3.2" }; // V-10
  if (spec.k === "next" && d.eff && s <= d.eff) return { msg: "Review date must be after the effective date" }; // V-11
  if (spec.k === "retn") { // V-12
    const n = Number(s);
    if (!Number.isFinite(n) || n < 1 || n > 50) return { msg: "Enter a period between 1 and 50" };
  }
  if (spec.t === "number" && spec.k !== "retn" && !Number.isFinite(Number(s))) return { msg: "Enter a number" };
  if (spec.max && spec.k !== "name" && spec.k !== "desc" && typeof s === "string" && s.length > spec.max) return { msg: "Use " + spec.max + " characters or fewer" };
  return null;
}

// Errors for every visible field in one step: { key: {msg, link} }
export function validateStep(type, stepIdx, data, ctx) {
  const step = getSteps(type, ctx)[stepIdx];
  const out = {};
  if (!step) return out;
  step.fields.forEach(f => {
    if (!isVisible(f, data) || f.t === "import") return;
    const e = validateField(f, data[f.k], data, ctx.store, ctx);
    if (e) out[f.k] = e;
  });
  return out;
}

// V-13 / V-14: custom field definitions
const RESERVED = ["name", "desc", "id", "upd"];
export function validateCustomField(draft, store) {
  const e = {};
  const label = (draft.label || "").trim();
  if (!label) e.label = "Label is required";
  else if ((store.cf || []).some(f => f.label.toLowerCase() === label.toLowerCase())) e.label = "A custom field called '" + label + "' already exists";
  const key = (draft.key || "").trim();
  if (!/^[a-z][a-z0-9_]{1,39}$/.test(key)) e.key = "Use lowercase letters, numbers and underscores";
  else if (RESERVED.indexOf(key) > -1 || (store.cf || []).some(f => f.key === key)) e.key = "The key '" + key + "' is already in use";
  if (draft.type === "Dropdown" || draft.type === "Multi select") {
    const uniq = (draft.opts || []).map(o => o.trim().toLowerCase()).filter((o, i, a) => o && a.indexOf(o) === i);
    if (uniq.length < 2) e.opts = "Add at least 2 different options";
  }
  return e;
}

export function slugify(label) {
  let s = String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  if (s && !/^[a-z]/.test(s)) s = "f_" + s;
  return s;
}

/* ---------------- risk score (§6.5) ---------------- */

export function riskBand(score) { return score >= 60 ? "High" : score >= 30 ? "Medium" : "Low"; }

function rule6Items(d) {
  const rest = d.rest || [], tr = d.tr || [], org = d.orgm || [];
  return [
    { k: "rest", label: "Encryption or masking at rest", ok: rest.length > 0, add: "Add AES-256, disk encryption, tokenisation or masking under At rest." },
    { k: "tr", label: "Encryption in transit", ok: tr.length > 0, add: "Add TLS 1.3 or a private link under In transit." },
    { k: "orgm", label: "Access control (Role-based access or MFA)", ok: has(org, "Role-based access") || has(org, "MFA"), add: "Add Role-based access or MFA under Organisational." },
    { k: "orgm", label: "Access logs kept ≥ 1 year", ok: has(org, "Access logs retained ≥ 1 year"), add: "Add 'Access logs retained ≥ 1 year' under Organisational." },
    { k: "orgm", label: "Backups", ok: has(org, "Backups tested") || isYes(d.bak), add: "Add 'Backups tested', or record a backup on step 3." }
  ];
}

function foreignCountries(d) {
  const all = [].concat(d.sjur || [], isYes(d.bak) ? (d.bjur || []) : []);
  return all.filter((c, i) => c !== "India" && all.indexOf(c) === i);
}

export function activityRisk(d) {
  const reasons = [];
  const add = (n, why) => reasons.push([n, why]);
  const cat = d.cat || [];
  if (has(cat, CAT_GOV)) add(20, "Government identifiers");
  if (has(cat, CAT_FIN)) add(15, "Financial data");
  if (has(cat, CAT_BIO)) add(15, "Biometric / photo");
  if (has(cat, CAT_VOICE)) add(10, "Voice recordings");
  if (has(d.dpc, DPC_CHILD)) add(25, "Children's data");
  if (isYes(d.ai)) add(15, "Uses AI / ML");
  if (isYes(d.ai) && isYes(d.adm)) add(10, "Fully automated decision");
  if (isYes(d.xb)) {
    add(10, "Cross-border transfer");
    if (isEmpty(d.xs)) add(5, "No transfer safeguard");
  }
  if (isYes(d.ext) && d.erole === "Data Processor" && d.dpa === "No") add(15, "Processor without a DPA");
  if (d.sec === "No") add(20, "No security measures");
  if (isYes(d.sec)) {
    const missing = rule6Items(d).filter(i => !i.ok).length;
    if (missing) add(3 * missing, missing + " Rule 6 safeguard" + (missing > 1 ? "s" : "") + " missing");
  }
  if (d.freq === "Continuous") add(5, "Continuous collection");
  if (d.srct === "Third party") add(5, "Third-party source");
  reasons.sort((a, b) => b[0] - a[0]);
  const score = Math.min(100, reasons.reduce((s, r) => s + r[0], 0));
  return { score, reasons };
}

function assetRisk(d) {
  const reasons = [];
  const add = (n, why) => reasons.push([n, why]);
  const cat = d.cat || [];
  if (has(cat, CAT_GOV)) add(20, "Government identifiers");
  if (has(cat, CAT_FIN)) add(15, "Financial data");
  if (has(cat, CAT_BIO)) add(15, "Biometric / photo");
  if (has(cat, CAT_VOICE)) add(10, "Voice recordings");
  if (has(d.ds, DPC_CHILD)) add(25, "Children's data");
  if (isYes(d.ai)) add(15, "Uses AI");
  if (isYes(d.hr)) add(10, "High-risk AI");
  if (d.loc && d.loc !== "India") add(10, "Hosted outside India");
  if (isYes(d.sup) && isEmpty(d.supp)) add(10, "Unnamed vendor support access");
  if (isYes(d.crit)) add(5, "Business-critical");
  reasons.sort((a, b) => b[0] - a[0]);
  return { score: Math.min(100, reasons.reduce((s, r) => s + r[0], 0)), reasons };
}

function dpiaRecommendation(d, score) {
  const cat = d.cat || [];
  const sensitive = has(cat, CAT_GOV) || has(cat, CAT_FIN) || has(cat, CAT_BIO) || has(cat, CAT_VOICE);
  if (has(d.dpc, DPC_CHILD)) return { rec: true, why: "Children's data is processed." };
  if (isYes(d.ai) && sensitive) return { rec: true, why: "AI is used on sensitive personal data." };
  if (score >= 50) return { rec: true, why: "Risk score is " + score + " (50 or more)." };
  if (d.freq === "Continuous" && (has(cat, CAT_GOV) || has(cat, CAT_FIN))) return { rec: true, why: "Large-scale processing of financial data or government identifiers." };
  return { rec: false, why: "Risk score " + score + " with no high-risk triggers." };
}

/* ---------------- compliance rules ---------------- */

function mk(list) {
  return function(id, sev, step, field, title, message, cite, fix) {
    list.push({ id, sev, step, field, title, message, cite: cite || "", fix: fix || null });
  };
}

function mapRole(role, toDpdp) {
  if (toDpdp) return { "Controller": "Data Fiduciary", "Joint controller": "Data Fiduciary", "Processor": "Data Processor" }[role];
  return { "Data Fiduciary": "Controller", "Significant Data Fiduciary": "Controller", "Data Processor": "Processor" }[role];
}

function mapLaw(law, toDpdp) {
  if (toDpdp) {
    if (/^Consent/.test(law)) return "Consent (s.6)";
    if (/^Legal obligation/.test(law)) return "Legal obligation (s.7(c))";
    if (/^Contract/.test(law)) return "Voluntarily provided for a specified purpose (s.7(a))";
    if (/^Vital/.test(law)) return "Medical emergency (s.7(e))";
    if (/^Public task/.test(law)) return "State function (s.7(b))";
    return null;
  }
  if (/^Consent/.test(law)) return "Consent – Art. 6(1)(a)";
  if (/^Legal obligation|^Court order/.test(law)) return "Legal obligation – Art. 6(1)(c)";
  if (/^Medical/.test(law)) return "Vital interests – Art. 6(1)(d)";
  if (/^State function/.test(law)) return "Public task – Art. 6(1)(e)";
  if (/^Voluntarily|^Employment/.test(law)) return "Contract – Art. 6(1)(b)";
  return null;
}

export function consentValue(d) { return regsFlags(d).dpdp ? "Consent (s.6)" : "Consent – Art. 6(1)(a)"; }

function retentionYears(d) {
  if (d.ret === "Custom…") {
    const n = Number(d.retn);
    if (!Number.isFinite(n)) return null;
    return d.retu === "Months" ? n / 12 : n;
  }
  return d.ret in RETENTION_YEARS ? RETENTION_YEARS[d.ret] : null;
}

function evaluateActivity(d, ctx, out) {
  const r = mk(out.results);
  const f = regsFlags(d);
  const sdf = !!ctx.sdf;
  const purp = d.purp || [], cat = d.cat || [];
  const attr = d.attr || [];

  // R-01 role fits the regulations
  if (d.role && !isEmpty(d.regs)) {
    const fits = f.both ? true : f.gdpr ? GDPR_ROLES.indexOf(d.role) > -1 : DPDP_ROLES.indexOf(d.role) > -1;
    if (!fits) {
      const to = mapRole(d.role, !f.gdpr);
      r("R-01", "suggest", 0, "role", "Role doesn't match the regulations",
        f.gdpr ? "Under the GDPR a Data Fiduciary is called a Controller." : "Under the DPDP Act a controller is called a Data Fiduciary.",
        "DPDP s.2(i) · GDPR Art. 4(7)", to ? { label: "Switch to " + to, patch: { role: to } } : null);
    }
  }
  // R-02 lawful basis fits the regulations
  if (d.law && !isEmpty(d.regs)) {
    const dpdpLaw = /\(s\.\d/.test(d.law);
    const fits = f.both || (f.gdpr ? !dpdpLaw : dpdpLaw);
    if (!fits) {
      const to = mapLaw(d.law, !f.gdpr);
      r("R-02", "suggest", 1, "law", "Lawful basis doesn't match the regulations",
        "'" + d.law + "' isn't a basis under " + (f.gdpr ? "the GDPR" : "the DPDP Act") + ".",
        "DPDP s.4, s.7", to ? { label: "Use " + to, patch: { law: to } } : null);
    }
    if (f.dpdp && /^Legitimate interests/.test(d.law)) {
      r("R-02", "warning", 1, "law", "No legitimate-interest basis in the DPDP Act",
        "The DPDP Act has no legitimate-interest basis. Use consent or one of the s.7 legitimate uses for Indian data principals.", "DPDP s.4, s.7",
        { label: "Set basis to Consent", patch: { law: "Consent (s.6)" } });
    }
  }
  // R-03 marketing needs consent
  if (has(purp, "Marketing") && d.law && !isConsent(d.law)) {
    r("R-03", "warning", 1, "law", "Marketing needs consent",
      "Marketing needs consent. None of the s.7 legitimate uses cover promotional messages.", "DPDP s.6, s.7",
      { label: "Set basis to Consent", patch: { law: consentValue(d) } });
  }
  // R-04 consent guidance
  if (isConsent(d.law)) {
    const prof = (ctx.consentProfiles || []).find(p => p.proc && d.name && p.proc.toLowerCase() === String(d.name).trim().toLowerCase());
    r("R-04", "info", 1, "law", "Consent requirements",
      "Consent must be free, specific, informed, unconditional and unambiguous, and as easy to withdraw as to give. " +
      (prof ? "Linked consent notice: " + prof.n + " notice " + prof.v + " (Consent module)." : "No consent notice is linked in the Consent module yet."),
      "DPDP s.6(1), s.6(4)");
  }
  // R-05 children
  if (has(d.dpc, DPC_CHILD)) {
    if (has(purp, "Marketing") || has(purp, "Analytics")) {
      r("R-05", "error", 1, "dpc", "Children can't be tracked or targeted",
        "Behavioural monitoring and targeted advertising directed at children aren't allowed.", "DPDP s.9(3)");
    } else {
      r("R-05", "info", 1, "dpc", "Verifiable parental consent",
        "Verifiable consent from a parent or lawful guardian is required before processing. Lawful basis is set to Consent.", "DPDP s.9(1)");
    }
  }
  // R-06 Aadhaar
  if (has(cat, CAT_GOV) && has(attr, "Aadhaar number")) {
    r("R-06", "info", 1, "attr", "Aadhaar handling",
      "Store Aadhaar numbers only in an Aadhaar Data Vault and mask them in displays.", "UIDAI Aadhaar Data Vault circular");
    if (!has(d.rest, "Aadhaar Data Vault") && !has(d.rest, "Tokenisation")) {
      r("R-06", "warning", 5, "rest", "Aadhaar without a vault",
        "Aadhaar is collected but no vault or tokenisation is listed in security measures.", "UIDAI circular · DPDP Rule 6",
        { label: "Go to step 6", goto: 5, field: "rest" });
    }
  }
  // R-07 AI needs DPIA
  if (isYes(d.ai)) {
    if (d.dpia !== "Yes") {
      r("R-07", "warning", 1, "dpia", "AI usually needs a DPIA",
        "AI or automated decisions on personal data usually need a DPIA.", "DPDP Rules 2025, Rule 13(3)",
        { label: "Set DPIA to Yes", patch: { dpia: "Yes" } });
    }
    if (sdf) {
      r("R-07", "warning", 1, "ai", "SDF algorithmic due diligence",
        "Significant Data Fiduciaries must do due diligence that algorithmic software doesn't put data principals' rights at risk.", "DPDP Rules 2025, Rule 13(3)");
    }
  }
  // R-08 automated credit decisions
  if (isYes(d.ai) && isYes(d.adm) && has(purp, "Credit decision")) {
    r("R-08", "warning", 1, "adm", "Fully automated credit decisions",
      "Fully automated credit decisions: record a human-review route and explain the decision logic in the notice.", "RBI Digital Lending Directions");
  }
  // R-09 third-party source
  if (d.srct === "Third party") {
    r("R-09", "info", 1, "srct", "Third-party source",
      "Record where the data comes from and that the source had a valid basis to share it.", "DPDP s.8(1)");
  }
  // R-10 DPIA recommendation
  if (out.dpiaRecommended) {
    if (d.dpia === "No") {
      r("R-10", "warning", 1, "dpia", "DPIA recommended",
        "DPIA recommended (score " + out.riskScore + "). Add a reason if you decide not to run one.", "DPDP s.10(2)(c) · GDPR Art. 35");
    } else if (d.dpia !== "Yes") {
      r("R-10", "suggest", 1, "dpia", "DPIA recommended",
        out.dpiaReason + " Set 'DPIA required?' to Yes.", "DPDP s.10(2)(c) · GDPR Art. 35",
        { label: "Set DPIA to Yes", patch: { dpia: "Yes" } });
    }
  }
  // R-11 storage abroad without cross-border transfer
  const foreign = foreignCountries(d);
  if (foreign.length && d.xb === "No") {
    r("R-11", "error", 3, "xb", "Storage abroad is a cross-border transfer",
      "Data is stored in " + foreign.join(", ") + ", which counts as a cross-border transfer. Set 'Cross-border transfer' to Yes on step 4.", "DPDP s.16",
      { label: "Fix it", patch: {
        xb: "Yes",
        xc: Array.from(new Set((d.xc || []).concat(foreign))),
        xm: d.xm || "Cloud replication",
        xr: d.xr || ("No restriction notified under s.16(1) for " + foreign.join(", ") + ".")
      } });
  }
  if (isYes(d.xb)) {
    const xc = d.xc || [];
    // R-12
    r("R-12", "info", 3, "xc", "Transfers outside India",
      "Transfers outside India are allowed unless the country is restricted by a government notification under s.16(1). Sectoral rules still apply." +
      (xc.length ? " Countries: " + xc.join(", ") + "." : ""), "DPDP s.16");
    // R-13
    if (has(cat, CAT_FIN) && has(purp, "Loan disbursal")) {
      r("R-13", "warning", 3, "xc", "Payment data localisation",
        "Payment system data must be stored only in India under RBI's localisation directive. Confirm only a copy is processed abroad.", "RBI payment data storage circular (2018)");
    }
    // R-14
    if (sdf && xc.length) {
      r("R-14", "info", 3, "xc", "SDF localisation check",
        "As an SDF, check whether any category is notified for localisation and that no traffic data leaves India.", "DPDP Rules 2025, Rule 13(4)");
    }
    // R-15
    if (f.gdpr && isEmpty(d.xs)) {
      r("R-15", "error", 3, "xs", "Transfer safeguard missing",
        "Choose a transfer safeguard for EU/UK data (SCCs, BCRs or adequacy).", "GDPR Art. 30(1)(e), Arts. 45–49",
        { label: "Use SCCs", patch: { xs: ["Standard Contractual Clauses"] } });
    }
    // R-16
    if (has(d.xs, "Adequacy decision") && xc.some(c => ["United Kingdom", "Germany", "Netherlands"].indexOf(c) < 0)) {
      r("R-16", "warning", 3, "xs", "Check adequacy",
        "Confirm each recipient country has an EU adequacy decision. If not, use SCCs.", "GDPR Art. 45");
    }
  }
  // R-17 processor without DPA
  if (isYes(d.ext) && d.erole === "Data Processor" && d.dpa === "No") {
    r("R-17", "warning", 3, "dpa", "Processor without a contract",
      "You must have a valid contract with every Data Processor. Add the signed DPA.", "DPDP s.8(2) · GDPR Art. 28(3)",
      { label: "Mark DPA signed", patch: { dpa: "Yes" } });
    out.high.push("R-17");
  }
  // R-18 vendor DPA missing in Vendor Risk
  if (isYes(d.ext)) {
    (d.erec || []).forEach(name => {
      const v = (ctx.vendorRisk || []).find(x => x.n === name);
      if (v && v.dpa === "Missing") {
        r("R-18", "warning", 3, "erec", "Vendor DPA missing",
          name + " has no DPA on file in Vendor Risk.", "Vendor Risk module", { label: "Open Vendor Risk", go: "vendors" });
      }
    });
  }
  // R-19 / R-20 retention
  if (d.ret) {
    const yrs = retentionYears(d);
    if (yrs != null && yrs < 5 && (has(purp, "KYC & AML") || /^Legal obligation/.test(d.law || ""))) {
      r("R-19", "warning", 4, "ret", "KYC retention too short",
        "RBI KYC rules and PMLA require KYC records for 5 years after the relationship ends.", "PMLA s.12",
        { label: "Use 5 years", patch: { ret: "5 years after relationship ends (RBI KYC / PMLA)" } });
    }
    if (yrs != null && yrs > 3 && has(purp, "Marketing")) {
      r("R-19", "warning", 4, "ret", "Marketing kept too long",
        "Erase marketing data once the purpose is served or consent is withdrawn.", "DPDP s.8(7)",
        { label: "Use 3 years", patch: { ret: "3 years after last interaction" } });
    }
    if (isConsent(d.law) && d.ret !== "Until consent is withdrawn" && !/withdraw/i.test((d.rett || "") + " " + (d.retp || ""))) {
      r("R-19", "info", 4, "retp", "Erase on withdrawal",
        "Make sure data is erased when consent is withdrawn.", "DPDP s.6(6)");
    }
    r("R-20", "info", 4, "ret", "Erasure duty",
      "Erase personal data once the purpose is no longer served, unless a law requires you to keep it. Processing logs must be kept for at least 1 year.", "DPDP s.8(7) · Rule 8(3)");
  }
  // R-21 / R-22 / R-23 security
  if (d.sec === "No") {
    r("R-21", "warning", 5, "sec", "No security safeguards",
      "A Data Fiduciary must protect personal data with reasonable security safeguards.", "DPDP s.8(5) · Rule 6",
      { label: "Set to Yes", patch: { sec: "Yes" } });
    out.high.push("R-21");
  }
  if (isYes(d.sec)) {
    out.rule6 = rule6Items(d);
    out.rule6.filter(i => !i.ok).forEach(i => {
      r("R-22", "warning", 5, i.k, "Missing: " + i.label, i.add, "DPDP Rules 2025, Rule 6");
    });
    const tr = d.tr || [];
    if (tr.length && !has(tr, "TLS 1.3") && !has(tr, "VPN / private link")) {
      r("R-23", "info", 5, "tr", "TLS 1.3 recommended", "TLS 1.3 is recommended for new integrations.", "Best practice");
    }
  }
  // R-24 stale assessment
  if (d.date && daysSince(d.date) > 365) {
    const months = Math.round(daysSince(d.date) / 30.4);
    if (d.attestReq) {
      r("R-24", "info", 0, "date", "Attestation requested",
        "Last assessed " + months + " months ago. Re-attestation was requested from " + (d.owner || "the owner") + ".", "Accountability");
    } else {
      r("R-24", "warning", 0, "date", "Assessment is over a year old",
        "Last assessed " + months + " months ago. Request re-attestation from the owner.", "Accountability",
        { label: "Request attestation", act: "attest" });
    }
  }

  // R-25 completeness
  const filled = k => !isEmpty(d[k]);
  const meters = [];
  if (f.gdpr) {
    meters.push({ name: "Art. 30", cite: "GDPR Art. 30(1)", items: [
      ["Controller details", filled("entity") && filled("dpo")],
      ["Purposes", filled("purp")],
      ["Categories of data subjects & data", filled("dpc") && filled("cat")],
      ["Recipients", d.int === "No" || filled("irec") ? (d.ext === "No" || filled("erec")) : false],
      ["Third-country transfers", d.xb === "No" || (isYes(d.xb) && filled("xc") && filled("xs"))],
      ["Erasure time limits", filled("ret")],
      ["Security measures", isYes(d.sec) && (filled("rest") || filled("tr") || filled("orgm"))]
    ] });
  }
  if (f.dpdp) {
    const noticeOk = !isConsent(d.law) || (ctx.consentProfiles || []).some(p => p.proc && d.name && p.proc.toLowerCase() === String(d.name).trim().toLowerCase());
    meters.push({ name: "DPDP", cite: "DPDP s.5, s.8", items: [
      ["Purpose", filled("purp")],
      ["Lawful basis", filled("law")],
      ["Notice link", noticeOk],
      ["Data categories", filled("cat") && filled("attr")],
      ["Retention", filled("ret")],
      ["Processors & contracts", d.ext === "No" || (filled("erec") && (d.erole !== "Data Processor" || isYes(d.dpa)))],
      ["Safeguards", isYes(d.sec)],
      ["Grievance contact", filled("dpo")]
    ] });
  }
  out.completeness = meters;
}

function evaluateAsset(d, ctx, out) {
  const r = mk(out.results);
  const store = ctx.store;
  if (isYes(d.crit) && isEmpty(d.secm)) {
    r("A-01", "error", 4, "secm", "Critical asset without security", "Business-critical assets need at least one security measure.", "DPDP s.8(5)");
  }
  if (isYes(d.ai) && isYes(d.hr)) {
    r("A-02", "warning", 5, "hr", "High-risk AI asset", "High-risk AI asset: link it to a DPIA and an AI Governance review.", "DPDP Rule 13(3)", { label: "Open AI Governance", go: "ai" });
  }
  if (isYes(d.train) && (has(d.cat, CAT_FIN) || has(d.cat, CAT_GOV))) {
    r("A-03", "warning", 5, "train", "Training on customer financial data", "Training models on customer financial data needs a clear purpose and basis. Check the linked activities.", "DPDP s.4");
  }
  if (d.loc && d.loc !== "India") {
    r("A-04", "info", 2, "loc", "Hosted outside India", "Hosted outside India. Linked activities must show a cross-border transfer.", "DPDP s.16");
    (d.acts || []).forEach(id => {
      const a = (store.act || []).find(x => x.id === id);
      if (a && a.xb !== "Yes") {
        r("A-04", "warning", 2, "loc", a.id + " has no cross-border transfer", a.name + " uses this asset but doesn't record a transfer to " + d.loc + ".", "DPDP s.16",
          { label: "Open " + a.id, open: { type: "act", id: a.id, step: 3, field: "xb" } });
      }
    });
  }
  if (isYes(d.sup) && isEmpty(d.supp)) {
    r("A-05", "warning", 3, "supp", "Support access without a supplier", "Vendor support access is on, but no supplier is named.", "DPDP s.8(2)");
  }
  if (isEmpty(d.acts)) {
    r("A-06", "info", 1, "acts", "Not linked to an activity", "Not used by any processing activity yet. Link one so the register stays complete.", "Accountability");
  }
  if (d.dsrc && ctx.discovery) {
    const conn = (ctx.discovery.connections || []).find(c => c.name === d.dsrc);
    if (conn) {
      const found = {}, names = {};
      (conn.tables || []).forEach(t => (t.cols || []).forEach(c => {
        if (c.rk !== "VH") return;
        const m = DISCOVERY_CLASS_MAP.find(x => x[0].test(c.cl));
        if (m && !has(d.cat, m[1])) { found[m[1]] = 1; names[c.cl.replace(/ Card$/, "")] = 1; }
      }));
      const cats = Object.keys(found);
      if (cats.length) {
        r("A-07", "suggest", 2, "cat", "Discovery found more sensitive data",
          "Data Discovery found " + Object.keys(names).slice(0, 3).join(" and ") + " in this source.", "Data Discovery",
          { label: "Add " + cats.map(c => c.split(" (")[0]).join(", "), patch: { cat: (d.cat || []).concat(cats) } });
      }
    }
  }
}

export function partyLinks(store, type, rec) {
  const name = rec.name;
  const acts = (store.act || []).filter(a => (type === "ven" && has(a.erec, name)) || (type === "com" && a.entity === name) || (type === "oth" && has(a.erec, name)));
  return acts;
}

function evaluateParty(type, d, ctx, out) {
  const r = mk(out.results);
  const store = ctx.store;
  const links = partyLinks(store, type, d);
  if (type === "ven") {
    if (d.atype === "Audit not required" && links.some(a => has(a.cat, CAT_GOV) || has(a.cat, CAT_FIN))) {
      r("T-01", "warning", 3, "atype", "Sensitive data, no audit", "This vendor handles sensitive data. Ask for at least a written confirmation or certificate.", "DPDP s.8(2)",
        { label: "Ask for written confirmation", patch: { atype: "Written confirmation" } });
    }
    if (d.country && d.country !== "India") {
      r("T-02", "info", 1, "country", "Overseas vendor", "Overseas vendor: activities that send data here are cross-border transfers.", "DPDP s.16");
    }
    if (!links.length && d.id) r("T-03", "info", 0, "name", "Not linked", "Not linked to any activity.", "Accountability");
    links.filter(a => isYes(a.ext) && a.erole === "Data Processor" && a.dpa === "No").forEach(a => {
      r("R-17", "warning", 0, "name", "DPA missing", a.id + " " + a.name + " sends data to this processor without a signed DPA.", "DPDP s.8(2)",
        { label: "Open " + a.id, open: { type: "act", id: a.id, step: 3, field: "dpa" } });
    });
    const vr = (ctx.vendorRisk || []).find(x => x.n === d.name);
    if (vr && vr.dpa === "Missing") {
      r("R-18", "warning", 0, "name", "DPA missing in Vendor Risk", d.name + " has no DPA on file in Vendor Risk.", "Vendor Risk module", { label: "Open Vendor Risk", go: "vendors" });
    }
  }
  if (d.web && d.cemail && domainOf(d.web) && domainOf(d.cemail.split("@")[1]) && domainOf(d.web) !== domainOf(d.cemail.split("@")[1])) {
    r("T-04", "info", 4, "cemail", "Email domain differs", "The contact email domain doesn't match the website. Check it's the right contact.", "Data quality");
  }
}

function evaluatePolicy(d, ctx, out) {
  const r = mk(out.results);
  if (d.next && d.next < today()) {
    const n = daysSince(d.next);
    r("P-01", "warning", 0, "next", "Review overdue", "Review overdue by " + n + " day" + (n === 1 ? "" : "s") + ".", "Accountability");
  }
  if (d.next && d.eff && daysSince(d.eff) - daysSince(d.next) > 366) {
    r("P-02", "info", 0, "next", "Review interval", "Policies are usually reviewed at least once a year.", "Good practice");
  }
  if (d.ptype === "Grievance redressal policy") {
    r("P-03", "info", 0, "ptype", "90-day response", "Must cover responding to data principals within 90 days.", "DPDP Rules 2025, Rule 14(3)");
  }
  if (d.name && d.ver) {
    const dup = (ctx.store.pol || []).find(p => p.id !== ctx.id && String(p.name).trim().toLowerCase() === String(d.name).trim().toLowerCase() && p.ver === d.ver);
    if (dup) r("P-04", "error", 0, "ver", "Duplicate version", "Version " + d.ver + " of this policy already exists (" + dup.id + ").", "Version control");
  }
}

function evaluateDoc(d, ctx, out) {
  const r = mk(out.results);
  if (d.link) {
    const dup = (ctx.store.doc || []).find(x => x.id !== ctx.id && x.link === String(d.link).trim());
    if (dup) r("D-01", "warning", 0, "link", "Duplicate link", "This link is already saved as '" + dup.name + "'.", "Data quality");
  }
}

const SEV_ORDER = { error: 0, warning: 1, suggest: 2, info: 3 };

export function evaluateRecord(type, record, store, ctx) {
  const d = record || {};
  const c = Object.assign({}, ctx, { store, type });
  const out = { results: [], riskScore: 0, riskBand: "Low", riskReasons: [], completeness: [], dpiaRecommended: false, dpiaReason: "", rule6: null, high: [] };

  if (type === "act") {
    const risk = activityRisk(d);
    out.riskScore = risk.score; out.riskReasons = risk.reasons; out.riskBand = riskBand(risk.score);
    const rec = dpiaRecommendation(d, risk.score);
    out.dpiaRecommended = rec.rec; out.dpiaReason = rec.why;
    evaluateActivity(d, c, out);
  } else if (type === "ast") {
    const risk = assetRisk(d);
    out.riskScore = risk.score; out.riskReasons = risk.reasons; out.riskBand = riskBand(risk.score);
    evaluateAsset(d, c, out);
  } else if (RECORD_TYPES[type] && RECORD_TYPES[type].tab === "par") {
    evaluateParty(type, d, c, out);
  } else if (type === "pol") {
    evaluatePolicy(d, c, out);
  } else if (type === "doc") {
    evaluateDoc(d, c, out);
  }
  out.results.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]);
  out.errors = out.results.filter(x => x.sev === "error").length;
  out.warnings = out.results.filter(x => x.sev === "warning").length;
  return out;
}

// Open issues for list chips and the dashboard: errors and warnings only
export function openIssues(type, record, store, ctx) {
  const ev = evaluateRecord(type, record, store, Object.assign({}, ctx, { id: record.id }));
  const list = ev.results.filter(x => x.sev === "error" || x.sev === "warning");
  return { list, ev, errors: ev.errors, warnings: ev.warnings, high: ev.errors + ev.high.length };
}

// Summary of required fields filled, used by the dock for non-activity records
export function requiredProgress(type, data, ctx) {
  let total = 0, done = 0;
  getSteps(type, ctx).forEach(s => s.fields.forEach(f => {
    if (!isVisible(f, data) || !isReq(f, data, ctx)) return;
    total++;
    if (!validateField(f, data[f.k], data, ctx.store, ctx)) done++;
  }));
  return { total, done };
}
