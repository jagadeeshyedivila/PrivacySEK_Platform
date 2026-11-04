// Dashboard: volumes, timeliness and where requests sit in the process.
export function createDashboardRenderer(ctx) {
  const { runtime, ui, safe, STAGES, REQUEST_TYPES, DATE_RANGES, isClosed, dueIn, inRange, statusPill, dueBadge, formatDate } = ctx;
  const DAY = 864e5;

  // One-hue vertical bar chart with value labels and per-bar hover tooltips
  function barChart(items, label) {
    const w = 520, h = 210, padB = 34, padT = 22, gap = 18;
    const max = Math.max(1, ...items.map(i => i.value));
    const bw = (w - gap * (items.length + 1)) / items.length;
    const bars = items.map((item, i) => {
      const bh = Math.round((item.value / max) * (h - padT - padB));
      const x = gap + i * (bw + gap);
      const y = h - padB - bh;
      return `
        <g class="rr-bar" tabindex="0" aria-label="${safe(item.label)}: ${item.value}">
          <title>${safe(item.label)}: ${item.value} request${item.value === 1 ? "" : "s"}</title>
          <rect class="rr-bar-hit" x="${x - gap / 2}" y="${padT - 10}" width="${bw + gap}" height="${h - padT - padB + 10}"></rect>
          ${bh > 0 ? `<path class="rr-bar-fill" d="M${x},${h - padB} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${h - padB} Z"></path>` : ""}
          <text class="rr-bar-val" x="${x + bw / 2}" y="${y - 6}" text-anchor="middle">${item.value}</text>
          <text class="rr-bar-lbl" x="${x + bw / 2}" y="${h - padB + 16}" text-anchor="middle">${safe(item.short || item.label)}</text>
        </g>
      `;
    }).join("");
    return `
      <svg class="rr-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${safe(label)}">
        <line class="rr-axis" x1="${gap / 2}" x2="${w - gap / 2}" y1="${h - padB}" y2="${h - padB}"></line>
        ${bars}
      </svg>
    `;
  }

  // Horizontal bars for the request-type breakdown (sorted, labelled)
  function typeBars(items) {
    const max = Math.max(1, ...items.map(i => i.value));
    return `
      <div class="rr-hbars">
        ${items.map(item => `
          <div class="rr-hbar" title="${safe(item.label)}: ${item.value} request${item.value === 1 ? "" : "s"}">
            <span class="rr-hbar-lbl">${safe(item.label)}<small>${safe(item.ref)}</small></span>
            <span class="rr-hbar-track"><span class="rr-hbar-fill" style="width:${(item.value / max) * 100}%"></span></span>
            <b class="rr-hbar-val">${item.value}</b>
          </div>
        `).join("")}
      </div>
    `;
  }

  function render() {
    const all = ctx.state.requests;
    const rs = all.filter(inRange);
    const count = s => rs.filter(r => r.status === s).length;
    const open = rs.filter(r => !isClosed(r));
    const overdue = open.filter(r => dueIn(r) < 0).length;
    const soon = open.filter(r => dueIn(r) >= 0 && dueIn(r) <= 7).length;
    const done = rs.filter(r => r.status === "Complete" && r.completedAt);
    const avg = done.length ? Math.round(done.reduce((a, r) => a + (new Date(r.completedAt) - new Date(r.created)) / DAY, 0) / done.length) : 0;
    const late = done.filter(r => new Date(r.completedAt) > new Date(r.deadline)).length;
    const onTime = done.length ? Math.round(((done.length - late) / done.length) * 100) : 100;

    const phases = STAGES.concat("Rejected").map(s => ({
      label: s,
      short: s === "Verifying Identity" ? "Verifying" : s,
      value: count(s),
    }));
    const types = REQUEST_TYPES.map(t => ({ label: t.id, ref: t.ref, value: rs.filter(r => r.type === t.id).length }))
      .filter(t => t.value > 0)
      .sort((a, b) => b.value - a.value);

    const dueList = open.slice().sort((a, b) => dueIn(a) - dueIn(b)).slice(0, 6);

    const kpi = (label, value, note, tone = "") => `
      <div class="rr-kpi">
        <span>${label}</span>
        <strong class="${tone}">${value}</strong>
        <small>${note}</small>
      </div>
    `;

    return `
      <div class="rr-screen-head">
        <div>
          <h2>Dashboard</h2>
          <p>${rs.length} requests received in the selected period.</p>
        </div>
        <div class="rr-head-actions">
          <label class="rr-inline-field">
            <span>Period</span>
            <select data-act="rr-range" aria-label="Date range">
              ${DATE_RANGES.map(([v, l]) => `<option value="${v}" ${ui.range === v ? "selected" : ""}>${l}</option>`).join("")}
            </select>
          </label>
          <button class="btn sm" data-act="rr-print">Print</button>
          <button class="btn sm" data-act="rr-refresh">Refresh</button>
        </div>
      </div>

      <div class="rr-kpis">
        ${kpi("Received", rs.length, `${open.length} still open`)}
        ${kpi("In progress", count("New") + count("Verifying Identity") + count("In Progress"), `${count("Verifying Identity")} awaiting identity check`)}
        ${kpi("Completed", count("Complete"), `${onTime}% on time`, "is-ok")}
        ${kpi("Rejected", count("Rejected"), "Reason recorded on each")}
        ${kpi("Avg. time to complete", `${avg} <em>days</em>`, "Target 30 days")}
      </div>
      <div class="rr-kpis is-alert">
        ${kpi("Overdue", overdue, "Past the statutory deadline", overdue ? "is-risk" : "is-ok")}
        ${kpi("Closed outside timeframe", late, "Completed after the deadline", late ? "is-risk" : "is-ok")}
        ${kpi("Due within 7 days", soon, "Open and close to the deadline", soon ? "is-warn" : "")}
      </div>

      <div class="rr-dash-grid">
        <section class="card rr-panel">
          <div class="card-h"><h3>Requests by processing phase</h3></div>
          <div class="card-b">${barChart(phases, "Requests by processing phase")}</div>
        </section>
        <section class="card rr-panel">
          <div class="card-h"><h3>Requests by type</h3></div>
          <div class="card-b">${types.length ? typeBars(types) : '<p class="rr-empty">No requests in this period.</p>'}</div>
        </section>
      </div>

      <section class="card rr-panel">
        <div class="card-h">
          <h3>Next deadlines</h3>
          <div class="r"><button class="btn sm" data-act="rr-tab" data-arg="requests">View all requests</button></div>
        </div>
        ${dueList.length ? `
          <div class="rr-due-list">
            ${dueList.map(r => `
              <button class="rr-due-row" data-act="rr-open-request" data-arg="${safe(r.id)}">
                <span class="rr-mono">${safe(r.id)}</span>
                <span class="rr-due-name">${safe(r.first)} ${safe(r.last)}<small>${safe(r.type)} · received ${safe(formatDate(r.created))}</small></span>
                ${statusPill(r.status)}
                ${dueBadge(r)}
              </button>
            `).join("")}
          </div>
        ` : '<p class="rr-empty">No open requests in this period.</p>'}
      </section>
    `;
  }

  return { render };
}
