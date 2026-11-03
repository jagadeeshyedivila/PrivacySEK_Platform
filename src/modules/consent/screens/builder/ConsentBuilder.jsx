import { CP_ICONS } from '../../consentIcons.js';

export function createBuilderRenderer(context) {
  const {
    state,
    runtime,
    ui,
    BUILDER_STEPS,
    BUILDER_STEP_ICONS,
    BUILDER_SUBS,
    safe,
    formatDateTime,
    canEdit
  } = context;

  const SUB_TAB_ICONS = {
    'General': CP_ICONS.settings,
    'Verification': CP_ICONS.shield,
    'Branding': CP_ICONS.palette,
    'Display': CP_ICONS.layout,
    'Privacy & Legal': CP_ICONS.content,
    'Translation': CP_ICONS.language
  };

  return function renderConsentBuilder() {
    const builder = state.builder;
    const settings = builder.settings;
    const currentStep = ui.builderStep || 0;
    const currentSub = ui.builderSub || 'General';
    const isEditable = canEdit();

    function renderSwitch(key, isOn, isDisabled = false) {
      const cls = `cp-switch ${isOn ? 'on' : ''} ${isDisabled || !isEditable ? 'disabled' : ''}`;
      const act = isDisabled || !isEditable ? '' : `data-act="cp-builder-toggle-setting" data-arg="${key}"`;
      return `<span class="${cls}" ${act} role="switch" aria-checked="${isOn ? 'true' : 'false'}"></span>`;
    }

    function renderSettingCard(label, desc, key) {
      return `
        <div class="cp-toggle-card">
          <div class="cp-toggle-text">
            <b>${safe(label)}</b>
            <small>${safe(desc)}</small>
          </div>
          ${renderSwitch(key, settings[key])}
        </div>
      `;
    }

    let stepContent = '';

    // STEP 0: SETTINGS
    if (currentStep === 0) {
      let subContent = '';
      if (currentSub === 'General') {
        subContent = `
          <div class="cp-setting-grid">
            ${renderSettingCard('Show Company Watermark', 'If disabled, PrivacySEK branding will disappear from the banner.', 'watermark')}
            ${renderSettingCard('Mask IP Address', "If enabled, the user's IP address will be masked for privacy in logs and records.", 'maskIP')}
            ${renderSettingCard('Show Badge Button After Consent', 'If enabled, a privacy settings floating badge will remain on the website.', 'badge')}
            ${renderSettingCard('Enable Verification', 'If enabled, verification is required before consent is submitted.', 'verification')}
          </div>
        `;
      } else if (currentSub === 'Verification') {
        if (!settings.verification) {
          subContent = `
            <div class="cp-notice-box">
              <span class="cp-notice-icon">${CP_ICONS.alert}</span>
              <div>
                <b>Verification is currently disabled</b>
                <p>Turn on <b>Enable Verification</b> in the General settings tab to configure verification channels.</p>
              </div>
            </div>
          `;
        } else {
          subContent = `
            <p style="color:var(--text-2);margin-bottom:14px;font-size:13px">Enable verification channels for identity confirmation before consent recording.</p>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div class="card cp-channel-card">
                <div class="cp-channel-icon-wrap" style="color:var(--accent)">${CP_ICONS.mail}</div>
                <div class="cp-channel-info">
                  <b style="font-size:13.5px;color:var(--text)">Email Verification</b>
                  <small style="color:var(--text-2);display:block;margin-top:2px">Send an automated verification link or code to the user's email address.</small>
                </div>
                ${renderSwitch('emailVerify', settings.emailVerify)}
              </div>

              <div class="card cp-channel-card">
                <div class="cp-channel-icon-wrap" style="color:#25d366">${CP_ICONS.message}</div>
                <div class="cp-channel-info">
                  <b style="font-size:13.5px;color:var(--text)">WhatsApp Verification</b>
                  <small style="color:var(--text-2);display:block;margin-top:2px">Verify phone numbers through a WhatsApp template message.</small>
                </div>
                ${renderSwitch('whatsappVerify', settings.whatsappVerify)}
              </div>

              <div class="card cp-channel-card">
                <div class="cp-channel-icon-wrap" style="color:#3b82f6">${CP_ICONS.phone}</div>
                <div class="cp-channel-info">
                  <b style="font-size:13.5px;color:var(--text)">SMS Verification</b>
                  <small style="color:var(--text-2);display:block;margin-top:2px">Deliver an OTP token via SMS before logging the consent choice.</small>
                  ${settings.smsVerify ? `
                    <div style="margin-top:8px">
                      <a href="javascript:void(0)" class="cp-link-btn" data-act="cp-open-ccodes">
                        <span class="cp-btn-icon">${CP_ICONS.globe}</span> Configure Country Codes (${settings.countryCodes} selected)
                      </a>
                    </div>
                  ` : ''}
                </div>
                ${renderSwitch('smsVerify', settings.smsVerify)}
              </div>
            </div>
          `;
        }
      } else if (currentSub === 'Branding') {
        subContent = `
          <div class="cp-grid-2">
            <div class="cp-form-group">
              <label>Brand Primary Color</label>
              <div style="display:flex;align-items:center;gap:10px">
                <input
                  type="color"
                  data-input-act="cp-builder-input"
                  data-arg="settings:brandColor"
                  value="${safe(settings.brandColor || '#1f8a70')}"
                  ${isEditable ? '' : 'disabled'}
                  style="width:50px;height:38px;padding:2px;cursor:pointer;border-radius:6px;border:1px solid var(--line)"
                />
                <span class="cp-code-pill">${safe(settings.brandColor)}</span>
              </div>
            </div>
            <div class="cp-form-group">
              <label>Company Logo</label>
              <div style="display:flex;align-items:center;gap:10px">
                <button class="btn sm o" data-act="cp-upload-logo-sim">Upload Logo</button>
                <span class="dim" style="font-size:12.5px">${safe(settings.logoName || '(none)')}</span>
              </div>
            </div>
          </div>
        `;
      } else if (currentSub === 'Display') {
        subContent = `
          <div class="cp-grid-2">
            <div class="card" style="padding:16px">
              <b style="font-size:13.5px">Modal Dialog Size</b>
              <small style="color:var(--text-2);display:block;margin:4px 0 12px">Select default presentation size for the consent dialog.</small>
              <div style="display:flex;gap:8px">
                ${['Full Screen', 'Modal'].map(opt => `
                  <button
                    class="cp-opt-pill ${settings.modalSize === opt ? 'active' : ''}"
                    data-act="cp-builder-opt"
                    data-arg="settings:modalSize:${opt}"
                    ${isEditable ? '' : 'disabled'}
                  >
                    ${opt}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="card" style="padding:16px">
              <b style="font-size:13.5px">Default Application Route</b>
              <small style="color:var(--text-2);display:block;margin:4px 0 12px">Choose which view loads initially when opening the widget.</small>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${['Overview Page', 'Consent Preference Page'].map(opt => `
                  <button
                    class="cp-opt-pill ${settings.defaultRoute === opt ? 'active' : ''}"
                    data-act="cp-builder-opt"
                    data-arg="settings:defaultRoute:${opt}"
                    ${isEditable ? '' : 'disabled'}
                  >
                    ${opt}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      } else if (currentSub === 'Privacy & Legal') {
        subContent = `
          <div class="cp-grid-2">
            <div class="cp-form-group">
              <label>Privacy Policy URL</label>
              <input
                type="url"
                value="${safe(settings.privacyUrl)}"
                data-input-act="cp-builder-input"
                data-arg="settings:privacyUrl"
                placeholder="https://example.com/privacy"
                ${isEditable ? '' : 'disabled'}
              />
            </div>
            <div class="cp-form-group">
              <label>Terms of Service URL</label>
              <input
                type="url"
                value="${safe(settings.termsUrl)}"
                data-input-act="cp-builder-input"
                data-arg="settings:termsUrl"
                placeholder="https://example.com/terms"
                ${isEditable ? '' : 'disabled'}
              />
            </div>
          </div>
        `;
      } else if (currentSub === 'Translation') {
        subContent = `
          <div style="max-width:540px">
            ${renderSettingCard(
              'Auto Translation',
              'Automatically suggest translated strings for newly added languages based on English source content.',
              'autoTranslate'
            )}
          </div>
        `;
      }

      stepContent = `
        <div class="cp-sub-tabs">
          ${BUILDER_SUBS.map(sub => `
            <button class="cp-sub-tab ${currentSub === sub ? 'active' : ''}" data-act="cp-builder-set-sub" data-arg="${sub}">
              <span class="cp-tab-icon">${SUB_TAB_ICONS[sub] || ''}</span>
              <span>${sub}</span>
            </button>
          `).join('')}
        </div>
        ${subContent}
      `;
    }

    // STEP 1: LANGUAGE
    else if (currentStep === 1) {
      const q = (ui.builderLanguageSearch || '').trim().toLowerCase();
      const langs = state.languages.filter(l => !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));

      stepContent = `
        <div class="cp-notice-box" style="margin-bottom:16px">
          <span class="cp-notice-icon">${CP_ICONS.language}</span>
          <div>
            <b>Auto Translation is ${settings.autoTranslate ? 'Enabled' : 'Disabled'}</b>
            <p style="margin:2px 0 0;font-size:12.5px;color:var(--text-2)">
              Selected languages will appear in the customer-facing language picker with localized labels.
            </p>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px;flex-wrap:wrap">
          <b style="font-size:14px">Manage Supported Languages</b>
          <div class="cp-input-with-icon" style="width:220px">
            <span class="cp-input-icon">${CP_ICONS.search}</span>
            <input
              type="search"
              class="table-search-input"
              placeholder="Search language..."
              value="${safe(ui.builderLanguageSearch || '')}"
              data-input-act="cp-builder-lang-search"
              style="width:100%;height:32px;padding-left:28px"
            />
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden">
          <div class="cp-table-wrap">
            <table class="t cp-records-table">
              <colgroup>
                <col style="width:48px;" />
                <col style="width:42%;" />
                <col style="width:28%;" />
                <col style="width:22%;" />
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>Language Name</th>
                  <th>Locale Code</th>
                  <th style="text-align:right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${langs.map(l => {
                  const isSelected = builder.languages.includes(l.code);
                  const isDefaultEn = l.code === 'en-US';
                  return `
                    <tr>
                      <td>
                        <input
                          type="checkbox"
                          ${isSelected ? 'checked' : ''}
                          ${isDefaultEn ? 'disabled checked' : ''}
                          data-act="cp-builder-toggle-lang"
                          data-arg="${safe(l.code)}"
                          aria-label="Enable ${safe(l.name)}"
                        />
                      </td>
                      <td style="font-weight:550">${safe(l.name)}</td>
                      <td><span class="cp-code-pill">${safe(l.code)}</span></td>
                      <td style="text-align:right;white-space:nowrap">
                        <button class="btn sm o" data-act="cp-toast" data-arg="Editing translations for ${safe(l.name)}" style="padding:3px 8px;font-size:12px;margin-right:6px" title="Edit text">
                          <span class="cp-btn-icon">${CP_ICONS.edit}</span> Edit
                        </button>
                        <button class="btn sm o" data-act="cp-toast" data-arg="Simulated auto-translation for ${safe(l.name)}" style="padding:3px 8px;font-size:12px" title="Auto-translate">
                          <span class="cp-btn-icon">${CP_ICONS.refresh}</span> Sync
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // STEP 2: CONTENT
    else if (currentStep === 2) {
      const c = builder.content;
      stepContent = `
        <div class="cp-accordion active">
          <div class="cp-accordion-header">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="cp-btn-icon">${CP_ICONS.content}</span>
              <span>Manage Preference Content Configuration</span>
            </div>
            <span class="cp-accordion-arrow">${CP_ICONS.chevronUp}</span>
          </div>
          <div class="cp-accordion-body">
            <div class="cp-grid-2">
              <div class="cp-form-group">
                <label>Purpose Title</label>
                <input
                  type="text"
                  value="${safe(c.purposeTitle)}"
                  data-input-act="cp-builder-input"
                  data-arg="content:purposeTitle"
                  ${isEditable ? '' : 'disabled'}
                />
              </div>

              <div class="cp-form-group">
                <label>Preference Title</label>
                <input
                  type="text"
                  value="${safe(c.preferenceTitle)}"
                  data-input-act="cp-builder-input"
                  data-arg="content:preferenceTitle"
                  ${isEditable ? '' : 'disabled'}
                />
              </div>

              <div class="cp-form-group">
                <label>Reject All Button Label</label>
                <input
                  type="text"
                  value="${safe(c.reject)}"
                  data-input-act="cp-builder-input"
                  data-arg="content:reject"
                  ${isEditable ? '' : 'disabled'}
                />
              </div>

              <div class="cp-form-group">
                <label>Accept All Button Label</label>
                <input
                  type="text"
                  value="${safe(c.accept)}"
                  data-input-act="cp-builder-input"
                  data-arg="content:accept"
                  ${isEditable ? '' : 'disabled'}
                />
              </div>

              <div class="cp-form-group">
                <label>Save Choices Button Label</label>
                <input
                  type="text"
                  value="${safe(c.save)}"
                  data-input-act="cp-builder-input"
                  data-arg="content:save"
                  ${isEditable ? '' : 'disabled'}
                />
              </div>

              <div class="cp-form-group">
                <label>Email Verify Button Label</label>
                <input
                  type="text"
                  value="${safe(c.verifyBtn)}"
                  data-input-act="cp-builder-input"
                  data-arg="content:verifyBtn"
                  ${isEditable ? '' : 'disabled'}
                />
              </div>
            </div>

            <div class="cp-form-group">
              <label>Email Verify Title Prompt</label>
              <input
                type="text"
                value="${safe(c.verifyTitle)}"
                data-input-act="cp-builder-input"
                data-arg="content:verifyTitle"
                ${isEditable ? '' : 'disabled'}
              />
            </div>
          </div>
        </div>
      `;
    }

    // STEP 3: LAYOUT
    else if (currentStep === 3) {
      stepContent = `
        <h4 style="margin:0 0 12px;font-size:14px">Choose Visual Theme</h4>
        <div class="cp-theme-selector">
          <div
            class="cp-theme-card ${builder.theme === 'Light Theme' ? 'active' : ''}"
            data-act="cp-builder-set-theme"
            data-arg="Light Theme"
          >
            <div class="cp-theme-header">
              <span class="cp-theme-icon" style="color:#f59e0b">${CP_ICONS.sun}</span>
              <b>Light Theme</b>
            </div>
            <div class="cp-theme-preview" style="background:#f8fafc;color:#0f172a;border-color:#e2e8f0">
              <span style="font-size:11px;font-weight:600">Light Interface</span>
            </div>
          </div>

          <div
            class="cp-theme-card ${builder.theme === 'Dark Theme' ? 'active' : ''}"
            data-act="cp-builder-set-theme"
            data-arg="Dark Theme"
          >
            <div class="cp-theme-header">
              <span class="cp-theme-icon" style="color:#818cf8">${CP_ICONS.moon}</span>
              <b>Dark Theme</b>
            </div>
            <div class="cp-theme-preview" style="background:#0f172a;color:#f8fafc;border-color:#334155">
              <span style="font-size:11px;font-weight:600">Dark Interface</span>
            </div>
          </div>

          <div
            class="cp-theme-card ${builder.theme === 'Custom Colors' ? 'active' : ''}"
            data-act="cp-builder-set-theme"
            data-arg="Custom Colors"
          >
            <div class="cp-theme-header">
              <span class="cp-theme-icon" style="color:var(--accent)">${CP_ICONS.palette}</span>
              <b>Custom Colors</b>
            </div>
            <div class="cp-theme-preview" style="background:var(--surface)">
              ${(builder.customColors || ['#2f6fe4', '#9b51e0', '#e83e8c']).map((col, idx) => `
                <input
                  type="color"
                  value="${safe(col)}"
                  data-input-act="cp-builder-custom-color"
                  data-arg="${idx}"
                  style="width:24px;height:24px;padding:0;border:none;border-radius:50%;cursor:pointer"
                  title="Color ${idx + 1}"
                />
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // STEP 4: PURPOSES
    else if (currentStep === 4) {
      const enabledPurposes = state.purposes.filter(p => p.status === 'Enabled');
      stepContent = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;flex-wrap:wrap">
          <span style="color:var(--text-2);font-size:13px">
            Configure purposes displayed in the consent preference center (${enabledPurposes.length} active).
          </span>
          <button class="btn sm p" data-act="cp-open-purposes-modal">
            <span class="cp-btn-icon">${CP_ICONS.plus}</span> Configure Purposes
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          ${enabledPurposes.map(p => {
            const isOpen = Boolean(ui.openAccordions[p.id]);
            return `
              <div class="cp-accordion ${isOpen ? 'active' : ''}">
                <button type="button" class="cp-accordion-header" data-act="cp-builder-toggle-accordion" data-arg="${safe(p.id)}" aria-expanded="${isOpen}" aria-controls="cp-acc-${safe(p.id)}">
                  <span style="font-weight:600">${safe(p.name)}</span>
                  <span class="cp-accordion-arrow">${isOpen ? CP_ICONS.chevronUp : CP_ICONS.chevronDown}</span>
                </button>
                ${isOpen ? `
                  <div class="cp-accordion-body" id="cp-acc-${safe(p.id)}">
                    <b style="color:var(--text);display:block;margin-bottom:4px">Description</b>
                    ${safe(p.description)}
                    <div style="margin-top:10px;font-size:11.5px;color:var(--text-2);display:flex;gap:12px;flex-wrap:wrap">
                      <span>Category: <b style="color:var(--text)">${safe(p.category)}</b></span>
                      <span>Subject: <b style="color:var(--text)">${safe(p.subject)}</b></span>
                      <span>Validity: <b style="color:var(--text)">${safe(p.validity)} days</b></span>
                      <span>Essential: <b style="color:var(--text)">${p.essential ? 'Yes' : 'No'}</b></span>
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // STEP 5: PREFERENCES
    else if (currentStep === 5) {
      const enabledPrefs = state.preferences.filter(p => p.status === 'Enabled');
      stepContent = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:10px;flex-wrap:wrap">
          <span style="color:var(--text-2);font-size:13px">
            Configure communication channel preferences for customer opt-ins (${enabledPrefs.length} active).
          </span>
          <button class="btn sm p" data-act="cp-open-prefs-modal">
            <span class="cp-btn-icon">${CP_ICONS.plus}</span> Configure Preferences
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          ${enabledPrefs.map(p => {
            const isOpen = Boolean(ui.openAccordions[p.id]);
            return `
              <div class="cp-accordion ${isOpen ? 'active' : ''}">
                <button type="button" class="cp-accordion-header" data-act="cp-builder-toggle-accordion" data-arg="${safe(p.id)}" aria-expanded="${isOpen}" aria-controls="cp-acc-${safe(p.id)}">
                  <span style="font-weight:600">${safe(p.name)}</span>
                  <span class="cp-accordion-arrow">${isOpen ? CP_ICONS.chevronUp : CP_ICONS.chevronDown}</span>
                </button>
                ${isOpen ? `
                  <div class="cp-accordion-body" id="cp-acc-${safe(p.id)}">
                    <p style="margin-bottom:8px">${safe(p.description)}</p>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      ${p.channels.map(ch => `<span class="cp-region-chip"><span class="cp-chip-icon">${CP_ICONS.check}</span> ${safe(ch)}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // STEP 6: SAVE AND PUBLISH
    else if (currentStep === 6) {
      stepContent = `
        <div class="card" style="background:var(--surface-2);padding:18px;margin-bottom:18px">
          <h4 style="margin:0 0 12px;font-size:14px">Preference Configuration Summary</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
            <div>Enabled Languages: <b>${builder.languages.length}</b></div>
            <div>Active Purposes: <b>${state.purposes.filter(p => p.status === 'Enabled').length}</b></div>
            <div>Active Preferences: <b>${state.preferences.filter(p => p.status === 'Enabled').length}</b></div>
            <div>Selected Theme: <b>${safe(builder.theme)}</b></div>
            <div>Verification: <b>${settings.verification ? 'Enabled' : 'Disabled'}</b></div>
            <div>Default Route: <b>${safe(settings.defaultRoute)}</b></div>
            <div>Publication Status: ${builder.dirty ? '<span class="cp-badge b-Draft">Unpublished changes</span>' : '<span class="cp-badge b-Active">Published</span>'}</div>
            <div>Last Published: <b>${safe(formatDateTime(builder.lastPublished))}</b></div>
          </div>
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn sm p" ${isEditable ? '' : 'disabled'} data-act="cp-builder-publish-modal">
            <span class="cp-btn-icon">${CP_ICONS.publish}</span> Publish Preference Center
          </button>
          <button class="btn sm o" data-act="cp-builder-preview">
            <span class="cp-btn-icon">${CP_ICONS.eye}</span> Preview Live Banner
          </button>
        </div>
      `;
    }

    // Step Tree on the left
    const tree = `
      <div class="cp-step-tree">
        <div class="cp-tree-title">Configuration Steps</div>
        ${BUILDER_STEPS.map((s, idx) => {
          const isActive = currentStep === idx;
          const isDone = currentStep > idx;
          return `
            <button class="cp-tree-node ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-act="cp-builder-set-step" data-arg="${idx}">
              <span class="cp-tree-icon">${BUILDER_STEP_ICONS[idx]}</span>
              <span class="cp-tree-text">${s}</span>
              ${isDone ? `<span class="cp-tree-done">${CP_ICONS.check}</span>` : ''}
            </button>
            ${idx === 0 && currentStep === 0 ? `
              <div style="display:flex;flex-direction:column;margin-bottom:6px">
                ${BUILDER_SUBS.map(sub => `
                  <button class="cp-tree-sub ${currentSub === sub ? 'active' : ''}" data-act="cp-builder-set-sub" data-arg="${sub}">
                    ${sub}
                  </button>
                `).join('')}
              </div>
            ` : ''}
            ${idx === 4 && currentStep === 4 ? `
              <button class="cp-tree-sub" data-act="cp-open-purposes-modal">
                <span class="cp-tree-sub-icon">${CP_ICONS.purposes}</span> Manage Purposes
              </button>
            ` : ''}
            ${idx === 5 && currentStep === 5 ? `
              <button class="cp-tree-sub" data-act="cp-open-prefs-modal">
                <span class="cp-tree-sub-icon">${CP_ICONS.preferences}</span> Manage Preferences
              </button>
            ` : ''}
          `;
        }).join('')}
      </div>
    `;

    return `
      <div class="cp-header-row">
        <h2 class="cp-header-title">Preference Build Manager</h2>
        <div class="cp-header-controls">
          <a href="javascript:void(0)" class="cp-link-btn" data-act="cp-open-history" style="font-size:13px;font-weight:600;margin-right:6px">
            <span class="cp-btn-icon">${CP_ICONS.history}</span> Publish History
          </a>
          <button class="btn sm o" ${isEditable ? '' : 'disabled title="Read-only mode"'} data-act="cp-builder-save">
            <span class="cp-btn-icon">${CP_ICONS.publish}</span> Save Draft
          </button>
          <button class="btn sm p" ${isEditable ? '' : 'disabled title="Read-only mode"'} data-act="cp-builder-publish-modal">
            <span class="cp-btn-icon">${CP_ICONS.check}</span> Publish
          </button>
          <button class="btn sm o" data-act="cp-builder-preview">
            <span class="cp-btn-icon">${CP_ICONS.eye}</span> Preview
          </button>
        </div>
      </div>

      <div class="cp-builder-layout">
        ${tree}

        <div class="card" style="flex:1;min-width:0;padding:20px">
          <!-- Stepper header -->
          <div class="cp-stepper">
            ${BUILDER_STEPS.map((s, idx) => {
              const isActive = currentStep === idx;
              const isDone = currentStep > idx;
              return `
                <div class="cp-stepper-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-act="cp-builder-set-step" data-arg="${idx}">
                  <span class="cp-stepper-num">${isDone ? CP_ICONS.check : idx + 1}</span>
                  <span>${s}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Active Step Body -->
          ${stepContent}

          <!-- Back / Next controls -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--line-2)">
            <button class="btn sm o" ${currentStep > 0 ? '' : 'style="visibility:hidden"'} data-act="cp-builder-set-step" data-arg="${currentStep - 1}">
              <span class="cp-btn-icon">${CP_ICONS.arrowLeft}</span> Back
            </button>
            ${currentStep < 6 ? `
              <button class="btn sm p" data-act="cp-builder-set-step" data-arg="${currentStep + 1}">
                Next <span class="cp-btn-icon">${CP_ICONS.arrowRight}</span>
              </button>
            ` : '<span></span>'}
          </div>
        </div>
      </div>
    `;
  };
}
