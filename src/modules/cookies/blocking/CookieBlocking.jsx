export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

  function renderAutoBlockingModule() {
    const search = (ui.blockingSearch || "").toLowerCase().trim();
    const categoryFilter = ui.blockingCategory || "all";
    const statusFilter = ui.blockingStatus || "all";

    const allTags = state.blockedTags || [];
    const filteredTags = allTags.filter(item => {
      const matchSearch = !search || `${item.host || ''} ${item.source || ''} ${item.name || ''}`.toLowerCase().includes(search);
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });

    const columns = [
      { key: "host", label: "Host & Script URL", width: "36%" },
      { key: "type", label: "Resource Type", width: "14%" },
      { key: "category", label: "Mapped Purpose", width: "20%" },
      { key: "status", label: "Status", width: "16%" },
      { key: "actions", label: "Actions", width: "14%", align: "right" },
    ];

    const rows = filteredTags.map(item => {
      const copyHostBtn = runtime.copyButton ? runtime.copyButton(item.host, `Copy host: ${item.host}`) : '';
      const copyUrlBtn = runtime.copyButton && item.source ? runtime.copyButton(item.source, `Copy script URL`) : '';

      return [
        `
          <div style="display:flex;align-items:flex-start;gap:6px;max-width:100%;">
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:6px;">
                <b class="cell-mono cell-truncate" style="font-size:12px;" title="${safe(item.host)}">${safe(item.host)}</b>
                ${copyHostBtn}
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                <span class="sub cell-mono cell-truncate" style="font-size:11px;color:var(--text-3);" title="${safe(item.source)}">
                  ${safe(item.source)}
                </span>
                ${copyUrlBtn}
              </div>
            </div>
          </div>
        `,
        safe(item.type || 'JavaScript'),
        runtime.pill("info", state.categories?.find(c => c.id === item.category)?.name || item.category),
        runtime.pill(item.status === "Enabled" ? "ok" : "risk", item.status),
        `
          <div style="display:flex;gap:4px;justify-content:flex-end;">
            <button class="btn sm" data-act="cc-tag-edit" data-arg="${safe(item.id)}" title="Edit script rule">Edit</button>
            <button class="btn sm d" data-act="cc-tag-delete" data-arg="${safe(item.id)}" title="Delete tag rule">×</button>
          </div>
        `,
      ];
    });

    const toolbarHtml = runtime.tableToolbar ? runtime.tableToolbar({
      title: "Auto Cookie Blocking & Script Rules",
      description: "Hold third-party scripts dynamically until user opt-in is confirmed.",
      badge: `${allTags.length} Rules Configured`,
      search: {
        value: ui.blockingSearch || "",
        placeholder: "Search host, script URL...",
        inputAct: "cc-search-blocking",
        clearAct: "cc-clear-blocking-search",
      },
      filters: [
        {
          label: "Category",
          act: "cc-filter-blocking-cat",
          value: categoryFilter,
          options: [
            { value: "all", label: "All Categories" },
            ...(state.categories || []).map(cat => ({ value: cat.id, label: cat.name })),
          ],
        },
        {
          label: "Status",
          act: "cc-filter-blocking-status",
          value: statusFilter,
          options: [
            { value: "all", label: "All Statuses" },
            { value: "Enabled", label: "Enabled" },
            { value: "Disabled", label: "Disabled" },
          ],
        },
      ],
      actions: [
        `<button class="btn sm t" data-act="cc-tag-new">+ Add Script Tag</button>`,
      ],
    }) : `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div>
          <h3 style="margin:0;font-size:15px;">Auto Cookie Blocking & Script Rules</h3>
          <span class="sub">Hold third-party scripts dynamically until user opt-in is confirmed</span>
        </div>
        <button class="btn sm t" data-act="cc-tag-new">+ Add Script Tag</button>
      </div>
    `;

    return `
      ${runtime.card("Configured Dynamic Blocking Tags", `
        ${toolbarHtml}
        ${runtime.table(columns, rows, {
          id: "cc-blocking-table",
          stickyHeader: true,
          emptyText: search || categoryFilter !== "all" || statusFilter !== "all" ? "No script blocking rules match your filters" : "No script tags configured",
          emptyResetAct: "cc-reset-blocking-filters",
        })}
      `, null, true)}
    `;
  }

  return {
    renderAutoBlockingModule
  };
}
