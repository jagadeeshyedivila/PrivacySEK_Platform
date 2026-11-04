import { DENY_MSG, OPTIONS, customFieldSpec, can } from "../ropaConfig.js";
import { validateCustomField, slugify } from "../ropaRules.js";
import { renderField } from "../shared/RopaWizard.js";
import { cfUsage } from "../customFields/RopaCustomFields.jsx";

export function registerCustomFieldActions(context, ACT) {
  const { $, closeOv, esc, ledgerAdd, modal, render, toast, ui } = context;

  const hasOpts = t => t === "Dropdown" || t === "Multi select";

  // The modal lives outside #content, so it is updated in place instead of re-rendered
  function draw() {
    const d = ui.cfDraft;
    if (!d || !$("#rp-cf-preview")) return;
    const errs = validateCustomField(d, context.getStore());
    const show = (k, cond) => { const el = $("#rp-cf-" + k + "-err"); if (el) el.textContent = cond && errs[k] ? errs[k] : ""; };
    show("label", d.tried || d.label);
    show("key", d.tried || d.keyEdited || d.label);
    show("opts", d.tried || (d.opts || []).length);
    const key = $("#rp-cf-key");
    if (key && !d.keyEdited && key.value !== d.key) key.value = d.key;
    $("#rp-cf-opts-box").hidden = !hasOpts(d.type);
    $("#rp-cf-opts").innerHTML = (d.opts || []).map((o, i) =>
      '<span class="tag rp-opt">' + esc(o) + '<button type="button" data-act="rp-cf-opt-del" data-arg="' + i + '" aria-label="Remove ' + esc(o) + '">×</button></span>').join("");
    const spec = customFieldSpec({ label: d.label || "Field label", key: d.key || "field", type: d.type, req: d.req, opts: d.opts });
    $("#rp-cf-preview").innerHTML = '<div class="g g2">' + renderField(context, spec, undefined, { preview: true }) + '</div>';
  }

  ACT["rp-cf-add"] = function() {
    if (!can(ui, "cf")) return toast(DENY_MSG.cf);
    ui.cfDraft = { label: "", key: "", keyEdited: false, type: "Text", opts: [], req: false, tried: false };
    modal("Add custom field", "Shown as step 7 in the processing activity wizard",
      '<div class="g g2">' +
        '<div class="field"><label for="rp-cf-label">Label <span class="rp-req">*</span></label><input id="rp-cf-label" data-input-act="rp-cf-label" placeholder="Branch code" autocomplete="off"><div class="rp-err" id="rp-cf-label-err"></div></div>' +
        '<div class="field"><label for="rp-cf-key">Key</label><input id="rp-cf-key" class="mono" data-input-act="rp-cf-key" placeholder="branch_code" autocomplete="off"><div class="rp-err" id="rp-cf-key-err"></div><div class="rp-hint dim">Filled from the label. Lowercase letters, numbers and underscores.</div></div>' +
        '<div class="field"><label for="rp-cf-type">Type <span class="rp-req">*</span></label><select id="rp-cf-type" data-act="rp-cf-type">' + OPTIONS.cfType.map(t => '<option>' + t + '</option>').join("") + '</select></div>' +
        '<div class="field"><span class="rp-flabel">Required</span><label class="row rp-check-l"><input type="checkbox" id="rp-cf-req" data-change-act="rp-cf-req"> Users must fill this in</label></div>' +
        '<div class="field rp-full" id="rp-cf-opts-box" hidden><label for="rp-cf-opt">Options</label>' +
          '<div class="row"><input id="rp-cf-opt" placeholder="Type an option, then press Enter" autocomplete="off" style="flex:1"><button type="button" class="btn sm o" data-act="rp-cf-opt-add">Add</button></div>' +
          '<div class="tags" id="rp-cf-opts"></div><div class="rp-err" id="rp-cf-opts-err"></div></div>' +
      '</div>' +
      '<div><div class="sec-t">Live preview</div><div class="rp-cf-preview" id="rp-cf-preview"></div></div>',
      '<button class="btn sm o" data-act="close">Cancel</button><button class="btn sm p" data-act="rp-cf-save">Save field</button>');
    const opt = $("#rp-cf-opt");
    if (opt) opt.addEventListener("keydown", function(e) {
      if (e.key === "Enter") { e.preventDefault(); ACT["rp-cf-opt-add"](); }
    });
    draw();
    const l = $("#rp-cf-label");
    if (l) l.focus();
  };

  ACT["rp-cf-label"] = function(v) {
    const d = ui.cfDraft;
    if (!d) return;
    d.label = v;
    if (!d.keyEdited) d.key = slugify(v);
    draw();
  };

  ACT["rp-cf-key"] = function(v) {
    const d = ui.cfDraft;
    if (!d) return;
    d.key = v;
    d.keyEdited = v !== "";
    draw();
  };

  ACT["rp-cf-type"] = function(v) {
    if (!ui.cfDraft) return;
    ui.cfDraft.type = v;
    draw();
  };

  ACT["rp-cf-req"] = function(checked) {
    if (!ui.cfDraft) return;
    ui.cfDraft.req = checked === "true";
    draw();
  };

  ACT["rp-cf-opt-add"] = function() {
    const d = ui.cfDraft;
    const el = $("#rp-cf-opt");
    if (!d || !el) return;
    const v = el.value.trim();
    if (v && !d.opts.some(o => o.toLowerCase() === v.toLowerCase())) d.opts.push(v);
    el.value = "";
    el.focus();
    draw();
  };

  ACT["rp-cf-opt-del"] = function(i) {
    if (!ui.cfDraft) return;
    ui.cfDraft.opts.splice(Number(i), 1);
    draw();
  };

  ACT["rp-cf-save"] = function() {
    const d = ui.cfDraft;
    if (!d) return;
    const store = context.getStore();
    const errs = validateCustomField(d, store);
    if (Object.keys(errs).length) {
      d.tried = true;
      draw();
      const first = $(errs.label ? "#rp-cf-label" : errs.key ? "#rp-cf-key" : "#rp-cf-opt");
      if (first) first.focus();
      return;
    }
    const field = { id: "cf-" + Date.now().toString(36), label: d.label.trim(), key: d.key.trim(), type: d.type, req: d.req, opts: hasOpts(d.type) ? d.opts.slice() : [] };
    store.cf = (store.cf || []).concat([field]);
    context.saveStore(store);
    ledgerAdd("ROPA custom field added", field.label + " (" + field.type + ")");
    ui.cfDraft = null;
    closeOv();
    render();
    toast("Custom field added: " + field.label + ". It appears in step 7 of the activity wizard.");
  };

  function remove(id) {
    const store = context.getStore();
    const f = (store.cf || []).find(x => x.id === id);
    if (!f) return;
    (store.act || []).forEach(a => { delete a["cf_" + f.key]; });
    store.cf = store.cf.filter(x => x.id !== id);
    context.saveStore(store);
    ledgerAdd("ROPA custom field deleted", f.label);
    closeOv();
    render();
    toast("Custom field deleted: " + f.label);
  }

  ACT["rp-cf-delete"] = function(id) {
    if (!can(ui, "cf")) return toast(DENY_MSG.cf);
    const store = context.getStore();
    const f = (store.cf || []).find(x => x.id === id);
    if (!f) return;
    const n = cfUsage(store, f);
    if (!n) return remove(id);
    modal("Delete custom field?", esc(f.label),
      '<p>' + n + (n === 1 ? " activity has" : " activities have") + ' a value for \'' + esc(f.label) + '\'. Delete the field and its values?</p>',
      '<button class="btn sm o" data-act="close">Cancel</button><button class="btn sm" style="background:var(--block);color:#fff" data-act="rp-cf-confirm-delete" data-arg="' + esc(id) + '">Delete field and values</button>');
  };

  ACT["rp-cf-confirm-delete"] = remove;
}
