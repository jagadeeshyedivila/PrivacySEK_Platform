// Dashboard: workload, deadlines, risk exposure and Data Map coverage.
import { progress, residualLevel, LEVEL_ORDER } from "../dpiaModel.js";

export function createDashboardRenderer(ctx) {
  const { safe, formatDate, statusPill, dueBadge, levelPill, STATUSES } = ctx;

  function hbars(rows, tone) {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="dp-hbars">${rows.map(([label, n, act, arg, cls]) => `
      <button class="dp-hbar" ${act ? `data-act="${act}" data-arg="${safe(arg)}"` : "disabled"} title="${safe(label)}: ${n}">
        <span class="dp-hbar-l">${safe(label)}</span>
        <span class="dp-hbar-t"><span class="dp-hbar-f ${cls || tone || ""}" style="width:${(n / max) * 100}%"></span></span>
        <span class="dp-hbar-v">${n}</span>
      </button>`).join("")}</div>`;
  }

  function render() {
    const A = ctx.state.assessments;
    const open = A.filter(a => ctx.OPEN_STATUSES.includes(a.status));
    const overdue = A.filter(a => ctx.isOverdue(a));
    const soon = open.filter(a => !ctx.isOverdue(a) && ctx.daysLeft(a.due) <= 7);
    const review = A.filter(a => a.status === "Under review");
    const approved = A.filter(a => a.status === "Approved");
    const avgDays = approved.length ? Math.round(approved.reduce((n, a) => n + (new Date(a.completedAt) - new Date(a.created)) / 864e5, 0) / approved.length) : 0;
    const risks = A.flatMap(a => (a.risks || []).filter(r => !["Closed"].includes(r.status)).map(r => ({ ...r, a })));
    const highRisks = risks.filter(r => ["High", "Critical"].includes(residualLevel(r)));

    // Data Map activities flagged as needing a DPIA that have no assessment
    const linked = new Set(A.map(a => a.activityId).filter(Boolean));
    const gaps = ctx.ropaActivities().filter(x => x.dpia === "Yes" && !linked.has(x.id));
    const undecided = ctx.ropaActivities().filter(x => x.dpia === "Not yet decided" && !linked.has(x.id));

    const kpi = (label, value, sub, cls, act, arg) => `
      <button class="dp-kpi" ${act ? `data-act="${act}" data-arg="${arg}"` : "disabled"}>
        <span>${label}</span><strong class="${cls || ""}">${value}</strong><small>${sub}</small></button>`;

    const attention = [...overdue, ...soon.filter(a => !overdue.includes(a)), ...review.filter(a => !overdue.includes(a) && !soon.includes(a))].slice(0, 6);

    return `
      <div class="dp-kpis">
        ${kpi("Open", open.length, `${A.length} assessments in total`, "", "dp-goto-status", "")}
        ${kpi("Waiting for review", review.length, review.length ? "Oldest submitted " + formatDate(review.map(a => a.submittedAt).sort()[0]) : "Nothing waiting", review.length ? "is-warn" : "", "dp-goto-status", "Under review")}
        ${kpi("Overdue", overdue.length, `${soon.length} more due within 7 days`, overdue.length ? "is-risk" : "is-ok", "dp-goto-status", "Overdue")}
        ${kpi("Approved", approved.length, avgDays ? `Average ${avgDays} days from start to approval` : "None yet", "is-ok", "dp-goto-status", "Approved")}
        ${kpi("High residual risks", highRisks.length, `${risks.length} open risks across assessments`, highRisks.length ? "is-risk" : "is-ok", "dp-goto-risks", "High")}
      </div>
      <div class="dp-dash-grid">
        <section class="card"><div class="card-h"><h3>Needs attention</h3><div class="r"><button class="btn sm" data-act="dp-tab" data-arg="assessments">All assessments</button></div></div>
          ${attention.length ? `<div class="dp-due-list">${attention.map(a => `
            <button class="dp-due-row" data-act="dp-open" data-arg="${safe(a.id)}">
              <span class="dp-due-name"><b>${safe(a.name)}</b><small>${safe(a.who)} · ${progress(a)}% answered</small></span>
              ${statusPill(a.status)}${dueBadge(a)}
            </button>`).join("")}</div>` : '<div class="card-b dp-empty">Nothing overdue, due soon or waiting for review.</div>'}
        </section>
        <section class="card"><div class="card-h"><h3>Assessments by status</h3></div><div class="card-b">
          ${hbars(STATUSES.map(s => [s, A.filter(a => a.status === s).length, "dp-goto-status", s]))}
        </div></section>
        <section class="card"><div class="card-h"><h3>Open risks by residual level</h3><div class="r"><button class="btn sm" data-act="dp-tab" data-arg="risks">Risk register</button></div></div><div class="card-b">
          ${hbars(LEVEL_ORDER.slice().reverse().map(l => [l, risks.filter(r => residualLevel(r) === l).length, "dp-goto-risks", l, "lv-" + l.toLowerCase()]))}
        </div></section>
        <section class="card"><div class="card-h"><h3>Data Map coverage</h3><div class="r"><button class="btn sm" data-go="ropa">Open Data Map</button></div></div><div class="card-b">
          ${gaps.length || undecided.length ? `
            <p class="dp-muted">Processing activities that need a DPIA but have no assessment yet.</p>
            <ul class="dp-gaps">
              ${gaps.map(x => `<li><span><b>${safe(x.name)}</b><small>${safe(x.id)} · ${safe(x.bu || "")} · DPIA required</small></span>
                <button class="btn sm t" data-act="dp-new-assessment" data-arg="|${safe(x.id)}" ${ctx.dis(ctx.role().send)}>Start DPIA</button></li>`).join("")}
              ${undecided.map(x => `<li><span><b>${safe(x.name)}</b><small>${safe(x.id)} · ${safe(x.bu || "")} · not yet decided</small></span>
                <button class="btn sm" data-act="dp-new-assessment" data-arg="tpl-dpia|${safe(x.id)}" ${ctx.dis(ctx.role().send)}>Run screening</button></li>`).join("")}
            </ul>` : '<p class="dp-empty">Every activity that needs a DPIA has one.</p>'}
        </div></section>
      </div>
      ${highRisks.length ? `
        <section class="card"><div class="card-h"><h3>High and critical residual risks</h3></div>
          <div class="dp-due-list">${highRisks.slice(0, 5).map(r => `
            <button class="dp-due-row" data-act="dp-open-risks" data-arg="${safe(r.a.id)}">
              <span class="dp-due-name"><b>${safe(r.title)}</b><small>${safe(r.a.name)} · ${safe(r.owner || "No owner")}</small></span>
              ${levelPill(residualLevel(r))}<span class="dp-muted">${safe(r.status)}</span>
            </button>`).join("")}</div>
        </section>` : ""}`;
  }
  return { render };
}
