import { childModeOf, isChildVisitor } from "../cookieData.js";

export function createBannerPreviewRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

function renderLivePreviewPane() {
  const draft = state.draft;
  const previewMode = ui.previewMode || "banner";
  const device = ui.device || "Desktop";
  const activeReg = ui.region || "EEA & UK";
  const regConfig = draft.regions[activeReg] || draft.regions["EEA & UK"];
  const currentLang = draft.previewLanguage || draft.currentEditLanguage || "English (United States)";
  const t = getActiveTranslations(currentLang);
  const badge = draft.config?.badge || {};

  return `<section class="cc-preview-pane">
    <div class="cc-preview-header">
      <div class="cc-preview-header-left">
        <span class="cc-preview-header-title">Live Preview</span>
        <span class="cc-badge info" style="font-size:11px;">${safe(activeReg)}</span>
      </div>

      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        ${childModeOf(draft).enabled && childModeOf(draft).regions.includes(activeReg) ? `
          <div class="cc-age-switch" role="group" aria-label="Preview visitor age">
            ${[["adult", "Adult"], ["child", "Child (under 18)"]].map(([k, l]) => `<button type="button" data-act="cc-preview-age" data-arg="${k}" aria-pressed="${(ui.previewAge || "adult") === k}">${l}</button>`).join("")}
          </div>` : ""}
        <label style="font-size:11px;color:var(--text-3);">Language:</label>
        <select class="cc-preview-lang-select" data-act="cc-change-preview-lang">
          ${draft.enabledLanguages.map(l => `<option value="${safe(l)}" ${l === currentLang ? "selected" : ""}>${safe(l)}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="cc-browser-canvas-container">
      <div class="cc-browser-frame device-${device.toLowerCase()}">
        <div class="cc-browser-chrome">
          <div class="cc-browser-dots">
            <span class="cc-browser-dot red"></span>
            <span class="cc-browser-dot yellow"></span>
            <span class="cc-browser-dot green"></span>
          </div>
          <div class="cc-browser-address-bar">
            <span>🔒</span>
            <span>https://demo.privacysek.example/</span>
          </div>
        </div>

        <div class="cc-browser-viewport" style="--cc-radius:${draft.borderRadius || '12px'};--cc-accent:${draft.accent || '#14B8A6'};">
          <!-- Mock Website Wireframe Background -->
          <div class="cc-mock-page">
            <div class="cc-mock-hero"></div>
            <div class="cc-mock-lines">
              <div class="cc-mock-line medium"></div>
              <div class="cc-mock-line short"></div>
            </div>
            <div class="cc-mock-grid">
              <div class="cc-mock-card"></div>
              <div class="cc-mock-card"></div>
              <div class="cc-mock-card"></div>
            </div>
          </div>

          <!-- Banner or Preference Center Overlay -->
          ${previewMode === "banner" ? renderRenderedBannerOverlay(draft, regConfig, t) : renderRenderedPreferenceOverlay(draft, t)}

          <!-- Floating Badge if enabled -->
          ${badge.show ? `
            <button class="cc-floating-badge pos-${badge.position || "bottom-left"}" data-act="cc-badge-click" title="Click to reopen privacy preferences">
              <span>🍪</span>
              <span>${safe(badge.label || "Privacy Settings")}</span>
            </button>
          ` : ""}
        </div>
      </div>
    </div>

    <div class="cc-preview-toolbar-bottom">
      <div class="cc-device-selector">
        <span style="font-size:11px;color:var(--text-3);padding-left:4px;">Device:</span>
        <button class="cc-device-btn ${device === "Desktop" ? "active" : ""}" data-act="cc-set-device" data-arg="Desktop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          Desktop
        </button>
        <button class="cc-device-btn ${device === "Tablet" ? "active" : ""}" data-act="cc-set-device" data-arg="Tablet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          Tablet
        </button>
        <button class="cc-device-btn ${device === "Mobile" ? "active" : ""}" data-act="cc-set-device" data-arg="Mobile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          Mobile
        </button>
      </div>

      <button class="btn sm" data-act="cc-open-publish-history" title="View publication timeline and restore previous versions">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
        Publish History
      </button>
    </div>
  </section>`;
}

// Under-18 visitor in a child-mode region: simpler wording, Necessary only (DPDP s.9(3))
function renderChildBannerOverlay(draft) {
  const layout = draft.layout || "bottom-bar";
  return `<div class="cc-banner-container layout-${layout}">
    <div class="cc-rendered-banner-card cc-child-banner">
      <div class="cc-banner-header-row">
        <h4 class="cc-banner-title">We only use the cookies this site needs <span class="cc-badge info">Child view</span></h4>
      </div>
      <p class="cc-banner-body-text">
        You told us you are under 18. We use only the cookies that make this site work and keep it safe. We do not track you, build a profile of you, or show you targeted ads.
        <a class="cc-banner-privacy-link" href="${safe(draft.privacyUrl || "#")}" target="_blank">Read how we protect your data</a>
      </p>
      <div class="cc-banner-actions-row">
        <button class="cc-btn-accept" data-act="cc-preview-visitor-accept">OK, continue</button>
        <button class="cc-btn-settings" data-act="cc-set-preview-mode" data-arg="preference">See what we use</button>
      </div>
    </div>
  </div>`;
}

function renderRenderedBannerOverlay(draft, regConfig, t) {
  if (isChildVisitor(draft, ui.region || "EEA & UK", ui.previewAge === "child" ? "under_18" : "18_plus")) return renderChildBannerOverlay(draft);
  const layout = draft.layout || "bottom-bar";
  const isUsa = (ui.region === "USA");
  const title = draft.title || t.title;
  const desc = draft.description || t.description;
  const acceptLabel = draft.acceptLabel || t.acceptLabel;
  const rejectLabel = draft.rejectLabel || t.rejectLabel;
  const customizeLabel = draft.customizeLabel || t.customizeLabel;
  const privText = draft.privacyText || t.privacyText;
  const showClose = draft.config?.showCloseButton !== false;
  const showWatermark = draft.config?.showWatermark !== false;

  return `<div class="cc-banner-container layout-${layout}">
    <div class="cc-rendered-banner-card">
      <div class="cc-banner-header-row">
        <h4 class="cc-banner-title">${safe(title)}</h4>
        ${showClose ? `<button class="cc-banner-close-btn" data-act="cc-preview-visitor-close" title="Dismiss">✕</button>` : ""}
      </div>
      <p class="cc-banner-body-text">
        ${safe(desc)}
        <a class="cc-banner-privacy-link" href="${safe(draft.privacyUrl || "#")}" target="_blank">${safe(privText)}</a>
      </p>

      <div class="cc-banner-actions-row">
        <button class="cc-btn-accept" data-act="cc-preview-visitor-accept">
          ${safe(acceptLabel)}
        </button>
        ${draft.config?.showDisabledButton !== false ? `
          <button class="cc-btn-reject" data-act="cc-preview-visitor-reject">
            ${safe(rejectLabel)}
          </button>
        ` : ""}
        <button class="cc-btn-settings" data-act="cc-set-preview-mode" data-arg="preference">
          ${safe(customizeLabel)}
        </button>
        ${isUsa ? `
          <button class="cc-btn-reject" data-act="cc-preview-visitor-gpc">
            Do Not Sell / Share
          </button>
        ` : ""}
      </div>

      ${showWatermark ? `
        <div class="cc-banner-watermark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>
          <span>Powered by PrivacySEK CMP</span>
        </div>
      ` : ""}
    </div>
  </div>`;
}

// Preference centre for an under-18 visitor: plain wording, nothing to switch on (DPDP s.9(3))
function renderChildPreferenceOverlay() {
  const plain = {
    necessary: "Keeps the site working and your account safe. Always on.",
  };
  return `<div class="cc-preference-overlay">
    <div class="cc-preference-card cc-child-banner">
      <div class="cc-preference-card-header">
        <h3>What this site uses <span class="cc-badge info">Child view</span></h3>
        <button class="cc-banner-close-btn" data-act="cc-set-preview-mode" data-arg="banner" aria-label="Close">✕</button>
      </div>
      <div class="cc-preference-card-scroll">
        <p>Because you are under 18, we only use what this site needs to work. Everything else is switched off and you cannot turn it on.</p>
        <div style="display:grid;gap:10px;margin-top:6px;">
          ${state.categories.map(cat => `<div class="cc-toggle-row ${cat.required ? "" : "cc-child-locked"}">
              <div class="cc-toggle-info">
                <strong>${cat.required ? "" : "🔒 "}${safe(cat.name)}</strong>
                <small>${safe(cat.required ? (plain[cat.id] || "Needed for the site to work. Always on.") : "Off. We do not use this for anyone under 18.")}</small>
              </div>
              <button class="cc-switch" type="button" role="switch" aria-checked="${Boolean(cat.required)}" aria-label="${safe(cat.name)}" disabled></button>
            </div>`).join("")}
        </div>
      </div>
      <div class="cc-preference-card-actions">
        <button class="btn sm t" data-act="cc-preview-save-pref">OK, got it</button>
      </div>
    </div>
  </div>`;
}

function renderRenderedPreferenceOverlay(draft, t) {
  const pref = draft.preference || {};
  const categories = state.visitor.categories;
  const child = isChildVisitor(draft, ui.region || "EEA & UK", ui.previewAge === "child" ? "under_18" : "18_plus");
  if (child) return renderChildPreferenceOverlay();

  return `<div class="cc-preference-overlay">
    <div class="cc-preference-card">
      <div class="cc-preference-card-header">
        <h3>${safe(pref.title || t.prefTitle)}</h3>
        <button class="cc-banner-close-btn" data-act="cc-set-preview-mode" data-arg="banner">✕</button>
      </div>

      <div class="cc-preference-card-scroll">
        <p>${safe(pref.description || t.prefDesc)}</p>

        <div style="display:grid;gap:10px;margin-top:6px;">
          ${state.categories.map(cat => {
            const isChecked = cat.required || Boolean(categories[cat.id]);
            return `<div class="cc-toggle-row">
              <div class="cc-toggle-info">
                <strong>${safe(cat.name)} ${cat.required ? "(Required)" : ""}</strong>
                <small>${safe(cat.description)}</small>
              </div>
              <button class="cc-switch" type="button" role="switch" aria-checked="${isChecked}"
                ${cat.required ? "disabled" : `data-act="cc-preview-toggle-cat" data-arg="${safe(cat.id)}"`}></button>
            </div>`;
          }).join("")}
        </div>

        <div style="margin-top:6px;">
          <a class="cc-banner-privacy-link" href="javascript:void(0)" data-act="cc-preview-open-vendors">
            ${safe(pref.vendorListText || t.vendorListText)}
          </a>
        </div>
      </div>

      <div class="cc-preference-card-actions">
        <button class="btn sm" data-act="cc-preview-visitor-reject">
          ${safe(pref.rejectLabel || "Disable All")}
        </button>
        <button class="btn sm t" data-act="cc-preview-save-pref">
          ${safe(pref.saveLabel || t.saveLabel)}
        </button>
      </div>
    </div>
  </div>`;
}

/* ========================================================================= */
/* 5. PUBLISH HISTORY MODAL                                                  */
/* ========================================================================= */

  return { renderLivePreviewPane, renderRenderedBannerOverlay, renderRenderedPreferenceOverlay };
}
