// DPIA rules shared by the screens, the actions and the seed: question numbering, progress,
// the workbook's 5×5 scoring with control effectiveness, RAG, the checks run before a template
// is published or an assessment submitted, legacy-record migration and the framework crosswalk.
// No DOM access here, because the server imports this file through dpiaData.js.
import {
  RAG_BANDS, RAG_ORDER, GAP_RESPONSES, CLOSED_RISK_STATUSES, FRAMEWORKS, DOMAINS, RESPONSES,
  METHODOLOGY_VERSION,
} from "./dpiaConfig.js";

export const QUESTION_TYPES = ["Short text", "Long text", "Yes/No", "Compliance response", "Single choice", "Multiple choice", "Date"];
export const OPTION_TYPES = ["Single choice", "Multiple choice"];
export const COMPLIANCE = "Compliance response";

// Assessment lifecycle. "Changes requested" goes back to the assignee.
export const STATUSES = ["Not started", "In progress", "Under review", "Changes requested", "Approved"];
export const OPEN_STATUSES = ["Not started", "In progress", "Under review", "Changes requested"];

/* ---------------- answers ---------------- */
// A Compliance response with a text part is stored as { text, response }; otherwise a string
export const responseOf = v => (v && typeof v === "object" && !Array.isArray(v) ? v.response || "" : v || "");
export const textOf = v => (v && typeof v === "object" && !Array.isArray(v) ? v.text || "" : "");
export const hasTextPart = q => q.type === COMPLIANCE && q.answerFormat === "text+response";
export const isScored = q => q.type === COMPLIANCE && q.scored !== false;
export const isGap = (q, v) => q.type === COMPLIANCE && GAP_RESPONSES.includes(responseOf(v));

export function isAnswered(q, v) {
  if (q.type === COMPLIANCE) { const r = responseOf(v); return Boolean(r) && r !== "Not Assessed"; }
  if (Array.isArray(v)) return v.length > 0;
  return String(v ?? "").trim() !== "";
}

// A risk indicator: Yes on a screening question, No or Partial (a gap) on a compliance question
export function isFlagged(q, v) {
  if (!q.flag) return false;
  return q.type === COMPLIANCE ? GAP_RESPONSES.includes(responseOf(v)) : v === "Yes";
}

/* ---------------- scoring ---------------- */
const num = v => (v === null || v === undefined || v === "" ? null : Number(v));
export function inherentScore(l, i) {
  l = num(l); i = num(i);
  return l && i ? l * i : null;
}
export function residualScore(l, i, ce) {
  const inh = inherentScore(l, i);
  ce = num(ce);
  if (inh === null || ce === null || Number.isNaN(ce)) return null;
  return Math.round(inh * (1 - ce / 5) * 100) / 100;
}
export function ragOf(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return "";
  return score >= RAG_BANDS.RED ? "RED" : score >= RAG_BANDS.AMBER ? "AMBER" : "GREEN";
}
export const formatScore = (s, digits = 1) => (s === null || s === undefined ? "—" : Number(s).toFixed(digits));
export const worstRag = list => list.filter(Boolean).sort((x, y) => RAG_ORDER.indexOf(y) - RAG_ORDER.indexOf(x))[0] || "";

export function controlScores(c = {}) {
  const inherent = inherentScore(c.likelihood, c.impact);
  const residual = residualScore(c.likelihood, c.impact, c.controlEffectiveness);
  return { inherent, residual, rag: ragOf(residual) };
}
export function riskScores(r = {}) {
  const inherent = inherentScore(r.likelihood, r.impact);
  const residual = residualScore(r.likelihood, r.impact, r.controlEffectiveness ?? 0);
  return { inherent, residual, rag: ragOf(residual), inherentRag: ragOf(inherent) };
}
export const isRiskOpen = r => !CLOSED_RISK_STATUSES.includes(r.status);
export const riskOverdue = (r, now = Date.now()) =>
  Boolean(r.targetDate) && !["Closed", "Accepted", "Not Applicable"].includes(r.status) && new Date(r.targetDate + "T23:59:59").getTime() < now;

/* ---------------- legacy records ---------------- */
// Risks saved before the 5×5 model used a 4-point scale (l, i), a second L×I pair for the residual
// (rl, ri), desc, mitigation and from. They are mapped on read and never written back.
const MAP_4_TO_5 = { 1: 1, 2: 2, 3: 4, 4: 5 };
const LEGACY_STATUS = { Mitigating: "In Progress" };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function normalizeRisk(r) {
  if (!r || typeof r !== "object") return r;
  if (r.likelihood === undefined && r.l !== undefined) {
    const l = MAP_4_TO_5[Number(r.l)] || clamp(Number(r.l) || 1, 1, 5);
    const i = MAP_4_TO_5[Number(r.i)] || clamp(Number(r.i) || 1, 1, 5);
    let ce = 0;
    if (r.rl || r.ri) {
      const rl = MAP_4_TO_5[Number(r.rl || r.l)] || l, ri = MAP_4_TO_5[Number(r.ri || r.i)] || i;
      ce = clamp(Math.round(5 * (1 - (rl * ri) / (l * i))), 0, 5);
    }
    r.likelihood = l; r.impact = i; r.controlEffectiveness = ce;
  }
  if (r.scenario === undefined) r.scenario = r.desc || "";
  if (r.treatment === undefined) r.treatment = r.mitigation || "";
  if (r.questionId === undefined) r.questionId = r.from || "";
  ["l", "i", "rl", "ri", "desc", "mitigation", "from", "level"].forEach(k => { delete r[k]; });
  if (LEGACY_STATUS[r.status]) r.status = LEGACY_STATUS[r.status];
  const defaults = { title: "", activityId: "", threat: "", harm: "", affectedData: [], affectedPrincipals: [], existingControls: "", owner: "", targetDate: "", status: "Open" };
  Object.entries(defaults).forEach(([k, v]) => { if (r[k] === undefined) r[k] = Array.isArray(v) ? [] : v; });
  if (r.controlEffectiveness === undefined || r.controlEffectiveness === null) r.controlEffectiveness = 0;
  if (!r.priority) {
    const rag = riskScores(r).rag;
    r.priority = rag === "RED" ? "High" : rag === "AMBER" ? "Medium" : "Low";
  }
  r.acceptance = { decision: "", by: "", at: "", rationale: "", escalatedTo: "", ...(r.acceptance || {}) };
  return r;
}

// Fills fields added after an assessment was saved, so old assessments still open
export function normalizeAssessment(a, { orgRole = "Data Fiduciary", sdf = false } = {}) {
  if (!a || typeof a !== "object") return a;
  a.answers = a.answers || {};
  a.controls = a.controls && typeof a.controls === "object" ? a.controls : {};
  a.risks = (a.risks || []).map(normalizeRisk);
  if (!a.assessmentType) a.assessmentType = "Project DPIA";
  if (!a.orgRole) a.orgRole = orgRole;
  if (a.sdf === undefined) a.sdf = sdf;
  if (!Array.isArray(a.activityIds)) a.activityIds = a.activityId ? [a.activityId] : [];
  if (!Array.isArray(a.frameworksInScope)) a.frameworksInScope = ["DPDPA"];
  if (!Array.isArray(a.assessors)) a.assessors = [];
  if (!a.methodologyVersion) a.methodologyVersion = METHODOLOGY_VERSION;
  a.activity = a.activity || [];
  return a;
}

/* ---------------- questions and progress ---------------- */
// [number, question] pairs for a section, e.g. ["3.2", q]
export const numbered = (sections, si) => (sections[si]?.qs || []).map((q, qi) => [`${si + 1}.${qi + 1}`, q]);

// Every question with its position, in order
export function allQuestions(a) {
  const out = [];
  (a.sections || []).forEach((s, si) => s.qs.forEach((q, qi) => out.push({ si, qi, num: `${si + 1}.${qi + 1}`, q, section: s })));
  return out;
}

// Answered questions over all questions, as a 0–100 percentage
export function progress(a) {
  const qs = (a.sections || []).flatMap(s => s.qs);
  if (!qs.length) return 0;
  const done = qs.filter(q => isAnswered(q, (a.answers || {})[q.id])).length;
  return Math.round((done / qs.length) * 100);
}

export function sectionProgress(a, si) {
  const qs = a.sections[si].qs;
  const ans = a.answers || {};
  const done = qs.filter(q => isAnswered(q, ans[q.id])).length;
  const missing = qs.filter(q => q.req && !isAnswered(q, ans[q.id])).length;
  const red = qs.filter(q => isScored(q) && isGap(q, ans[q.id]) && controlScores((a.controls || {})[q.id]).rag === "RED").length;
  const gaps = qs.filter(q => isGap(q, ans[q.id])).length;
  return { done, total: qs.length, missing, red, gaps };
}

// Required questions still unanswered, across every section
export function missingRequired(a) {
  return allQuestions(a).filter(x => x.q.req && !isAnswered(x.q, (a.answers || {})[x.q.id]));
}

// Each scored question's control record must be complete enough to stand up in review:
// a gap (No / Partial) needs a finding, scores and a control owner; a RED residual needs a
// treatment and a target date; NA needs a note explaining why
export function controlProblems(a) {
  const out = [];
  allQuestions(a).forEach(x => {
    if (!isScored(x.q)) return;
    const r = responseOf((a.answers || {})[x.q.id]);
    const c = (a.controls || {})[x.q.id] || {};
    const msgs = [];
    if (GAP_RESPONSES.includes(r)) {
      if (!String(c.finding || "").trim()) msgs.push("finding");
      if (!c.likelihood) msgs.push("likelihood");
      if (!c.impact) msgs.push("impact");
      if (c.controlEffectiveness === null || c.controlEffectiveness === undefined || c.controlEffectiveness === "") msgs.push("control effectiveness");
      if (!c.controlOwner) msgs.push("control owner");
      if (controlScores(c).rag === "RED") {
        if (!String(c.recommendation || "").trim()) msgs.push("treatment");
        if (!c.targetDate) msgs.push("target date");
      }
    } else if (r === "NA" && !String(c.notes || "").trim()) {
      msgs.push("a note on why it does not apply");
    }
    if (msgs.length) out.push({ ...x, msgs });
  });
  return out;
}

// Flagged answers with no risk recorded against them yet
export function suggestedRisks(a) {
  const linked = new Set((a.risks || []).map(r => r.questionId).filter(Boolean));
  return allQuestions(a).filter(x => isFlagged(x.q, (a.answers || {})[x.q.id]) && !linked.has(x.q.id))
    .map(x => ({ num: x.num, q: x.q, section: x.section.name }));
}

// Scored gaps (No / Partial) with their scores, worst first
export function scoredGaps(a) {
  return allQuestions(a)
    .filter(x => isScored(x.q) && isGap(x.q, (a.answers || {})[x.q.id]))
    .map(x => ({ ...x, c: (a.controls || {})[x.q.id] || {}, scores: controlScores((a.controls || {})[x.q.id]) }))
    .sort((p, q) => (q.scores.residual ?? -1) - (p.scores.residual ?? -1));
}

// The worst RAG across open risks and scored gaps; "" when nothing is scored
export function overallRag(a) {
  const fromRisks = (a.risks || []).filter(isRiskOpen).map(r => riskScores(r).rag);
  const fromControls = scoredGaps(a).map(g => g.scores.rag);
  return worstRag(fromRisks.concat(fromControls));
}

export function isOverdue(a, now = Date.now()) {
  return OPEN_STATUSES.includes(a.status) && a.due && new Date(a.due + "T23:59:59").getTime() < now;
}

/* ---------------- Rule 13: significant observations ---------------- */
// RED and AMBER findings for the Data Protection Board report. A gap and the risk raised from it
// are one observation; risks not raised from a gap are added on their own. Worst first.
export function significantObservations(a, now = Date.now()) {
  const sig = rag => rag === "RED" || rag === "AMBER";
  const late = d => Boolean(d) && new Date(d + "T23:59:59").getTime() < now;
  const used = new Set();
  const out = [];
  scoredGaps(a).forEach(g => {
    const risk = (a.risks || []).find(r => r.questionId === g.q.id && isRiskOpen(r));
    const rs = risk ? riskScores(risk) : null;
    const residual = Math.max(g.scores.residual ?? -1, rs ? rs.residual ?? -1 : -1);
    const rag = ragOf(residual < 0 ? null : residual);
    if (!sig(rag)) return;
    if (risk) used.add(risk.id);
    const target = (risk && risk.targetDate) || g.c.targetDate || "";
    const status = risk ? risk.status : (g.c.status || "Open");
    out.push({
      ref: g.q.code || g.num, kind: "gap", qid: g.q.id, si: g.si, domain: g.section.name, domainCode: g.section.domain || g.q.domain || "",
      title: risk ? risk.title : (g.c.finding || g.q.t), observation: g.c.finding || (risk && risk.scenario) || g.q.t, question: g.q.t,
      response: responseOf((a.answers || {})[g.q.id]),
      likelihood: risk ? risk.likelihood : g.c.likelihood, impact: risk ? risk.impact : g.c.impact,
      controlEffectiveness: risk ? risk.controlEffectiveness : g.c.controlEffectiveness,
      residual, rag, treatment: (risk && risk.treatment) || g.c.recommendation || "", owner: (risk && risk.owner) || g.c.controlOwner || "",
      targetDate: target, status, overdue: late(target) && !["Closed", "Accepted"].includes(status),
      riskId: risk ? risk.id : "", acceptance: risk ? risk.acceptance : null, activityId: (risk && risk.activityId) || g.c.activityId || "",
    });
  });
  (a.risks || []).filter(r => isRiskOpen(r) && !used.has(r.id)).forEach(r => {
    const sc = riskScores(r);
    if (!sig(sc.rag)) return;
    out.push({
      ref: r.id, kind: "risk", qid: r.questionId || "", si: null, domain: "Risk register", domainCode: "",
      title: r.title, observation: r.scenario || r.title, question: "", response: "",
      likelihood: r.likelihood, impact: r.impact, controlEffectiveness: r.controlEffectiveness,
      residual: sc.residual, rag: sc.rag, treatment: r.treatment || "", owner: r.owner || "",
      targetDate: r.targetDate || "", status: r.status, overdue: late(r.targetDate) && !["Closed", "Accepted"].includes(r.status),
      riskId: r.id, acceptance: r.acceptance, activityId: r.activityId || "",
    });
  });
  return out.sort((x, y) => (y.residual ?? 0) - (x.residual ?? 0));
}

/* ---------------- evidence ---------------- */
export const evidenceExpired = (ev, now = Date.now()) => Boolean(ev && ev.validUntil) && new Date(ev.validUntil + "T23:59:59").getTime() < now;

/* ---------------- question filter ---------------- */
export const filterActive = qf => Boolean(qf && Object.values(qf).some(Boolean));

export function matchesFilter(a, q, section, qf) {
  const v = (a.answers || {})[q.id];
  const c = (a.controls || {})[q.id] || {};
  const r = responseOf(v);
  if (qf.resp) {
    if (qf.resp === "Not Assessed") { if (q.type !== COMPLIANCE || isAnswered(q, v)) return false; }
    else if (qf.resp === "Gaps") { if (!isGap(q, v)) return false; }
    else if (r !== qf.resp) return false;
  }
  if (qf.rag && (!isGap(q, v) || controlScores(c).rag !== qf.rag)) return false;
  if (qf.fw && !(q.frameworks || []).includes(qf.fw)) return false;
  if (qf.ev === "yes" && !(c.evidenceIds || []).length) return false;
  if (qf.ev === "no" && (c.evidenceIds || []).length) return false;
  if (qf.owner && c.controlOwner !== qf.owner && c.dataOwner !== qf.owner) return false;
  if (qf.domain && (q.domain || section.domain) !== qf.domain) return false;
  return true;
}

/* ---------------- framework crosswalk ---------------- */
const blankCount = () => ({ mapped: 0, Yes: 0, Partial: 0, No: 0, NA: 0, "Not Assessed": 0 });
function finish(c) {
  const applicable = c.mapped - c.NA;
  return {
    ...c, applicable,
    coverage: applicable ? c.Yes / applicable : null,
    effective: applicable ? (c.Yes + 0.5 * c.Partial) / applicable : null,
    openGaps: c.No,
  };
}
const responseBucket = (q, v) => { const r = responseOf(v); return RESPONSES.includes(r) && r ? r : "Not Assessed"; };

// Per framework: mapped, Yes, Partial, No, NA, Not Assessed, applicable, coverage, effective, open gaps
export function crosswalk(assessments, frameworks = FRAMEWORKS) {
  const out = {};
  frameworks.forEach(fw => { out[fw] = blankCount(); });
  assessments.forEach(a => allQuestions(a).forEach(({ q }) => {
    if (q.type !== COMPLIANCE) return;
    const b = responseBucket(q, (a.answers || {})[q.id]);
    (q.frameworks || []).forEach(fw => { if (out[fw]) { out[fw].mapped++; out[fw][b]++; } });
  }));
  Object.keys(out).forEach(fw => { out[fw] = finish(out[fw]); });
  return out;
}

// Per domain: the same counts, for the maturity-by-domain view
export function domainMatrix(assessments) {
  const out = {};
  DOMAINS.forEach(d => { out[d.code] = blankCount(); });
  assessments.forEach(a => allQuestions(a).forEach(({ q, section }) => {
    if (q.type !== COMPLIANCE) return;
    const code = q.domain || section.domain;
    if (!code) return;
    if (!out[code]) out[code] = blankCount();
    out[code].mapped++;
    out[code][responseBucket(q, (a.answers || {})[q.id])]++;
  }));
  Object.keys(out).forEach(k => { out[k] = finish(out[k]); });
  return out;
}

export const usesChecklist = x => (x.sections || []).some(s => s.qs.some(q => q.type === COMPLIANCE));

/* ---------------- templates ---------------- */
// Problems that block publishing a template, each pointing at where it is fixed
export function templateProblems(t, all = []) {
  const out = [];
  if (!String(t.title || "").trim()) out.push({ at: "settings", msg: "Enter a template title." });
  else if (all.some(x => x.id !== t.id && x.title.trim().toLowerCase() === t.title.trim().toLowerCase())) out.push({ at: "settings", msg: "Another template already uses this title." });
  if (!String(t.desc || "").trim()) out.push({ at: "settings", msg: "Enter a description." });
  if (!t.sections.length) out.push({ at: "settings", msg: "Add at least one section." });
  t.sections.forEach((s, si) => {
    const where = `Section ${si + 1}`;
    if (!String(s.name || "").trim()) out.push({ at: si, msg: `${where} needs a name.` });
    if (!s.qs.length) out.push({ at: si, msg: `${where} needs at least one question.` });
    s.qs.forEach((q, qi) => {
      if (!String(q.t || "").trim()) out.push({ at: si, msg: `Question ${si + 1}.${qi + 1} needs text.` });
      if (OPTION_TYPES.includes(q.type) && (q.opts || []).filter(o => String(o).trim()).length < 2) out.push({ at: si, msg: `Question ${si + 1}.${qi + 1} needs at least two options.` });
    });
  });
  return out;
}

export const questionCount = t => t.sections.reduce((n, s) => n + s.qs.length, 0);
