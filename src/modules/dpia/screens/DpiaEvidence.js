// Evidence register: documents, records and system evidence cited by assessments. One record can
// support many questions and many assessments.
export function createEvidenceRenderer(ctx) {
  const { ui, safe, formatDate, dis } = ctx;
  const cited = e => ctx.state.assessments.some(a => Object.values(a.controls || {}).some(c => (c.evidenceIds || []).includes(e.id)));
  const FILTERS = [
    ["all", "All", () => true],
    ["expired", "Expired", e => ctx.evidenceExpired(e)],
    ["insufficient", "Insufficient or pending", e => ["Insufficient", "Partially Sufficient", "Pending"].includes(e.sufficiency)],
    ["unused", "Not cited", e => !cited(e)],
  ];

  function filtered() {
    const f = (FILTERS.find(x => x[0] === ui.eFilter) || FILTERS[0])[2];
    const q = ui.eSearch.trim().toLowerCase();
    return (ctx.state.evidence || []).filter(f).filter(e => !q || [e.id, e.title, e.description, e.owner, e.type, (e.questionIds || []).join(" ")].some(v => String(v || "").toLowerCase().includes(q)));
  }

  function render() {
    const all = ctx.state.evidence || [];
    const rows = filtered();
    const can = ctx.canEdit();
    const suffTone = s => (s === "Sufficient" ? "ok" : s === "Insufficient" ? "block" : "risk");
    return `
      <div class="dp-screen-head">
        <div><h2>Evidence</h2><p>Policies, contracts, records and system evidence behind checklist answers. Evidence past its validity date is flagged on every control that cites it.</p></div>
        <div class="dp-head-actions">
          <button class="btn sm" data-act="dp-evidence-csv">Export CSV</button>
          <button class="btn sm t" data-act="dp-ev-new" ${dis(can)}>+ New evidence</button>
        </div>
      </div>
      <div class="dp-chips" role="group" aria-label="Filter evidence">
        ${FILTERS.map(([v, l, fn]) => `<button class="dp-chip ${ui.eFilter === v ? "active" : ""}" data-act="dp-e-filter" data-arg="${v}" aria-pressed="${ui.eFilter === v}">${l} <b>${all.filter(fn).length}</b></button>`).join("")}
      </div>
      <div class="card dp-table-card">
        <div class="dp-toolbar">
          <label class="dp-search"><span aria-hidden="true">⌕</span>
            <input id="dp-e-search" type="search" placeholder="Search title, owner, type or question code" value="${safe(ui.eSearch)}" data-input-act="dp-e-search" aria-label="Search evidence"></label>
          <span class="dp-sp"></span><span class="dp-muted">${rows.length} of ${all.length}</span>
        </div>
        <div class="tw"><table class="t dp-table" id="dp-evidence-table">
          <thead><tr><th>Evidence</th><th>Type</th><th>Owner</th><th>Valid until</th><th>Sufficiency</th><th>Reliability</th><th>Questions</th><th>Assessments</th><th></th></tr></thead>
          <tbody>${rows.map(e => {
            const exp = ctx.evidenceExpired(e);
            return `
            <tr>
              <td><div class="dp-cell-2 is-wide"><b><span class="dp-mono">${safe(e.id)}</span> ${safe(e.title)}</b>
                <small>${safe(e.description || "")}${e.ropaDocId || e.ropaPolicyId ? ` · <button class="dp-link" data-go="ropa">${safe(e.ropaDocId || e.ropaPolicyId)} in Data Map ↗</button>` : ""}${e.followUp ? ` · <em>${safe(e.followUp)}</em>` : ""}</small></div></td>
              <td>${safe(e.type)}</td>
              <td>${safe(e.owner || "—")}</td>
              <td><span class="dp-due ${exp ? "is-late" : ""}">${exp ? "Expired · " : ""}${safe(formatDate(e.validUntil))}</span></td>
              <td>${ctx.runtime.pill(suffTone(e.sufficiency), e.sufficiency)}</td>
              <td>${safe(e.reliability)}</td>
              <td><div class="dp-codes">${(e.questionIds || []).map(c => `<span class="dp-code">${safe(c)}</span>`).join("") || "—"}</div></td>
              <td>${(e.assessmentIds || []).map(id => `<button class="dp-link" data-act="dp-open" data-arg="${safe(id)}">${safe(id)}</button>`).join(" ") || '<span class="dp-muted">Not cited</span>'}</td>
              <td class="dp-row-actions"><button class="btn sm" data-act="dp-ev-edit" data-arg="${safe(e.id)}" ${dis(can)}>Edit</button>
                <button class="dp-icon-btn" data-act="dp-ev-delete" data-arg="${safe(e.id)}" ${dis(can)} aria-label="Delete ${safe(e.id)}" title="Delete evidence">🗑</button></td>
            </tr>`;
          }).join("") || '<tr><td colspan="9"><div class="dp-empty">No evidence matches.</div></td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  }
  return { render, filtered };
}
