import { calculateWorkflowIssues } from '../screens/workflows/ConsentWorkflows.jsx';
import { CONSENT_SDK_SNIPPET } from '../screens/implementation/ConsentImplementation.jsx';
import { CP_ICONS } from '../consentIcons.js';

export function registerConsentActions(context, ACT) {
  const {
    state,
    runtime,
    ui,
    saveConsentState,
    saveCurrentUser,
    DEMO_ACCOUNTS,
    ROLES,
    DEFAULT_RIGHTS,
    REGION_TREE,
    LEGAL_BASIS_OPTIONS,
    PURPOSE_CATEGORIES,
    DATA_ATTRIBUTES,
    CHANNELS,
    safe,
    formatDate,
    formatDateTime,
    canEdit,
    currentUser,
    switchUser,
    resetState,
    renderers
  } = context;

  // 1. Navigation & General
  ACT['cp-tab'] = tab => {
    ui.topTab = tab;
    ui.selectedRecordId = null;
    ui.userMenuOpen = false;
    runtime.render();
  };

  ACT['cp-set-range'] = val => {
    ui.range = Number(val) || 365;
    runtime.render();
  };

  ACT['cp-dash-country'] = val => {
    ui.dashCountry = val || 'all';
    runtime.render();
  };

  ACT['cp-refresh'] = () => {
    runtime.toast('Dashboard refreshed');
    runtime.render();
  };

  ACT['cp-toast'] = msg => {
    if (msg) runtime.toast(msg);
  };

  ACT['cp-toggle-user-menu'] = () => {
    ui.userMenuOpen = !ui.userMenuOpen;
    runtime.render();
  };

  ACT['cp-switch-user'] = userId => {
    const account = DEMO_ACCOUNTS.find(a => a.id === userId);
    if (account) {
      switchUser(account);
      ui.userMenuOpen = false;
      runtime.toast(`Signed in as ${account.name} (${account.role})`);
      runtime.render();
    }
  };

  ACT['cp-reset-demo-data'] = () => {
    runtime.modal(
      'Reset Demo Data?',
      'Restore initial dummy records and configurations',
      `
        <p style="color:var(--text-2);font-size:13.5px;line-height:1.5">
          This will restore all sample consent records, purposes, preferences, jurisdictions, builder settings, and workflows to their initial state.
        </p>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm p" style="background:#ef4444;color:#fff" data-act="cp-confirm-reset-demo-data">
          Confirm Reset
        </button>
      `
    );
  };

  ACT['cp-confirm-reset-demo-data'] = () => {
    runtime.closeOv();
    resetState().then(() => {
      ui.recordsSearch = '';
      ui.recordsStatusFilter = '';
      ui.selectedRecordId = null;
      ui.activeWorkflow = null;
      ui.workflowView = 'list';
      runtime.toast('Demo sample data restored');
      runtime.render();
    }, err => runtime.toast("Couldn't reset consent data: " + err.message));
  };

  // 2. Records Actions
  ACT['cp-records-search'] = val => {
    ui.recordsSearch = val || '';
    ui.recordsPage = 1;
    runtime.render();
  };

  ACT['cp-records-clear-search'] = () => {
    ui.recordsSearch = '';
    ui.recordsPage = 1;
    runtime.render();
  };

  ACT['cp-records-reset-filters'] = () => {
    ui.recordsSearch = '';
    ui.recordsStatusFilter = '';
    ui.range = 365;
    ui.recordsPage = 1;
    runtime.render();
  };

  ACT['cp-records-status-filter'] = val => {
    ui.recordsStatusFilter = val || '';
    ui.recordsPage = 1;
    runtime.render();
  };

  ACT['cp-sort-records'] = col => {
    if (ui.recordsSortCol === col) {
      ui.recordsSortDir = ui.recordsSortDir === 1 ? -1 : 1;
    } else {
      ui.recordsSortCol = col;
      ui.recordsSortDir = 1;
    }
    runtime.render();
  };

  ACT['cp-records-page'] = p => {
    ui.recordsPage = Math.max(1, Number(p) || 1);
    runtime.render();
  };

  ACT['cp-records-page-size'] = size => {
    ui.recordsPageSize = Number(size) || 10;
    ui.recordsPage = 1;
    runtime.render();
  };

  ACT['cp-view-record'] = id => {
    ui.selectedRecordId = id;
    runtime.render();
  };

  ACT['cp-back-to-records'] = () => {
    ui.selectedRecordId = null;
    runtime.render();
  };

  ACT['cp-export-csv'] = () => {
    const headers = ['ID', 'Owner', 'Name', 'Email', 'Status', 'Country', 'City', 'IP', 'Verified', 'Withdrawn', 'Created'];
    const rows = state.consents.map(c => [
      c.id,
      c.owner,
      `${c.first} ${c.last}`,
      c.email,
      c.status,
      c.country,
      c.city,
      c.ip,
      c.verified ? 'Yes' : 'No',
      c.withdrawn ? 'Yes' : 'No',
      c.created
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `consent-records-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    runtime.toast('Exported consent records to CSV');
  };

  ACT['cp-open-withdraw'] = id => {
    runtime.modal(
      'Withdraw Consent Choice?',
      `Record ID: ${id}`,
      `
        <p style="color:var(--text-2);font-size:13.5px">
          Are you sure you want to withdraw consent for this data principal?
          This marks the record as Withdrawn and triggers downstream sync in connected workflows.
        </p>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm p" style="background:#ef4444;color:#fff" data-act="cp-confirm-withdraw" data-arg="${safe(id)}">
          Withdraw Consent
        </button>
      `
    );
  };

  ACT['cp-confirm-withdraw'] = id => {
    const record = state.consents.find(c => c.id === id);
    if (record) {
      record.withdrawn = true;
      saveConsentState(state);
      runtime.closeOv();
      runtime.toast('Consent marked as withdrawn');
      runtime.render();
    }
  };

  // Repeatable row sections in the Add Consent form (preferences, proofs, legal notices, additional data)
  const REPEATERS = {
    pref: {
      label: 'preference',
      fields: [
        { k: 'name', label: 'Preference Name', type: 'text', ph: 'e.g. Security Alerts', list: 'cp-pref-names' },
        { k: 'allowed', label: 'Allowed', type: 'checkbox' }
      ]
    },
    proof: {
      label: 'proof',
      fields: [
        { k: 'content', label: 'Content', type: 'text', ph: 'e.g. Banner consent accepted via web' },
        { k: 'form', label: 'Form', type: 'text', ph: 'e.g. Consent Preference Page' }
      ]
    },
    notice: {
      label: 'legal notice',
      fields: [
        { k: 'identifier', label: 'Identifier', type: 'text', ph: 'e.g. Privacy Policy' },
        { k: 'version', label: 'Version', type: 'text', ph: 'e.g. 3.0' },
        { k: 'content', label: 'Content', type: 'textarea', ph: 'Notice text or summary shown to the principal', wide: true }
      ]
    },
    additional: {
      label: 'additional data',
      fields: [
        { k: 'key', label: 'Key', type: 'text', ph: 'e.g. branch_code' },
        { k: 'value', label: 'Value', type: 'text', ph: 'e.g. MUM-001' }
      ]
    }
  };

  function repeaterRow(kind) {
    const spec = REPEATERS[kind];
    const uid = Math.random().toString(36).slice(2, 8);
    const fields = spec.fields.map(f => {
      const id = `cp_rep_${kind}_${f.k}_${uid}`;
      if (f.type === 'checkbox') {
        return `<label class="cp-rep-check" for="${id}"><input type="checkbox" id="${id}" data-rep-field="${f.k}" checked /> ${f.label}</label>`;
      }
      const control = f.type === 'textarea'
        ? `<textarea id="${id}" rows="2" data-rep-field="${f.k}" placeholder="${safe(f.ph)}"></textarea>`
        : `<input type="text" id="${id}" data-rep-field="${f.k}" placeholder="${safe(f.ph)}"${f.list ? ` list="${f.list}"` : ''} />`;
      return `<div class="cp-form-group${f.wide ? ' cp-rep-wide' : ''}"><label for="${id}">${f.label}</label>${control}</div>`;
    }).join('');
    return `
      <div class="cp-rep-row" data-rep-row="${kind}">
        <div class="cp-rep-fields cp-rep-${kind}">${fields}</div>
        <div class="cp-rep-btns">
          <button type="button" class="btn sm o cp-rep-btn" data-act="cp-rep-add" data-arg="${kind}" title="Add another ${spec.label}" aria-label="Add another ${spec.label}">+</button>
          <button type="button" class="btn sm o cp-rep-btn danger" data-act="cp-rep-remove" title="Remove this ${spec.label}" aria-label="Remove this ${spec.label}">−</button>
        </div>
      </div>
    `;
  }

  function repeaterSection(kind, title) {
    const spec = REPEATERS[kind];
    return `
      <section class="cp-rep" data-rep="${kind}">
        <div class="cp-rep-head">
          <h4>${title}</h4>
          <button type="button" class="btn sm o" data-act="cp-rep-add" data-arg="${kind}">
            <span class="cp-btn-icon">${CP_ICONS.plus}</span> Add ${spec.label}
          </button>
        </div>
        <div class="cp-rep-rows"></div>
        <p class="cp-rep-empty dim">No ${spec.label} added yet.</p>
      </section>
    `;
  }

  // Rows are added and removed in place so values already typed are kept
  ACT['cp-rep-add'] = (kind, el) => {
    if (!REPEATERS[kind] || !el) return;
    const row = el.closest('.cp-rep-row');
    const section = el.closest('[data-rep]');
    const rows = section.querySelector('.cp-rep-rows');
    if (row) row.insertAdjacentHTML('afterend', repeaterRow(kind));
    else rows.insertAdjacentHTML('beforeend', repeaterRow(kind));
    const added = row ? row.nextElementSibling : rows.lastElementChild;
    section.classList.add('has-rows');
    added.querySelector('input[type="text"], textarea')?.focus();
  };

  ACT['cp-rep-remove'] = (arg, el) => {
    const row = el && el.closest('.cp-rep-row');
    if (!row) return;
    const section = row.closest('[data-rep]');
    row.remove();
    if (!section.querySelector('.cp-rep-row')) section.classList.remove('has-rows');
  };

  ACT['cp-open-add-record'] = () => {
    const body = `
      <div id="cp-add-record-error" class="cp-form-error" style="margin-bottom:12px" role="alert"></div>
      <div class="cp-grid-2">
        <div class="cp-form-group">
          <label for="cp_nr_first">First Name</label>
          <input type="text" id="cp_nr_first" placeholder="e.g. Priya" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_last">Last Name</label>
          <input type="text" id="cp_nr_last" placeholder="e.g. Kulkarni" />
        </div>
        <div class="cp-form-group">
          <label class="required" for="cp_nr_email">Email Address</label>
          <input type="email" id="cp_nr_email" placeholder="priya.kulkarni@example.com" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_auth">Authentication ID</label>
          <input type="text" id="cp_nr_auth" placeholder="auth-10294" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_owner">Owner ID</label>
          <input type="text" id="cp_nr_owner" placeholder="own-admin" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_aadhaar">Aadhaar Number</label>
          <input type="text" id="cp_nr_aadhaar" inputmode="numeric" maxlength="14" placeholder="12 digits · stored masked" autocomplete="off" />
        </div>
      </div>

      <div class="cp-form-group">
        <label>Data Source</label>
        <div style="display:flex;gap:16px;margin-top:4px">
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="radio" name="cp_nr_source" value="Private" checked style="width:auto" />
            Private
          </label>
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="radio" name="cp_nr_source" value="Public" style="width:auto" />
            Public
          </label>
        </div>
      </div>

      <div class="cp-grid-3">
        <div class="cp-form-group">
          <label for="cp_nr_country">Country</label>
          <input type="text" id="cp_nr_country" placeholder="India" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_city">City</label>
          <input type="text" id="cp_nr_city" placeholder="Mumbai" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_zip">ZIP / PIN Code</label>
          <input type="text" id="cp_nr_zip" placeholder="400051" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_ip">IP Address</label>
          <input type="text" id="cp_nr_ip" placeholder="198.51.100.24" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_phone">Phone</label>
          <input type="text" id="cp_nr_phone" placeholder="+91 98200 12345" />
        </div>
        <div class="cp-form-group">
          <label for="cp_nr_landline">Landline Number</label>
          <input type="text" id="cp_nr_landline" placeholder="022 2653 0000" />
        </div>
      </div>

      <div style="display:flex;gap:20px;margin-bottom:14px">
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="cp_nr_verified" checked style="width:auto" />
          Identity Verified
        </label>
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="cp_nr_maskip" style="width:auto" />
          Mask IP Address
        </label>
      </div>

      <datalist id="cp-pref-names">
        ${state.preferences.map(p => `<option value="${safe(p.name)}"></option>`).join('')}
      </datalist>
      ${repeaterSection('pref', 'Preferences')}
      ${repeaterSection('proof', 'Proofs')}
      ${repeaterSection('notice', 'Legal Notices')}
      ${repeaterSection('additional', 'Additional Data')}

      <div class="cp-form-group">
        <label for="cp_nr_status">Consent Status</label>
        <select id="cp_nr_status">
          <option value="Accept All" selected>Accept All</option>
          <option value="Partial Consent">Partial Consent</option>
          <option value="Reject All">Reject All</option>
        </select>
      </div>
    `;

    runtime.modal(
      'Add Consent Record',
      'Register a new principal choice',
      body,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm p" data-act="cp-save-add-record">Add Record</button>
      `,
      'drawer-wide'
    );
  };

  function readRows(dialog, kind) {
    return Array.from(dialog.querySelectorAll(`[data-rep-row="${kind}"]`)).map(row => {
      const out = {};
      row.querySelectorAll('[data-rep-field]').forEach(el => {
        out[el.getAttribute('data-rep-field')] = el.type === 'checkbox' ? el.checked : el.value.trim();
      });
      return out;
    });
  }

  ACT['cp-save-add-record'] = () => {
    const dialog = document.querySelector('.modal[role="dialog"]');
    if (!dialog) return;
    const val = sel => (dialog.querySelector(sel)?.value || '').trim();
    const errBox = dialog.querySelector('#cp-add-record-error');
    const errors = [];

    const email = val('#cp_nr_email');
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('A valid email address is required.');
    else if (state.consents.some(c => c.email.toLowerCase() === email.toLowerCase())) errors.push('A consent record with this email address already exists.');

    const aadhaarRaw = val('#cp_nr_aadhaar').replace(/[\s-]/g, '');
    if (aadhaarRaw && !/^[2-9]\d{11}$/.test(aadhaarRaw)) errors.push('Aadhaar must be 12 digits and can\'t start with 0 or 1.');
    const landline = val('#cp_nr_landline');
    if (landline && !/^[0-9+()\-\s]{6,20}$/.test(landline)) errors.push('Enter a valid landline number (digits, spaces, + - and brackets only).');
    const zip = val('#cp_nr_zip');
    if (zip && !/^[A-Za-z0-9\s-]{3,10}$/.test(zip)) errors.push('ZIP / PIN code should be 3 to 10 letters or digits.');

    // Fully empty rows are ignored; half-filled rows must be completed
    const preferences = readRows(dialog, 'pref').filter(r => r.name).map(r => ({ name: r.name, allowed: Boolean(r.allowed) }));
    const proofRows = readRows(dialog, 'proof').filter(r => r.content || r.form);
    if (proofRows.some(r => !r.content)) errors.push('Each proof needs content.');
    const noticeRows = readRows(dialog, 'notice').filter(r => r.identifier || r.version || r.content);
    if (noticeRows.some(r => !r.identifier)) errors.push('Each legal notice needs an identifier.');
    const additional = readRows(dialog, 'additional').filter(r => r.key || r.value);
    if (additional.some(r => !r.key)) errors.push('Each additional data row needs a key.');
    const keys = additional.map(r => r.key.toLowerCase());
    if (keys.some((k, i) => keys.indexOf(k) !== i)) errors.push('Additional data keys must be unique.');

    if (errors.length) {
      if (errBox) {
        errBox.innerHTML = errors.length === 1 ? safe(errors[0]) : `<b>Fix ${errors.length} items:</b><ul>${errors.map(e => `<li>${safe(e)}</li>`).join('')}</ul>`;
        errBox.scrollIntoView({ block: 'nearest' });
      }
      return;
    }

    const sourceEl = dialog.querySelector('input[name="cp_nr_source"]:checked');
    const newRecord = {
      id: `CR-${5000 + state.consents.length + Math.floor(Math.random() * 90)}`,
      first: val('#cp_nr_first') || 'Principal',
      last: val('#cp_nr_last'),
      email,
      authId: val('#cp_nr_auth') || `auth-${Math.floor(Math.random() * 1e5)}`,
      source: sourceEl ? sourceEl.value : 'Private',
      country: val('#cp_nr_country') || 'Global',
      city: val('#cp_nr_city'),
      ip: val('#cp_nr_ip') || '198.51.100.1',
      phone: val('#cp_nr_phone'),
      landline,
      zip,
      // Only the last 4 digits are kept, as UIDAI requires for display
      aadhaar: aadhaarRaw ? 'XXXX XXXX ' + aadhaarRaw.slice(-4) : '',
      verified: Boolean(dialog.querySelector('#cp_nr_verified')?.checked),
      maskIP: Boolean(dialog.querySelector('#cp_nr_maskip')?.checked),
      status: dialog.querySelector('#cp_nr_status')?.value || 'Accept All',
      withdrawn: false,
      expired: false,
      created: new Date().toISOString(),
      owner: val('#cp_nr_owner') || 'own-admin',
      preferences,
      proofs: proofRows.map(r => ({ content: r.content, form: r.form })),
      legalNotices: noticeRows.map(r => ({ identifier: r.identifier, version: r.version || '1.0', content: r.content })),
      additional: additional.map(r => ({ key: r.key, value: r.value }))
    };

    state.consents.unshift(newRecord);
    saveConsentState(state);
    runtime.closeOv();
    runtime.toast('Consent record added successfully');
    runtime.render();
  };

  // 3. Builder Actions
  ACT['cp-builder-set-step'] = stepIdx => {
    ui.builderStep = Math.max(0, Math.min(6, Number(stepIdx) || 0));
    runtime.render();
  };

  ACT['cp-builder-set-sub'] = sub => {
    ui.builderSub = sub;
    ui.builderStep = 0;
    runtime.render();
  };

  ACT['cp-builder-toggle-setting'] = key => {
    if (!canEdit()) return;
    state.builder.settings[key] = !state.builder.settings[key];
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.render();
  };

  ACT['cp-builder-opt'] = arg => {
    if (!canEdit()) return;
    const parts = arg.split(':');
    const group = parts[0];
    const key = parts[1];
    const val = parts.slice(2).join(':');
    if (state.builder[group]) {
      state.builder[group][key] = val;
      state.builder.dirty = true;
      saveConsentState(state);
      runtime.render();
    }
  };

  ACT['cp-builder-input'] = (val, el) => {
    if (!canEdit()) return;
    const arg = el?.getAttribute('data-arg') || '';
    const [group, key] = arg.split(':');
    if (state.builder[group] && key) {
      state.builder[group][key] = val;
      state.builder.dirty = true;
      saveConsentState(state);
    }
  };

  ACT['cp-builder-custom-color'] = (val, el) => {
    if (!canEdit()) return;
    const idx = Number(el?.getAttribute('data-arg') || 0);
    if (!state.builder.customColors) state.builder.customColors = ['#2f6fe4', '#9b51e0', '#e83e8c'];
    state.builder.customColors[idx] = val;
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.render();
  };

  ACT['cp-builder-toggle-lang'] = code => {
    if (!canEdit()) return;
    const idx = state.builder.languages.indexOf(code);
    if (idx > -1) {
      if (code !== 'en-US') state.builder.languages.splice(idx, 1);
    } else {
      state.builder.languages.push(code);
    }
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.render();
  };

  ACT['cp-builder-lang-search'] = val => {
    ui.builderLanguageSearch = val || '';
    runtime.render();
  };

  ACT['cp-builder-set-theme'] = theme => {
    if (!canEdit()) return;
    state.builder.theme = theme;
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.render();
  };

  ACT['cp-builder-toggle-accordion'] = id => {
    ui.openAccordions[id] = !ui.openAccordions[id];
    runtime.render();
  };

  ACT['cp-upload-logo-sim'] = () => {
    runtime.toast('Upload simulated in demo');
  };

  ACT['cp-open-ccodes'] = () => {
    runtime.modal(
      'Configure SMS Country Codes',
      'Supported telephone jurisdictions',
      `
        <div class="cp-form-group">
          <label>Countries enabled for SMS verification</label>
          <input type="number" id="cp_ccodes_input" value="${state.builder.settings.countryCodes || 34}" min="1" max="240" />
        </div>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm p" data-act="cp-save-ccodes">Save</button>
      `
    );
  };

  ACT['cp-save-ccodes'] = () => {
    const dialog = document.querySelector('.modal[role="dialog"]');
    const count = Number(dialog?.querySelector('#cp_ccodes_input')?.value) || 34;
    state.builder.settings.countryCodes = count;
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.closeOv();
    runtime.toast('Country codes configuration updated');
    runtime.render();
  };

  ACT['cp-builder-save'] = () => {
    state.builder.dirty = false;
    saveConsentState(state);
    runtime.toast('Draft preferences saved');
    runtime.render();
  };

  ACT['cp-builder-publish-modal'] = () => {
    const nextVer = (state.builder.history[0]?.v || 1) + 1;
    runtime.modal(
      'Publish Preference Center?',
      `This will deploy version ${nextVer} to live production`,
      `
        <p style="color:var(--text-2);font-size:13.5px">
          Active data principals will immediately be served the latest version of your purposes, branding, and verification rules.
        </p>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm p" data-act="cp-builder-confirm-publish">Publish Now</button>
      `
    );
  };

  ACT['cp-builder-confirm-publish'] = () => {
    const nextVer = (state.builder.history[0]?.v || 1) + 1;
    const nowIso = new Date().toISOString();
    state.builder.history.unshift({
      v: nextVer,
      at: nowIso,
      by: currentUser.name
    });
    state.builder.lastPublished = nowIso;
    state.builder.dirty = false;
    saveConsentState(state);
    runtime.closeOv();
    runtime.toast(`Preference Center published (version ${nextVer})`);
    runtime.render();
  };

  ACT['cp-open-history'] = () => {
    const historyList = state.builder.history || [];
    runtime.modal(
      'Publish History',
      'Immutable audit trail of preference deployments',
      `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${historyList.map(h => `
            <div style="padding:8px 12px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:space-between">
              <div>
                <b>Version ${h.v}</b>
                <small class="dim" style="display:block">Published by ${safe(h.by)}</small>
              </div>
              <span class="dim" style="font-size:12px">${safe(formatDateTime(h.at))}</span>
            </div>
          `).join('')}
        </div>
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  ACT['cp-builder-preview'] = () => {
    const b = state.builder;
    const c = b.content;
    const isDark = b.theme === 'Dark Theme';
    const bgCol = isDark ? '#111827' : '#ffffff';
    const textCol = isDark ? '#f9fafb' : '#111827';
    const cardBg = isDark ? '#1f2937' : '#f9fafb';
    const borderCol = isDark ? '#374151' : '#e5e7eb';
    const accentCol = b.theme === 'Custom Colors' ? (b.customColors[0] || '#2f6fe4') : 'var(--accent)';

    const body = `
      <div style="background:${bgCol};color:${textCol};border:1px solid ${borderCol};border-radius:10px;padding:22px;font-family:inherit">
        <h3 style="margin:0 0 10px;font-size:17px">${safe(c.purposeTitle)}</h3>
        <p style="color:${isDark ? '#9ca3af' : '#6b7280'};font-size:13px;margin-bottom:14px">
          Manage how we process your personal data for essential and non-essential activities.
        </p>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
          ${state.purposes.filter(p => p.status === 'Enabled').slice(0, 4).map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:${cardBg};border:1px solid ${borderCol};border-radius:8px">
              <div>
                <b style="font-size:13px">${safe(p.name)}</b>
                <small style="display:block;color:${isDark ? '#9ca3af' : '#6b7280'};margin-top:2px">${safe(p.description.slice(0, 50))}…</small>
              </div>
              <span class="cp-switch ${p.essential ? 'on disabled' : 'on'}" style="flex:none"></span>
            </div>
          `).join('')}
        </div>

        <hr style="border:0;border-top:1px solid ${borderCol};margin:16px 0" />

        <h3 style="margin:0 0 10px;font-size:17px">${safe(c.preferenceTitle)}</h3>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
          ${state.preferences.filter(p => p.status === 'Enabled').slice(0, 3).map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:${cardBg};border:1px solid ${borderCol};border-radius:8px">
              <span style="font-size:13px;font-weight:550">${safe(p.name)}</span>
              <span class="cp-switch on"></span>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div style="display:flex;gap:8px">
            <button class="btn sm o" style="background:${cardBg};color:${textCol};border-color:${borderCol}">${safe(c.reject)}</button>
            <button class="btn sm o" style="background:${cardBg};color:${textCol};border-color:${borderCol}">${safe(c.save)}</button>
            <button class="btn sm p" style="background:${accentCol};color:#fff;border-color:${accentCol}">${safe(c.accept)}</button>
          </div>
          ${b.settings.watermark ? `
            <small style="color:${isDark ? '#6b7280' : '#9ca3af'};font-size:11px">Powered by </small>
          ` : ''}
        </div>
      </div>
    `;

    runtime.modal(
      `Live Preview – ${b.theme}`,
      'Customer-facing consent experience',
      body,
      `<button class="btn sm o" data-act="close">Close Preview</button>`,
      'drawer-wide'
    );
  };

  // Shared pieces for the Manage Purposes / Manage Preferences tables
  function rowActions(kind, item) {
    const dis = canEdit() ? '' : ' disabled title="Read-only mode"';
    return `
      <div class="cp-row-actions">
        <button class="btn sm o cp-act-btn" data-act="cp-open-edit-${kind}" data-arg="${safe(item.id)}"${dis || ` title="Edit ${safe(item.name)}"`}>
          <span class="cp-btn-icon">${CP_ICONS.edit}</span> Edit
        </button>
        <button class="btn sm o cp-act-btn danger" data-act="cp-ask-delete-${kind}" data-arg="${safe(item.id)}"${dis || ` title="Delete ${safe(item.name)}"`}>
          <span class="cp-btn-icon">${CP_ICONS.trash}</span> Delete
        </button>
      </div>
    `;
  }

  // Enable/disable lives in the Status column as a switch
  function statusSwitch(kind, item) {
    const on = item.status === 'Enabled';
    const dis = canEdit() ? '' : ' disabled title="Read-only mode"';
    return `
      <div class="cp-status-cell">
        <button type="button" class="switch" role="switch" aria-checked="${on}"
          aria-label="${on ? 'Disable' : 'Enable'} ${safe(item.name)}"
          data-act="cp-toggle-${kind}-status" data-arg="${safe(item.id)}"${dis}></button>
        <span class="cp-status-label ${on ? 'on' : ''}">${on ? 'Enabled' : 'Disabled'}</span>
      </div>
    `;
  }

  function manageToolbar({ searchAct, searchValue, placeholder, count, noun, addAct, addLabel }) {
    return `
      <div class="cp-manage-toolbar">
        <div class="cp-records-search-wrap">
          <span class="cp-records-search-icon">${CP_ICONS.search}</span>
          <input type="search" class="cp-records-search-input" id="cp-manage-search"
            placeholder="${placeholder}" value="${safe(searchValue)}"
            data-input-act="${searchAct}" aria-label="${placeholder}" autocomplete="off" />
        </div>
        <span class="cp-records-badge">${count} ${noun}${count === 1 ? '' : 's'}</span>
        <button class="btn sm p" ${canEdit() ? '' : 'disabled title="Read-only mode"'} data-act="${addAct}">
          <span class="cp-btn-icon">${CP_ICONS.plus}</span> ${addLabel}
        </button>
      </div>
    `;
  }

  function dateCell(iso) {
    if (!iso) return '<span class="dim">—</span>';
    const d = new Date(iso);
    return `<span class="cp-date">${safe(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}</span>` +
      `<span class="cp-time">${safe(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}</span>`;
  }

  // Re-rendering the modal replaces the search input, so put the caret back
  function openManageModal(title, sub, body) {
    const active = document.activeElement && document.activeElement.id === 'cp-manage-search';
    const caret = active ? document.activeElement.selectionStart : null;
    runtime.modal(title, sub, body, `<button class="btn sm o" data-act="close">Done</button>`, 'cp-manage-modal');
    if (active) {
      const input = document.getElementById('cp-manage-search');
      if (input) { input.focus(); try { input.setSelectionRange(caret, caret); } catch (e) {} }
    }
  }

  function emptyRow(cols, noun) {
    return `<tr><td colspan="${cols}"><div class="cp-manage-empty">No ${noun}s match your search.</div></td></tr>`;
  }

  function askDelete(kind, item, backAct) {
    runtime.modal(
      `Delete ${kind === 'purpose' ? 'purpose' : 'preference'}?`,
      safe(item.id),
      `<p style="color:var(--text);font-size:13.5px;line-height:1.5"><b>${safe(item.name)}</b> will be removed from the preference page. This can't be undone.</p>`,
      `
        <button class="btn sm o" data-act="${backAct}">Cancel</button>
        <button class="btn sm" style="background:var(--block);color:#fff" data-act="cp-delete-${kind}" data-arg="${safe(item.id)}">Delete</button>
      `
    );
  }

  ACT['cp-ask-delete-purpose'] = id => {
    const item = state.purposes.find(p => p.id === id);
    if (item && canEdit()) askDelete('purpose', item, 'cp-open-purposes-modal');
  };

  ACT['cp-ask-delete-pref'] = id => {
    const item = state.preferences.find(p => p.id === id);
    if (item && canEdit()) askDelete('pref', item, 'cp-open-prefs-modal');
  };

  // 4. Purposes Management Modal
  ACT['cp-open-purposes-modal'] = () => {
    const q = (ui.purposeSearch || '').trim().toLowerCase();
    const filtered = state.purposes.filter(p => !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));

    const body = manageToolbar({
      searchAct: 'cp-purpose-search', searchValue: ui.purposeSearch || '', placeholder: 'Search purposes…',
      count: filtered.length, noun: 'purpose', addAct: 'cp-open-add-purpose', addLabel: 'Add Purpose'
    }) + `
      <div class="cp-manage-wrap">
        <table class="cp-manage-table">
          <colgroup>
            <col style="width:36%" /><col style="width:12%" /><col style="width:11%" />
            <col style="width:15%" /><col style="width:11%" /><col style="width:15%" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Purpose</th>
              <th scope="col">Category</th>
              <th scope="col">Subject</th>
              <th scope="col">Status</th>
              <th scope="col">Last Updated</th>
              <th scope="col" class="cp-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(p => `
              <tr>
                <td>
                  <div class="cp-manage-name">${safe(p.name)}</div>
                  <div class="cp-manage-desc" title="${safe(p.description)}">${safe(p.description || '')}</div>
                  <div class="cp-manage-id">${safe(p.id)}${p.essential ? ' · Essential' : ''}</div>
                </td>
                <td><span class="cp-badge b-Active">${safe(p.category)}</span></td>
                <td>${safe(p.subject)}</td>
                <td>${statusSwitch('purpose', p)}</td>
                <td>${dateCell(p.updated)}</td>
                <td>${rowActions('purpose', p)}</td>
              </tr>
            `).join('') : emptyRow(6, 'purpose')}
          </tbody>
        </table>
      </div>
    `;

    openManageModal('Manage Purposes', 'Configure collection rationale and validity', body);
  };

  ACT['cp-purpose-search'] = val => {
    ui.purposeSearch = val || '';
    ACT['cp-open-purposes-modal']();
  };

  ACT['cp-open-add-purpose'] = () => {
    renderPurposeForm();
  };

  ACT['cp-open-edit-purpose'] = id => {
    const purpose = state.purposes.find(p => p.id === id);
    if (purpose) renderPurposeForm(purpose);
  };

  function renderPurposeForm(p = null) {
    const isNew = !p;
    const body = `
      <div id="cp-purpose-error" class="cp-form-error" style="margin-bottom:12px"></div>
      <div class="cp-grid-2">
        <div class="cp-form-group">
          <label class="required">Purpose Name</label>
          <input type="text" id="cp_pu_name" value="${safe(p?.name || '')}" placeholder="e.g. Analytics and Behavioral Profiling" />
        </div>
        <div class="cp-form-group">
          <label class="required">Category</label>
          <select id="cp_pu_cat">
            <option value="">Select Purpose Category</option>
            ${PURPOSE_CATEGORIES.map(c => `<option value="${c}" ${p?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="cp-form-group">
        <label>Description</label>
        <textarea id="cp_pu_desc" rows="2" placeholder="Clear justification for personal data collection">${safe(p?.description || '')}</textarea>
      </div>

      <div class="cp-grid-2">
        <div class="cp-form-group">
          <label class="required">Subject Type</label>
          <select id="cp_pu_subject">
            <option value="">Select Subject Type</option>
            ${['Customer', 'Employee', 'Contractor', 'Student'].map(s => `
              <option value="${s}" ${p?.subject === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </div>
        <div class="cp-form-group">
          <label class="required">Validity (days)</label>
          <input type="number" id="cp_pu_validity" value="${p?.validity || 365}" min="1" max="3650" />
        </div>
      </div>

      <div class="cp-form-group">
        <label class="required">Essential (Strictly Necessary)</label>
        <select id="cp_pu_essential">
          <option value="No" ${!p?.essential ? 'selected' : ''}>No (Optional)</option>
          <option value="Yes" ${p?.essential ? 'selected' : ''}>Yes (Strictly Required)</option>
        </select>
      </div>

      <div class="cp-form-group">
        <label class="required">Linked Data Attributes</label>
        <div class="cp-tree-scroll" style="max-height:130px">
          ${DATA_ATTRIBUTES.map(attr => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer">
              <input type="checkbox" data-pu-attr="${safe(attr)}" ${(p?.attributes || ['Nationality']).includes(attr) ? 'checked' : ''} style="width:auto" />
              <span>${safe(attr)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    runtime.modal(
      isNew ? 'Create New Purpose' : 'Edit Purpose',
      'Define legal rationale, attributes, and validity duration',
      body,
      `
        <button class="btn sm o" data-act="cp-open-purposes-modal">← Back</button>
        <button class="btn sm p" data-act="cp-save-purpose" ${p ? `data-arg="${safe(p.id)}"` : ''}>
          ${isNew ? 'Create Purpose' : 'Save Changes'}
        </button>
      `
    );
  }

  ACT['cp-save-purpose'] = id => {
    const dialog = document.querySelector('.modal[role="dialog"]');
    if (!dialog) return;

    const name = (dialog.querySelector('#cp_pu_name')?.value || '').trim();
    const category = dialog.querySelector('#cp_pu_cat')?.value;
    const desc = (dialog.querySelector('#cp_pu_desc')?.value || '').trim();
    const subject = dialog.querySelector('#cp_pu_subject')?.value;
    const validity = Number(dialog.querySelector('#cp_pu_validity')?.value) || 365;
    const essential = dialog.querySelector('#cp_pu_essential')?.value === 'Yes';
    const attrCheckboxes = dialog.querySelectorAll('input[data-pu-attr]:checked');
    const attributes = Array.from(attrCheckboxes).map(el => el.getAttribute('data-pu-attr'));

    const errBox = dialog.querySelector('#cp-purpose-error');

    if (!name || !category || !subject || !attributes.length) {
      if (errBox) errBox.textContent = 'Name, category, subject type, and at least one data attribute are required.';
      return;
    }

    const payload = {
      name,
      description: desc,
      category,
      subject,
      validity,
      essential,
      attributes,
      updated: new Date().toISOString()
    };

    if (id) {
      const existing = state.purposes.find(p => p.id === id);
      if (existing) Object.assign(existing, payload);
    } else {
      state.purposes.push({
        id: `pur-${Date.now()}`,
        status: 'Enabled',
        created: new Date().toISOString(),
        ...payload
      });
    }

    state.builder.dirty = true;
    saveConsentState(state);
    runtime.toast('Purpose saved');
    ACT['cp-open-purposes-modal']();
  };

  ACT['cp-toggle-purpose-status'] = id => {
    const purpose = state.purposes.find(p => p.id === id);
    if (purpose) {
      purpose.status = purpose.status === 'Enabled' ? 'Disabled' : 'Enabled';
      purpose.updated = new Date().toISOString();
      state.builder.dirty = true;
      saveConsentState(state);
      ACT['cp-open-purposes-modal']();
    }
  };

  ACT['cp-delete-purpose'] = id => {
    state.purposes = state.purposes.filter(p => p.id !== id);
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.toast('Purpose deleted');
    ACT['cp-open-purposes-modal']();
  };

  // 5. Preferences Management Modal
  ACT['cp-open-prefs-modal'] = () => {
    const q = (ui.preferenceSearch || '').trim().toLowerCase();
    const filtered = state.preferences.filter(p => !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q));

    const body = manageToolbar({
      searchAct: 'cp-pref-search', searchValue: ui.preferenceSearch || '', placeholder: 'Search preferences…',
      count: filtered.length, noun: 'preference', addAct: 'cp-open-add-pref', addLabel: 'Add Preference'
    }) + `
      <div class="cp-manage-wrap">
        <table class="cp-manage-table">
          <colgroup>
            <col style="width:11%" /><col style="width:13%" /><col style="width:17%" /><col style="width:13%" />
            <col style="width:11%" /><col style="width:10%" /><col style="width:10%" /><col style="width:15%" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Preference ID</th>
              <th scope="col">Preference Name</th>
              <th scope="col">Description</th>
              <th scope="col">Channels</th>
              <th scope="col">Status</th>
              <th scope="col">Created At</th>
              <th scope="col">Last Updated</th>
              <th scope="col" class="cp-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(p => `
              <tr>
                <td><span class="cp-manage-id">${safe(p.id)}</span></td>
                <td><div class="cp-manage-name">${safe(p.name)}</div></td>
                <td><div class="cp-manage-desc" title="${safe(p.description)}">${safe(p.description || '')}</div></td>
                <td>
                  <div class="cp-chip-row">
                    ${p.channels.map(ch => `<span class="cp-channel-chip">${safe(ch)}</span>`).join('')}
                  </div>
                </td>
                <td>${statusSwitch('pref', p)}</td>
                <td>${dateCell(p.created)}</td>
                <td>${dateCell(p.updated)}</td>
                <td>${rowActions('pref', p)}</td>
              </tr>
            `).join('') : emptyRow(8, 'preference')}
          </tbody>
        </table>
      </div>
    `;

    openManageModal('Manage Preferences', 'Configure communication channels and notifications', body);
  };

  ACT['cp-pref-search'] = val => {
    ui.preferenceSearch = val || '';
    ACT['cp-open-prefs-modal']();
  };

  ACT['cp-open-add-pref'] = () => {
    renderPrefForm();
  };

  ACT['cp-open-edit-pref'] = id => {
    const pref = state.preferences.find(p => p.id === id);
    if (pref) renderPrefForm(pref);
  };

  function renderPrefForm(p = null) {
    const isNew = !p;
    const body = `
      <div id="cp-pref-error" class="cp-form-error" style="margin-bottom:12px"></div>
      <div class="cp-form-group">
        <label class="required">Preference Name</label>
        <input type="text" id="cp_pf_name" value="${safe(p?.name || '')}" placeholder="e.g. Weekly Product Digest" />
      </div>

      <div class="cp-form-group">
        <label>Description</label>
        <textarea id="cp_pf_desc" rows="2" placeholder="Explain what updates users receive">${safe(p?.description || '')}</textarea>
      </div>

      <div class="cp-form-group">
        <label class="required">Channel Configuration</label>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px">
          ${CHANNELS.map(ch => `
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="checkbox" data-pf-ch="${safe(ch)}" ${(p?.channels || ['Email']).includes(ch) ? 'checked' : ''} style="width:auto" />
              <span>${safe(ch)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    runtime.modal(
      isNew ? 'Create New Preference' : 'Edit Preference',
      'Configure notification opt-in channel',
      body,
      `
        <button class="btn sm o" data-act="cp-open-prefs-modal">← Back</button>
        <button class="btn sm p" data-act="cp-save-pref" ${p ? `data-arg="${safe(p.id)}"` : ''}>
          ${isNew ? 'Create Preference' : 'Save Changes'}
        </button>
      `
    );
  }

  ACT['cp-save-pref'] = id => {
    const dialog = document.querySelector('.modal[role="dialog"]');
    if (!dialog) return;

    const name = (dialog.querySelector('#cp_pf_name')?.value || '').trim();
    const desc = (dialog.querySelector('#cp_pf_desc')?.value || '').trim();
    const chCheckboxes = dialog.querySelectorAll('input[data-pf-ch]:checked');
    const channels = Array.from(chCheckboxes).map(el => el.getAttribute('data-pf-ch'));

    const errBox = dialog.querySelector('#cp-pref-error');

    if (!name || !channels.length) {
      if (errBox) errBox.textContent = 'Name and at least one channel are required.';
      return;
    }

    const payload = {
      name,
      description: desc,
      channels,
      updated: new Date().toISOString()
    };

    if (id) {
      const existing = state.preferences.find(p => p.id === id);
      if (existing) Object.assign(existing, payload);
    } else {
      state.preferences.push({
        id: `prf-${Date.now()}`,
        status: 'Enabled',
        created: payload.updated,
        ...payload
      });
    }

    state.builder.dirty = true;
    saveConsentState(state);
    runtime.toast('Preference saved');
    ACT['cp-open-prefs-modal']();
  };

  ACT['cp-toggle-pref-status'] = id => {
    const pref = state.preferences.find(p => p.id === id);
    if (pref) {
      pref.status = pref.status === 'Enabled' ? 'Disabled' : 'Enabled';
      pref.updated = new Date().toISOString();
      state.builder.dirty = true;
      saveConsentState(state);
      ACT['cp-open-prefs-modal']();
    }
  };

  ACT['cp-delete-pref'] = id => {
    state.preferences = state.preferences.filter(p => p.id !== id);
    state.builder.dirty = true;
    saveConsentState(state);
    runtime.toast('Preference deleted');
    ACT['cp-open-prefs-modal']();
  };

  // 6. Jurisdictions Multi-Step Wizard
  ACT['cp-jurisdiction-search'] = val => {
    ui.jurisdictionSearch = val || '';
    runtime.render();
  };

  ACT['cp-open-add-jurisdiction'] = () => {
    ui.jurisdictionData = {
      id: '',
      name: '',
      code: '',
      description: '',
      regulations: ['DPDPA'],
      rights: [0, 1, 2, 3, 5],
      regions: ['India'],
      legalBases: {}
    };
    state.purposes.forEach((p, idx) => {
      ui.jurisdictionData.legalBases[p.id] = {
        basis: idx === 0 ? 'Legal Obligation' : 'Consent-Opt In',
        enabled: idx < 4
      };
    });
    ui.jurisdictionStep = 0;
    ui.jurisdictionTried = false;
    renderJurisdictionWizard();
  };

  ACT['cp-view-jurisdiction'] = id => {
    const jur = state.jurisdictions.find(j => j.id === id);
    if (jur) {
      ui.jurisdictionData = JSON.parse(JSON.stringify(jur));
      if (!ui.jurisdictionData.legalBases) ui.jurisdictionData.legalBases = {};
      state.purposes.forEach(p => {
        if (!ui.jurisdictionData.legalBases[p.id]) {
          ui.jurisdictionData.legalBases[p.id] = { basis: 'Consent-Opt In', enabled: false };
        }
      });
      ui.jurisdictionStep = 0;
      ui.jurisdictionTried = false;
      renderJurisdictionWizard();
    }
  };

  ACT['cp-delete-jurisdiction'] = id => {
    state.jurisdictions = state.jurisdictions.filter(j => j.id !== id);
    saveConsentState(state);
    runtime.toast('Jurisdiction deleted');
    runtime.render();
  };

  // Required checks run only when the user saves, never on Next
  function validateJurisdiction(d) {
    const errors = [];
    if (!d.name) errors.push({ step: 0, field: 'name', msg: 'Jurisdiction name is required.' });
    if (!d.code) errors.push({ step: 0, field: 'code', msg: 'Unique code is required.' });
    else if (state.jurisdictions.some(j => j.id !== d.id && j.code.toLowerCase() === d.code.toLowerCase())) {
      errors.push({ step: 0, field: 'code', msg: 'A jurisdiction with this code already exists.' });
    }
    if (!d.regions.length) errors.push({ step: 3, field: 'regions', msg: 'Select at least one region or country.' });
    if (Object.values(d.legalBases).some(lb => lb.enabled && !lb.basis)) {
      errors.push({ step: 4, field: 'legalBases', msg: 'Assign a legal basis to each enabled purpose.' });
    }
    return errors;
  }

  // Step 0 inputs are read from the DOM whenever the user leaves that step
  function captureJurisdictionBasics() {
    if ((ui.jurisdictionStep || 0) !== 0) return;
    const dialog = document.querySelector('.modal[role="dialog"]');
    const d = ui.jurisdictionData;
    if (!dialog || !d) return;
    d.name = (dialog.querySelector('#cp_jd_name')?.value || '').trim();
    d.code = (dialog.querySelector('#cp_jd_code')?.value || '').trim();
    d.description = (dialog.querySelector('#cp_jd_desc')?.value || '').trim();
  }

  function renderJurisdictionWizard() {
    const d = ui.jurisdictionData;
    const step = ui.jurisdictionStep || 0;
    const stepNames = ['Basic Details', 'Regulations', 'Rights', 'Regions', 'Legal Bases'];
    const errors = ui.jurisdictionTried ? validateJurisdiction(d) : [];
    const errOn = field => errors.some(e => e.field === field);
    const errStyle = field => (errOn(field) ? ' style="border-color:#ef4444"' : '');

    let content = '';

    // Step 0: Basic Details
    if (step === 0) {
      content = `
        <div class="cp-grid-2">
          <div class="cp-form-group">
            <label class="required">Jurisdiction Name</label>
            <input type="text" id="cp_jd_name" value="${safe(d.name)}"${errStyle('name')} placeholder="e.g. European Union (GDPR)" />
          </div>
          <div class="cp-form-group">
            <label class="required">Unique Code Identifier</label>
            <input type="text" id="cp_jd_code" value="${safe(d.code)}"${errStyle('code')} placeholder="e.g. eu_eea" />
          </div>
        </div>
        <div class="cp-form-group">
          <label>Scope and Regulatory Description</label>
          <textarea id="cp_jd_desc" rows="3" placeholder="Covers data principals residing within EU/EEA member states">${safe(d.description)}</textarea>
        </div>
      `;
    }

    // Step 1: Regulations
    else if (step === 1) {
      const allRegs = ['GDPR', 'CCPA', 'DPDPA', 'LGPD', 'VCDPA', 'PIPEDA', 'OCPA', 'NHPA'];
      content = `
        <p style="color:var(--text-2);font-size:13px;margin-bottom:12px">
          Select all privacy statutory frameworks applicable to this jurisdiction.
        </p>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px">
          ${allRegs.map(reg => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface-2);border-radius:6px;cursor:pointer;font-size:13px">
              <input type="checkbox" data-act="cp-jur-toggle-reg" data-arg="${reg}" ${d.regulations.includes(reg) ? 'checked' : ''} style="width:auto" />
              <b style="color:var(--text)">${reg}</b>
            </label>
          `).join('')}
        </div>
      `;
    }

    // Step 2: Rights
    else if (step === 2) {
      content = `
        <div class="tw table-wrap" style="max-height:280px;overflow-y:auto">
          <table class="table">
            <thead>
              <tr>
                <th style="width:40px">
                  <input
                    type="checkbox"
                    data-act="cp-jur-toggle-all-rights"
                    ${d.rights.length === DEFAULT_RIGHTS.length ? 'checked' : ''}
                    title="Select / Deselect all"
                  />
                </th>
                <th>Statutory Right</th>
                <th>Display Name</th>
                <th>Legal Definition</th>
              </tr>
            </thead>
            <tbody>
              ${DEFAULT_RIGHTS.map((r, idx) => `
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      data-act="cp-jur-toggle-right"
                      data-arg="${idx}"
                      ${d.rights.includes(idx) ? 'checked' : ''}
                    />
                  </td>
                  <td style="font-weight:600">${safe(r[0])}</td>
                  <td>${safe(r[1])}</td>
                  <td class="dim" style="font-size:12px">${safe(r[2])}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Step 3: Regions
    else if (step === 3) {
      const q = (ui.regionSearch || '').trim().toLowerCase();
      content = `
        <div class="cp-grid-2">
          <div>
            <input
              type="search"
              class="table-search-input"
              placeholder="Filter countries..."
              value="${safe(ui.regionSearch || '')}"
              data-input-act="cp-jur-search-regions"
              style="width:100%;height:32px;margin-bottom:8px"
            />
            <div class="cp-tree-scroll" style="max-height:240px">
              ${Object.entries(REGION_TREE).map(([continent, subregions]) => `
                <div style="margin-bottom:8px">
                  <b style="font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px">
                    <span class="cp-tree-folder-icon" style="color:var(--accent)">${CP_ICONS.folder}</span>
                    <span>${safe(continent)}</span>
                  </b>
                  ${Object.entries(subregions).map(([sub, countries]) => `
                    <div style="margin-left:14px;margin-top:4px">
                      <small style="color:var(--text-2);font-size:11.5px;display:flex;align-items:center;gap:4px">
                        <span class="cp-tree-subfolder-icon" style="color:var(--text-3)">${CP_ICONS.folder}</span>
                        <span>${safe(sub)}</span>
                      </small>
                      ${countries.filter(c => !q || c.toLowerCase().includes(q)).map(country => `
                        <div style="margin-left:16px;margin-top:2px">
                          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;padding:2px 0">
                            <input
                              type="checkbox"
                              data-act="cp-jur-toggle-region"
                              data-arg="${safe(country)}"
                              ${d.regions.includes(country) ? 'checked' : ''}
                              style="width:auto"
                            />
                            <span class="cp-tree-pin-icon" style="color:var(--accent);display:inline-flex">${CP_ICONS.pin}</span>
                            <span>${safe(country)}</span>
                          </label>
                        </div>
                      `).join('')}
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card" style="padding:14px;background:var(--surface-2)">
            <b style="font-size:13px;display:block;margin-bottom:8px">Selected Jurisdictional Regions (${d.regions.length})</b>
            <div style="max-height:220px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:4px">
              ${d.regions.length ? d.regions.map(r => `
                <span class="cp-region-chip">
                  <span class="cp-chip-icon">${CP_ICONS.globe}</span>
                  <span>${safe(r)}</span>
                </span>
              `).join('') : '<small class="dim">No regions selected. Check at least one country.</small>'}
            </div>
          </div>
        </div>
      `;
    }

    // Step 4: Legal Bases
    else if (step === 4) {
      content = `
        <div class="cp-table-wrap" style="max-height:300px;overflow-y:auto">
          <table class="t cp-records-table">
            <thead>
              <tr>
                <th>Purpose</th>
                <th>Lawful Basis Assignment</th>
                <th style="text-align:center">Enabled</th>
              </tr>
            </thead>
            <tbody>
              ${state.purposes.map(p => {
                const lb = d.legalBases[p.id] || { basis: '', enabled: false };
                const isInvalid = ui.jurisdictionTried && lb.enabled && !lb.basis;
                return `
                  <tr>
                    <td style="font-weight:550">${safe(p.name)}</td>
                    <td>
                      <select
                        data-act="cp-jur-set-legal-basis"
                        data-arg="${safe(p.id)}"
                        style="${isInvalid ? 'border-color:#ef4444' : ''}"
                        aria-label="Legal basis for ${safe(p.name)}"
                      >
                        <option value="">Select Assignment</option>
                        ${LEGAL_BASIS_OPTIONS.map(opt => `
                          <option value="${opt}" ${lb.basis === opt ? 'selected' : ''}>${opt}</option>
                        `).join('')}
                      </select>
                    </td>
                    <td style="text-align:center">
                      <input
                        type="checkbox"
                        data-act="cp-jur-toggle-legal-basis"
                        data-arg="${safe(p.id)}"
                        ${lb.enabled ? 'checked' : ''}
                      />
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    const wizardBody = `
      ${errors.length ? `
        <div id="cp-jur-error" class="cp-form-error cp-error-list" role="alert" style="margin-bottom:12px">
          <b>Fix ${errors.length} item${errors.length === 1 ? '' : 's'} before saving:</b>
          <ul>${errors.map(e => `<li><button type="button" class="cp-link-btn" data-act="cp-jur-goto-step" data-arg="${e.step}">${safe(stepNames[e.step])}</button> · ${safe(e.msg)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      <div class="cp-stepper" style="margin-bottom:16px">
        ${stepNames.map((n, i) => {
          const stepErr = errors.some(e => e.step === i);
          return `
          <button type="button" class="cp-stepper-item cp-stepper-btn ${step === i ? 'active' : ''} ${step > i && !stepErr ? 'done' : ''} ${stepErr ? 'has-error' : ''}" data-act="cp-jur-goto-step" data-arg="${i}">
            <span class="cp-stepper-num">${stepErr ? '!' : step > i ? CP_ICONS.check : i + 1}</span>
            <span>${n}</span>
          </button>
        `;
        }).join('')}
      </div>
      ${content}
    `;

    runtime.modal(
      d.id ? 'Edit Jurisdiction' : 'Create Jurisdiction',
      'Step-by-step regulatory and regional policy mapper',
      wizardBody,
      `
        <button class="btn sm o" ${step > 0 ? '' : 'style="visibility:hidden"'} data-act="cp-jur-prev-step">
          <span class="cp-btn-icon">${CP_ICONS.arrowLeft}</span> Back
        </button>
        <button class="btn sm p" data-act="cp-jur-next-step">
          ${step === 4 ? (d.id ? 'Save Jurisdiction' : 'Create Jurisdiction') : `Next <span class="cp-btn-icon">${CP_ICONS.arrowRight}</span>`}
        </button>
      `,
      'drawer-wide'
    );
  }

  ACT['cp-jur-prev-step'] = () => {
    captureJurisdictionBasics();
    ui.jurisdictionStep = Math.max(0, (ui.jurisdictionStep || 0) - 1);
    renderJurisdictionWizard();
  };

  ACT['cp-jur-goto-step'] = idx => {
    captureJurisdictionBasics();
    ui.jurisdictionStep = Math.min(4, Math.max(0, Number(idx) || 0));
    renderJurisdictionWizard();
  };

  ACT['cp-jur-toggle-reg'] = reg => {
    const d = ui.jurisdictionData;
    const idx = d.regulations.indexOf(reg);
    if (idx > -1) d.regulations.splice(idx, 1);
    else d.regulations.push(reg);
    renderJurisdictionWizard();
  };

  ACT['cp-jur-toggle-all-rights'] = () => {
    const d = ui.jurisdictionData;
    if (d.rights.length === DEFAULT_RIGHTS.length) {
      d.rights = [];
    } else {
      d.rights = DEFAULT_RIGHTS.map((_, i) => i);
    }
    renderJurisdictionWizard();
  };

  ACT['cp-jur-toggle-right'] = idxStr => {
    const d = ui.jurisdictionData;
    const idx = Number(idxStr);
    const pos = d.rights.indexOf(idx);
    if (pos > -1) d.rights.splice(pos, 1);
    else d.rights.push(idx);
    renderJurisdictionWizard();
  };

  ACT['cp-jur-search-regions'] = val => {
    ui.regionSearch = val || '';
    renderJurisdictionWizard();
  };

  ACT['cp-jur-toggle-region'] = country => {
    const d = ui.jurisdictionData;
    const idx = d.regions.indexOf(country);
    if (idx > -1) d.regions.splice(idx, 1);
    else d.regions.push(country);
    renderJurisdictionWizard();
  };

  ACT['cp-jur-set-legal-basis'] = (val, el) => {
    const pId = el?.getAttribute('data-arg');
    if (!pId) return;
    const d = ui.jurisdictionData;
    if (!d.legalBases[pId]) d.legalBases[pId] = { enabled: true, basis: '' };
    d.legalBases[pId].basis = val;
  };

  ACT['cp-jur-toggle-legal-basis'] = (val, el) => {
    const pId = el?.getAttribute('data-arg');
    if (!pId) return;
    const d = ui.jurisdictionData;
    if (!d.legalBases[pId]) d.legalBases[pId] = { basis: '', enabled: false };
    d.legalBases[pId].enabled = el.checked;
    renderJurisdictionWizard();
  };

  ACT['cp-jur-next-step'] = () => {
    captureJurisdictionBasics();
    const d = ui.jurisdictionData;

    if (ui.jurisdictionStep < 4) {
      ui.jurisdictionStep++;
      renderJurisdictionWizard();
      return;
    }

    const errors = validateJurisdiction(d);
    if (errors.length) {
      ui.jurisdictionTried = true;
      ui.jurisdictionStep = errors[0].step;
      renderJurisdictionWizard();
      runtime.toast(`Fix ${errors.length} item${errors.length === 1 ? '' : 's'} before saving`);
      return;
    }

    d.updated = new Date().toISOString();
    if (d.id) {
      const existing = state.jurisdictions.find(j => j.id === d.id);
      if (existing) Object.assign(existing, d);
    } else {
      d.id = Math.random().toString(16).slice(2, 10) + '-' + d.code.slice(0, 4);
      d.created = d.updated;
      state.jurisdictions.unshift(d);
    }

    ui.jurisdictionTried = false;
    saveConsentState(state);
    runtime.closeOv();
    runtime.toast('Jurisdiction saved successfully');
    runtime.render();
  };

  // 7. Workflows Actions
  ACT['cp-workflow-search'] = val => {
    ui.workflowSearch = val || '';
    runtime.render();
  };

  ACT['cp-workflow-new'] = () => {
    ui.activeWorkflow = {
      id: '',
      name: '',
      status: 'Draft',
      nodes: [],
      edges: []
    };
    ui.connectingNodeId = null;
    ui.workflowView = 'editor';
    runtime.render();
  };

  ACT['cp-workflow-open'] = id => {
    const w = state.workflows.find(x => x.id === id);
    if (w) {
      ui.activeWorkflow = JSON.parse(JSON.stringify(w));
      ui.connectingNodeId = null;
      ui.workflowView = 'editor';
      runtime.render();
    }
  };

  ACT['cp-back-to-workflows'] = () => {
    ui.activeWorkflow = null;
    ui.connectingNodeId = null;
    ui.workflowView = 'list';
    runtime.render();
  };

  ACT['cp-workflow-delete'] = id => {
    state.workflows = state.workflows.filter(w => w.id !== id);
    saveConsentState(state);
    runtime.toast('Workflow deleted');
    runtime.render();
  };

  ACT['cp-workflow-dir'] = dir => {
    ui.workflowDir = dir;
    runtime.render();
  };

  ACT['cp-workflow-add-node'] = arg => {
    const [type, label] = arg.split('|');
    const w = ui.activeWorkflow;
    if (!w) return;

    w.nodes.push({
      id: `n_${Date.now()}_${w.nodes.length}`,
      type,
      label,
      action: '',
      conn: ''
    });
    runtime.render();
  };

  ACT['cp-workflow-delete-node'] = nodeId => {
    const w = ui.activeWorkflow;
    if (!w) return;
    w.nodes = w.nodes.filter(n => n.id !== nodeId);
    w.edges = w.edges.filter(e => e[0] !== nodeId && e[1] !== nodeId);
    if (ui.connectingNodeId === nodeId) ui.connectingNodeId = null;
    runtime.render();
  };

  ACT['cp-workflow-connect-start'] = nodeId => {
    ui.connectingNodeId = ui.connectingNodeId === nodeId ? null : nodeId;
    runtime.render();
  };

  ACT['cp-workflow-connect-end'] = targetId => {
    const w = ui.activeWorkflow;
    if (!w || !ui.connectingNodeId) return;

    const exists = w.edges.some(e => e[0] === ui.connectingNodeId && e[1] === targetId);
    if (!exists) {
      w.edges.push([ui.connectingNodeId, targetId]);
    }
    ui.connectingNodeId = null;
    runtime.render();
  };

  ACT['cp-workflow-delete-edge'] = idxStr => {
    const w = ui.activeWorkflow;
    if (!w) return;
    const idx = Number(idxStr);
    w.edges.splice(idx, 1);
    runtime.render();
  };

  ACT['cp-workflow-node-action'] = (val, el) => {
    const nodeId = el?.getAttribute('data-arg');
    const node = ui.activeWorkflow?.nodes.find(n => n.id === nodeId);
    if (node) {
      node.action = val;
      runtime.render();
    }
  };

  ACT['cp-workflow-node-conn'] = (val, el) => {
    const nodeId = el?.getAttribute('data-arg');
    const node = ui.activeWorkflow?.nodes.find(n => n.id === nodeId);
    if (node) {
      node.conn = val;
      runtime.render();
    }
  };

  ACT['cp-workflow-issues-modal'] = () => {
    const issues = calculateWorkflowIssues(ui.activeWorkflow);
    runtime.modal(
      `Workflow Validation (${issues.length} issue${issues.length === 1 ? '' : 's'})`,
      'Verification check before activation',
      `
        ${issues.length ? `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${issues.map(iss => `
              <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:6px;font-size:13px">
                <span class="cp-btn-icon" style="flex:none;margin-top:2px">${CP_ICONS.alert}</span>
                <span>${safe(iss)}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center;padding:28px 16px;color:var(--text);font-size:13.5px">
            <div style="display:inline-flex;padding:10px;border-radius:50%;background:var(--allow-bg);color:var(--allow);margin-bottom:8px">
              ${CP_ICONS.check}
            </div>
            <div style="font-weight:600;font-size:14px;color:var(--allow)">No issues detected</div>
            <p style="margin:4px 0 0;font-size:12.5px;color:var(--text-2)">Your workflow graph is fully connected and ready to save.</p>
          </div>
        `}
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  ACT['cp-jurisdiction-clear-search'] = () => {
    ui.jurisdictionSearch = '';
    runtime.render();
  };

  ACT['cp-workflow-clear-search'] = () => {
    ui.workflowSearch = '';
    runtime.render();
  };

  ACT['cp-workflow-save'] = () => {
    const w = ui.activeWorkflow;
    if (!w) return;
    if (w.name) {
      doSaveWorkflow();
    } else {
      runtime.modal(
        'Name Your Workflow',
        'Enter a title to identify this automation pipeline',
        `
          <div class="cp-form-group">
            <label class="required">Workflow Name</label>
            <input type="text" id="cp_wf_name" placeholder="e.g. Consent Synchronization Flow" />
          </div>
          <div id="cp-wf-error" class="cp-form-error"></div>
        `,
        `
          <button class="btn sm o" data-act="close">Cancel</button>
          <button class="btn sm p" data-act="cp-workflow-confirm-name">Save Workflow</button>
        `
      );
    }
  };

  ACT['cp-workflow-confirm-name'] = () => {
    const dialog = document.querySelector('.modal[role="dialog"]');
    const name = (dialog?.querySelector('#cp_wf_name')?.value || '').trim();
    if (!name) {
      const err = dialog?.querySelector('#cp-wf-error');
      if (err) err.textContent = 'A workflow name is required.';
      return;
    }
    ui.activeWorkflow.name = name;
    runtime.closeOv();
    doSaveWorkflow();
  };

  function doSaveWorkflow() {
    const w = ui.activeWorkflow;
    const nowIso = new Date().toISOString();
    const payload = {
      name: w.name,
      status: 'Active',
      nodes: w.nodes,
      edges: w.edges,
      updated: nowIso
    };

    if (w.id) {
      const existing = state.workflows.find(x => x.id === w.id);
      if (existing) Object.assign(existing, payload);
    } else {
      w.id = `w_${Date.now()}`;
      state.workflows.unshift({ id: w.id, created: nowIso, ...payload });
    }

    saveConsentState(state);
    runtime.toast('Workflow saved successfully');
    ui.workflowView = 'list';
    ui.activeWorkflow = null;
    runtime.render();
  }

  // 8. Email Templates Actions
  ACT['cp-email-set-sender'] = val => {
    state.email.sender = val;
    saveConsentState(state);
  };

  ACT['cp-email-subject'] = val => {
    state.email.subject = val;
    saveConsentState(state);
  };

  ACT['cp-email-new-sender'] = () => {
    runtime.modal(
      'Create New Email Sender',
      'Register sender identity for verification templates',
      `
        <div id="cp-sender-error" class="cp-form-error" style="margin-bottom:12px"></div>
        <div class="cp-form-group">
          <label class="required">Sender Display Name / Nickname</label>
          <input type="text" id="cp_ns_name" placeholder="e.g. Privacy Operations" />
        </div>
        <div class="cp-form-group">
          <label class="required">From Email Address</label>
          <input type="email" id="cp_ns_email" placeholder="privacy-noreply@demo-acme.test" />
        </div>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm p" data-act="cp-email-save-sender">Save Sender</button>
      `
    );
  };

  ACT['cp-email-save-sender'] = () => {
    const dialog = document.querySelector('.modal[role="dialog"]');
    const name = (dialog?.querySelector('#cp_ns_name')?.value || '').trim();
    const email = (dialog?.querySelector('#cp_ns_email')?.value || '').trim();
    const errBox = dialog?.querySelector('#cp-sender-error');

    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      if (errBox) errBox.textContent = 'A valid nickname and email address are required.';
      return;
    }

    if (state.senders.some(s => s.email.toLowerCase() === email.toLowerCase())) {
      if (errBox) errBox.textContent = 'A sender with this email address already exists.';
      return;
    }
    state.senders.push({ name, email });
    state.email.sender = email;
    saveConsentState(state);
    runtime.closeOv();
    runtime.toast('Sender created and selected');
    runtime.render();
  };

  ACT['cp-email-save'] = () => {
    const editor = document.getElementById('cp-email-body-editor');
    if (editor) state.email.body = editor.innerHTML;

    if (!state.email.sender || !state.email.subject.trim()) {
      runtime.toast('Please select a sender and enter a subject');
      return;
    }

    saveConsentState(state);
    runtime.toast('Verification email template saved');
    runtime.render();
  };

  ACT['cp-email-preview'] = () => {
    const editor = document.getElementById('cp-email-body-editor');
    const bodyHtml = (editor ? editor.innerHTML : state.email.body).replace(/\{full_name\}/g, 'Ravi Kumar');

    runtime.modal(
      `Email Preview: ${state.email.subject}`,
      `From: ${state.email.sender || 'support@demo-acme.test'}`,
      `
        <div style="background:#fff;color:#0f172a;border:1px solid var(--line);border-radius:8px;padding:20px;font-size:13.5px;line-height:1.6">
          ${bodyHtml}
        </div>
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  // 9. Implementation Actions
  ACT['cp-copy-sdk'] = () => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(CONSENT_SDK_SNIPPET).catch(() => {});
      }
    } catch (e) {}
    runtime.toast('Script copied to clipboard');
  };
}
