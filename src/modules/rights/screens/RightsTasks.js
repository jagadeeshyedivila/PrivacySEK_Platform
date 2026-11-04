// Tasks: every task added on a request, in one place.
export function createTasksRenderer(ctx) {
  const { runtime, ui, safe, dueBadge, dis } = ctx;

  function render() {
    const all = ctx.state.requests.flatMap(r => (r.tasks || []).map(t => ({ ...t, request: r })));
    const q = ui.taskSearch.toLowerCase().trim();
    const list = all.filter(t => {
      if (ui.taskFilter === "open" && t.done) return false;
      if (ui.taskFilter === "done" && !t.done) return false;
      return !q || `${t.title} ${t.request.id} ${t.request.first} ${t.request.last}`.toLowerCase().includes(q);
    }).sort((a, b) => ctx.dueIn(a.request) - ctx.dueIn(b.request));
    const openCount = all.filter(t => !t.done).length;

    const cols = [
      { key: "done", label: "", width: "6%" },
      { key: "title", label: "Task", width: "34%" },
      { key: "request", label: "Request", width: "24%" },
      { key: "status", label: "Request status", width: "18%" },
      { key: "due", label: "Due in", width: "18%" },
    ];
    const rows = list.map(t => [
      `<input type="checkbox" class="rr-task-check" aria-label="Mark “${safe(t.title)}” done" data-change-act="rr-toggle-task" data-request="${safe(t.request.id)}" data-task="${safe(t.id)}" ${t.done ? "checked" : ""} ${dis()}>`,
      `<span class="${t.done ? "rr-strike" : ""}">${safe(t.title)}</span>`,
      `<div class="rr-cell-2"><button class="rr-link rr-mono" data-act="rr-open-request" data-arg="${safe(t.request.id)}">${safe(t.request.id)}</button><small>${safe(t.request.first)} ${safe(t.request.last)} · ${safe(t.request.type)}</small></div>`,
      ctx.statusPill(t.request.status),
      dueBadge(t.request),
    ]);

    return `
      <div class="rr-screen-head">
        <div>
          <h2>Tasks</h2>
          <p>${openCount} open tasks across all requests, soonest deadline first.</p>
        </div>
      </div>
      <section class="card rr-table-card">
        <div class="rr-toolbar">
          <div class="rr-seg" role="group" aria-label="Show tasks">
            ${[["open", "Open"], ["done", "Done"], ["all", "All"]].map(([id, label]) => `
              <button class="${ui.taskFilter === id ? "active" : ""}" data-act="rr-task-filter" data-arg="${id}" aria-pressed="${ui.taskFilter === id}">${label}</button>
            `).join("")}
          </div>
          <label class="rr-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input type="search" placeholder="Search tasks or requests" value="${safe(ui.taskSearch)}" data-input-act="rr-task-search" aria-label="Search tasks">
          </label>
        </div>
        ${runtime.table(cols, rows, { id: "rr-tasks-table", className: "rr-table", stickyHeader: true, emptyText: ui.taskFilter === "open" ? "No open tasks" : "No tasks found" })}
      </section>
    `;
  }

  return { render };
}
