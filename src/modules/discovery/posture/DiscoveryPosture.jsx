import { canPerform, getUserRole } from "../discoveryConfig.js";
import { OVERVIEW_SEED } from "../discoveryData.js";
import { computeDiscoveryModel } from "../overview/discoveryInsights.js";
import { renderAccessActivity, renderExposure, renderPrivacySecurity, subNav } from "../overview/insightPanels.js";

export function createPostureRenderer(context) {
  const { D, btn, esc, pill, table, ui } = context;

  return function renderDiscoveryPosture() {
    const data = context.getStore();
    const findings = data.findings || [];
    const tasks = data.tasks || [];
    const role = getUserRole(D);
    const canEdit = canPerform(role, "edit");

    const openCount = findings.filter(f => !f.done).length;

    // Sub-views: Findings & tasks (default), Exposure, Access & activity
    const view = ui.postureView || "findings";
    const nav = subNav(esc, "postureView", view, [["findings", "Findings & tasks", openCount], ["exposure", "Exposure"], ["access", "Access & activity"]]);
    if (view !== "findings") {
      const m = computeDiscoveryModel(data, D, OVERVIEW_SEED);
      return `<div class="dd-container">${nav}${view === "exposure"
        ? renderPrivacySecurity(context, m) + renderExposure(context, m.exposure)
        : renderAccessActivity(context, m)}</div>`;
    }

    return `
      ${nav}
      <!-- Findings Table Card -->
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
        <div class="card-h" style="padding:14px">
          <div>
            <h3 style="margin:0 0 2px">Data Security Posture Findings</h3>
            <span class="dim" style="font-size:12px">Automatic risk detections on data storage, permissions and retention</span>
          </div>
          <span class="pill ${openCount ? 'act' : 'ok'}">${openCount} open issue${openCount === 1 ? '' : 's'}</span>
        </div>

        <div class="tw">
          <table class="t">
            <colgroup>
              <col style="width: 25%;" />
              <col style="width: 22%;" />
              <col style="width: 11%;" />
              <col style="width: 10%;" />
              <col style="width: 20%;" />
              <col style="width: 12%;" />
            </colgroup>
            <thead>
              <tr>
                <th>Security Finding</th>
                <th>Affected Asset</th>
                <th>Severity</th>
                <th>Open For</th>
                <th>Recommended Remediation</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${findings.map((f, i) => `
                <tr>
                  <td><b>${esc(f.n)}</b></td>
                  <td><span class="mono" style="font-size:12.5px">${esc(f.a)}</span></td>
                  <td>${pill(f.sev, f.sev === 'act' ? 'Critical' : 'High')}</td>
                  <td class="dim" style="font-size:12px">${esc(f.age)}</td>
                  <td><span class="dim" style="font-size:12px">${esc(f.fix)}</span></td>
                  <td style="text-align:right;white-space:nowrap">
                    ${f.done ? `
                      <span class="pill ok">Remediated</span>
                    ` : `
                      <button
                        class="btn sm"
                        ${canEdit ? '' : 'disabled title="Your role cannot remediate findings"'}
                        data-act="dd-remediate-finding"
                        data-arg="${i}"
                        style="padding:3px 8px;font-size:12px"
                      >
                        Remediate
                      </button>
                      <button
                        class="btn sm o"
                        data-act="dd-create-task-from-finding"
                        data-arg="${i}"
                        style="padding:3px 8px;font-size:12px;margin-left:4px"
                        title="Create remediation task"
                      >
                        + Task
                      </button>
                    `}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Remediation Tasks Card (Ported from HTML Task tab) -->
      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-h" style="padding:14px">
          <div>
            <h3 style="margin:0 0 2px">Remediation Tasks</h3>
            <span class="dim" style="font-size:12px">Assigned security tickets and operational governance workflow</span>
          </div>
          <button class="btn sm o" data-act="dd-open-new-task-modal">
            + New Task
          </button>
        </div>

        <div class="tw">
          <table class="t">
            <colgroup>
              <col style="width: 50%;" />
              <col style="width: 25%;" />
              <col style="width: 25%;" />
            </colgroup>
            <thead>
              <tr>
                <th>Remediation Task</th>
                <th>Assigned Owner</th>
                <th>Workflow Status</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.length ? tasks.map(t => `
                <tr>
                  <td><b>${esc(t.t)}</b></td>
                  <td>${esc(t.o)}</td>
                  <td>
                    <select
                      class="field"
                      style="height:30px;padding:0 8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);width:150px"
                      ${canEdit ? '' : 'disabled title="Your role cannot modify task status"'}
                      data-act="dd-change-task-status"
                      data-arg="${esc(t.id)}"
                      aria-label="Change task status for ${esc(t.t)}"
                    >
                      ${['Open', 'In Progress', 'Done'].map(s => `
                        <option value="${s}" ${t.st === s ? 'selected' : ''}>${s}</option>
                      `).join("")}
                    </select>
                  </td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="3" class="empty" style="text-align:center;padding:28px;color:var(--text-2)">
                    No remediation tasks registered. Click "+ Task" on any finding above.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };
}
