export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

function renderAutoBlockingModule() {
  const rows = state.blockedTags.map(item => [
    `<b>${safe(item.host)}</b><span class="sub">${safe(item.source)}</span>`,
    safe(item.type),
    safe(state.categories.find(c => c.id === item.category)?.name || item.category),
    runtime.pill(item.status === "Enabled" ? "ok" : "risk", item.status),
    `<button class="btn sm" data-act="cc-tag-edit" data-arg="${safe(item.id)}">Edit</button> <button class="btn sm d" data-act="cc-tag-delete" data-arg="${safe(item.id)}">×</button>`,
  ]);

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
      <div>
        <h3 style="margin:0;font-size:15px;">Auto Cookie Blocking & Script Rules</h3>
        <span class="sub">Hold third-party scripts dynamically until user opt-in is confirmed</span>
      </div>
      <button class="btn sm t" data-act="cc-tag-new">+ Add Script Tag</button>
    </div>
    ${runtime.card("Configured Dynamic Blocking Tags", runtime.table(["Host", "Script URL", "Mapped Purpose", "Status", "Actions"], rows), null, true)}
  `;
}

  return {
    renderAutoBlockingModule
  };
}
