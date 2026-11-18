// Cookie Preference Center: what a visitor sees after "Privacy Settings".
// Two tabs (Purposes, Privacy Information), a one-open-at-a-time accordion, and a fixed
// header and footer around a scrolling middle.
//
// Everything an administrator configures in Banner Configuration drives it live:
//   Layout   draft.preference.layout   "modal" (default) | "drawer" | "sheet"
//            draft.theme, draft.accent, draft.borderRadius
//   Content  draft.preference.{title, description, saveLabel, rejectLabel, vendorListText},
//            draft.acceptLabel, draft.privacyText / privacyUrl (translations fill empty fields)
//   Config   draft.config.{showCloseButton, showDisabledButton, showWatermark}
//   Purposes state.categories (shown when showInPref is not false), cookies from state.cookies
// Fixed wording comes from preferenceCenterData.js.
//
// Interaction state lives in `ui` so a re-render shows the same view:
//   ui.pcTab       "purposes" | "privacy"
//   ui.pcOpen      { purposes: id | null, privacy: id | null }
//   ui.pcMore      intro text expanded
//   ui.pcChoices   working copy of the visitor's choices, kept only by a save button
//   ui.pcAuditId   the visitor's audit UUID
//   ui.pcFull      shown over the whole page instead of inside the preview frame
import {
  PREFERENCE_CENTER_TEXT as TEXT,
  PREFERENCE_CENTER_PRIVACY_INFO as PRIVACY_INFO,
} from "../preferenceCenterData.js";
import { appliesToRegion, LEGAL_BASES, labelOf } from "../purposeModel.js";
import { brandingOf, linksOf, FONT_OPTIONS, FONT_SCALES } from "../cookieData.js";

export const PREFERENCE_LAYOUTS = ["modal", "drawer", "sheet"];

// Drafts saved before these layouts existed may say "accordion"; that is the modal now
export function preferenceLayoutOf(draft) {
  const layout = draft?.preference?.layout;
  return PREFERENCE_LAYOUTS.includes(layout) ? layout : "modal";
}

/**
 * The visitor's language picker, shown inside the banner and the Preference Center.
 * Lists the enabled languages by native name; hidden when only one is enabled.
 */
export function renderLanguagePicker(draft, allLanguages, safe, cls) {
  const langs = draft?.enabledLanguages || [];
  if (langs.length < 2) return "";
  const current = draft.previewLanguage || draft.currentEditLanguage || "English (United States)";
  const native = name => (allLanguages || []).find(l => l.name === name)?.native || name;
  return `<label class="${cls}" title="Language">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>
    <select data-act="cc-change-preview-lang" aria-label="Language">
      ${langs.map(l => `<option value="${safe(l)}" ${l === current ? "selected" : ""}>${safe(native(l))}</option>`).join("")}
    </select>
  </label>`;
}

export function newAuditId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => {
    const r = Math.random() * 16 | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function resetPreferenceCenterUi(ui) {
  ui.pcTab = "purposes";
  ui.pcOpen = { purposes: null, privacy: null };
  ui.pcMore = false;
  ui.pcChoices = null;
}

/**
 * The categories shown in the Preference Center, each with its cookies from the inventory.
 * Inventory cookies whose category is not configured are grouped as "Uncategorized".
 */
// Purposes switched off in Manage Purposes, or limited to other regions, are not shown.
// Always Active purposes are always shown.
export function preferenceCategories(state, region) {
  const configured = state.categories || [];
  const cookies = state.cookies || [];
  const known = new Set(configured.map(c => c.id));
  const list = configured
    .filter(c => c.required || (c.showInPref !== false && appliesToRegion(c, region)))
    .map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      required: Boolean(c.required),
      defaultState: Boolean(c.defaultState),
      legalBasis: c.legalBasis,
      dataCollected: Array.isArray(c.dataCollected) ? c.dataCollected : [],
      cookies: cookies.filter(k => k.category === c.id),
    }));
  const stray = cookies.filter(k => !known.has(k.category));
  if (stray.length && !known.has(TEXT.uncategorized.id)) {
    list.push({ ...TEXT.uncategorized, required: false, defaultState: false, dataCollected: [], cookies: stray });
  }
  return list;
}

// Before the visitor has chosen anything, optional categories start at their configured default
export function initialChoices(state, region) {
  const saved = state.visitor?.categories || {};
  const undecided = !state.visitor || state.visitor.status === "No decision";
  return Object.fromEntries(preferenceCategories(state, region).map(c => [
    c.id,
    c.required || Boolean(undecided ? c.defaultState : saved[c.id]),
  ]));
}

// Black or white text, whichever reads better on the accent colour
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return lum > 0.45 ? "#111827" : "#fff";
}

const CHEVRON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
const CLOSE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const EXPAND = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const SHRINK = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;

export function createPreferenceCenterRenderer(context) {
  const { state, ui, safe, getActiveTranslations } = context;

  // Admin text first, then the preview language's translation, then the built-in wording
  function copy() {
    const draft = state.draft || {};
    const pref = draft.preference || {};
    const lang = draft.previewLanguage || draft.currentEditLanguage || "English (United States)";
    const t = (getActiveTranslations && getActiveTranslations(lang)) || {};
    return {
      title: pref.title || t.prefTitle || TEXT.title,
      intro: pref.description || t.prefDesc || TEXT.intro,
      save: pref.saveLabel || t.saveLabel || TEXT.buttons.save,
      disableAll: pref.rejectLabel || t.rejectLabel || TEXT.buttons.disableAll,
      acceptAll: draft.acceptLabel || t.acceptLabel || TEXT.buttons.acceptAll,
      vendorList: pref.vendorListText || t.vendorListText || TEXT.vendorList,
      privacyText: draft.privacyText || t.privacyText || TEXT.privacyPolicy,
      privacyUrl: draft.privacyUrl || "#",
    };
  }

  const privacySek = size => `<span class="pc-brand pc-brand-${size}">
    <img src="/logo-mark.png" alt="" aria-hidden="true">
    <span class="pc-brand-word"><span class="pc-brand-a">Privacy</span><span class="pc-brand-b">SEK</span></span>
  </span>`;
  // Header: the uploaded logo when there is one (Branding section), else the PrivacySEK mark
  function headerBrand() {
    const b = brandingOf(state.draft);
    return b.logo && b.showLogoInPreference
      ? `<span class="pc-brand"><img class="pc-brand-logo" src="${safe(b.logo)}" alt="${safe(b.brandName)}"></span>`
      : privacySek("lg");
  }

  // Privacy and cookie policy links in the footer, as configured
  function footerLinks(text) {
    const links = linksOf(state.draft);
    const target = links.newTab ? ` target="_blank" rel="noopener"` : "";
    return [
      links.showPrivacy ? `<a class="pc-policy" href="${safe(text.privacyUrl)}"${target}>${safe(text.privacyText)}</a>` : "",
      links.showCookiePolicy && links.cookiePolicyText ? `<a class="pc-policy" href="${safe(links.cookiePolicyUrl || "#")}"${target}>${safe(links.cookiePolicyText)}</a>` : "",
    ].filter(Boolean).join(`<span class="pc-policy-sep" aria-hidden="true">·</span>`);
  }

  // Extra Privacy Information item with the configured privacy contact
  function contactItem() {
    const links = linksOf(state.draft);
    if (!links.showContact || !(links.contactEmail || links.contactName)) return "";
    const brandName = brandingOf(state.draft).brandName || "We";
    return renderItem("privacy", "contact", TEXT.contactTitle, "", `
      <p class="pc-desc">${safe(TEXT.contactIntro.replace("{brand}", brandName))}</p>
      <div class="pc-contact">
        ${links.contactName ? `<strong>${safe(links.contactName)}</strong>` : ""}
        ${links.contactEmail ? `<a href="mailto:${safe(links.contactEmail)}">${safe(links.contactEmail)}</a>` : ""}
      </div>`);
  }

  // Cut at a word boundary so the "..." never splits a word
  function renderIntro(text) {
    const max = TEXT.introPreviewLength;
    if (text.length <= max + 20) return `<p class="pc-intro">${safe(text)}</p>`;
    const cut = text.slice(0, max);
    const short = cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "");
    return `<p class="pc-intro ${ui.pcMore ? "expanded" : ""}">
      <span class="pc-intro-short">${safe(short)}... </span><span class="pc-intro-full">${safe(text)} </span><button type="button" class="pc-link pc-more" data-act="pc-show-more" aria-expanded="${Boolean(ui.pcMore)}">${safe(ui.pcMore ? TEXT.showLess : TEXT.showMore)}</button>
    </p>`;
  }

  function renderSwitch(cat, on) {
    return `<button type="button" class="pc-switch" role="switch" aria-checked="${on}" aria-label="${safe(cat.name)}"
      data-act="pc-toggle-cat" data-arg="${safe(cat.id)}">
      <span class="pc-switch-icon pc-switch-on" aria-hidden="true">✓</span>
      <span class="pc-switch-icon pc-switch-off" aria-hidden="true">✕</span>
      <span class="pc-switch-knob" aria-hidden="true"></span>
    </button>`;
  }

  function renderCookie(c) {
    const L = TEXT.cookieLabels;
    return `<dl class="pc-cookie">
      <dt>${safe(L.name)}</dt><dd>${safe(c.name || "")}</dd>
      <dt>${safe(L.duration)}</dt><dd>${safe(c.duration || "")}</dd>
      <dt>${safe(L.description)}</dt><dd>${safe(c.description || "")}</dd>
      <dt>${safe(L.party)}</dt><dd>${safe(c.party || "")}</dd>
      <dt>${safe(L.domain)}</dt><dd>${safe(c.domain || "")}</dd>
    </dl>`;
  }

  // One accordion row. `control` sits between the title and the chevron (toggle or text).
  function renderItem(tab, id, title, control, body) {
    const open = ui.pcOpen?.[tab] === id;
    const bodyId = `pc-body-${tab}-${id}`;
    return `<div class="pc-acc-item ${open ? "open" : ""}" data-pc-item="${safe(id)}">
      <div class="pc-acc-head">
        <button type="button" class="pc-acc-trigger" data-act="pc-toggle-acc" data-arg="${safe(tab)}:${safe(id)}"
          aria-expanded="${open}" aria-controls="${bodyId}">${safe(title)}</button>
        ${control}
        <button type="button" class="pc-acc-chevron" data-act="pc-toggle-acc" data-arg="${safe(tab)}:${safe(id)}"
          aria-label="${open ? "Collapse" : "Expand"} ${safe(title)}" tabindex="-1">${CHEVRON}</button>
      </div>
      <div class="pc-acc-body" id="${bodyId}" role="region" aria-label="${safe(title)}">
        <div class="pc-acc-inner">${body}</div>
      </div>
    </div>`;
  }

  // Legal basis for a purpose, under its description
  function renderPurposeMeta(cat) {
    const rows = [];
    if (cat.legalBasis) rows.push(`<div><dt>${safe(TEXT.legalBasis)}</dt><dd>${safe(labelOf(LEGAL_BASES, cat.legalBasis))}</dd></div>`);
    return rows.length ? `<dl class="pc-meta">${rows.join("")}</dl>` : "";
  }

  function renderPurposes(text) {
    const choices = ui.pcChoices;
    return `<h3 class="pc-title">${safe(text.title)}</h3>
      ${renderIntro(text.intro)}
      <div class="pc-acc">
        ${preferenceCategories(state, ui.region || "EEA & UK").map(cat => renderItem(
          "purposes", cat.id, cat.name,
          cat.required ? `<span class="pc-always">${safe(TEXT.alwaysAllow)}</span>` : renderSwitch(cat, Boolean(choices[cat.id])),
          `${cat.description ? `<p class="pc-desc">${safe(cat.description)}</p>` : ""}
           ${renderPurposeMeta(cat)}
           ${cat.cookies.length
              ? `<div class="pc-cookies" tabindex="0" aria-label="${safe(cat.name)} list">${cat.cookies.map(renderCookie).join("")}</div>`
              : `<p class="pc-empty">${safe(TEXT.noCookies)}</p>`}`,
        )).join("")}
      </div>
      <div class="pc-vendors-row">
        <button type="button" class="pc-link" data-act="cc-preview-open-vendors">${safe(text.vendorList)}</button>
      </div>`;
  }

  function renderBlock(block, text) {
    if (block.type === "heading") return `<h5 class="pc-sub">${safe(block.text)}</h5>`;
    if (block.type === "audit") {
      return `<div class="pc-audit">
        <div class="pc-audit-label">${safe(block.label)}</div>
        <div class="pc-audit-id" data-pc-audit>${safe(ui.pcAuditId)}</div>
        <button type="button" class="pc-link pc-audit-reset" data-act="pc-reset-audit">${safe(block.reset)}</button>
      </div>`;
    }
    const parts = String(block.text).split("{link}").map(safe);
    const link = block.link
      ? `<a class="pc-link" href="${safe(text.privacyUrl)}" target="_blank" rel="noopener">${safe(block.link)}</a>`
      : "";
    return `<p class="pc-desc">${parts.join(link)}</p>`;
  }

  function renderPrivacy(text) {
    return `<div class="pc-privacy-head">
        <h4>${safe(TEXT.privacyHeading)}</h4>
        <p>${safe(TEXT.privacySubheading)}</p>
      </div>
      <div class="pc-acc">
        ${PRIVACY_INFO.map(item => renderItem("privacy", item.id, item.title, "", item.blocks.map(b => renderBlock(b, text)).join(""))).join("")}
        ${contactItem()}
      </div>`;
  }

  function renderPreferenceCenter({ fullscreen = false } = {}) {
    if (!ui.pcOpen) resetPreferenceCenterUi(ui);
    if (!ui.pcAuditId) ui.pcAuditId = newAuditId();
    if (!ui.pcChoices) ui.pcChoices = initialChoices(state, ui.region || "EEA & UK");

    const draft = state.draft || {};
    const config = draft.config || {};
    const text = copy();
    const tab = ui.pcTab === "privacy" ? "privacy" : "purposes";
    const layout = preferenceLayoutOf(draft);
    const theme = draft.theme === "dark" ? "dark" : "light";
    const accent = draft.accent || "#0F6CBD";
    const b = brandingOf(draft);
    const font = (FONT_OPTIONS[b.fontFamily] || FONT_OPTIONS.system).stack;
    const style = `--pc-accent:${safe(accent)};--pc-on-accent:${textOn(accent)};--pc-radius:${safe(draft.borderRadius || "8px")};--pc-font:${safe(font)};--pc-scale:${FONT_SCALES[b.fontScale] || 1};`;
    const showDisable = config.showDisabledButton !== false;

    return `<div class="pc-overlay pc-layout-${layout} pc-theme-${theme} ${fullscreen ? "pc-fullscreen" : ""}" style="${style}">
      <div class="pc-modal" role="dialog" aria-modal="true" aria-label="${safe(text.title)}">
        <header class="pc-header">
          ${headerBrand()}
          <nav class="pc-tabs" role="tablist" aria-label="Preference Center sections">
            ${[["purposes", TEXT.tabs.purposes], ["privacy", TEXT.tabs.privacy]].map(([id, label]) => `
              <button type="button" role="tab" class="pc-tab ${tab === id ? "active" : ""}" aria-selected="${tab === id}"
                data-act="pc-tab" data-arg="${id}">${safe(label)}</button>`).join("")}
          </nav>
          <div class="pc-header-tools">
            ${renderLanguagePicker(draft, context.ALL_LANGUAGES, safe, "pc-lang")}
            <button type="button" class="pc-icon-btn pc-expand" data-act="pc-fullscreen" data-arg="${fullscreen ? "off" : "on"}"
              title="${fullscreen ? "Show inside the preview" : "Open full size"}" aria-label="${fullscreen ? "Show inside the preview" : "Open full size"}">
              ${fullscreen ? SHRINK : EXPAND}
            </button>
            ${config.showCloseButton !== false ? `<button type="button" class="pc-icon-btn pc-close" data-act="pc-close" aria-label="Close">${CLOSE}</button>` : ""}
          </div>
        </header>

        <div class="pc-content" data-pc-scroll role="tabpanel">
          ${tab === "purposes" ? renderPurposes(text) : renderPrivacy(text)}
        </div>

        <footer class="pc-footer">
          <div class="pc-actions">
            ${tab === "purposes"
              ? `<button type="button" class="pc-btn pc-btn-save" data-act="pc-save">${safe(text.save)}</button>`
              : showDisable ? `<button type="button" class="pc-btn pc-btn-disable" data-act="pc-disable-all">${safe(text.disableAll)}</button>` : ""}
            <button type="button" class="pc-btn pc-btn-accept" data-act="pc-accept-all">${safe(text.acceptAll)}</button>
          </div>
          <div class="pc-footer-meta">
            <span class="pc-policies">${footerLinks(text)}</span>
            ${config.showWatermark !== false ? `<span class="pc-powered">${safe(TEXT.poweredBy)} ${privacySek("sm")}</span>` : ""}
          </div>
        </footer>
      </div>
    </div>`;
  }

  return { renderPreferenceCenter };
}
