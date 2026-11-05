// Tasks: reviews and mitigation actions that come out of assessments.
export function createTasksRenderer(ctx) {
  const { ui, safe, formatDate, dis } = ctx;
  const late = t => t.status !== "Done" && t.due && new Date(t.due + "T23:59:59") < Date.now();
  const mine = t => t.owner === ctx.currentUser.name;
  const FILTERS = [["open", "Open", t => t.status !== "Done"], ["mine", "Mine", t => mine(t) && t.status !== "Done"], ["late", "Overdue", late], ["done", "Done", t => t.status === "Done"], ["all", "All", () => true]];
  const canChange = t => ctx.canEdit() && (ctx.role().fillAny || mine(t));

  function render() {
    const tasks = ctx.state.tasks;
    const f = (FILTERS.find(x => x[0] === ui.kFilter) || FILTERS[0])[2];
    const q = ui.kSearch.trim().toLowerCase();
    const name = id => (ctx.state.assessments.find(a => a.id === id) || {}).name || id;
    const rows = tasks.filter(f).filter(t => !q || [t.title, t.owner, name(t.assessment)].some(v => String(v || "").toLowerCase().includes(q)))
      .sort((a, b) => (a.status === "Done") - (b.status === "Done") || String(a.due).localeCompare(String(b.due)));
    return `
      <div class="dp-screen-head">
        <div><h2>Tasks</h2><p>Reviews and mitigation actions. Tasks are created when an assessment is submitted and when you record a mitigation.</p></div>
        <div class="dp-head-actions"><button class="btn sm t" data-act="dp-task-new" ${dis(ctx.role().send)}>+ New task</button></div>
      </div>
      <div class="dp-chips" role="group" aria-label="Filter tasks">
        ${FILTERS.map(([v, l, fn]) => `<button class="dp-chip ${ui.kFilter === v ? "active" : ""}" data-act="dp-k-filter" data-arg="${v}" aria-pressed="${ui.kFilter === v}">${l} <b>${tasks.filter(fn).length}</b></button>`).join("")}
      </div>
      <div class="card dp-table-card">
        <div class="dp-toolbar">
          <label class="dp-search"><span aria-hidden="true">⌕</span>
            <input id="dp-k-search" type="search" placeholder="Search tasks" value="${safe(ui.kSearch)}" data-input-act="dp-k-search" aria-label="Search tasks"></label>
        </div>
        <ul class="dp-tasks" id="dp-tasks-list">
          ${rows.map(t => `
            <li class="${t.status === "Done" ? "is-done" : ""}">
              <input type="checkbox" class="dp-task-check" data-change-act="dp-task-done" data-id="${safe(t.id)}" ${t.status === "Done" ? "checked" : ""} ${canChange(t) ? "" : "disabled"} aria-label="Mark “${safe(t.title)}” as done">
              <span class="dp-task-b"><b>${safe(t.title)}</b>
                <small><span class="dp-tag">${safe(t.kind)}</span>${t.assessment ? `<button class="dp-link" data-act="dp-open" data-arg="${safe(t.assessment)}">${safe(name(t.assessment))}</button>` : ""}</small></span>
              <span class="dp-task-o">${safe(t.owner)}</span>
              <span class="dp-due ${late(t) ? "is-late" : ""}">${t.status === "Done" ? "Done" : t.due ? (late(t) ? "Overdue · " : "") + safe(formatDate(t.due)) : "No due date"}</span>
              <select data-act="dp-task-status" data-id="${safe(t.id)}" ${canChange(t) ? "" : "disabled"} aria-label="Task status">
                ${["Open", "In progress", "Done"].map(s => `<option ${t.status === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </li>`).join("") || '<li class="dp-empty">No tasks here.</li>'}
        </ul>
      </div>`;
  }
  return { render };
}
