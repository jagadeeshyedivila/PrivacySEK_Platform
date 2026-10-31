export function registerActions(context, ACT) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
    persist, recordConsent, readDialogField, validateScanSeeds, nextScanScheduleDate, renderers,
    cookieApi,
  } = context;
  const showPublishHistoryModal = renderers.banner.showPublishHistoryModal;

  // Top tab switching
  ACT["cc-top-tab"] = tab => {
    ui.topTab = tab;
    runtime.render();
    if (tab === "records" && ACT["cc-records-page"]) {
      ACT["cc-records-page"](ui.recordsPage || 1);
    } else if (tab === "inventory" && ACT["cc-inventory-page"]) {
      ACT["cc-inventory-page"](ui.inventoryPage || 1);
    }
  };
  ACT["cc-dashboard-range"] = days => {
    ui.dashboardRange = days === "all" ? "all" : ([7, 30, 90].includes(Number(days)) ? Number(days) : 30);
    runtime.render();
  };
  ACT["cc-dashboard-region"] = region => {
    ui.dashboardRegion = region;
    runtime.render();
  };
  ACT["cc-dashboard-scantype"] = type => {
    ui.dashboardScanType = type;
    runtime.render();
  };
  ACT["cc-dashboard-domain"] = domain => {
    ui.dashboardDomain = domain;
    runtime.render();
  };
  ACT["cc-dashboard-category"] = cat => {
    ui.dashboardCategory = cat;
    runtime.render();
  };
  ACT["cc-dashboard-filter-scantype"] = type => {
    ui.dashboardScanType = (ui.dashboardScanType === type) ? "all" : type;
    runtime.render();
  };
  ACT["cc-dashboard-filter-category"] = cat => {
    ui.dashboardCategory = (ui.dashboardCategory === cat) ? "all" : cat;
    runtime.render();
  };
  ACT["cc-dashboard-reset-filters"] = () => {
    ui.dashboardRange = 30;
    ui.dashboardRegion = "all";
    ui.dashboardScanType = "all";
    ui.dashboardDomain = "all";
    ui.dashboardCategory = "all";
    runtime.render();
  };
  ACT["cc-dashboard-go"] = destination => {
    const [tab, section] = String(destination || "").split(":");
    const validTabs = TOP_TABS.map(([id]) => id);
    if (!validTabs.includes(tab)) return;
    ui.topTab = tab;
    if (tab === "builder" && CONFIG_NAV_SECTIONS.some(([id]) => id === section)) {
      ui.builderSection = section;
    }
    runtime.render();
  };

  // Builder sidebar section switching
  ACT["cc-set-builder-section"] = section => {
    ui.builderSection = section;
    runtime.render();
  };

  // Region switching
  ACT["cc-set-region"] = reg => {
    ui.region = reg;
    // Also apply regional defaults if preset exists
    const regConfig = state.draft.regions[reg];
    if (regConfig && regConfig.notice) {
      if (regConfig.notice.title) state.draft.title = regConfig.notice.title;
      if (regConfig.notice.description) state.draft.description = regConfig.notice.description;
      if (regConfig.notice.acceptLabel) state.draft.acceptLabel = regConfig.notice.acceptLabel;
      if (regConfig.notice.rejectLabel) state.draft.rejectLabel = regConfig.notice.rejectLabel;
      if (regConfig.notice.customizeLabel) state.draft.customizeLabel = regConfig.notice.customizeLabel;
    }
    runtime.render();
  };

  // Toggle region enabled
  ACT["cc-toggle-region-enabled"] = reg => {
    if (!state.draft.regions[reg]) return;
    state.draft.regions[reg].enabled = !state.draft.regions[reg].enabled;
    persist(`${reg} regulation ${state.draft.regions[reg].enabled ? "enabled" : "disabled"}`);
  };

  // Preview Mode
  ACT["cc-set-preview-mode"] = mode => {
    ui.previewMode = mode;
    runtime.render();
  };

  // Device framing
  ACT["cc-set-device"] = device => {
    ui.device = device;
    runtime.render();
  };

  // Content sub-tab
  ACT["cc-set-content-sub"] = sub => {
    ui.contentSub = sub;
    runtime.render();
  };

  // Vendor sub-tab & search
  ACT["cc-set-vendor-sub"] = sub => {
    ui.vendorSub = sub;
    runtime.render();
  };
  ACT["cc-search-vendors"] = q => {
    ui.vendorSearch = q;
    runtime.render();
  };

  // Region settings toggles
  ACT["cc-toggle-reg-iab"] = () => {
    const reg = state.draft.regions[ui.region || "EEA & UK"];
    if (reg) {
      reg.enableIab = !reg.enableIab;
      persist(`IAB TCF for ${ui.region} ${reg.enableIab ? "enabled" : "disabled"}`);
    }
  };
  ACT["cc-toggle-reg-google"] = () => {
    const reg = state.draft.regions[ui.region || "EEA & UK"];
    if (reg) {
      reg.googleVendors = !reg.googleVendors;
      persist(`Google Vendors for ${ui.region} ${reg.googleVendors ? "enabled" : "disabled"}`);
    }
  };
  ACT["cc-toggle-reg-everywhere"] = () => {
    const reg = state.draft.regions[ui.region || "EEA & UK"];
    if (reg) {
      reg.gdprEverywhere = !reg.gdprEverywhere;
      persist(`Worldwide enforcement for ${ui.region} ${reg.gdprEverywhere ? "enabled" : "disabled"}`);
    }
  };
  ACT["cc-toggle-reg-privtab"] = () => {
    const reg = state.draft.regions[ui.region || "EEA & UK"];
    if (reg) {
      reg.showPrivacyTab = !reg.showPrivacyTab;
      persist();
    }
  };

  // Country chip management
  ACT["cc-remove-country"] = country => {
    const reg = state.draft.regions[ui.region || "EEA & UK"];
    if (reg && reg.targetCountries) {
      reg.targetCountries = reg.targetCountries.filter(c => c !== country);
      persist(`Removed ${country} from ${ui.region}`);
    }
  };
  ACT["cc-add-country-btn"] = () => {
    const sel = runtime.$("#cc-add-country-select");
    const country = sel?.value;
    if (!country) return;
    const reg = state.draft.regions[ui.region || "EEA & UK"];
    if (reg) {
      if (!reg.targetCountries) reg.targetCountries = [];
      if (!reg.targetCountries.includes(country)) {
        reg.targetCountries.push(country);
        persist(`Added ${country} to ${ui.region}`);
      }
    }
  };

  // Advanced features
  ACT["cc-change-default-reg"] = val => {
    state.draft.config.defaultRegulation = val;
    persist(`Default regulation set to ${val}`);
  };
  ACT["cc-change-cookie-blocking"] = val => {
    state.draft.config.cookieBlocking = val;
    persist(`Cookie blocking mode set to ${val}`);
  };
  ACT["cc-toggle-gpp"] = () => {
    state.draft.config.enableGpp = !state.draft.config.enableGpp;
    persist();
  };
  ACT["cc-toggle-watermark"] = () => {
    state.draft.config.showWatermark = !state.draft.config.showWatermark;
    persist();
  };
  ACT["cc-toggle-disabled-btn"] = () => {
    state.draft.config.showDisabledButton = !state.draft.config.showDisabledButton;
    persist();
  };
  ACT["cc-toggle-close-btn"] = () => {
    state.draft.config.showCloseButton = !state.draft.config.showCloseButton;
    persist();
  };
  ACT["cc-input-zindex"] = val => {
    state.draft.config.zIndex = Number(val) || 9999;
    saveCookieDemoState(state);
  };
  ACT["cc-toggle-gcm"] = () => {
    state.draft.config.googleConsentMode = !state.draft.config.googleConsentMode;
    persist(`Google Consent Mode v2 ${state.draft.config.googleConsentMode ? "enabled" : "disabled"}`);
  };
  ACT["cc-toggle-uet"] = () => {
    state.draft.config.microsoftUetConsent = !state.draft.config.microsoftUetConsent;
    persist(`Microsoft UET ${state.draft.config.microsoftUetConsent ? "enabled" : "disabled"}`);
  };

  // Multiple languages selection
  ACT["cc-toggle-lang-select"] = langName => {
    const list = state.draft.enabledLanguages || [];
    if (list.includes(langName)) {
      if (list.length <= 1) {
        runtime.toast("At least one language must remain selected");
        return;
      }
      state.draft.enabledLanguages = list.filter(l => l !== langName);
    } else {
      state.draft.enabledLanguages.push(langName);
    }
    persist(`Language selection updated (${state.draft.enabledLanguages.length} active)`);
  };

  ACT["cc-change-edit-lang"] = langName => {
    state.draft.currentEditLanguage = langName;
    state.draft.previewLanguage = langName;
    runtime.render();
  };

  ACT["cc-change-preview-lang"] = langName => {
    state.draft.previewLanguage = langName;
    runtime.render();
  };

  ACT["cc-apply-lang-strings"] = () => {
    const lang = state.draft.currentEditLanguage || "English (United States)";
    const t = getActiveTranslations(lang);
    state.draft.title = t.title;
    state.draft.description = t.description;
    state.draft.privacyText = t.privacyText;
    state.draft.acceptLabel = t.acceptLabel;
    state.draft.rejectLabel = t.rejectLabel;
    state.draft.customizeLabel = t.customizeLabel;
    state.draft.preference.title = t.prefTitle;
    state.draft.preference.description = t.prefDesc;
    state.draft.preference.saveLabel = t.saveLabel;
    state.draft.preference.vendorListText = t.vendorListText;
    persist(`Applied ${lang} translations to draft`);
  };

  // Live content inputs with instantaneous DOM reflection
  function updateLiveField(selector, text) {
    const el = runtime.$(selector);
    if (el) el.textContent = text;
    const dirtyPill = runtime.$(".cc-publish-status-pill");
    if (dirtyPill && !dirtyPill.classList.contains("dirty")) {
      dirtyPill.className = "cc-publish-status-pill dirty";
      dirtyPill.innerHTML = `<span class="cc-status-dot"></span><span>Draft (Unsaved changes)</span>`;
    }
  }

  ACT["cc-input-title"] = val => {
    state.draft.title = val;
    updateLiveField(".cc-banner-title", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-desc"] = val => {
    state.draft.description = val;
    const el = runtime.$(".cc-banner-body-text");
    if (el) {
      el.innerHTML = `${safe(val)} <a class="cc-banner-privacy-link" href="${safe(state.draft.privacyUrl || "#")}" target="_blank">${safe(state.draft.privacyText || "Privacy Policy")}</a>`;
    }
    saveCookieDemoState(state);
  };
  ACT["cc-input-privtext"] = val => {
    state.draft.privacyText = val;
    updateLiveField(".cc-banner-privacy-link", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-privurl"] = val => {
    state.draft.privacyUrl = val;
    const link = runtime.$(".cc-banner-privacy-link");
    if (link) link.setAttribute("href", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-accept"] = val => {
    state.draft.acceptLabel = val;
    updateLiveField(".cc-btn-accept", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-reject"] = val => {
    state.draft.rejectLabel = val;
    updateLiveField(".cc-btn-reject", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-customize"] = val => {
    state.draft.customizeLabel = val;
    updateLiveField(".cc-btn-settings", val);
    saveCookieDemoState(state);
  };

  ACT["cc-input-pref-title"] = val => {
    state.draft.preference.title = val;
    updateLiveField(".cc-preference-card-header h3", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-pref-desc"] = val => {
    state.draft.preference.description = val;
    updateLiveField(".cc-preference-card-scroll p", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-pref-save"] = val => {
    state.draft.preference.saveLabel = val;
    updateLiveField(".cc-preference-card-actions .btn.t", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-pref-reject"] = val => {
    state.draft.preference.rejectLabel = val;
    updateLiveField(".cc-preference-card-actions .btn.sm:not(.t)", val);
    saveCookieDemoState(state);
  };
  ACT["cc-input-pref-vendorlink"] = val => {
    state.draft.preference.vendorListText = val;
    updateLiveField(".cc-preference-card-scroll .cc-banner-privacy-link", val);
    saveCookieDemoState(state);
  };

  // Layout & styles
  ACT["cc-set-layout"] = layout => {
    state.draft.layout = layout;
    persist(`Banner layout updated to ${layout}`);
  };
  ACT["cc-set-pref-layout"] = layout => {
    state.draft.preference.layout = layout;
    persist(`Preference center layout updated to ${layout}`);
  };
  ACT["cc-set-theme"] = theme => {
    state.draft.theme = theme;
    persist(`Banner theme set to ${theme}`);
  };
  ACT["cc-change-radius"] = radius => {
    state.draft.borderRadius = radius;
    persist(`Border radius updated to ${radius}`);
  };
  ACT["cc-set-accent"] = color => {
    state.draft.accent = color;
    persist(`Accent color set to ${color}`);
  };

  // Display Frequency & Badge
  ACT["cc-change-validity"] = days => {
    state.draft.displayFrequency.validityDays = Number(days);
    persist(`Consent validity set to ${days} days`);
  };
  ACT["cc-input-validity-days"] = days => {
    state.draft.displayFrequency.validityDays = Number(days) || 180;
    saveCookieDemoState(state);
  };
  ACT["cc-toggle-freq-everyvisit"] = () => {
    state.draft.displayFrequency.showEveryVisit = !state.draft.displayFrequency.showEveryVisit;
    persist();
  };
  ACT["cc-toggle-freq-policychange"] = () => {
    state.draft.displayFrequency.repromptOnPolicyChange = !state.draft.displayFrequency.repromptOnPolicyChange;
    persist();
  };
  ACT["cc-toggle-badge-show"] = () => {
    if (!state.draft.config.badge) state.draft.config.badge = {};
    state.draft.config.badge.show = !state.draft.config.badge.show;
    persist(`Revisit badge ${state.draft.config.badge.show ? "enabled" : "hidden"}`);
  };
  ACT["cc-change-badge-pos"] = pos => {
    state.draft.config.badge.position = pos;
    persist(`Badge position updated to ${pos}`);
  };
  ACT["cc-input-badge-label"] = label => {
    state.draft.config.badge.label = label;
    saveCookieDemoState(state);
  };

  // Vendor toggles
  ACT["cc-toggle-iab-enabled"] = () => {
    state.draft.vendors.iabEnabled = !state.draft.vendors.iabEnabled;
    persist();
  };
  ACT["cc-toggle-google-enabled"] = () => {
    state.draft.vendors.googleVendorsEnabled = !state.draft.vendors.googleVendorsEnabled;
    persist();
  };
  ACT["cc-toggle-single-iab"] = id => {
    const v = (state.draft.vendors.iabList || []).find(item => item.id === id);
    if (v) {
      v.enabled = !v.enabled;
      persist(`Vendor ${v.name} ${v.enabled ? "enabled" : "disabled"}`);
    }
  };
  ACT["cc-toggle-single-google"] = id => {
    const v = (state.draft.vendors.googleList || []).find(item => item.id === id);
    if (v) {
      v.enabled = !v.enabled;
      persist(`Google vendor ${v.name} ${v.enabled ? "enabled" : "disabled"}`);
    }
  };

  // Save & Publish & Reset Actions
  ACT["cc-save-draft"] = async () => {
    try {
      await cookieApi.saveDraft(state.draft);
      runtime.toast("Configuration draft saved successfully to MongoDB");
      runtime.render();
    } catch (err) {
      runtime.toast(`Failed to save draft: ${err.message}`);
    }
  };

  ACT["cc-publish-modal"] = () => {
    const nextVer = (state.versions[state.versions.length - 1]?.version || 1) + 1;
    const body = `
      <p>Publishing will deploy this configuration across all enabled regions (<b>${REGIONS.filter(r => state.draft.regions[r]?.enabled !== false).join(", ")}</b>) and generate Version <b>v${nextVer}</b>.</p>
      <div class="field" style="margin-top:12px;">
        <label for="cc-publish-note">Release Notes / Change Description</label>
        <input id="cc-publish-note" type="text" value="Updated banner configuration and regional compliance presets">
      </div>
    `;
    runtime.modal("Publish Cookie Consent Banner", "Create live production deployment", body, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn t" data-act="cc-confirm-publish">Publish v${nextVer}</button>
    `);
  };

  ACT["cc-confirm-publish"] = async () => {
    const note = runtime.$("#cc-publish-note")?.value || "Configuration update";
    try {
      const res = await cookieApi.publishBanner({ note, publishedBy: "Security & Privacy Admin" });
      if (res.published) state.published = res.published;
      if (res.version) state.versions.push(res.version);
      runtime.closeOv();
      runtime.toast(`Banner Configuration v${res.version?.version || ""} published live to MongoDB!`);
      runtime.render();
    } catch (err) {
      runtime.toast(`Failed to publish banner: ${err.message}`);
    }
  };

  ACT["cc-reset-banner-confirm"] = () => {
    runtime.modal(
      "Reset to Default Configuration?",
      "Restore standard PrivacySEK presets",
      `<p>This will reset all banner layouts, notices, regional rules, and settings back to default. Discovered cookies and consent records will be preserved.</p>`,
      `<button class="btn" data-act="close">Cancel</button><button class="btn d" data-act="cc-confirm-reset-banner">Reset to Defaults</button>`
    );
  };

  ACT["cc-confirm-reset-banner"] = async () => {
    try {
      const res = await cookieApi.resetBanner();
      if (res.draft) state.draft = res.draft;
      if (res.published) state.published = res.published;
      runtime.closeOv();
      runtime.toast("Banner configuration restored to standard defaults in MongoDB");
      runtime.render();
    } catch (err) {
      runtime.toast(`Failed to reset banner: ${err.message}`);
    }
  };

  // Publish history
  ACT["cc-open-publish-history"] = showPublishHistoryModal;
  ACT["cc-restore-version"] = ver => {
    const target = state.versions.find(v => String(v.version) === String(ver));
    if (target) {
      state.draft = clone(target.config);
      runtime.closeOv();
      persist(`Restored configuration draft from v${ver}`);
    }
  };

  // Interactive visitor simulation inside preview
  ACT["cc-preview-visitor-accept"] = () => {
    const categories = Object.fromEntries(state.categories.map(c => [c.id, true]));
    state.visitor = { status: "Accepted all", categories, updatedAt: isoNow() };
    recordConsent("Accept All", categories);
    persist("Simulated visitor: Accepted All Categories");
  };

  ACT["cc-preview-visitor-reject"] = () => {
    const categories = Object.fromEntries(state.categories.map(c => [c.id, c.required]));
    state.visitor = { status: "Disabled optional", categories, updatedAt: isoNow() };
    recordConsent("Disable All", categories);
    persist("Simulated visitor: Disabled Optional Categories");
  };

  ACT["cc-preview-visitor-gpc"] = () => {
    const categories = Object.fromEntries(state.categories.map(c => [c.id, c.id !== "advertising"]));
    state.visitor = { status: "Do Not Sell / Share", categories, updatedAt: isoNow() };
    recordConsent("Do Not Sell", categories, "Global Privacy Control");
    persist("Simulated visitor: Opted out of Sale/Sharing (GPC)");
  };

  ACT["cc-preview-visitor-close"] = () => {
    recordConsent("Close", state.visitor.categories);
    persist("Simulated visitor: Dismissed banner");
  };

  ACT["cc-preview-toggle-cat"] = catId => {
    state.visitor.categories[catId] = !state.visitor.categories[catId];
    runtime.render();
  };

  ACT["cc-preview-save-pref"] = () => {
    recordConsent("Save Preferences", state.visitor.categories);
    ui.previewMode = "banner";
    persist("Simulated visitor: Privacy Preferences Saved");
  };

  ACT["cc-badge-click"] = () => {
    ui.previewMode = ui.previewMode === "banner" ? "preference" : "banner";
    runtime.render();
  };

  ACT["cc-preview-open-vendors"] = () => {
    ui.builderSection = "vendors";
    runtime.render();
  };


}
