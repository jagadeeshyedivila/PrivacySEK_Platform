// Risk register: every risk recorded on any assessment, with inherent and residual scores.
import { inherentLevel, residualLevel, LEVEL_ORDER, LIKELIHOOD, IMPACT } from "../dpiaModel.js";

export function createRisksRenderer(ctx) {
  const { ui, safe, levelPill, statusPill } = ctx;

  function all() {
    return ctx.state.assessments.flatMap(a => (a.risks || []).map((r, k) => ({ r, k, a })));
  }
  function filtered() {
    const q = ui.rSearch.trim().toLowerCase();
    return all().filter(({ r, a }) =>
      (ui.rStatus === "all" || (ui.rStatus === "open" ? r.status !== "Closed" : r.status === ui.rStatus)) &&
      (!ui.rLevel || residualLevel(r) === ui.rLevel) &&
      (!q || [r.title, r.desc, r.owner, r.mitigation, a.name].some(v => String(v || "").toLowerCase().includes(q))))
      .sort((x, y) => LEVEL_ORDER.indexOf(residualLevel(y.r)) - LEVEL_ORDER.indexOf(residualLevel(x.r)));
  }

  function render() {
    const rows = filtered();
    const base = all().filter(x => ui.rStatus === "all" || (ui.rStatus === "open" ? x.r.status !== "Closed" : x.r.status === ui.rStatus));
    const n = l => base.filter(x => !l || residualLevel(x.r) === l).length;
    const chip = (v, l) => `<button class="dp-chip ${ui.rLevel === v ? "active" : ""}" data-act="dp-r-level" data-arg="${v}" aria-pressed="${ui.rLevel === v}">${l} <b>${n(v)}</b></button>`;
    return `
      <div class="dp-screen-head">
        <div><h2>Risk register</h2><p>Risks recorded on every assessment. Residual risk is the score after the mitigation is in place.</p></div>
        <div class="dp-head-actions"><button class="btn sm" data-act="dp-risks-csv">Export CSV</button></div>
      </div>
      <div class="dp-chips" role="group" aria-label="Filter by residual level">${chip("", "All levels")}${LEVEL_ORDER.slice().reverse().map(l => chip(l, l)).join("")}</div>
      <div class="card dp-table-card">
        <div class="dp-toolbar">
          <label class="dp-search"><span aria-hidden="true">⌕</span>
            <input id="dp-r-search" type="search" placeholder="Search risk, owner, mitigation or assessment" value="${safe(ui.rSearch)}" data-input-act="dp-r-search" aria-label="Search risks"></label>
          <select data-act="dp-r-status" aria-label="Risk status">
            ${[["open", "Not closed"], ["all", "All statuses"], ["Open", "Open"], ["Mitigating", "Mitigating"], ["Accepted", "Accepted"], ["Closed", "Closed"]].map(([v, l]) => `<option value="${v}" ${ui.rStatus === v ? "selected" : ""}>${l}</option>`).join("")}
          </select>
          <span class="dp-sp"></span><span class="dp-muted">${rows.length} risk${rows.length === 1 ? "" : "s"}</span>
        </div>
        <div class="tw"><table class="t dp-table" id="dp-risks-table">
          <thead><tr><th>Risk</th><th>Assessment</th><th>Inherent</th><th>Residual</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>${rows.map(({ r, a }) => `
            <tr class="click" data-act="dp-open-risks" data-arg="${safe(a.id)}">
              <td><div class="dp-cell-2 is-wide"><button class="dp-link" data-act="dp-open-risks" data-arg="${safe(a.id)}">${safe(r.title)}</button>
                <small>${safe(r.mitigation || "No mitigation recorded")}</small></div></td>
              <td><div class="dp-cell-2"><span>${safe(a.name)}</span><small>${statusPill(a.status)}</small></div></td>
              <td title="${LIKELIHOOD[r.l - 1]} × ${IMPACT[r.i - 1]}">${levelPill(inherentLevel(r))}</td>
              <td title="${LIKELIHOOD[(r.rl || r.l) - 1]} × ${IMPACT[(r.ri || r.i) - 1]}">${levelPill(residualLevel(r))}</td>
              <td>${safe(r.owner || "—")}</td>
              <td>${safe(r.status)}</td>
            </tr>`).join("") || '<tr><td colspan="6"><div class="dp-empty">No risks match these filters.</div></td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  }
  return { render, filtered };
}
