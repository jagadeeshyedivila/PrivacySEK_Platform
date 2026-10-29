export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

  function renderConsentRecordsModule() {
    const search = (ui.recordsSearch || "").toLowerCase();
    const region = ui.recordsRegion || "all";
    const action = ui.recordsAction || "all";
    const sortBy = ui.recordsSortBy || "timestamp";
    const sortOrder = ui.recordsSortOrder || "desc";

    // Determine records source: paginated server records or in-memory
    let recordsList = [];
    let totalRecords = 0;

    if (Array.isArray(state.paginatedConsentRecords) && state.paginatedConsentRecords.length) {
      recordsList = state.paginatedConsentRecords;
      totalRecords = ui.recordsTotal || recordsList.length;
    } else {
      let filtered = (state.consentRecords || []).filter(r => {
        const matchSearch = !search || `${r.id || ''} ${r.region || ''} ${r.action || ''} ${r.device || ''}`.toLowerCase().includes(search);
        const matchRegion = region === "all" || r.region === region;
        const matchAction = action === "all" || r.action === action;
        return matchSearch && matchRegion && matchAction;
      });

      filtered.sort((a, b) => {
        let valA = a[sortBy] ?? '';
        let valB = b[sortBy] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      totalRecords = ui.recordsTotal || filtered.length;
      const pageSize = ui.recordsPageSize || 25;
      const currentPage = Math.max(1, ui.recordsPage || 1);
      recordsList = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    }

    const pageSize = ui.recordsPageSize || 25;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPage = Math.min(totalPages, Math.max(1, ui.recordsPage || 1));

    const columns = [
      { key: "id", label: "Receipt ID", width: "22%", sortable: true },
      { key: "timestamp", label: "Timestamp", width: "18%", sortable: true },
      { key: "action", label: "Visitor Action", width: "15%", sortable: true },
      { key: "region", label: "Region", width: "14%", sortable: true },
      { key: "device", label: "Device", width: "11%", sortable: true },
      { key: "categories", label: "Approved Purposes", width: "20%" },
    ];

    const rows = recordsList.map((r, idx) => {
      const copyIdBtn = runtime.copyButton ? runtime.copyButton(r.id, `Copy receipt ID: ${r.id}`) : '';
      const purposes = safe(
        Object.keys(r.categories || {})
          .filter(k => r.categories[k])
          .map(k => state.categories?.find(c => c.id === k)?.name || k)
          .join(", ") || "None"
      );

      return [
        `
          <div style="display:flex;align-items:center;gap:6px;max-width:100%;">
            <b class="cell-mono cell-truncate" style="font-size:12px;" title="${safe(r.id)}">${safe(r.id)}</b>
            ${copyIdBtn}
          </div>
        `,
        `<span class="cell-mono" style="font-size:11.5px;color:var(--text-2);">${safe(dateLabel(r.timestamp))}</span>`,
        runtime.pill(
          r.action === "Accept All" ? "ok" : (r.action === "Disable All" || r.action === "Reject All") ? "risk" : "info",
          r.action
        ),
        `<span class="cell-truncate" title="${safe(r.region)}">${safe(r.region)}</span>`,
        `<span class="cell-truncate">${safe(r.device)}</span>`,
        `<span class="cell-truncate" style="font-size:11.5px;color:var(--text-3);" title="${purposes}">${purposes}</span>`,
      ];
    });

    const regionsList = Array.from(new Set((state.consentRecords || []).map(r => r.region).filter(Boolean)));
    const actionsList = ["Accept All", "Reject All", "Disable All", "Save Preferences", "Customize", "Close"];

    const toolbarHtml = runtime.tableToolbar ? runtime.tableToolbar({
      title: "Immutable Consent Records & Receipts",
      description: "Cryptographically verifiable log of all consent actions, granular choices, and policy receipts.",
      badge: `${totalRecords.toLocaleString()} Receipts`,
      search: {
        value: ui.recordsSearch || "",
        placeholder: "Search receipt ID, region, action...",
        inputAct: "cc-records-search",
        clearAct: "cc-records-clear-search",
      },
      filters: [
        {
          label: "Region",
          act: "cc-records-filter-region",
          value: region,
          options: [
            { value: "all", label: "All Regions" },
            ...regionsList.map(reg => ({ value: reg, label: reg })),
          ],
        },
        {
          label: "Action",
          act: "cc-records-filter-action",
          value: action,
          options: [
            { value: "all", label: "All Actions" },
            ...actionsList.map(actName => ({ value: actName, label: actName })),
          ],
        },
      ],
      actions: [
        `<button class="btn sm" data-act="cc-export-csv" title="Export filtered records to CSV">Export Records (CSV)</button>`,
      ],
    }) : `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div>
          <h3 style="margin:0;font-size:15px;">Immutable Consent Records & Receipts</h3>
          <span class="sub">Auditable proof of user privacy decisions and consent telemetry</span>
        </div>
        <button class="btn sm" data-act="cc-export-csv">Export Records (CSV)</button>
      </div>
    `;

    const tableHtml = runtime.table(columns, rows, {
      act: "cc-consent-record-details",
      id: "cc-records-table",
      sortField: sortBy,
      sortDir: sortOrder,
      sortAct: "cc-records-sort",
      stickyHeader: true,
      loading: ui.recordsLoading,
      emptyText: search || region !== "all" || action !== "all" ? "No consent receipts match your active filters" : "No consent records collected yet",
      emptyResetAct: "cc-records-reset-filters",
    });

    const paginationHtml = runtime.tablePagination ? runtime.tablePagination({
      page: currentPage,
      pageSize,
      totalRecords,
      totalPages,
    }, {
      pageAct: "cc-records-page",
      sizeAct: "cc-records-page-size",
      table: "records",
      unit: "receipts",
      sizes: [10, 25, 50, 100],
    }) : '';

    return `
      ${runtime.card("Recent Consent Receipts", `
        ${toolbarHtml}
        ${tableHtml}
        ${paginationHtml}
      `, null, true)}
    `;
  }

  return {
    renderConsentRecordsModule
  };
}
