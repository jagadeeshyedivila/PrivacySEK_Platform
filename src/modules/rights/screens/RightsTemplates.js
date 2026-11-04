// Email templates used when replying to data principals from a request.
export function createTemplatesRenderer(ctx) {
  const { runtime, ui, safe, formatDate, dis } = ctx;

  function render() {
    const q = ui.tplSearch.toLowerCase().trim();
    const list = ctx.state.templates.filter(t => !q || t.name.toLowerCase().includes(q));
    const cols = [
      { key: "name", label: "Template", width: "34%" },
      { key: "preview", label: "Preview", width: "36%" },
      { key: "updated", label: "Updated", width: "14%" },
      { key: "actions", label: "", width: "16%", align: "right" },
    ];
    const plain = html => {
      const div = document.createElement("div");
      div.innerHTML = ctx.sanitizeRich(html);
      return div.textContent.replace(/\s+/g, " ").trim();
    };
    const rows = list.map(t => [
      `<div class="rr-cell-2"><b>${safe(t.name)}</b><small class="rr-mono">${safe(t.id)}</small></div>`,
      `<span class="rr-ellipsis" title="${safe(plain(t.body))}">${safe(plain(t.body))}</span>`,
      `<span class="rr-muted">${safe(formatDate(t.updated))}</span>`,
      `<div class="rr-row-end">
        <button class="btn sm" data-act="rr-edit-template" data-arg="${safe(t.id)}" ${dis()}>Edit</button>
        <button class="btn sm d" data-act="rr-delete-template" data-arg="${safe(t.id)}" ${dis()}>Delete</button>
      </div>`,
    ]);

    return `
      <div class="rr-screen-head">
        <div>
          <h2>Email templates</h2>
          <p>Reusable replies. Macros such as [Data Principal Name] are filled in from the request when you use a template.</p>
        </div>
        <div class="rr-head-actions">
          <button class="btn sm t" data-act="rr-new-template" ${dis()}>+ New template</button>
        </div>
      </div>
      <section class="card rr-table-card">
        <div class="rr-toolbar">
          <label class="rr-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input type="search" placeholder="Search templates" value="${safe(ui.tplSearch)}" data-input-act="rr-tpl-search" aria-label="Search templates">
          </label>
        </div>
        ${runtime.table(cols, rows, { id: "rr-templates-table", className: "rr-table", emptyText: "No templates yet" })}
      </section>
    `;
  }

  return { render };
}
