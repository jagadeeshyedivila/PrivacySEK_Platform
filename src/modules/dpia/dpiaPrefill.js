// Suggested answers for checklist questions, taken from records other modules already hold
// (Data Map activities and assets, Discovery findings, Consent, Rights, Notices, Vendor Risk,
// and the assessment's own risks). A suggestion is only shown: the assessor decides whether to
// use it, and an answer that is already there is never replaced. No DOM access.

const MODULE_LABEL = {
  ropa: "Data Map", discovery: "Data Discovery", consent: "Consent", rights: "Rights Requests", notices: "Notices",
  vendors: "Vendor Risk", retention: "Retention & Deletion", breach: "Breach Response", ai: "AI Governance",
  org: "Obligation Cockpit", dpia: "this assessment",
};
const MODULE_GO = { org: "cockpit", dpia: "" };
export const sourceLabel = m => MODULE_LABEL[m] || m;
export const sourceGo = m => (m in MODULE_GO ? MODULE_GO[m] : m);

const list = v => (Array.isArray(v) ? v : v ? [v] : []);
const uniq = arr => [...new Set(arr.filter(Boolean))];
const join = arr => uniq(arr).join(", ");
const has = (arr, re) => list(arr).some(x => re.test(String(x)));

// The activities and assets an assessment covers
export function scopeOf(a, sources) {
  const ids = (a.activityIds && a.activityIds.length ? a.activityIds : [a.activityId]).filter(Boolean);
  const acts = (sources.ropa?.act || []).filter(x => ids.includes(x.id));
  const names = new Set(acts.flatMap(x => list(x.apps).concat(list(x.ssys))));
  const assets = (sources.ropa?.ast || []).filter(x => list(x.acts).some(id => ids.includes(id)) || names.has(x.name) || names.has(x.dsrc));
  return { ids, acts, assets };
}

const actLinks = acts => acts.map(x => ({ go: "ropa", label: `${x.id} ${x.name}` }));
const tag = acts => acts.map(x => x.id).join(", ");

// Yes when every scoped activity passes, Partial when some do, No when none do
function allSome(acts, ok, yesWhy, noWhy) {
  const pass = acts.filter(ok);
  const fail = acts.filter(x => !ok(x));
  if (!fail.length) return { response: "Yes", reason: yesWhy(pass) };
  if (pass.length) return { response: "Partial", reason: `${yesWhy(pass)} Not recorded for ${tag(fail)}.` };
  return { response: "No", reason: noWhy(fail) };
}
const orgm = re => (acts, label) => allSome(acts, x => has(x.orgm, re), p => `Data Map lists ${label} for ${tag(p)}.`, f => `No ${label} recorded on ${tag(f)}.`);
const openFindings = s => (s.discovery?.findings || []).filter(f => !f.done);

/* Each rule: (scope, sources, assessment) → partial suggestion, or null for no suggestion */
const RULES = {
  /* GOV */
  "DPIA-001": (sc, s) => s.sample?.org?.role && { response: "Yes", reason: `Organisation profile records the role as “${s.sample.org.role}”.` },
  "DPIA-003": sc => sc.acts.length && allSome(sc.acts, x => x.dpo, p => `DPO ${join(p.map(x => x.dpo))} is named on ${tag(p)}.`, f => `No DPO named on ${tag(f)}.`),
  "DPIA-005": (sc, s) => /SDF/i.test(s.sample?.org?.role || "") && { response: "Yes", reason: "Organisation profile marks Aarohan as an SDF candidate; the SDF duty is tracked in the Obligation Cockpit." },
  "DPIA-007": (sc, s) => { const p = (s.ropa?.pol || []).find(x => x.ptype === "Privacy notice"); return p && { response: "Yes", reason: `${p.id} ${p.name} ${p.ver}, effective ${p.eff}.`, links: [{ go: "ropa", label: p.id }] }; },

  /* DATA */
  "DPIA-013": (sc, s) => (s.ropa?.act || []).length && { response: "Yes", reason: `The Data Map holds ${s.ropa.act.length} processing activities.` },
  "DPIA-014": sc => sc.acts.length && allSome(sc.acts, x => x.bu && x.owner, p => `${p.map(x => `${x.id}: ${x.bu}, owner ${x.owner}`).join("; ")}.`, f => `No business unit or owner on ${tag(f)}.`),
  "DPIA-015": sc => sc.acts.length && { response: "Yes", text: sc.acts.map(x => `${x.name}: ${join(list(x.cat))} (${join(list(x.attr))})`).join("\n"), reason: `Data categories and elements recorded on ${tag(sc.acts)}.` },
  "DPIA-016": sc => sc.acts.length && { response: "Yes", text: `${join(sc.acts.flatMap(x => list(x.dpc)))}.`, reason: `Data principal categories on ${tag(sc.acts)}.` },
  "DPIA-017": sc => sc.acts.length && { response: "Yes", text: sc.acts.map(x => `${x.name}: ${join(list(x.mode))}; ${x.srct || "source not recorded"}; ${x.freq || ""}`).join("\n"), reason: `Collection channels, source and frequency on ${tag(sc.acts)}.` },
  "DPIA-018": sc => sc.acts.length && { response: "Yes", text: sc.acts.map(x => `${x.name}: ${join(list(x.purp))}. ${x.desc || ""}`).join("\n"), reason: `Purposes recorded on ${tag(sc.acts)}.` },
  "DPIA-022": sc => sc.acts.length && { response: "Yes", text: `${join(sc.acts.flatMap(x => list(x.apps).concat(list(x.ssys))))}.`, reason: `Applications and source systems linked to ${tag(sc.acts)}.` },
  "DPIA-023": sc => sc.acts.length && { response: "Yes", text: sc.assets.length ? sc.assets.map(x => `${x.name}: ${x.stype}, ${x.loc}`).join("\n") : `Storage jurisdictions: ${join(sc.acts.flatMap(x => list(x.sjur)))}.`, reason: `Storage location of ${sc.assets.length} linked asset${sc.assets.length === 1 ? "" : "s"} and storage jurisdictions.` },
  "DPIA-024": sc => sc.acts.length && allSome(sc.acts, x => x.int !== "Yes" || list(x.irec).length, p => `Internal sharing recorded for ${tag(p)}${p.some(x => x.int === "Yes") ? ` (${join(p.flatMap(x => list(x.irec)))})` : ""}.`, f => `Internal sharing is marked Yes but no recipients are listed on ${tag(f)}.`),
  "DPIA-025": sc => sc.acts.length && allSome(sc.acts, x => x.ext !== "Yes" || list(x.erec).length, p => `External recipients recorded for ${tag(p)}${p.some(x => x.ext === "Yes") ? ` (${join(p.flatMap(x => list(x.erec)))})` : ""}.`, f => `External sharing is marked Yes but no recipients are listed on ${tag(f)}.`),
  "DPIA-027": sc => sc.acts.length && allSome(sc.acts, x => x.bak === "Yes" ? list(x.bjur).length : true, p => `Backups recorded for ${tag(p.filter(x => x.bak === "Yes")) || "none"}; jurisdiction ${join(p.flatMap(x => list(x.bjur))) || "n/a"}.`, f => `Backups exist but have no jurisdiction on ${tag(f)}.`),
  "DPIA-028": sc => sc.acts.length && allSome(sc.acts, x => x.copy === "No", p => `No copies in other environments recorded on ${tag(p)}.`, f => `Copies in other environments recorded on ${tag(f)}; check they are masked.`),
  "DPIA-032": (sc, s) => {
    const f = openFindings(s).filter(x => /copy|outside|spreadsheet|share|dump/i.test(`${x.n} ${x.a}`));
    return f.length ? { response: "Partial", reason: `Discovery has ${f.length} open finding${f.length > 1 ? "s" : ""} on copies outside approved locations: ${f.map(x => x.n).join("; ")}.` }
      : { response: "Yes", reason: "Discovery has no open findings on shadow copies." };
  },

  /* CLASS */
  "DPIA-035": sc => sc.acts.length && { response: "Yes", reason: `Sensitive categories recorded: ${join(sc.acts.flatMap(x => list(x.cat).filter(c => /Government|Financial|Biometric|Voice/i.test(c)))) || "none"}.` },
  "DPIA-036": sc => sc.acts.length && { response: "Yes", reason: sc.acts.some(x => has(x.dpc, /child|minor/i)) ? `Children or minors are listed as data principals on ${tag(sc.acts.filter(x => has(x.dpc, /child|minor/i)))}.` : "No scoped activity lists children as data principals." },

  /* LEGAL */
  "DPIA-042": sc => sc.acts.length && allSome(sc.acts, x => list(x.purp).length, p => `Purposes documented on ${tag(p)}.`, f => `No purpose on ${tag(f)}.`),
  "DPIA-043": sc => sc.acts.length && { response: "Yes", text: sc.acts.map(x => `${x.name}: ${x.law || "not recorded"}`).join("\n"), reason: `Legal ground recorded on ${tag(sc.acts)}.` },
  "DPIA-044": sc => sc.acts.length && allSome(sc.acts, x => x.law, p => `Each activity records whether it relies on consent: ${p.map(x => `${x.id} ${/Consent/i.test(x.law) ? "consent" : "legitimate use"}`).join(", ")}.`, f => `No legal ground on ${tag(f)}.`),
  "DPIA-045": (sc, s) => {
    const consent = sc.acts.filter(x => /Consent/i.test(x.law || ""));
    if (!sc.acts.length) return null;
    if (!consent.length) return { response: "NA", reason: "No scoped activity relies on consent." };
    const n = (s.consent?.consents || []).length, p = (s.consent?.purposes || []).length;
    return n ? { response: "Yes", reason: `Consent holds ${p} purposes and ${n} consent records.`, links: [{ go: "consent", label: "Consent records" }] } : { response: "No", reason: "No consent records found." };
  },
  "DPIA-046": (sc, s) => {
    if (!sc.acts.length) return null;
    if (!sc.acts.some(x => /Consent/i.test(x.law || ""))) return { response: "NA", reason: "No scoped activity relies on consent." };
    const n = (s.consent?.preferences || []).length;
    return n ? { response: "Yes", reason: `${n} preference centre${n > 1 ? "s" : ""} configured in Consent.` } : { response: "Partial", reason: "No preference centre configured in Consent." };
  },
  "DPIA-048": (sc, s) => {
    if (!sc.acts.length) return null;
    const notices = s.sample?.notices || [];
    return allSome(sc.acts, x => notices.some(n => String(n.cov || "").toLowerCase().includes(x.name.toLowerCase())), p => `Covered by a published notice: ${tag(p)}.`, f => `No notice lists ${f.map(x => x.name).join(", ")} in its coverage.`);
  },
  "DPIA-049": (sc, s) => { const n = s.sample?.notices || []; return n.length && { response: n.every(x => x.langs >= 2) ? "Yes" : "Partial", reason: `Notices are available in ${Math.min(...n.map(x => x.langs))}–${Math.max(...n.map(x => x.langs))} languages.` }; },
  "DPIA-051": sc => sc.acts.length && { response: "Yes", reason: sc.acts.some(x => list(x.purp).length > 1) ? `More than one purpose recorded on ${tag(sc.acts.filter(x => list(x.purp).length > 1))}: check each is compatible.` : "Each scoped activity records a single purpose." },

  /* RIGHTS */
  "DPIA-053": (sc, s) => { const f = (s.rights?.forms || []).filter(x => x.status === "Published"); return { response: f.length ? "Yes" : "No", reason: f.length ? `${f.length} published rights web form${f.length > 1 ? "s" : ""}: ${f.map(x => x.name).join(", ")}.` : "No rights web form is published.", links: [{ go: "rights", label: "Rights web forms" }] }; },
  "DPIA-058": (sc, s) => { const n = (s.rights?.requests || []).filter(x => x.type === "Grievance").length; return { response: "Yes", reason: `Grievances are taken through the rights portal (${n} on record), with a Grievance redressal policy in the Data Map.` }; },

  /* PRIV */
  "DPIA-070": sc => sc.acts.length && allSome(sc.acts, x => x.dpia === "Yes" || x.dpia === "No", p => `DPIA decision recorded on ${tag(p)}.`, f => `DPIA not yet decided on ${tag(f)}.`),

  /* SEC */
  "DPIA-075": sc => sc.acts.length && allSome(sc.acts, x => x.sec === "Yes" && list(x.tr).length, p => `Data Map ${tag(p)} list${p.length > 1 ? "" : "s"} ${join(p.flatMap(x => list(x.tr)))} in transit.`, f => `No encryption in transit recorded on ${tag(f)}.`),
  "DPIA-076": sc => sc.acts.length && allSome(sc.acts, x => list(x.rest).length, p => `Data Map lists ${join(p.flatMap(x => list(x.rest)))} at rest for ${tag(p)}.`, f => `No encryption at rest recorded on ${tag(f)}.`),
  "DPIA-077": sc => sc.acts.length && orgm(/role-based/i)(sc.acts, "role-based access"),
  "DPIA-079": sc => sc.acts.length && orgm(/MFA/i)(sc.acts, "MFA"),
  "DPIA-080": sc => sc.acts.length && orgm(/access review/i)(sc.acts, "periodic access reviews"),
  "DPIA-082": sc => sc.acts.length && orgm(/log/i)(sc.acts, "access logging"),
  "DPIA-089": sc => sc.acts.length && orgm(/backup/i)(sc.acts, "backup controls"),
  "DPIA-090": sc => sc.acts.length && orgm(/backups tested/i)(sc.acts, "tested backups"),
  "DPIA-091": sc => sc.acts.length && allSome(sc.acts, x => x.dm, p => `Disposal method recorded: ${join(p.map(x => x.dm))}.`, f => `No disposal method on ${tag(f)}.`),
  "DPIA-094": (sc, s) => {
    const f = openFindings(s), high = f.filter(x => x.sev === "act");
    return high.length ? { response: "Partial", reason: `Discovery has ${high.length} open high-severity posture finding${high.length > 1 ? "s" : ""}: ${high.map(x => x.n).join("; ")}.`, links: [{ go: "discovery", label: "Posture findings" }] }
      : { response: "Yes", reason: `Discovery monitoring is running with ${f.length} open low or medium findings.` };
  },

  /* BREACH */
  "DPIA-095": (sc, s) => (s.sample?.incidents || []).length && { response: "Yes", reason: `Breach Response holds ${s.sample.incidents.length} incidents handled through the response workflow.` },

  /* RET */
  "DPIA-107": sc => sc.acts.length && allSome(sc.acts, x => x.ret, p => `Retention periods recorded: ${p.map(x => `${x.id} ${x.ret}`).join("; ")}.`, f => `No retention period on ${tag(f)}.`),
  "DPIA-108": sc => sc.acts.length && allSome(sc.acts, x => x.retp, p => `Retention justified for ${tag(p)}.`, f => `No retention justification on ${tag(f)}.`),

  /* VEND */
  "DPIA-116": (sc, s) => {
    if (!sc.acts.length) return null;
    const recips = uniq(sc.acts.filter(x => x.ext === "Yes" && x.erole !== "Government / regulator").flatMap(x => list(x.erec)));
    if (!recips.length) return { response: "NA", reason: "No processors receive data from the scoped activities." };
    const known = recips.filter(n => (s.ropa?.ven || []).some(v => v.name === n));
    return { response: known.length === recips.length ? "Yes" : "Partial", reason: `${known.length} of ${recips.length} external recipients are in the vendor register: ${recips.join(", ")}.` };
  },
  "DPIA-117": sc => { const e = sc.acts.filter(x => x.ext === "Yes"); return e.length ? { response: "Yes", text: e.map(x => `${join(list(x.erec))} receive ${join(list(x.cat))} (${x.name})`).join("\n"), reason: `External recipients and data categories on ${tag(e)}.` } : null; },
  "DPIA-118": sc => { const e = sc.acts.filter(x => x.ext === "Yes"); return e.length ? { response: "Yes", text: e.map(x => `${join(list(x.erec))}: ${x.epur || "purpose not recorded"}`).join("\n"), reason: `Sharing purposes on ${tag(e)}.` } : null; },
  "DPIA-119": (sc, s) => {
    const e = sc.acts.filter(x => x.ext === "Yes" && x.erole !== "Government / regulator");
    if (!e.length) return sc.acts.length ? { response: "NA", reason: "No processors receive data from the scoped activities." } : null;
    const docs = (s.ropa?.doc || []).filter(d => /DPA/i.test(d.name));
    return allSome(e, x => x.dpa === "Yes", p => `DPA recorded for ${tag(p)}${docs.length ? `; ${docs.length} DPA document${docs.length > 1 ? "s" : ""} in the Data Map` : ""}.`, f => `No DPA recorded for ${f.map(x => `${x.id} (${join(list(x.erec))})`).join(", ")}.`);
  },
  "DPIA-123": (sc, s) => {
    const recips = uniq(sc.acts.filter(x => x.ext === "Yes").flatMap(x => list(x.erec)));
    const v = (s.sample?.vendors || []).filter(x => recips.includes(x.n));
    return v.length ? { response: v.length === recips.length ? "Yes" : "Partial", reason: `Vendor Risk records subprocessors for ${v.map(x => `${x.n} (${x.sub})`).join(", ")}.`, links: [{ go: "vendors", label: "Vendor Risk" }] } : null;
  },
  "DPIA-124": (sc, s) => {
    const recips = uniq(sc.acts.filter(x => x.ext === "Yes").flatMap(x => list(x.erec)));
    const v = (s.sample?.vendors || []).filter(x => recips.includes(x.n));
    if (!v.length) return null;
    const done = v.filter(x => x.q >= 100);
    return { response: done.length === v.length ? "Yes" : done.length ? "Partial" : "No", reason: `Vendor assessments: ${v.map(x => `${x.n} ${x.q}% (${x.risk} risk)`).join(", ")}.`, links: [{ go: "vendors", label: "Vendor Risk" }] };
  },
  "DPIA-125": (sc, s) => {
    const recips = uniq(sc.acts.filter(x => x.ext === "Yes").flatMap(x => list(x.erec)));
    const v = (s.ropa?.ven || []).filter(x => recips.includes(x.name));
    return v.length ? allSome(v, x => x.atype && !/not r/i.test(x.atype), p => `Assurance on file for ${p.map(x => `${x.name} (${x.atype})`).join(", ")}.`, f => `No assurance report for ${f.map(x => x.name).join(", ")}.`) : null;
  },

  /* CLOUD */
  "DPIA-128": sc => sc.assets.length && { response: "Yes", reason: sc.assets.some(x => x.stype === "Cloud") ? `Cloud-hosted assets: ${sc.assets.filter(x => x.stype === "Cloud").map(x => `${x.name} (${x.loc})`).join(", ")}.` : "All linked assets are on-premises." },
  "DPIA-129": sc => sc.assets.length && allSome(sc.assets, x => x.loc, p => `Hosting location recorded for ${p.map(x => `${x.name} (${x.loc})`).join(", ")}.`, f => `No location on ${f.map(x => x.name).join(", ")}.`),
  "DPIA-130": sc => sc.acts.length && { response: "Yes", reason: sc.acts.some(x => x.xb === "Yes") ? `Cross-border transfers recorded on ${sc.acts.filter(x => x.xb === "Yes").map(x => `${x.id} to ${join(list(x.xc))}`).join(", ")}.` : `No cross-border transfer recorded on ${tag(sc.acts)}; storage is in ${join(sc.acts.flatMap(x => list(x.sjur)))}.` },
  "DPIA-133": sc => sc.acts.length && { response: "Yes", reason: `Backups recorded on ${tag(sc.acts.filter(x => x.bak === "Yes")) || "no activity"}, held in ${join(sc.acts.flatMap(x => list(x.bjur))) || "—"}.` },
  "DPIA-135": sc => sc.acts.length && allSome(sc.acts, x => list(x.sjur).length, p => `Storage jurisdictions: ${join(p.flatMap(x => list(x.sjur)))}; backups: ${join(p.flatMap(x => list(x.bjur))) || "—"}.`, f => `No storage jurisdiction on ${tag(f)}.`),

  /* BCM */
  "DPIA-139": sc => sc.assets.length && { response: "Yes", reason: `Critical assets marked in the Data Map: ${sc.assets.filter(x => x.crit === "Yes").map(x => x.name).join(", ") || "none"}.` },

  /* RISK: the assessment's own risks */
  "DPIA-159": (sc, s, a) => ({ response: (a.risks || []).length ? "Yes" : "No", reason: `${(a.risks || []).length} risk${(a.risks || []).length === 1 ? "" : "s"} recorded on this assessment.` }),
  "DPIA-163": (sc, s, a) => riskRule(a, r => r.likelihood, "likelihood"),
  "DPIA-164": (sc, s, a) => riskRule(a, r => r.impact, "impact"),
  "DPIA-165": (sc, s, a) => riskRule(a, r => r.likelihood && r.impact, "an inherent score"),
  "DPIA-166": (sc, s, a) => riskRule(a, r => String(r.existingControls || "").trim(), "existing controls"),
  "DPIA-167": (sc, s, a) => riskRule(a, r => r.controlEffectiveness !== null && r.controlEffectiveness !== undefined, "a control effectiveness score"),
  "DPIA-168": (sc, s, a) => riskRule(a, r => r.likelihood && r.impact && r.controlEffectiveness !== undefined, "a residual score"),
  "DPIA-170": (sc, s, a) => riskRule(a, r => r.owner, "an owner"),
  "DPIA-171": (sc, s, a) => riskRule(a, r => String(r.treatment || "").trim(), "a treatment"),
  "DPIA-172": (sc, s, a) => riskRule(a, r => r.targetDate, "a target date"),

  /* CHILD */
  "DPIA-189": sc => sc.acts.length && { response: "Yes", reason: sc.acts.some(x => has(x.dpc, /child|minor/i)) ? `Children or minors are data principals on ${tag(sc.acts.filter(x => has(x.dpc, /child|minor/i)))}.` : "No scoped activity lists children." },
};

function riskRule(a, ok, what) {
  const risks = a.risks || [];
  if (!risks.length) return { response: "No", reason: "No risks recorded on this assessment yet." };
  const n = risks.filter(ok).length;
  return { response: n === risks.length ? "Yes" : n ? "Partial" : "No", reason: `${n} of ${risks.length} risks have ${what}.` };
}

// { response?, text?, reason, links, source, hintOnly } or null
export function suggestFor(q, a, sources) {
  if (!q.code || !q.prefill) return null;
  const module = q.prefill.module;
  const base = { source: sourceLabel(module), links: sourceGo(module) ? [{ go: sourceGo(module), label: sourceLabel(module) }] : [] };
  const rule = RULES[q.code];
  if (rule) {
    let out = null;
    try { out = rule(scopeOf(a, sources), sources || {}, a); } catch (e) { out = null; }
    if (out) {
      const sc = scopeOf(a, sources);
      const links = out.links || (module === "ropa" ? actLinks(sc.acts) : base.links);
      return { ...base, ...out, links };
    }
    if (module === "ropa" && !scopeOf(a, sources).acts.length) return { ...base, hintOnly: true, reason: `${q.prefill.hint} Link a Data Map activity to this assessment to get a suggestion.` };
  }
  return { ...base, hintOnly: true, reason: q.prefill.hint };
}

// The parts of a suggestion that would be written to the answer, to tell whether it changed
export const suggestionKey = s => (s && !s.hintOnly ? JSON.stringify([s.response || "", s.text || ""]) : "");
