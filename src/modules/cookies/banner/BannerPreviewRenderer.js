import { childModeOf, isChildVisitor, brandingOf, linksOf, FONT_OPTIONS, FONT_SCALES } from "../cookieData.js";
import { createPreferenceCenterRenderer, renderLanguagePicker } from "./PreferenceCenterRenderer.js";

export function createBannerPreviewRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;
  const preferenceCenter = createPreferenceCenterRenderer(context);

function renderLivePreviewPane() {
  const draft = state.draft;
  const previewMode = ui.previewMode || "banner";
  const device = ui.device || "Desktop";
  const activeReg = ui.region || "EEA & UK";
  const regConfig = draft.regions[activeReg] || draft.regions["EEA & UK"];
  const currentLang = draft.previewLanguage || draft.currentEditLanguage || "English (United States)";
  const t = getActiveTranslations(currentLang);

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
          ${previewMode === "banner" ? (ui.bnFull || ui.bnDismissed ? "" : renderRenderedBannerOverlay(draft, regConfig, t)) : renderRenderedPreferenceOverlay(draft, t)}

          <!-- After a choice: the revisit badge (if enabled) and the replay control -->
          ${ui.bnFull ? "" : renderAfterChoice(draft)}
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

// Theme, accent, font, text size and button style from the draft, applied to the banner
// container (cookieConsent.css reads --accent, --surface, --text… inside it)
function bannerLook(draft) {
  const b = brandingOf(draft);
  const theme = draft.theme === "dark" ? "dark" : "light";
  const font = (FONT_OPTIONS[b.fontFamily] || FONT_OPTIONS.system).stack;
  const scale = FONT_SCALES[b.fontScale] || 1;
  const secondary = ["equal", "outline", "subtle"].includes(draft.secondaryButtonStyle) ? draft.secondaryButtonStyle : "outline";
  return {
    cls: "cc-bn-" + theme + " cc-bn-sec-" + secondary,
    style: "--accent:" + safe(draft.accent || "#14B8A6") + ";--cc-font:" + safe(font) + ";--cc-scale:" + scale + ";",
  };
}

function bannerLogo(draft) {
  const b = brandingOf(draft);
  return b.logo && b.showLogoOnBanner ? '<img class="cc-banner-logo" src="' + safe(b.logo) + '" alt="' + safe(b.brandName) + '">' : "";
}

// Privacy policy and cookie policy links, as configured
function bannerLinks(draft, privacyText) {
  const links = linksOf(draft);
  const target = links.newTab ? ' target="_blank" rel="noopener"' : "";
  const out = [];
  if (links.showPrivacy) out.push('<a class="cc-banner-privacy-link" href="' + safe(draft.privacyUrl || "#") + '"' + target + '>' + safe(privacyText) + '</a>');
  if (links.showCookiePolicy && links.cookiePolicyText) out.push('<a class="cc-banner-privacy-link cc-banner-cookie-link" href="' + safe(links.cookiePolicyUrl || "#") + '"' + target + '>' + safe(links.cookiePolicyText) + '</a>');
  return out.join(" ");
}

const ZOOM_IN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ZOOM_OUT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

// Language picker, full-size toggle and (optionally) the close button, top right of the banner
function bannerTools(draft, closeButton) {
  const full = Boolean(ui.bnFull);
  return '<div class="cc-banner-tools">' +
    renderLanguagePicker(draft, ALL_LANGUAGES, safe, "cc-banner-lang") +
    '<button class="cc-banner-zoom-btn" type="button" data-act="cc-banner-fullscreen" data-arg="' + (full ? "off" : "on") + '" title="' + (full ? "Show inside the preview" : "Open full size") + '" aria-label="' + (full ? "Show inside the preview" : "Open full size") + '">' + (full ? ZOOM_OUT : ZOOM_IN) + '</button>' +
    (closeButton || "") +
  '</div>';
}

// What the simulated visitor sees after making a choice: the banner is gone, and the revisit
// badge (Config / Display Frequency) brings the Preference Center back. The replay control is
// a preview tool, not part of the site.
function renderAfterChoice(draft) {
  if ((ui.previewMode || "banner") !== "banner" || !ui.bnDismissed) return "";
  const badge = draft.config?.badge || {};
  return (badge.show ? '<button class="cc-floating-badge pos-' + safe(badge.position || "bottom-left") + '" data-act="cc-badge-click" title="Reopen privacy preferences">' +
      '<span aria-hidden="true">🍪</span><span>' + safe(badge.label || "Privacy Settings") + '</span></button>' : "") +
    '<button type="button" class="cc-sim-replay" data-act="cc-sim-replay" title="Preview tool: show the banner as on a first visit">' +
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>' +
      '<span>Show banner again</span>' + (badge.show ? "" : '<small>Badge is off</small>') +
    '</button>';
}

const backdrop = draft => (draft.config?.backdrop ? '<div class="cc-banner-backdrop" aria-hidden="true"></div>' : "");

// Under-18 visitor in a child-mode region: simpler wording, Necessary only (DPDP s.9(3))
function renderChildBannerOverlay(draft) {
  const layout = draft.layout || "bottom-bar";
  const look = bannerLook(draft);
  const links = linksOf(draft);
  return backdrop(draft) + '<div class="cc-banner-container layout-' + layout + ' ' + look.cls + '" style="' + look.style + '">' +
    '<div class="cc-rendered-banner-card cc-child-banner">' +
      '<div class="cc-banner-header-row">' +
        '<h4 class="cc-banner-title">' + bannerLogo(draft) + '<span>We only use the cookies this site needs <span class="cc-badge info">Child view</span></span></h4>' +
        bannerTools(draft) +
      '</div>' +
      '<p class="cc-banner-body-text">' +
        'You told us you are under 18. We use only the cookies that make this site work and keep it safe. We do not track you, build a profile of you, or show you targeted ads. ' +
        (links.showPrivacy ? '<a class="cc-banner-privacy-link" href="' + safe(draft.privacyUrl || "#") + '"' + (links.newTab ? ' target="_blank" rel="noopener"' : "") + '>Read how we protect your data</a>' : "") +
      '</p>' +
      '<div class="cc-banner-actions-row">' +
        '<button class="cc-btn-accept" data-act="cc-preview-visitor-accept">OK, continue</button>' +
        '<button class="cc-btn-settings" data-act="cc-set-preview-mode" data-arg="preference">See what we use</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderRenderedBannerOverlay(draft, regConfig, t) {
  if (isChildVisitor(draft, ui.region || "EEA & UK", ui.previewAge === "child" ? "under_18" : "18_plus")) return renderChildBannerOverlay(draft);
  const layout = draft.layout || "bottom-bar";
  const isUsa = (ui.region === "USA");
  const look = bannerLook(draft);
  const links = linksOf(draft);
  const title = draft.title || t.title;
  const desc = draft.description || t.description;
  const acceptLabel = draft.acceptLabel || t.acceptLabel;
  const rejectLabel = draft.rejectLabel || t.rejectLabel;
  const customizeLabel = draft.customizeLabel || t.customizeLabel;
  const privText = draft.privacyText || t.privacyText;
  const showClose = draft.config?.showCloseButton !== false;
  const showWatermark = draft.config?.showWatermark !== false;

  return backdrop(draft) + '<div class="cc-banner-container layout-' + layout + ' ' + look.cls + '" style="' + look.style + '">' +
    '<div class="cc-rendered-banner-card">' +
      '<div class="cc-banner-header-row">' +
        '<h4 class="cc-banner-title">' + bannerLogo(draft) + '<span>' + safe(title) + '</span></h4>' +
        bannerTools(draft, showClose ? '<button class="cc-banner-close-btn" data-act="cc-preview-visitor-close" title="' + (draft.config?.closeAction === "reject" ? "Close and reject optional cookies" : "Dismiss") + '" aria-label="Close">✕</button>' : "") +
      '</div>' +
      '<p class="cc-banner-body-text">' + safe(desc) + ' ' + bannerLinks(draft, privText) + '</p>' +
      '<div class="cc-banner-actions-row">' +
        '<button class="cc-btn-accept" data-act="cc-preview-visitor-accept">' + safe(acceptLabel) + '</button>' +
        (draft.config?.showDisabledButton !== false ? '<button class="cc-btn-reject" data-act="cc-preview-visitor-reject">' + safe(rejectLabel) + '</button>' : "") +
        '<button class="cc-btn-settings" data-act="cc-set-preview-mode" data-arg="preference">' + safe(customizeLabel) + '</button>' +
        (isUsa ? '<button class="cc-btn-reject" data-act="cc-preview-visitor-gpc">' + safe(links.doNotSellLabel || "Do Not Sell or Share My Personal Information") + '</button>' : "") +
      '</div>' +
      (showWatermark ? '<div class="cc-banner-watermark"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg><span>Powered by PrivacySEK CMP</span></div>' : "") +
    '</div>' +
  '</div>';
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

// The Cookie Preference Center for every preference layout (modal, drawer, sheet); its look and
// text follow the draft (see PreferenceCenterRenderer.js). An under-18 visitor still gets the
// child view. Shown full size, it renders at page level (renderFullscreenPreview) and
// the preview frame stays empty behind it.
function renderRenderedPreferenceOverlay(draft) {
  const child = isChildVisitor(draft, ui.region || "EEA & UK", ui.previewAge === "child" ? "under_18" : "18_plus");
  if (child) return renderChildPreferenceOverlay();
  return ui.pcFull ? "" : preferenceCenter.renderPreferenceCenter();
}

/* ========================================================================= */
/* 5. PUBLISH HISTORY MODAL                                                  */
/* ========================================================================= */

  // Full-size preview over the whole page, opened with the expand button on the banner or in
  // the Preference Center: the banner over a mock web page, or the Preference Center dialog
  function renderFullscreenPreview() {
    const draft = state.draft;
    const mode = ui.previewMode || "banner";
    if (mode === "preference") {
      const child = isChildVisitor(draft, ui.region || "EEA & UK", ui.previewAge === "child" ? "under_18" : "18_plus");
      return ui.pcFull && !child ? preferenceCenter.renderPreferenceCenter({ fullscreen: true }) : "";
    }
    if (!ui.bnFull) return "";
    const activeReg = ui.region || "EEA & UK";
    const regConfig = draft.regions[activeReg] || draft.regions["EEA & UK"];
    const t = getActiveTranslations(draft.previewLanguage || draft.currentEditLanguage || "English (United States)");
    return `<div class="cc-bn-stage" role="dialog" aria-label="Banner preview, full size" style="--cc-radius:${safe(draft.borderRadius || "12px")};">
      <div class="cc-mock-page cc-bn-stage-page" aria-hidden="true">
        <div class="cc-mock-hero"></div>
        <div class="cc-mock-lines"><div class="cc-mock-line medium"></div><div class="cc-mock-line short"></div></div>
        <div class="cc-mock-grid"><div class="cc-mock-card"></div><div class="cc-mock-card"></div><div class="cc-mock-card"></div></div>
      </div>
      <button type="button" class="cc-bn-stage-exit" data-act="cc-banner-fullscreen" data-arg="off">${ZOOM_OUT}<span>Exit full size</span></button>
      ${ui.bnDismissed ? renderAfterChoice(draft) : renderRenderedBannerOverlay(draft, regConfig, t)}
    </div>`;
  }

  return { renderLivePreviewPane, renderRenderedBannerOverlay, renderRenderedPreferenceOverlay, renderFullscreenPreview };
}
