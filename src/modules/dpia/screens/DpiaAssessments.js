// Assessments: the list, and the workspace where an assessment is answered, its controls and
// risks are scored, and it is submitted and reviewed.
import {
  progress, sectionProgress, missingRequired, suggestedRisks, numbered, controlProblems, scoredGaps,
  controlScores, riskScores, formatScore, isRiskOpen, riskOverdue, responseOf, textOf, hasTextPart, isScored,
  isGap, isAnswered, isFlagged, COMPLIANCE, filterActive, matchesFilter, allQuestions, ragOf, usesChecklist,
  significantObservations, crosswalk,
} from "../dpiaModel.js";
import {
  RESPONSES, FRAMEWORKS, FRAMEWORK_SHORT, FRAMEWORK_FULL, SCALE_1_5, SCALE_0_5, LIKELIHOOD_LABELS, IMPACT_LABELS,
  CE_LABELS, PRIORITIES, CONTROL_STATUSES, ANNUAL_TYPE, DOMAINS,
} from "../dpiaConfig.js";
import { suggestionKey } from "../dpiaPrefill.js";
import { pickList } from "./dpiaPick.js";

const fwTags = (ctx, q) => (q.frameworks || []).length
  ? `<span class="dp-fw-tags" aria-label="Mapped to ${(q.frameworks || []).map(f => FRAMEWORK_FULL[f] || f).join(", ")}">${(q.frameworks || []).map(f => `<span class="dp-fw" title="Mapped to ${ctx.safe(FRAMEWORK_FULL[f] || f)}">${ctx.safe(FRAMEWORK_SHORT[f] || f)}</span>`).join("")}</span>` : "";

// The suggestion chip under a checklist question
function suggestionHtml(ctx, a, q, value, ro) {
  const { safe } = ctx;
  const s = ctx.suggestion(q, a);
  if (!s) return "";
  const links = (s.links || []).filter(l => l.go).map(l => `<button type="button" class="dp-link" data-go="${safe(l.go)}">${safe(l.label)} ↗</button>`).join(" ");
  if (s.hintOnly) return `<div class="dp-sugg is-hint"><span><b>Where to look:</b> ${safe(s.reason)}</span>${links ? `<span class="dp-sugg-links">${links}</span>` : ""}</div>`;
  const c = (a.controls || {})[q.id] || {};
  const r = responseOf(value);
  const answered = r && r !== "Not Assessed";
  const what = `${s.response ? `<b>${safe(s.response)}</b>` : ""}${s.text ? `${s.response ? " · " : ""}<i>“${safe(s.text.length > 140 ? s.text.slice(0, 137) + "…" : s.text)}”</i>` : ""}`;
  if (!answered) {
    return `<div class="dp-sugg"><span><b>Suggested from ${safe(s.source)} ↗</b> ${what}<small>${safe(s.reason)}</small></span>
      <span class="dp-sugg-links">${links}<button type="button" class="btn sm" data-act="dp-prefill" data-arg="${safe(q.id)}" ${ro ? "disabled" : ""}>Use suggestion</button></span></div>`;
  }
  if (c.prefillAccepted) {
    if (c.prefillKey && c.prefillKey !== suggestionKey(s)) {
      return `<div class="dp-sugg is-changed" role="status"><span><b>Source changed since you accepted it.</b> ${safe(s.source)} now suggests ${what}<small>${safe(s.reason)}</small></span>
        <span class="dp-sugg-links">${links}<button type="button" class="btn sm" data-act="dp-prefill" data-arg="${safe(q.id)}|replace" ${ro ? "disabled" : ""}>Use the new suggestion</button></span></div>`;
    }
    return `<div class="dp-sugg is-accepted"><span>✓ Accepted from ${safe(s.source)}. <small>${safe(s.reason)}</small></span><span class="dp-sugg-links">${links}</span></div>`;
  }
  if (s.response && s.response !== r) return `<div class="dp-sugg is-hint"><span>${safe(s.source)} suggests ${what}. <small>${safe(s.reason)}</small></span><span class="dp-sugg-links">${links}</span></div>`;
  return "";
}

const sel = (ctx, attrs, list, value, labels, blank = "—") => `<select ${attrs}><option value="">${blank}</option>${list.map(v => `<option value="${ctx.safe(v)}" ${String(value ?? "") === String(v) ? "selected" : ""}>${ctx.safe(labels ? `${v} · ${labels[v] || ""}` : v)}</option>`).join("")}</select>`;

// The workbook row for a scored question: evidence, owners, scope, scoring, finding and treatment
export function controlPanel(ctx, a, q, ro) {
  const { safe, ui, PEOPLE } = ctx;
  const c = (a.controls || {})[q.id] || {};
  const v = (a.answers || {})[q.id];
  const r = responseOf(v);
  const gap = isGap(q, v);
  const open = ui.ctlOpen[q.id] ?? (gap || r === "NA");
  const sc = controlScores(c);
  const ev = (c.evidenceIds || []).map(ctx.evidenceById).filter(Boolean);
  const expired = ev.filter(e => ctx.evidenceExpired(e));
  const risk = (a.risks || []).find(x => x.questionId === q.id);
  const id = k => `dp-c-${q.id}-${k}`;
  const at = (k, act = "data-input-act=\"dp-ctl\"") => `id="${id(k)}" ${act} data-q="${safe(q.id)}" data-key="${k}" ${ro ? "disabled" : ""}`;
  const people = PEOPLE.map(p => p.name);
  const acts = ctx.ropaActivities();
  const scope = (a.activityIds || []).length ? acts.filter(x => a.activityIds.includes(x.id)) : acts;
  const actId = c.activityId || a.activityId || "";
  const allAssets = ctx.ropaAssets();
  const assets = allAssets.filter(x => actId && x.acts.includes(actId)).concat(allAssets.filter(x => !(actId && x.acts.includes(actId))));
  const canComment = ctx.role().review && a.status !== "Approved";
  const suggestedEv = (ctx.state.evidence || []).filter(e => (e.questionIds || []).includes(q.code) && !(c.evidenceIds || []).includes(e.id));
  const summaryBits = [sc.rag ? ctx.ragPill(sc.rag) : "", ev.length ? `${ev.length} evidence` : "", c.controlOwner ? safe(c.controlOwner) : "", expired.length ? '<span class="dp-warn-t">expired evidence</span>' : ""].filter(Boolean).join(" · ");
  const head = `<button type="button" class="dp-ctl-h" data-act="dp-ctl-toggle" data-arg="${safe(q.id)}" aria-expanded="${open}">
      <span>${open ? "−" : "+"} Assessment details</span><small>${summaryBits || (gap ? "Score this gap" : "Evidence, owners, scoring")}</small></button>`;
  if (!open) return `<div class="dp-ctl">${head}</div>`;
  return `
    <div class="dp-ctl is-open ${gap ? "is-gap" : ""}">
      ${head}
      <div class="dp-ctl-b">
        ${expired.length ? `<div class="dp-banner is-warn" role="status"><b>Expired evidence:</b> ${expired.map(e => `${safe(e.id)} ${safe(e.title)} (valid until ${safe(ctx.formatDate(e.validUntil))})`).join("; ")}</div>` : ""}
        <div class="dp-ctl-score" data-live-score="${safe(q.id)}">
          <div class="dp-field"><label for="${id("likelihood")}">Likelihood${gap ? " *" : ""}</label>${sel(ctx, at("likelihood", 'data-act="dp-ctl-select"'), SCALE_1_5, c.likelihood, LIKELIHOOD_LABELS)}</div>
          <div class="dp-field"><label for="${id("impact")}">Impact${gap ? " *" : ""}</label>${sel(ctx, at("impact", 'data-act="dp-ctl-select"'), SCALE_1_5, c.impact, IMPACT_LABELS)}</div>
          <div class="dp-field"><label for="${id("controlEffectiveness")}">Control effectiveness${gap ? " *" : ""}</label>${sel(ctx, at("controlEffectiveness", 'data-act="dp-ctl-select"'), SCALE_0_5, c.controlEffectiveness, CE_LABELS)}</div>
          <dl class="dp-ctl-calc" aria-live="polite">
            <div><dt>Inherent</dt><dd data-calc="inherent">${formatScore(sc.inherent, 0)}</dd></div>
            <div><dt>Residual</dt><dd data-calc="residual">${formatScore(sc.residual)}</dd></div>
            <div><dt>RAG</dt><dd data-calc="rag">${ctx.ragPill(sc.rag)}</dd></div>
          </dl>
        </div>
        <div class="dp-form-2">
          <div class="dp-field"><label for="${id("finding")}">Finding / gap${gap ? " *" : ""}</label><textarea rows="2" ${at("finding")} placeholder="What is missing or weak">${safe(c.finding || "")}</textarea></div>
          <div class="dp-field"><label for="${id("recommendation")}">Recommendation / treatment${sc.rag === "RED" ? " *" : ""}</label><textarea rows="2" ${at("recommendation")} placeholder="What will fix it">${safe(c.recommendation || "")}</textarea></div>
          <div class="dp-field"><label for="${id("controlOwner")}">Control owner${gap ? " *" : ""}</label>${sel(ctx, at("controlOwner", 'data-act="dp-ctl-select"'), people, c.controlOwner)}</div>
          <div class="dp-field"><label for="${id("dataOwner")}">Data owner</label>${sel(ctx, at("dataOwner", 'data-act="dp-ctl-select"'), people, c.dataOwner)}</div>
          <div class="dp-field"><label for="${id("priority")}">Priority</label>${sel(ctx, at("priority", 'data-act="dp-ctl-select"'), PRIORITIES, c.priority)}</div>
          <div class="dp-field"><label for="${id("status")}">Status</label>${sel(ctx, at("status", 'data-act="dp-ctl-select"'), CONTROL_STATUSES, c.status || "Open", null, "Open")}</div>
          <div class="dp-field"><label for="${id("targetDate")}">Target date${sc.rag === "RED" ? " *" : ""}</label><input type="date" value="${safe(c.targetDate || "")}" ${at("targetDate")}></div>
          <div class="dp-field"><label for="${id("activityId")}">Business process</label>${sel(ctx, at("activityId", 'data-act="dp-ctl-select"'), scope.map(x => x.id), actId, Object.fromEntries(scope.map(x => [x.id, x.name])), "Not linked")}</div>
        </div>
        <fieldset class="dp-field dp-ctl-assets"><legend>Systems / applications</legend>
          ${pickList(safe, { cls: "", items: assets.map(x => ({ value: x.id, label: x.name, sub: [x.stype, x.loc].filter(Boolean).join(" · ") })), chosen: c.assetIds || [], noun: "systems", after: "dp-ctl-asset", extra: `data-q="${safe(q.id)}"`, disabled: ro })}</fieldset>
        <div class="dp-field"><label for="${id("notes")}">Observation / interview notes${r === "NA" ? " *" : ""}</label><textarea rows="2" ${at("notes")} placeholder="${r === "NA" ? "Explain why this does not apply" : "What you saw or were told"}">${safe(c.notes || "")}</textarea></div>
        <div class="dp-ctl-ev">
          <b>Evidence</b>
          <div class="dp-ev-chips">${ev.map(e => `<span class="dp-ev-chip ${ctx.evidenceExpired(e) ? "is-expired" : ""}" title="${safe(e.type)} · ${safe(e.sufficiency)}">${safe(e.id)} ${safe(e.title)}${ctx.evidenceExpired(e) ? " · expired" : ""}
            <button type="button" class="dp-icon-btn" data-act="dp-ctl-ev-unlink" data-arg="${safe(q.id)}|${safe(e.id)}" ${ro ? "disabled" : ""} aria-label="Unlink ${safe(e.id)}">✕</button></span>`).join("") || '<span class="dp-muted">No evidence linked.</span>'}</div>
          <div class="dp-ev-add">
            <select data-act="dp-ctl-ev-link" data-q="${safe(q.id)}" aria-label="Link evidence" ${ro ? "disabled" : ""}><option value="">Link evidence…</option>
              ${suggestedEv.length ? `<optgroup label="Supports ${safe(q.code || "this question")}">${suggestedEv.map(e => `<option value="${safe(e.id)}">${safe(e.id)} · ${safe(e.title)}</option>`).join("")}</optgroup>` : ""}
              <optgroup label="All evidence">${(ctx.state.evidence || []).filter(e => !(c.evidenceIds || []).includes(e.id)).map(e => `<option value="${safe(e.id)}">${safe(e.id)} · ${safe(e.title)}</option>`).join("")}</optgroup></select>
            <button type="button" class="btn sm" data-act="dp-ev-new" data-arg="${safe(q.code || "")}|${safe(a.id)}|${safe(q.id)}" ${ro ? "disabled" : ""}>+ New evidence</button>
          </div>
        </div>
        <div class="dp-field"><label for="${id("review")}">Reviewer comments</label>
          ${canComment ? `<textarea id="${id("review")}" rows="2" data-input-act="dp-ctl-review" data-q="${safe(q.id)}" placeholder="Visible to the assessor">${safe(c.reviewerComments || "")}</textarea>`
            : `<p class="dp-muted">${safe(c.reviewerComments || "No comments from the reviewer.")}</p>`}</div>
        <div class="dp-ctl-f">
          ${gap ? (risk ? `<span class="dp-ok-t">Risk ${safe(risk.id)} created</span> <button type="button" class="dp-link" data-act="dp-step" data-arg="risks">Open risks</button>`
            : `<button type="button" class="btn sm" data-act="dp-risk-from-gap" data-arg="${safe(q.id)}" ${ro ? "disabled" : ""}>Create risk from this gap</button>`) : ""}
          ${sc.rag === "RED" && c.targetDate ? (ctx.state.tasks.some(t => t.assessment === a.id && t.ref === q.code)
            ? '<span class="dp-muted">Task created</span>' : `<button type="button" class="btn sm" data-act="dp-ctl-task" data-arg="${safe(q.id)}" ${ro ? "disabled" : ""}>Create task</button>`) : ""}
        </div>
      </div>
    </div>`;
}

// One question and its answer control. mode "answer" saves to the assessment (pass `a`),
// "preview" to a throwaway copy used by the template preview.
export function questionHtml(ctx, q, num, value, { ro = false, mode = "answer", a = null } = {}) {
  const { safe } = ctx;
  const id = `dp-q-${q.id}`;
  const attrs = `data-q="${safe(q.id)}" data-mode="${mode}" ${ro ? "disabled" : ""}`;
  let control;
  if (q.type === "Long text") control = `<textarea id="${id}" rows="3" data-input-act="dp-answer" ${attrs}>${safe(value || "")}</textarea>`;
  else if (q.type === "Short text") control = `<input id="${id}" value="${safe(value || "")}" data-input-act="dp-answer" ${attrs} autocomplete="off">`;
  else if (q.type === "Date") control = `<input id="${id}" type="date" value="${safe(value || "")}" data-input-act="dp-answer" ${attrs}>`;
  else if (q.type === "Single choice") {
    control = `<select id="${id}" data-act="dp-answer-select" ${attrs}><option value="">Select an option</option>
      ${(q.opts || []).filter(Boolean).map(o => `<option ${value === o ? "selected" : ""}>${safe(o)}</option>`).join("")}</select>`;
  } else if (q.type === "Yes/No" || q.type === COMPLIANCE) {
    const opts = q.type === COMPLIANCE ? RESPONSES : ["Yes", "No"];
    const cur = responseOf(value);
    control = `${hasTextPart(q) ? `<textarea id="${id}-text" rows="2" class="dp-q-textpart" data-input-act="dp-answer-text" ${attrs} aria-label="Answer to ${safe(q.code || num)}" placeholder="Describe">${safe(textOf(value))}</textarea>` : ""}
      <div class="dp-yn ${q.type === COMPLIANCE ? "is-resp" : ""}" role="radiogroup" aria-labelledby="${id}-l">${opts.map(o => `
      <label class="${cur === o ? "on" : ""} ${q.type === COMPLIANCE ? `r-${o.replace(/\s/g, "").toLowerCase()}` : ""}"><input type="radio" name="${id}" value="${o}" ${cur === o ? "checked" : ""} data-change-act="dp-answer-radio" ${attrs}> ${o}</label>`).join("")}</div>`;
  } else {
    const v = Array.isArray(value) ? value : [];
    control = `<div class="dp-multi">${(q.opts || []).filter(Boolean).map(o => `
      <label class="dp-check"><input type="checkbox" value="${safe(o)}" ${v.includes(o) ? "checked" : ""} data-change-act="dp-answer-multi" ${attrs}> ${safe(o)}</label>`).join("")}</div>`;
  }
  const flagged = isFlagged(q, value);
  const gapNote = q.type === COMPLIANCE ? "A No or Partial here suggests a risk to record." : "A Yes here suggests a risk to record.";
  const labelFor = ["Yes/No", "Multiple choice", COMPLIANCE].includes(q.type) ? "" : `for="${id}"`;
  return `
    <div class="dp-q ${flagged ? "is-flagged" : ""} ${isGap(q, value) ? "is-gap" : ""}" data-qwrap="${safe(q.id)}">
      <div class="dp-q-h">
        <span class="dp-qn">${safe(num)}</span>
        ${q.code ? `<span class="dp-code">${safe(q.code)}</span>` : ""}
        <label class="dp-q-t" id="${id}-l" ${labelFor}>${safe(q.t)}${q.req ? '<b class="dp-req" title="Required"> *</b>' : ""}</label>
        ${fwTags(ctx, q)}
      </div>
      ${q.help ? `<p class="dp-q-help">${safe(q.help)}</p>` : ""}
      ${control}
      ${q.flag ? `<p class="dp-q-flag">${flagged ? "⚑ This answer suggests a risk. Record it in Risks &amp; mitigations." : gapNote}</p>` : ""}
      ${a && mode === "answer" && q.code ? suggestionHtml(ctx, a, q, value, ro) : ""}
      ${a && mode === "answer" && isScored(q) ? controlPanel(ctx, a, q, ro) : ""}
    </div>`;
}

export function createAssessmentsRenderer(ctx) {
  const { ui, safe, formatDate, formatDateTime, statusPill, ragPill, dueBadge, dis, STATUSES } = ctx;
  const pct = n => `<div class="dp-pb"><span style="width:${n}%"></span></div><span class="dp-pb-n">${n}%</span>`;

  /* ---------------- list ---------------- */
  function filtered() {
    const q = ui.aSearch.trim().toLowerCase();
    return ctx.state.assessments.filter(a =>
      (!q || [a.id, a.name, a.tplTitle, a.who, a.activityName, a.assessmentType].some(v => String(v || "").toLowerCase().includes(q))) &&
      (!ui.aStatus || (ui.aStatus === "Overdue" ? ctx.isOverdue(a) : a.status === ui.aStatus)) &&
      (!ui.aMine || a.who === ctx.currentUser.name || a.reviewer === ctx.currentUser.name || (a.assessors || []).includes(ctx.currentUser.name)));
  }

  function list() {
    const all = ctx.state.assessments;
    const rows = filtered();
    const count = s => s === "Overdue" ? all.filter(ctx.isOverdue).length : s ? all.filter(a => a.status === s).length : all.length;
    const chip = (v, l) => `<button class="dp-chip ${ui.aStatus === v ? "active" : ""}" data-act="dp-a-status" data-arg="${v}" aria-pressed="${ui.aStatus === v}">${l} <b>${count(v)}</b></button>`;
    return `
      <div class="dp-screen-head">
        <div><h2>Assessments</h2><p>Each assessment follows a template version, scores its controls and risks, and is approved by the DPO.</p></div>
        <div class="dp-head-actions"><button class="btn sm t" data-act="dp-new-assessment" ${dis(ctx.role().send)}>+ New assessment</button></div>
      </div>
      <div class="dp-chips" role="group" aria-label="Filter by status">
        ${chip("", "All")}${STATUSES.map(s => chip(s, s)).join("")}${chip("Overdue", "Overdue")}
      </div>
      <div class="card dp-table-card">
        <div class="dp-toolbar">
          <label class="dp-search"><span aria-hidden="true">⌕</span>
            <input id="dp-a-search" type="search" placeholder="Search name, ID, template, person or activity" value="${safe(ui.aSearch)}" data-input-act="dp-a-search" aria-label="Search assessments"></label>
          <label class="dp-check"><input type="checkbox" data-change-act="dp-a-mine" ${ui.aMine ? "checked" : ""}> Assigned to me or for my review</label>
          <span class="dp-sp"></span><span class="dp-muted">${rows.length} of ${all.length}</span>
        </div>
        <div class="tw"><table class="t dp-table" id="dp-assessments-table">
          <thead><tr><th>Assessment</th><th>Template</th><th>Assignee</th><th>Progress</th><th>Status</th><th>Due</th><th>RAG</th></tr></thead>
          <tbody>
            ${rows.map(a => `
              <tr class="click" data-act="dp-open" data-arg="${safe(a.id)}">
                <td><div class="dp-cell-2"><button class="dp-link" data-act="dp-open" data-arg="${safe(a.id)}">${safe(a.name)}</button>
                  <small><span class="dp-mono">${safe(a.id)}</span>${a.assessmentType && a.assessmentType !== "Project DPIA" ? ` · ${safe(a.assessmentType)}` : ""}${a.activityName ? ` · ${safe(a.activityName)}${(a.activityIds || []).length > 1 ? ` +${a.activityIds.length - 1}` : ""}` : ""}</small></div></td>
                <td><div class="dp-cell-2"><span>${safe(a.tplTitle)}</span><small>v${a.tplVersion}</small></div></td>
                <td>${safe(a.who)}</td>
                <td><div class="dp-pbw">${pct(progress(a))}</div></td>
                <td>${statusPill(a.status)}</td>
                <td>${dueBadge(a)}</td>
                <td>${ragPill(ctx.overallRag(a))}</td>
              </tr>`).join("") || `<tr><td colspan="7"><div class="dp-empty">No assessments match these filters.
                <button class="btn sm" data-act="dp-a-clear">Clear filters</button></div></td></tr>`}
          </tbody>
        </table></div>
      </div>`;
  }

  /* ---------------- workspace ---------------- */
  const STEP_RISKS = "risks", STEP_SUMMARY = "summary";
  const stepOf = a => (ui.step === STEP_RISKS || ui.step === STEP_SUMMARY) ? ui.step : Math.min(Number(ui.step) || 0, a.sections.length - 1);

  function stepsNav(a) {
    const cur = stepOf(a);
    const risks = (a.risks || []).length, sugg = suggestedRisks(a).length;
    const red = (a.risks || []).filter(r => isRiskOpen(r) && riskScores(r).rag === "RED").length;
    return `
      <nav class="card dp-steps" aria-label="Assessment sections" data-live-steps>
        <div class="dp-steps-h"><b>Sections</b><span data-live-progress>${pct(progress(a))}</span></div>
        <ol>
          ${a.sections.map((s, i) => {
            const p = sectionProgress(a, i);
            const done = p.total && p.done === p.total;
            return `
              <li><button class="${cur === i ? "active" : ""}" data-act="dp-step" data-arg="${i}" aria-current="${cur === i ? "step" : "false"}">
                <i class="${done ? "is-done" : ""}">${done ? "✓" : i + 1}</i>
                <span><b>${s.domain ? `<span class="dp-dcode">${safe(s.domain)}</span> ` : ""}${safe(s.name)}</b><small>${p.done}/${p.total} answered${p.missing ? ` · ${p.missing} required left` : ""}${p.red ? ` · <em class="dp-red-t">${p.red} RED</em>` : ""}</small></span>
              </button></li>`;
          }).join("")}
          <li class="dp-steps-sep"><button class="${cur === STEP_RISKS ? "active" : ""}" data-act="dp-step" data-arg="${STEP_RISKS}">
            <i class="is-risk">!</i><span><b>Risks &amp; mitigations</b><small>${risks} recorded${red ? ` · <em class="dp-red-t">${red} RED</em>` : ""}${sugg ? ` · ${sugg} suggested` : ""}</small></span></button></li>
          <li><button class="${cur === STEP_SUMMARY ? "active" : ""}" data-act="dp-step" data-arg="${STEP_SUMMARY}">
            <i>≡</i><span><b>Summary &amp; sign-off</b><small>${safe(a.status)}</small></span></button></li>
        </ol>
      </nav>`;
  }

  function filterBar(a) {
    if (!usesChecklist(a)) return "";
    const qf = ui.qf;
    const f = (key, label, opts) => `<label class="dp-qf-f"><span>${label}</span><select data-act="dp-qf" data-key="${key}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${safe(v)}" ${qf[key] === v ? "selected" : ""}>${safe(l)}</option>`).join("")}</select></label>`;
    const domains = DOMAINS.filter(d => a.sections.some(s => s.domain === d.code || s.qs.some(q => q.domain === d.code)));
    return `
      <div class="card dp-qf" role="search" aria-label="Filter questions">
        ${f("resp", "Response", [["", "Any"], ["Gaps", "No or Partial"], ["No", "No"], ["Partial", "Partial"], ["Yes", "Yes"], ["NA", "NA"], ["Not Assessed", "Not assessed"]])}
        ${f("rag", "RAG", [["", "Any"], ["RED", "RED"], ["AMBER", "AMBER"], ["GREEN", "GREEN"]])}
        ${f("fw", "Framework", [["", "Any"]].concat(FRAMEWORKS.map(x => [x, x])))}
        ${f("ev", "Evidence", [["", "Any"], ["yes", "Has evidence"], ["no", "No evidence"]])}
        ${f("owner", "Owner", [["", "Anyone"]].concat(ctx.PEOPLE.map(p => [p.name, p.name])))}
        ${domains.length > 1 ? f("domain", "Domain", [["", "All"]].concat(domains.map(d => [d.code, `${d.code} · ${d.name}`]))) : ""}
        ${filterActive(qf) ? '<button class="btn sm" data-act="dp-qf-clear">Clear filters</button>' : ""}
      </div>`;
  }

  function filteredStep(a, ro) {
    const hits = allQuestions(a).filter(x => matchesFilter(a, x.q, x.section, ui.qf));
    const bySec = {};
    hits.forEach(x => { (bySec[x.si] = bySec[x.si] || []).push(x); });
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h"><span class="dp-eyebrow">Filtered questions</span><h3>${hits.length} question${hits.length === 1 ? "" : "s"} match</h3><p>Across all sections. Clear the filters to go back to answering section by section.</p></div>
        ${Object.entries(bySec).map(([si, xs]) => `<h4 class="dp-sub-h">${safe(a.sections[si].name)}</h4><div class="dp-qs">${xs.map(x => questionHtml(ctx, x.q, x.num, (a.answers || {})[x.q.id], { ro, a })).join("")}</div>`).join("") || '<div class="dp-empty">No questions match these filters.</div>'}
      </section>`;
  }

  function sectionStep(a, i, ro) {
    const s = a.sections[i];
    const last = i === a.sections.length - 1;
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h"><span class="dp-eyebrow">Section ${i + 1} of ${a.sections.length}${s.domain ? ` · ${safe(s.domain)}` : ""}</span><h3>${safe(s.name)}</h3>${s.desc ? `<p>${safe(s.desc)}</p>` : ""}</div>
        <div class="dp-qs">${numbered(a.sections, i).map(([n, q]) => questionHtml(ctx, q, n, (a.answers || {})[q.id], { ro, a })).join("")}</div>
        <div class="dp-step-f">
          ${i > 0 ? `<button class="btn sm" data-act="dp-step" data-arg="${i - 1}">← Previous</button>` : "<span></span>"}
          <span class="dp-muted">${ro ? "Read-only" : "Answers save automatically"}</span>
          <button class="btn sm t" data-act="dp-step" data-arg="${last ? STEP_RISKS : i + 1}">${last ? "Next: Risks →" : "Next section →"}</button>
        </div>
      </section>`;
  }

  // 5×5 inherent heat map, coloured by the L×I band
  function matrix(risks) {
    const cell = (l, i) => risks.filter(r => Number(r.likelihood) === l && Number(r.impact) === i).length;
    return `
      <div class="dp-matrix is-5" role="table" aria-label="Inherent risk matrix">
        <div class="dp-mx-y" aria-hidden="true">Likelihood</div>
        <div class="dp-mx-grid">
          ${[5, 4, 3, 2, 1].map(l => `
            <div class="dp-mx-row" role="row"><span class="dp-mx-l" role="rowheader">${l} ${LIKELIHOOD_LABELS[l]}</span>
              ${[1, 2, 3, 4, 5].map(i => { const n = cell(l, i); const rag = ragOf(l * i); return `<span role="cell" class="dp-mx-c rag-${rag.toLowerCase()} ${n ? "has" : ""}" title="${LIKELIHOOD_LABELS[l]} × ${IMPACT_LABELS[i]} = ${l * i} (${rag})">${n || ""}</span>`; }).join("")}
            </div>`).join("")}
          <div class="dp-mx-row dp-mx-x"><span></span>${[1, 2, 3, 4, 5].map(i => `<span>${i} ${IMPACT_LABELS[i]}</span>`).join("")}</div>
        </div>
      </div>`;
  }

  function ragBars(items) {
    const n = rag => items.filter(x => x === rag).length;
    const max = Math.max(1, items.length);
    return `<div class="dp-hbars">${["RED", "AMBER", "GREEN"].map(rag => `
      <div class="dp-hbar"><span class="dp-hbar-l">${rag}</span><span class="dp-hbar-t"><span class="dp-hbar-f rag-${rag.toLowerCase()}" style="width:${(n(rag) / max) * 100}%"></span></span><span class="dp-hbar-v">${n(rag)}</span></div>`).join("")}</div>`;
  }

  function riskCard(a, r, k, ro) {
    const sc = riskScores(r);
    const q = r.questionId && allQuestions(a).find(x => x.q.id === r.questionId);
    const acc = r.acceptance || {};
    const task = ctx.state.tasks.find(t => t.assessment === a.id && t.ref === r.id);
    const canAccept = isRiskOpen(r) && r.status !== "Accepted" && a.status !== "Approved";
    return `
      <article class="dp-risk ${isRiskOpen(r) ? "" : "is-closed"}">
        <div class="dp-risk-h">
          <b><span class="dp-mono">${safe(r.id)}</span> ${safe(r.title)}</b>
          <span class="dp-risk-lv"><small>L${r.likelihood} × I${r.impact} = ${formatScore(sc.inherent, 0)}</small><span aria-hidden="true">→</span><small>CE ${r.controlEffectiveness} · ${formatScore(sc.residual)}</small>${ragPill(sc.rag)}</span>
        </div>
        <div class="dp-risk-meta">
          ${q ? `<span>From ${q.q.code ? `<span class="dp-code">${safe(q.q.code)}</span>` : safe(q.num)}</span>` : ""}
          ${r.activityId ? `<span>${safe(r.activityId)}</span>` : ""}
          <span>Priority ${safe(r.priority)}</span>
          ${r.targetDate ? `<span class="${riskOverdue(r) ? "dp-red-t" : ""}">Target ${safe(formatDate(r.targetDate))}${riskOverdue(r) ? " · overdue" : ""}</span>` : ""}
        </div>
        ${r.scenario ? `<p>${safe(r.scenario)}</p>` : ""}
        ${r.threat || r.harm ? `<p class="dp-muted">${r.threat ? `<b>Threat:</b> ${safe(r.threat)} ` : ""}${r.harm ? `<b>Harm:</b> ${safe(r.harm)}` : ""}</p>` : ""}
        ${r.treatment ? `<p class="dp-risk-m"><b>Treatment:</b> ${safe(r.treatment)}</p>` : '<p class="dp-risk-m is-none">No treatment recorded yet.</p>'}
        ${acc.decision ? `<p class="dp-risk-acc"><b>${safe(acc.decision)}</b> by ${safe(acc.by)} on ${safe(formatDate(acc.at))}${acc.escalatedTo ? ` · escalated to ${safe(acc.escalatedTo)}` : ""}. ${safe(acc.rationale)}</p>` : ""}
        <div class="dp-risk-f">
          <span>${safe(r.owner || "No owner")} · ${safe(r.status)}</span>
          <span class="dp-sp"></span>
          ${canAccept ? `<button class="btn sm" data-act="dp-risk-accept" data-arg="${k}" ${ctx.canEdit() ? "" : "disabled"}>Accept or escalate</button>` : ""}
          ${r.targetDate && isRiskOpen(r) ? (task ? '<span class="dp-muted">Task created</span>' : `<button class="btn sm" data-act="dp-risk-task" data-arg="${k}" ${ro ? "disabled" : ""}>Create task</button>`) : ""}
          <button class="btn sm" data-act="dp-risk-edit" data-arg="${k}" ${ro ? "disabled" : ""}>Edit</button>
          <button class="dp-icon-btn" data-act="dp-risk-delete" data-arg="${k}" ${ro ? "disabled" : ""} aria-label="Delete risk ${safe(r.title)}" title="Delete risk">🗑</button>
        </div>
      </article>`;
  }

  function risksStep(a, ro) {
    const risks = a.risks || [];
    const sugg = suggestedRisks(a);
    const linked = new Set(risks.map(r => r.questionId));
    const gaps = scoredGaps(a).filter(g => !linked.has(g.q.id) && g.scores.rag && g.scores.rag !== "GREEN");
    const open = risks.filter(isRiskOpen);
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h dp-step-h-row">
          <div><span class="dp-eyebrow">Risks &amp; mitigations</span><h3>Risks to data principals</h3>
            <p>Score likelihood and impact from 1 to 5 and the effectiveness of existing controls from 0 to 5. Residual = inherent × (1 − CE/5).</p></div>
          <button class="btn sm t" data-act="dp-risk-add" ${ro ? "disabled" : ""}>+ Add risk</button>
        </div>
        ${gaps.length ? `
          <div class="dp-suggest">
            <b>Scored gaps with no risk yet</b>
            ${gaps.slice(0, 8).map(g => `
              <div class="dp-suggest-row"><span>${g.q.code ? `<span class="dp-code">${safe(g.q.code)}</span>` : `<span class="dp-qn">${g.num}</span>`} ${safe(g.c.finding || g.q.t)} ${ragPill(g.scores.rag)}</span>
                <button class="btn sm" data-act="dp-risk-from-gap" data-arg="${safe(g.q.id)}" ${ro ? "disabled" : ""}>Create risk</button></div>`).join("")}
          </div>` : ""}
        ${sugg.length ? `
          <div class="dp-suggest">
            <b>Suggested from your answers</b>
            ${sugg.map(x => `
              <div class="dp-suggest-row"><span><span class="dp-qn">${x.num}</span> ${safe(x.q.t)} <em>${safe(responseOf((a.answers || {})[x.q.id]))}</em></span>
                <button class="btn sm" data-act="dp-risk-add" data-arg="${safe(x.q.id)}" ${ro ? "disabled" : ""}>Record a risk</button></div>`).join("")}
          </div>` : ""}
        ${risks.length ? `
          <div class="dp-risks">${risks.map((r, k) => riskCard(a, r, k, ro)).join("")}</div>
          <div class="dp-matrices">
            <div><h4>Inherent (likelihood × impact)</h4>${matrix(open)}</div>
            <div><h4>Residual RAG of open risks</h4>${ragBars(open.map(r => riskScores(r).rag))}
              <p class="dp-hint">Residual 1–5 GREEN · 6–12 AMBER · 13–25 RED.</p></div>
          </div>` : `<div class="dp-empty">No risks recorded yet.${sugg.length || gaps.length ? " Start with the suggestions above." : ""}</div>`}
        <div class="dp-step-f">
          <button class="btn sm" data-act="dp-step" data-arg="${a.sections.length - 1}">← Previous</button><span></span>
          <button class="btn sm t" data-act="dp-step" data-arg="${STEP_SUMMARY}">Next: Summary →</button>
        </div>
      </section>`;
  }

  // Rule 13: the report of significant observations for the Data Protection Board. Built from
  // RED and AMBER gaps and risks; a gap and the risk raised from it are one observation.
  function observations(a) {
    const obs = significantObservations(a);
    const red = obs.filter(o => o.rag === "RED"), amber = obs.filter(o => o.rag === "AMBER");
    const overdue = obs.filter(o => o.overdue);
    const escalated = obs.filter(o => o.acceptance && o.acceptance.escalatedTo);
    const cw = crosswalk([a]).DPDPA;
    const acts = ctx.ropaActivities().filter(x => (a.activityIds || []).includes(x.id));
    const org = ctx.sampleData.org;
    const latest = obs.map(o => o.targetDate).filter(Boolean).sort().pop();
    const period = `${formatDate(a.created)} – ${a.completedAt ? formatDate(a.completedAt) : `due ${formatDate(a.due)}`}`;
    const actName = id => (ctx.ropaActivities().find(x => x.id === id) || {}).name || id;

    const lead = !obs.length
      ? "The assessment found no significant observations: no gap or risk has a residual score of 6 or more."
      : `The assessment found <b>${obs.length} significant observation${obs.length > 1 ? "s" : ""}</b>: ${red.length} RED and ${amber.length} AMBER.
        The most serious is <b>${safe(obs[0].title)}</b> (${safe(obs[0].ref)}, residual ${formatScore(obs[0].residual)}).
        ${escalated.length ? `${escalated.length} ${escalated.length > 1 ? "have" : "has"} been escalated. ` : ""}
        ${latest ? `All treatments are due by ${safe(formatDate(latest))}` : "Treatments have no target dates yet"}${overdue.length ? `; <b class="dp-red-t">${overdue.length} ${overdue.length > 1 ? "are" : "is"} overdue</b>.` : "."}`;

    const card = o => {
      const acc = o.acceptance || {};
      const pct = Math.min(100, Math.round(((o.residual || 0) / 25) * 100));
      return `
        <article class="dp-obs is-${o.rag.toLowerCase()}">
          <div class="dp-obs-top">
            <span class="dp-code">${safe(o.ref)}</span>
            <span class="dp-obs-domain">${o.domainCode ? `<b>${safe(o.domainCode)}</b> ` : ""}${safe(o.domain)}</span>
            <span class="dp-sp"></span>
            <span class="dp-obs-score" title="Residual risk out of 25"><b>${formatScore(o.residual)}</b><small>/ 25</small><i><s style="width:${pct}%"></s></i></span>
            ${ragPill(o.rag)}
          </div>
          <h5>${safe(o.title)}</h5>
          ${o.observation && o.observation !== o.title ? `<p>${safe(o.observation)}</p>` : ""}
          ${o.question ? `<p class="dp-obs-q">Checklist: “${safe(o.question)}” · answered <b>${safe(o.response || "—")}</b></p>` : ""}
          <dl class="dp-obs-grid">
            <div class="is-wide"><dt>Treatment</dt><dd>${safe(o.treatment || "Not recorded yet")}</dd></div>
            <div><dt>Owner</dt><dd>${safe(o.owner || "—")}</dd></div>
            <div><dt>Target date</dt><dd>${o.targetDate ? `${safe(formatDate(o.targetDate))}${o.overdue ? ' <span class="dp-due is-late">Overdue</span>' : ""}` : "—"}</dd></div>
            <div><dt>Status</dt><dd>${safe(o.status)}</dd></div>
            <div><dt>Scoring</dt><dd>L${safe(o.likelihood ?? "—")} × I${safe(o.impact ?? "—")} · CE ${safe(o.controlEffectiveness ?? "—")}</dd></div>
            ${o.activityId ? `<div><dt>Processing activity</dt><dd>${safe(o.activityId)} ${safe(actName(o.activityId))}</dd></div>` : ""}
            ${o.riskId ? `<div><dt>Risk</dt><dd>${safe(o.riskId)}</dd></div>` : ""}
          </dl>
          ${acc.decision ? `<p class="dp-obs-acc"><b>${safe(acc.decision)}${acc.escalatedTo ? ` ${acc.decision === "Escalated" ? "" : "and escalated "}to ${safe(acc.escalatedTo)}` : ""}</b> by ${safe(acc.by)} on ${safe(formatDate(acc.at))}${acc.rationale ? `. ${safe(acc.rationale)}` : ""}</p>`
            : o.rag === "RED" ? '<p class="dp-obs-acc is-missing">No acceptance or escalation recorded yet. A RED observation must be escalated.</p>' : ""}
          <div class="dp-obs-f">${o.si !== null && o.qid ? `<button class="dp-link" data-act="dp-jump" data-arg="${o.si}|${safe(o.qid)}">Open question</button>` : ""}${o.riskId ? `<button class="dp-link" data-act="dp-step" data-arg="risks">Open risk</button>` : ""}</div>
        </article>`;
    };
    const group = (label, list, cls) => list.length ? `<h5 class="dp-obs-group ${cls}">${label} <span>${list.length}</span></h5><div class="dp-obs-list">${list.map(card).join("")}</div>` : "";

    return `
      <section class="dp-report" id="dp-report" aria-label="Report of significant observations">
        <header class="dp-report-h">
          <div>
            <span class="dp-eyebrow">DPDP Rules 2025 · Rule 13 · Report to the Data Protection Board</span>
            <h4>Report of significant observations</h4>
            <p class="dp-muted">${safe(org.name)} · ${safe(a.name)} (${safe(a.id)})</p>
          </div>
          <div class="dp-report-actions">
            <button class="btn sm" data-act="dp-report-csv">Export CSV</button>
            <button class="btn sm t" data-act="dp-print-report">Print report</button>
          </div>
        </header>

        <dl class="dp-report-meta">
          <div><dt>Organisation role</dt><dd>${safe(a.orgRole)}${a.sdf ? " · Significant Data Fiduciary" : ""}</dd></div>
          <div><dt>Assessment period</dt><dd>${safe(period)}</dd></div>
          <div><dt>Status</dt><dd>${statusPill(a.status)}</dd></div>
          <div class="is-wide"><dt>Scope</dt><dd>${acts.map(x => `${safe(x.id)} ${safe(x.name)}`).join(" · ") || "No Data Map activities linked"}</dd></div>
          <div><dt>Prepared by</dt><dd>${safe([a.who].concat(a.assessors || []).join(", "))}</dd></div>
          <div><dt>Reviewer</dt><dd>${safe(a.reviewer)}</dd></div>
          <div><dt>Method</dt><dd>Integrated checklist ${safe(a.methodologyVersion)} · 5×5 with control effectiveness</dd></div>
        </dl>

        <div class="dp-report-kpis">
          <div><span>Overall rating</span><strong>${ragPill(ctx.overallRag(a))}</strong></div>
          <div class="${red.length ? "is-red" : ""}"><span>RED observations</span><strong>${red.length}</strong></div>
          <div class="${amber.length ? "is-amber" : ""}"><span>AMBER observations</span><strong>${amber.length}</strong></div>
          <div class="${overdue.length ? "is-red" : ""}"><span>Overdue treatments</span><strong>${overdue.length}</strong></div>
          <div><span>Answered</span><strong>${progress(a)}%</strong></div>
          <div><span>DPDPA coverage</span><strong>${cw.coverage === null ? "—" : `${Math.round(cw.coverage * 100)}%`}</strong></div>
        </div>

        <p class="dp-report-lead">${lead}</p>

        ${group("RED · immediate action and escalation", red, "is-red")}
        ${group("AMBER · planned treatment", amber, "is-amber")}
        ${obs.length ? "" : '<div class="dp-empty">No RED or AMBER observations.</div>'}

        <footer class="dp-report-sign">
          <div><span>Prepared by</span><b>${safe(a.who)}</b><small>${safe(ctx.teamOf(a.who))}</small></div>
          <div><span>Reviewed and approved by</span><b>${a.status === "Approved" ? safe(a.reviewer) : "Pending approval"}</b><small>${a.completedAt ? safe(formatDate(a.completedAt)) : "Not yet signed off"}</small></div>
          <p class="dp-muted">Generated from ${safe(a.id)} on ${safe(formatDate(new Date().toISOString()))}. The figures update as the assessment changes. Residual 6–12 is AMBER and 13–25 is RED.</p>
        </footer>
      </section>`;
  }

  function summaryStep(a) {
    const miss = missingRequired(a);
    const ctl = controlProblems(a);
    const risks = (a.risks || []).filter(isRiskOpen);
    const byRag = ["RED", "AMBER", "GREEN"].map(l => [l, risks.filter(r => riskScores(r).rag === l).length]).filter(x => x[1]);
    const unaccepted = risks.filter(r => riskScores(r).rag === "RED" && !(r.acceptance || {}).decision);
    const sugg = suggestedRisks(a).length;
    const cited = new Set(Object.values(a.controls || {}).flatMap(c => c.evidenceIds || []));
    const expired = [...cited].map(ctx.evidenceById).filter(e => e && ctx.evidenceExpired(e));
    const jump = x => `<button class="dp-chip" data-act="dp-jump" data-arg="${x.si}|${safe(x.q.id)}" title="${safe(x.msgs ? `Needs ${x.msgs.join(", ")}` : x.q.t)}">${safe(x.q.code || x.num)}</button>`;
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h"><span class="dp-eyebrow">Summary &amp; sign-off</span><h3>Ready to submit?</h3></div>
        <ul class="dp-checklist">
          <li class="${miss.length ? "is-bad" : "is-ok"}">${miss.length ? `${miss.length} required question${miss.length > 1 ? "s" : ""} unanswered` : "All required questions answered"}
            ${miss.length ? `<div class="dp-miss">${miss.slice(0, 10).map(jump).join("")}${miss.length > 10 ? `<span class="dp-muted">+${miss.length - 10} more</span>` : ""}</div>` : ""}</li>
          ${usesChecklist(a) ? `<li class="${ctl.length ? "is-bad" : "is-ok"}">${ctl.length ? `${ctl.length} control record${ctl.length > 1 ? "s are" : " is"} incomplete` : "Every gap is scored, owned and explained"}
            ${ctl.length ? `<div class="dp-miss">${ctl.slice(0, 10).map(jump).join("")}${ctl.length > 10 ? `<span class="dp-muted">+${ctl.length - 10} more</span>` : ""}</div><p class="dp-hint">Gaps need a finding, likelihood, impact, control effectiveness and a control owner; RED gaps also need a treatment and target date; NA needs a note.</p>` : ""}</li>` : ""}
          <li class="${sugg ? "is-warn" : "is-ok"}">${sugg ? `${sugg} flagged answer${sugg > 1 ? "s have" : " has"} no risk recorded` : "Every flagged answer has a risk recorded"}</li>
          <li class="${unaccepted.length ? "is-warn" : "is-ok"}">${risks.length ? `${risks.length} open risk${risks.length > 1 ? "s" : ""}: ${byRag.map(([l, n]) => `${n} ${l}`).join(", ")}` : "No open risks recorded"}${unaccepted.length ? ` · ${unaccepted.length} RED without an acceptance or escalation decision` : ""}</li>
          ${expired.length ? `<li class="is-warn">${expired.length} cited evidence item${expired.length > 1 ? "s have" : " has"} expired: ${expired.map(e => safe(e.id)).join(", ")}</li>` : ""}
        </ul>
        ${a.reviewNote ? `<div class="dp-banner ${a.status === "Changes requested" ? "is-risk" : ""}"><b>Reviewer note:</b> ${safe(a.reviewNote)}</div>` : ""}
        ${a.assessmentType === ANNUAL_TYPE || a.sdf && usesChecklist(a) ? observations(a) : ""}
        <h4 class="dp-sub-h">Activity</h4>
        <ol class="dp-timeline">
          ${[...(a.activity || [])].reverse().map(x => `<li><span class="dp-tl-dot" aria-hidden="true"></span><div><b>${safe(x.by)}</b> <small>${safe(formatDateTime(x.at))}</small><p>${safe(x.text)}</p></div></li>`).join("")}
        </ol>
        <div class="dp-step-f">
          <button class="btn sm" data-act="dp-step" data-arg="${STEP_RISKS}">← Previous</button><span></span>
          ${actionButtons(a, true)}
        </div>
      </section>`;
  }

  function actionButtons(a, primaryOnly) {
    const out = [];
    if (ctx.canFill(a)) out.push(`<button class="btn sm t" data-act="dp-submit">${a.status === "Changes requested" ? "Resubmit for review" : "Submit for review"}</button>`);
    if (ctx.canReview(a)) out.push(`<button class="btn sm" data-act="dp-request-changes">Request changes</button><button class="btn sm t" data-act="dp-approve">Approve</button>`);
    if (!primaryOnly && a.status === "Approved" && ctx.role().review) out.push('<button class="btn sm" data-act="dp-reopen">Reopen</button>');
    return out.join("");
  }

  function workspace(a) {
    const ro = !ctx.canFill(a);
    const step = stepOf(a);
    const reason = a.status === "Under review" ? "This assessment is with the reviewer, so answers are locked."
      : a.status === "Approved" ? `Approved ${formatDate(a.completedAt)}. Reopen it to make changes.`
        : !ctx.canEdit() ? "" : ro ? `Only ${a.who} or the DPO can answer this assessment.` : "";
    const filtering = typeof step === "number" && filterActive(ui.qf);
    const body = step === STEP_RISKS ? risksStep(a, ro) : step === STEP_SUMMARY ? summaryStep(a) : filtering ? filteredStep(a, ro) : sectionStep(a, step, ro);
    const acts = ctx.ropaActivities().filter(x => (a.activityIds || []).includes(x.id));
    return `
      <div class="dp-detail-head">
        <button class="btn sm" data-act="dp-back">← Assessments</button>
        <div class="dp-detail-title">
          <h2>${safe(a.name)}</h2>
          <div class="dp-detail-sub">${statusPill(a.status)}<span class="dp-mono">${safe(a.id)}</span>
            <span>${safe(a.tplTitle)} · v${a.tplVersion}</span>
            ${acts.slice(0, 3).map(x => `<button class="dp-link" data-go="ropa" title="Open the Data Map">↗ ${safe(x.name)} (${safe(x.id)})</button>`).join("")}${acts.length > 3 ? `<span>+${acts.length - 3} more</span>` : ""}
            ${!acts.length && a.activityId ? `<button class="dp-link" data-go="ropa" title="Open the Data Map">↗ ${safe(a.activityName)} (${safe(a.activityId)})</button>` : ""}</div>
        </div>
        <div class="dp-head-actions">
          <button class="btn sm" data-act="dp-print">Print</button>
          ${ctx.role().send ? `<button class="btn sm d" data-act="dp-delete">Delete</button>` : ""}
          ${actionButtons(a)}
        </div>
      </div>
      ${a.status === "Changes requested" && a.reviewNote ? `<div class="dp-banner is-risk" role="status"><b>Changes requested:</b> ${safe(a.reviewNote)}</div>` : ""}
      ${reason ? `<div class="dp-banner" role="status">${safe(reason)}</div>` : ""}
      <dl class="card dp-facts">
        <div><dt>Type</dt><dd>${safe(a.assessmentType)}<small>${safe(a.orgRole)}${a.sdf ? " · SDF" : ""}</small></dd></div>
        <div><dt>Assignee</dt><dd>${safe(a.who)}<small>${safe(ctx.teamOf(a.who))}${(a.assessors || []).length ? ` · with ${safe(a.assessors.join(", "))}` : ""}</small></dd></div>
        <div><dt>Reviewer</dt><dd>${safe(a.reviewer)}</dd></div>
        <div><dt>Due</dt><dd>${safe(formatDate(a.due))} ${dueBadge(a)}</dd></div>
        <div><dt>Progress</dt><dd class="dp-pbw" data-live-progress2>${pct(progress(a))}</dd></div>
        <div><dt>RAG</dt><dd data-live-rag>${ragPill(ctx.overallRag(a))}</dd></div>
        ${(a.frameworksInScope || []).length ? `<div><dt>Frameworks</dt><dd><span class="dp-fw-tags">${(a.frameworksInScope || []).map(f => `<span class="dp-fw">${safe(FRAMEWORK_SHORT[f] || f)}</span>`).join("")}</span></dd></div>` : ""}
      </dl>
      ${a.desc ? `<p class="dp-desc">${safe(a.desc)}</p>` : ""}
      <div class="dp-ws">${stepsNav(a)}<div class="dp-ws-main">${typeof step === "number" ? filterBar(a) : ""}${body}</div></div>`;
  }

  function render() {
    const a = ui.selected && ctx.state.assessments.find(x => x.id === ui.selected);
    return a ? workspace(a) : list();
  }

  return { render, filtered, stepsNav, pct };
}

export { isAnswered };
