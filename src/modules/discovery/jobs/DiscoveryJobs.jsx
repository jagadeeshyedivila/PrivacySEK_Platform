import { canPerform, getUserRole } from "../discoveryConfig.js";

export function createJobsRenderer(context) {
  const { D, I, esc, pill, ui } = context;

  return function renderDiscoveryJobs() {
    const data = context.getStore();
    const jobs = data.jobs || [];
    const connections = data.connections || [];
    const role = getUserRole(D);
    const canCreate = canPerform(role, "create");
    const canDelete = canPerform(role, "delete");

    const jobsView = ui.jobsView || "list";

    // 1. Add Job Form View
    if (jobsView === "form") {
      const jf = ui.jobFormState || { run: true, sch: false, samp: true };

      return `
        <div class="card" style="max-width:760px;margin:0 auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
            <div>
              <h2 style="margin:0 0 4px;font-size:18px">Create New Discovery Scan Job</h2>
              <div class="dim" style="font-size:12.5px">Supported file types: .pdf, .png, .jpg, .jpeg, .csv, .xlsx, relational schemas</div>
            </div>
            <button class="btn sm o" data-act="dd-jobs-view-list">
              ← Cancel
            </button>
          </div>

          <div id="dd-job-form-errors" class="dd-form-error" style="margin-bottom:14px"></div>

          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_jn">Job Name</label>
            <input
              id="dd_jn"
              class="dd-form-input"
              type="text"
              placeholder="e.g. pii_detect_customer_kyc"
            />
            <div class="dd-form-hint">Give the job a short, descriptive name — e.g. pii_detect_customer_emails.</div>
            <div class="dd-form-error" id="dd_jne"></div>
          </div>

          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_js">Data Connection Source</label>
            <select id="dd_js" class="dd-form-select">
              <option value="">Select a data connection...</option>
              ${connections.map(c => `
                <option value="${esc(c.name)}">${esc(c.name)} (${c.type.toUpperCase()})</option>
              `).join("")}
            </select>
            <div class="dd-form-hint">Choose which connection the job will scan. Manage sources under the Connections tab.</div>
            <div class="dd-form-error" id="dd_jse"></div>
          </div>

          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_jd">Execution Duration Limit</label>
            <input
              id="dd_jd"
              class="dd-form-input"
              type="text"
              value="1h"
              placeholder="e.g. 30m or 1h"
            />
            <div class="dd-form-hint">Specify minutes (m) or hours (h), e.g. 30m, 45m, or 2h.</div>
            <div class="dd-form-error" id="dd_jde"></div>
          </div>

          <div class="dd-form-group">
            <label class="dd-form-label">Automated Schedule</label>
            <div class="row" style="justify-content:flex-start;gap:12px;margin:4px 0 6px">
              <span class="dd-switch ${jf.sch ? 'on' : ''}" data-act="dd-toggle-job-sch" role="switch" aria-checked="${jf.sch ? 'true' : 'false'}"></span>
              <input
                id="dd_jc"
                class="dd-form-input"
                style="max-width:340px"
                placeholder="Cron schedule (e.g. 0 2 * * *)"
                ${jf.sch ? '' : 'disabled'}
              />
            </div>
            <div class="dd-form-hint">If disabled, the job will be created in paused state and a default cron schedule will apply.</div>
          </div>

          <div class="dd-form-group" style="padding:10px 12px;background:var(--surface-2);border-radius:6px">
            <div class="row" style="margin:0;justify-content:flex-start;gap:12px">
              <span class="dd-switch ${jf.run ? 'on' : ''}" data-act="dd-toggle-job-run" role="switch" aria-checked="${jf.run ? 'true' : 'false'}"></span>
              <div>
                <b style="font-size:13px;color:var(--text);display:block">Initiate Job Run immediately after creation</b>
                <span class="dim" style="font-size:12px">Runs discovery reflection and immediately updates Overview & Reports</span>
              </div>
            </div>
          </div>

          <div class="dd-form-group" style="padding:10px 12px;background:var(--surface-2);border-radius:6px">
            <div class="row" style="margin:0;justify-content:flex-start;gap:12px">
              <span class="dd-switch ${jf.samp ? 'on' : ''}" data-act="dd-toggle-job-samp" role="switch" aria-checked="${jf.samp ? 'true' : 'false'}"></span>
              <div>
                <b style="font-size:13px;color:var(--text);display:block">Enable High-Entropy Data Sampling (Recommended)</b>
                <span class="dim" style="font-size:12px">Inspects up to 1,000 sample rows in-place for higher confidence scoring without copying raw records</span>
              </div>
            </div>
          </div>

          <div class="row" style="margin-top:20px;border-top:1px solid var(--line);padding-top:14px">
            <button class="btn sm o" data-act="dd-jobs-view-list">
              Cancel
            </button>
            <button class="btn sm p" data-act="dd-submit-new-job">
              Create Job
            </button>
          </div>
        </div>
      `;
    }

    // 2. Jobs List View
    const q = (ui.jobsSearch || "").toLowerCase().trim();
    const filteredJobs = jobs.filter(j =>
      !q || j.name.toLowerCase().includes(q) || j.src.toLowerCase().includes(q) || j.st.toLowerCase().includes(q)
    );

    return `
      <!-- Scan box simulation container -->
      <div id="dd-job-scanbox"></div>

      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-h" style="padding:14px">
          <div>
            <h3 style="margin:0 0 2px">Discovery Scan Jobs</h3>
            <span class="dim" style="font-size:12px">Automated batch routines that profile schemas and evaluate DPDP classification</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="display:flex;align-items:center;gap:6px">
              <input
                type="search"
                class="field"
                style="height:32px;width:220px;border:1px solid var(--line);border-radius:6px;padding:0 8px;background:var(--surface)"
                placeholder="Search jobs..."
                value="${esc(ui.jobsSearch || '')}"
                data-input-act="dd-jobs-search"
                aria-label="Search jobs"
              />
              ${ui.jobsSearch ? `
                <button class="btn sm t" data-act="dd-jobs-clear-search">×</button>
              ` : ''}
            </div>

            <button
              class="btn sm p"
              ${canCreate ? '' : 'disabled title="Your role cannot create new scan jobs"'}
              data-act="dd-open-job-form"
            >
              + Add Job
            </button>
          </div>
        </div>

        <div class="tw">
          <table class="t">
            <colgroup>
              <col style="width: 44px;" />
              <col style="width: 24%;" />
              <col style="width: 18%;" />
              <col style="width: 14%;" />
              <col style="width: 12%;" />
              <col style="width: 12%;" />
              <col style="width: 10%;" />
              <col style="width: 10%;" />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>Job Name</th>
                <th>Source Connection</th>
                <th>Target Type</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Last Profiled</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredJobs.length ? filteredJobs.map(j => {
                let statusPill = pill("ok", "Completed");
                if (j.st === "Running") statusPill = pill("info", "Running");
                else if (j.st === "Paused") statusPill = pill("n", "Paused");
                else if (j.st === "Failed") statusPill = pill("act", "Failed");

                return `
                  <tr>
                    <td><span style="font-size:16px">${I.flow || "⚙"}</span></td>
                    <td>
                      <a
                        href="javascript:void(0)"
                        class="lk"
                        style="font-weight:600"
                        data-act="dd-view-job-details"
                        data-arg="${esc(j.id)}"
                      >
                        ${esc(j.name)}
                      </a>
                    </td>
                    <td><b>${esc(j.src)}</b></td>
                    <td><span class="mono">${esc(j.type)}</span></td>
                    <td>${statusPill}</td>
                    <td class="dim" style="font-size:12px">${esc(j.cr)}</td>
                    <td class="dim" style="font-size:12px">${esc(j.up)}</td>
                    <td style="text-align:right;white-space:nowrap">
                      <button
                        class="btn sm o"
                        data-act="dd-view-job-details"
                        data-arg="${esc(j.id)}"
                        title="View job configuration"
                      >
                        👁 View
                      </button>
                      <button
                        class="btn sm o"
                        ${canDelete ? '' : 'disabled title="Your role cannot delete jobs"'}
                        data-act="dd-delete-job"
                        data-arg="${esc(j.id)}"
                        style="color:var(--block);margin-left:4px"
                        title="Delete job"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                `;
              }).join("") : `
                <tr>
                  <td colspan="8" class="empty" style="text-align:center;padding:32px;color:var(--text-2)">
                    No discovery scan jobs found matching your search.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="padding:10px 14px;border-top:1px solid var(--line);font-size:12px;color:var(--text-3)">
          In total there are <b>${filteredJobs.length}</b> discovery job${filteredJobs.length === 1 ? '' : 's'}.
        </div>
      </div>
    `;
  };
}
