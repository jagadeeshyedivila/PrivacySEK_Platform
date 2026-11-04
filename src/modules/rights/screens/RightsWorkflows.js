// Workflows: the process template applied to each regulation and request type.
export function createWorkflowsRenderer(ctx) {
  const { runtime, ui, safe, formatDate, dis } = ctx;

  function filtered() {
    const q = ui.wfSearch.toLowerCase().trim();
    const list = ctx.state.workflows.filter(w => !q || `${w.name} ${w.regulation} ${w.requestType}`.toLowerCase().includes(q));
    const dir = ui.wfDir === "asc" ? 1 : -1;
    const val = w => ["created", "updated"].includes(ui.wfSort) ? new Date(w[ui.wfSort]).getTime() : String(w[ui.wfSort] ?? "").toLowerCase();
    return list.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  }

  function render() {
    const rows = filtered();
    const pages = Math.max(1, Math.ceil(rows.length / ui.wfPageSize));
    ui.wfPage = Math.min(Math.max(1, ui.wfPage), pages);
    const paged = rows.slice((ui.wfPage - 1) * ui.wfPageSize, ui.wfPage * ui.wfPageSize);
    ui.wfPagedIds = paged.map(w => w.id);
    const inUse = name => ctx.state.requests.filter(r => r.workflow === name && !ctx.isClosed(r)).length;

    const cols = [
      { key: "name", label: "Workflow", width: "30%", sortable: true },
      { key: "regulation", label: "Regulation", width: "11%", sortable: true },
      { key: "status", label: "Status", width: "10%", sortable: true },
      { key: "slaDays", label: "SLA", width: "9%", sortable: true },
      { key: "open", label: "Open requests", width: "12%", align: "right" },
      { key: "updatedBy", label: "Last updated by", width: "15%", sortable: true },
      { key: "updated", label: "Updated", width: "13%", sortable: true },
    ];
    const tableRows = paged.map(w => [
      `<button class="rr-link" data-act="rr-view-workflow" data-arg="${safe(w.id)}"><b>${safe(w.name)}</b></button>`,
      `<span class="rr-reg">${safe(w.regulation)}</span>`,
      runtime.pill(w.status === "Active" ? "ok" : "n", w.status),
      `${Number(w.slaDays) || 30} days`,
      `<b>${inUse(w.name)}</b>`,
      safe(w.updatedBy),
      `<span class="rr-muted">${safe(formatDate(w.updated))}</span>`,
    ]);

    return `
      <div class="rr-screen-head">
        <div>
          <h2>Workflows</h2>
          <p>Each workflow sets the phases and response deadline for one regulation and request type.</p>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm t" data-act="rr-new-workflow" ${dis()}>+ New workflow</button>
        </div>
      </div>
      <section class="card rr-table-card">
        <div class="rr-toolbar">
          <label class="rr-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input type="search" placeholder="Search workflows" value="${safe(ui.wfSearch)}" data-input-act="rr-wf-search" aria-label="Search workflows">
          </label>
        </div>
        ${runtime.table(cols, tableRows, {
          id: "rr-workflows-table",
          className: "rr-table",
          act: "rr-workflow-row",
          sortField: ui.wfSort,
          sortDir: ui.wfDir,
          sortAct: "rr-wf-sort",
          stickyHeader: true,
          emptyText: "No workflows match your search",
        })}
        ${runtime.tablePagination({ page: ui.wfPage, pageSize: ui.wfPageSize, totalRecords: rows.length, totalPages: pages }, {
          pageAct: "rr-wf-page",
          sizeAct: "rr-wf-page-size",
          table: "rights-workflows",
          unit: "workflows",
          sizes: [10, 25, 50],
        })}
      </section>
    `;
  }

  return { render };
}
