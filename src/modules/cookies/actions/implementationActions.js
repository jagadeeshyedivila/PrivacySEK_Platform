export function registerActions(context, ACT) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
    persist, recordConsent, readDialogField, validateScanSeeds, nextScanScheduleDate, renderers,
  } = context;
  const showPublishHistoryModal = renderers.banner.showPublishHistoryModal;

  // Installation snippet
  ACT["cc-set-install-tab"] = tab => {
    ui.installCmpTab = tab;
    runtime.render();
  };
  ACT["cc-copy-snippet"] = target => {
    const snippetId = ["cc-snippet", "cc-preferences-snippet", "cc-api-endpoint"].includes(target)
      ? target
      : "cc-snippet";
    const snippet = runtime.$(`#${snippetId}`);
    if (!snippet) {
      runtime.toast("The code snippet is unavailable.");
      return;
    }
    const text = snippet.textContent || "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => runtime.toast("Snippet copied to clipboard"))
        .catch(() => runtime.toast("Unable to access the clipboard. Select and copy the script manually."));
    } else {
      runtime.toast("Clipboard access is unavailable. Select and copy the script manually.");
    }
  };

  // Export CSV
  ACT["cc-export-csv"] = () => {
    const headers = ["Receipt ID", "Timestamp", "Action", "Region", "Device", "Categories"];
    const rows = state.consentRecords.map(r => [
      r.id,
      r.timestamp,
      r.action,
      r.region,
      r.device,
      Object.keys(r.categories).filter(k => r.categories[k]).join(";"),
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `privacysek-consent-records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    runtime.toast("Consent records CSV downloaded");
  };


}
