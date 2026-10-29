export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

function renderCookieCategoriesModule() {
  const filter = ui.inventoryCategory || "all";
  const search = (ui.inventorySearch || "").toLowerCase();
  const party = ui.inventoryParty || "all";

  const cookies = state.cookies.filter(c => {
    return (filter === "all" || c.category === filter) &&
      (party === "all" || c.party === party) &&
      `${c.name} ${c.domain} ${c.provider} ${c.description}`.toLowerCase().includes(search);
  });

  const rows = cookies.map(c => [
    `<b>${safe(c.name)}</b><span class="sub">${safe(c.path)} · ${safe(c.duration)}</span>`,
    safe(c.domain),
    safe(c.provider),
    runtime.pill(c.category === "necessary" ? "ok" : "info", state.categories.find(cat => cat.id === c.category)?.name || c.category),
    safe(c.party),
    c.secure ? runtime.pill("ok", "Secure") : runtime.pill("n", "Standard"),
    `<button class="btn sm" data-act="cc-cookie-edit" data-arg="${safe(c.id)}">Edit</button> <button class="btn sm d" data-act="cc-cookie-delete" data-arg="${safe(c.id)}">×</button>`,
  ]);

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <input type="search" placeholder="Search cookies or domains..." value="${safe(ui.inventorySearch || "")}" data-input-act="cc-search-inventory" style="width:240px;height:34px;padding:4px 10px;font-size:12.5px;">
        <select data-act="cc-filter-category" style="height:34px;">
          <option value="all">All Categories</option>
          ${state.categories.map(cat => `<option value="${cat.id}" ${filter === cat.id ? "selected" : ""}>${cat.name}</option>`).join("")}
        </select>
        <select data-act="cc-filter-party" style="height:34px;">
          <option value="all">All Parties</option>
          <option value="First-party" ${party === "First-party" ? "selected" : ""}>First-party</option>
          <option value="Third-party" ${party === "Third-party" ? "selected" : ""}>Third-party</option>
        </select>
      </div>
      <div>
        <button class="btn sm t" data-act="cc-cookie-new">+ Add Cookie</button>
      </div>
    </div>
    ${runtime.card(`Cookie Inventory (${cookies.length} Cookies Found)`, runtime.table(["Cookie Name", "Domain", "Provider", "Category", "Party", "Security", "Actions"], rows), null, true)}
  `;
}

  return {
    renderCookieCategoriesModule
  };
}
