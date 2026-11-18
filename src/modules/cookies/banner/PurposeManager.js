// Cookie purposes: the compact list in Banner Configuration → Purposes, the Manage Purposes
// table, and the add / edit form. Purposes are switched on and off (shown or hidden in the
// Preference Center), not deleted. Field meanings and options are in purposeModel.js.
import {
  CONSENT_MODELS, LEGAL_BASES,
  consentModelOf, labelOf,
} from "../purposeModel.js";

export function createPurposeManager(context) {
  const { state, ui, safe } = context;

  const cookieCount = id => (state.cookies || []).filter(c => c.category === id).length;
  const shown = p => Boolean(p.required) || p.showInPref !== false;

  const modelBadge = p => {
    const model = consentModelOf(p);
    const tone = model === "always_active" ? "ok" : model === "opt_in" ? "info" : "warn";
    return `<span class="cc-pm-badge ${tone}">${safe(labelOf(CONSENT_MODELS, model))}</span>`;
  };

  function statusSwitch(p) {
    const on = shown(p);
    const locked = Boolean(p.required);
    return `<div class="cc-pm-status">
      <button type="button" class="switch" role="switch" aria-checked="${on}"
        aria-label="${on ? "Hide" : "Show"} ${safe(p.name)} in the Preference Center"
        ${locked ? `disabled title="Always Active purposes are always shown. Edit the purpose and change its consent model to hide it."` : `data-act="cc-purpose-toggle" data-arg="${safe(p.id)}"`}></button>
      <span class="cc-pm-status-label ${on ? "on" : ""}">${locked ? "Always shown" : on ? "Shown" : "Hidden"}</span>
    </div>`;
  }

  function dateCell(iso) {
    if (!iso) return `<span class="dim">—</span>`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return `<span class="dim">—</span>`;
    return `<span class="cc-pm-date">${safe(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</span>
      <span class="cc-pm-time">${safe(d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}</span>`;
  }

  /* Compact list for the Purposes section of Banner Configuration */
  function renderSectionList() {
    const purposes = state.categories || [];
    const visible = purposes.filter(shown).length;
    return `<div class="cc-form-group">
      <div class="cc-form-group-title">
        <span>Cookie Purposes</span>
        <span style="display:flex;gap:6px;">
          <button class="btn sm" data-act="cc-purposes-manage">Manage Purposes</button>
          <button class="btn sm t" data-act="cc-category-new">+ Add Purpose</button>
        </span>
      </div>
      <p class="dim" style="font-size:12px;margin:0 0 10px;">
        ${visible} of ${purposes.length} purposes are shown in the Preference Center. Switch a purpose off to hide it; switch it on to show it again.
      </p>
      <div class="cc-pm-list">
        ${purposes.map(p => `<div class="cc-pm-list-row ${shown(p) ? "" : "is-hidden"}" data-purpose="${safe(p.id)}">
          <div class="cc-pm-list-main">
            <div class="cc-pm-list-name"><strong>${safe(p.name)}</strong> </div>
            <small>${safe(p.description || "")}</small>
          </div>
          <div class="cc-pm-list-actions">
            ${statusSwitch(p)}
            <button class="btn sm" data-act="cc-category-edit" data-arg="${safe(p.id)}">Edit</button>
          </div>
        </div>`).join("")}
      </div>
    </div>`;
  }

  /* Manage Purposes table (modal body) */
  function renderManageBody() {
    const q = (ui.ccPurposeSearch || "").trim().toLowerCase();
    const purposes = (state.categories || []).filter(p => !q || [p.name, p.id, p.description, labelOf(LEGAL_BASES, p.legalBasis), labelOf(CONSENT_MODELS, consentModelOf(p))]
      .some(v => String(v || "").toLowerCase().includes(q)));
    return `<div class="cc-pm-toolbar">
        <div class="cc-pm-search">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" id="cc-pm-search" placeholder="Search purposes…" value="${safe(ui.ccPurposeSearch || "")}"
            data-input-act="cc-purpose-search" aria-label="Search purposes" autocomplete="off">
        </div>
        <span class="cc-pm-count">${purposes.length} purpose${purposes.length === 1 ? "" : "s"}</span>
        <button class="btn sm p cc-pm-add" data-act="cc-category-new" data-arg="manage">+ Add Purpose</button>
      </div>
      <div class="cc-pm-wrap">
        <table class="cc-pm-table">
          <colgroup>
            <col style="width:31%"><col style="width:12%"><col style="width:14%"><col style="width:8%">
            <col style="width:13%"><col style="width:11%"><col style="width:11%">
          </colgroup>
          <thead><tr>
            <th scope="col">Purpose</th><th scope="col">Consent model</th><th scope="col">Legal basis</th>
            <th scope="col">Cookies</th><th scope="col">Status</th><th scope="col">Last updated</th>
            <th scope="col" class="cc-pm-right">Actions</th>
          </tr></thead>
          <tbody>
            ${purposes.length ? purposes.map(p => `<tr data-purpose="${safe(p.id)}">
              <td>
                <div class="cc-pm-name">${safe(p.name)}</div>
                <div class="cc-pm-desc" title="${safe(p.description || "")}">${safe(p.description || "")}</div>
                <div class="cc-pm-id">${safe(p.id)}</div>
              </td>
              <td>${modelBadge(p)}</td>
              <td>${safe(labelOf(LEGAL_BASES, p.legalBasis))}</td>
              <td>${cookieCount(p.id)}</td>
              <td>${statusSwitch(p)}</td>
              <td>${dateCell(p.updatedAt || p.createdAt)}</td>
              <td class="cc-pm-right"><button class="btn sm" data-act="cc-category-edit" data-arg="${safe(p.id)}" data-from="manage">Edit</button></td>
            </tr>`).join("") : `<tr><td colspan="7"><div class="cc-pm-empty">No purposes match your search.</div></td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  /* Add / edit form (modal body). `p` is null when adding. */
  function renderForm(p) {
    const purpose = p || { name: "", description: "", required: false, defaultState: false, showInPref: true, legalBasis: "consent", dataCollected: [], regions: [], googleSignals: [], iabPurposes: [], saleOrShare: false };
    const model = consentModelOf(purpose);
    // Every field stays editable; an Always Active purpose just cannot be hidden while it is one
    const alwaysActive = model === "always_active";
    return `<div class="cc-pm-form" data-was-required="${Boolean(p?.required)}">
      <div class="g g2">
        <div class="field">
          <label for="cc-pf-name">Purpose name *</label>
          <input id="cc-pf-name" type="text" maxlength="60" value="${safe(purpose.name)}" placeholder="e.g. Analytics">
        </div>
        <div class="field">
          <label for="cc-pf-id">Purpose ID</label>
          <input id="cc-pf-id" type="text" value="${safe(purpose.id || "")}" placeholder="Created from the name" ${p ? "disabled" : ""}>
        </div>
      </div>
      <div class="field">
        <label for="cc-pf-desc">Description shown to visitors *</label>
        <textarea id="cc-pf-desc" rows="3" placeholder="What these cookies do and why, in plain language">${safe(purpose.description || "")}</textarea>
      </div>
      <div class="g g2">
        <div class="field">
          <label for="cc-pf-model">Consent model</label>
          <select id="cc-pf-model" data-act="cc-pf-model-change">
            ${CONSENT_MODELS.map(m => `<option value="${m.id}" ${m.id === model ? "selected" : ""}>${safe(m.label)}</option>`).join("")}
          </select>
          <small class="dim" id="cc-pf-model-hint">${safe(CONSENT_MODELS.find(m => m.id === model).hint)}</small>
          <small class="cc-pm-warn" id="cc-pf-model-warn" hidden>Visitors will be able to switch these cookies off, and the site may not work properly without them. Move any cookies the site needs to an Always Active purpose.</small>
        </div>
        <div class="field">
          <label for="cc-pf-basis">Legal basis</label>
          <select id="cc-pf-basis">
            ${LEGAL_BASES.map(b => `<option value="${b.id}" ${b.id === purpose.legalBasis ? "selected" : ""}>${safe(b.label)}</option>`).join("")}
          </select>
          <small class="dim">Strictly necessary goes with Always Active. Under GDPR and the DPDP Act, other cookies need consent.</small>
        </div>
      </div>
      <div class="cc-pm-form-flags">
        <label class="cc-pm-check"><input type="checkbox" id="cc-pf-shown" ${shown(purpose) ? "checked" : ""} ${alwaysActive ? "disabled" : ""}>
          <span>Show in the Preference Center <span class="dim" id="cc-pf-shown-note" ${alwaysActive ? "" : "hidden"}>(always shown while Always Active)</span></span></label>
      </div>
    </div>`;
  }

  return { renderSectionList, renderManageBody, renderForm };
}
