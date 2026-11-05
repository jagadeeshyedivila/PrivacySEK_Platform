import { RECORD_TYPES, DENY_MSG, DISCOVERY_HINTS, DISCOVERY_CLASS_MAP, getSteps, can } from "../ropaConfig.js";
import { findRecord, nextId } from "../ropaData.js";
import { evaluateRecord, validateStep, validateField, isVisible } from "../ropaRules.js";
import { syncWizard, isDirty, cleanRecord, snapshot } from "../shared/RopaWizard.js";
import { plural } from "../shared/format.js";
import { queueDpiaForActivity } from "../../dpia/actions/dpiaActions.js";

let focusoutBound = false;

export function registerWizardActions(context, ACT) {
  const { $, closeOv, esc, ledgerAdd, modal, render, toast, ui } = context;

  const ro = () => !ui.wiz || !can(ui, ui.wiz.id ? "edit" : "create");
  const ctxFor = w => context.rulesCtx(w.type, w.id);
  const specFor = (w, k) => {
    let found = null;
    getSteps(w.type, ctxFor(w)).forEach(s => s.fields.forEach(f => { if (f.k === k) found = f; }));
    return found;
  };

  function changed(k, touch) {
    const w = ui.wiz;
    if (touch) w.touched[k] = true;
    syncWizard(context, w);
    render();
  }

  // Field validation on blur: mark touched and show the error in place,
  // without a full re-render that would swallow the next click.
  if (!focusoutBound && typeof document !== "undefined") {
    focusoutBound = true;
    document.addEventListener("focusout", function(e) {
      const el = e.target;
      const w = ui.wiz;
      if (!w || w.result || !el || !el.closest || el.tagName === "BUTTON") return;
      const k = el.getAttribute("data-k");
      if (!k || !el.closest(".rp-wiz")) return;
      w.touched[k] = true;
      // Live re-renders replace inputs, so look the field up again once the DOM settles
      setTimeout(function() {
        const box = document.querySelector('[data-rp-field="' + k + '"]');
        const input = document.getElementById("rp-f-" + k);
        if (!ui.wiz || !box || !input || box.querySelector(".rp-err")) return;
        const spec = specFor(ui.wiz, k);
        const err = spec && validateField(spec, ui.wiz.data[k], ui.wiz.data, context.getStore(), ctxFor(ui.wiz));
        if (!err) return;
        box.classList.add("err");
        const after = input.nextElementSibling && input.nextElementSibling.classList.contains("rp-counter") ? input.nextElementSibling : input;
        after.insertAdjacentHTML("afterend", '<div class="rp-err" role="alert">' + esc(err.msg) +
          (err.link ? ' <button class="rp-link" data-act="rp-open" data-arg="' + esc(err.link.type + "|" + err.link.id) + '">Open it</button>' : "") + '</div>');
      }, 0);
    });
  }

  ACT["rp-fv"] = function(value, el) {
    if (ro()) return;
    ui.wiz.data[el.getAttribute("data-k")] = value;
    changed(el.getAttribute("data-k"), false);
  };

  ACT["rp-fsel"] = function(value, el) {
    if (ro()) return;
    const k = el.getAttribute("data-k");
    if (value) ui.wiz.data[k] = value; else delete ui.wiz.data[k];
    if (k === "dpia") ui.wiz.dpiaAuto = false;
    changed(k, true);
  };

  ACT["rp-chip"] = function(arg) {
    if (ro()) return;
    const i = arg.indexOf("|");
    const k = arg.slice(0, i), v = arg.slice(i + 1);
    const cur = Array.isArray(ui.wiz.data[k]) ? ui.wiz.data[k].slice() : [];
    const at = cur.indexOf(v);
    if (at > -1) cur.splice(at, 1); else cur.push(v);
    ui.wiz.data[k] = cur;
    changed(k, true);
  };

  // Asset wizard: pre-fill from a Discovery connection
  ACT["rp-import"] = function(name) {
    if (ro()) return;
    const w = ui.wiz;
    if (!name) { delete w.data.dsrc; w.importedOn = null; return changed("dsrc", true); }
    const ctx = ctxFor(w);
    const conn = ((ctx.discovery && ctx.discovery.connections) || []).find(c => c.name === name);
    const hint = DISCOVERY_HINTS[name] || {};
    const cats = [];
    if (conn) (conn.tables || []).forEach(t => (t.cols || []).forEach(c => {
      const m = DISCOVERY_CLASS_MAP.find(x => x[0].test(c.cl));
      if (m && cats.indexOf(m[1]) < 0) cats.push(m[1]);
    }));
    Object.assign(w.data, {
      dsrc: name,
      name: w.data.name || name,
      desc: w.data.desc || (conn && conn.desc ? conn.desc + "." : w.data.desc),
      stype: hint.stype || (conn && conn.kind === "U" ? "Cloud" : "On-premises"),
      loc: hint.loc || "India",
      cat: cats.length ? cats : (w.data.cat || [])
    });
    w.importedOn = new Date().toISOString();
    changed("dsrc", true);
    toast("Pre-filled from Data Discovery: " + name);
  };

  function goStep(i, focus) {
    const w = ui.wiz;
    w.visited[w.step] = true;
    w.step = Math.max(0, i);
    w.visited[w.step] = true;
    w.focus = focus || null;
    const c = $("#content");
    const card = $(".rp-wiz");
    if (c && card && card.getBoundingClientRect().top < 0) c.scrollTop = Math.max(0, c.scrollTop + card.getBoundingClientRect().top - 80);
    render();
  }

  ACT["rp-step"] = function(i) { goStep(Number(i)); };
  ACT["rp-back"] = function() { goStep(ui.wiz.step - 1); };

  ACT["rp-next"] = function() {
    const w = ui.wiz;
    const errs = ro() ? {} : validateStep(w.type, w.step, w.data, ctxFor(w));
    const keys = Object.keys(errs);
    if (keys.length) {
      w.attempted[w.step] = true;
      w.focus = firstField(w, w.step, keys);
      render();
      return toast("Fix " + plural(keys.length, "field") + " on this step to continue");
    }
    goStep(w.step + 1);
  };

  function firstField(w, i, keys) {
    const step = getSteps(w.type, ctxFor(w))[i];
    const f = step.fields.find(x => keys.indexOf(x.k) > -1 && isVisible(x, w.data));
    return f ? f.k : keys[0];
  }

  ACT["rp-jump"] = function(arg) {
    const p = String(arg).split("|");
    if (ui.wiz && ui.wiz.result) ui.wiz.result = null; // from the result screen: back to editing
    if (ui.wiz) ui.wiz.view = null; // from the data flow: back to the form
    goStep(Number(p[0]) || 0, p[1] || null);
  };

  ACT["rp-view"] = function(v) {
    if (!ui.wiz) return;
    ui.wiz.view = v === "flow" ? "flow" : null;
    render();
  };

  // Opens an activity straight into its data flow, from the register or the result screen
  ACT["rp-flow-open"] = function(arg) {
    ACT["rp-open"](arg);
    if (ui.wiz && ui.wiz.type === "act") { ui.wiz.result = null; ui.wiz.view = "flow"; render(); }
  };

  ACT["rp-dock-toggle"] = function() {
    ui.dockOpen = !ui.dockOpen;
    render();
  };

  ACT["rp-save"] = function() {
    const w = ui.wiz;
    if (ro()) return toast(DENY_MSG[w.id ? "edit" : "create"]);
    syncWizard(context, w);
    const ctx = ctxFor(w);
    const steps = getSteps(w.type, ctx);
    for (let i = 0; i < steps.length; i++) {
      const errs = validateStep(w.type, i, w.data, ctx);
      const keys = Object.keys(errs);
      if (keys.length) {
        w.attempted[i] = true;
        w.step = i;
        w.visited[i] = true;
        w.focus = firstField(w, i, keys);
        render();
        const missing = keys.every(k => /is required$/.test(errs[k].msg));
        return toast("Step " + (i + 1) + " · " + steps[i].t + " has " + plural(keys.length, missing ? "missing field" : "field to fix", missing ? "missing fields" : "fields to fix"));
      }
    }
    const store = context.getStore();
    const ev = evaluateRecord(w.type, w.data, store, ctx);
    const blocking = ev.results.find(r => r.sev === "error");
    if (blocking) {
      w.step = blocking.step || 0;
      w.visited[w.step] = true;
      w.focus = blocking.field;
      render();
      return toast("Fix before saving: " + blocking.title);
    }

    const meta = RECORD_TYPES[w.type];
    const rec = cleanRecord(w.data);
    rec.upd = new Date().toISOString();
    const created = !w.id;
    if (created) {
      rec.id = nextId(store, w.type);
      if (w.type === "act" && rec.dpia === "Yes" && !rec.dpiaState) rec.dpiaState = "Not started";
      store[w.type] = [rec].concat(store[w.type] || []);
    } else {
      store[w.type] = (store[w.type] || []).map(r => (r.id === w.id ? rec : r));
    }
    context.saveStore(store);
    ledgerAdd(meta.label + (created ? " registered" : " updated"), rec.id + " · " + rec.name);
    w.id = rec.id;
    w.data = JSON.parse(JSON.stringify(rec));
    w.orig = snapshot(w.data);
    w.result = { id: rec.id, created };
    const c = $("#content");
    if (c) c.scrollTop = 0;
    render();
    toast(rec.name + (created ? " registered as " : " updated · ") + rec.id);
  };

  ACT["rp-cancel"] = function(next) {
    const w = ui.wiz;
    if (!w) return;
    if (!isDirty(w) || ro()) { ui.wiz = null; return afterLeave(next); }
    modal("Discard changes to " + esc(w.data.name || "this " + RECORD_TYPES[w.type].noun) + "?", "Unsaved changes",
      '<p>Your changes haven\'t been saved. Discard them and go back to the register?</p>',
      '<button class="btn sm o" data-act="close">Keep editing</button>' +
      '<button class="btn sm" style="background:var(--block);color:#fff" data-act="rp-discard" data-arg="' + esc(next || "") + '">Discard</button>');
  };

  ACT["rp-discard"] = function(next) {
    ui.wiz = null;
    closeOv();
    afterLeave(next);
  };

  function afterLeave(next) {
    if (next && next.indexOf("party:") === 0) ui.partyTab = next.slice(6);
    render();
  }

  ACT["rp-fix"] = function(arg) {
    const w = ui.wiz;
    if (!w) return;
    const p = String(arg).split("#");
    const ev = evaluateRecord(w.type, w.data, context.getStore(), ctxFor(w));
    const res = ev.results.filter(r => r.id === p[0])[Number(p[1]) || 0];
    if (!res || !res.fix) return;
    const fix = res.fix;
    if (fix.goto != null) return goStep(fix.goto, fix.field);
    if (fix.open) return ACT["rp-open"](fix.open.type + "|" + fix.open.id + "|" + fix.open.step + "|" + fix.open.field);
    if (ro()) return toast(DENY_MSG.edit);
    if (fix.act === "attest") return attest(w.type, w.id, true);
    if (fix.patch) {
      Object.assign(w.data, fix.patch);
      Object.keys(fix.patch).forEach(k => { w.touched[k] = true; });
      if ("dpia" in fix.patch) w.dpiaAuto = false;
      syncWizard(context, w);
      // Show the step the fix changed so the new answers are visible
      if (res.step != null && res.step !== w.step) { w.visited[w.step] = true; w.step = res.step; w.visited[w.step] = true; }
      render();
      const k = Object.keys(fix.patch)[0];
      const spec = specFor(w, k);
      const v = fix.patch[k];
      toast("Updated: " + (spec ? spec.l.replace(/\?$/, "") : k) + " set to " + (Array.isArray(v) ? v.join(", ") : v));
    }
  };

  function attest(type, id, inWizard) {
    const store = context.getStore();
    const rec = findRecord(store, type, id);
    const name = rec ? rec.name : (ui.wiz && ui.wiz.data.name);
    const owner = (rec && rec.owner) || "the owner";
    const today = new Date().toISOString().slice(0, 10);
    if (rec) { rec.attestReq = today; context.saveStore(store); }
    if (inWizard && ui.wiz) {
      ui.wiz.data.attestReq = today;
      ui.wiz.orig = snapshot(Object.assign(JSON.parse(ui.wiz.orig || "{}"), { attestReq: today }));
    }
    ledgerAdd("Attestation requested", (id || "draft") + " · " + name + " · from " + owner);
    render();
    toast("Attestation requested from " + owner);
  }

  ACT["rp-attest"] = function(arg) {
    const p = String(arg).split("|");
    attest(p[0], p[1], false);
  };

  // Opens the DPIA module with a new assessment for this activity; the DPIA module keeps the
  // activity's DPIA state in step with the assessment from then on
  ACT["rp-start-dpia"] = function(id) {
    const store = context.getStore();
    const rec = findRecord(store, "act", id);
    if (rec && rec.dpia !== "Yes") {
      rec.dpia = "Yes";
      if (!rec.dpiaState) rec.dpiaState = "Not started";
      context.saveStore(store);
    }
    ui.wiz = null;
    queueDpiaForActivity(id);
    location.hash = "assess";
  };

  ACT["rp-view-register"] = function() {
    ui.wiz = null;
    render();
  };
}
