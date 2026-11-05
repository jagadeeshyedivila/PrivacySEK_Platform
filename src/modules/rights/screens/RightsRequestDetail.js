// One request: identity and context, the status stepper, statutory clock and the work tabs.
export function createRequestDetailRenderer(ctx) {
  const { ui, safe, STAGES, DETAIL_TABS, formatDate, formatDateTime, isClosed, dueIn, statusPill, dueBadge, dis } = ctx;

  function info(label, value) {
    return `<div class="rr-info"><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function stepper(r) {
    const cur = STAGES.indexOf(r.status);
    const rejected = r.status === "Rejected";
    return `
      <ol class="rr-stepper ${rejected ? "is-rejected" : ""}" aria-label="Processing phase">
        ${STAGES.map((s, i) => {
          const state = rejected ? "" : i < cur ? "done" : i === cur ? "cur" : i === cur + 1 ? "next" : "";
          const canClick = state === "next" && ctx.canEdit();
          return `
            <li class="rr-step ${state}">
              <button type="button" data-act="rr-advance" data-arg="${safe(s)}" ${canClick ? "" : "disabled"}
                title="${state === "next" ? `Advance to ${safe(s)}` : state === "done" ? "Completed" : state === "cur" ? "Current phase" : "Advance one step at a time"}">
                <i>${state === "done" ? "✓" : i + 1}</i>
                <span>${safe(s)}</span>
              </button>
            </li>
          `;
        }).join("")}
      </ol>
    `;
  }

  function activityTab(r) {
    const items = [...(r.activity || [])].reverse();
    return `
      <ol class="rr-timeline">
        ${items.map(a => `
          <li>
            <span class="rr-tl-dot" aria-hidden="true"></span>
            <div><b>${safe(a.by)}</b> <small>${safe(formatDateTime(a.at))}</small><p>${safe(a.text)}</p></div>
          </li>
        `).join("") || '<li class="rr-empty">No activity yet.</li>'}
      </ol>
    `;
  }

  function emailTab(r) {
    const templates = ctx.state.templates;
    const isPublic = ui.mailVis === "Public";
    return `
      <div class="rr-seg" role="tablist" aria-label="Message type">
        <button class="${!isPublic ? "active" : ""}" data-act="rr-mail-vis" data-arg="Private" role="tab" aria-selected="${!isPublic}">Private note</button>
        <button class="${isPublic ? "active" : ""}" data-act="rr-mail-vis" data-arg="Public" role="tab" aria-selected="${isPublic}">Email to data principal</button>
      </div>
      <div class="rr-compose">
        ${isPublic ? `
          <div class="rr-field"><label for="rr-mail-to">To</label><input id="rr-mail-to" value="${safe(r.email)}"></div>
        ` : '<p class="rr-hint">Private notes are visible only to your privacy team.</p>'}
        <div class="rr-field">
          <label for="rr-mail-tpl">Template</label>
          <select id="rr-mail-tpl" data-act="rr-apply-template" data-arg="${safe(r.id)}">
            <option value="">No template</option>
            ${templates.map(t => `<option value="${safe(t.id)}">${safe(t.name)}</option>`).join("")}
          </select>
        </div>
        <div class="rr-field">
          <label for="rr-mail-body">Message</label>
          <textarea id="rr-mail-body" rows="6" placeholder="Write your message"></textarea>
        </div>
        <div class="rr-row-end">
          <button class="btn sm t" data-act="rr-send-mail" data-arg="${safe(r.id)}" ${dis()}>${isPublic ? "Send email" : "Save note"}</button>
        </div>
      </div>
      <ol class="rr-timeline">
        ${(r.emails || []).map(m => `
          <li>
            <span class="rr-tl-dot ${m.vis === "Public" ? "is-mail" : ""}" aria-hidden="true"></span>
            <div>
              <b>${m.vis === "Public" ? `Email to ${safe(m.to || r.email)}` : "Private note"}</b>
              <small>${safe(formatDateTime(m.at))} · ${safe(m.by)}</small>
              <p class="rr-pre">${safe(m.body)}</p>
            </div>
          </li>
        `).join("") || '<li class="rr-empty">No messages yet.</li>'}
      </ol>
    `;
  }

  function tasksTab(r) {
    const tasks = r.tasks || [];
    const done = tasks.filter(t => t.done).length;
    return `
      <div class="rr-task-add">
        <input id="rr-task-new" placeholder="Add a task, for example “Confirm with legal”" aria-label="New task title" ${dis()}>
        <button class="btn sm t" data-act="rr-add-task" data-arg="${safe(r.id)}" ${dis()}>Add task</button>
      </div>
      ${tasks.length ? `<p class="rr-hint">${done} of ${tasks.length} tasks done</p>` : ""}
      <ul class="rr-tasks">
        ${tasks.map(t => `
          <li class="${t.done ? "is-done" : ""}">
            <label>
              <input type="checkbox" data-change-act="rr-toggle-task" data-request="${safe(r.id)}" data-task="${safe(t.id)}" ${t.done ? "checked" : ""} ${dis()}>
              <span>${safe(t.title)}</span>
            </label>
          </li>
        `).join("") || '<li class="rr-empty">No tasks yet.</li>'}
      </ul>
    `;
  }

  function systemsTab(r) {
    return `
      <p class="rr-hint">Person Finder searches each connected system for this data principal. Results are simulated in this demo.</p>
      <div class="rr-systems">
        ${(r.systems || []).map((s, i) => `
          <div class="rr-system">
            <div class="rr-cell-2"><b>${safe(s.name)}</b><small>${safe(s.fields)}</small></div>
            <span class="rr-system-action ${/Retain/.test(s.action) ? "is-hold" : ""}">${safe(s.action)}</span>
            ${ctx.runtime.pill(s.state === "Searched" ? "ok" : "n", s.state)}
            <button class="btn sm" data-act="rr-run-search" data-arg="${safe(r.id)}|${i}" ${dis()}>${s.state === "Searched" ? "Search again" : "Run search"}</button>
          </div>
        `).join("") || '<p class="rr-empty">No systems linked to this request.</p>'}
      </div>
    `;
  }

  function render() {
    const r = ctx.state.requests.find(x => x.id === ui.selectedRequestId);
    if (!r) {
      return `
        <div class="card rr-restricted">
          <h3>Request not found</h3>
          <p>It may have been deleted.</p>
          <button class="btn sm" data-act="rr-back">Back to requests</button>
        </div>
      `;
    }
    const closed = isClosed(r);
    const form = ctx.state.forms.find(f => f.id === r.form);
    const d = dueIn(r);
    const tab = DETAIL_TABS.includes(ui.detailTab) ? ui.detailTab : "Activity";
    const tabBody = tab === "Email" ? emailTab(r) : tab === "Tasks" ? tasksTab(r) : tab === "Systems" ? systemsTab(r) : activityTab(r);
    const count = { Activity: (r.activity || []).length, Email: (r.emails || []).length, Tasks: (r.tasks || []).length, Systems: (r.systems || []).length };

    return `
      <div class="rr-detail-head">
        <button class="btn sm" data-act="rr-back">← Requests</button>
        <div class="rr-detail-title">
          <h2>${safe(r.first)} ${safe(r.last)}</h2>
          <div class="rr-detail-sub">
            <span class="rr-mono">${safe(r.id)}</span>
            <span>${safe(r.type)} · ${safe(ctx.typeRef(r.type))}</span>
            ${statusPill(r.status)}
          </div>
        </div>
        <div class="rr-head-actions">
          ${closed ? `<button class="btn sm" data-act="rr-reopen" data-arg="${safe(r.id)}" ${dis()}>Reopen</button>` : ""}
          <button class="btn sm d" data-act="rr-delete-request" data-arg="${safe(r.id)}" ${dis()}>Delete</button>
        </div>
      </div>

      <div class="rr-detail-grid">
        <section class="card rr-panel">
          <div class="card-h"><h3>Processing phase</h3>
            <div class="r">${!closed ? `<button class="btn sm d" data-act="rr-reject" data-arg="${safe(r.id)}" ${dis()}>Reject request</button>` : ""}</div>
          </div>
          <div class="card-b">
            ${stepper(r)}
            ${r.status === "Rejected" ? `<div class="rr-banner is-risk"><b>Rejected.</b> ${safe(r.rejectReason || "No reason recorded.")}</div>` : ""}
            ${!closed && ctx.canEdit() ? '<p class="rr-hint">Select the next phase to advance. Each change is written to the Proof Ledger.</p>' : ""}
          </div>
        </section>

        <section class="card rr-clock ${closed ? "" : d < 0 ? "is-late" : d <= 7 ? "is-soon" : ""}">
          <span>Statutory clock</span>
          <strong>${closed ? (r.status === "Complete" ? "Closed" : "Rejected") : d < 0 ? `${-d} days late` : `${d} days left`}</strong>
          <small>Deadline ${safe(formatDate(r.deadline))} · ${r.type === "Grievance" ? "Rule 14 · 90 days" : `${form?.deadlineDays || 30}-day policy SLA`}</small>
          ${r.status === "Complete" && r.completedAt ? `<small>Completed ${safe(formatDate(r.completedAt))}${new Date(r.completedAt) > new Date(r.deadline) ? " · after the deadline" : " · on time"}</small>` : ""}
        </section>
      </div>

      <section class="card rr-panel">
        <div class="card-h"><h3>Request details</h3></div>
        <dl class="card-b rr-info-grid">
          ${info("Data principal", `${safe(r.first)} ${safe(r.last)}`)}
          ${info("Email", `${safe(r.email)} ${r.verified ? '<span class="rr-verified">Verified</span>' : `<button class="rr-link" data-act="rr-resend-verify" data-arg="${safe(r.id)}" ${dis()}>Resend verification</button>`}`)}
          ${info("Mobile", safe(r.mobile))}
          ${info("Subject type", safe(r.subject))}
          ${info("Location", `${safe(r.city)}, ${safe(r.state)}`)}
          ${info("Language", safe(r.language))}
          ${info("Channel", safe(r.channel))}
          ${info("Web form", form ? `<button class="rr-link" data-act="rr-open-form" data-arg="${safe(form.id)}">${safe(form.name)}</button>` : "—")}
          ${info("Property", safe(r.property))}
          ${info("Workflow", safe(r.workflow))}
          ${info("Approver", safe(r.approver))}
          ${info("Risk", `<span class="rr-risk is-${safe(String(r.risk).toLowerCase())}">${safe(r.risk)}</span>`)}
          ${info("Received", safe(formatDate(r.created)))}
          ${info("Due in", dueBadge(r))}
          ${(r.answers || []).map(a => info(safe(a.label), safe(a.value))).join("")}
          ${r.attachment ? info("Attachment", safe(r.attachment)) : ""}
          <div class="rr-info is-wide"><dt>Request details</dt><dd>${safe(r.details)}</dd></div>
        </dl>
      </section>

      <section class="card rr-panel">
        <div class="rr-tabs" role="tablist">
          ${DETAIL_TABS.map(t => `
            <button class="${t === tab ? "active" : ""}" data-act="rr-detail-tab" data-arg="${t}" role="tab" aria-selected="${t === tab}">
              ${t} <span>${count[t]}</span>
            </button>
          `).join("")}
        </div>
        <div class="card-b">${tabBody}</div>
      </section>
    `;
  }

  return { render };
}
