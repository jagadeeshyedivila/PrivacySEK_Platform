// Requests list: search, filters, sorting, pagination, CSV export and manual creation.
export function createRequestsRenderer(ctx) {
  const { runtime, ui, safe, STAGES, REQUEST_TYPES, DATE_RANGES, dueIn, isClosed, inRange, statusPill, dueBadge, formatDate, dis } = ctx;

  const TYPE_CHIPS = [["all", "All"], ...REQUEST_TYPES.map(t => [t.id, t.id])];

  // The list the table shows, before pagination (also used for the CSV export)
  function filtered() {
    const q = ui.reqSearch.toLowerCase().trim();
    const list = ctx.state.requests.filter(r => {
      if (!inRange(r)) return false;
      if (ui.reqStatus && r.status !== ui.reqStatus) return false;
      if (ui.reqType !== "all" && r.type !== ui.reqType) return false;
      if (!q) return true;
      return `${r.id} ${r.first} ${r.last} ${r.email} ${r.type} ${r.channel}`.toLowerCase().includes(q);
    });
    const dir = ui.reqDir === "asc" ? 1 : -1;
    const val = r => ui.reqSort === "due" ? (isClosed(r) ? Infinity : dueIn(r))
      : ui.reqSort === "name" ? `${r.first} ${r.last}`.toLowerCase()
      : ui.reqSort === "created" ? new Date(r.created).getTime()
      : String(r[ui.reqSort] ?? "").toLowerCase();
    return list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  }

  function render() {
    const rows = filtered();
    const pageSize = ui.reqPageSize;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    ui.reqPage = Math.min(Math.max(1, ui.reqPage), pages);
    const paged = rows.slice((ui.reqPage - 1) * pageSize, ui.reqPage * pageSize);
    ui.reqPagedIds = paged.map(r => r.id);

    const inPeriod = ctx.state.requests.filter(inRange);
    const typeCount = id => id === "all" ? inPeriod.length : inPeriod.filter(r => r.type === id).length;

    const cols = [
      { key: "id", label: "Request", width: "15%", sortable: true },
      { key: "name", label: "Data principal", width: "21%", sortable: true },
      { key: "type", label: "Type", width: "15%", sortable: true },
      { key: "channel", label: "Channel", width: "13%", sortable: true },
      { key: "status", label: "Status", width: "13%", sortable: true },
      { key: "due", label: "Due in", width: "10%", sortable: true },
      { key: "created", label: "Received", width: "13%", sortable: true },
    ];

    const tableRows = paged.map(r => [
      `<button class="rr-link rr-mono" data-act="rr-open-request" data-arg="${safe(r.id)}">${safe(r.id)}</button>`,
      `<div class="rr-cell-2"><b>${safe(r.first)} ${safe(r.last)}</b><small>${safe(r.email)}</small></div>`,
      `<div class="rr-cell-2"><span>${safe(r.type)}</span><small>${safe(ctx.typeRef(r.type))}</small></div>`,
      `<div class="rr-cell-2"><span>${safe(r.channel)}</span><small>${safe(r.language)}</small></div>`,
      statusPill(r.status),
      dueBadge(r),
      `<span class="rr-muted">${safe(formatDate(r.created))}</span>`,
    ]);

    return `
      <div class="rr-screen-head">
        <div>
          <h2>Requests</h2>
          <p>Open a request to verify identity, locate data, reply and advance it through each phase.</p>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm" data-act="rr-export-csv">Export CSV</button>
          <button class="btn sm t" data-act="rr-new-request" ${dis()}>+ New request</button>
        </div>
      </div>

      <div class="rr-chips" role="group" aria-label="Filter by request type">
        ${TYPE_CHIPS.map(([id, label]) => `
          <button class="rr-chip ${ui.reqType === id ? "active" : ""}" data-act="rr-req-type" data-arg="${safe(id)}" aria-pressed="${ui.reqType === id}">
            ${safe(label)} <b>${typeCount(id)}</b>
          </button>
        `).join("")}
      </div>

      <section class="card rr-table-card">
        <div class="rr-toolbar">
          <label class="rr-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input type="search" placeholder="Search by name, email or request ID" value="${safe(ui.reqSearch)}" data-input-act="rr-req-search" aria-label="Search requests">
          </label>
          <select data-act="rr-req-status" aria-label="Filter by status">
            <option value="">All statuses</option>
            ${STAGES.concat("Rejected").map(s => `<option ${ui.reqStatus === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <select data-act="rr-range" aria-label="Date range">
            ${DATE_RANGES.map(([v, l]) => `<option value="${v}" ${ui.range === v ? "selected" : ""}>${l}</option>`).join("")}
          </select>
          ${ui.reqSearch || ui.reqStatus || ui.reqType !== "all" ? '<button class="btn sm" data-act="rr-req-clear">Clear filters</button>' : ""}
        </div>
        ${runtime.table(cols, tableRows, {
          id: "rr-requests-table",
          className: "rr-table",
          act: "rr-request-row",
          sortField: ui.reqSort,
          sortDir: ui.reqDir,
          sortAct: "rr-req-sort",
          stickyHeader: true,
          emptyText: "No requests match these filters",
          emptyResetAct: "rr-req-clear",
        })}
        ${runtime.tablePagination({ page: ui.reqPage, pageSize, totalRecords: rows.length, totalPages: pages }, {
          pageAct: "rr-req-page",
          sizeAct: "rr-req-page-size",
          table: "rights-requests",
          unit: "requests",
          sizes: [10, 25, 50],
        })}
      </section>
    `;
  }

  return { render, filtered };
}
