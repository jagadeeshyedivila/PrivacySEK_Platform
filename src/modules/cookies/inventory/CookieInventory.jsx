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
    const sortBy = ui.inventorySortBy || "lastDetected";
    const sortOrder = ui.inventorySortOrder || "desc";

    // Use paginated server data if present, or compute from state.cookies
    let allCookies = Array.isArray(state.cookies) ? state.cookies : [];
    let filtered = allCookies.filter(c => {
      const matchCat = filter === "all" || c.category === filter;
      const matchParty = party === "all" || c.party === party;
      const matchSearch = !search || `${c.name || ''} ${c.domain || ''} ${c.provider || ''} ${c.description || ''}`.toLowerCase().includes(search);
      return matchCat && matchParty && matchSearch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const totalRecords = ui.inventoryTotal || filtered.length;
    const pageSize = ui.inventoryPageSize || 10;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPage = Math.min(totalPages, Math.max(1, ui.inventoryPage || 1));

    // When server paginated records are loaded into state.inventoryCookies, use those; otherwise paginate locally
    const displayCookies = (Array.isArray(state.inventoryCookies) && state.inventoryCookies.length)
      ? state.inventoryCookies
      : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const columns = [
      { key: "name", label: "Cookie Name & Scope", width: "26%", sortable: true },
      { key: "domain", label: "Domain", width: "18%", sortable: true },
      { key: "provider", label: "Provider", width: "14%", sortable: true },
      { key: "category", label: "Category", width: "14%", sortable: true },
      { key: "party", label: "Party", width: "10%", sortable: true },
      { key: "secure", label: "Security & Duration", width: "10%" },
      { key: "actions", label: "Actions", width: "8%", align: "right" },
    ];

    const rows = displayCookies.map(c => {
      const copyNameBtn = runtime.copyButton ? runtime.copyButton(c.name, `Copy cookie name: ${c.name}`) : '';
      const copyDomainBtn = runtime.copyButton ? runtime.copyButton(c.domain, `Copy domain: ${c.domain}`) : '';

      return [
        `
          <div style="display:flex;align-items:flex-start;gap:6px;max-width:100%;">
            <div style="min-width:0;flex:1;">
              <div class="cell-truncate" title="${safe(c.name)}">
                <b class="cell-mono" style="font-size:12px;">${safe(c.name)}</b>
              </div>
              <span class="sub" style="font-size:11px;color:var(--text-3);margin-top:2px;">
                ${safe(c.path || '/')} · ${safe(c.duration || 'Session')}
              </span>
            </div>
            ${copyNameBtn}
          </div>
        `,
        `
          <div style="display:flex;align-items:center;gap:6px;max-width:100%;">
            <span class="cell-truncate cell-mono" style="font-size:11.5px;" title="${safe(c.domain)}">${safe(c.domain)}</span>
            ${copyDomainBtn}
          </div>
        `,
        `<span class="cell-truncate" title="${safe(c.provider)}">${safe(c.provider)}</span>`,
        runtime.pill(c.category === "necessary" ? "ok" : c.category === "analytics" ? "info" : (c.category === "advertising" || c.category === "marketing") ? "risk" : c.category === "functional" ? "mask" : "n", state.categories?.find(cat => cat.id === c.category)?.name || c.category),
        `<span class="cell-truncate">${safe(c.party)}</span>`,
        `
          <div style="display:flex;flex-direction:column;gap:3px;">
            ${c.secure ? runtime.pill("ok", "Secure") : runtime.pill("n", "Standard")}
            ${c.httpOnly ? '<small class="mono" style="color:var(--accent);font-size:10px;">HttpOnly</small>' : ''}
          </div>
        `,
        `
          <div style="display:flex;gap:4px;justify-content:flex-end;">
            <button class="btn sm" data-act="cc-cookie-edit" data-arg="${safe(c.id)}" title="Edit cookie definition">Edit</button>
            <button class="btn sm d" data-act="cc-cookie-delete" data-arg="${safe(c.id)}" title="Delete from inventory">×</button>
          </div>
        `,
      ];
    });

    const toolbarHtml = runtime.tableToolbar ? runtime.tableToolbar({
      title: "Cookie Inventory",
      description: "Manage classification, purpose mappings, and persistence attributes for all discovered cookies.",
      badge: `${totalRecords} Total`,
      search: {
        value: ui.inventorySearch || "",
        placeholder: "Search cookies, domains, providers...",
        inputAct: "cc-search-inventory",
        clearAct: "cc-clear-inventory-search",
      },
      filters: [
        {
          label: "Category",
          act: "cc-filter-category",
          value: filter,
          options: [
            { value: "all", label: "All Categories" },
            ...(state.categories || []).map(cat => ({ value: cat.id, label: cat.name })),
          ],
        },
        {
          label: "Party",
          act: "cc-filter-party",
          value: party,
          options: [
            { value: "all", label: "All Parties" },
            { value: "First-party", label: "First-party" },
            { value: "Third-party", label: "Third-party" },
          ],
        },
      ],
      actions: [
        `<button class="btn sm t" data-act="cc-cookie-new">+ Add Cookie</button>`,
      ],
    }) : `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <input type="search" placeholder="Search cookies or domains..." value="${safe(ui.inventorySearch || "")}" data-input-act="cc-search-inventory" style="width:240px;height:34px;padding:4px 10px;font-size:12.5px;">
          <select data-act="cc-filter-category" style="height:34px;">
            <option value="all">All Categories</option>
            ${(state.categories || []).map(cat => `<option value="${cat.id}" ${filter === cat.id ? "selected" : ""}>${cat.name}</option>`).join("")}
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
    `;

    const tableHtml = runtime.table(columns, rows, {
      id: "cc-inventory-table",
      sortField: sortBy,
      sortDir: sortOrder,
      sortAct: "cc-inventory-sort",
      stickyHeader: true,
      loading: ui.inventoryLoading,
      emptyText: search || filter !== "all" || party !== "all" ? "No cookies match your active filters" : "No cookies in inventory",
      emptyResetAct: "cc-inventory-reset-filters",
    });

    const paginationHtml = runtime.tablePagination ? runtime.tablePagination({
      page: currentPage,
      pageSize,
      totalRecords,
      totalPages,
    }, {
      pageAct: "cc-inventory-page",
      sizeAct: "cc-inventory-page-size",
      table: "inventory",
      unit: "cookies",
      sizes: [10, 25, 50, 100],
    }) : '';

    return `
      <div class="card" style="padding:0;overflow:hidden;">
        ${toolbarHtml}
        ${tableHtml}
        ${paginationHtml}
      </div>
    `;
  }

  return {
    renderCookieCategoriesModule
  };
}
