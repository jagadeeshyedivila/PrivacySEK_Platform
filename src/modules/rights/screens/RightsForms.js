// Web forms: the public rights request forms, their editor and live preview.
// The editor works on a draft (see forms/formState.js); nothing reaches the saved form until Save.
import {
  FORM_URL_BASE, OPTION_TYPES, SIZE_LIMITS, STANDARD_FIELDS, standardField, RTL_LANGUAGES, tr, fieldLabel, IDENTIFIER,
} from "../forms/formModel.js";
import { createFormState } from "../forms/formState.js";

const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const newCaptcha = () => Array.from({ length: 6 }, () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join("");

export function createFormsRenderer(ctx) {
  const { ui, safe, REQUEST_TYPES, SUBJECT_TYPES, LANGUAGES, SYSTEMS, FORM_TABS, formatDate, formatDateTime, dis } = ctx;
  const fs = createFormState(ctx);
  if (!ui.captcha) ui.captcha = newCaptcha();

  const pill = (tone, text) => ctx.runtime.pill(tone, text);
  const statusPill = s => pill(s === "Published" ? "ok" : "n", s);
  const plain = html => String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const requestCount = id => ctx.state.requests.filter(r => r.form === id).length;

  /* ---------------- list ---------------- */
  function list() {
    const all = fs.forms();
    const q = (ui.formSearch || "").trim().toLowerCase();
    const st = ui.formFilter || "all";
    const shown = all.filter(f =>
      (!q || [f.name, f.property, f.identifier].some(v => String(v).toLowerCase().includes(q))) &&
      (st === "all" || f.status === st));
    const count = s => all.filter(f => s === "all" || f.status === s).length;

    const card = f => {
      const changed = fs.hasUnpublishedChanges(f);
      const live = f.status === "Published";
      return `
        <article class="card rr-form-card">
          <div class="rr-form-swatch" style="background:${safe(f.headerColor)}" aria-hidden="true"></div>
          <div class="rr-form-card-b">
            <div class="rr-form-card-top">
              <div class="rr-form-card-title">
                <h3>${safe(f.name)}</h3>
                <p class="rr-muted">${safe(f.property)}</p>
              </div>
              <div class="rr-pills">${statusPill(f.status)}${changed ? pill("risk", "Unpublished changes") : ""}</div>
            </div>
            <div class="rr-form-link ${live ? "" : "is-off"}" title="${live ? "Public link" : "Publish the form to make this link work"}">
              <code>${safe(FORM_URL_BASE + f.identifier)}</code>
              ${live ? `<button class="rr-icon-btn is-plain" data-act="rr-copy" data-arg="${safe(FORM_URL_BASE + f.identifier)}" aria-label="Copy public link" title="Copy link">⧉</button>` : ""}
            </div>
            <dl class="rr-form-facts">
              <div><dt>Requests</dt><dd>${requestCount(f.id)}</dd></div>
              <div><dt>Languages</dt><dd title="${safe(f.languages.join(", "))}">${f.languages.length}</dd></div>
              <div><dt>Version</dt><dd>${f.history[0] ? `v${f.history[0].v}` : "—"}</dd></div>
              <div><dt>Updated</dt><dd>${safe(formatDate(f.updated))}</dd></div>
            </dl>
            <div class="rr-form-actions">
              <button class="btn sm t" data-act="rr-open-form" data-arg="${safe(f.id)}">Edit</button>
              <button class="btn sm" data-act="rr-form-preview" data-arg="${safe(f.id)}">Preview</button>
              <button class="btn sm" data-act="rr-duplicate-form" data-arg="${safe(f.id)}" ${dis()}>Duplicate</button>
              <button class="btn sm" data-act="rr-form-history" data-arg="${safe(f.id)}">History</button>
              <span class="rr-sp"></span>
              <button class="rr-icon-btn" data-act="rr-delete-form" data-arg="${safe(f.id)}" ${dis()} aria-label="Delete ${safe(f.name)}" title="Delete form">🗑</button>
            </div>
          </div>
        </article>
      `;
    };

    return `
      <div class="rr-screen-head">
        <div>
          <h2>Web forms</h2>
          <p>Public forms data principals use to raise requests. Edits stay in a draft until you save, and visitors see the last published version.</p>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm t" data-act="rr-new-form" ${dis()}>+ New form</button>
        </div>
      </div>
      <div class="rr-form-toolbar">
        <label class="rr-search">
          <span aria-hidden="true">⌕</span>
          <input id="rr-forms-search" type="search" placeholder="Search name, property or identifier" value="${safe(ui.formSearch || "")}" data-input-act="rr-forms-search" aria-label="Search web forms">
        </label>
        <div class="rr-seg" role="group" aria-label="Filter by status">
          ${[["all", "All"], ["Published", "Published"], ["Draft", "Draft"]].map(([v, l]) => `
            <button class="${st === v ? "active" : ""}" data-act="rr-forms-filter" data-arg="${v}" aria-pressed="${st === v}">${l} <b>${count(v)}</b></button>
          `).join("")}
        </div>
      </div>
      ${shown.length ? `<div class="rr-form-grid">${shown.map(card).join("")}</div>` : all.length ? `
        <div class="card rr-restricted"><h3>No forms match</h3><p>Try another search or status.</p>
          <button class="btn sm" data-act="rr-forms-clear">Clear filters</button></div>
      ` : `
        <div class="card rr-restricted"><h3>No forms yet</h3><p>Create a form to start accepting requests.</p>
          <button class="btn sm t" data-act="rr-new-form" ${dis()}>+ New form</button></div>
      `}
    `;
  }

  /* ---------------- preview ---------------- */
  function captchaImg() {
    const colors = ["#2b7a3d", "#3a3a9e", "#8a2be2", "#c0392b", "#1f6f8b", "#9b5f00"];
    return [...ui.captcha].map((c, i) =>
      `<span style="transform:rotate(${(i * 37 % 30) - 15}deg) translateY(${(i * 13 % 9) - 4}px);color:${colors[i % colors.length]}">${safe(c)}</span>`).join("");
  }

  function control(f, x, id, lang) {
    const name = id;
    const radios = (opts, type = "radio") => `<div class="rr-pv-opts">${opts.map(o => `
      <label><input type="${type}" name="${name}" value="${safe(o)}"> ${safe(o)}</label>`).join("") || "<small>No options</small>"}</div>`;
    if (x.key === "subject") return radios(f.subjectTypes);
    if (x.key === "type") return radios(f.requestTypes);
    const type = x.custom ? x.type : standardField(x.key).type;
    const opts = x.options || [];
    if (type === "Textarea") return `<textarea id="${id}" name="${name}" rows="3"></textarea>`;
    if (type === "Datepicker") return `<input id="${id}" name="${name}" type="date">`;
    if (type === "Select") return `<select id="${id}" name="${name}"><option value="">${safe(tr(lang, "select"))}</option>${opts.map(o => `<option>${safe(o)}</option>`).join("")}</select>`;
    if (type === "Radio") return radios(opts);
    if (type === "Checkbox") return radios(opts, "checkbox");
    const inputType = x.key === "email" ? "email" : x.key === "mobile" ? "tel" : "text";
    return `<input id="${id}" name="${name}" type="${inputType}" ${x.key === "mobile" ? 'placeholder="+91"' : ""}>`;
  }

  function fieldHtml(f, x, lang, prefix) {
    const id = `${prefix}-${x.key}`;
    const type = x.custom ? x.type : standardField(x.key).type;
    const group = x.key === "subject" || x.key === "type" || type === "Radio" || type === "Checkbox";
    const half = !x.custom && standardField(x.key).half;
    const label = `${safe(fieldLabel(x, lang))}${x.required ? '<b class="rr-pv-star" aria-hidden="true"> *</b>' : ""}`;
    const cls = `rr-pv-f ${half ? "is-half" : ""}`;
    const req = x.required ? 'data-required="true"' : "";
    return group
      ? `<fieldset class="${cls}" data-pv-key="${safe(x.key)}" ${req}><legend class="rr-pv-q">${label}</legend>${control(f, x, id, lang)}<small class="rr-pv-err" role="alert"></small></fieldset>`
      : `<div class="${cls}" data-pv-key="${safe(x.key)}" ${req}><label class="rr-pv-q" for="${id}">${label}</label>${control(f, x, id, lang)}<small class="rr-pv-err" role="alert"></small></div>`;
  }

  // full: the interactive preview in a modal. Otherwise a non-interactive copy beside the editor.
  function preview(f, { lang, full = false } = {}) {
    const L = f.languages.includes(lang) ? lang : f.languages[0];
    const prefix = full ? "pvf" : "pvi";
    return `
      <div class="rr-preview ${full ? "is-full" : ""}" ${full ? "" : "inert"} data-live-preview lang="${safe(L)}" dir="${RTL_LANGUAGES.includes(L) ? "rtl" : "ltr"}" aria-label="Form preview">
        ${full || f.favicon ? `<div class="rr-pv-tabbar" aria-hidden="true"><span>${f.favicon ? `<img src="${safe(f.favicon)}" alt="">` : "🌐"} ${safe(f.name || "Untitled form")}</span></div>` : ""}
        <div class="rr-pv-head" style="background:${safe(f.headerColor)};color:${safe(f.headerText)};font-size:${Number(f.headerSize)}px">
          ${f.logo ? `<img src="${safe(f.logo)}" alt="">` : ""}<span>${safe(f.name || "Untitled form")}</span>
        </div>
        <form class="rr-pv-body" novalidate data-form-id="${safe(f.id)}">
          <div class="rr-pv-welcome" style="color:${safe(f.welcomeColor)};font-size:${Number(f.welcomeSize)}px">${ctx.sanitizeRich(f.welcome)}</div>
          <p class="rr-pv-hint">${safe(tr(L, "required"))}</p>
          <div class="rr-pv-grid">${f.fields.map(x => fieldHtml(f, x, L, prefix)).join("")}</div>
          ${f.attachments ? `
            <div class="rr-pv-f" data-pv-key="attachment">
              <span class="rr-pv-q">${safe(tr(L, "upload"))}</span>
              <div class="rr-pv-file">
                <span class="rr-pv-fname">${safe(tr(L, "noFile"))}</span>
                <button type="button" data-act="rr-pv-browse">${safe(tr(L, "browse"))}</button>
                <input type="file" hidden data-change-act="rr-pv-file" accept=".pdf,.png,.jpg,.jpeg">
              </div>
            </div>` : ""}
          ${f.captcha ? `
            <div class="rr-pv-f" data-pv-key="captcha" data-required="true">
              <label class="rr-pv-q" for="${prefix}-captcha">${safe(tr(L, "captcha"))}<b class="rr-pv-star" aria-hidden="true"> *</b></label>
              <div class="rr-pv-cap">
                <div class="rr-pv-cap-img" aria-label="Captcha image">${captchaImg()}<i></i><i></i></div>
                <button type="button" class="rr-pv-cap-rf" data-act="rr-captcha" aria-label="New captcha" title="New captcha">⟳</button>
              </div>
              <input id="${prefix}-captcha" name="captcha" autocomplete="off" placeholder="${safe(tr(L, "capPh"))}">
              <small class="rr-pv-err" role="alert"></small>
            </div>` : ""}
          <button type="${full ? "submit" : "button"}" class="rr-pv-submit" ${full ? 'data-act="rr-pv-submit"' : ""} style="background:${safe(f.headerColor)};color:${safe(f.headerText)}">
            ${safe(tr(L, f.verifyOtp ? "submitOtp" : "submit"))}
          </button>
          <p class="rr-pv-formerr" role="alert"></p>
        </form>
        <div class="rr-pv-foot" style="background:${safe(f.footerColor)};color:${safe(f.footerTextColor)};font-size:${Number(f.footerSize)}px">${ctx.sanitizeRich(f.footer)}</div>
      </div>
    `;
  }

  /* ---------------- editor pieces ---------------- */
  function accordion(name, inner, count) {
    const open = ui.formSection === name;
    return `
      <div class="rr-acc ${open ? "open" : ""}">
        <button class="rr-acc-h" data-act="rr-form-section" data-arg="${name}" aria-expanded="${open}">
          <span>${name}${count != null ? ` <small>${count}</small>` : ""}</span><span aria-hidden="true">${open ? "−" : "+"}</span>
        </button>
        ${open ? `<div class="rr-acc-b">${inner}</div>` : ""}
      </div>
    `;
  }

  function checkboxes(f, key, options) {
    return options.map(o => `
      <label class="rr-check">
        <input type="checkbox" data-change-act="rr-fd-toggle" data-key="${key}" data-value="${safe(o)}" ${f[key].includes(o) ? "checked" : ""} ${dis()}>
        ${safe(o)}
      </label>
    `).join("");
  }

  function fieldBuilder() {
    const nf = ui.newField;
    const hasOpts = OPTION_TYPES.includes(nf.type);
    return `
      <div class="rr-builder">
        <div class="rr-builder-h"><b>New custom field</b></div>
        <div class="rr-field"><label for="rr-nf-type">Field type *</label>
          <select id="rr-nf-type" data-act="rr-nf-type">
            <option value="">Select a field type</option>
            ${ctx.FIELD_TYPES.map(t => `<option ${nf.type === t ? "selected" : ""}>${t}</option>`).join("")}
          </select></div>
        <div class="rr-field"><label for="rr-nf-label">Label *</label>
          <input id="rr-nf-label" value="${safe(nf.label)}" data-input-act="rr-nf-label" placeholder="For example, Loan account number" autocomplete="off"></div>
        ${hasOpts ? `
          <div class="rr-field"><label>Options *</label>
            <div class="rr-opt-list">
              ${nf.options.map((o, i) => `
                <div class="rr-opt">
                  <input id="rr-nf-opt-${i}" value="${safe(o)}" data-input-act="rr-nf-opt" data-i="${i}" placeholder="Option ${i + 1}" aria-label="Option ${i + 1}" autocomplete="off">
                  <button class="rr-icon-btn" data-act="rr-nf-opt-del" data-arg="${i}" ${nf.options.length < 2 ? "disabled" : ""} aria-label="Remove option ${i + 1}" title="Remove option">✕</button>
                </div>`).join("")}
            </div>
            <button class="btn sm" data-act="rr-nf-opt-add">+ Add option</button>
          </div>` : ""}
        <label class="rr-check"><input type="checkbox" id="rr-nf-required" data-change-act="rr-nf-required" ${nf.required ? "checked" : ""}> Required</label>
        <p class="rr-error" id="rr-nf-error" role="alert">${safe(nf.error || "")}</p>
        <div class="rr-row-end">
          <button class="btn sm" data-act="rr-field-cancel">Cancel</button>
          <button class="btn sm t" data-act="rr-field-save">Add field</button>
        </div>
      </div>
    `;
  }

  function fieldsSection(f) {
    if (ui.newField) return fieldBuilder();
    const removed = STANDARD_FIELDS.filter(s => !s.lock && !f.fields.some(x => x.key === s.key));
    const n = f.fields.length;
    return `
      <p class="rr-hint rr-hint-top">Drag ≡ or use the arrows to change the order.</p>
      <ul class="rr-field-list" aria-label="Form fields">
        ${f.fields.map((x, i) => {
          const s = !x.custom && standardField(x.key);
          const type = x.custom ? x.type : s.type;
          return `
            <li class="rr-frow" data-fi="${i}" ${ctx.canEdit() ? 'draggable="true"' : ""}>
              <span class="rr-drag" aria-hidden="true" title="Drag to reorder">≡</span>
              <span class="rr-frow-l">
                <b>${safe(x.label)}</b>
                <small>${safe(type)}${x.required ? " · required" : ""}${x.custom ? " · custom" : ""}</small>
              </span>
              <span class="rr-frow-a">
                <button class="rr-icon-btn" data-act="rr-field-move" data-arg="${i}|-1" ${i === 0 ? "disabled" : dis()} aria-label="Move ${safe(x.label)} up" title="Move up">↑</button>
                <button class="rr-icon-btn" data-act="rr-field-move" data-arg="${i}|1" ${i === n - 1 ? "disabled" : dis()} aria-label="Move ${safe(x.label)} down" title="Move down">↓</button>
                <button class="rr-icon-btn" data-act="rr-field-edit" data-arg="${i}" ${dis()} aria-label="Edit ${safe(x.label)}" title="Edit field">✎</button>
                ${s && s.lock ? '<span class="rr-icon-btn is-ghost" title="Standard field, cannot be removed" aria-hidden="true">🔒</span>'
                  : `<button class="rr-icon-btn is-danger" data-act="rr-field-delete" data-arg="${i}" ${dis()} aria-label="Remove ${safe(x.label)}" title="Remove field">🗑</button>`}
              </span>
            </li>`;
        }).join("")}
      </ul>
      <button class="btn sm" data-act="rr-field-add" ${dis()}>+ Add custom field</button>
      ${removed.length ? `
        <div class="rr-restore">
          <span class="rr-hint">Add a standard field back:</span>
          ${removed.map(s => `<button class="rr-chip" data-act="rr-field-restore" data-arg="${s.key}" ${dis()}>+ ${safe(s.label)}</button>`).join("")}
        </div>` : ""}
    `;
  }

  function stylingSection(f) {
    const upload = (key, label, hint) => `
      <div class="rr-upload">
        <div class="rr-upload-thumb ${key === "favicon" ? "is-icon" : ""}">${f[key] ? `<img src="${safe(f[key])}" alt="${label}">` : '<span aria-hidden="true">🖼</span>'}</div>
        <div class="rr-upload-b">
          <b>${label}</b>
          <small>${hint}</small>
          <span class="rr-upload-a">
            <button class="btn sm" data-act="rr-upload" data-arg="${key}" ${dis()}>${f[key] ? "Replace" : "Upload"}</button>
            ${f[key] ? `<button class="btn sm d" data-act="rr-upload-clear" data-arg="${key}" ${dis()}>Remove</button>` : ""}
          </span>
        </div>
      </div>`;
    const color = (key, label) => `
      <label for="rr-fs-${key}">${label}</label>
      <span class="rr-color">
        <input type="color" id="rr-fs-${key}" value="${safe(f[key])}" data-input-act="rr-fd-color" data-key="${key}" ${dis()} aria-label="${label}">
        <input class="rr-hex" id="rr-fs-${key}-hex" value="${safe(f[key])}" maxlength="7" spellcheck="false" data-input-act="rr-fd-hex" data-change-act="rr-fd-hex-commit" data-key="${key}" ${dis()} aria-label="${label} hex code">
      </span>`;
    const size = (key, label) => {
      const [min, max] = SIZE_LIMITS[key];
      return `
        <label for="rr-fs-${key}">${label}</label>
        <span class="rr-num"><input type="number" id="rr-fs-${key}" min="${min}" max="${max}" value="${Number(f[key])}" data-input-act="rr-fd-num" data-change-act="rr-fd-num-commit" data-key="${key}" ${dis()}><small>px</small></span>`;
    };
    return `
      ${upload("logo", "Header logo", "PNG or JPG, up to 1 MB. Resized to fit the header.")}
      ${upload("favicon", "Favicon", "PNG or JPG, up to 1 MB. Shown in the browser tab.")}
      <div class="rr-style-grid">
        <h4>Header</h4>${color("headerColor", "Background")}${color("headerText", "Text colour")}${size("headerSize", "Font size")}
        <h4>Welcome text</h4>${color("welcomeColor", "Text colour")}${size("welcomeSize", "Font size")}
        <h4>Footer</h4>${color("footerColor", "Background")}${color("footerTextColor", "Text colour")}${size("footerSize", "Font size")}
      </div>
    `;
  }

  function textSection(f) {
    const row = (key, label) => `
      <div class="rr-text-row">
        <span><b>${label}</b><small>${safe(plain(f[key]).slice(0, 90) || "Empty")}${plain(f[key]).length > 90 ? "…" : ""}</small></span>
        <button class="btn sm" data-act="rr-edit-form-text" data-arg="${key}" ${dis()}>Edit</button>
      </div>`;
    return row("welcome", "Welcome text") + row("footer", "Footer text") + row("thankYou", "Thank-you message");
  }

  // Parts of the editor that are refreshed in place while typing
  function editorHead(f) {
    const saved = fs.saved();
    const dirty = fs.isDirty();
    const changed = fs.hasUnpublishedChanges(saved);
    const canPublish = dirty || changed || saved.status !== "Published";
    return `
      <div class="rr-detail-head rr-fe-head" data-live-head>
        <button class="btn sm" data-act="rr-forms-back">← Web forms</button>
        <div class="rr-detail-title">
          <h2>${safe(f.name || "Untitled form")}</h2>
          <div class="rr-detail-sub">
            ${statusPill(saved.status)}
            ${changed ? pill("risk", "Unpublished changes") : ""}
            ${dirty ? '<span class="rr-dirty" role="status"><i aria-hidden="true"></i>Unsaved changes</span>' : `<span>Saved ${safe(formatDateTime(saved.updated))}</span>`}
          </div>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm" data-act="rr-form-preview">Preview</button>
          <button class="btn sm" data-act="rr-form-history" data-arg="${safe(f.id)}">History</button>
          ${dirty ? `<button class="btn sm" data-act="rr-discard-form" ${dis()}>Discard</button>` : ""}
          <button class="btn sm" data-act="rr-save-form" ${dirty ? dis() : "disabled"} title="${dirty ? "Save your changes as a draft" : "No unsaved changes"}">Save</button>
          <button class="btn sm t" data-act="rr-publish-form" ${canPublish ? dis() : 'disabled title="The live form already matches what is saved"'}>Publish</button>
        </div>
      </div>
    `;
  }

  function tabsNav(f, tab) {
    const problems = fs.problems(f);
    return `
      <div class="rr-steps-nav" role="tablist" data-live-tabs>
        ${FORM_TABS.map((t, i) => {
          const issues = problems.filter(p => p.tab === t).length;
          return `
            <button class="${t === tab ? "active" : ""}" data-act="rr-form-tab" data-arg="${t}" role="tab" aria-selected="${t === tab}">
              <i>${i + 1}</i>${t}${issues ? `<span class="rr-tab-issue" title="${issues} thing${issues > 1 ? "s" : ""} to fix before publishing">${issues}</span>` : ""}
            </button>`;
        }).join("")}
      </div>
    `;
  }

  function identifierMessage(f) {
    if (!IDENTIFIER.test(f.identifier || "")) return { ok: false, text: "Use 3–40 lowercase letters, numbers or hyphens. It cannot start or end with a hyphen." };
    if (fs.forms().some(x => x.id !== f.id && x.identifier === f.identifier)) return { ok: false, text: "Another form already uses this identifier." };
    return { ok: true, text: "Changing the identifier changes the public link once you publish." };
  }

  function basicTab(f) {
    const idm = identifierMessage(f);
    const nameErr = !f.name.trim() ? "Form name is required." : fs.forms().some(x => x.id !== f.id && x.name.trim().toLowerCase() === f.name.trim().toLowerCase()) ? "Another form already uses this name." : "";
    return `
      <div class="card rr-narrow card-b">
        <div class="rr-field"><label for="rr-form-name">Form name *</label>
          <input id="rr-form-name" value="${safe(f.name)}" maxlength="80" data-input-act="rr-fd-set" data-key="name" ${dis()} autocomplete="off">
          <p class="rr-error" id="rr-err-name" role="alert">${safe(nameErr)}</p></div>
        <div class="rr-field"><label for="rr-form-ident">Identifier</label>
          <div class="rr-ident"><span title="${safe(FORM_URL_BASE)}">${safe(FORM_URL_BASE)}</span>
            <input id="rr-form-ident" value="${safe(f.identifier)}" maxlength="40" spellcheck="false" data-input-act="rr-fd-set" data-key="identifier" ${dis()} autocomplete="off"></div>
          <small class="${idm.ok ? "rr-hint" : "rr-error"}" id="rr-err-ident" role="${idm.ok ? "note" : "alert"}">${safe(idm.text)}</small></div>
        <div class="rr-form-2">
          <div class="rr-field"><label>Organisation</label><input value="${safe(ctx.COMPANY)}" disabled></div>
          <div class="rr-field"><label>Property</label><input value="${safe(f.property)}" disabled></div>
        </div>
        <div class="rr-field"><span class="rr-label">Languages</span>
          <div class="rr-multi">
            ${f.languages.map((l, i) => `<span class="rr-tag">${i === 0 ? '<small title="Default language">Default</small>' : ""}${safe(l)}
              <button data-act="rr-lang-remove" data-arg="${safe(l)}" ${f.languages.length < 2 ? "disabled" : dis()} aria-label="Remove ${safe(l)}" title="${f.languages.length < 2 ? "Keep at least one language" : "Remove"}">✕</button></span>`).join("")}
            ${LANGUAGES.length > f.languages.length ? `
              <select data-act="rr-lang-add" aria-label="Add a language" ${dis()}>
                <option value="">+ Add language</option>
                ${LANGUAGES.filter(l => !f.languages.includes(l)).map(l => `<option>${safe(l)}</option>`).join("")}
              </select>` : ""}
          </div>
          <small class="rr-hint">Visitors can switch between these languages. The first one is the default.</small></div>
        <fieldset class="rr-fieldset"><legend>Request types on this form</legend>${checkboxes(f, "requestTypes", REQUEST_TYPES.map(t => t.id))}</fieldset>
        <fieldset class="rr-fieldset"><legend>Who can submit</legend>${checkboxes(f, "subjectTypes", SUBJECT_TYPES)}</fieldset>
      </div>
    `;
  }

  function formTab(f) {
    const lang = f.languages.includes(ui.previewLang) ? ui.previewLang : f.languages[0];
    return `
      <div class="rr-editor">
        <div class="rr-editor-side card">
          ${accordion("Form fields", fieldsSection(f), f.fields.length)}
          ${accordion("Styling", stylingSection(f))}
          ${accordion("Text", textSection(f))}
        </div>
        <div class="rr-editor-preview">
          <div class="rr-preview-bar">
            <label class="rr-inline-field">
              <span>Preview language</span>
              <select data-act="rr-preview-lang" aria-label="Preview language">${f.languages.map(l => `<option ${lang === l ? "selected" : ""}>${safe(l)}</option>`).join("")}</select>
            </label>
            <button class="btn sm" data-act="rr-form-preview">Open full preview</button>
          </div>
          ${preview(f, { lang })}
        </div>
      </div>
    `;
  }

  function settingsTab(f) {
    const [min, max] = SIZE_LIMITS.deadlineDays;
    return `
      <div class="card rr-narrow card-b">
        <div class="rr-field"><label for="rr-fs-deadlineDays">Response deadline (days)</label>
          <input id="rr-fs-deadlineDays" type="number" min="${min}" max="${max}" value="${Number(f.deadlineDays)}" data-input-act="rr-fd-num" data-change-act="rr-fd-num-commit" data-key="deadlineDays" ${dis()}>
          <small class="rr-hint">Between ${min} and ${max} days. Grievances always use the 90-day limit in Rule 14.</small></div>
        <div class="rr-field"><label for="rr-form-verification">Identity verification</label>
          <select id="rr-form-verification" data-act="rr-fd-select" data-key="verification" ${dis()}>
            ${["OTP to registered mobile", "Email link", "Video KYC", "Employee SSO"].map(v => `<option ${f.verification === v ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>
        <label class="rr-check"><input type="checkbox" data-change-act="rr-fd-flag" data-key="verifyOtp" ${f.verifyOtp ? "checked" : ""} ${dis()}> Verify identity before the request is accepted</label>
        <label class="rr-check"><input type="checkbox" data-change-act="rr-fd-flag" data-key="captcha" ${f.captcha ? "checked" : ""} ${dis()}> Show a captcha</label>
        <label class="rr-check"><input type="checkbox" data-change-act="rr-fd-flag" data-key="attachments" ${f.attachments ? "checked" : ""} ${dis()}> Let visitors attach a file</label>
      </div>
    `;
  }

  function systemsTab(f) {
    return `
      <div class="card rr-narrow card-b">
        <p class="rr-hint">Person Finder searches these systems for every request raised through this form.</p>
        ${SYSTEMS.map(s => `
          <label class="rr-check rr-check-2">
            <input type="checkbox" data-change-act="rr-fd-toggle" data-key="systems" data-value="${safe(s.name)}" ${f.systems.includes(s.name) ? "checked" : ""} ${dis()}>
            <span><b>${safe(s.name)}</b><small>${safe(s.fields)}</small></span>
          </label>
        `).join("")}
      </div>
    `;
  }

  function integrateTab(f) {
    const saved = fs.saved();
    const live = saved.status === "Published" && saved.published;
    const link = FORM_URL_BASE + (live ? saved.published.identifier : f.identifier);
    const embed = `<iframe src="${link}" title="${(live ? saved.published.name : f.name).replace(/"/g, "&quot;")}" width="100%" height="720" style="border:0"></iframe>`;
    return `
      <div class="card rr-narrow card-b">
        ${!live ? '<div class="rr-banner is-warn">This form is not published yet. Publish it before you share the link.</div>'
          : f.identifier !== saved.published.identifier ? '<div class="rr-banner is-warn">You changed the identifier. The link below changes after you publish.</div>' : ""}
        <div class="rr-field"><label>Public link</label>
          <div class="rr-copy-row"><code>${safe(link)}</code><button class="btn sm" data-act="rr-copy" data-arg="${safe(link)}">Copy link</button></div></div>
        <div class="rr-field"><label>Embed code</label>
          <div class="rr-copy-row"><code>${safe(embed)}</code><button class="btn sm" data-act="rr-copy" data-arg="${safe(embed)}">Copy code</button></div></div>
        <button class="btn sm" data-act="rr-form-preview">Try the form</button>
      </div>
    `;
  }

  function editor(f) {
    const tab = FORM_TABS.includes(ui.formTab) ? ui.formTab : "Basic";
    const body = { Basic: basicTab, Form: formTab, Settings: settingsTab, Systems: systemsTab, Integrate: integrateTab }[tab](f);
    return `${editorHead(f)}${tabsNav(f, tab)}${body}`;
  }

  function render() {
    const f = fs.draft();
    return f ? editor(f) : list();
  }

  return { render, preview, editorHead, tabsNav, identifierMessage, captchaImg };
}
