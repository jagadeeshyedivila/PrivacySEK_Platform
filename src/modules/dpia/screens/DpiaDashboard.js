// Dashboard: workload, deadlines, RAG exposure, checklist coverage, evidence health and Data Map coverage.
import { progress, riskScores, isRiskOpen, scoredGaps, crosswalk, domainMatrix, usesChecklist, overallRag } from "../dpiaModel.js";
import { RESPONSES, FRAMEWORKS, DOMAINS, ANNUAL_TYPE } from "../dpiaConfig.js";

export function createDashboardRenderer(ctx) {
  const { safe, formatDate, statusPill, dueBadge, ragPill, STATUSES } = ctx;

  function hbars(rows, tone) {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="dp-hbars">${rows.map(([label, n, act, arg, cls, shown]) => `
      <button class="dp-hbar" ${act ? `data-act="${act}" data-arg="${safe(arg)}"` : "disabled"} title="${safe(label)}: ${shown ?? n}">
        <span class="dp-hbar-l">${safe(label)}</span>
        <span class="dp-hbar-t"><span class="dp-hbar-f ${cls || tone || ""}" style="width:${(n / max) * 100}%"></span></span>
        <span class="dp-hbar-v">${shown ?? n}</span>
      </button>`).join("")}</div>`;
  }

  function annualCard(A) {
    const annual = A.filter(a => a.assessmentType === ANNUAL_TYPE);
    const open = annual.find(a => ctx.OPEN_STATUSES.includes(a.status));
    const last = annual.filter(a => a.status === "Approved" && a.completedAt).sort((x, y) => String(y.completedAt).localeCompare(String(x.completedAt)))[0];
    let next = null;
    if (last) { const d = new Date(last.completedAt); d.setFullYear(d.getFullYear() + 1); next = d.toISOString().slice(0, 10); }
    return `
      <section class="card"><div class="card-h"><h3>Annual SDF DPIA (Rule 13)</h3></div><div class="card-b dp-annual">
        ${open ? `<p><b>${safe(open.name)}</b> is ${safe(open.status.toLowerCase())}, due ${safe(formatDate(open.due))} ${dueBadge(open)}</p>
          <p class="dp-muted">${progress(open)}% answered · RAG ${ragPill(overallRag(open))}</p>
          <button class="btn sm t" data-act="dp-open" data-arg="${safe(open.id)}">Open</button>`
          : last ? `<p>Last approved ${safe(formatDate(last.completedAt))}. The next one is due by <b>${safe(formatDate(next))}</b>.</p>`
          : `<p>No annual DPIA on record. Significant Data Fiduciaries run one every 12 months.</p>
            <button class="btn sm t" data-act="dp-new-assessment" data-arg="tpl-integrated" ${ctx.dis(ctx.role().send)}>Start annual DPIA</button>`}
        <p class="dp-hint">DPDP Rules 2025, Rule 13: a DPIA and an audit every 12 months, with significant observations reported to the Data Protection Board.</p>
      </div></section>`;
  }

  function render() {
    const A = ctx.state.assessments;
    const open = A.filter(a => ctx.OPEN_STATUSES.includes(a.status));
    const overdue = A.filter(a => ctx.isOverdue(a));
    const soon = open.filter(a => !ctx.isOverdue(a) && ctx.daysLeft(a.due) <= 7);
    const review = A.filter(a => a.status === "Under review");
    const approved = A.filter(a => a.status === "Approved");
    const avgDays = approved.length ? Math.round(approved.reduce((n, a) => n + (new Date(a.completedAt) - new Date(a.created)) / 864e5, 0) / approved.length) : 0;
    const risks = A.flatMap(a => (a.risks || []).filter(isRiskOpen).map(r => ({ ...r, a, sc: riskScores(r) })));
    const redRisks = risks.filter(r => r.sc.rag === "RED");
    const gaps = A.flatMap(a => scoredGaps(a).map(g => ({ ...g, a })));
    const evidence = ctx.state.evidence || [];
    const expired = evidence.filter(e => ctx.evidenceExpired(e));
    const checklist = A.filter(usesChecklist);
    const cw = crosswalk(checklist);
    const dm = domainMatrix(checklist);
    const mix = RESPONSES.map(r => [r, FRAMEWORKS.length ? Object.values(dm).reduce((n, c) => n + c[r], 0) : 0]);
    const mixTotal = mix.reduce((n, x) => n + x[1], 0);
    const topDomains = DOMAINS.map(d => [d, dm[d.code] ? dm[d.code].No + dm[d.code].Partial : 0]).filter(x => x[1]).sort((x, y) => y[1] - x[1]).slice(0, 5);

    // Data Map activities flagged as needing a DPIA that have no assessment
    const linked = new Set(A.flatMap(a => (a.activityIds || []).concat(a.activityId || [])).filter(Boolean));
    const gapsMap = ctx.ropaActivities().filter(x => x.dpia === "Yes" && !linked.has(x.id));
    const undecided = ctx.ropaActivities().filter(x => x.dpia === "Not yet decided" && !linked.has(x.id));

    const kpi = (label, value, sub, cls, act, arg) => `
      <button class="dp-kpi" ${act ? `data-act="${act}" data-arg="${arg}"` : "disabled"}>
        <span>${label}</span><strong class="${cls || ""}">${value}</strong><small>${sub}</small></button>`;

    const attention = [...overdue, ...soon.filter(a => !overdue.includes(a)), ...review.filter(a => !overdue.includes(a) && !soon.includes(a))].slice(0, 6);
    const ragCount = (list, rag) => list.filter(x => x === rag).length;
    const ctlRags = gaps.map(g => g.scores.rag).filter(Boolean), riskRags = risks.map(r => r.sc.rag);

    return `
      <div class="dp-kpis">
        ${kpi("Open", open.length, `${A.length} assessments in total`, "", "dp-goto-status", "")}
        ${kpi("Waiting for review", review.length, review.length ? "Oldest submitted " + formatDate(review.map(a => a.submittedAt).sort()[0]) : "Nothing waiting", review.length ? "is-warn" : "", "dp-goto-status", "Under review")}
        ${kpi("Overdue", overdue.length, `${soon.length} more due within 7 days`, overdue.length ? "is-risk" : "is-ok", "dp-goto-status", "Overdue")}
        ${kpi("Approved", approved.length, avgDays ? `Average ${avgDays} days from start to approval` : "None yet", "is-ok", "dp-goto-status", "Approved")}
        ${kpi("RED residual risks", redRisks.length, `${risks.length} open risks across assessments`, redRisks.length ? "is-risk" : "is-ok", "dp-goto-risks", "RED")}
        ${kpi("Expired evidence", expired.length, `${evidence.length} evidence items`, expired.length ? "is-warn" : "is-ok", "dp-goto-evidence", "expired")}
      </div>
      <div class="dp-dash-grid">
        <section class="card"><div class="card-h"><h3>Needs attention</h3><div class="r"><button class="btn sm" data-act="dp-tab" data-arg="assessments">All assessments</button></div></div>
          ${attention.length ? `<div class="dp-due-list">${attention.map(a => `
            <button class="dp-due-row" data-act="dp-open" data-arg="${safe(a.id)}">
              <span class="dp-due-name"><b>${safe(a.name)}</b><small>${safe(a.who)} · ${progress(a)}% answered</small></span>
              ${statusPill(a.status)}${dueBadge(a)}
            </button>`).join("")}</div>` : '<div class="card-b dp-empty">Nothing overdue, due soon or waiting for review.</div>'}
        </section>
        ${annualCard(A)}
        <section class="card"><div class="card-h"><h3>Assessments by status</h3></div><div class="card-b">
          ${hbars(STATUSES.map(s => [s, A.filter(a => a.status === s).length, "dp-goto-status", s]))}
        </div></section>
        <section class="card"><div class="card-h"><h3>RAG of open risks and scored gaps</h3><div class="r"><button class="btn sm" data-act="dp-tab" data-arg="risks">Risk register</button></div></div><div class="card-b">
          <table class="dp-mini"><thead><tr><th></th><th>Risks</th><th>Control gaps</th></tr></thead><tbody>
            ${["RED", "AMBER", "GREEN"].map(rag => `<tr><td>${ragPill(rag)}</td><td><button class="dp-link" data-act="dp-goto-risks" data-arg="${rag}">${ragCount(riskRags, rag)}</button></td><td>${ragCount(ctlRags, rag)}</td></tr>`).join("")}
          </tbody></table>
        </div></section>
        <section class="card"><div class="card-h"><h3>Checklist response mix</h3><div class="r dp-muted">${checklist.length} assessment${checklist.length === 1 ? "" : "s"}</div></div><div class="card-b">
          ${mixTotal ? `<div class="dp-stack" role="img" aria-label="${mix.map(([r, n]) => `${r} ${n}`).join(", ")}">${mix.filter(x => x[1]).map(([r, n]) => `<span class="h-${r.replace(/\s/g, "").toLowerCase()}" style="flex:${n}" title="${safe(r)}: ${n}"></span>`).join("")}</div>
            <ul class="dp-legend">${mix.map(([r, n]) => `<li><i class="h-${r.replace(/\s/g, "").toLowerCase()}"></i>${safe(r)} <b>${n}</b></li>`).join("")}</ul>` : '<p class="dp-empty">No checklist answers yet.</p>'}
        </div></section>
        <section class="card"><div class="card-h"><h3>Framework coverage</h3><div class="r"><button class="btn sm" data-act="dp-tab" data-arg="frameworks">Crosswalk</button></div></div><div class="card-b">
          ${hbars(FRAMEWORKS.map(fw => [fw, Math.round((cw[fw].coverage || 0) * 100), "dp-tab", "frameworks", "is-cov", cw[fw].coverage === null ? "—" : `${Math.round(cw[fw].coverage * 100)}%`]))}
          <p class="dp-hint">Yes ÷ (mapped − NA), across every checklist assessment, including unanswered questions.</p>
        </div></section>
        <section class="card"><div class="card-h"><h3>Domains with the most gaps</h3></div><div class="card-b">
          ${topDomains.length ? hbars(topDomains.map(([d, n]) => [`${d.code} · ${d.name}`, n, null, "", "rag-amber"])) : '<p class="dp-empty">No No or Partial answers recorded.</p>'}
        </div></section>
        <section class="card"><div class="card-h"><h3>Data Map coverage</h3><div class="r"><button class="btn sm" data-go="ropa">Open Data Map</button></div></div><div class="card-b">
          ${gapsMap.length || undecided.length ? `
            <p class="dp-muted">Processing activities that need a DPIA but have no assessment yet.</p>
            <ul class="dp-gaps">
              ${gapsMap.map(x => `<li><span><b>${safe(x.name)}</b><small>${safe(x.id)} · ${safe(x.bu || "")} · DPIA required</small></span>
                <button class="btn sm t" data-act="dp-new-assessment" data-arg="|${safe(x.id)}" ${ctx.dis(ctx.role().send)}>Start DPIA</button></li>`).join("")}
              ${undecided.map(x => `<li><span><b>${safe(x.name)}</b><small>${safe(x.id)} · ${safe(x.bu || "")} · not yet decided</small></span>
                <button class="btn sm" data-act="dp-new-assessment" data-arg="tpl-dpia|${safe(x.id)}" ${ctx.dis(ctx.role().send)}>Run screening</button></li>`).join("")}
            </ul>` : '<p class="dp-empty">Every activity that needs a DPIA has one.</p>'}
        </div></section>
        ${expired.length ? `<section class="card"><div class="card-h"><h3>Expired evidence</h3><div class="r"><button class="btn sm" data-act="dp-goto-evidence" data-arg="expired">Evidence</button></div></div>
          <div class="dp-due-list">${expired.slice(0, 5).map(e => `<button class="dp-due-row" data-act="dp-goto-evidence" data-arg="expired"><span class="dp-due-name"><b>${safe(e.id)} ${safe(e.title)}</b><small>${safe(e.owner)} · ${(e.questionIds || []).join(", ")}</small></span><span class="dp-due is-late">Expired ${safe(formatDate(e.validUntil))}</span></button>`).join("")}</div></section>` : ""}
      </div>
      ${redRisks.length ? `
        <section class="card"><div class="card-h"><h3>RED residual risks</h3></div>
          <div class="dp-due-list">${redRisks.slice(0, 5).map(r => `
            <button class="dp-due-row" data-act="dp-open-risks" data-arg="${safe(r.a.id)}">
              <span class="dp-due-name"><b>${safe(r.id)} ${safe(r.title)}</b><small>${safe(r.a.name)} · ${safe(r.owner || "No owner")}${r.acceptance?.escalatedTo ? ` · escalated to ${safe(r.acceptance.escalatedTo)}` : ""}</small></span>
              ${ragPill(r.sc.rag)}<span class="dp-muted">${safe(r.status)}</span>
            </button>`).join("")}</div>
        </section>` : ""}`;
  }
  return { render };
}
