export function createBannerSectionsRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

function renderConfigSectionForm() {
  const draft = state.draft;
  const activeReg = ui.region || "EEA & UK";
  const regConfig = draft.regions[activeReg] || draft.regions["EEA & UK"];
  const availableCountries = REGION_COUNTRY_OPTIONS[activeReg] || [];

  return `
    <div class="cc-form-group">
      <div class="cc-form-group-title">Enable Regulations</div>
      <div style="display:grid;gap:8px;">
        ${REGIONS.map(reg => {
          const isEnabled = draft.regions[reg]?.enabled !== false;
          return `<div class="cc-toggle-row">
            <div class="cc-toggle-info">
              <strong>${safe(reg)}</strong>
              <small>${reg === "EEA & UK" ? "GDPR & UK GDPR Compliance Framework" : reg === "USA" ? "CCPA / CPRA & US State Privacy Laws" : reg === "India" ? "Digital Personal Data Protection Act (DPDPA 2023)" : "Standard Worldwide Consent Fallback"}</small>
            </div>
            <button class="cc-switch" type="button" role="switch" aria-checked="${isEnabled}" data-act="cc-toggle-region-enabled" data-arg="${reg}"></button>
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">
        <span>${safe(activeReg)} Regional Settings</span>
        <span class="cc-badge info">${safe(regConfig.regulation || "Custom")}</span>
      </div>

      <div class="field">
        <label>Target Countries / Jurisdictions</label>
        <div class="cc-chips-container">
          ${(regConfig.targetCountries || []).map(country => `
            <span class="cc-chip">
              <span>${safe(country)}</span>
              <button class="cc-chip-remove" data-act="cc-remove-country" data-arg="${safe(country)}" title="Remove ${safe(country)}">×</button>
            </span>
          `).join("")}
        </div>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <select id="cc-add-country-select" style="flex:1;">
            <option value="">+ Add country to ${safe(activeReg)}...</option>
            ${availableCountries.filter(c => !(regConfig.targetCountries || []).includes(c)).map(c => `<option value="${safe(c)}">${safe(c)}</option>`).join("")}
          </select>
          <button class="btn sm" data-act="cc-add-country-btn">Add</button>
        </div>
      </div>

      <div style="display:grid;gap:8px;margin-top:4px;">
        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Enable IAB TCF Framework</strong>
            <small>Transmits IAB Transparency & Consent Framework strings to participating vendors</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(regConfig.enableIab)}" data-act="cc-toggle-reg-iab"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Google Vendors & Additional Consent</strong>
            <small>Integrates Google Certified CMP and AC Mode for Google Ad Manager</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(regConfig.googleVendors)}" data-act="cc-toggle-reg-google"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Worldwide Enforcement / Everywhere</strong>
            <small>Apply this regulation's strict standards to visitors without geo-location resolution</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(regConfig.gdprEverywhere)}" data-act="cc-toggle-reg-everywhere"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Show Privacy Information Tab on Banner</strong>
            <small>Displays a direct link to full privacy notices and rights information</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(regConfig.showPrivacyTab)}" data-act="cc-toggle-reg-privtab"></button>
        </div>
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Advanced Features</div>

      <div class="g g2">
        <div class="field">
          <label for="cc-cfg-default-reg">Default Regulation Preset</label>
          <select id="cc-cfg-default-reg" data-act="cc-change-default-reg">
            <option value="GDPR" ${draft.config.defaultRegulation === "GDPR" ? "selected" : ""}>GDPR (EEA & UK)</option>
            <option value="CCPA" ${draft.config.defaultRegulation === "CCPA" ? "selected" : ""}>CCPA / CPRA (USA)</option>
            <option value="DPDPA" ${draft.config.defaultRegulation === "DPDPA" ? "selected" : ""}>DPDPA (India)</option>
            <option value="Global" ${draft.config.defaultRegulation === "Global" ? "selected" : ""}>Global (Worldwide)</option>
          </select>
        </div>
        <div class="field">
          <label for="cc-cfg-cookie-blocking">Cookie Blocking Mode</label>
          <select id="cc-cfg-cookie-blocking" data-act="cc-change-cookie-blocking">
            <option value="Automatic" ${draft.config.cookieBlocking === "Automatic" ? "selected" : ""}>Automatic Blocking (Recommended)</option>
            <option value="Assisted" ${draft.config.cookieBlocking === "Assisted" ? "selected" : ""}>Assisted / Tag Manager</option>
            <option value="Disabled" ${draft.config.cookieBlocking === "Disabled" ? "selected" : ""}>Disabled / Advisory Only</option>
          </select>
        </div>
      </div>

      <div style="display:grid;gap:8px;">
        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Enable GPP (Global Privacy Platform)</strong>
            <small>Broadcasts multi-jurisdiction privacy signals via standard IAB GPP API</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(draft.config.enableGpp)}" data-act="cc-toggle-gpp"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Show PrivacySEK Watermark</strong>
            <small>Displays "Protected by PrivacySEK" badge on banner and preference modal</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(draft.config.showWatermark)}" data-act="cc-toggle-watermark"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Show Disabled / Reject All Button</strong>
            <small>Offers an explicit one-click button to reject all non-essential cookies</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(draft.config.showDisabledButton)}" data-act="cc-toggle-disabled-btn"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Show Close ("X") Button on Banner</strong>
            <small>Allows visitors to dismiss banner without submitting consent choices</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(draft.config.showCloseButton)}" data-act="cc-toggle-close-btn"></button>
        </div>
      </div>

      <div class="g g2" style="margin-top:6px;">
        <div class="field">
          <label for="cc-cfg-zindex">Banner Z-Index</label>
          <input id="cc-cfg-zindex" type="number" value="${draft.config.zIndex || 9999}" data-input-act="cc-input-zindex">
        </div>
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Consent Mode Integrations</div>

      <div style="display:grid;gap:8px;">
        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Enable Google Consent Mode v2</strong>
            <small>Automates signals for ad_storage, analytics_storage, ad_user_data, and ad_personalization</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(draft.config.googleConsentMode)}" data-act="cc-toggle-gcm"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Enable Microsoft UET Consent Mode</strong>
            <small>Transmits Bing Ads and Clarity consent signals based on visitor choice</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(draft.config.microsoftUetConsent)}" data-act="cc-toggle-uet"></button>
        </div>
      </div>
    </div>
  `;
}

/* 3.2 LANGUAGE SECTION (Multiple selection, not single default) */

function renderLanguageSectionForm() {
  const draft = state.draft;
  const enabledLangs = new Set(draft.enabledLanguages || []);
  const currentEdit = draft.currentEditLanguage || "English (United States)";

  return `
    <div class="cc-form-group">
      <div class="cc-form-group-title">
        <span>Manage Supported Languages</span>
        <span class="cc-badge info">${enabledLangs.size} Active Languages</span>
      </div>
      <p class="dim" style="font-size:12px;margin:0 0 8px;">
        Select multiple languages supported by your banner. Visitors will receive the appropriate language automatically based on browser preferences.
      </p>

      <div class="cc-language-grid">
        ${ALL_LANGUAGES.map(lang => {
          const isEnabled = enabledLangs.has(lang.name);
          return `<div class="cc-language-card ${isEnabled ? "enabled" : ""}" data-act="cc-toggle-lang-select" data-arg="${safe(lang.name)}">
            <div class="cc-language-info">
              <span class="cc-language-name">${safe(lang.name)}</span>
              <span class="cc-language-native">${safe(lang.native)}</span>
            </div>
            <input type="checkbox" ${isEnabled ? "checked" : ""} style="pointer-events:none;">
          </div>`;
        }).join("")}
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Preview & Customize Translations</div>
      <div class="field">
        <label for="cc-lang-edit-select">Select Language to Preview & Edit</label>
        <select id="cc-lang-edit-select" data-act="cc-change-edit-lang">
          ${draft.enabledLanguages.map(l => `<option value="${safe(l)}" ${l === currentEdit ? "selected" : ""}>${safe(l)}</option>`).join("")}
        </select>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);padding:10px 14px;border-radius:8px;border:1px solid var(--line);">
        <div>
          <strong style="font-size:12.5px;">Synchronize Translations</strong>
          <div style="font-size:11.5px;color:var(--text-3);">Populate banner and preference center text with vetted multilingual translations</div>
        </div>
        <button class="btn sm" data-act="cc-apply-lang-strings">Apply to Draft</button>
      </div>
    </div>
  `;
}

/* 3.3 CONTENT SECTION */

function renderContentSectionForm() {
  const draft = state.draft;
  const sub = ui.contentSub || "banner";
  const currentEditLang = draft.currentEditLanguage || "English (United States)";

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div class="cc-config-view-toggle">
        <button class="cc-config-view-toggle-btn ${sub === "banner" ? "active" : ""}" data-act="cc-set-content-sub" data-arg="banner">
          Banner Notice
        </button>
        <button class="cc-config-view-toggle-btn ${sub === "preference" ? "active" : ""}" data-act="cc-set-content-sub" data-arg="preference">
          Preference Center
        </button>
      </div>
      <div class="badge info" style="font-size:11px;">Editing: ${safe(currentEditLang)}</div>
    </div>

    ${sub === "banner" ? `
      <div class="cc-form-group">
        <div class="field">
          <label for="cc-content-title">Cookie Notice Title</label>
          <input id="cc-content-title" type="text" value="${safe(draft.title)}" data-input-act="cc-input-title">
        </div>

        <div class="field">
          <label for="cc-content-desc">Cookie Notice Description</label>
          <textarea id="cc-content-desc" rows="4" data-input-act="cc-input-desc">${safe(draft.description)}</textarea>
        </div>

        <div class="g g2">
          <div class="field">
            <label for="cc-content-privtext">Privacy Link Label</label>
            <input id="cc-content-privtext" type="text" value="${safe(draft.privacyText)}" data-input-act="cc-input-privtext">
          </div>
          <div class="field">
            <label for="cc-content-privurl">Privacy Policy URL</label>
            <input id="cc-content-privurl" type="text" value="${safe(draft.privacyUrl)}" data-input-act="cc-input-privurl">
          </div>
        </div>

        <div class="g g3">
          <div class="field">
            <label for="cc-content-accept">Accept All Label</label>
            <input id="cc-content-accept" type="text" value="${safe(draft.acceptLabel)}" data-input-act="cc-input-accept">
          </div>
          <div class="field">
            <label for="cc-content-reject">Disable All Label</label>
            <input id="cc-content-reject" type="text" value="${safe(draft.rejectLabel)}" data-input-act="cc-input-reject">
          </div>
          <div class="field">
            <label for="cc-content-customize">Customize / Settings Label</label>
            <input id="cc-content-customize" type="text" value="${safe(draft.customizeLabel)}" data-input-act="cc-input-customize">
          </div>
        </div>
      </div>
    ` : `
      <div class="cc-form-group">
        <div class="field">
          <label for="cc-pref-title">Preference Center Title</label>
          <input id="cc-pref-title" type="text" value="${safe(draft.preference.title)}" data-input-act="cc-input-pref-title">
        </div>

        <div class="field">
          <label for="cc-pref-desc">Preference Center Description</label>
          <textarea id="cc-pref-desc" rows="4" data-input-act="cc-input-pref-desc">${safe(draft.preference.description)}</textarea>
        </div>

        <div class="g g3">
          <div class="field">
            <label for="cc-pref-save">Save Preferences Label</label>
            <input id="cc-pref-save" type="text" value="${safe(draft.preference.saveLabel)}" data-input-act="cc-input-pref-save">
          </div>
          <div class="field">
            <label for="cc-pref-reject">Reject All Label</label>
            <input id="cc-pref-reject" type="text" value="${safe(draft.preference.rejectLabel)}" data-input-act="cc-input-pref-reject">
          </div>
          <div class="field">
            <label for="cc-pref-vendors">Vendor List Link Label</label>
            <input id="cc-pref-vendors" type="text" value="${safe(draft.preference.vendorListText)}" data-input-act="cc-input-pref-vendorlink">
          </div>
        </div>
      </div>
    `}
  `;
}

/* 3.4 LAYOUT SECTION */

function renderLayoutSectionForm() {
  const draft = state.draft;
  const currentLayout = draft.layout || "bottom-bar";
  const currentPrefLayout = draft.preference.layout || "modal";
  const currentTheme = draft.theme || "dark";
  const colors = ["#14B8A6", "#06B6D4", "#6366F1", "#3B82F6", "#F59E0B", "#F43F5E", "#10B981"];

  return `
    <div class="cc-form-group">
      <div class="cc-form-group-title">Banner Display Format</div>
      <div class="cc-layout-selector">
        <div class="cc-layout-card ${currentLayout === "bottom-bar" ? "selected" : ""}" data-act="cc-set-layout" data-arg="bottom-bar">
          <div class="cc-layout-card-header">
            <span>Bottom Bar</span>
            <input type="radio" name="layout" ${currentLayout === "bottom-bar" ? "checked" : ""}>
          </div>
          <div class="cc-layout-card-graphic">
            <div class="cc-layout-mock-bar-bottom"></div>
          </div>
        </div>

        <div class="cc-layout-card ${currentLayout === "top-bar" ? "selected" : ""}" data-act="cc-set-layout" data-arg="top-bar">
          <div class="cc-layout-card-header">
            <span>Top Bar</span>
            <input type="radio" name="layout" ${currentLayout === "top-bar" ? "checked" : ""}>
          </div>
          <div class="cc-layout-card-graphic">
            <div class="cc-layout-mock-bar-top"></div>
          </div>
        </div>

        <div class="cc-layout-card ${currentLayout === "modal" ? "selected" : ""}" data-act="cc-set-layout" data-arg="modal">
          <div class="cc-layout-card-header">
            <span>Center Modal</span>
            <input type="radio" name="layout" ${currentLayout === "modal" ? "checked" : ""}>
          </div>
          <div class="cc-layout-card-graphic">
            <div class="cc-layout-mock-modal"></div>
          </div>
        </div>

        <div class="cc-layout-card ${currentLayout === "corner-card" ? "selected" : ""}" data-act="cc-set-layout" data-arg="corner-card">
          <div class="cc-layout-card-header">
            <span>Corner Card</span>
            <input type="radio" name="layout" ${currentLayout === "corner-card" ? "checked" : ""}>
          </div>
          <div class="cc-layout-card-graphic">
            <div class="cc-layout-mock-corner"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Preference Center Layout</div>
      <div class="g g3">
        <button class="btn ${currentPrefLayout === "modal" ? "t" : ""}" data-act="cc-set-pref-layout" data-arg="modal">
          Modal Dialog
        </button>
        <button class="btn ${currentPrefLayout === "drawer" ? "t" : ""}" data-act="cc-set-pref-layout" data-arg="drawer">
          Slide Drawer
        </button>
        <button class="btn ${currentPrefLayout === "accordion" ? "t" : ""}" data-act="cc-set-pref-layout" data-arg="accordion">
          Accordion View
        </button>
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Color Theme & Accents</div>

      <div class="g g2">
        <div class="field">
          <label>Theme Mode</label>
          <div style="display:flex;gap:8px;">
            <button class="btn ${currentTheme === "dark" ? "t" : ""}" style="flex:1;" data-act="cc-set-theme" data-arg="dark">Dark</button>
            <button class="btn ${currentTheme === "light" ? "t" : ""}" style="flex:1;" data-act="cc-set-theme" data-arg="light">Light</button>
          </div>
        </div>

        <div class="field">
          <label>Corner Radius</label>
          <select id="cc-radius-select" data-act="cc-change-radius">
            <option value="0px" ${draft.borderRadius === "0px" ? "selected" : ""}>Sharp (0px)</option>
            <option value="8px" ${draft.borderRadius === "8px" ? "selected" : ""}>Rounded (8px)</option>
            <option value="12px" ${draft.borderRadius === "12px" ? "selected" : ""}>Smooth (12px)</option>
            <option value="24px" ${draft.borderRadius === "24px" ? "selected" : ""}>Pill (24px)</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label>Primary Accent Color</label>
        <div class="cc-color-palette">
          ${colors.map(color => `
            <div class="cc-color-swatch ${draft.accent === color ? "active" : ""}"
              style="background:${color}" data-act="cc-set-accent" data-arg="${color}"></div>
          `).join("")}
          <input type="color" value="${draft.accent || "#14B8A6"}" data-input-act="cc-set-accent" style="width:34px;height:34px;border:0;background:transparent;cursor:pointer;">
          <span style="font-family:var(--f-mono);font-size:12px;color:var(--text-2);margin-left:6px;">${draft.accent}</span>
        </div>
      </div>
    </div>
  `;
}

/* 3.5 PURPOSES SECTION */

function renderPurposesSectionForm() {
  return `
    <div class="cc-form-group">
      <div class="cc-form-group-title">
        <span>Configured Cookie Categories</span>
        <button class="btn sm" data-act="cc-category-new">+ Add Purpose</button>
      </div>
      <p class="dim" style="font-size:12px;margin:0 0 10px;">
        Define categories presented in the Preference Center. Essential categories are mandatory, while optional categories can be configured for explicit opt-in.
      </p>

      <div style="display:grid;gap:10px;">
        ${state.categories.map(cat => {
          const cookieCount = state.cookies.filter(c => c.category === cat.id).length;
          return `<div class="cc-toggle-row" style="align-items:flex-start;">
            <div class="cc-toggle-info" style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;">
                <strong>${safe(cat.name)}</strong>
                ${cat.required ? `<span class="cc-badge ok">Always Active</span>` : `<span class="cc-badge info">${cat.defaultState ? "Default: Opt-In" : "Default: Opt-Out"}</span>`}
                <span class="cc-badge" style="background:var(--surface);">${cookieCount} cookies</span>
              </div>
              <small style="margin-top:4px;">${safe(cat.description)}</small>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              ${!cat.required ? `
                <button class="btn sm" data-act="cc-category-edit" data-arg="${safe(cat.id)}">Edit</button>
                <button class="btn sm d" data-act="cc-category-delete" data-arg="${safe(cat.id)}">×</button>
              ` : `
                <span style="font-size:11px;color:var(--text-3);padding:4px 6px;">Required</span>
              `}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
}

/* 3.6 DISPLAY FREQUENCY SECTION */

function renderFrequencySectionForm() {
  const draft = state.draft;
  const freq = draft.displayFrequency || {};
  const badge = draft.config?.badge || {};

  return `
    <div class="cc-form-group">
      <div class="cc-form-group-title">Consent Validity Period</div>
      <div class="g g2">
        <div class="field">
          <label for="cc-freq-validity">Validity Duration</label>
          <select id="cc-freq-validity" data-act="cc-change-validity">
            <option value="90" ${freq.validityDays === 90 ? "selected" : ""}>90 Days (3 Months)</option>
            <option value="180" ${freq.validityDays === 180 ? "selected" : ""}>180 Days (6 Months - Recommended)</option>
            <option value="365" ${freq.validityDays === 365 ? "selected" : ""}>365 Days (12 Months)</option>
            <option value="730" ${freq.validityDays === 730 ? "selected" : ""}>730 Days (24 Months)</option>
          </select>
        </div>
        <div class="field">
          <label for="cc-freq-custom-days">Custom Days</label>
          <input id="cc-freq-custom-days" type="number" min="1" max="730" value="${freq.validityDays || 180}" data-input-act="cc-input-validity-days">
        </div>
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Visitor Re-Prompting & Renewal Behavior</div>

      <div style="display:grid;gap:8px;">
        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Re-prompt on every visit until decision</strong>
            <small>Keeps the banner visible across sessions until the visitor explicitly accepts or declines</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(freq.showEveryVisit)}" data-act="cc-toggle-freq-everyvisit"></button>
        </div>

        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Re-prompt on policy update or category changes</strong>
            <small>Invalidates existing visitor consent receipts when categories or notice terms change</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(freq.repromptOnPolicyChange)}" data-act="cc-toggle-freq-policychange"></button>
        </div>
      </div>
    </div>

    <div class="cc-form-group">
      <div class="cc-form-group-title">Persistent Floating Preference Badge</div>

      <div style="display:grid;gap:8px;">
        <div class="cc-toggle-row">
          <div class="cc-toggle-info">
            <strong>Show Floating Revisit Badge</strong>
            <small>Displays a small cookie trigger in the corner of the website so visitors can reopen preferences at any time</small>
          </div>
          <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(badge.show)}" data-act="cc-toggle-badge-show"></button>
        </div>
      </div>

      <div class="g g2" style="margin-top:6px;">
        <div class="field">
          <label for="cc-badge-pos">Badge Position</label>
          <select id="cc-badge-pos" data-act="cc-change-badge-pos">
            <option value="bottom-left" ${badge.position === "bottom-left" ? "selected" : ""}>Bottom-Left Corner</option>
            <option value="bottom-right" ${badge.position === "bottom-right" ? "selected" : ""}>Bottom-Right Corner</option>
          </select>
        </div>
        <div class="field">
          <label for="cc-badge-label">Badge Tooltip / Label</label>
          <input id="cc-badge-label" type="text" value="${safe(badge.label || "Privacy Settings")}" data-input-act="cc-input-badge-label">
        </div>
      </div>
    </div>
  `;
}

/* 3.7 VENDORS SECTION */

function renderVendorsSectionForm() {
  const draft = state.draft;
  const vendors = draft.vendors || {};
  const sub = ui.vendorSub || "iab";
  const search = (ui.vendorSearch || "").toLowerCase();

  const iabList = (vendors.iabList || []).filter(v => v.name.toLowerCase().includes(search) || v.purposes.some(p => p.toLowerCase().includes(search)));
  const googleList = (vendors.googleList || []).filter(v => v.name.toLowerCase().includes(search) || v.domains.some(d => d.toLowerCase().includes(search)));

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div class="cc-config-view-toggle">
        <button class="cc-config-view-toggle-btn ${sub === "iab" ? "active" : ""}" data-act="cc-set-vendor-sub" data-arg="iab">
          IAB TCF v2.2 Vendors (${(vendors.iabList || []).length})
        </button>
        <button class="cc-config-view-toggle-btn ${sub === "google" ? "active" : ""}" data-act="cc-set-vendor-sub" data-arg="google">
          Google CMP List (${(vendors.googleList || []).length})
        </button>
      </div>

      <div class="field" style="width:200px;margin:0;">
        <input type="search" placeholder="Search vendors..." value="${safe(ui.vendorSearch || "")}" data-input-act="cc-search-vendors" style="height:32px;padding:2px 8px;font-size:12px;">
      </div>
    </div>

    ${sub === "iab" ? `
      <div class="cc-toggle-row" style="margin-bottom:12px;">
        <div class="cc-toggle-info">
          <strong>IAB Europe Transparency and Consent Framework v2.2</strong>
          <small>Global vendor registry and standardized consent string generation</small>
        </div>
        <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(vendors.iabEnabled)}" data-act="cc-toggle-iab-enabled"></button>
      </div>

      <div style="max-height:360px;overflow-y:auto;display:grid;gap:6px;border:1px solid var(--line);border-radius:8px;padding:8px;">
        ${iabList.map(v => `
          <div class="cc-toggle-row" style="padding:8px 10px;">
            <div class="cc-toggle-info">
              <strong>${safe(v.name)}</strong>
              <small>${safe(v.purposes.join(" · "))}</small>
            </div>
            <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(v.enabled)}" data-act="cc-toggle-single-iab" data-arg="${safe(v.id)}"></button>
          </div>
        `).join("")}
      </div>
    ` : `
      <div class="cc-toggle-row" style="margin-bottom:12px;">
        <div class="cc-toggle-info">
          <strong>Google Additional Consent & Ad Partners</strong>
          <small>Controls consent propagation for Google advertising and measurement products</small>
        </div>
        <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(vendors.googleVendorsEnabled)}" data-act="cc-toggle-google-enabled"></button>
      </div>

      <div style="max-height:360px;overflow-y:auto;display:grid;gap:6px;border:1px solid var(--line);border-radius:8px;padding:8px;">
        ${googleList.map(v => `
          <div class="cc-toggle-row" style="padding:8px 10px;">
            <div class="cc-toggle-info">
              <strong>${safe(v.name)}</strong>
              <small>${safe(v.domains.join(", "))}</small>
            </div>
            <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(v.enabled)}" data-act="cc-toggle-single-google" data-arg="${safe(v.id)}"></button>
          </div>
        `).join("")}
      </div>
    `}
  `;
}

/* ========================================================================= */
/* 4. LIVE PREVIEW PANE                                                      */
/* ========================================================================= */

  return { renderConfigSectionForm, renderLanguageSectionForm, renderContentSectionForm, renderLayoutSectionForm, renderPurposesSectionForm, renderFrequencySectionForm, renderVendorsSectionForm };
}
