// DPIA rules shared by the screens, the actions and the seed: question numbering, progress,
// risk scoring and the checks run before a template is published or an assessment submitted.
// No DOM access here, because the server imports this file through dpiaData.js.

export const QUESTION_TYPES = ["Short text", "Long text", "Yes/No", "Single choice", "Multiple choice", "Date"];
export const OPTION_TYPES = ["Single choice", "Multiple choice"];

// Assessment lifecycle. "Changes requested" goes back to the assignee.
export const STATUSES = ["Not started", "In progress", "Under review", "Changes requested", "Approved"];
export const OPEN_STATUSES = ["Not started", "In progress", "Under review", "Changes requested"];

// Likelihood × impact, each 1–4
export const LIKELIHOOD = ["Remote", "Possible", "Likely", "Almost certain"];
export const IMPACT = ["Minimal", "Significant", "Severe", "Critical"];
export const RISK_STATUSES = ["Open", "Mitigating", "Accepted", "Closed"];

export function riskLevel(l, i) {
  const s = (Number(l) || 1) * (Number(i) || 1);
  return s >= 12 ? "Critical" : s >= 8 ? "High" : s >= 4 ? "Medium" : "Low";
}
export const LEVEL_ORDER = ["Low", "Medium", "High", "Critical"];
export const residualLevel = r => riskLevel(r.rl || r.l, r.ri || r.i);
export const inherentLevel = r => riskLevel(r.l, r.i);

// The highest residual risk on an assessment, or "—" when none are recorded
export function overallRisk(a) {
  const levels = (a.risks || []).filter(r => r.status !== "Closed").map(residualLevel);
  if (!levels.length) return "—";
  return levels.sort((x, y) => LEVEL_ORDER.indexOf(y) - LEVEL_ORDER.indexOf(x))[0];
}

// [number, question] pairs for a section, e.g. ["3.2", q]
export const numbered = (sections, si) => (sections[si]?.qs || []).map((q, qi) => [`${si + 1}.${qi + 1}`, q]);

export function isAnswered(q, v) {
  if (Array.isArray(v)) return v.length > 0;
  return String(v ?? "").trim() !== "";
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
  const done = qs.filter(q => isAnswered(q, (a.answers || {})[q.id])).length;
  const missing = qs.filter(q => q.req && !isAnswered(q, (a.answers || {})[q.id])).length;
  return { done, total: qs.length, missing };
}

// Required questions still unanswered, across every section
export function missingRequired(a) {
  const out = [];
  (a.sections || []).forEach((s, si) => s.qs.forEach((q, qi) => {
    if (q.req && !isAnswered(q, (a.answers || {})[q.id])) out.push({ si, qi, num: `${si + 1}.${qi + 1}`, q });
  }));
  return out;
}

// Yes answers to questions marked as risk indicators, which do not have a risk recorded yet
export function suggestedRisks(a) {
  const linked = new Set((a.risks || []).map(r => r.from).filter(Boolean));
  const out = [];
  (a.sections || []).forEach((s, si) => s.qs.forEach((q, qi) => {
    if (q.flag && (a.answers || {})[q.id] === "Yes" && !linked.has(q.id)) out.push({ num: `${si + 1}.${qi + 1}`, q, section: s.name });
  }));
  return out;
}

export function isOverdue(a, now = Date.now()) {
  return OPEN_STATUSES.includes(a.status) && a.due && new Date(a.due + "T23:59:59").getTime() < now;
}

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
