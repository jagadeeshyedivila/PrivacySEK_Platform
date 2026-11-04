// Every user action in the Rights Requests module. Changes are saved to MongoDB through the
// module store, and status changes are written to the Proof Ledger.
export function registerRightsActions(ctx, ACT) {
  const {
    runtime, ui, safe, STAGES, REQUEST_TYPES, SUBJECT_TYPES, CHANNELS, LANGUAGES, PROPERTIES, REGULATIONS, SYSTEMS, MACROS,
    DEMO_ACCOUNTS, ROLES, COMPANY, formatDate, isClosed, canEdit, persist, logActivity, sanitizeRich,
  } = ctx;
  const DAY = 864e5;
  const state = () => ctx.state;
  const render = () => runtime.render();
  const toast = msg => runtime.toast(msg);
  const nowIso = () => new Date().toISOString();
  const $ = sel => document.querySelector(sel);
  const val = sel => ($(sel)?.value || "").trim();
  const findRequest = id => state().requests.find(r => r.id === id);
  const findForm = id => state().forms.find(f => f.id === id);
  const currentForm = () => findForm(ui.selectedFormId);
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Every change goes through here: read-only roles are stopped with a message
  const guard = fn => (...args) => {
    if (!canEdit()) {
      toast(`Read-only: ${ctx.currentUser.role} cannot change data`);
      return undefined;
    }
    return fn(...args);
  };

  const showError = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  const modalFoot = (act, label, cls = "t", arg = "") =>
    `<button class="btn" data-act="close">Cancel</button><button class="btn ${cls}" data-act="${act}" ${arg ? `data-arg="${safe(arg)}"` : ""}>${label}</button>`;

  const nextId = type => {
    const prefix = type === "Grievance" ? "GRV" : type === "Nomination" ? "NOM" : "DSR";
    const max = state().requests.reduce((m, r) => Math.max(m, Number(String(r.id).split("-").pop()) || 0), 0);
    return `${prefix}-2026-${String(max + 1).padStart(4, "0")}`;
  };

  /* ---------------- navigation & shell ---------------- */
  ACT["rr-tab"] = tab => {
    ui.topTab = tab;
    ui.selectedRequestId = null;
    ui.selectedFormId = null;
    ui.userMenuOpen = false;
    render();
  };
  ACT["rr-toggle-user-menu"] = () => { ui.userMenuOpen = !ui.userMenuOpen; render(); };
  ACT["rr-switch-user"] = id => {
    const user = DEMO_ACCOUNTS.find(a => a.id === id);
    if (!user) return;
    ctx.switchUser(user);
    ui.userMenuOpen = false;
    if (!ROLES[user.role].tabs.includes(ui.topTab)) ui.topTab = "dashboard";
    render();
    toast(`Signed in as ${user.name} (${user.role})`);
  };
  ACT["rr-reset"] = guard(() => {
    runtime.modal("Reset demo data?", "Rights Requests", "<p>This restores the original requests, forms, workflows and templates. Changes you made are lost.</p>",
      modalFoot("rr-confirm-reset", "Reset data", "d"));
  });
  ACT["rr-confirm-reset"] = guard(async () => {
    runtime.closeOv();
    await ctx.resetState();
    Object.assign(ui, { selectedRequestId: null, selectedFormId: null, reqPage: 1, wfPage: 1, userMenuOpen: false });
    render();
    toast("Demo data restored");
  });
  ACT["rr-range"] = v => { ui.range = Number(v) || 365; ui.reqPage = 1; render(); };
  ACT["rr-print"] = () => window.print();
  ACT["rr-refresh"] = () => { render(); toast("Dashboard refreshed"); };
  ACT["rr-copy"] = text => {
    const done = () => toast("Copied to clipboard");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => toast("Copy failed"));
    else done();
  };

  /* ---------------- requests list ---------------- */
  ACT["rr-req-type"] = t => { ui.reqType = t; ui.reqPage = 1; render(); };
  ACT["rr-req-search"] = q => { ui.reqSearch = q; ui.reqPage = 1; render(); };
  ACT["rr-req-status"] = s => { ui.reqStatus = s; ui.reqPage = 1; render(); };
  ACT["rr-req-clear"] = () => { Object.assign(ui, { reqSearch: "", reqStatus: "", reqType: "all", reqPage: 1 }); render(); };
  ACT["rr-req-sort"] = (key, el) => {
    ui.reqDir = ui.reqSort === key ? (ui.reqDir === "asc" ? "desc" : "asc") : (el?.getAttribute("data-sort-dir") || "asc");
    ui.reqSort = key;
    render();
  };
  ACT["rr-req-page"] = p => { ui.reqPage = Number(p) || 1; render(); };
  ACT["rr-req-page-size"] = s => { ui.reqPageSize = Number(s) || 10; ui.reqPage = 1; render(); };
  ACT["rr-request-row"] = i => ACT["rr-open-request"](ui.reqPagedIds[Number(i)]);
  ACT["rr-open-request"] = id => {
    if (!id || !findRequest(id)) return;
    ui.topTab = "requests";
    ui.selectedRequestId = id;
    ui.detailTab = "Activity";
    ui.mailVis = "Private";
    render();
    const content = $("#content");
    if (content) content.scrollTop = 0;
  };
  ACT["rr-back"] = () => { ui.selectedRequestId = null; render(); };

  ACT["rr-export-csv"] = () => {
    const rows = ctx.renderers.requests.filtered();
    // Prefix cells that a spreadsheet would treat as a formula
    const cell = v => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ["Request ID", "Type", "Provision", "Status", "Name", "Email", "Channel", "Language", "Received", "Deadline", "Completed"];
    const lines = [header.map(cell).join(",")].concat(rows.map(r => [
      r.id, r.type, ctx.typeRef(r.type), r.status, `${r.first} ${r.last}`, r.email, r.channel, r.language,
      formatDate(r.created), formatDate(r.deadline), r.completedAt ? formatDate(r.completedAt) : "",
    ].map(cell).join(",")));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    link.download = `rights-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast(`Exported ${rows.length} requests`);
  };

  ACT["rr-new-request"] = guard(() => {
    const forms = state().forms;
    const opt = (list, sel) => list.map(v => `<option ${v === sel ? "selected" : ""}>${safe(v)}</option>`).join("");
    runtime.modal("New request", "Log a request received by branch, email or phone", `
      <div class="rr-form-2">
        <div class="rr-field rr-span-2"><label for="rr-nr-form">Web form *</label>
          <select id="rr-nr-form"><option value="">Select a web form</option>${forms.map(f => `<option value="${safe(f.id)}">${safe(f.name)}</option>`).join("")}</select></div>
        <div class="rr-field"><label for="rr-nr-first">First name *</label><input id="rr-nr-first" autocomplete="off"></div>
        <div class="rr-field"><label for="rr-nr-last">Last name *</label><input id="rr-nr-last" autocomplete="off"></div>
        <div class="rr-field"><label for="rr-nr-email">Email *</label><input id="rr-nr-email" type="email" autocomplete="off"></div>
        <div class="rr-field"><label for="rr-nr-mobile">Mobile</label><input id="rr-nr-mobile" placeholder="+91" autocomplete="off"></div>
        <div class="rr-field"><label for="rr-nr-type">Request type</label><select id="rr-nr-type">${opt(REQUEST_TYPES.map(t => t.id))}</select></div>
        <div class="rr-field"><label for="rr-nr-subject">Subject type</label><select id="rr-nr-subject">${opt(SUBJECT_TYPES)}</select></div>
        <div class="rr-field"><label for="rr-nr-channel">Channel</label><select id="rr-nr-channel">${opt(CHANNELS, "Branch")}</select></div>
        <div class="rr-field"><label for="rr-nr-lang">Language</label><select id="rr-nr-lang">${opt(LANGUAGES)}</select></div>
        <div class="rr-field rr-span-2"><label for="rr-nr-details">Request details</label><textarea id="rr-nr-details" rows="3"></textarea></div>
      </div>
      <p class="rr-error" id="rr-nr-error" role="alert"></p>
    `, modalFoot("rr-save-request", "Create request"));
  });

  ACT["rr-save-request"] = guard(() => {
    const formId = val("#rr-nr-form"), first = val("#rr-nr-first"), last = val("#rr-nr-last"), email = val("#rr-nr-email");
    if (!formId) return showError("#rr-nr-error", "Select the web form this request belongs to.");
    if (!first || !last) return showError("#rr-nr-error", "Enter the data principal's first and last name.");
    if (!isEmail(email)) return showError("#rr-nr-error", "Enter a valid email address.");
    const form = findForm(formId);
    const type = val("#rr-nr-type");
    const created = new Date();
    const days = type === "Grievance" ? 90 : Number(form.deadlineDays) || 30;
    const workflow = state().workflows.find(w => w.regulation === "DPDP" && w.requestType === type) || state().workflows.find(w => w.requestType === type);
    const request = {
      id: nextId(type),
      type,
      subject: val("#rr-nr-subject"),
      status: "New",
      first, last, email,
      mobile: val("#rr-nr-mobile") || "—",
      state: "—", city: "—", country: "India",
      language: val("#rr-nr-lang"),
      channel: val("#rr-nr-channel"),
      form: formId,
      property: form.property,
      approver: ctx.currentUser.name,
      workflow: workflow ? workflow.name : "—",
      risk: type === "Grievance" ? "High" : "Low",
      details: val("#rr-nr-details") || "Logged manually.",
      created: created.toISOString(),
      updated: created.toISOString(),
      deadline: new Date(created.getTime() + days * DAY).toISOString(),
      completedAt: null,
      verified: false,
      rejectReason: "",
      activity: [{ at: created.toISOString(), by: ctx.currentUser.name, text: `Request logged manually from ${val("#rr-nr-channel")}.` }],
      emails: [],
      tasks: [],
      systems: (form.systems || []).map(name => {
        const s = SYSTEMS.find(x => x.name === name) || { name, fields: "" };
        return { name: s.name, fields: s.fields, action: type === "Erasure" ? (s.name.startsWith("Core") ? "Retain · KYC hold" : "Delete") : type === "Correction" ? "Correct" : "Include", state: "Not searched" };
      }),
    };
    state().requests.unshift(request);
    runtime.ledgerAdd("Rights request received", `${request.id} · ${type}`);
    persist();
    runtime.closeOv();
    ACT["rr-open-request"](request.id);
    toast(`${request.id} created`);
    return undefined;
  });

  /* ---------------- request detail ---------------- */
  ACT["rr-detail-tab"] = t => { ui.detailTab = t; render(); };
  ACT["rr-mail-vis"] = v => { ui.mailVis = v; render(); };

  ACT["rr-advance"] = guard(stage => {
    const r = findRequest(ui.selectedRequestId);
    if (!r || isClosed(r)) return;
    const next = STAGES.indexOf(stage), cur = STAGES.indexOf(r.status);
    if (next !== cur + 1) { toast(next <= cur ? "That phase is already done" : "Advance one phase at a time"); return; }
    r.status = stage;
    if (stage === "In Progress") r.verified = true;
    if (stage === "Complete") r.completedAt = nowIso();
    logActivity(r, `Status advanced to ${stage}.`);
    runtime.ledgerAdd(`Rights request: ${stage}`, `${r.id} · ${r.type}`);
    persist(`${r.id} moved to ${stage}`);
    render();
  });

  ACT["rr-reject"] = guard(id => {
    runtime.modal("Reject this request?", id, `
      <div class="rr-field"><label for="rr-reject-reason">Reason *</label>
        <textarea id="rr-reject-reason" rows="3" placeholder="For example, identity could not be verified"></textarea>
        <small class="rr-hint">The reason is kept on the request and shared in your response.</small></div>
      <p class="rr-error" id="rr-reject-error" role="alert"></p>
    `, modalFoot("rr-confirm-reject", "Reject request", "d", id));
  });
  ACT["rr-confirm-reject"] = guard(id => {
    const reason = val("#rr-reject-reason");
    if (!reason) return showError("#rr-reject-error", "A reason is required.");
    const r = findRequest(id);
    r.status = "Rejected";
    r.rejectReason = reason;
    logActivity(r, `Request rejected: ${reason}`);
    runtime.ledgerAdd("Rights request: Rejected", `${r.id} · ${r.type}`);
    persist("Request rejected");
    runtime.closeOv();
    render();
    return undefined;
  });
  ACT["rr-reopen"] = guard(id => {
    const r = findRequest(id);
    r.status = "In Progress";
    r.completedAt = null;
    r.rejectReason = "";
    logActivity(r, "Request reopened.");
    runtime.ledgerAdd("Rights request: Reopened", `${r.id} · ${r.type}`);
    persist("Request reopened");
    render();
  });
  ACT["rr-delete-request"] = guard(id => {
    runtime.modal("Delete this request?", id, "<p>The request, its messages and tasks are removed. Entries already in the Proof Ledger stay.</p>",
      modalFoot("rr-confirm-delete-request", "Delete request", "d", id));
  });
  ACT["rr-confirm-delete-request"] = guard(id => {
    state().requests = state().requests.filter(r => r.id !== id);
    runtime.ledgerAdd("Rights request deleted", id);
    persist("Request deleted");
    runtime.closeOv();
    ui.selectedRequestId = null;
    render();
  });
  ACT["rr-resend-verify"] = guard(id => {
    const r = findRequest(id);
    logActivity(r, "Verification link re-sent.");
    persist("Verification link re-sent (demo)");
    render();
  });

  ACT["rr-apply-template"] = (tplId, el) => {
    const r = findRequest(el?.getAttribute("data-arg"));
    const tpl = state().templates.find(t => t.id === tplId);
    const box = $("#rr-mail-body");
    if (!r || !tpl || !box) return;
    const html = sanitizeRich(tpl.body).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n");
    const div = document.createElement("div");
    div.innerHTML = html;
    box.value = div.textContent
      .replace(/\[Data Principal Name\]/g, `${r.first} ${r.last}`)
      .replace(/\[Request ID\]/g, r.id)
      .replace(/\[Due Date\]/g, formatDate(r.deadline))
      .replace(/\[Company privacy team\]/g, `${COMPANY} privacy team`)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  ACT["rr-send-mail"] = guard(id => {
    const r = findRequest(id);
    const body = val("#rr-mail-body");
    if (!body) { toast("Write a message first"); return; }
    const isPublic = ui.mailVis === "Public";
    const to = isPublic ? val("#rr-mail-to") : "";
    if (isPublic && !isEmail(to)) { toast("Enter a valid recipient email"); return; }
    r.emails = r.emails || [];
    r.emails.unshift({ vis: ui.mailVis, to, at: nowIso(), by: ctx.currentUser.name, body });
    logActivity(r, isPublic ? `Email sent to ${to}.` : "Private note added.");
    persist(isPublic ? "Email sent (demo)" : "Note saved");
    render();
  });

  ACT["rr-add-task"] = guard(id => {
    const title = val("#rr-task-new");
    if (!title) { toast("Enter a task title"); return; }
    const r = findRequest(id);
    r.tasks = r.tasks || [];
    r.tasks.push({ id: "t" + Date.now(), title, done: false });
    logActivity(r, `Task added: ${title}`);
    persist("Task added");
    render();
  });
  ACT["rr-toggle-task"] = (checked, el) => {
    const r = findRequest(el.getAttribute("data-request"));
    const task = r && (r.tasks || []).find(t => t.id === el.getAttribute("data-task"));
    if (!task) return;
    if (!canEdit()) { el.checked = task.done; toast("Read-only: your role cannot change tasks"); return; }
    task.done = checked === "true";
    logActivity(r, `${task.done ? "Completed" : "Reopened"} task: ${task.title}`);
    persist();
    render();
  };
  ACT["rr-run-search"] = guard(arg => {
    const [id, idx] = String(arg).split("|");
    const r = findRequest(id);
    const sys = r && r.systems[Number(idx)];
    if (!sys) return;
    sys.state = "Searched";
    logActivity(r, `Person Finder searched ${sys.name}.`);
    persist(`Search complete in ${sys.name} (simulated)`);
    render();
  });

  /* ---------------- web forms ---------------- */
  ACT["rr-open-form"] = id => {
    if (!findForm(id)) return;
    ui.topTab = "forms";
    ui.selectedFormId = id;
    ui.selectedRequestId = null;
    ui.formTab = "Basic";
    ui.addingField = false;
    render();
  };
  ACT["rr-forms-back"] = () => { ui.selectedFormId = null; ui.addingField = false; render(); };
  ACT["rr-form-tab"] = t => { ui.formTab = t; ui.addingField = false; render(); };
  ACT["rr-form-section"] = s => { ui.formSection = ui.formSection === s ? "" : s; ui.addingField = false; render(); };

  ACT["rr-new-form"] = guard(() => {
    runtime.modal("New web form", "Rights Requests", `
      <div class="rr-field"><label for="rr-nf-name">Form name *</label><input id="rr-nf-name" autocomplete="off"></div>
      <div class="rr-field"><label for="rr-nf-property">Property</label><select id="rr-nf-property">${PROPERTIES.map(p => `<option>${safe(p)}</option>`).join("")}</select></div>
      <p class="rr-error" id="rr-nf-err" role="alert"></p>
    `, modalFoot("rr-save-new-form", "Create form"));
  });
  ACT["rr-save-new-form"] = guard(() => {
    const name = val("#rr-nf-name");
    if (!name) return showError("#rr-nf-err", "Form name is required.");
    if (state().forms.some(f => f.name.toLowerCase() === name.toLowerCase())) return showError("#rr-nf-err", "A form with this name already exists.");
    const base = JSON.parse(JSON.stringify(state().forms[0] || {}));
    const now = nowIso();
    const form = {
      ...base,
      id: "form-" + Date.now().toString(36),
      name,
      property: val("#rr-nf-property"),
      status: "Draft",
      created: now,
      updated: now,
      custom: [],
      history: [],
      requestTypes: base.requestTypes || REQUEST_TYPES.slice(0, 3).map(t => t.id),
      subjectTypes: base.subjectTypes || ["Customer"],
      systems: base.systems || [],
    };
    state().forms.push(form);
    persist("Form created as a draft");
    runtime.closeOv();
    ACT["rr-open-form"](form.id);
    return undefined;
  });
  ACT["rr-delete-form"] = guard(id => {
    const f = findForm(id);
    const used = state().requests.filter(r => r.form === id).length;
    runtime.modal("Delete this form?", f.name, `<p>The public link stops working.${used ? ` ${used} existing requests keep their data.` : ""}</p>`,
      modalFoot("rr-confirm-delete-form", "Delete form", "d", id));
  });
  ACT["rr-confirm-delete-form"] = guard(id => {
    state().forms = state().forms.filter(f => f.id !== id);
    persist("Form deleted");
    runtime.closeOv();
    ui.selectedFormId = null;
    render();
  });
  ACT["rr-form-history"] = id => {
    const f = findForm(id);
    runtime.modal("Publish history", f.name, (f.history || []).length ? `
      <ol class="rr-timeline">${f.history.map(h => `<li><span class="rr-tl-dot" aria-hidden="true"></span><div><b>Version ${h.v}</b> <small>${safe(ctx.formatDateTime(h.at))}</small><p>Published by ${safe(h.by)}</p></div></li>`).join("")}</ol>
    ` : "<p>This form has never been published.</p>", '<button class="btn" data-act="close">Close</button>');
  };

  // Field edits refresh the preview in place, so colour pickers and focus are not interrupted
  ACT["rr-form-set"] = (value, el) => {
    const f = currentForm();
    if (!f || !canEdit()) return;
    const key = el.getAttribute("data-key");
    f[key] = ["headerSize", "footerSize", "deadlineDays"].includes(key) ? Number(value) || 0 : value;
    f.updated = nowIso();
    persist(null, true);
    const pv = $(".rr-preview");
    if (pv) pv.outerHTML = ctx.renderers.forms.preview(f);
    if (key === "name") {
      const h = $(".rr-detail-title h2");
      if (h) h.textContent = value;
    }
  };
  ACT["rr-form-toggle"] = (checked, el) => {
    const f = currentForm();
    if (!f) return;
    if (!canEdit()) { render(); return; }
    const key = el.getAttribute("data-key"), v = el.getAttribute("data-value");
    const on = checked === "true";
    if (!on && key === "requestTypes" && f.requestTypes.length === 1) { toast("Keep at least one request type on the form"); render(); return; }
    if (!on && key === "subjectTypes" && f.subjectTypes.length === 1) { toast("Keep at least one subject type on the form"); render(); return; }
    f[key] = on ? f[key].concat(v) : f[key].filter(x => x !== v);
    f.updated = nowIso();
    persist();
    render();
  };
  ACT["rr-form-flag"] = (checked, el) => {
    const f = currentForm();
    if (!f || !canEdit()) { render(); return; }
    f[el.getAttribute("data-key")] = checked === "true";
    f.updated = nowIso();
    persist();
    render();
  };
  ACT["rr-form-language"] = guard(v => { const f = currentForm(); f.language = v; persist(); render(); });
  ACT["rr-form-verification"] = guard(v => { const f = currentForm(); f.verification = v; f.updated = nowIso(); persist(); render(); });

  ACT["rr-field-add"] = guard(() => { ui.addingField = true; render(); });
  ACT["rr-field-cancel"] = () => { ui.addingField = false; render(); };
  ACT["rr-field-save"] = guard(() => {
    const type = val("#rr-nf-type"), label = val("#rr-nf-label");
    if (!type) return showError("#rr-nf-error", "Select a field type.");
    if (!label) return showError("#rr-nf-error", "Enter a label.");
    const options = val("#rr-nf-options").split(",").map(s => s.trim()).filter(Boolean);
    if (["Select", "Radio", "Checkbox"].includes(type) && !options.length) return showError("#rr-nf-error", `${type} fields need at least one option.`);
    const f = currentForm();
    f.custom.push({ type, label, required: Boolean($("#rr-nf-required")?.checked), options });
    f.updated = nowIso();
    ui.addingField = false;
    persist("Field added");
    render();
    return undefined;
  });
  ACT["rr-field-delete"] = guard(i => {
    const f = currentForm();
    f.custom.splice(Number(i), 1);
    f.updated = nowIso();
    persist("Field removed");
    render();
  });

  const richEditor = (id, html) => `
    <div class="rr-rich-bar" role="toolbar" aria-label="Formatting">
      <button type="button" class="btn sm" data-act="rr-rich" data-arg="bold" onmousedown="event.preventDefault()" aria-label="Bold"><b>B</b></button>
      <button type="button" class="btn sm" data-act="rr-rich" data-arg="italic" onmousedown="event.preventDefault()" aria-label="Italic"><i>I</i></button>
      <button type="button" class="btn sm" data-act="rr-rich" data-arg="underline" onmousedown="event.preventDefault()" aria-label="Underline"><u>U</u></button>
    </div>
    <div id="${id}" class="rr-rich" contenteditable="true" role="textbox" aria-multiline="true">${sanitizeRich(html)}</div>
  `;
  ACT["rr-rich"] = cmd => { if (["bold", "italic", "underline"].includes(cmd)) document.execCommand(cmd); };

  ACT["rr-edit-form-text"] = guard(key => {
    const f = currentForm();
    runtime.modal(key === "welcome" ? "Welcome text" : "Footer text", f.name, richEditor("rr-form-text", f[key]),
      modalFoot("rr-save-form-text", "Save", "t", key));
  });
  ACT["rr-save-form-text"] = guard(key => {
    const f = currentForm();
    f[key] = sanitizeRich($("#rr-form-text")?.innerHTML || "");
    f.updated = nowIso();
    persist("Text saved");
    runtime.closeOv();
    render();
  });
  ACT["rr-save-form"] = guard(() => {
    const f = currentForm();
    if (!String(f.name).trim()) { toast("Form name is required"); return; }
    f.updated = nowIso();
    persist("Draft saved");
    render();
  });
  ACT["rr-publish-form"] = guard(() => {
    const f = currentForm();
    if (!String(f.name).trim()) { toast("Form name is required"); return; }
    const v = ((f.history || [])[0]?.v || 0) + 1;
    f.status = "Published";
    f.updated = nowIso();
    f.history = [{ v, at: f.updated, by: ctx.currentUser.name }].concat(f.history || []);
    runtime.ledgerAdd("Rights form published", `${f.name} · v${v}`);
    persist(`Form published as version ${v}`);
    render();
  });

  /* ---------------- workflows ---------------- */
  ACT["rr-wf-search"] = q => { ui.wfSearch = q; ui.wfPage = 1; render(); };
  ACT["rr-wf-sort"] = (key, el) => {
    ui.wfDir = ui.wfSort === key ? (ui.wfDir === "asc" ? "desc" : "asc") : (el?.getAttribute("data-sort-dir") || "asc");
    ui.wfSort = key;
    render();
  };
  ACT["rr-wf-page"] = p => { ui.wfPage = Number(p) || 1; render(); };
  ACT["rr-wf-page-size"] = s => { ui.wfPageSize = Number(s) || 10; ui.wfPage = 1; render(); };
  ACT["rr-workflow-row"] = i => ACT["rr-view-workflow"](ui.wfPagedIds[Number(i)]);
  ACT["rr-view-workflow"] = id => {
    const w = state().workflows.find(x => x.id === id);
    if (!w) return;
    const open = state().requests.filter(r => r.workflow === w.name && !isClosed(r)).length;
    runtime.modal(w.name, `${w.regulation} · ${w.requestType}`, `
      <dl class="rr-info-grid is-3">
        <div class="rr-info"><dt>Status</dt><dd>${runtime.pill(w.status === "Active" ? "ok" : "n", w.status)}</dd></div>
        <div class="rr-info"><dt>Response deadline</dt><dd>${Number(w.slaDays) || 30} days</dd></div>
        <div class="rr-info"><dt>Open requests</dt><dd>${open}</dd></div>
      </dl>
      <div class="rr-wf-steps">
        ${w.steps.map((s, i) => `<span class="rr-wf-step"><i>${i + 1}</i>${safe(s)}</span>${i < w.steps.length - 1 ? '<span class="rr-wf-arrow" aria-hidden="true">→</span>' : ""}`).join("")}
      </div>
      <p class="rr-hint">Created by ${safe(w.createdBy)} on ${safe(formatDate(w.created))}. Last updated by ${safe(w.updatedBy)}.</p>
    `, `
      <button class="btn" data-act="close">Close</button>
      ${canEdit() ? `
        <button class="btn d" data-act="rr-delete-workflow" data-arg="${safe(w.id)}">Delete</button>
        <button class="btn t" data-act="rr-toggle-workflow" data-arg="${safe(w.id)}">${w.status === "Active" ? "Set to draft" : "Activate"}</button>
      ` : ""}
    `);
  };
  ACT["rr-toggle-workflow"] = guard(id => {
    const w = state().workflows.find(x => x.id === id);
    w.status = w.status === "Active" ? "Draft" : "Active";
    w.updated = nowIso();
    w.updatedBy = ctx.currentUser.name;
    persist(`${w.name} is now ${w.status === "Active" ? "active" : "a draft"}`);
    runtime.closeOv();
    render();
  });
  ACT["rr-delete-workflow"] = guard(id => {
    const w = state().workflows.find(x => x.id === id);
    const open = state().requests.filter(r => r.workflow === w.name && !isClosed(r)).length;
    if (open) { toast(`${open} open requests use this workflow. Close or move them first.`); return; }
    state().workflows = state().workflows.filter(x => x.id !== id);
    persist("Workflow deleted");
    runtime.closeOv();
    render();
  });
  ACT["rr-new-workflow"] = guard(() => {
    runtime.modal("New workflow", "Rights Requests", `
      <div class="rr-field"><label for="rr-wf-name">Workflow name *</label><input id="rr-wf-name" autocomplete="off"></div>
      <div class="rr-form-2">
        <div class="rr-field"><label for="rr-wf-reg">Regulation</label><select id="rr-wf-reg">${REGULATIONS.map(r => `<option>${r}</option>`).join("")}</select></div>
        <div class="rr-field"><label for="rr-wf-type">Request type</label><select id="rr-wf-type">${REQUEST_TYPES.map(t => `<option>${safe(t.id)}</option>`).join("")}</select></div>
        <div class="rr-field"><label for="rr-wf-sla">Response deadline (days)</label><input id="rr-wf-sla" type="number" min="1" max="90" value="30"></div>
      </div>
      <p class="rr-hint">New workflows start as drafts with the phases ${STAGES.join(" → ")}.</p>
      <p class="rr-error" id="rr-wf-error" role="alert"></p>
    `, modalFoot("rr-save-workflow", "Create workflow"));
  });
  ACT["rr-save-workflow"] = guard(() => {
    const name = val("#rr-wf-name");
    const sla = Number(val("#rr-wf-sla"));
    if (!name) return showError("#rr-wf-error", "Workflow name is required.");
    if (state().workflows.some(w => w.name.toLowerCase() === name.toLowerCase())) return showError("#rr-wf-error", "A workflow with this name already exists.");
    if (!(sla >= 1 && sla <= 90)) return showError("#rr-wf-error", "The deadline must be between 1 and 90 days.");
    const now = nowIso();
    state().workflows.unshift({
      id: "wf-" + Date.now().toString(36), name, regulation: val("#rr-wf-reg"), requestType: val("#rr-wf-type"),
      status: "Draft", slaDays: sla, steps: STAGES.slice(), createdBy: ctx.currentUser.name, updatedBy: ctx.currentUser.name, created: now, updated: now,
    });
    Object.assign(ui, { wfSort: "updated", wfDir: "desc", wfPage: 1, wfSearch: "" });
    persist("Workflow created as a draft");
    runtime.closeOv();
    render();
    return undefined;
  });

  /* ---------------- email templates ---------------- */
  ACT["rr-tpl-search"] = q => { ui.tplSearch = q; render(); };
  const templateModal = t => {
    const tpl = t || { name: "", body: "Dear [Data Principal Name],<br><br>" };
    runtime.modal(t ? "Edit template" : "New template", "Email templates", `
      <div class="rr-macros">
        <b>Macros</b>
        ${MACROS.map(([m, d]) => `<div><code>${safe(m)}</code> <span>${safe(d)}</span></div>`).join("")}
      </div>
      <div class="rr-field"><label for="rr-tpl-name">Template name *</label><input id="rr-tpl-name" value="${safe(tpl.name)}" autocomplete="off"></div>
      <div class="rr-field"><label>Message *</label>${richEditor("rr-tpl-body", tpl.body)}</div>
      <p class="rr-error" id="rr-tpl-error" role="alert"></p>
    `, modalFoot("rr-save-template", "Save template", "t", t ? t.id : ""));
  };
  ACT["rr-new-template"] = guard(() => templateModal(null));
  ACT["rr-edit-template"] = guard(id => templateModal(state().templates.find(t => t.id === id)));
  ACT["rr-save-template"] = guard(id => {
    const name = val("#rr-tpl-name");
    const body = sanitizeRich($("#rr-tpl-body")?.innerHTML || "");
    const text = (() => { const d = document.createElement("div"); d.innerHTML = body; return d.textContent.trim(); })();
    if (!name || !text) return showError("#rr-tpl-error", "Template name and message are required.");
    if (state().templates.some(t => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) return showError("#rr-tpl-error", "A template with this name already exists.");
    const now = nowIso();
    if (id) Object.assign(state().templates.find(t => t.id === id), { name, body, updated: now });
    else state().templates.push({ id: "tpl-" + Date.now().toString(36), name, body, created: now, updated: now });
    persist("Template saved");
    runtime.closeOv();
    render();
    return undefined;
  });
  ACT["rr-delete-template"] = guard(id => {
    const t = state().templates.find(x => x.id === id);
    runtime.modal("Delete this template?", t.name, "<p>Messages already sent with it are not affected.</p>", modalFoot("rr-confirm-delete-template", "Delete template", "d", id));
  });
  ACT["rr-confirm-delete-template"] = guard(id => {
    state().templates = state().templates.filter(t => t.id !== id);
    persist("Template deleted");
    runtime.closeOv();
    render();
  });

  /* ---------------- tasks ---------------- */
  ACT["rr-task-filter"] = f => { ui.taskFilter = f; render(); };
  ACT["rr-task-search"] = q => { ui.taskSearch = q; render(); };

}
