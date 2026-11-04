export function registerJobActions(context, ACT) {
  const { $, closeOv, esc, ledgerAdd, modal, nowT, pill, render, toast, ui } = context;

  ACT["dd-jobs-search"] = function(val) {
    ui.jobsSearch = val || "";
    render();
  };

  ACT["dd-jobs-clear-search"] = function() {
    ui.jobsSearch = "";
    render();
  };

  ACT["dd-open-job-form"] = function() {
    ui.jobsView = "form";
    ui.jobFormState = { run: true, sch: false, samp: true };
    render();
  };

  ACT["dd-jobs-view-list"] = function() {
    ui.jobsView = "list";
    render();
  };

  ACT["dd-toggle-job-sch"] = function() {
    if (!ui.jobFormState) ui.jobFormState = {};
    ui.jobFormState.sch = !ui.jobFormState.sch;
    render();
  };

  ACT["dd-toggle-job-run"] = function() {
    if (!ui.jobFormState) ui.jobFormState = {};
    ui.jobFormState.run = !ui.jobFormState.run;
    render();
  };

  ACT["dd-toggle-job-samp"] = function() {
    if (!ui.jobFormState) ui.jobFormState = {};
    ui.jobFormState.samp = !ui.jobFormState.samp;
    render();
  };

  ACT["dd-view-job-details"] = function(id) {
    const store = context.getStore();
    const job = (store.jobs || []).find(j => j.id === id);
    if (!job) return;

    modal(
      `Job Configuration: ${esc(job.name)}`,
      `Target connection: ${esc(job.src)}`,
      `
        <dl class="kv">
          <dt>Source Connection</dt>
          <dd><b>${esc(job.src)}</b></dd>
          <dt>Data Platform Type</dt>
          <dd>${esc(job.type)}</dd>
          <dt>Execution Duration</dt>
          <dd>${esc(job.dur)}</dd>
          <dt>Cron Schedule</dt>
          <dd>${job.cron ? `<span class="mono">${esc(job.cron)}</span>` : '<span class="dim">Paused (manual execution)</span>'}</dd>
          <dt>Data Sampling</dt>
          <dd>${job.samp ? '<span class="pill ok">Enabled (1,000 rows in-place)</span>' : '<span class="pill n">Full Schema Only</span>'}</dd>
          <dt>Current Status</dt>
          <dd>${pill(job.st === 'Completed' ? 'ok' : job.st === 'Running' ? 'info' : 'n', job.st)}</dd>
          <dt>Created Timestamp</dt>
          <dd class="dim">${esc(job.cr)}</dd>
          <dt>Last Reflection Update</dt>
          <dd class="dim">${esc(job.up)}</dd>
        </dl>
      `,
      `<button class="btn sm o" data-act="close">Close</button>`
    );
  };

  ACT["dd-delete-job"] = function(id) {
    const store = context.getStore();
    const job = (store.jobs || []).find(j => j.id === id);
    const jobName = job?.name || id;

    store.jobs = (store.jobs || []).filter(j => j.id !== id);
    context.saveStore(store);
    toast(`Job "${jobName}" deleted`);
    ledgerAdd("Discovery job deleted", jobName);
    render();
  };

  ACT["dd-submit-new-job"] = function() {
    const nameInput = $("#dd_jn");
    const srcInput = $("#dd_js");
    const durInput = $("#dd_jd");
    const cronInput = $("#dd_jc");
    const errBox = $("#dd-job-form-errors");

    const nameErr = $("#dd_jne");
    const srcErr = $("#dd_jse");
    const durErr = $("#dd_jde");

    if (nameErr) nameErr.textContent = "";
    if (srcErr) srcErr.textContent = "";
    if (durErr) durErr.textContent = "";
    if (errBox) errBox.textContent = "";

    const name = (nameInput?.value || "").trim();
    const src = (srcInput?.value || "").trim();
    const dur = (durInput?.value || "").trim();
    const cron = (cronInput?.value || "").trim();

    const store = context.getStore();
    let hasError = false;

    if (!name) {
      if (nameErr) nameErr.textContent = "Job name is required";
      hasError = true;
    } else if ((store.jobs || []).some(j => j.name.toLowerCase() === name.toLowerCase())) {
      if (nameErr) nameErr.textContent = "Job name must be unique";
      hasError = true;
    }

    if (!src) {
      if (srcErr) srcErr.textContent = "Source connection is required";
      hasError = true;
    }

    if (!/^\d+[mh]$/.test(dur)) {
      if (durErr) durErr.textContent = "Use a format like 30m or 1h";
      hasError = true;
    }

    const jf = ui.jobFormState || { run: true, sch: false, samp: true };
    if (jf.sch && !cron) {
      if (durErr) durErr.textContent = "Enter a valid cron schedule or turn off Schedule";
      hasError = true;
    }

    if (hasError) {
      if (errBox) errBox.textContent = "Please resolve the highlighted validation errors.";
      return;
    }

    const targetConn = store.connections.find(c => c.name === src);
    const targetType = targetConn?.kind === "U" ? "File Store" : "Database";

    const newJob = {
      id: `j-${Date.now()}`,
      name,
      src,
      type: targetType,
      dur,
      cron: jf.sch ? cron : "",
      samp: Boolean(jf.samp),
      cr: nowT(),
      up: nowT(),
      st: jf.run ? "Completed" : "Paused"
    };

    store.jobs.unshift(newJob);

    // If source connection had no tables, populate with realistic Aarohan findings
    if (targetConn && (!targetConn.tables || targetConn.tables.length === 0) && targetConn.kind === "S") {
      targetConn.tables = [
        {
          name: `${targetConn.name.replace(/-/g, '_')}_customers`,
          cols: [
            { col: "customer_id", cat: "Online Identifiers", cl: "Customer ID", rk: "M" },
            { col: "aadhaar_card_number", cat: "Demographic Information", cl: "Aadhaar Card", rk: "VH" },
            { col: "pan_card_number", cat: "Financial Information", cl: "PAN Card", rk: "VH" },
            { col: "primary_mobile", cat: "Contact Information", cl: "Phone Number", rk: "H" },
            { col: "residential_city", cat: "Demographic Information", cl: "City / Region", rk: "L" }
          ]
        }
      ];
    }

    context.saveStore(store);
    ui.jobsView = "list";
    render();

    if (jf.run) {
      toast(`Job "${name}" created and executed – findings updated in Overview`);
      ledgerAdd("Discovery job executed", `${name} on ${src} (${dur})`);
    } else {
      toast(`Job "${name}" created in paused state`);
      ledgerAdd("Discovery job registered", `${name} (scheduled)`);
    }
  };
}
