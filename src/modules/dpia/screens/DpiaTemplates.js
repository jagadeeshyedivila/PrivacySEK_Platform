// Templates: the library, the builder (which edits a draft copy) and an interactive preview.
import { QUESTION_TYPES, OPTION_TYPES, questionCount, templateProblems, numbered } from "../dpiaModel.js";
import { questionHtml } from "./DpiaAssessments.js";

export function createTemplatesRenderer(ctx) {
  const { ui, safe, formatDate, dis, REGULATIONS } = ctx;
  const statusPill = s => ctx.runtime.pill(s === "Published" ? "ok" : "n", s);
  const isDirty = () => Boolean(ui.tplDraft && JSON.stringify(ui.tplDraft) !== ui.tplSaved);
  const inUse = id => ctx.state.assessments.filter(a => a.tpl === id && ctx.OPEN_STATUSES.includes(a.status)).length;
  const build = () => ctx.role().build;

  /* ---------------- library ---------------- */
  function list() {
    const all = ctx.state.templates;
    const q = ui.tSearch.trim().toLowerCase();
    const rows = all.filter(t => (!q || [t.title, t.desc, t.regulation].some(v => String(v).toLowerCase().includes(q))) && (ui.tStatus === "all" || t.status === ui.tStatus));
    const n = s => all.filter(t => s === "all" || t.status === s).length;
    return `
      <div class="dp-screen-head">
        <div><h2>Templates</h2><p>Questionnaires assessments are built from. Assessments keep the version they were sent with, so editing a template never changes work in progress.</p></div>
        <div class="dp-head-actions"><button class="btn sm t" data-act="dp-t-new" ${dis(build())}>+ New template</button></div>
      </div>
      <div class="dp-toolbar is-bare">
        <label class="dp-search"><span aria-hidden="true">⌕</span>
          <input id="dp-t-search" type="search" placeholder="Search templates" value="${safe(ui.tSearch)}" data-input-act="dp-t-search" aria-label="Search templates"></label>
        <div class="dp-seg" role="group" aria-label="Filter by status">
          ${[["all", "All"], ["Published", "Published"], ["Draft", "Draft"]].map(([v, l]) => `<button class="${ui.tStatus === v ? "active" : ""}" data-act="dp-t-status" data-arg="${v}" aria-pressed="${ui.tStatus === v}">${l} <b>${n(v)}</b></button>`).join("")}
        </div>
      </div>
      ${rows.length ? `<div class="dp-tpl-grid">${rows.map(t => `
        <article class="card dp-tpl">
          <div class="dp-tpl-top">${statusPill(t.status)}<span class="dp-reg">${safe(t.regulation)}</span></div>
          <h3>${safe(t.title)}</h3>
          <p>${safe(t.desc)}</p>
          <dl class="dp-tpl-facts">
            <div><dt>Sections</dt><dd>${t.sections.length}</dd></div>
            <div><dt>Questions</dt><dd>${questionCount(t)}</dd></div>
            <div><dt>Version</dt><dd>v${t.version}</dd></div>
            <div><dt>In use</dt><dd>${inUse(t.id)}</dd></div>
          </dl>
          <small class="dp-muted">Updated ${safe(formatDate(t.updated))} by ${safe(t.updatedBy)}</small>
          <div class="dp-tpl-actions">
            <button class="btn sm" data-act="dp-t-preview" data-arg="${safe(t.id)}">Preview</button>
            <button class="btn sm" data-act="dp-t-edit" data-arg="${safe(t.id)}" ${dis(build())}>Edit</button>
            <button class="btn sm" data-act="dp-t-duplicate" data-arg="${safe(t.id)}" ${dis(build())}>Duplicate</button>
            ${t.status === "Published" ? `<button class="btn sm t" data-act="dp-new-assessment" data-arg="${safe(t.id)}" ${dis(ctx.role().send)}>Use</button>` : ""}
            <span class="dp-sp"></span>
            <button class="dp-icon-btn" data-act="dp-t-delete" data-arg="${safe(t.id)}" ${dis(build())} aria-label="Delete ${safe(t.title)}" title="Delete template">🗑</button>
          </div>
        </article>`).join("")}</div>` : `
        <div class="card dp-empty-card"><h3>No templates match</h3><button class="btn sm" data-act="dp-t-clear">Clear filters</button></div>`}`;
  }

  /* ---------------- builder ---------------- */
  function head(t) {
    const dirty = isDirty();
    const saved = ctx.state.templates.find(x => x.id === t.id);
    const ro = !build() || ui.tplReadOnly;
    return `
      <div class="dp-detail-head" data-live-thead>
        <button class="btn sm" data-act="dp-t-back">← Templates</button>
        <div class="dp-detail-title">
          <h2>${safe(t.title || "Untitled template")}</h2>
          <div class="dp-detail-sub">${statusPill(saved ? saved.status : "Draft")}<span>v${t.version}</span>
            <span>${t.sections.length} sections · ${questionCount(t)} questions</span>
            ${dirty ? '<span class="dp-dirty" role="status"><i aria-hidden="true"></i>Unsaved changes</span>' : ""}</div>
        </div>
        <div class="dp-head-actions">
          <div class="dp-seg" role="group" aria-label="Mode">
            <button class="${ui.tplMode === "edit" ? "active" : ""}" data-act="dp-t-mode" data-arg="edit" ${ro ? "disabled" : ""}>Build</button>
            <button class="${ui.tplMode === "preview" ? "active" : ""}" data-act="dp-t-mode" data-arg="preview">Preview</button>
          </div>
          ${ro ? "" : `
            <button class="btn sm" data-act="dp-t-save" ${dirty ? "" : 'disabled title="No unsaved changes"'}>${saved && saved.status === "Published" ? "Save as draft" : "Save draft"}</button>
            <button class="btn sm t" data-act="dp-t-publish">Publish v${t.lastPublished ? t.version + 1 : t.version}</button>`}
        </div>
      </div>`;
  }

  function questionRow(t, si, qi, q) {
    const id = `dp-b-${si}-${qi}`;
    const n = t.sections[si].qs.length;
    return `
      <li class="dp-bq">
        <div class="dp-bq-top">
          <span class="dp-qn">${si + 1}.${qi + 1}</span>
          <input id="${id}" class="dp-bq-text" value="${safe(q.t)}" placeholder="Question text" data-input-act="dp-t-q" data-si="${si}" data-qi="${qi}" data-key="t" aria-label="Question ${si + 1}.${qi + 1} text" autocomplete="off">
          <select data-act="dp-t-qtype" data-si="${si}" data-qi="${qi}" aria-label="Answer type">${QUESTION_TYPES.map(x => `<option ${q.type === x ? "selected" : ""}>${x}</option>`).join("")}</select>
        </div>
        <div class="dp-bq-opts">
          <input class="dp-bq-help" value="${safe(q.help || "")}" placeholder="Helper text (optional)" data-input-act="dp-t-q" data-si="${si}" data-qi="${qi}" data-key="help" aria-label="Helper text" autocomplete="off">
          <label class="dp-check"><input type="checkbox" data-change-act="dp-t-qflag" data-si="${si}" data-qi="${qi}" data-key="req" ${q.req ? "checked" : ""}> Required</label>
          ${q.type === "Yes/No" ? `<label class="dp-check" title="A Yes answer suggests a risk to record"><input type="checkbox" data-change-act="dp-t-qflag" data-si="${si}" data-qi="${qi}" data-key="flag" ${q.flag ? "checked" : ""}> Yes flags a risk</label>` : ""}
        </div>
        ${OPTION_TYPES.includes(q.type) ? `
          <div class="dp-bq-choices">
            ${(q.opts || []).map((o, oi) => `
              <div class="dp-opt"><span aria-hidden="true">${q.type === "Single choice" ? "○" : "☐"}</span>
                <input id="dp-b-${si}-${qi}-o${oi}" value="${safe(o)}" placeholder="Option ${oi + 1}" data-input-act="dp-t-opt" data-si="${si}" data-qi="${qi}" data-oi="${oi}" aria-label="Option ${oi + 1}" autocomplete="off">
                <button class="dp-icon-btn" data-act="dp-t-opt-del" data-arg="${si}|${qi}|${oi}" aria-label="Remove option ${oi + 1}" title="Remove option">✕</button></div>`).join("")}
            <button class="btn sm" data-act="dp-t-opt-add" data-arg="${si}|${qi}">+ Add option</button>
          </div>` : ""}
        <div class="dp-bq-a">
          <button class="dp-icon-btn" data-act="dp-t-qmove" data-arg="${si}|${qi}|-1" ${qi === 0 ? "disabled" : ""} aria-label="Move question up" title="Move up">↑</button>
          <button class="dp-icon-btn" data-act="dp-t-qmove" data-arg="${si}|${qi}|1" ${qi === n - 1 ? "disabled" : ""} aria-label="Move question down" title="Move down">↓</button>
          <button class="dp-icon-btn" data-act="dp-t-qdup" data-arg="${si}|${qi}" aria-label="Duplicate question" title="Duplicate">⧉</button>
          <button class="dp-icon-btn is-danger" data-act="dp-t-qdel" data-arg="${si}|${qi}" aria-label="Delete question" title="Delete">🗑</button>
        </div>
      </li>`;
  }

  function sectionCard(t, s, si) {
    const open = ui.openSec === si;
    const n = t.sections.length;
    return `
      <section class="card dp-bsec ${open ? "open" : ""}">
        <div class="dp-bsec-h">
          <span class="dp-num">${si + 1}</span>
          <input id="dp-bs-${si}" value="${safe(s.name)}" placeholder="Section name" data-input-act="dp-t-sec" data-si="${si}" data-key="name" aria-label="Section ${si + 1} name" autocomplete="off">
          <span class="dp-muted">${s.qs.length} question${s.qs.length === 1 ? "" : "s"}</span>
          <button class="dp-icon-btn" data-act="dp-t-smove" data-arg="${si}|-1" ${si === 0 ? "disabled" : ""} aria-label="Move section up" title="Move up">↑</button>
          <button class="dp-icon-btn" data-act="dp-t-smove" data-arg="${si}|1" ${si === n - 1 ? "disabled" : ""} aria-label="Move section down" title="Move down">↓</button>
          <button class="dp-icon-btn is-danger" data-act="dp-t-sdel" data-arg="${si}" aria-label="Delete section" title="Delete section">🗑</button>
          <button class="dp-icon-btn" data-act="dp-t-open" data-arg="${si}" aria-expanded="${open}" aria-label="${open ? "Collapse" : "Expand"} section" title="${open ? "Collapse" : "Expand"}">${open ? "−" : "+"}</button>
        </div>
        ${open ? `
          <div class="dp-bsec-b">
            <input class="dp-bsec-desc" value="${safe(s.desc || "")}" placeholder="Section description (optional)" data-input-act="dp-t-sec" data-si="${si}" data-key="desc" aria-label="Section description" autocomplete="off">
            <ol class="dp-bqs">${s.qs.map((q, qi) => questionRow(t, si, qi, q)).join("") || '<li class="dp-empty">No questions yet.</li>'}</ol>
            <button class="btn sm" data-act="dp-t-qadd" data-arg="${si}">+ Add question</button>
          </div>` : ""}
      </section>`;
  }

  function builder(t) {
    const problems = templateProblems(t, ctx.state.templates);
    return `
      <div class="card dp-bset">
        <div class="dp-form-2">
          <div class="dp-field"><label for="dp-t-title">Template title *</label>
            <input id="dp-t-title" value="${safe(t.title)}" maxlength="90" placeholder="For example, DPIA for new vendors" data-input-act="dp-t-set" data-key="title" autocomplete="off"></div>
          <div class="dp-field"><label for="dp-t-reg">Regulation</label>
            <select id="dp-t-reg" data-act="dp-t-select" data-key="regulation">${REGULATIONS.map(r => `<option ${t.regulation === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
          <div class="dp-field dp-span-2"><label for="dp-t-desc">Description *</label>
            <textarea id="dp-t-desc" rows="2" placeholder="When should this template be used?" data-input-act="dp-t-set" data-key="desc">${safe(t.desc)}</textarea></div>
        </div>
        <p class="dp-hint" data-live-problems>${problems.length ? `${problems.length} thing${problems.length > 1 ? "s" : ""} to fix before publishing.` : "Ready to publish."}</p>
      </div>
      ${t.sections.map((s, si) => sectionCard(t, s, si)).join("")}
      <button class="btn dp-add-sec" data-act="dp-t-sadd">+ Add section</button>`;
  }

  function preview(t) {
    const si = Math.min(ui.previewStep || 0, Math.max(0, t.sections.length - 1));
    const s = t.sections[si];
    if (!s) return '<div class="card dp-empty-card"><h3>No sections yet</h3><p>Add a section in Build mode.</p></div>';
    return `
      <div class="dp-banner">This is how assessors see the template. Answers here are not saved.</div>
      <div class="dp-ws">
        <nav class="card dp-steps" aria-label="Sections"><div class="dp-steps-h"><b>Sections</b></div><ol>
          ${t.sections.map((x, i) => `<li><button class="${i === si ? "active" : ""}" data-act="dp-t-pstep" data-arg="${i}"><i>${i + 1}</i><span><b>${safe(x.name || "Untitled section")}</b><small>${x.qs.length} questions</small></span></button></li>`).join("")}
        </ol></nav>
        <div class="dp-ws-main"><section class="card dp-step-card">
          <div class="dp-step-h"><span class="dp-eyebrow">Section ${si + 1} of ${t.sections.length}</span><h3>${safe(s.name || "Untitled section")}</h3>${s.desc ? `<p>${safe(s.desc)}</p>` : ""}</div>
          <div class="dp-qs">${numbered(t.sections, si).map(([n, q]) => questionHtml(ctx, q, n, ui.previewAnswers[q.id], { mode: "preview" })).join("") || '<div class="dp-empty">No questions yet.</div>'}</div>
          <div class="dp-step-f">
            ${si > 0 ? `<button class="btn sm" data-act="dp-t-pstep" data-arg="${si - 1}">← Previous</button>` : "<span></span>"}<span></span>
            ${si < t.sections.length - 1 ? `<button class="btn sm t" data-act="dp-t-pstep" data-arg="${si + 1}">Next section →</button>` : "<span></span>"}
          </div>
        </section></div>
      </div>`;
  }

  function render() {
    const t = ui.tplDraft;
    if (!t) return list();
    return head(t) + (ui.tplMode === "preview" || !build() || ui.tplReadOnly ? preview(t) : builder(t));
  }

  return { render, head, isDirty };
}
