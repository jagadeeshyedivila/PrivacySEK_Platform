export function registerPostureActions(context, ACT) {
  const { $, closeOv, esc, ledgerAdd, modal, render, toast } = context;

  ACT["dd-remediate-finding"] = function(idxStr) {
    const store = context.getStore();
    const idx = Number(idxStr);
    const f = (store.findings || [])[idx];
    if (!f) return;

    f.done = true;
    context.saveStore(store);

    ledgerAdd("Security finding remediated", f.a);
    toast("Remediation applied and recorded in the Proof Ledger");
    render();
  };

  ACT["dd-create-task-from-finding"] = function(idxStr) {
    const store = context.getStore();
    const idx = Number(idxStr);
    const f = (store.findings || [])[idx];
    if (!f) return;

    const newTask = {
      id: `t-${Date.now()}`,
      t: `Remediate: ${f.n} (${f.a})`,
      o: "Meera Iyer",
      st: "In Progress"
    };

    store.tasks = store.tasks || [];
    store.tasks.unshift(newTask);
    context.saveStore(store);

    toast(`Remediation task created for "${f.n}"`);
    ledgerAdd("Remediation task created", `${f.n} assigned to Meera Iyer`);
    render();
  };

  ACT["dd-change-task-status"] = function(val, el) {
    const taskId = el?.getAttribute("data-arg");
    const store = context.getStore();
    const task = (store.tasks || []).find(t => t.id === taskId);
    if (!task) return;

    task.st = val || "Open";
    context.saveStore(store);

    toast(`Task status updated to ${task.st}`);
    ledgerAdd("Remediation task updated", `${task.t} → ${task.st}`);
    render();
  };

  ACT["dd-open-new-task-modal"] = function() {
    const bodyHtml = `
      <div id="dd-task-form-err" class="dd-form-error" style="margin-bottom:12px"></div>

      <div class="dd-form-group">
        <label class="dd-form-label required" for="dd_task_title">Task Title</label>
        <input id="dd_task_title" class="dd-form-input" type="text" placeholder="e.g. Rotate encryption key for loan applications" />
      </div>

      <div class="dd-form-group">
        <label class="dd-form-label required" for="dd_task_owner">Assigned Owner</label>
        <input id="dd_task_owner" class="dd-form-input" type="text" value="Meera Iyer" />
      </div>

      <div class="dd-form-group">
        <label class="dd-form-label" for="dd_task_status">Initial Status</label>
        <select id="dd_task_status" class="dd-form-select">
          <option value="Open">Open</option>
          <option value="In Progress" selected>In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
    `;

    const footHtml = `
      <button class="btn sm o" data-act="close">Cancel</button>
      <button class="btn sm p" data-act="dd-submit-new-task">Create Task</button>
    `;

    modal("Create Remediation Task", "Operational data protection corrective action", bodyHtml, footHtml);
  };

  ACT["dd-submit-new-task"] = function() {
    const title = ($("#dd_task_title")?.value || "").trim();
    const owner = ($("#dd_task_owner")?.value || "").trim();
    const status = ($("#dd_task_status")?.value || "Open").trim();
    const errEl = $("#dd-task-form-err");

    if (!title || !owner) {
      if (errEl) errEl.textContent = "Please provide both task title and assigned owner.";
      return;
    }

    const store = context.getStore();
    store.tasks = store.tasks || [];
    store.tasks.unshift({
      id: `t-${Date.now()}`,
      t: title,
      o: owner,
      st: status
    });

    context.saveStore(store);
    closeOv();
    toast(`Task "${title}" created`);
    ledgerAdd("Remediation task created", `${title} (${owner})`);
    render();
  };
}
