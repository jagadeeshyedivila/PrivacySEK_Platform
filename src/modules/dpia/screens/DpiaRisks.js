// Risk register: every risk recorded on any assessment, in the workbook's Risk Register shape.
import { riskScores, formatScore, riskOverdue, isRiskOpen, allQuestions } from "../dpiaModel.js";
import { RISK_STATUSES, PRIORITIES, RAG_ORDER } from "../dpiaConfig.js";

export function createRisksRenderer(ctx) {
  const { ui, safe, ragPill, formatDate } = ctx;

  function all() {
    return ctx.state.assessments.flatMap(a => (a.risks || []).map((r, k) => ({ r, k, a })));
  }
  const statusOk = r => ui.rStatus === "all" || (ui.rStatus === "open" ? isRiskOpen(r) : ui.rStatus === "overdue" ? riskOverdue(r) : r.status === ui.rStatus);
  function filtered() {
    const q = ui.rSearch.trim().toLowerCase();
    return all().filter(({ r, a }) =>
      statusOk(r) &&
      (!ui.rRag || riskScores(r).rag === ui.rRag) &&
      (!ui.rPriority || r.priority === ui.rPriority) &&
      (!ui.rOwner || r.owner === ui.rOwner) &&
      (!ui.rActivity || r.activityId === ui.rActivity) &&
      (!q || [r.id, r.title, r.scenario, r.owner, r.treatment, r.threat, r.harm, a.name, a.id].some(v => String(v || "").toLowerCase().includes(q))))
      .sort((x, y) => (riskScores(y.r).residual ?? 0) - (riskScores(x.r).residual ?? 0));
  }

  function render() {
    const rows = filtered();
    const base = all().filter(x => statusOk(x.r));
    const n = l => base.filter(x => !l || riskScores(x.r).rag === l).length;
    const chip = (v, l) => `<button class="dp-chip ${ui.rRag === v ? "active" : ""}" data-act="dp-r-rag" data-arg="${v}" aria-pressed="${ui.rRag === v}">${l} <b>${n(v)}</b></button>`;
    const select = (act, label, cur, opts) => `<select data-act="${act}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${safe(v)}" ${cur === v ? "selected" : ""}>${safe(l)}</option>`).join("")}</select>`;
    const acts = ctx.ropaActivities();
    const usedActs = acts.filter(x => all().some(({ r }) => r.activityId === x.id));
    const code = (a, r) => { const q = r.questionId && allQuestions(a).find(x => x.q.id === r.questionId); return q ? (q.q.code || q.num) : "—"; };
    return `
      <div class="dp-screen-head">
        <div><h2>Risk register</h2><p>Every risk recorded on an assessment. Inherent = likelihood × impact; residual = inherent × (1 − control effectiveness ÷ 5). RAG: 1–5 GREEN, 6–12 AMBER, 13–25 RED.</p></div>
        <div class="dp-head-actions"><button class="btn sm" data-act="dp-risks-csv">Export CSV</button></div>
      </div>
      <div class="dp-chips" role="group" aria-label="Filter by RAG">${chip("", "All")}${RAG_ORDER.slice().reverse().map(l => chip(l, l)).join("")}</div>
      <div class="card dp-table-card">
        <div class="dp-toolbar">
          <label class="dp-search"><span aria-hidden="true">⌕</span>
            <input id="dp-r-search" type="search" placeholder="Search risk, owner, treatment or assessment" value="${safe(ui.rSearch)}" data-input-act="dp-r-search" aria-label="Search risks"></label>
          ${select("dp-r-status", "Risk status", ui.rStatus, [["open", "Not closed"], ["overdue", "Overdue"], ["all", "All statuses"]].concat(RISK_STATUSES.map(s => [s, s])))}
          ${select("dp-r-priority", "Priority", ui.rPriority, [["", "Any priority"]].concat(PRIORITIES.map(p => [p, p])))}
          ${select("dp-r-owner", "Owner", ui.rOwner, [["", "Any owner"]].concat(ctx.PEOPLE.map(p => [p.name, p.name])))}
          ${select("dp-r-activity", "Processing activity", ui.rActivity, [["", "Any activity"]].concat(usedActs.map(x => [x.id, `${x.id} ${x.name}`])))}
          <span class="dp-sp"></span><span class="dp-muted">${rows.length} risk${rows.length === 1 ? "" : "s"}</span>
        </div>
        <div class="tw"><table class="t dp-table dp-risk-table" id="dp-risks-table">
          <thead><tr><th>Risk</th><th>Question</th><th>Activity</th><th title="Likelihood">L</th><th title="Impact">I</th><th>Inherent</th><th title="Control effectiveness">CE</th><th>Residual</th><th>RAG</th><th>Owner</th><th>Target</th><th>Status</th><th>Priority</th><th>Acceptance</th></tr></thead>
          <tbody>${rows.map(({ r, a }) => {
            const sc = riskScores(r);
            const acc = r.acceptance || {};
            const late = riskOverdue(r);
            return `
            <tr class="click" data-act="dp-open-risks" data-arg="${safe(a.id)}">
              <td><div class="dp-cell-2 is-wide"><button class="dp-link" data-act="dp-open-risks" data-arg="${safe(a.id)}"><span class="dp-mono">${safe(r.id)}</span> ${safe(r.title)}</button>
                <small>${safe(a.name)} · ${safe(r.treatment || "No treatment recorded")}</small></div></td>
              <td>${code(a, r) !== "—" ? `<span class="dp-code">${safe(code(a, r))}</span>` : "—"}</td>
              <td>${safe(r.activityId || "—")}</td>
              <td>${safe(r.likelihood)}</td><td>${safe(r.impact)}</td><td>${formatScore(sc.inherent, 0)}</td>
              <td>${safe(r.controlEffectiveness)}</td><td>${formatScore(sc.residual)}</td><td>${ragPill(sc.rag)}</td>
              <td>${safe(r.owner || "—")}</td>
              <td>${r.targetDate ? `<span class="dp-due ${late ? "is-late" : ""}">${late ? "Overdue · " : ""}${safe(formatDate(r.targetDate))}</span>` : "—"}</td>
              <td>${safe(r.status)}</td><td>${safe(r.priority)}</td>
              <td>${acc.decision ? `<span title="${safe(acc.rationale)}">${safe(acc.decision)}${acc.escalatedTo ? ` → ${safe(acc.escalatedTo)}` : ""}</span>` : "—"}</td>
            </tr>`;
          }).join("") || '<tr><td colspan="14"><div class="dp-empty">No risks match these filters. <button class="btn sm" data-act="dp-r-clear">Clear filters</button></div></td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  }
  return { render, filtered };
}
