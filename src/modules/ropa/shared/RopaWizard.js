// Generic step-form renderer used by every ROPA record type, driven by step specs in ropaConfig.js
import { RECORD_TYPES, getSteps, can, has, DPC_CHILD } from "../ropaConfig.js";
import { findRecord } from "../ropaData.js";
import {
  evaluateRecord, validateStep, pruneHidden, isVisible, isReq, optionsFor,
  isEmpty, requiredProgress, consentValue
} from "../ropaRules.js";
import { renderDock, renderResult } from "./ComplianceDock.js";
import { renderFlow } from "./dataFlow.js";
import { fmtStamp, fmtDate, plural } from "./format.js";

/* ---------------- state helpers ---------------- */

const clean = d => { const o = {}; Object.keys(d).forEach(k => { if (k[0] !== "_") o[k] = d[k]; }); return o; };
export const snapshot = d => JSON.stringify(clean(d));
export const isDirty = w => !!w && !w.result && snapshot(w.data) !== w.orig;
export const cleanRecord = clean;

function defaultsFor(type) {
  const today = new Date().toISOString().slice(0, 10);
  if (type === "act") return { entity: "Aarohan Finance Ltd", regs: ["DPDP Act 2023 (India)"], role: "Data Fiduciary", date: today, dpo: "Meera Iyer" };
  if (type === "ven") return { etype: ["Vendor"], country: "India" };
  if (type === "cus") return { etype: ["Customer"], country: "India" };
  if (type === "com") return { etype: ["Company"], country: "India" };
  if (type === "oth") return { etype: ["Other"], country: "India" };
  if (type === "pol") return { eff: today };
  return {};
}

export function newWizard(context, type) {
  const w = { type, id: null, step: 0, data: defaultsFor(type), touched: {}, attempted: {}, visited: { 0: true }, result: null, focus: null, dpiaAuto: false };
  syncWizard(context, w);
  w.orig = snapshot(w.data);
  return w;
}

export function openWizard(context, type, id, step, field) {
  const rec = findRecord(context.getStore(), type, id);
  if (!rec) return null;
  const w = { type, id, step: step || 0, data: JSON.parse(JSON.stringify(rec)), touched: {}, attempted: {}, visited: {}, result: null, focus: field || null, dpiaAuto: false };
  w.visited[w.step] = true;
  syncWizard(context, w, true);
  w.orig = snapshot(w.data);
  return w;
}

// Re-derives everything that depends on answers: hidden fields, DPIA pre-fill, child consent.
// `opening` keeps stored values untouched when a record is first opened.
export function syncWizard(context, w, opening) {
  const ctx = context.rulesCtx(w.type, w.id);
  const d = w.data;
  if (w.type === "act" && !opening) {
    if (has(d.dpc, DPC_CHILD) && !/^Consent/.test(d.law || "")) d.law = consentValue(d); // R-05
  }
  let cleared = opening ? [] : pruneHidden(w.type, d, ctx);
  if (w.type === "act") {
    const ev = evaluateRecord("act", d, ctx.store, ctx);
    d._dpiaRec = ev.dpiaRecommended;
    if (!opening) { // R-10 pre-fill
      if (!d.dpia && ev.dpiaRecommended && !w.touched.dpia) { d.dpia = "Yes"; w.dpiaAuto = true; }
      else if (w.dpiaAuto && !ev.dpiaRecommended && !w.touched.dpia) { delete d.dpia; w.dpiaAuto = false; }
      cleared = cleared.concat(pruneHidden(w.type, d, ctx));
    }
  }
  cleared.forEach(k => { delete w.touched[k]; });
  return cleared;
}

/* ---------------- field rendering ---------------- */

const RET_HELP = {
  "5 years after relationship ends (RBI KYC / PMLA)": "Matches RBI KYC record-keeping ✓",
  "8 years after loan closure (books of account)": "Matches Companies Act s.128 books of account ✓",
  "1 year (minimum log retention)": "Meets the 1-year minimum for processing logs ✓",
  "Until consent is withdrawn": "Erased when consent is withdrawn ✓"
};

function fieldHelper(type, f, d) {
  if (type === "act" && f.k === "ret" && RET_HELP[d.ret]) return RET_HELP[d.ret];
  if (f.k === "dpia" && d._dpiaRec && d.dpia === "Yes") return "Matches the rule engine's recommendation ✓";
  return "";
}

// opts: { ro, err, results, preview, type, data, ctx }
export function renderField(context, f, value, opts) {
  const { esc, tag } = context;
  const o = opts || {};
  const d = o.data || {};
  const id = "rp-f-" + f.k;
  const dis = o.ro ? " disabled" : "";
  const act = (name) => (o.preview ? "" : name);
  const req = o.ctx ? isReq(f, d, o.ctx) : !!f.req;
  let control = "";

  if (f.t === "select" || f.t === "import") {
    const list = optionsFor(f, d, o.ctx);
    const known = list.some(x => x.v === value);
    control = '<select id="' + id + '" data-k="' + f.k + '"' + (o.preview ? "" : ' data-act="' + (f.t === "import" ? "rp-import" : "rp-fsel") + '"') + dis + '>' +
      '<option value="">' + (f.t === "import" ? "Don't import" : "Select…") + '</option>' +
      list.map(x => '<option value="' + esc(x.v) + '"' + (x.v === value ? " selected" : "") + '>' + esc(x.l) + '</option>').join("") +
      (!known && !isEmpty(value) ? '<option value="' + esc(value) + '" selected>' + esc(value) + ' (doesn\'t apply)</option>' : "") +
      '</select>';
  } else if (f.t === "multi") {
    const list = optionsFor(f, d, o.ctx);
    const vals = Array.isArray(value) ? value : [];
    vals.forEach(v => { if (!list.some(x => x.v === v)) list.push({ v, l: v }); });
    control = '<div class="chipsel" id="' + id + '" data-k="' + f.k + '" role="group" aria-label="' + esc(f.l) + '" tabindex="-1">' +
      (list.length ? list.map(x => '<button type="button"' + (o.preview ? "" : ' data-act="rp-chip" data-arg="' + esc(f.k + "|" + x.v) + '"') +
        ' aria-pressed="' + (vals.indexOf(x.v) > -1) + '"' + dis + '>' + esc(x.l) + '</button>').join("") : '<span class="dim rp-small">' + (f.k === "attr" ? "Pick data categories first." : "No options yet.") + '</span>') +
      '</div>';
  } else if (f.t === "textarea") {
    const v = value == null ? "" : String(value);
    control = '<textarea id="' + id + '" data-k="' + f.k + '"' + (o.preview ? "" : ' data-input-act="rp-fv"') + ' rows="3"' + dis + '>' + esc(v) + '</textarea>' +
      (f.max ? '<span class="rp-counter' + (v.length > f.max ? " over" : "") + '">' + v.length + ' / ' + f.max + '</span>' : "");
  } else {
    const type = { date: "date", number: "number", email: "email", url: "url" }[f.t] || "text";
    const ph = f.t === "url" ? "https://" : f.t === "email" ? "name@aarohan.example" : "";
    control = '<input id="' + id + '" type="' + type + '" data-k="' + f.k + '"' + (o.preview ? "" : ' data-input-act="rp-fv"') +
      ' value="' + esc(value == null ? "" : value) + '"' + (ph ? ' placeholder="' + ph + '"' : "") + (f.t === "number" ? ' min="1" max="50"' : "") + dis + '>';
    if (f.chips && value) {
      control += '<div class="tags">' + String(value).split(",").map(s => s.trim()).filter(Boolean).map(s => tag(s)).join("") + '</div>';
    }
  }

  let below = "";
  if (o.err) {
    below += '<div class="rp-err" role="alert">' + esc(o.err.msg) +
      (o.err.link ? ' <button class="rp-link" data-act="rp-open" data-arg="' + esc(o.err.link.type + "|" + o.err.link.id) + '">Open it</button>' : "") + '</div>';
  }
  const helper = fieldHelper(o.type, f, d);
  if (helper) below += '<div class="rp-hint rp-ok">' + esc(helper) + '</div>';
  (o.results || []).forEach(r => {
    below += '<div class="rp-hint rp-' + r.sev + '">' + esc(r.message) + (r.cite ? ' ' + tag(r.cite, "ref") : "") + '</div>';
  });
  if (f.help && !o.err) below += '<div class="rp-hint dim">' + esc(f.help) + '</div>';

  const recTag = f.k === "dpia" && d._dpiaRec ? ' ' + tag("Recommended", "spi") : "";
  return '<div class="field rp-field' + (f.full ? " rp-full" : "") + (o.err ? " err" : "") + '" data-rp-field="' + f.k + '">' +
    '<label for="' + id + '">' + esc(f.l) + (req ? ' <span class="rp-req" aria-hidden="true">*</span>' : "") + recTag + '</label>' +
    control + below + '</div>';
}

/* ---------------- wizard screen ---------------- */

function stepCounts(w, steps, ev, ctx) {
  return steps.map((s, i) => {
    const show = w.attempted[i] || (w.visited[i] && i !== w.step);
    const fieldErr = show ? Object.keys(validateStep(w.type, i, w.data, ctx)).length : 0;
    const missing = Object.keys(validateStep(w.type, i, w.data, ctx)).length;
    const ruleErr = ev.results.filter(r => r.step === i && r.sev === "error").length;
    const warn = ev.results.filter(r => r.step === i && r.sev === "warning").length;
    // Saved records are judged on their data; new ones only once the step has been seen
    return { errors: fieldErr + ruleErr, warnings: warn, missing, done: (!!w.id || w.visited[i]) && !missing };
  });
}

function renderResultScreen(context, w) {
  const { btn, esc, kpi, sevPill } = context;
  const store = context.getStore();
  const meta = RECORD_TYPES[w.type];
  const rec = findRecord(store, w.type, w.result.id) || w.data;
  const ctx = context.rulesCtx(w.type, rec.id);
  const ev = evaluateRecord(w.type, rec, store, ctx);
  const open = ev.errors + ev.warnings;
  const scored = w.type === "act" || w.type === "ast";
  const tiles = [];
  if (scored) tiles.push(kpi("Risk", sevPill(ev.riskBand), "Score " + ev.riskScore + " / 100", ev.riskBand === "High" ? "#EF4444" : ev.riskBand === "Medium" ? "#F59E0B" : "#14B8A6"));
  if (w.type === "act") tiles.push(kpi("DPIA", ev.dpiaRecommended ? "Recommended" : "Not required", esc(ev.dpiaReason), ev.dpiaRecommended ? "#F59E0B" : "#14B8A6"));
  tiles.push(kpi("Open issues", String(open), open ? plural(ev.warnings, "warning") + " to review" : "Nothing to review", open ? "#F59E0B" : "#14B8A6"));

  let acts = "";
  if (w.type === "act") {
    if (ev.dpiaRecommended) acts += btn("Start DPIA", "rp-start-dpia", rec.id, "t");
    acts += btn("View data flow", "rp-flow-open", "act|" + rec.id, "o");
    acts += btn("Request attestation", "rp-attest", "act|" + rec.id, "o");
  }
  acts += btn("View in register", "rp-view-register", null, "o") + (can(context.ui, "create") ? btn("Add another", "rp-new", w.type, "o") : "");

  return '<section class="card rp-wiz rp-result" aria-live="polite"><div class="card-b">' +
    '<div class="rp-result-h"><span class="rp-result-ic" aria-hidden="true">✓</span><div><div class="eyebrow">' + esc(meta.label) + '</div>' +
    '<h2>' + esc(rec.name) + ' ' + (w.result.created ? "registered as " : "updated · ") + esc(rec.id) + '</h2>' +
    '<p class="dim">Saved ' + fmtStamp(rec.upd) + '. ' + (open ? "Warnings don't block saving, but they stay open in the register." : "No open issues.") + '</p></div></div>' +
    '<div class="g g' + tiles.length + ' rp-result-tiles">' + tiles.join("") + '</div>' +
    (open ? '<div class="rp-grp"><div class="sec-t">Open issues · select one to edit it</div>' + ev.results.filter(r => r.sev === "warning" || r.sev === "error").slice(0, 4).map((r, i) => renderResult(context, Object.assign({}, r, { fix: null }), i, true)).join("") + '</div>' : "") +
    '<div class="row rp-result-acts">' + acts + '</div>' +
    '</div></section>';
}

function vendorRiskBox(context, d) {
  const { D, esc, pill, sevPill } = context;
  const v = (D.vendors || []).find(x => x.n === d.name);
  if (!v) return "";
  return '<div class="rp-vr"><div><div class="sec-t" style="margin:0 0 4px">Vendor Risk</div>' +
    '<div class="row">' + sevPill(v.risk) + '<span class="mono">Score ' + v.sc + '</span>' +
    pill(v.dpa === "Signed" ? "ok" : v.dpa === "Missing" ? "act" : "risk", "DPA " + v.dpa) + '<span class="dim rp-small">' + esc(v.svc) + ' · ' + esc(v.loc) + '</span></div></div>' +
    '<button class="btn sm o" data-go="vendors">Open in Vendor Risk</button></div>';
}

export function renderWizard(context) {
  const { btn, esc, ui } = context;
  const w = ui.wiz;
  if (w.result) return renderResultScreen(context, w);

  const store = context.getStore();
  const meta = RECORD_TYPES[w.type];
  const ctx = context.rulesCtx(w.type, w.id);
  const steps = getSteps(w.type, ctx);
  if (w.step >= steps.length) w.step = steps.length - 1;
  const step = steps[w.step];
  const ro = !can(ui, w.id ? "edit" : "create");
  const ev = evaluateRecord(w.type, w.data, store, ctx);
  const counts = stepCounts(w, steps, ev, ctx);
  const last = w.step === steps.length - 1;

  // Each stage shows its state: errors, warnings, complete, or how many required fields are left
  const stepper = steps.length > 1 ? '<div class="rp-steps" role="tablist" aria-label="Stages">' + steps.map((s, i) => {
    const c = counts[i];
    const state = c.errors ? "e" : c.warnings && c.done ? "w" : c.done ? "ok" : "todo";
    const mark = state === "e" ? "!" : state === "ok" ? "✓" : String(i + 1);
    const meta = c.errors ? plural(c.errors, "error")
      : c.warnings && c.done ? plural(c.warnings, "warning")
      : c.done ? "Complete"
      : c.missing ? c.missing + " to fill" : "Optional";
    return '<button type="button" role="tab" aria-selected="' + (i === w.step) + '" class="rp-step ' + state + (i === w.step ? " cur" : "") + '" data-act="rp-step" data-arg="' + i + '">' +
      '<span class="rp-step-m" aria-hidden="true">' + mark + '</span>' +
      '<span class="rp-step-t"><b title="' + esc(s.t) + '">' + esc(s.short || s.t) + '</b><small>' + meta + '</small></span></button>';
  }).join("") + '</div>' : "";

  // Field-level errors are shown once a field is touched or its step was attempted
  const stepErrs = validateStep(w.type, w.step, w.data, ctx);
  const fields = step.fields.filter(f => isVisible(f, w.data)).map(f => {
    const showErr = w.touched[f.k] || w.attempted[w.step];
    const results = ev.results.filter(r => r.field === f.k && r.step === w.step);
    const head = f.group ? '<div class="rp-group rp-full">' + esc(f.group) + '</div>' : "";
    return head + renderField(context, f, w.data[f.k], { ro, err: showErr ? stepErrs[f.k] : null, results, type: w.type, data: w.data, ctx });
  }).join("");

  let fieldErrors = 0;
  steps.forEach((s, i) => { fieldErrors += Object.keys(validateStep(w.type, i, w.data, ctx)).filter(k => w.attempted[i] || w.touched[k]).length; });

  let banners = "";
  if (ro) banners += '<div class="banner"><span>View only. Your role can\'t edit records.</span></div>';
  if (w.type === "ast" && w.data.dsrc && w.importedOn) banners += '<div class="banner t"><span>Pre-filled from Data Discovery · last scan ' + esc(fmtDate(w.importedOn)) + '</span></div>';
  if (w.type === "ven" && w.step === 0) banners += vendorRiskBox(context, w.data);

  const title = w.id ? esc(w.data.name || w.id) : "New " + esc(meta.noun);
  const stampHtml = w.id ? '<span class="dim rp-small">Last updated ' + fmtStamp(findRecord(store, w.type, w.id)?.upd) + '</span>' : '<span class="tag">Draft</span>';

  // Activities can be viewed as a data flow built from the same (unsaved) answers
  const flow = w.type === "act" && w.view === "flow";
  const saveBtn = '<button class="btn p" data-act="rp-save"' + (ro ? ' disabled title="View only. Your role can\'t edit records."' : "") + '>' + (w.id ? "Update" : "Save") + '</button>';
  const foot = '<div class="rp-wiz-foot">' +
    btn("Cancel", "rp-cancel", null, "o") + '<span class="sp"></span>' +
    (flow ? saveBtn
      : (w.step > 0 ? btn("Back", "rp-back", null, "o") : "") + (last ? saveBtn : btn("Next", "rp-next", null, "p"))) + '</div>';
  const viewTog = w.type === "act" ? '<div class="rp-viewtog" role="tablist" aria-label="View">' +
    ["form", "flow"].map(v => '<button type="button" role="tab" aria-selected="' + ((v === "flow") === flow) + '" data-act="rp-view" data-arg="' + v + '">' + (v === "flow" ? "Data flow" : "Form") + '</button>').join("") + '</div>' : "";
  const head = '<div class="card-h"><div><div class="eyebrow">' + esc(meta.label) + (w.id ? " · " + esc(w.id) : "") + '</div><h3>' + title + '</h3></div><div class="r rp-wiz-hr">' + viewTog + stampHtml + '</div></div>';

  if (flow) {
    return '<section class="card rp-wiz">' + head + '<div class="card-b">' + banners + renderFlow(context, w.data, ev, ctx) + '</div>' + foot + '</section>';
  }

  return '<section class="card rp-wiz">' + head +
    '<div class="card-b">' + stepper +
    '<div class="rp-wiz-grid"><div class="rp-wiz-form">' + banners +
    '<div class="sec-t">Step ' + (w.step + 1) + ' of ' + steps.length + ' · ' + esc(step.t) + '</div>' +
    '<div class="g g2 rp-form">' + fields + '</div></div>' +
    renderDock(context, w, ev, { ro, fieldErrors, progress: w.type === "act" ? null : requiredProgress(w.type, w.data, ctx) }) +
    '</div></div>' + foot + '</section>';
}
