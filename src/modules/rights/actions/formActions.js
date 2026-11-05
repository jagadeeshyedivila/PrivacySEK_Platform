// Web form actions: the forms list, the draft editor, publishing and the interactive preview.
// Edits change the draft only. Save writes it to the store; Publish also snapshots it as the
// version visitors see. Leaving the editor with unsaved changes asks first.
import {
  FORM_URL_BASE, OPTION_TYPES, SIZE_LIMITS, STANDARD_FIELDS, standardField, createForm, formContent, slugIdentifier, tr,
} from "../forms/formModel.js";
import { createFormState } from "../forms/formState.js";
import { newCaptcha } from "../screens/RightsForms.js";

const MAX_UPLOAD = 1024 * 1024;
const IMAGE_BOX = { logo: [360, 96], favicon: [64, 64] };
const RICH_KEYS = { welcome: "Welcome text", footer: "Footer text", thankYou: "Thank-you message" };

let leaveHandler = null;
let pendingLeave = null;

// Runs `next` now, or after the user saves or discards the form being edited
export function requestLeave(next) {
  return leaveHandler ? leaveHandler(next) : next();
}

export function registerFormActions(ctx, ACT, h) {
  const { runtime, ui, safe, REQUEST_TYPES, SUBJECT_TYPES, canEdit, persist, sanitizeRich, formatDateTime } = ctx;
  const { guard, modalFoot, showError, val, $, toast, render, nowIso, buildRequest } = h;
  const fs = createFormState(ctx);
  const clone = fs.clone;
  const R = () => ctx.renderers.forms;
  const draft = () => fs.draft();
  const afterRender = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  const focus = sel => afterRender(() => { const el = $(sel); if (el) el.focus(); });

  /* ---------------- draft lifecycle ---------------- */
  const dropDraft = () => { ui.formDraft = null; ui.newField = null; };

  function saveDraft() {
    const d = ui.formDraft, s = fs.saved();
    if (!d || !s) return false;
    if (!d.name.trim()) {
      ui.formTab = "Basic";
      render();
      toast("Enter a form name before saving");
      focus("#rr-form-name");
      return false;
    }
    d.name = d.name.trim();
    const next = { ...clone(d), id: s.id, status: s.status, created: s.created, history: s.history, published: s.published, updated: nowIso() };
    Object.keys(s).forEach(k => { delete s[k]; });
    Object.assign(s, next);
    ui.formDraft = clone(s);
    persist();
    return true;
  }

  leaveHandler = next => {
    if (!fs.isDirty()) { if (ui.formDraft) dropDraft(); next(); return; }
    pendingLeave = next;
    const name = ui.formDraft.name.trim() || "Untitled form";
    runtime.modal("Save your changes?", "Web form", `<p>“${safe(name)}” has changes that are not saved. If you leave now, they are lost.</p>`, `
      <button class="btn" data-act="close">Keep editing</button>
      <button class="btn d" data-act="rr-leave-discard">Discard changes</button>
      <button class="btn t" data-act="rr-leave-save" ${canEdit() ? "" : "disabled"}>Save and continue</button>
    `);
  };
  ACT["rr-leave-discard"] = () => {
    runtime.closeOv();
    dropDraft();
    const next = pendingLeave; pendingLeave = null;
    if (next) next();
    toast("Changes discarded");
  };
  ACT["rr-leave-save"] = guard(() => {
    runtime.closeOv();
    if (!saveDraft()) return;
    toast("Draft saved");
    dropDraft();
    const next = pendingLeave; pendingLeave = null;
    if (next) next();
  });

  // Updates the parts of the editor that depend on the draft without rebuilding the inputs,
  // so typing keeps focus and the cursor position
  function refreshLive() {
    const d = ui.formDraft;
    if (!d) return;
    const head = $("#content [data-live-head]");
    if (head) head.outerHTML = R().editorHead(d);
    const tabs = $("#content [data-live-tabs]");
    if (tabs) tabs.outerHTML = R().tabsNav(d, ui.formTab);
    const pv = $("#content [data-live-preview]");
    if (pv) pv.outerHTML = R().preview(d, { lang: ui.previewLang });
    const nameErr = $("#rr-err-name");
    if (nameErr) {
      const dup = fs.forms().some(x => x.id !== d.id && x.name.trim().toLowerCase() === d.name.trim().toLowerCase());
      nameErr.textContent = !d.name.trim() ? "Form name is required." : dup ? "Another form already uses this name." : "";
    }
    const idErr = $("#rr-err-ident");
    if (idErr) {
      const m = R().identifierMessage(d);
      idErr.textContent = m.text;
      idErr.className = m.ok ? "rr-hint" : "rr-error";
    }
  }

  /* ---------------- list ---------------- */
  ACT["rr-forms-search"] = q => { ui.formSearch = q; render(); };
  ACT["rr-forms-filter"] = s => { ui.formFilter = s; render(); };
  ACT["rr-forms-clear"] = () => { ui.formSearch = ""; ui.formFilter = "all"; render(); };

  function openForm(id) {
    Object.assign(ui, { topTab: "forms", selectedFormId: id, selectedRequestId: null, formTab: "Basic", newField: null, formDraft: null, previewLang: null, userMenuOpen: false });
    render();
    const content = $("#content");
    if (content) content.scrollTop = 0;
  }
  ACT["rr-open-form"] = id => {
    if (!fs.find(id)) return;
    if (ui.selectedFormId === id && ui.topTab === "forms") return;
    requestLeave(() => openForm(id));
  };
  ACT["rr-forms-back"] = () => requestLeave(() => { ui.selectedFormId = null; render(); });
  ACT["rr-form-tab"] = t => { ui.formTab = t; render(); };
  ACT["rr-goto-tab"] = t => { runtime.closeOv(); ui.formTab = t; render(); };
  ACT["rr-form-section"] = s => { ui.formSection = ui.formSection === s ? "" : s; render(); };

  const uniqueName = base => {
    const names = fs.forms().map(f => f.name.toLowerCase());
    let name = base;
    for (let n = 2; names.includes(name.toLowerCase()); n++) name = `${base} ${n}`;
    return name;
  };
  const takenIds = () => fs.forms().map(f => f.identifier);
  const newId = () => "form-" + Date.now().toString(36);

  ACT["rr-new-form"] = guard(() => {
    const forms = fs.forms();
    runtime.modal("New web form", "Rights Requests", `
      <div class="rr-field"><label for="rr-nf-name">Form name *</label><input id="rr-nf-name" autocomplete="off" maxlength="80" placeholder="For example, Customer Rights Form"></div>
      <div class="rr-form-2">
        <div class="rr-field"><label for="rr-nf-property">Property</label><select id="rr-nf-property">${ctx.PROPERTIES.map(p => `<option>${safe(p)}</option>`).join("")}</select></div>
        <div class="rr-field"><label for="rr-nf-from">Start from</label><select id="rr-nf-from">
          <option value="">Blank form</option>
          ${forms.map(f => `<option value="${safe(f.id)}">Copy of ${safe(f.name)}</option>`).join("")}
        </select></div>
      </div>
      <p class="rr-hint">New forms start as drafts. Nothing is public until you publish.</p>
      <p class="rr-error" id="rr-nf-err" role="alert"></p>
    `, modalFoot("rr-save-new-form", "Create form"));
    focus("#rr-nf-name");
  });
  ACT["rr-save-new-form"] = guard(() => {
    const name = val("#rr-nf-name");
    if (!name) return showError("#rr-nf-err", "Form name is required.");
    if (fs.forms().some(f => f.name.toLowerCase() === name.toLowerCase())) return showError("#rr-nf-err", "A form with this name already exists.");
    const from = fs.find(val("#rr-nf-from"));
    const form = createForm({ id: newId(), name, property: val("#rr-nf-property"), identifier: slugIdentifier(name, takenIds()), now: nowIso(), from });
    ctx.state.forms.push(form);
    persist("Form created as a draft");
    runtime.closeOv();
    requestLeave(() => openForm(form.id));
    return undefined;
  });
  ACT["rr-duplicate-form"] = guard(id => {
    const src = fs.find(id);
    if (!src) return;
    const name = uniqueName(`${src.name} (copy)`);
    const form = createForm({ id: newId(), name, property: src.property, identifier: slugIdentifier(name, takenIds()), now: nowIso(), from: src });
    ctx.state.forms.push(form);
    persist(`Created “${name}” as a draft`);
    requestLeave(() => openForm(form.id));
  });
  ACT["rr-delete-form"] = guard(id => {
    const f = fs.find(id);
    if (!f) return;
    const used = ctx.state.requests.filter(r => r.form === id).length;
    runtime.modal("Delete this form?", f.name, `
      <p>${f.status === "Published" ? "The public link stops working straight away. " : ""}This cannot be undone.</p>
      ${used ? `<p class="rr-hint">${used} request${used > 1 ? "s" : ""} raised through this form keep their data.</p>` : ""}
    `, modalFoot("rr-confirm-delete-form", "Delete form", "d", id));
  });
  ACT["rr-confirm-delete-form"] = guard(id => {
    ctx.state.forms = ctx.state.forms.filter(f => f.id !== id);
    if (ui.selectedFormId === id) { ui.selectedFormId = null; dropDraft(); }
    persist("Form deleted");
    runtime.closeOv();
    render();
  });

  ACT["rr-form-history"] = id => {
    const f = fs.find(id);
    if (!f) return;
    const editingThis = fs.isEditing() && ui.selectedFormId === id;
    const rows = (f.history || []).map((x, i) => `
      <tr>
        <td class="rr-mono">v${x.v}</td>
        <td>${safe(x.name || f.name)}</td>
        <td>${safe(formatDateTime(x.at))}</td>
        <td>${safe(x.by)}</td>
        <td>${i === 0 && f.status === "Published" ? runtime.pill("ok", "Live") : runtime.pill("n", "Archived")}</td>
      </tr>`).join("");
    const canRestore = editingThis && canEdit() && f.published && (fs.hasUnpublishedChanges(f) || fs.isDirty());
    runtime.modal("Publish history", f.name, rows ? `
      <div class="tw"><table class="t rr-table rr-hist"><thead><tr><th>Version</th><th>Form name</th><th>Published</th><th>By</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${fs.hasUnpublishedChanges(f) ? '<p class="rr-hint">The saved form has changes that are not published yet.</p>' : ""}
    ` : "<p>This form has never been published.</p>", `
      <button class="btn" data-act="close">Close</button>
      ${canRestore ? '<button class="btn" data-act="rr-restore-live" title="Replace the draft with the version visitors see now">Load live version into draft</button>' : ""}
    `);
  };
  ACT["rr-restore-live"] = guard(() => {
    const s = fs.saved();
    if (!s || !s.published) return;
    ui.formDraft = { ...clone(s), ...clone(s.published) };
    runtime.closeOv();
    render();
    toast("Live version loaded. Save to keep it.");
  });

  /* ---------------- save, discard, publish ---------------- */
  ACT["rr-save-form"] = guard(() => {
    if (!fs.isDirty()) return;
    if (!saveDraft()) return;
    render();
    toast(fs.saved().status === "Published" ? "Saved. Publish to update the live form." : "Draft saved");
  });
  ACT["rr-discard-form"] = guard(() => {
    runtime.modal("Discard your changes?", ui.formDraft.name || "Web form", "<p>The form goes back to how it was when you last saved.</p>",
      modalFoot("rr-confirm-discard", "Discard changes", "d"));
  });
  ACT["rr-confirm-discard"] = () => {
    runtime.closeOv();
    dropDraft();
    render();
    toast("Changes discarded");
  };

  ACT["rr-publish-form"] = guard(() => {
    const d = draft();
    if (!d) return;
    const problems = fs.problems(d);
    if (problems.length) {
      runtime.modal("Fix these before publishing", d.name || "Web form", `
        <ul class="rr-problems">${problems.map(p => `
          <li><span>${safe(p.msg)}</span><button class="btn sm" data-act="rr-goto-tab" data-arg="${p.tab}">Go to ${p.tab}</button></li>`).join("")}</ul>
      `, '<button class="btn" data-act="close">Close</button>');
      return;
    }
    const s = fs.saved();
    const v = ((s.history || [])[0]?.v || 0) + 1;
    runtime.modal(`Publish version ${v}?`, d.name, `
      <p>Visitors will see this version at:</p>
      <div class="rr-copy-row"><code>${safe(FORM_URL_BASE + d.identifier)}</code></div>
      ${fs.isDirty() ? '<p class="rr-hint">Your unsaved changes are saved first.</p>' : ""}
    `, modalFoot("rr-confirm-publish", "Publish"));
  });
  ACT["rr-confirm-publish"] = guard(() => {
    runtime.closeOv();
    if (fs.isDirty() && !saveDraft()) return;
    const s = fs.saved();
    const v = ((s.history || [])[0]?.v || 0) + 1;
    s.status = "Published";
    s.updated = nowIso();
    s.published = formContent(clone(s));
    s.history = [{ v, at: s.updated, by: ctx.currentUser.name, name: s.name }].concat(s.history || []);
    ui.formDraft = clone(s);
    runtime.ledgerAdd("Rights form published", `${s.name} · v${v}`);
    persist(`Published version ${v}`);
    render();
  });

  /* ---------------- draft edits ---------------- */
  // Text inputs: refreshed in place so focus is kept
  ACT["rr-fd-set"] = (value, el) => {
    const d = draft();
    if (!d || !canEdit()) return;
    const key = el.getAttribute("data-key");
    let v = value;
    if (key === "identifier") {
      v = value.toLowerCase().replace(/[\s_]+/g, "-");
      if (v !== value) {
        const pos = el.selectionStart;
        el.value = v;
        try { el.setSelectionRange(pos, pos); } catch (e) { /* not a text input */ }
      }
    }
    d[key] = v;
    refreshLive();
  };
  ACT["rr-fd-color"] = (value, el) => {
    const d = draft();
    if (!d || !canEdit()) return;
    const key = el.getAttribute("data-key");
    d[key] = value.toLowerCase();
    const hex = $(`#rr-fs-${key}-hex`);
    if (hex) hex.value = d[key];
    refreshLive();
  };
  ACT["rr-fd-hex"] = (value, el) => {
    const d = draft();
    if (!d || !canEdit()) return;
    const v = value.trim().replace(/^([0-9a-f]{6})$/i, "#$1");
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    const key = el.getAttribute("data-key");
    d[key] = v.toLowerCase();
    const picker = $(`#rr-fs-${key}`);
    if (picker) picker.value = d[key];
    refreshLive();
  };
  ACT["rr-fd-hex-commit"] = (_, el) => {
    const d = draft();
    if (!d) return;
    const key = el.getAttribute("data-key");
    if (el.value.trim().toLowerCase().replace(/^([0-9a-f]{6})$/, "#$1") !== d[key]) {
      el.value = d[key];
      toast("Enter a colour as a 6-digit hex code, like #0f766e");
    }
  };
  // Numbers apply while typing when they are in range, and are kept in range when the field is left
  ACT["rr-fd-num"] = (value, el) => {
    const d = draft();
    if (!d || !canEdit()) return;
    const key = el.getAttribute("data-key");
    const [min, max] = SIZE_LIMITS[key];
    const n = Number(value);
    if (value !== "" && Number.isFinite(n) && n >= min && n <= max) {
      d[key] = Math.round(n);
      refreshLive();
    }
  };
  ACT["rr-fd-num-commit"] = (_, el) => {
    const d = draft();
    if (!d || !canEdit()) return;
    const key = el.getAttribute("data-key");
    const [min, max] = SIZE_LIMITS[key];
    const n = Number(el.value);
    const kept = el.value === "" || !Number.isFinite(n) ? d[key] : Math.min(max, Math.max(min, Math.round(n)));
    if (String(kept) !== el.value) toast(`Use a value from ${min} to ${max}`);
    d[key] = kept;
    el.value = kept;
    refreshLive();
  };
  ACT["rr-fd-select"] = (value, el) => {
    const d = draft();
    if (!d || !canEdit()) { render(); return; }
    d[el.getAttribute("data-key")] = value;
    refreshLive();
  };
  ACT["rr-fd-toggle"] = (checked, el) => {
    const d = draft();
    if (!d) return;
    if (!canEdit()) { render(); return; }
    const key = el.getAttribute("data-key"), v = el.getAttribute("data-value");
    const on = checked === "true";
    if (!on && (key === "requestTypes" || key === "subjectTypes") && d[key].length === 1) {
      toast(`Keep at least one ${key === "requestTypes" ? "request type" : "subject type"} on the form`);
      el.checked = true;
      return;
    }
    d[key] = on ? d[key].concat(v) : d[key].filter(x => x !== v);
    // Keep the order of the option lists
    const order = key === "requestTypes" ? REQUEST_TYPES.map(t => t.id) : key === "subjectTypes" ? SUBJECT_TYPES : ctx.SYSTEMS.map(s => s.name);
    d[key].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    render();
  };
  ACT["rr-fd-flag"] = (checked, el) => {
    const d = draft();
    if (!d) return;
    if (!canEdit()) { render(); return; }
    d[el.getAttribute("data-key")] = checked === "true";
    render();
  };
  ACT["rr-lang-add"] = guard(lang => {
    const d = draft();
    if (!lang || d.languages.includes(lang)) return;
    d.languages.push(lang);
    render();
  });
  ACT["rr-lang-remove"] = guard(lang => {
    const d = draft();
    if (d.languages.length < 2) { toast("Keep at least one language"); return; }
    d.languages = d.languages.filter(l => l !== lang);
    render();
  });
  ACT["rr-preview-lang"] = lang => { ui.previewLang = lang; refreshLive(); };

  /* ---------------- fields ---------------- */
  function moveField(from, to) {
    const list = draft().fields;
    if (to < 0 || to >= list.length || from === to) return;
    const [f] = list.splice(from, 1);
    list.splice(to, 0, f);
  }
  ACT["rr-field-move"] = guard(arg => {
    const [i, dir] = String(arg).split("|").map(Number);
    moveField(i, i + dir);
    render();
    const to = i + dir;
    focus(`[data-act="rr-field-move"][data-arg="${to}|${dir}"]:not([disabled])`);
  });

  ACT["rr-field-add"] = guard(() => {
    ui.newField = { type: "", label: "", required: false, options: ["", ""], error: "" };
    render();
    focus("#rr-nf-type");
  });
  ACT["rr-nf-type"] = type => {
    if (!ui.newField) return;
    ui.newField.type = type;
    ui.newField.error = "";
    render();
  };
  ACT["rr-nf-label"] = v => { if (ui.newField) ui.newField.label = v; };
  ACT["rr-nf-opt"] = (v, el) => { if (ui.newField) ui.newField.options[Number(el.getAttribute("data-i"))] = v; };
  ACT["rr-nf-required"] = checked => { if (ui.newField) ui.newField.required = checked === "true"; };
  ACT["rr-nf-opt-add"] = () => {
    ui.newField.options.push("");
    render();
    focus(`#rr-nf-opt-${ui.newField.options.length - 1}`);
  };
  ACT["rr-nf-opt-del"] = i => {
    if (ui.newField.options.length < 2) return;
    ui.newField.options.splice(Number(i), 1);
    render();
  };
  ACT["rr-field-cancel"] = () => { ui.newField = null; render(); };

  const labelTaken = (label, except) => draft().fields.some((x, i) => i !== except && x.label.trim().toLowerCase() === label.toLowerCase());
  const cleanOptions = list => [...new Set(list.map(o => o.trim()).filter(Boolean))];

  ACT["rr-field-save"] = guard(() => {
    const nf = ui.newField;
    const fail = msg => { nf.error = msg; showError("#rr-nf-error", msg); };
    if (!nf.type) return fail("Select a field type.");
    const label = nf.label.trim();
    if (!label) return fail("Enter a label.");
    if (labelTaken(label, -1)) return fail("A field with this label is already on the form.");
    const options = OPTION_TYPES.includes(nf.type) ? cleanOptions(nf.options) : [];
    if (OPTION_TYPES.includes(nf.type) && !options.length) return fail(`${nf.type} fields need at least one option.`);
    draft().fields.push({ key: "c" + Date.now().toString(36), custom: true, type: nf.type, label, required: nf.required, options });
    ui.newField = null;
    render();
    toast("Field added. Save to keep it.");
    return undefined;
  });

  ACT["rr-field-restore"] = guard(key => {
    const d = draft();
    const order = STANDARD_FIELDS.map(s => s.key);
    const at = order.indexOf(key);
    // Put it back after the nearest standard field that comes before it
    let pos = 0;
    d.fields.forEach((x, i) => { if (!x.custom && order.indexOf(x.key) < at) pos = i + 1; });
    const s = standardField(key);
    d.fields.splice(pos, 0, { key, label: s.label, required: s.required });
    render();
  });

  ACT["rr-field-delete"] = guard(i => {
    const x = draft().fields[Number(i)];
    if (!x || (!x.custom && standardField(x.key).lock)) return;
    runtime.modal("Remove this field?", x.label, `<p>“${safe(x.label)}” is removed from the draft. Requests already received keep their answers.</p>`,
      modalFoot("rr-confirm-field-delete", "Remove field", "d", i));
  });
  ACT["rr-confirm-field-delete"] = guard(i => {
    draft().fields.splice(Number(i), 1);
    runtime.closeOv();
    render();
  });

  ACT["rr-field-edit"] = guard(i => {
    const idx = Number(i);
    const x = draft().fields[idx];
    if (!x) return;
    const s = !x.custom && standardField(x.key);
    const listKey = x.key === "subject" ? "subjectTypes" : x.key === "type" ? "requestTypes" : null;
    const all = x.key === "subject" ? SUBJECT_TYPES : x.key === "type" ? REQUEST_TYPES.map(t => t.id) : null;
    const type = x.custom ? x.type : s.type;
    runtime.modal("Edit field", x.custom ? `Custom · ${type}` : `Standard · ${type}`, `
      <div class="rr-field"><label for="rr-fe-label">Label *</label><input id="rr-fe-label" value="${safe(x.label)}" maxlength="80" autocomplete="off">
        ${s ? `<small class="rr-hint">Default: “${safe(s.label)}”. Keep the default to show it translated in every language.</small>` : ""}</div>
      ${listKey ? `
        <fieldset class="rr-fieldset"><legend>Options shown on the form</legend>
          ${all.map(o => `<label class="rr-check"><input type="checkbox" class="rr-fe-opt" value="${safe(o)}" ${draft()[listKey].includes(o) ? "checked" : ""}> ${safe(o)}</label>`).join("")}
        </fieldset>` : ""}
      ${x.custom && OPTION_TYPES.includes(x.type) ? `
        <div class="rr-field"><label for="rr-fe-opts">Options, one per line *</label><textarea id="rr-fe-opts" rows="5">${safe((x.options || []).join("\n"))}</textarea></div>` : ""}
      <label class="rr-check"><input type="checkbox" id="rr-fe-req" ${x.required ? "checked" : ""} ${s && s.reqLock ? "disabled" : ""}> Required${s && s.reqLock ? ' <small class="rr-hint">· always required</small>' : ""}</label>
      <p class="rr-error" id="rr-fe-error" role="alert"></p>
    `, modalFoot("rr-field-edit-save", "Apply", "t", idx));
    focus("#rr-fe-label");
  });
  ACT["rr-field-edit-save"] = guard(i => {
    const idx = Number(i);
    const d = draft();
    const x = d.fields[idx];
    const label = val("#rr-fe-label");
    if (!label) return showError("#rr-fe-error", "Enter a label.");
    if (labelTaken(label, idx)) return showError("#rr-fe-error", "Another field already has this label.");
    if (x.key === "subject" || x.key === "type") {
      const picked = [...document.querySelectorAll(".rr-fe-opt:checked")].map(c => c.value);
      if (!picked.length) return showError("#rr-fe-error", "Choose at least one option.");
      d[x.key === "subject" ? "subjectTypes" : "requestTypes"] = picked;
    }
    const optsBox = $("#rr-fe-opts");
    if (optsBox) {
      const options = cleanOptions(optsBox.value.split("\n"));
      if (!options.length) return showError("#rr-fe-error", "Add at least one option.");
      x.options = options;
    }
    x.label = label;
    const s = !x.custom && standardField(x.key);
    if (!(s && s.reqLock)) x.required = Boolean($("#rr-fe-req")?.checked);
    runtime.closeOv();
    render();
    return undefined;
  });

  /* ---------------- logo and favicon ---------------- */
  // Images are scaled down in the browser so the saved form stays small
  function shrinkImage(file, [maxW, maxH]) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
      img.src = url;
    });
  }
  ACT["rr-upload"] = guard(key => {
    if (!IMAGE_BOX[key]) return;
    const target = draft();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg)$/.test(file.type)) { toast("Choose a PNG or JPG image"); return; }
      if (file.size > MAX_UPLOAD) { toast("The image is larger than 1 MB"); return; }
      try {
        const data = await shrinkImage(file, IMAGE_BOX[key]);
        if (ui.formDraft !== target) return;   // the user left this form meanwhile
        target[key] = data;
        render();
        toast(`${key === "logo" ? "Logo" : "Favicon"} added. Save to keep it.`);
      } catch (e) {
        toast("That image could not be read");
      }
    };
    input.click();
  });
  ACT["rr-upload-clear"] = guard(key => { draft()[key] = ""; render(); });

  /* ---------------- rich text ---------------- */
  const tool = (cmd, label, title) =>
    `<button type="button" class="rr-rt-btn" data-act="rr-rt" data-arg="${cmd}" onmousedown="event.preventDefault()" title="${title}" aria-label="${title}">${label}</button>`;
  ACT["rr-edit-form-text"] = guard(key => {
    if (!RICH_KEYS[key]) return;
    const d = draft();
    runtime.modal(RICH_KEYS[key], d.name || "Web form", `
      <div class="rr-rt-bar" role="toolbar" aria-label="Formatting">
        ${tool("bold", "<b>B</b>", "Bold")}${tool("italic", "<i>I</i>", "Italic")}${tool("underline", "<u>U</u>", "Underline")}
        <span class="rr-rt-sep"></span>${tool("h3", "H", "Heading")}${tool("ul", "•≡", "Bulleted list")}${tool("link", "🔗", "Link")}
        <span class="rr-rt-sep"></span>${tool("left", "⇤", "Align left")}${tool("center", "↔", "Align centre")}${tool("right", "⇥", "Align right")}
        <span class="rr-rt-sep"></span>${tool("clear", "⌫", "Clear formatting")}
      </div>
      <div id="rr-form-text" class="rr-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${RICH_KEYS[key]}">${sanitizeRich(d[key])}</div>
      <p class="rr-hint">Links must start with https:// or mailto:.</p>
      <p class="rr-error" id="rr-rt-error" role="alert"></p>
    `, modalFoot("rr-save-form-text", "Apply", "t", key));
    focus("#rr-form-text");
  });
  ACT["rr-rt"] = cmd => {
    const box = $("#rr-form-text");
    if (!box) return;
    box.focus();
    const exec = (c, v) => document.execCommand(c, false, v);
    if (cmd === "h3") exec("formatBlock", String(document.queryCommandValue("formatBlock")).toLowerCase() === "h3" ? "P" : "H3");
    else if (cmd === "ul") exec("insertUnorderedList");
    else if (cmd === "left" || cmd === "center" || cmd === "right") exec({ left: "justifyLeft", center: "justifyCenter", right: "justifyRight" }[cmd]);
    else if (cmd === "clear") { exec("removeFormat"); exec("formatBlock", "P"); }
    else if (cmd === "link") {
      const sel = getSelection();
      const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      if (!range || range.collapsed) { toast("Select the text to turn into a link"); return; }
      const url = (prompt("Link address (https:// or mailto:)", "https://") || "").trim();
      if (!url) return;
      if (!/^(https:\/\/|mailto:)/i.test(url)) { toast("Links must start with https:// or mailto:"); return; }
      box.focus();
      sel.removeAllRanges();
      sel.addRange(range);
      exec("createLink", url);
    } else if (["bold", "italic", "underline"].includes(cmd)) exec(cmd);
  };
  ACT["rr-save-form-text"] = guard(key => {
    const box = $("#rr-form-text");
    const html = sanitizeRich(box?.innerHTML || "");
    if (key !== "footer" && !box.textContent.trim()) return showError("#rr-rt-error", `${RICH_KEYS[key]} cannot be empty.`);
    draft()[key] = html;
    runtime.closeOv();
    render();
    return undefined;
  });

  /* ---------------- interactive preview ---------------- */
  // From the editor the preview shows the draft; from the list it shows the saved form
  function previewForm(id) {
    if (id && !(fs.isEditing() && ui.selectedFormId === id)) return fs.find(id);
    return draft();
  }
  function previewBody(f) {
    const lang = f.languages.includes(ui.pvLang) ? ui.pvLang : f.languages[0];
    return `
      <div class="rr-preview-bar">
        <label class="rr-inline-field"><span>Language</span>
          <select data-act="rr-pvm-lang" aria-label="Preview language">${f.languages.map(l => `<option ${l === lang ? "selected" : ""}>${safe(l)}</option>`).join("")}</select></label>
        <span class="rr-hint">Submitting creates a real request in Requests, so you can test the whole flow.</span>
      </div>
      ${R().preview(f, { lang, full: true })}
    `;
  }
  ACT["rr-form-preview"] = id => {
    const f = previewForm(id);
    if (!f) return;
    ui.pvFormId = f.id;
    ui.pvLang = ui.previewLang;
    const editing = fs.isEditing() && ui.selectedFormId === f.id;
    runtime.modal(`Preview · ${safe(f.name || "Untitled form")}`, editing ? (fs.isDirty() ? "Your unsaved draft" : "Your saved draft") : f.status === "Published" ? "Saved version" : "Draft",
      `<div id="rr-pv-modal">${previewBody(f)}</div>`, '<button class="btn" data-act="close">Close</button>', "rr-modal-wide");
  };
  const pvForm = () => previewForm(ui.pvFormId);
  ACT["rr-pvm-lang"] = lang => {
    ui.pvLang = lang;
    const box = $("#rr-pv-modal");
    if (box && pvForm()) box.innerHTML = previewBody(pvForm());
  };
  ACT["rr-pv-again"] = () => ACT["rr-pvm-lang"](ui.pvLang);
  ACT["rr-captcha"] = () => {
    ui.captcha = newCaptcha();
    document.querySelectorAll(".rr-pv-cap-img").forEach(el => { el.innerHTML = R().captchaImg() + "<i></i><i></i>"; });
    document.querySelectorAll('.rr-preview input[name="captcha"]').forEach(el => { el.value = ""; });
  };
  ACT["rr-pv-browse"] = (_, el) => el.parentElement.querySelector('input[type="file"]')?.click();
  ACT["rr-pv-file"] = (_, el) => {
    const file = el.files[0];
    const name = el.parentElement.querySelector(".rr-pv-fname");
    if (file && file.size > 5 * MAX_UPLOAD) { el.value = ""; toast("Attachments can be up to 5 MB"); return; }
    if (name) name.textContent = file ? file.name : tr(document.querySelector("#rr-pv-modal .rr-preview")?.lang, "noFile");
  };

  const ERR = {
    required: "This field is required.",
    email: "Enter a valid email address.",
    mobile: "Enter a valid mobile number, for example +91 98765 43210.",
    captcha: "The characters do not match. Try the new captcha.",
  };
  ACT["rr-pv-submit"] = (_, el) => {
    const form = el.closest("form");
    const f = pvForm();
    if (!form || !f) return;
    const values = {};
    let firstBad = null;
    form.querySelectorAll(".rr-pv-err").forEach(e => { e.textContent = ""; });
    form.querySelectorAll(".is-invalid").forEach(e => e.classList.remove("is-invalid"));
    const fail = (wrap, msg) => {
      wrap.classList.add("is-invalid");
      wrap.querySelector(".rr-pv-err").textContent = msg;
      if (!firstBad) firstBad = wrap.querySelector("input,select,textarea");
    };
    f.fields.forEach(x => {
      const wrap = form.querySelector(`[data-pv-key="${x.key}"]`);
      if (!wrap) return;
      const checks = [...wrap.querySelectorAll('input[type="radio"],input[type="checkbox"]')];
      const v = checks.length ? checks.filter(c => c.checked).map(c => c.value)
        : (wrap.querySelector("input,select,textarea")?.value || "").trim();
      const empty = Array.isArray(v) ? !v.length : !v;
      values[x.key] = Array.isArray(v) && !(x.custom && x.type === "Checkbox") ? (v[0] || "") : v;
      if (x.required && empty) return fail(wrap, ERR.required);
      if (!empty && x.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return fail(wrap, ERR.email);
      if (!empty && x.key === "mobile" && !/^\+?[\d\s-]{8,16}$/.test(v)) return fail(wrap, ERR.mobile);
      return undefined;
    });
    if (f.captcha) {
      const wrap = form.querySelector('[data-pv-key="captcha"]');
      const v = (wrap.querySelector("input").value || "").trim();
      if (!v) fail(wrap, ERR.required);
      else if (v.toLowerCase() !== ui.captcha.toLowerCase()) { fail(wrap, ERR.captcha); ACT["rr-captcha"](); }
    }
    const formErr = form.querySelector(".rr-pv-formerr");
    if (firstBad) {
      formErr.textContent = "Please fix the highlighted fields.";
      firstBad.focus();
      return;
    }
    formErr.textContent = "";
    if (!canEdit()) { toast(`Read-only: ${ctx.currentUser.role} cannot create requests`); return; }

    const file = form.querySelector('input[type="file"]')?.files[0];
    const answers = f.fields.filter(x => x.custom).map(x => ({ label: x.label, value: Array.isArray(values[x.key]) ? values[x.key].join(", ") : values[x.key] }))
      .filter(a => a.value);
    const lang = form.closest(".rr-preview")?.getAttribute("lang") || f.languages[0];
    const request = buildRequest({
      form: f, type: values.type || f.requestTypes[0], subject: values.subject || f.subjectTypes[0],
      first: values.first || "", last: values.last || "", email: values.email || "", mobile: values.mobile || "",
      state: values.state || "", city: values.city || "", details: values.details || "",
      language: lang, channel: "Rights portal", answers, attachment: file ? file.name : "",
      activity: `Request submitted through the web form “${f.name}” (preview).${file ? ` Attachment: ${file.name} (not stored in the demo).` : ""}`,
    });
    ctx.state.requests.unshift(request);
    runtime.ledgerAdd("Rights request received", `${request.id} · ${request.type}`);
    persist();
    ui.captcha = newCaptcha();
    form.innerHTML = `
      <div class="rr-pv-thanks" role="status">
        <div class="rr-pv-tick" aria-hidden="true" style="background:${safe(f.headerColor)};color:${safe(f.headerText)}">✓</div>
        <div>${sanitizeRich(f.thankYou)}</div>
        <p>Reference number <b class="rr-mono">${safe(request.id)}</b></p>
        <div class="rr-row-end">
          <button type="button" class="btn sm" data-act="rr-pv-again">Submit another</button>
          <button type="button" class="btn sm t" data-act="rr-pv-open-request" data-arg="${safe(request.id)}">Open the request</button>
        </div>
      </div>`;
    render();
    toast(`${request.id} created`);
  };
  ACT["rr-pv-open-request"] = id => { runtime.closeOv(); ACT["rr-open-request"](id); };

  /* ---------------- document listeners ---------------- */
  // Registered once; a remount (for example a dev hot reload) replaces the earlier set
  const prev = window.__rrFormListeners;
  if (prev) prev.forEach(([t, type, fn]) => t.removeEventListener(type, fn));
  let dragFrom = null;
  const listeners = [
    [document, "dragstart", e => {
      const row = e.target.closest && e.target.closest(".rr-frow");
      if (!row || !canEdit()) return;
      dragFrom = Number(row.getAttribute("data-fi"));
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(dragFrom));
    }],
    [document, "dragover", e => {
      const row = e.target.closest && e.target.closest(".rr-frow");
      if (!row || dragFrom === null) return;
      e.preventDefault();
      document.querySelectorAll(".rr-frow.is-over").forEach(x => { if (x !== row) x.classList.remove("is-over"); });
      row.classList.add("is-over");
    }],
    [document, "drop", e => {
      const row = e.target.closest && e.target.closest(".rr-frow");
      if (!row || dragFrom === null) return;
      e.preventDefault();
      const to = Number(row.getAttribute("data-fi"));
      const from = dragFrom;
      dragFrom = null;
      if (ui.formDraft && from !== to) { moveField(from, to); render(); }
    }],
    [document, "dragend", () => {
      dragFrom = null;
      document.querySelectorAll(".rr-frow").forEach(x => x.classList.remove("is-over", "is-dragging"));
    }],
    // Enter in a preview field submits through the same checks as the button
    [document, "submit", e => {
      const form = e.target.closest && e.target.closest(".rr-pv-body");
      if (!form) return;
      e.preventDefault();
      const btn = form.querySelector(".rr-pv-submit");
      if (btn && btn.hasAttribute("data-act")) ACT["rr-pv-submit"](null, btn);
    }],
    [document, "keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && fs.isEditing() && location.hash.slice(1) === "rights") {
        e.preventDefault();
        if (fs.isDirty() && canEdit()) ACT["rr-save-form"]();
      }
    }],
    [window, "beforeunload", e => {
      if (fs.isDirty()) { e.preventDefault(); e.returnValue = ""; }
    }],
  ];
  listeners.forEach(([t, type, fn]) => t.addEventListener(type, fn));
  window.__rrFormListeners = listeners;
}
