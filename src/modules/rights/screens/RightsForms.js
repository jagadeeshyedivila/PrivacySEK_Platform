// Web forms: the public rights request forms, their editor and live preview.
export function createFormsRenderer(ctx) {
  const { ui, safe, REQUEST_TYPES, SUBJECT_TYPES, LANGUAGES, SYSTEMS, FORM_TABS, FORM_SECTIONS, FIELD_TYPES, formatDate, formatDateTime, dis } = ctx;

  const statusPill = s => ctx.runtime.pill(s === "Published" ? "ok" : "n", s);

  function list() {
    const forms = ctx.state.forms;
    const counts = id => ctx.state.requests.filter(r => r.form === id).length;
    return `
      <div class="rr-screen-head">
        <div>
          <h2>Web forms</h2>
          <p>Public forms data principals use to raise requests. Publish a form to make its latest version live.</p>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm t" data-act="rr-new-form" ${dis()}>+ New form</button>
        </div>
      </div>
      ${forms.length ? `
        <div class="rr-form-grid">
          ${forms.map(f => `
            <article class="card rr-form-card">
              <div class="rr-form-swatch" style="background:${safe(f.headerColor)}" aria-hidden="true"></div>
              <div class="rr-form-card-b">
                <div class="rr-form-card-top">
                  <h3>${safe(f.name)}</h3>
                  ${statusPill(f.status)}
                </div>
                <p class="rr-muted">${safe(f.property)}</p>
                <dl class="rr-form-facts">
                  <div><dt>Request types</dt><dd>${f.requestTypes.length}</dd></div>
                  <div><dt>Requests</dt><dd>${counts(f.id)}</dd></div>
                  <div><dt>Version</dt><dd>${f.history[0] ? `v${f.history[0].v}` : "—"}</dd></div>
                  <div><dt>Updated</dt><dd>${safe(formatDate(f.updated))}</dd></div>
                </dl>
                <div class="rr-form-actions">
                  <button class="btn sm t" data-act="rr-open-form" data-arg="${safe(f.id)}">Open</button>
                  <button class="btn sm" data-act="rr-form-history" data-arg="${safe(f.id)}">Publish history</button>
                  <button class="btn sm d" data-act="rr-delete-form" data-arg="${safe(f.id)}" ${dis()}>Delete</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="card rr-restricted"><h3>No forms yet</h3><p>Create a form to start accepting requests.</p></div>
      `}
    `;
  }

  function fieldControl(c) {
    const opts = c.options || [];
    if (c.type === "Textarea") return "<textarea rows=\"2\" disabled></textarea>";
    if (c.type === "Datepicker") return '<input type="date" disabled>';
    if (c.type === "Select") return `<select disabled>${opts.map(o => `<option>${safe(o)}</option>`).join("")}</select>`;
    if (c.type === "Radio" || c.type === "Checkbox") {
      return `<div class="rr-pv-opts">${opts.map(o => `<label><input type="${c.type === "Radio" ? "radio" : "checkbox"}" disabled> ${safe(o)}</label>`).join("") || "<small>No options</small>"}</div>`;
    }
    return "<input disabled>";
  }

  function preview(f) {
    return `
      <div class="rr-preview" aria-label="Form preview">
        <div class="rr-pv-head" style="background:${safe(f.headerColor)};color:${safe(f.headerText)};font-size:${Number(f.headerSize) || 22}px">${safe(f.name)}</div>
        <div class="rr-pv-body">
          <p class="rr-pv-welcome">${ctx.sanitizeRich(f.welcome)}</p>
          <div class="rr-pv-q">I am a</div>
          <div class="rr-pv-opts">${f.subjectTypes.map(s => `<label><input type="radio" name="pv-sub" disabled> ${safe(s)}</label>`).join("")}</div>
          <div class="rr-pv-q">What would you like to do?</div>
          <div class="rr-pv-opts">${f.requestTypes.map(s => `<label><input type="radio" name="pv-type" disabled> ${safe(s)}</label>`).join("")}</div>
          <div class="rr-pv-2">
            <div><div class="rr-pv-q">Full name *</div><input disabled></div>
            <div><div class="rr-pv-q">Registered mobile *</div><input disabled></div>
          </div>
          <div class="rr-pv-q">Email *</div><input disabled>
          <div class="rr-pv-q">Request details *</div><textarea rows="3" disabled></textarea>
          ${f.custom.map(c => `<div class="rr-pv-q">${safe(c.label)}${c.required ? " *" : ""}</div>${fieldControl(c)}`).join("")}
          ${f.captcha ? '<div class="rr-pv-q">Captcha</div><div class="rr-pv-captcha">Qv7DaR</div>' : ""}
          <button class="rr-pv-submit" style="background:${safe(f.headerColor)};color:${safe(f.headerText)}" disabled>${f.verifyOtp ? "Verify with OTP and submit" : "Submit request"}</button>
        </div>
        <div class="rr-pv-foot" style="background:${safe(f.footerColor)};font-size:${Number(f.footerSize) || 12}px">${ctx.sanitizeRich(f.footer)}</div>
      </div>
    `;
  }

  function checkboxes(f, key, options) {
    return options.map(o => `
      <label class="rr-check">
        <input type="checkbox" data-change-act="rr-form-toggle" data-key="${key}" data-value="${safe(o)}" ${f[key].includes(o) ? "checked" : ""} ${dis()}>
        ${safe(o)}
      </label>
    `).join("");
  }

  function accordion(name, inner) {
    const open = ui.formSection === name;
    return `
      <div class="rr-acc ${open ? "open" : ""}">
        <button class="rr-acc-h" data-act="rr-form-section" data-arg="${name}" aria-expanded="${open}">
          <span>${name}</span><span aria-hidden="true">${open ? "−" : "+"}</span>
        </button>
        ${open ? `<div class="rr-acc-b">${inner}</div>` : ""}
      </div>
    `;
  }

  function fieldsSection(f) {
    if (ui.addingField) {
      return `
        <div class="rr-field"><label for="rr-nf-type">Field type *</label>
          <select id="rr-nf-type"><option value="">Select a field type</option>${FIELD_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
        </div>
        <div class="rr-field"><label for="rr-nf-label">Label *</label><input id="rr-nf-label"></div>
        <div class="rr-field"><label for="rr-nf-options">Options</label><input id="rr-nf-options" placeholder="Comma separated, for Select, Radio and Checkbox"></div>
        <label class="rr-check"><input type="checkbox" id="rr-nf-required"> Required</label>
        <p class="rr-error" id="rr-nf-error" role="alert"></p>
        <div class="rr-row-end">
          <button class="btn sm" data-act="rr-field-cancel">Cancel</button>
          <button class="btn sm t" data-act="rr-field-save">Add field</button>
        </div>
      `;
    }
    return `
      <ul class="rr-field-list">
        ${f.custom.map((c, i) => `
          <li>
            <span>${safe(c.label)} <small>${safe(c.type)}${c.required ? " · required" : ""}</small></span>
            <button class="rr-icon-btn" data-act="rr-field-delete" data-arg="${i}" ${dis()} aria-label="Remove ${safe(c.label)}" title="Remove field">✕</button>
          </li>
        `).join("") || '<li class="rr-empty">No custom fields. Standard fields are always included.</li>'}
      </ul>
      <button class="btn sm" data-act="rr-field-add" ${dis()}>+ Add field</button>
    `;
  }

  function stylingSection(f) {
    const input = (key, label, type) => `
      <div class="rr-field rr-field-inline">
        <label for="rr-fs-${key}">${label}</label>
        <input id="rr-fs-${key}" type="${type}" value="${safe(f[key])}" data-input-act="rr-form-set" data-key="${key}" ${type === "number" ? 'min="10" max="40"' : ""} ${dis()}>
      </div>
    `;
    return input("headerColor", "Header colour", "color") + input("headerText", "Header text colour", "color") +
      input("headerSize", "Header font size", "number") + input("footerColor", "Footer colour", "color") + input("footerSize", "Footer font size", "number");
  }

  function textSection(f) {
    return `
      <div class="rr-text-row"><span>Welcome text</span><button class="btn sm" data-act="rr-edit-form-text" data-arg="welcome" ${dis()}>Edit</button></div>
      <div class="rr-text-row"><span>Footer text</span><button class="btn sm" data-act="rr-edit-form-text" data-arg="footer" ${dis()}>Edit</button></div>
    `;
  }

  function editor(f) {
    const tab = FORM_TABS.includes(ui.formTab) ? ui.formTab : "Basic";
    let body = "";
    if (tab === "Basic") {
      body = `
        <div class="card rr-narrow card-b">
          <div class="rr-field"><label for="rr-form-name">Form name *</label>
            <input id="rr-form-name" value="${safe(f.name)}" data-input-act="rr-form-set" data-key="name" ${dis()}></div>
          <div class="rr-field"><label>Property</label><input value="${safe(f.property)}" disabled></div>
          <fieldset class="rr-fieldset"><legend>Request types on this form</legend>${checkboxes(f, "requestTypes", REQUEST_TYPES.map(t => t.id))}</fieldset>
          <fieldset class="rr-fieldset"><legend>Who can submit</legend>${checkboxes(f, "subjectTypes", SUBJECT_TYPES)}</fieldset>
        </div>
      `;
    } else if (tab === "Form") {
      body = `
        <div class="rr-editor">
          <div class="rr-editor-side card">
            ${accordion("Form fields", fieldsSection(f))}
            ${accordion("Styling", stylingSection(f))}
            ${accordion("Text", textSection(f))}
          </div>
          <div class="rr-editor-preview">
            <label class="rr-inline-field">
              <span>Preview language</span>
              <select data-act="rr-form-language" ${dis()}>${LANGUAGES.map(l => `<option ${f.language === l ? "selected" : ""}>${l}</option>`).join("")}</select>
            </label>
            ${preview(f)}
          </div>
        </div>
      `;
    } else if (tab === "Settings") {
      body = `
        <div class="card rr-narrow card-b">
          <div class="rr-field"><label for="rr-form-deadline">Response deadline (days)</label>
            <input id="rr-form-deadline" type="number" min="1" max="90" value="${Number(f.deadlineDays) || 30}" data-input-act="rr-form-set" data-key="deadlineDays" ${dis()}>
            <small class="rr-hint">Grievances always use the 90-day limit in Rule 14.</small></div>
          <div class="rr-field"><label for="rr-form-verification">Identity verification</label>
            <select id="rr-form-verification" data-act="rr-form-verification" ${dis()}>
              ${["OTP to registered mobile", "Email link", "Video KYC", "Employee SSO"].map(v => `<option ${f.verification === v ? "selected" : ""}>${v}</option>`).join("")}
            </select></div>
          <label class="rr-check"><input type="checkbox" data-change-act="rr-form-flag" data-key="captcha" ${f.captcha ? "checked" : ""} ${dis()}> Show captcha</label>
          <label class="rr-check"><input type="checkbox" data-change-act="rr-form-flag" data-key="verifyOtp" ${f.verifyOtp ? "checked" : ""} ${dis()}> Verify identity before the request is accepted</label>
        </div>
      `;
    } else if (tab === "Systems") {
      body = `
        <div class="card rr-narrow card-b">
          <p class="rr-hint">Person Finder searches these systems for every request raised through this form.</p>
          ${SYSTEMS.map(s => `
            <label class="rr-check rr-check-2">
              <input type="checkbox" data-change-act="rr-form-toggle" data-key="systems" data-value="${safe(s.name)}" ${f.systems.includes(s.name) ? "checked" : ""} ${dis()}>
              <span><b>${safe(s.name)}</b><small>${safe(s.fields)}</small></span>
            </label>
          `).join("")}
        </div>
      `;
    } else {
      const link = `https://rights.aarohan.example/f/${f.id}`;
      const embed = `<iframe src="${link}" title="${f.name}" width="100%" height="720"></iframe>`;
      body = `
        <div class="card rr-narrow card-b">
          ${f.status !== "Published" ? '<div class="rr-banner is-warn">Publish this form before sharing the link. Visitors see the last published version.</div>' : ""}
          <div class="rr-field"><label>Public link</label>
            <div class="rr-copy-row"><code>${safe(link)}</code><button class="btn sm" data-act="rr-copy" data-arg="${safe(link)}">Copy link</button></div></div>
          <div class="rr-field"><label>Embed code</label>
            <div class="rr-copy-row"><code>${safe(embed)}</code><button class="btn sm" data-act="rr-copy" data-arg="${safe(embed)}">Copy code</button></div></div>
        </div>
      `;
    }

    return `
      <div class="rr-detail-head">
        <button class="btn sm" data-act="rr-forms-back">← Web forms</button>
        <div class="rr-detail-title">
          <h2>${safe(f.name)}</h2>
          <div class="rr-detail-sub">${statusPill(f.status)}<span>${safe(f.property)}</span><span>Updated ${safe(formatDateTime(f.updated))}</span></div>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm" data-act="rr-form-history" data-arg="${safe(f.id)}">Publish history</button>
          <button class="btn sm" data-act="rr-save-form" ${dis()}>Save draft</button>
          <button class="btn sm t" data-act="rr-publish-form" ${dis()}>Publish</button>
        </div>
      </div>
      <div class="rr-steps-nav" role="tablist">
        ${FORM_TABS.map((t, i) => `
          <button class="${t === tab ? "active" : ""}" data-act="rr-form-tab" data-arg="${t}" role="tab" aria-selected="${t === tab}">
            <i>${i + 1}</i>${t}
          </button>
        `).join("")}
      </div>
      ${body}
    `;
  }

  function render() {
    const f = ui.selectedFormId && ctx.state.forms.find(x => x.id === ui.selectedFormId);
    return f ? editor(f) : list();
  }

  // preview is exposed so field edits can refresh it without re-rendering the editor
  return { render, preview };
}
