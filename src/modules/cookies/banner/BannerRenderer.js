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
  const { renderConfigSectionForm, renderLanguageSectionForm, renderContentSectionForm, renderBrandingSectionForm, renderLayoutSectionForm, renderPurposesSectionForm, renderFrequencySectionForm, renderVendorsSectionForm } = sections;
  const preview = createBannerPreviewRenderer(context);
  const { renderLivePreviewPane, renderFullscreenPreview } = preview;

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
  if (icon === "brush") {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18.4 2.6a2 2 0 012.9 2.9L11 15.8 8.2 13z"/><path d="M8.2 13c-2.3 0-4 1.8-4 4 0 1.6-.7 2.6-2.2 3 1 .7 2.5 1 4 1 3.3 0 5-2.2 5-5.2z"/></svg>`;
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
  } else if (section === "branding") {
    title = "Branding, Buttons & Typography";
    sub = "Upload your logo, set the brand name, button style and font for the banner and Preference Center";
    content = renderBrandingSectionForm();
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
    sub = "Manage IAB vendors, Google vendors, and signal integration";
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

/* Version history: newest-first list on the left, full detail of the selected version on the right */

const VH_IGNORED_KEYS = new Set(["_id", "key", "updatedAt", "currentEditLanguage", "previewLanguage"]);
const VH_MAX_CHANGES = 60;
let historySelected = null;

function vhHumanize(segment) {
  const text = String(segment);
  if (!/^[a-z][A-Za-z0-9]*$/.test(text)) return text;
  const words = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return (words.charAt(0).toUpperCase() + words.slice(1)).replace(/\b(iab|url|gdpr|ccpa|tcf|gpc)\b/gi, m => m.toUpperCase());
}

// Flattens a banner config to { "Regions › USA › Validity days": value } so two versions can be compared
function vhFlatten(value, path, out) {
  if (Array.isArray(value)) {
    if (value.every(item => item === null || typeof item !== "object")) {
      out[path.join(" › ")] = value;
    } else {
      value.forEach((item, i) => vhFlatten(item, path.concat(String(item?.name ?? item?.id ?? i + 1)), out));
    }
    return out;
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach(k => {
      if (!VH_IGNORED_KEYS.has(k)) vhFlatten(value[k], path.concat(vhHumanize(k)), out);
    });
    return out;
  }
  out[path.join(" › ")] = value;
  return out;
}

function vhDiff(before, after) {
  const a = vhFlatten(before || {}, [], {});
  const b = vhFlatten(after || {}, [], {});
  const changes = [];
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach(path => {
    if (JSON.stringify(a[path]) === JSON.stringify(b[path])) return;
    const kind = !(path in a) ? "added" : !(path in b) ? "removed" : "changed";
    changes.push({ path, kind, before: a[path], after: b[path] });
  });
  return changes;
}

function vhValue(value) {
  if (value === undefined || value === null || value === "") return `<span class="cc-vh-empty">Not set</span>`;
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (Array.isArray(value)) return value.length ? safe(value.join(", ")) : `<span class="cc-vh-empty">None</span>`;
  const text = String(value);
  // An uploaded logo is a data URL: show the image, not thousands of characters
  if (/^data:image\//.test(text)) return `<img class="cc-vh-thumb" src="${safe(text)}" alt="Logo">`;
  const swatch = /^#[0-9a-f]{3,8}$/i.test(text) ? `<i class="cc-vh-swatch" style="background:${safe(text)}"></i>` : "";
  return swatch + safe(text);
}

function vhChangeRow(change) {
  const kindLabel = { added: "Added", removed: "Removed", changed: "Changed" }[change.kind];
  let values;
  if (Array.isArray(change.before) && Array.isArray(change.after)) {
    const added = change.after.filter(item => !change.before.includes(item));
    const removed = change.before.filter(item => !change.after.includes(item));
    values = added.length || removed.length
      ? `${added.map(item => `<span class="cc-vh-new">+ ${safe(String(item))}</span>`).join("")}${removed.map(item => `<span class="cc-vh-old">− ${safe(String(item))}</span>`).join("")}`
      : `<span class="cc-vh-new">Order changed</span>`;
  } else if (change.kind === "added") {
    values = `<span class="cc-vh-new">${vhValue(change.after)}</span>`;
  } else if (change.kind === "removed") {
    values = `<span class="cc-vh-old">${vhValue(change.before)}</span>`;
  } else {
    values = `<span class="cc-vh-old">${vhValue(change.before)}</span><span class="cc-vh-arrow" aria-label="changed to">→</span><span class="cc-vh-new">${vhValue(change.after)}</span>`;
  }
  return `<li class="cc-vh-change">
    <div class="cc-vh-change-path"><span class="cc-vh-kind ${change.kind}">${kindLabel}</span>${safe(change.path)}</div>
    <div class="cc-vh-change-vals">${values}</div>
  </li>`;
}

function vhSnapshot(config) {
  const cfg = config || {};
  const languages = cfg.enabledLanguages || [];
  const regionRows = Object.entries(cfg.regions || {}).map(([name, region]) => `<tr>
      <td><b>${safe(name)}</b></td>
      <td>${region?.enabled !== false ? `<span class="cc-badge ok">Enabled</span>` : `<span class="cc-badge">Disabled</span>`}</td>
      <td>${safe(region?.regulation || "—")}</td>
      <td>${region?.validityDays ? `${safe(String(region.validityDays))} days` : "—"}</td>
      <td>${safe((region?.actions || []).join(", ") || "—")}</td>
    </tr>`).join("");

  return `<dl class="cc-vh-facts">
      <div><dt>Banner title</dt><dd>${vhValue(cfg.title)}</dd></div>
      <div><dt>Layout</dt><dd>${vhValue(cfg.layout)}</dd></div>
      <div><dt>Theme</dt><dd>${vhValue(cfg.theme)}</dd></div>
      <div><dt>Accent</dt><dd>${vhValue(cfg.accent)}</dd></div>
      <div><dt>Preference center</dt><dd>${vhValue(cfg.preference?.layout)}</dd></div>
      <div><dt>Languages (${languages.length})</dt><dd>${vhValue(languages)}</dd></div>
    </dl>
    ${regionRows ? `<div class="cc-vh-table-wrap"><table class="cc-vh-table">
      <thead><tr><th>Region</th><th>Status</th><th>Regulation</th><th>Consent validity</th><th>Banner actions</th></tr></thead>
      <tbody>${regionRows}</tbody>
    </table></div>` : ""}`;
}

function vhDetail(versions, selected, liveVer) {
  const index = versions.findIndex(v => v.version === selected);
  const version = versions[index];
  if (!version) return `<div class="cc-vh-blank">Select a version to see its details.</div>`;
  const previous = versions[index + 1]; // list is newest first
  const isLive = version.version === liveVer;
  const changes = previous ? vhDiff(previous.config, version.config) : [];
  const shown = changes.slice(0, VH_MAX_CHANGES);

  const changesBlock = !previous
    ? `<div class="cc-vh-blank">This is the first published version, so there is nothing earlier to compare it with.</div>`
    : !changes.length
      ? `<div class="cc-vh-blank">No configuration changes from v${previous.version}. This version was republished as is.</div>`
      : `<ul class="cc-vh-changes">${shown.map(vhChangeRow).join("")}</ul>
         ${changes.length > shown.length ? `<div class="cc-vh-more">and ${changes.length - shown.length} more changes</div>` : ""}`;

  return `<div class="cc-vh-detail-head">
      <div>
        <h3>Version ${version.version} ${isLive ? `<span class="cc-badge ok">Live</span>` : `<span class="cc-badge">Archived</span>`}</h3>
        <div class="cc-vh-detail-sub">Published ${safe(dateLabel(version.publishedAt))} · ${safe(getRelativeTime(version.publishedAt))}</div>
      </div>
      ${isLive
        ? `<span class="cc-vh-live-note">Serving visitors now</span>`
        : `<button class="btn sm t" data-act="cc-restore-version" data-arg="${version.version}" title="Copy this version into the working draft">Restore to draft</button>`}
    </div>

    <dl class="cc-vh-facts">
      <div><dt>Published by</dt><dd>${safe(version.publishedBy || "Platform Administrator")}</dd></div>
      <div><dt>Changes</dt><dd>${previous ? `${changes.length} since v${previous.version}` : "Initial version"}</dd></div>
    </dl>

    <section class="cc-vh-section">
      <h4>Release notes</h4>
      <p class="cc-vh-notes">${safe(version.note || "No release notes were added for this version.")}</p>
    </section>

    <section class="cc-vh-section">
      <h4>${previous ? `What changed since v${previous.version}` : "What changed"}</h4>
      ${changesBlock}
    </section>

    <section class="cc-vh-section">
      <h4>Configuration in this version</h4>
      ${vhSnapshot(version.config)}
    </section>

    ${isLive ? "" : `<div class="cc-note">Restoring copies this version into your working draft. Visitors keep seeing v${liveVer} until you publish again.</div>`}`;
}

function showPublishHistoryModal(selectedArg) {
  const versions = (state.versions || []).slice().sort((a, b) => b.version - a.version);
  const liveVer = versions[0]?.version;
  const asked = selectedArg != null && selectedArg !== "" ? Number(selectedArg) : null;
  const open = document.querySelector(".cc-vh");

  // Picking a version inside the open modal: swap the detail pane, keep the list scroll position
  if (open && asked != null && versions.some(v => v.version === asked)) {
    historySelected = asked;
    open.querySelectorAll(".cc-vh-item").forEach(item => {
      const active = item.getAttribute("data-arg") === String(asked);
      item.classList.toggle("active", active);
      item.setAttribute("aria-current", active ? "true" : "false");
    });
    const detail = open.querySelector(".cc-vh-detail");
    detail.innerHTML = vhDetail(versions, asked, liveVer);
    detail.scrollTop = 0;
    return;
  }

  historySelected = versions.some(v => v.version === asked) ? asked : liveVer;

  if (!versions.length) {
    runtime.modal("Banner Publication History", "Version history", `<div class="cc-vh-blank">Nothing has been published yet. Publish the banner to create version 1.</div>`, `<button class="btn" data-act="close">Close</button>`);
    return;
  }

  const items = versions.map((v, i) => {
    const previous = versions[i + 1];
    const count = previous ? vhDiff(previous.config, v.config).length : null;
    const active = v.version === historySelected;
    return `<li>
      <button class="cc-vh-item ${active ? "active" : ""}" data-act="cc-open-publish-history" data-arg="${v.version}" aria-current="${active ? "true" : "false"}">
        <span class="cc-vh-item-top">
          <b>v${v.version}</b>
          ${v.version === liveVer ? `<span class="cc-badge ok">Live</span>` : ""}
          <span class="cc-vh-item-time" title="${safe(dateLabel(v.publishedAt))}">${safe(getRelativeTime(v.publishedAt))}</span>
        </span>
        <span class="cc-vh-item-note">${safe(v.note || "No release notes")}</span>
        <span class="cc-vh-item-meta">${safe(v.publishedBy || "Platform Administrator")} · ${count === null ? "Initial version" : `${count} change${count === 1 ? "" : "s"}`}</span>
      </button>
    </li>`;
  }).join("");

  const body = `<div class="cc-vh">
    <nav class="cc-vh-list" aria-label="Published versions">
      <div class="cc-vh-list-head">${versions.length} version${versions.length === 1 ? "" : "s"} · newest first</div>
      <ol>${items}</ol>
    </nav>
    <div class="cc-vh-detail">${vhDetail(versions, historySelected, liveVer)}</div>
  </div>`;

  runtime.modal("Banner Publication History", `v${liveVer} is live`, body, `<button class="btn" data-act="close">Close</button>`, "cc-vh-modal");
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
    renderFullscreenPreview,
    showPublishHistoryModal
  };
}
