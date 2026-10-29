import { createBannerSectionsRenderer } from "./BannerSectionsRenderer.js";
import { createBannerPreviewRenderer } from "./BannerPreviewRenderer.js";

export function createBannerRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;
  const sections = createBannerSectionsRenderer(context);
  const { renderConfigSectionForm, renderLanguageSectionForm, renderContentSectionForm, renderLayoutSectionForm, renderPurposesSectionForm, renderFrequencySectionForm, renderVendorsSectionForm } = sections;
  const preview = createBannerPreviewRenderer(context);
  const { renderLivePreviewPane } = preview;

function renderTopNavigation(activeTab) {
  return `<nav class="cc-top-nav" aria-label="Cookie Consent Submodules">
    ${TOP_TABS.map(([id, label]) => `
      <button class="cc-top-nav-btn ${activeTab === id ? "active" : ""}" data-act="cc-top-tab" data-arg="${id}">
        ${safe(label)}
      </button>
    `).join("")}
  </nav>`;
}

function renderSecondaryHeader() {
  const draft = state.draft;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(state.published);
  const lastPublished = state.versions[state.versions.length - 1];
  const lastPublishedTime = getRelativeTime(lastPublished?.publishedAt);
  const activeRegion = ui.region || "EEA & UK";
  const previewMode = ui.previewMode || "banner";

  return `<header class="cc-sub-header">
    <div class="cc-sub-header-left">
      <h2 class="cc-sub-header-title">Banner Configuration</h2>
      <div class="cc-publish-status-pill ${isDirty ? "dirty" : "live"}">
        <span class="cc-status-dot"></span>
        <span>${isDirty ? "Draft (Unsaved changes)" : `Published v${lastPublished?.version || 1}`}</span>
        <span style="opacity:0.6">·</span>
        <span style="font-size:11px">Last published ${safe(lastPublishedTime)}</span>
      </div>
    </div>

    <div class="cc-sub-header-center">
      <div class="cc-region-group" title="Select regional configuration preset">
        ${REGIONS.map(reg => {
          const isEnabled = draft.regions[reg]?.enabled !== false;
          return `<button class="cc-region-btn ${activeRegion === reg ? "active" : ""} ${isEnabled ? "" : "disabled-region"}"
            data-act="cc-set-region" data-arg="${reg}" title="${reg} ${isEnabled ? "(Enabled)" : "(Disabled in config)"}">
            <span class="cc-region-indicator ${isEnabled ? "on" : ""}"></span>
            ${safe(reg)}
          </button>`;
        }).join("")}
      </div>

      <div class="cc-config-view-toggle">
        <button class="cc-config-view-toggle-btn cc-view-toggle-btn ${previewMode === "banner" ? "active" : ""}" data-act="cc-set-preview-mode" data-arg="banner">
          Banner
        </button>
        <button class="cc-config-view-toggle-btn cc-view-toggle-btn ${previewMode === "preference" ? "active" : ""}" data-act="cc-set-preview-mode" data-arg="preference">
          Preference
        </button>
      </div>
    </div>

    <div class="cc-sub-header-actions">
      <button class="btn sm" data-act="cc-reset-banner-confirm" title="Restore default settings">
        Reset to Default
      </button>
      <button class="btn sm" data-act="cc-save-draft" title="Save draft configuration">
        Save
      </button>
      <button class="btn sm t" data-act="cc-publish-modal" title="Publish configuration to production version">
        Publish
      </button>
    </div>
  </header>`;
}

/* ========================================================================= */
/* 2. CONFIGURATION SIDEBAR                                                  */
/* ========================================================================= */

function renderConfigSidebar() {
  const current = ui.builderSection || "config";
  return `<aside class="cc-config-sidebar" aria-label="Configuration Sections">
    ${CONFIG_NAV_SECTIONS.map(([id, label, icon]) => `
      <button class="cc-sidebar-item ${current === id ? "active" : ""}" data-act="cc-set-builder-section" data-arg="${id}">
        ${renderSidebarIcon(icon)}
        <span>${safe(label)}</span>
      </button>
    `).join("")}
  </aside>`;
}

function renderSidebarIcon(icon) {
  if (icon === "gear") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 01-4 0v-.1A1.6 1.6 0 009 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 14H3a2 2 0 010-4h.1A1.6 1.6 0 004.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.6V4a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0019.4 9H20a2 2 0 010 4h-.1a1.6 1.6 0 00-.5 2z"/></svg>`;
  }
  if (icon === "globe") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>`;
  }
  if (icon === "doc") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>`;
  }
  if (icon === "layout") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
  }
  if (icon === "shield") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>`;
  }
  if (icon === "clock") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`;
}

/* ========================================================================= */
/* 3. CONFIGURATION FORMS (THE 7 SECTIONS)                                   */
/* ========================================================================= */

function renderConfigEditor() {
  const section = ui.builderSection || "config";
  let content = "";
  let title = "Configuration";
  let sub = "";

  if (section === "config") {
    title = "Regional & Feature Configuration";
    sub = "Enable regulations, configure regional rules, and manage consent mode";
    content = renderConfigSectionForm();
  } else if (section === "language") {
    title = "Languages & Multi-Language Support";
    sub = "Select multiple supported languages and manage localized translations";
    content = renderLanguageSectionForm();
  } else if (section === "content") {
    title = "Banner & Preference Center Content";
    sub = "Customize notice titles, messages, action buttons, and links";
    content = renderContentSectionForm();
  } else if (section === "layout") {
    title = "Layout, Position & Styling";
    sub = "Choose display formats, dimensions, color schemes, and rounding";
    content = renderLayoutSectionForm();
  } else if (section === "purposes") {
    title = "Purposes & Cookie Categories";
    sub = "Configure purpose presentation, opt-in defaults, and visitor preferences";
    content = renderPurposesSectionForm();
  } else if (section === "frequency") {
    title = "Display Frequency & Revisit";
    sub = "Configure validity periods, returning visitors, and persistent badge";
    content = renderFrequencySectionForm();
  } else if (section === "vendors") {
    title = "Vendors & Frameworks";
    sub = "Manage IAB TCF v2.2 vendors, Google CMP list, and signal integration";
    content = renderVendorsSectionForm();
  }

  return `<div class="cc-config-editor-pane">
    <div class="cc-editor-header">
      <div>
        <h3>${safe(title)}</h3>
        <span class="cc-editor-header-sub">${safe(sub)}</span>
      </div>
    </div>
    <div class="cc-editor-body">
      ${content}
    </div>
  </div>`;
}

/* 3.1 CONFIG SECTION */

function showPublishHistoryModal() {
  const versions = (state.versions || []).slice().reverse();
  const currentVer = versions[0]?.version;

  const cols = [
    { key: "version", label: "Version", width: "16%" },
    { key: "publishedAt", label: "Published Date", width: "22%" },
    { key: "publishedBy", label: "Author", width: "22%" },
    { key: "note", label: "Deployment Notes", width: "26%" },
    { key: "action", label: "Action", width: "14%", align: "right" },
  ];

  const rows = versions.map(v => [
    `<b>v${v.version}</b> ${v.version === currentVer ? `<span class="cc-badge ok" style="margin-left:4px;">Live</span>` : `<span class="cc-badge" style="margin-left:4px;">Archived</span>`}`,
    `<span class="cell-mono" style="font-size:11.5px;color:var(--text-2);">${safe(dateLabel(v.publishedAt))}</span>`,
    `<span class="cell-truncate" title="${safe(v.publishedBy || "Platform Administrator")}">${safe(v.publishedBy || "Platform Administrator")}</span>`,
    `<span class="cell-truncate" style="color:var(--text-3);" title="${safe(v.note || "Standard configuration update")}">${safe(v.note || "Standard configuration update")}</span>`,
    v.version !== currentVer ? `<button class="btn sm" data-act="cc-restore-version" data-arg="${v.version}" title="Restore this configuration to draft">Restore</button>` : `<span class="dim" style="font-size:12px;">Active</span>`,
  ]);

  const body = `
    <div style="margin-bottom:8px;">
      <span class="sub" style="font-size:12px;color:var(--text-3);">Audit timeline of all published banner iterations with one-click revision rollback.</span>
    </div>
    ${runtime.table(cols, rows, {
      id: "cc-banner-history-table",
      className: "cc-history-table",
      stickyHeader: true,
      maxHeight: "360px",
      emptyText: "No past publications recorded.",
    })}
    <div class="cc-note" style="margin-top:12px;">Restoring a past version creates a new working draft with that configuration without overwriting live traffic until published.</div>
  `;

  runtime.modal("Banner Publication History", "Audit timeline and version rollback", body, `<button class="btn" data-act="close">Close</button>`, "drawer-wide");
}

/* ========================================================================= */
/* 6. INTEGRATED SUBMODULES (CATEGORIES, SCANNER, INSTALL, ETC.)             */
/* ========================================================================= */

  return {
    renderTopNavigation,
    renderSecondaryHeader,
    renderConfigSidebar,
    renderSidebarIcon,
    renderConfigEditor,
    renderLivePreviewPane,
    showPublishHistoryModal
  };
}
