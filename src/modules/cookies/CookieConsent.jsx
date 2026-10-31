import ModuleView from "../../components/ModuleView.jsx";
import { cookieApi } from "./cookieApi.js";
import {
  createCookieDemoState,
  resetCookieDemoState,
  saveCookieDemoState,
  createDefaultBannerConfig,
  ALL_LANGUAGES,
  LANGUAGE_TRANSLATIONS,
  REGION_COUNTRY_OPTIONS,
} from "./cookieData.js";
import { CONFIG_NAV_SECTIONS, REGIONS, TOP_TABS, createCookieUiState } from "./cookieConfig.js";
import { createBannerRenderer } from "./banner/BannerRenderer.js";
import { createRenderer as createInventoryRenderer } from "./inventory/CookieInventory.jsx";
import { createRenderer as createScannerRenderer } from "./scanner/CookieScanner.jsx";
import { createRenderer as createImplementationRenderer } from "./implementation/CookieImplementation.jsx";
import { createRenderer as createBlockingRenderer } from "./blocking/CookieBlocking.jsx";
import { createRenderer as createRecordsRenderer } from "./records/ConsentRecords.jsx";
import { createRenderer as createAnalyticsRenderer } from "./analytics/CookieAnalytics.jsx";
import { registerActions as registerBannerActions } from "./actions/bannerActions.js";
import { registerActions as registerInventoryActions } from "./actions/inventoryActions.js";
import { registerActions as registerScannerActions } from "./actions/scannerActions.js";
import { registerActions as registerImplementationActions } from "./actions/implementationActions.js";
import { registerActions as registerBlockingActions } from "./actions/blockingActions.js";
import { registerActions as registerRecordDetailsActions } from "./actions/recordDetailsActions.js";
import "./cookieConsent.css";

let state;
let runtime;
let ui = createCookieUiState();

const clone = value => JSON.parse(JSON.stringify(value));
const isoNow = () => new Date().toISOString();
const dateLabel = value => value ? new Date(value).toLocaleString() : "—";
const dateOnly = value => value ? new Date(value).toLocaleDateString() : "—";
const safe = value => runtime.esc(String(value ?? ""));

function readDialogField(element, selector) {
  const dialog = element?.closest('[role="dialog"]');
  return dialog?.querySelector(selector)?.value;
}

function validateScanSeeds(baseValue, additionalValues, pageLimit) {
  let val = String(baseValue || "").trim();
  if (!val) {
    return { error: "Target website URL is required. Enter a valid website URL." };
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(val);
  if (hasScheme && !/^https?:\/\//i.test(val)) {
    return { error: "Website URL must use HTTP or HTTPS protocol." };
  }
  if (!hasScheme) {
    val = "https://" + val;
  }

  let baseUrl;
  try {
    baseUrl = new URL(val);
  } catch {
    return { error: "Enter a valid website URL (e.g., https://example.com)." };
  }

  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    return { error: "Website URL must use HTTP or HTTPS protocol." };
  }
  if (!baseUrl.hostname || (!baseUrl.hostname.includes(".") && baseUrl.hostname !== "localhost")) {
    return { error: "Enter a valid website domain name or hostname." };
  }

  baseUrl.hash = "";
  const urls = [baseUrl.href];

  for (const rawValue of additionalValues) {
    const value = String(rawValue || "").trim();
    if (!value) continue;
    let url;
    try {
      url = new URL(value, baseUrl);
      url.hash = "";
    } catch {
      return { error: `Enter a valid URL or path for "${value}".` };
    }
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== baseUrl.origin) {
      return { error: `Additional scan URL "${value}" must stay on the same origin (${baseUrl.origin}).` };
    }
    if (!urls.includes(url.href)) urls.push(url.href);
  }

  if (Number.isInteger(pageLimit) && pageLimit > 0 && urls.length > pageLimit) {
    return { error: `The page budget (${pageLimit}) must be at least as large as the ${urls.length} configured seed URLs.` };
  }
  return { baseUrl: baseUrl.href, urls };
}

function nextScanScheduleDate(frequency, fromDate = new Date()) {
  const next = new Date(fromDate);
  if (frequency === "Daily") next.setDate(next.getDate() + 1);
  else if (frequency === "Monthly") next.setMonth(next.getMonth() + 1);
  else {
    next.setDate(next.getDate() + ((7 - next.getDay()) % 7 || 7));
    next.setHours(9, 0, 0, 0);
  }
  return next.toISOString();
}

function getRelativeTime(isoString) {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function persist(message) {
  if (state?.draft) {
    cookieApi.saveDraft(state.draft).catch(err => {
      console.warn("Could not save banner draft to MongoDB:", err.message);
    });
  }
  if (message) runtime.toast(message);
  runtime.render();
}

function recordConsent(action, categories = state.visitor.categories, source = "Consent banner") {
  const newRecord = {
    property: "demo.privacysek.example",
    timestamp: isoNow(),
    action,
    categories: { ...categories, necessary: true },
    result: action === "Close" ? "No change" : (action === "Disable All" || action === "Reject All") ? "Optional categories off" : "Choice recorded",
    version: state.versions[state.versions.length - 1]?.version || 1,
    source,
    device: ui.device || "Desktop",
    region: ui.region || "EEA & UK",
  };
  cookieApi.recordConsent(newRecord).then(saved => {
    state.consentRecords.unshift(saved);
  }).catch(() => {
    state.consentRecords.unshift({
      id: `receipt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      ...newRecord,
    });
  });
}

function getActiveTranslations(langName) {
  return LANGUAGE_TRANSLATIONS[langName] || LANGUAGE_TRANSLATIONS["English (United States)"];
}

/* ========================================================================= */
/* 1. TOP-LEVEL & SECONDARY HEADERS                                          */
/* ========================================================================= */

let renderers;
let backendSynced = false;

function getCookieConsentContext() {
  return {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
    persist, recordConsent, readDialogField, validateScanSeeds, nextScanScheduleDate,
    cookieApi,
  };
}

export function createCookieConsentView(moduleRuntime) {
  runtime = moduleRuntime;
  if (!state) {
    state = createCookieDemoState();
  }

  if (!backendSynced) {
    backendSynced = true;
    cookieApi.getState().then(data => {
      if (data) {
        if (Array.isArray(data.cookies)) state.cookies = data.cookies;
        if (Array.isArray(data.categories)) state.categories = data.categories;
        if (data.draft) state.draft = data.draft;
        if (data.published) state.published = data.published;
        if (Array.isArray(data.versions) && data.versions.length) state.versions = data.versions;
        if (Array.isArray(data.blockedTags)) state.blockedTags = data.blockedTags;
        if (Array.isArray(data.availableTags)) state.availableTags = data.availableTags;
        if (Array.isArray(data.consentRecords)) state.consentRecords = data.consentRecords;
        if (Array.isArray(data.pageViews) && data.pageViews.length) state.pageViews = data.pageViews;
        runtime.render();
      }
    }).catch(err => {
      console.warn("Could not load cookie state from MongoDB backend:", err.message);
    });
  }
  state.schedules = Array.isArray(state.schedules) ? state.schedules : [];
  state.scans = Array.isArray(state.scans) ? state.scans : [];
  const scanCount = state.scans.length;
  state.scans = state.scans.filter(scan => !["scan-initial", "scan-previous"].includes(scan.id));
  let recoveredRunningScan = state.scans.length !== scanCount;
  state.scans.forEach(scan => {
    if (scan.status === "Running") {
      scan.status = "Interrupted";
      scan.completedAt = null;
      scan.resultNote = "Previous scan session ended before completing.";
      recoveredRunningScan = true;
    }
  });
  if (recoveredRunningScan) saveCookieDemoState(state);

  const context = getCookieConsentContext();
  renderers = {
    banner: createBannerRenderer(context),
    inventory: createInventoryRenderer(context),
    scanner: createScannerRenderer(context),
    implementation: createImplementationRenderer(context),
    blocking: createBlockingRenderer(context),
    records: createRecordsRenderer(context),
    analytics: createAnalyticsRenderer(context),
  };
  context.renderers = renderers;

  return function renderCookieConsent() {
    const activeTopTab = ui.topTab || "builder";

    let body = "";
    if (activeTopTab === "builder") {
      body = `
        <div class="privacysek-banner-config">
          ${renderers.banner.renderSecondaryHeader()}
          <div class="cc-workspace-grid">
            ${renderers.banner.renderConfigSidebar()}
            ${renderers.banner.renderConfigEditor()}
            ${renderers.banner.renderLivePreviewPane()}
          </div>
        </div>
      `;
    } else if (activeTopTab === "inventory") {
      body = renderers.inventory.renderCookieCategoriesModule();
    } else if (activeTopTab === "scanner") {
      body = renderers.scanner.renderCookieScannerModule();
    } else if (activeTopTab === "install") {
      body = renderers.implementation.renderImplementationModule();
    } else if (activeTopTab === "blocking") {
      body = renderers.blocking.renderAutoBlockingModule();
    } else if (activeTopTab === "records") {
      body = renderers.records.renderConsentRecordsModule();
    } else if (activeTopTab === "dashboard") {
      body = renderers.analytics.renderDashboardModule();
    }

    return `
      ${renderers.banner.renderTopNavigation(activeTopTab)}
      <div class="page cc-page">
        ${body}
      </div>
    `;
  };
}

/* ========================================================================= */
/* 8. REGISTER ACTIONS                                                       */
/* ========================================================================= */

export function registerCookieConsentActions(moduleRuntime, ACT) {
  runtime = moduleRuntime;
  const context = getCookieConsentContext();
  context.renderers = renderers;
  registerBannerActions(context, ACT);
  registerInventoryActions(context, ACT);
  registerScannerActions(context, ACT);
  registerImplementationActions(context, ACT);
  registerBlockingActions(context, ACT);
  registerRecordDetailsActions(context, ACT);
}

export default function CookieConsent({ html }) {
  return <ModuleView html={html} />;
}
