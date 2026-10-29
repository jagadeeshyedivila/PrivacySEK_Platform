export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

function renderConsentRecordsModule() {
  const records = state.consentRecords.slice(0, 15);
  const rows = records.map(r => [
    `<b>${safe(r.id)}</b>`,
    safe(dateLabel(r.timestamp)),
    runtime.pill(r.action === "Accept All" ? "ok" : (r.action === "Disable All" || r.action === "Reject All") ? "risk" : "info", r.action),
    safe(r.region),
    safe(r.device),
    safe(Object.keys(r.categories).filter(k => r.categories[k]).map(k => state.categories.find(c => c.id === k)?.name || k).join(", ")),
  ]);

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div>
        <h3 style="margin:0;font-size:15px;">Immutable Consent Records & Receipts</h3>
        <span class="sub">Auditable proof of user privacy decisions and consent telemetry</span>
      </div>
      <button class="btn sm" data-act="cc-export-csv">Export Records (CSV)</button>
    </div>
    ${runtime.card("Recent Consent Receipts", runtime.table(["Receipt ID", "Timestamp", "Action", "Region", "Device", "Approved Purposes"], rows, "cc-consent-record-details"), null, true)}
  `;
}

  return {
    renderConsentRecordsModule
  };
}
