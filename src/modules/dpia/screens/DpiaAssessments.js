// Assessments: the list, and the workspace where an assessment is answered, its risks are
// recorded, and it is submitted and reviewed.
import {
  progress, sectionProgress, missingRequired, suggestedRisks, numbered, inherentLevel, residualLevel,
  LIKELIHOOD, IMPACT, LEVEL_ORDER, riskLevel,
} from "../dpiaModel.js";

// One question and its answer control. mode "answer" saves to the assessment, "preview" to a
// throwaway copy used by the template preview.
export function questionHtml(ctx, q, num, value, { ro = false, mode = "answer" } = {}) {
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
  } else if (q.type === "Yes/No") {
    control = `<div class="dp-yn" role="radiogroup" aria-labelledby="${id}-l">${["Yes", "No"].map(o => `
      <label class="${value === o ? "on" : ""}"><input type="radio" name="${id}" value="${o}" ${value === o ? "checked" : ""} data-change-act="dp-answer-radio" ${attrs}> ${o}</label>`).join("")}</div>`;
  } else {
    const v = Array.isArray(value) ? value : [];
    control = `<div class="dp-multi">${(q.opts || []).filter(Boolean).map(o => `
      <label class="dp-check"><input type="checkbox" value="${safe(o)}" ${v.includes(o) ? "checked" : ""} data-change-act="dp-answer-multi" ${attrs}> ${safe(o)}</label>`).join("")}</div>`;
  }
  const flagged = q.flag && value === "Yes";
  return `
    <div class="dp-q ${flagged ? "is-flagged" : ""}" data-qwrap="${safe(q.id)}">
      <div class="dp-q-h">
        <span class="dp-qn">${safe(num)}</span>
        <label class="dp-q-t" id="${id}-l" ${["Yes/No", "Multiple choice"].includes(q.type) ? "" : `for="${id}"`}>${safe(q.t)}${q.req ? '<b class="dp-req" title="Required"> *</b>' : ""}</label>
      </div>
      ${q.help ? `<p class="dp-q-help">${safe(q.help)}</p>` : ""}
      ${control}
      ${q.flag ? `<p class="dp-q-flag">${flagged ? "⚑ This answer suggests a risk. Record it in Risks &amp; mitigations." : "A Yes here suggests a risk to record."}</p>` : ""}
    </div>`;
}

export function createAssessmentsRenderer(ctx) {
  const { ui, safe, formatDate, formatDateTime, statusPill, levelPill, dueBadge, dis, STATUSES } = ctx;
  const pct = n => `<div class="dp-pb"><span style="width:${n}%"></span></div><span class="dp-pb-n">${n}%</span>`;

  /* ---------------- list ---------------- */
  function filtered() {
    const q = ui.aSearch.trim().toLowerCase();
    return ctx.state.assessments.filter(a =>
      (!q || [a.id, a.name, a.tplTitle, a.who, a.activityName].some(v => String(v || "").toLowerCase().includes(q))) &&
      (!ui.aStatus || (ui.aStatus === "Overdue" ? ctx.isOverdue(a) : a.status === ui.aStatus)) &&
      (!ui.aMine || a.who === ctx.currentUser.name || a.reviewer === ctx.currentUser.name));
  }

  function list() {
    const all = ctx.state.assessments;
    const rows = filtered();
    const count = s => s === "Overdue" ? all.filter(ctx.isOverdue).length : s ? all.filter(a => a.status === s).length : all.length;
    const chip = (v, l) => `<button class="dp-chip ${ui.aStatus === v ? "active" : ""}" data-act="dp-a-status" data-arg="${v}" aria-pressed="${ui.aStatus === v}">${l} <b>${count(v)}</b></button>`;
    return `
      <div class="dp-screen-head">
        <div><h2>Assessments</h2><p>Each assessment follows a template version, records risks and mitigations, and is approved by the DPO.</p></div>
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
          <thead><tr><th>Assessment</th><th>Template</th><th>Assignee</th><th>Progress</th><th>Status</th><th>Due</th><th>Risk</th></tr></thead>
          <tbody>
            ${rows.map(a => `
              <tr class="click" data-act="dp-open" data-arg="${safe(a.id)}">
                <td><div class="dp-cell-2"><button class="dp-link" data-act="dp-open" data-arg="${safe(a.id)}">${safe(a.name)}</button>
                  <small><span class="dp-mono">${safe(a.id)}</span>${a.activityName ? ` · ${safe(a.activityName)}` : ""}</small></div></td>
                <td><div class="dp-cell-2"><span>${safe(a.tplTitle)}</span><small>v${a.tplVersion}</small></div></td>
                <td>${safe(a.who)}</td>
                <td><div class="dp-pbw">${pct(progress(a))}</div></td>
                <td>${statusPill(a.status)}</td>
                <td>${dueBadge(a)}</td>
                <td>${levelPill(ctx.overallRisk(a))}</td>
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
                <span><b>${safe(s.name)}</b><small>${p.done}/${p.total} answered${p.missing ? ` · ${p.missing} required left` : ""}</small></span>
              </button></li>`;
          }).join("")}
          <li class="dp-steps-sep"><button class="${cur === STEP_RISKS ? "active" : ""}" data-act="dp-step" data-arg="${STEP_RISKS}">
            <i class="is-risk">!</i><span><b>Risks &amp; mitigations</b><small>${risks} recorded${sugg ? ` · ${sugg} suggested` : ""}</small></span></button></li>
          <li><button class="${cur === STEP_SUMMARY ? "active" : ""}" data-act="dp-step" data-arg="${STEP_SUMMARY}">
            <i>≡</i><span><b>Summary &amp; sign-off</b><small>${safe(a.status)}</small></span></button></li>
        </ol>
      </nav>`;
  }

  function sectionStep(a, i, ro) {
    const s = a.sections[i];
    const last = i === a.sections.length - 1;
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h"><span class="dp-eyebrow">Section ${i + 1} of ${a.sections.length}</span><h3>${safe(s.name)}</h3>${s.desc ? `<p>${safe(s.desc)}</p>` : ""}</div>
        <div class="dp-qs">${numbered(a.sections, i).map(([n, q]) => questionHtml(ctx, q, n, (a.answers || {})[q.id], { ro })).join("")}</div>
        <div class="dp-step-f">
          ${i > 0 ? `<button class="btn sm" data-act="dp-step" data-arg="${i - 1}">← Previous</button>` : "<span></span>"}
          <span class="dp-muted">${ro ? "Read-only" : "Answers save automatically"}</span>
          <button class="btn sm t" data-act="dp-step" data-arg="${last ? STEP_RISKS : i + 1}">${last ? "Next: Risks →" : "Next section →"}</button>
        </div>
      </section>`;
  }

  function matrix(risks, key) {
    const cell = (l, i) => risks.filter(r => (key === "res" ? (r.rl || r.l) : r.l) === l && (key === "res" ? (r.ri || r.i) : r.i) === i).length;
    return `
      <div class="dp-matrix" role="table" aria-label="${key === "res" ? "Residual" : "Inherent"} risk matrix">
        <div class="dp-mx-y" aria-hidden="true">Likelihood</div>
        <div class="dp-mx-grid">
          ${[4, 3, 2, 1].map(l => `
            <div class="dp-mx-row" role="row"><span class="dp-mx-l" role="rowheader">${LIKELIHOOD[l - 1]}</span>
              ${[1, 2, 3, 4].map(i => { const n = cell(l, i); return `<span role="cell" class="dp-mx-c lv-${riskLevel(l, i).toLowerCase()} ${n ? "has" : ""}" title="${LIKELIHOOD[l - 1]} × ${IMPACT[i - 1]}: ${riskLevel(l, i)}">${n || ""}</span>`; }).join("")}
            </div>`).join("")}
          <div class="dp-mx-row dp-mx-x"><span></span>${IMPACT.map(x => `<span>${x}</span>`).join("")}</div>
        </div>
      </div>`;
  }

  function risksStep(a, ro) {
    const risks = a.risks || [];
    const sugg = suggestedRisks(a);
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h dp-step-h-row">
          <div><span class="dp-eyebrow">Risks &amp; mitigations</span><h3>Risks to data principals</h3>
            <p>Score each risk before and after its mitigation. The highest residual risk becomes the assessment's risk level.</p></div>
          <button class="btn sm t" data-act="dp-risk-add" ${ro ? "disabled" : ""}>+ Add risk</button>
        </div>
        ${sugg.length ? `
          <div class="dp-suggest">
            <b>Suggested from your answers</b>
            ${sugg.map(x => `
              <div class="dp-suggest-row"><span><span class="dp-qn">${x.num}</span> ${safe(x.q.t)} <em>Yes</em></span>
                <button class="btn sm" data-act="dp-risk-add" data-arg="${safe(x.q.id)}" ${ro ? "disabled" : ""}>Record a risk</button></div>`).join("")}
          </div>` : ""}
        ${risks.length ? `
          <div class="dp-risks">
            ${risks.map((r, k) => `
              <article class="dp-risk ${r.status === "Closed" ? "is-closed" : ""}">
                <div class="dp-risk-h">
                  <b>${safe(r.title)}</b>
                  <span class="dp-risk-lv"><small>Inherent</small>${levelPill(inherentLevel(r))}<span aria-hidden="true">→</span><small>Residual</small>${levelPill(residualLevel(r))}</span>
                </div>
                ${r.desc ? `<p>${safe(r.desc)}</p>` : ""}
                ${r.mitigation ? `<p class="dp-risk-m"><b>Mitigation:</b> ${safe(r.mitigation)}</p>` : '<p class="dp-risk-m is-none">No mitigation recorded yet.</p>'}
                <div class="dp-risk-f">
                  <span>${safe(r.owner || "No owner")} · ${safe(r.status)}</span>
                  <span class="dp-sp"></span>
                  <button class="btn sm" data-act="dp-risk-edit" data-arg="${k}" ${ro ? "disabled" : ""}>Edit</button>
                  <button class="dp-icon-btn" data-act="dp-risk-delete" data-arg="${k}" ${ro ? "disabled" : ""} aria-label="Delete risk ${safe(r.title)}" title="Delete risk">🗑</button>
                </div>
              </article>`).join("")}
          </div>
          <div class="dp-matrices">
            <div><h4>Inherent</h4>${matrix(risks.filter(r => r.status !== "Closed"), "inh")}</div>
            <div><h4>Residual</h4>${matrix(risks.filter(r => r.status !== "Closed"), "res")}</div>
          </div>` : `<div class="dp-empty">No risks recorded yet.${sugg.length ? " Start with the suggestions above." : ""}</div>`}
        <div class="dp-step-f">
          <button class="btn sm" data-act="dp-step" data-arg="${a.sections.length - 1}">← Previous</button><span></span>
          <button class="btn sm t" data-act="dp-step" data-arg="${STEP_SUMMARY}">Next: Summary →</button>
        </div>
      </section>`;
  }

  function summaryStep(a) {
    const miss = missingRequired(a);
    const risks = (a.risks || []).filter(r => r.status !== "Closed");
    const byLevel = LEVEL_ORDER.slice().reverse().map(l => [l, risks.filter(r => residualLevel(r) === l).length]).filter(x => x[1]);
    const sugg = suggestedRisks(a).length;
    return `
      <section class="card dp-step-card">
        <div class="dp-step-h"><span class="dp-eyebrow">Summary &amp; sign-off</span><h3>Ready to submit?</h3></div>
        <ul class="dp-checklist">
          <li class="${miss.length ? "is-bad" : "is-ok"}">${miss.length ? `${miss.length} required question${miss.length > 1 ? "s" : ""} unanswered` : "All required questions answered"}
            ${miss.length ? `<div class="dp-miss">${miss.slice(0, 8).map(m => `<button class="dp-chip" data-act="dp-jump" data-arg="${m.si}|${m.q.id}">${m.num}</button>`).join("")}${miss.length > 8 ? `<span class="dp-muted">+${miss.length - 8} more</span>` : ""}</div>` : ""}</li>
          <li class="${sugg ? "is-warn" : "is-ok"}">${sugg ? `${sugg} flagged answer${sugg > 1 ? "s have" : " has"} no risk recorded` : "Every flagged answer has a risk recorded"}</li>
          <li class="${risks.some(r => !r.mitigation) ? "is-warn" : "is-ok"}">${risks.length ? `${risks.length} open risk${risks.length > 1 ? "s" : ""}: ${byLevel.map(([l, n]) => `${n} ${l.toLowerCase()}`).join(", ")}` : "No open risks recorded"}${risks.some(r => !r.mitigation) ? " · some have no mitigation" : ""}</li>
        </ul>
        ${a.reviewNote ? `<div class="dp-banner ${a.status === "Changes requested" ? "is-risk" : ""}"><b>Reviewer note:</b> ${safe(a.reviewNote)}</div>` : ""}
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
    const body = step === STEP_RISKS ? risksStep(a, ro) : step === STEP_SUMMARY ? summaryStep(a) : sectionStep(a, step, ro);
    return `
      <div class="dp-detail-head">
        <button class="btn sm" data-act="dp-back">← Assessments</button>
        <div class="dp-detail-title">
          <h2>${safe(a.name)}</h2>
          <div class="dp-detail-sub">${statusPill(a.status)}<span class="dp-mono">${safe(a.id)}</span>
            <span>${safe(a.tplTitle)} · v${a.tplVersion}</span>
            ${a.activityId ? `<button class="dp-link" data-go="ropa" title="Open the Data Map">↗ ${safe(a.activityName)} (${safe(a.activityId)})</button>` : ""}</div>
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
        <div><dt>Assignee</dt><dd>${safe(a.who)}<small>${safe(ctx.teamOf(a.who))}</small></dd></div>
        <div><dt>Reviewer</dt><dd>${safe(a.reviewer)}</dd></div>
        <div><dt>Due</dt><dd>${safe(formatDate(a.due))} ${dueBadge(a)}</dd></div>
        <div><dt>Progress</dt><dd class="dp-pbw" data-live-progress2>${pct(progress(a))}</dd></div>
        <div><dt>Risk level</dt><dd>${levelPill(ctx.overallRisk(a))}</dd></div>
      </dl>
      ${a.desc ? `<p class="dp-desc">${safe(a.desc)}</p>` : ""}
      <div class="dp-ws">${stepsNav(a)}<div class="dp-ws-main">${body}</div></div>`;
  }

  function render() {
    const a = ui.selected && ctx.state.assessments.find(x => x.id === ui.selected);
    return a ? workspace(a) : list();
  }

  return { render, filtered, stepsNav, pct };
}
