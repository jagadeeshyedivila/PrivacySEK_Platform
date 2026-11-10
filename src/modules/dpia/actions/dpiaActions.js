// Every user action in the DPIA module. Changes are saved to MongoDB through the module store;
// starting, submitting and approving an assessment is written to the Proof Ledger, and linked
// Data Map activities follow the assessment's state.
import {
  QUESTION_TYPES, OPTION_TYPES, COMPLIANCE, missingRequired, suggestedRisks, templateProblems, progress, controlProblems,
  riskScores, formatScore, isRiskOpen, responseOf, textOf, hasTextPart, isGap, isAnswered, allQuestions, significantObservations,
} from "../dpiaModel.js";
import {
  RISK_STATUSES, PRIORITIES, SCALE_1_5, SCALE_0_5, LIKELIHOOD_LABELS, IMPACT_LABELS, CE_LABELS, FRAMEWORKS,
  EVIDENCE_TYPES, EVIDENCE_SUFFICIENCY, EVIDENCE_RELIABILITY, ASSESSMENT_TYPES, ANNUAL_TYPE, ORG_ROLES,
  ESCALATION_BODIES, INTEGRATED_TEMPLATE_ID, METHODOLOGY_VERSION,
} from "../dpiaConfig.js";
import { DPIA_CHECKLIST } from "../dpiaChecklistBank.js";
import { suggestionKey } from "../dpiaPrefill.js";
import { pickList, toggleChips, countText } from "../screens/dpiaPick.js";
import { getRopaData, saveRopaData } from "../../ropa/ropaData.js";

const DAY = 864e5;
let pendingActivity = null;

// Called by the Data Map's "Start DPIA": opens the new assessment dialog for that activity
export function queueDpiaForActivity(id) { pendingActivity = id; }

export function registerDpiaActions(ctx, ACT, AFTER) {
  const { runtime, ui, safe, PEOPLE, DEMO_ACCOUNTS, persist, logActivity, canEdit, canFill, canReview, role } = ctx;
  const BLANK_QF = { resp: "", rag: "", fw: "", ev: "", owner: "", domain: "" };
  const S = () => ctx.state;
  const render = () => runtime.render();
  const toast = m => runtime.toast(m);
  const $ = sel => document.querySelector(sel);
  const val = sel => ($(sel)?.value || "").trim();
  const nowIso = () => new Date().toISOString();
  const today = (d = 0) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const showError = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };
  const foot = (act, label, cls = "t", arg = "") => `<button class="btn" data-act="close">Cancel</button><button class="btn ${cls}" data-act="${act}" ${arg !== "" ? `data-arg="${safe(arg)}"` : ""}>${label}</button>`;
  const afterRender = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  const focus = sel => afterRender(() => { const el = $(sel); if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); } });
  const cur = () => S().assessments.find(a => a.id === ui.selected);
  const R = () => ctx.renderers;
  const allow = (ok, why) => { if (!ok) toast(why || `Your role (${ctx.currentUser.role}) cannot do this`); return ok; };
  const opt = (list, sel) => list.map(v => `<option ${v === sel ? "selected" : ""}>${safe(v)}</option>`).join("");

  /* ---------------- Data Map link ---------------- */
  const ROPA_STATE = { "Not started": "Not started", "In progress": "In progress", "Under review": "In progress", "Changes requested": "In progress", Approved: "Completed" };
  function syncRopa(a, removed) {
    if (!a.activityId) return;
    try {
      const store = getRopaData();
      const rec = (store.act || []).find(x => x.id === a.activityId);
      if (!rec) return;
      rec.dpia = "Yes";
      rec.dpiaState = removed ? "Not started" : ROPA_STATE[a.status];
      saveRopaData(store);
    } catch (e) { /* the Data Map is unavailable; the assessment still saves */ }
  }

  /* ---------------- template draft guard ---------------- */
  const tplDirty = () => Boolean(ui.tplDraft && JSON.stringify(ui.tplDraft) !== ui.tplSaved);
  let pendingLeave = null;
  function requestLeave(next) {
    if (!tplDirty()) { ui.tplDraft = null; next(); return; }
    pendingLeave = next;
    const saved = S().templates.find(t => t.id === ui.tplDraft.id);
    runtime.modal("Save your changes?", "Template builder", `<p>“${safe(ui.tplDraft.title || "Untitled template")}” has changes that are not saved. If you leave now, they are lost.</p>`, `
      <button class="btn" data-act="close">Keep editing</button>
      <button class="btn d" data-act="dp-leave-discard">Discard changes</button>
      ${!saved || saved.status === "Draft" ? '<button class="btn t" data-act="dp-leave-save">Save draft and continue</button>' : ""}`);
  }
  ACT["dp-leave-discard"] = () => { runtime.closeOv(); ui.tplDraft = null; const n = pendingLeave; pendingLeave = null; if (n) n(); toast("Changes discarded"); };
  ACT["dp-leave-save"] = () => { runtime.closeOv(); if (!saveTemplate(false)) return; ui.tplDraft = null; const n = pendingLeave; pendingLeave = null; if (n) n(); };

  /* ---------------- shell ---------------- */
  const goTab = (tab, extra) => requestLeave(() => {
    Object.assign(ui, { tab, selected: null, userMenuOpen: false }, extra || {});
    render();
    const c = $("#content"); if (c) c.scrollTop = 0;
  });
  ACT["dp-tab"] = t => goTab(t);
  ACT["dp-goto-review"] = () => goTab("assessments", { aStatus: "Under review", aSearch: "", aMine: false });
  ACT["dp-goto-status"] = s => goTab("assessments", { aStatus: s || "", aSearch: "", aMine: false });
  ACT["dp-goto-risks"] = l => goTab("risks", { rRag: l || "", rStatus: "open", rSearch: "", rPriority: "", rOwner: "", rActivity: "" });
  ACT["dp-goto-evidence"] = f => goTab("evidence", { eFilter: f || "all", eSearch: "" });
  ACT["dp-user-menu"] = () => { ui.userMenuOpen = !ui.userMenuOpen; render(); };
  ACT["dp-switch-user"] = id => {
    const u = DEMO_ACCOUNTS.find(x => x.id === id);
    if (!u) return;
    ui.userMenuOpen = false;
    requestLeave(() => {
      ctx.switchUser(u);
      if (!(ctx.TAB_ACCESS[u.role] || []).includes(ui.tab)) { ui.tab = "dashboard"; ui.selected = null; }
      render();
      toast(`Signed in as ${u.name} (${u.role})`);
    });
  };
  ACT["dp-reset"] = () => {
    if (!allow(role().build)) return;
    runtime.modal("Reset demo data?", "DPIA", "<p>This restores the original templates, assessments and tasks. Changes you made are lost.</p>", foot("dp-confirm-reset", "Reset data", "d"));
  };
  ACT["dp-confirm-reset"] = async () => {
    runtime.closeOv();
    await ctx.resetState();
    Object.assign(ui, { selected: null, tplDraft: null, step: 0, userMenuOpen: false, qf: { ...BLANK_QF }, ctlOpen: {} });
    render();
    toast("Demo data restored");
  };
  ACT["dp-print"] = () => window.print();
  // Prints only the observations report, not the rest of the workspace
  ACT["dp-print-report"] = () => {
    document.body.classList.add("dp-printing-report");
    const done = () => { document.body.classList.remove("dp-printing-report"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
    setTimeout(done, 1500);
  };
  ACT["dp-report-csv"] = () => {
    const a = cur();
    if (!a) return;
    const obs = significantObservations(a);
    const acc = o => { const x = o.acceptance || {}; return x.decision ? `${x.decision} by ${x.by}${x.escalatedTo ? `; escalated to ${x.escalatedTo}` : ""}${x.rationale ? ` – ${x.rationale}` : ""}` : ""; };
    download(`${a.id}-significant-observations-${today()}.csv`,
      ["Ref", "Domain", "Observation", "Detail", "Checklist response", "Likelihood", "Impact", "Control Effectiveness", "Residual Risk", "RAG", "Treatment", "Owner", "Target Date", "Overdue", "Status", "Risk ID", "Acceptance / Escalation"],
      obs.map(o => [o.ref, o.domain, o.title, o.observation, o.response, o.likelihood, o.impact, o.controlEffectiveness, formatScore(o.residual), o.rag, o.treatment, o.owner, o.targetDate, o.overdue ? "Yes" : "No", o.status, o.riskId, acc(o)]));
    toast(`Exported ${obs.length} observations`);
  };

  /* ---------------- pickers (searchable multi-select) ---------------- */
  const pickBoxes = box => [...box.querySelectorAll(".dp-pick-list input[type=checkbox]")];
  function refreshPick(box) {
    const all = pickBoxes(box), on = all.filter(b => b.checked);
    box.querySelector("[data-pick-chips]").innerHTML = on.length ? on.map(b => `<span class="dp-pick-chip">${b.dataset.tag ? `<b>${safe(b.dataset.tag)}</b> ` : ""}${safe(b.dataset.label)}
      <button type="button" data-act="dp-pick-remove" data-arg="${safe(b.value)}" aria-label="Remove ${safe(b.dataset.label)}">✕</button></span>`).join("") : '<span class="dp-muted">None selected</span>';
    box.querySelector("[data-pick-count]").textContent = countText(on.length, all.length, box.dataset.noun || "items");
  }
  // Runs the picker's own action (for example saving a control) for each checkbox that changed
  const pickAfter = (box, changed) => { const a = box.getAttribute("data-after"); if (a && ACT[a]) changed.forEach(el => ACT[a](el.checked ? "true" : "false", el)); };
  const pickSet = (box, list, on) => {
    const changed = list.filter(b => !b.disabled && b.checked !== on);
    changed.forEach(b => { b.checked = on; });
    refreshPick(box);
    pickAfter(box, changed);
  };
  ACT["dp-pick-toggle"] = (_, el) => { const box = el.closest("[data-pick]"); if (!box) return; refreshPick(box); pickAfter(box, [el]); };
  ACT["dp-pick-remove"] = (v, el) => { const box = el.closest("[data-pick]"); if (box) pickSet(box, pickBoxes(box).filter(b => b.value === v), false); };
  ACT["dp-pick-all"] = (_, el) => { const box = el.closest("[data-pick]"); if (box) pickSet(box, pickBoxes(box).filter(b => !b.closest("li").hidden), true); };
  ACT["dp-pick-clear"] = (_, el) => { const box = el.closest("[data-pick]"); if (box) pickSet(box, pickBoxes(box), false); };
  ACT["dp-pick-filter"] = (q, el) => {
    const box = el.closest("[data-pick]");
    if (!box) return;
    const t = q.trim().toLowerCase();
    let n = 0;
    box.querySelectorAll("li[data-pick-text]").forEach(li => { const hit = !t || li.dataset.pickText.includes(t); li.hidden = !hit; if (hit) n++; });
    box.querySelector("[data-pick-empty]").hidden = n > 0;
  };
  const actItems = list => list.map(x => ({ value: x.id, tag: x.id, label: x.name, sub: x.bu || "" }));
  const assetItems = list => list.map(x => ({ value: x.id, label: x.name, sub: [x.stype, x.loc].filter(Boolean).join(" · ") }));
  ACT["dp-guide-jump"] = id => {
    const el = $(`#dp-guide-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    const h = el.querySelector("h3");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  };

  /* ---------------- assessments list ---------------- */
  ACT["dp-a-search"] = q => { ui.aSearch = q; render(); };
  ACT["dp-a-status"] = s => { ui.aStatus = s; render(); };
  ACT["dp-a-mine"] = c => { ui.aMine = c === "true"; render(); };
  ACT["dp-a-clear"] = () => { Object.assign(ui, { aSearch: "", aStatus: "", aMine: false }); render(); };

  function openAssessment(id, step) {
    if (!S().assessments.some(a => a.id === id)) return;
    requestLeave(() => {
      Object.assign(ui, { tab: "assessments", selected: id, step: step ?? 0, userMenuOpen: false, qf: { ...BLANK_QF }, ctlOpen: {} });
      runtime.closeOv();
      render();
      const c = $("#content"); if (c) c.scrollTop = 0;
    });
  }
  ACT["dp-open"] = id => openAssessment(id, 0);
  ACT["dp-open-risks"] = id => openAssessment(id, "risks");
  ACT["dp-back"] = () => { ui.selected = null; render(); };
  ACT["dp-step"] = s => {
    ui.step = s === "risks" || s === "summary" ? s : Number(s);
    render();
    afterRender(() => {
      // On narrow screens the section list is a horizontal strip: keep the current one visible
      const ol = $(".dp-steps ol"), cur = $(".dp-steps button.active");
      if (ol && cur && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = cur.parentElement.offsetLeft - 8;
      const main = $(".dp-ws-main"); if (main) main.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  ACT["dp-jump"] = arg => {
    const [si, qid] = String(arg).split("|");
    runtime.closeOv();
    ui.step = Number(si);
    ui.qf = { ...BLANK_QF };
    render();
    focus(`#dp-q-${qid}, [data-qwrap="${qid}"] input`);
  };

  /* ---------------- answering ---------------- */
  const questionOf = (a, qid) => (a?.sections || []).flatMap(s => s.qs).find(q => q.id === qid);
  const previewQuestion = qid => (ui.tplDraft?.sections || []).flatMap(s => s.qs).find(q => q.id === qid);

  // Marks the assessment started on its first change
  function touch(a) {
    if (a.status === "Not started") {
      a.status = "In progress";
      logActivity(a, "Started the assessment.");
      runtime.ledgerAdd("DPIA started", `${a.id} · ${a.name}`);
      syncRopa(a);
      return true;
    }
    a.updated = nowIso();
    return false;
  }

  function setAnswer(el, value, rerender, part) {
    const qid = el.getAttribute("data-q");
    const preview = el.getAttribute("data-mode") === "preview";
    const a = preview ? null : cur();
    const q = preview ? previewQuestion(qid) : questionOf(a, qid);
    const store = preview ? ui.previewAnswers : (a ? (a.answers = a.answers || {}) : null);
    if (!preview && (!a || !canFill(a))) { render(); return; }
    // A compliance response with a text part keeps both halves
    if (q && hasTextPart(q)) {
      const prev = store[qid] && typeof store[qid] === "object" ? store[qid] : { text: "", response: responseOf(store[qid]) };
      value = part === "text" ? { ...prev, text: value } : { ...prev, response: value };
    }
    store[qid] = value;
    if (preview) { if (rerender) render(); return; }
    if (touch(a)) rerender = true;
    persist(null, !rerender);
    if (rerender) { render(); return; }
    // Typing: refresh the progress in place so focus stays in the field
    const nav = $("[data-live-steps]");
    if (nav) nav.outerHTML = R().assessments.stepsNav(a);
    const p2 = $("[data-live-progress2]");
    if (p2) p2.innerHTML = R().assessments.pct(progress(a));
  }

  ACT["dp-answer"] = (v, el) => setAnswer(el, v, false);
  ACT["dp-answer-text"] = (v, el) => setAnswer(el, v, false, "text");
  ACT["dp-answer-select"] = (v, el) => setAnswer(el, v, true);
  ACT["dp-answer-radio"] = (_, el) => setAnswer(el, el.value, true);
  ACT["dp-answer-multi"] = (_, el) => {
    const box = el.closest(".dp-multi");
    setAnswer(el, [...box.querySelectorAll("input:checked")].map(x => x.value), true);
  };

  // Uses the suggestion from another module. Never replaces an answer unless asked to.
  ACT["dp-prefill"] = arg => {
    const [qid, mode] = String(arg).split("|");
    const a = cur();
    if (!a || !allow(canFill(a))) return;
    const q = questionOf(a, qid);
    const s = q && ctx.suggestion(q, a);
    if (!s || s.hintOnly) return;
    const curV = (a.answers || {})[qid];
    const answered = isAnswered(q, curV);
    if (answered && mode !== "replace") { toast("This question already has an answer"); return; }
    a.answers[qid] = hasTextPart(q) ? { text: s.text || textOf(curV), response: s.response || responseOf(curV) } : (s.response || curV);
    const c = ctl(a, qid);
    c.prefillAccepted = true;
    c.prefillKey = suggestionKey(s);
    touch(a);
    logActivity(a, `Accepted suggestion from ${s.source} for ${q.code || qid}${mode === "replace" ? " (source had changed)" : ""}.`);
    persist("Suggestion used");
    render();
  };

  /* ---------------- control records (one per scored question) ---------------- */
  function ctl(a, qid) {
    a.controls = a.controls || {};
    if (!a.controls[qid]) a.controls[qid] = { evidenceIds: [], status: "Open" };
    if (!a.controls[qid].evidenceIds) a.controls[qid].evidenceIds = [];
    return a.controls[qid];
  }
  const NUMERIC = ["likelihood", "impact", "controlEffectiveness"];
  function setControl(el, value, rerender) {
    const a = cur();
    const qid = el.getAttribute("data-q"), key = el.getAttribute("data-key");
    if (!a || !canFill(a)) { render(); return; }
    const c = ctl(a, qid);
    c[key] = NUMERIC.includes(key) ? (value === "" ? null : Number(value)) : value;
    if (key === "activityId") c.assetIds = [];
    if (touch(a)) rerender = true;
    persist(null, !rerender);
    if (rerender) render();
  }
  ACT["dp-ctl"] = (v, el) => setControl(el, v, el.getAttribute("data-key") === "targetDate");
  ACT["dp-ctl-select"] = (v, el) => setControl(el, v, true);
  ACT["dp-ctl-asset"] = (checked, el) => {
    const a = cur();
    if (!a || !canFill(a)) { render(); return; }
    const c = ctl(a, el.getAttribute("data-q"));
    const id = el.value;
    c.assetIds = (c.assetIds || []).filter(x => x !== id).concat(checked === "true" ? [id] : []);
    touch(a);
    persist(null, true);
  };
  ACT["dp-ctl-review"] = (v, el) => {
    const a = cur();
    if (!a || !role().review || a.status === "Approved") return;
    ctl(a, el.getAttribute("data-q")).reviewerComments = v;
    a.updated = nowIso();
    persist(null, true);
  };
  ACT["dp-ctl-toggle"] = qid => {
    const a = cur();
    const q = questionOf(a, qid);
    const v = (a.answers || {})[qid];
    const def = isGap(q, v) || responseOf(v) === "NA";
    ui.ctlOpen[qid] = !(ui.ctlOpen[qid] ?? def);
    render();
  };

  function linkEvidence(a, qid, evId) {
    const ev = ctx.evidenceById(evId);
    const q = questionOf(a, qid);
    if (!ev || !q) return;
    const c = ctl(a, qid);
    if (!c.evidenceIds.includes(evId)) c.evidenceIds.push(evId);
    if (!(ev.assessmentIds || []).includes(a.id)) ev.assessmentIds = (ev.assessmentIds || []).concat(a.id);
    if (q.code && !(ev.questionIds || []).includes(q.code)) ev.questionIds = (ev.questionIds || []).concat(q.code);
    ev.updated = nowIso();
    touch(a);
    logActivity(a, `Linked evidence ${ev.id} to ${q.code || qid}.`);
  }
  ACT["dp-ctl-ev-link"] = (evId, el) => {
    const a = cur();
    if (!evId || !a || !allow(canFill(a))) { render(); return; }
    linkEvidence(a, el.getAttribute("data-q"), evId);
    persist("Evidence linked");
    render();
  };
  ACT["dp-ctl-ev-unlink"] = arg => {
    const [qid, evId] = String(arg).split("|");
    const a = cur();
    if (!a || !allow(canFill(a))) return;
    const c = ctl(a, qid);
    c.evidenceIds = c.evidenceIds.filter(x => x !== evId);
    const stillCited = Object.values(a.controls).some(x => (x.evidenceIds || []).includes(evId));
    const ev = ctx.evidenceById(evId);
    if (ev && !stillCited) ev.assessmentIds = (ev.assessmentIds || []).filter(x => x !== a.id);
    logActivity(a, `Unlinked evidence ${evId}.`);
    persist("Evidence unlinked");
    render();
  };
  ACT["dp-ctl-task"] = qid => {
    const a = cur();
    if (!a || !allow(canFill(a))) return;
    const q = questionOf(a, qid);
    const c = ctl(a, qid);
    const title = (c.recommendation || `Close the gap on ${q.code || q.t}`).slice(0, 110);
    S().tasks.unshift({ id: "TK-" + uid(), title, assessment: a.id, owner: c.controlOwner || a.who, due: c.targetDate || a.due, status: "Open", kind: "Mitigation", ref: q.code || qid });
    persist("Task created");
    render();
  };

  /* ---------------- question filter ---------------- */
  ACT["dp-qf"] = (v, el) => { ui.qf = { ...ui.qf, [el.getAttribute("data-key")]: v }; render(); };
  ACT["dp-qf-clear"] = () => { ui.qf = { resp: "", rag: "", fw: "", ev: "", owner: "", domain: "" }; render(); };

  /* ---------------- new assessment ---------------- */
  const nextAssessmentId = () => {
    const year = new Date().getFullYear();
    const max = S().assessments.reduce((m, a) => Math.max(m, Number(String(a.id).split("-").pop()) || 0), 0);
    return `DPIA-${year}-${String(max + 1).padStart(3, "0")}`;
  };
  const orgDefaults = () => {
    const r = String(ctx.sampleData?.org?.role || "");
    return { orgRole: /Processor/i.test(r) && /Fiduciary/i.test(r) ? "Both" : /Processor/i.test(r) ? "Data Processor" : "Data Fiduciary", sdf: /SDF/i.test(r) };
  };
  // 12 months after the last approved annual SDF DPIA, and never in the past
  function annualDue() {
    const last = S().assessments.filter(a => a.assessmentType === ANNUAL_TYPE && a.status === "Approved" && a.completedAt).map(a => a.completedAt).sort().pop();
    if (!last) return today(30);
    const d = new Date(last);
    d.setFullYear(d.getFullYear() + 1);
    const iso = d.toISOString().slice(0, 10);
    return iso < today() ? today(14) : iso;
  }
  // Templates worth adding for the chosen activities
  function templateHints(ids) {
    const acts = ctx.ropaActivities().filter(x => ids.includes(x.id));
    const pub = id => S().templates.some(t => t.id === id && t.status === "Published");
    const out = [];
    if (acts.some(x => x.xb === "Yes") && pub("tpl-transfer")) out.push("Cross-border transfer assessment (an activity transfers data abroad)");
    if (acts.some(x => x.ai === "Yes") && pub("tpl-ai")) out.push("AI impact assessment (an activity uses AI or automated decisions)");
    if (acts.some(x => (x.dpc || []).some(d => /child|minor/i.test(d)))) out.push(`Children's data assessment (children are data principals)${pub("tpl-child") ? "" : ", once it is published"}`);
    return out;
  }
  const naScope = () => uniqIds([val("#dp-na-act")].concat([...document.querySelectorAll(".dp-na-acts input[type=checkbox]:checked")].map(x => x.value)));
  const uniqIds = arr => [...new Set(arr.filter(Boolean))];
  const refreshHints = () => {
    const el = $("#dp-na-hint");
    if (!el) return;
    const h = templateHints(naScope());
    el.innerHTML = h.length ? `<b>Also consider:</b> ${h.map(safe).join("; ")}.` : "";
  };

  ACT["dp-new-assessment"] = arg => {
    if (!allow(role().send)) return;
    const [tplId, actId] = String(arg || "").split("|");
    const tpls = S().templates.filter(t => t.status === "Published");
    if (!tpls.length) { toast("Publish a template first"); return; }
    const acts = ctx.ropaActivities();
    const act = acts.find(x => x.id === actId);
    const people = PEOPLE.map(p => p.name);
    const org = orgDefaults();
    const chosen = tplId || "tpl-dpia";
    const integrated = chosen === INTEGRATED_TEMPLATE_ID;
    runtime.modal("New assessment", act ? `For ${act.name} (${act.id})` : "DPIA", `
      <div class="dp-form-2">
        <div class="dp-field dp-span-2"><label for="dp-na-name">Assessment name *</label>
          <input id="dp-na-name" maxlength="90" autocomplete="off" value="${act ? safe(act.name) : ""}" placeholder="For example, New CRM rollout"></div>
        <div class="dp-field"><label for="dp-na-tpl">Template *</label>
          <select id="dp-na-tpl" data-act="dp-na-tpl">${tpls.map(t => `<option value="${safe(t.id)}" ${t.id === chosen ? "selected" : ""}>${safe(t.title)} · v${t.version}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-na-type">Assessment type</label>
          <select id="dp-na-type" data-act="dp-na-type">${opt(ASSESSMENT_TYPES, integrated ? ANNUAL_TYPE : "Project DPIA")}</select></div>
        <div class="dp-field"><label for="dp-na-act">Primary Data Map activity</label>
          <select id="dp-na-act" data-act="dp-na-activity"><option value="">Not linked</option>
            ${acts.map(x => `<option value="${safe(x.id)}" ${x.id === actId ? "selected" : ""}>${safe(x.id)} · ${safe(x.name)}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-na-role">Organisation role</label><select id="dp-na-role">${opt(ORG_ROLES, org.orgRole)}</select></div>
        <fieldset class="dp-field dp-span-2 dp-na-acts"><legend>Other activities in scope</legend>
          ${pickList(safe, { cls: "dp-na-acts-pick", items: actItems(acts), noun: "activities", after: "dp-na-scope" })}</fieldset>
        <div class="dp-field"><label for="dp-na-who">Assignee *</label><select id="dp-na-who">${opt(people, act ? "Rohan Gupta" : "Daniel Okafor")}</select></div>
        <div class="dp-field"><label for="dp-na-rev">Reviewer *</label><select id="dp-na-rev">${opt(["Meera Iyer", "Daniel Okafor"], "Meera Iyer")}</select></div>
        <fieldset class="dp-field dp-span-2 dp-na-assessors"><legend>Other assessors</legend>
          ${toggleChips(safe, { cls: "", items: people.map(n => ({ value: n, label: n })), label: "Other assessors" })}</fieldset>
        <fieldset class="dp-field dp-span-2 dp-na-fw"><legend>Frameworks in scope</legend>
          ${toggleChips(safe, { cls: "", items: FRAMEWORKS.map(f => ({ value: f, label: f })), chosen: integrated ? FRAMEWORKS : ["DPDPA"], label: "Frameworks in scope" })}</fieldset>
        <div class="dp-field"><label for="dp-na-due">Due date *</label><input id="dp-na-due" type="date" min="${today()}" value="${integrated ? annualDue() : today(30)}"></div>
        <div class="dp-field"><label class="dp-check dp-check-pad"><input type="checkbox" id="dp-na-sdf" ${org.sdf ? "checked" : ""}> Significant Data Fiduciary</label></div>
        <div class="dp-field dp-span-2"><label for="dp-na-desc">What is changing?</label>
          <textarea id="dp-na-desc" rows="2" placeholder="A sentence on the project, so the assignee knows the scope"></textarea></div>
      </div>
      <p class="dp-hint" id="dp-na-hint" role="status"></p>
      <p class="dp-hint">The assessment keeps the template version it starts with. ${act ? "The Data Map entry will show the DPIA's progress." : ""}</p>
      <p class="dp-error" id="dp-na-err" role="alert"></p>
    `, foot("dp-save-assessment", "Send assessment"));
    afterRender(refreshHints);
    focus("#dp-na-name");
  };
  ACT["dp-na-activity"] = id => {
    const name = $("#dp-na-name");
    const x = ctx.ropaActivities().find(r => r.id === id);
    if (name && x && !name.value.trim()) name.value = x.name;
    refreshHints();
  };
  ACT["dp-na-scope"] = () => refreshHints();
  ACT["dp-na-type"] = v => { const d = $("#dp-na-due"); if (d) d.value = v === ANNUAL_TYPE ? annualDue() : today(30); };
  ACT["dp-na-tpl"] = v => {
    if (v !== INTEGRATED_TEMPLATE_ID) return;
    document.querySelectorAll(".dp-na-fw input").forEach(x => { x.checked = true; });
  };
  ACT["dp-save-assessment"] = () => {
    if (!allow(role().send)) return;
    const name = val("#dp-na-name"), due = val("#dp-na-due");
    if (!name) return showError("#dp-na-err", "Enter a name for the assessment.");
    if (S().assessments.some(a => a.name.toLowerCase() === name.toLowerCase() && ctx.OPEN_STATUSES.includes(a.status))) return showError("#dp-na-err", "An open assessment already has this name.");
    if (!due) return showError("#dp-na-err", "Choose a due date.");
    if (due < today()) return showError("#dp-na-err", "The due date cannot be in the past.");
    const t = S().templates.find(x => x.id === val("#dp-na-tpl"));
    const acts = ctx.ropaActivities();
    const ids = naScope();
    const primary = acts.find(x => x.id === (val("#dp-na-act") || ids[0]));
    const fws = [...document.querySelectorAll(".dp-na-fw input:checked")].map(x => x.value);
    const who = val("#dp-na-who");
    const now = nowIso();
    const a = {
      id: nextAssessmentId(), name, desc: val("#dp-na-desc"), tpl: t.id, tplTitle: t.title, tplVersion: t.version, sections: clone(t.sections),
      activityId: primary ? primary.id : "", activityName: primary ? primary.name : "", activityIds: ids,
      assessmentType: val("#dp-na-type") || "Project DPIA", orgRole: val("#dp-na-role") || "Data Fiduciary", sdf: Boolean($("#dp-na-sdf")?.checked),
      frameworksInScope: fws.length ? fws : ["DPDPA"],
      assessors: [...document.querySelectorAll(".dp-na-assessors input:checked")].map(x => x.value).filter(n => n !== who),
      methodologyVersion: METHODOLOGY_VERSION,
      who, reviewer: val("#dp-na-rev"), due, status: "Not started", answers: {}, controls: {}, risks: [], reviewNote: "",
      created: now, updated: now, submittedAt: null, completedAt: null,
      activity: [{ at: now, by: ctx.currentUser.name, text: `Assessment sent to ${who} using “${t.title}” v${t.version}.` }],
    };
    S().assessments.unshift(a);
    syncRopa(a);
    runtime.ledgerAdd("DPIA sent", `${a.id} · ${a.name} → ${who}`);
    persist(`${a.id} sent to ${who}`);
    runtime.closeOv();
    openAssessment(a.id, 0);
    return undefined;
  };

  /* ---------------- submit, review, reopen, delete ---------------- */
  ACT["dp-submit"] = () => {
    const a = cur();
    if (!a || !allow(canFill(a))) return;
    const miss = missingRequired(a);
    const ctl2 = controlProblems(a);
    if (miss.length || ctl2.length) {
      const row = (m, extra) => `<li><span>${m.q.code ? `<span class="dp-code">${safe(m.q.code)}</span>` : `<span class="dp-qn">${m.num}</span>`} ${safe(m.q.t)}${extra ? `<small class="dp-muted"> · needs ${safe(extra)}</small>` : ""}</span><button class="btn sm" data-act="dp-jump" data-arg="${m.si}|${safe(m.q.id)}">${extra ? "Fix" : "Answer"}</button></li>`;
      runtime.modal(miss.length ? "Answer the required questions first" : "Complete the control records first", a.name, `
        ${miss.length ? `<p>${miss.length} required question${miss.length > 1 ? "s are" : " is"} unanswered.</p>
          <ul class="dp-problems">${miss.slice(0, 10).map(m => row(m)).join("")}</ul>${miss.length > 10 ? `<p class="dp-hint">And ${miss.length - 10} more.</p>` : ""}` : ""}
        ${ctl2.length ? `<p>${ctl2.length} answer${ctl2.length > 1 ? "s need" : " needs"} more detail in Assessment details.</p>
          <ul class="dp-problems">${ctl2.slice(0, 10).map(m => row(m, m.msgs.join(", "))).join("")}</ul>${ctl2.length > 10 ? `<p class="dp-hint">And ${ctl2.length - 10} more.</p>` : ""}` : ""}`,
        '<button class="btn" data-act="close">Close</button>');
      return;
    }
    const sugg = suggestedRisks(a).length;
    runtime.modal(a.status === "Changes requested" ? "Resubmit for review?" : "Submit for review?", a.name, `
      <p>${safe(a.reviewer)} will review it. Answers are locked until it is approved or returned.</p>
      ${sugg ? `<div class="dp-banner is-warn">${sugg} flagged answer${sugg > 1 ? "s have" : " has"} no risk recorded. You can still submit, but the reviewer will see it.</div>` : ""}
    `, foot("dp-confirm-submit", "Submit"));
  };
  ACT["dp-confirm-submit"] = () => {
    const a = cur();
    if (!a || !canFill(a)) return;
    runtime.closeOv();
    const again = a.status === "Changes requested";
    a.status = "Under review";
    a.submittedAt = nowIso();
    logActivity(a, again ? "Resubmitted for review." : "Submitted for review.");
    const open = S().tasks.find(t => t.assessment === a.id && t.kind === "Review" && t.status !== "Done");
    if (!open) S().tasks.unshift({ id: "TK-" + uid(), title: `Review “${a.name}”`, assessment: a.id, owner: a.reviewer, due: today(5), status: "Open", kind: "Review" });
    syncRopa(a);
    runtime.ledgerAdd("DPIA submitted for review", `${a.id} · ${a.name}`);
    ui.step = "summary";
    persist(`Sent to ${a.reviewer} for review`);
    render();
  };
  const closeReviewTasks = a => S().tasks.forEach(t => { if (t.assessment === a.id && t.kind === "Review") t.status = "Done"; });
  const undecided = a => (a.risks || []).filter(r => isRiskOpen(r) && ["RED", "AMBER"].includes(riskScores(r).rag) && !(r.acceptance || {}).decision);

  ACT["dp-approve"] = () => {
    const a = cur();
    if (!a || !allow(canReview(a))) return;
    const high = undecided(a);
    runtime.modal("Approve this assessment?", a.name, `
      ${high.length ? `<div class="dp-banner is-risk"><b>${high.length} RED or AMBER residual risk${high.length > 1 ? "s have" : " has"} no acceptance decision:</b> ${high.map(r => `${safe(r.id)} ${safe(r.title)}`).join("; ")}</div>
        <label class="dp-check"><input type="checkbox" id="dp-ap-accept"> I accept these residual risks on behalf of the organisation</label>` : ""}
      <div class="dp-field"><label for="dp-ap-note">Approval note</label><textarea id="dp-ap-note" rows="3" placeholder="Optional. For example, conditions of approval"></textarea></div>
      <p class="dp-error" id="dp-ap-err" role="alert"></p>
    `, foot("dp-confirm-approve", "Approve"));
  };
  ACT["dp-confirm-approve"] = () => {
    const a = cur();
    if (!a || !canReview(a)) return;
    const box = $("#dp-ap-accept");
    if (box && !box.checked) return showError("#dp-ap-err", "Accept the residual risks, or request changes instead.");
    const note = val("#dp-ap-note");
    runtime.closeOv();
    if (box) undecided(a).forEach(r => { r.acceptance = { ...r.acceptance, decision: "Accepted at approval", by: ctx.currentUser.name, at: nowIso(), rationale: note || "Accepted when the assessment was approved." }; });
    a.status = "Approved";
    a.completedAt = nowIso();
    a.reviewNote = note;
    logActivity(a, `Approved.${box ? " Residual risks accepted by the reviewer." : ""}${note ? ` Note: ${note}` : ""}`);
    closeReviewTasks(a);
    syncRopa(a);
    runtime.ledgerAdd("DPIA approved", `${a.id} · ${a.name} · ${ctx.currentUser.name}`);
    persist(`${a.name} approved`);
    render();
    return undefined;
  };
  ACT["dp-request-changes"] = () => {
    const a = cur();
    if (!a || !allow(canReview(a))) return;
    runtime.modal("Request changes", a.name, `
      <div class="dp-field"><label for="dp-rc-note">What needs to change? *</label><textarea id="dp-rc-note" rows="4" placeholder="${safe(a.who)} sees this note at the top of the assessment"></textarea></div>
      <p class="dp-error" id="dp-rc-err" role="alert"></p>`, foot("dp-confirm-changes", "Return to assignee"));
    focus("#dp-rc-note");
  };
  ACT["dp-confirm-changes"] = () => {
    const a = cur();
    if (!a || !canReview(a)) return;
    const note = val("#dp-rc-note");
    if (!note) return showError("#dp-rc-err", "Tell the assignee what to change.");
    runtime.closeOv();
    a.status = "Changes requested";
    a.reviewNote = note;
    logActivity(a, `Requested changes: ${note}`);
    closeReviewTasks(a);
    syncRopa(a);
    persist(`Returned to ${a.who}`);
    render();
    return undefined;
  };
  ACT["dp-reopen"] = () => {
    const a = cur();
    if (!a || !allow(role().review)) return;
    a.status = "In progress";
    a.completedAt = null;
    logActivity(a, "Reopened for changes.");
    syncRopa(a);
    runtime.ledgerAdd("DPIA reopened", `${a.id} · ${a.name}`);
    persist("Assessment reopened");
    render();
  };
  ACT["dp-delete"] = () => {
    const a = cur();
    if (!a || !allow(role().send)) return;
    runtime.modal("Delete this assessment?", a.name, `<p>Its answers, controls, risks and tasks are removed. Evidence records stay in the register. Entries already in the Proof Ledger stay.${a.activityId ? " The Data Map entry goes back to “Not started”." : ""}</p>`, foot("dp-confirm-delete", "Delete assessment", "d"));
  };
  ACT["dp-confirm-delete"] = () => {
    const a = cur();
    if (!a) return;
    S().assessments = S().assessments.filter(x => x.id !== a.id);
    S().tasks = S().tasks.filter(t => t.assessment !== a.id);
    (S().evidence || []).forEach(e => { e.assessmentIds = (e.assessmentIds || []).filter(x => x !== a.id); });
    syncRopa(a, true);
    runtime.ledgerAdd("DPIA deleted", `${a.id} · ${a.name}`);
    runtime.closeOv();
    ui.selected = null;
    persist("Assessment deleted");
    render();
  };

  /* ---------------- risks ---------------- */
  const scoreSel = (id, list, labels, v) => `<select id="${id}" data-act="dp-rk-score">${list.map(x => `<option value="${x}" ${Number(v) === x ? "selected" : ""}>${x} · ${safe(labels[x] || "")}</option>`).join("")}</select>`;
  const csv = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
  const nextRiskId = a => `R${(a.risks || []).reduce((m, r) => Math.max(m, Number(String(r.id).replace(/\D/g, "")) || 0), 0) + 1}`;
  const scoreText = (l, i, ce) => { const r = riskScores({ likelihood: l, impact: i, controlEffectiveness: ce }); return `Inherent ${formatScore(r.inherent, 0)} · residual ${formatScore(r.residual)} ${ctx.ragPill(r.rag)}`; };

  function riskModal(a, k, seed) {
    const r = k === "" ? null : a.risks[Number(k)];
    const acts = ctx.ropaActivities();
    const scope = (a.activityIds || []).length ? acts.filter(x => a.activityIds.includes(x.id)) : acts;
    const d = r || {
      title: "", questionId: "", activityId: a.activityId || "", scenario: "", threat: "", harm: "", affectedData: [], affectedPrincipals: [],
      likelihood: 3, impact: 3, existingControls: "", controlEffectiveness: 0, treatment: "", owner: a.who, targetDate: "", status: "Open", priority: "Medium", ...(seed || {}),
    };
    if (!r && !d.affectedData.length) { const x = acts.find(y => y.id === d.activityId); if (x) { d.affectedData = x.cat.slice(0, 4); d.affectedPrincipals = x.dpc.slice(0, 3); } }
    const qs = allQuestions(a);
    const statuses = RISK_STATUSES.filter(s => s !== "Accepted" || d.status === "Accepted");
    runtime.modal(r ? `Edit risk ${safe(r.id)}` : "Record a risk", a.name, `
      <div class="dp-form-2">
        <div class="dp-field dp-span-2"><label for="dp-rk-title">Risk *</label><input id="dp-rk-title" value="${safe(d.title)}" maxlength="120" placeholder="For example, Data kept longer than needed" autocomplete="off"></div>
        <div class="dp-field"><label for="dp-rk-q">DPIA question</label><select id="dp-rk-q"><option value="">None</option>${qs.map(x => `<option value="${safe(x.q.id)}" ${x.q.id === d.questionId ? "selected" : ""}>${safe(x.q.code || x.num)} · ${safe(x.q.t.slice(0, 70))}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-rk-act">Processing activity</label><select id="dp-rk-act" data-act="dp-rk-activity"><option value="">Not linked</option>${scope.map(x => `<option value="${safe(x.id)}" ${x.id === d.activityId ? "selected" : ""}>${safe(x.id)} · ${safe(x.name)}</option>`).join("")}</select></div>
        <div class="dp-field dp-span-2"><label for="dp-rk-desc">Risk scenario</label><textarea id="dp-rk-desc" rows="2" placeholder="What could go wrong">${safe(d.scenario)}</textarea></div>
        <div class="dp-field"><label for="dp-rk-threat">Threat / cause</label><input id="dp-rk-threat" value="${safe(d.threat)}" autocomplete="off"></div>
        <div class="dp-field"><label for="dp-rk-harm">Potential harm to data principals</label><input id="dp-rk-harm" value="${safe(d.harm)}" autocomplete="off"></div>
        <div class="dp-field"><label for="dp-rk-data">Affected data</label><input id="dp-rk-data" value="${safe((d.affectedData || []).join(", "))}" placeholder="Comma separated" autocomplete="off"></div>
        <div class="dp-field"><label for="dp-rk-dp">Affected data principals</label><input id="dp-rk-dp" value="${safe((d.affectedPrincipals || []).join(", "))}" placeholder="Comma separated" autocomplete="off"></div>
      </div>
      <fieldset class="dp-score"><legend>Scoring <span id="dp-rk-calc">${scoreText(d.likelihood, d.impact, d.controlEffectiveness)}</span></legend>
        <div class="dp-form-3"><div class="dp-field"><label for="dp-rk-l">Likelihood</label>${scoreSel("dp-rk-l", SCALE_1_5, LIKELIHOOD_LABELS, d.likelihood)}</div>
        <div class="dp-field"><label for="dp-rk-i">Impact</label>${scoreSel("dp-rk-i", SCALE_1_5, IMPACT_LABELS, d.impact)}</div>
        <div class="dp-field"><label for="dp-rk-ce">Control effectiveness</label>${scoreSel("dp-rk-ce", SCALE_0_5, CE_LABELS, d.controlEffectiveness)}</div></div>
        <div class="dp-field"><label for="dp-rk-ec">Existing controls</label><input id="dp-rk-ec" value="${safe(d.existingControls)}" autocomplete="off"></div></fieldset>
      <div class="dp-field"><label for="dp-rk-mit">Treatment</label><textarea id="dp-rk-mit" rows="2" placeholder="What reduces or removes the risk?">${safe(d.treatment)}</textarea></div>
      <div class="dp-form-2">
        <div class="dp-field"><label for="dp-rk-owner">Owner</label><select id="dp-rk-owner">${opt(PEOPLE.map(p => p.name), d.owner)}</select></div>
        <div class="dp-field"><label for="dp-rk-due">Target date</label><input id="dp-rk-due" type="date" value="${safe(d.targetDate)}"></div>
        <div class="dp-field"><label for="dp-rk-status">Status</label><select id="dp-rk-status">${opt(statuses, d.status)}</select></div>
        <div class="dp-field"><label for="dp-rk-pri">Priority</label><select id="dp-rk-pri">${opt(PRIORITIES, d.priority)}</select></div>
      </div>
      <p class="dp-hint">To accept a risk, use Accept or escalate on the risk. AMBER and RED risks need the DPO.</p>
      ${r ? "" : `<label class="dp-check"><input type="checkbox" id="dp-rk-task" checked> Create a task for the owner</label>`}
      <p class="dp-error" id="dp-rk-err" role="alert"></p>
    `, foot("dp-risk-save", r ? "Save risk" : "Add risk", "t", r ? String(k) : "new"));
    focus("#dp-rk-title");
  }
  const riskLock = "Risks can be changed only while the assessment is with the assignee";
  ACT["dp-risk-add"] = fromQ => {
    const a = cur();
    if (!a || !allow(canFill(a), riskLock)) return;
    const x = fromQ && allQuestions(a).find(y => y.q.id === fromQ);
    riskModal(a, "", x ? { questionId: fromQ, scenario: `Flagged by ${x.q.code || `question ${x.num}`}: ${x.q.t}` } : null);
  };
  ACT["dp-risk-from-gap"] = qid => {
    const a = cur();
    if (!a || !allow(canFill(a), riskLock)) return;
    const q = questionOf(a, qid);
    const c = ctl(a, qid);
    riskModal(a, "", {
      title: (c.finding || q.t).slice(0, 110), questionId: qid, activityId: c.activityId || a.activityId || "",
      scenario: c.finding || "", likelihood: c.likelihood || 3, impact: c.impact || 3, controlEffectiveness: c.controlEffectiveness ?? 0,
      treatment: c.recommendation || "", owner: c.controlOwner || a.who, targetDate: c.targetDate || "", priority: c.priority || "Medium",
    });
  };
  ACT["dp-risk-edit"] = k => { const a = cur(); if (a && allow(canFill(a), riskLock)) riskModal(a, k); };
  ACT["dp-rk-score"] = () => { const el = $("#dp-rk-calc"); if (el) el.innerHTML = scoreText(Number(val("#dp-rk-l")), Number(val("#dp-rk-i")), Number(val("#dp-rk-ce"))); };
  ACT["dp-rk-activity"] = id => {
    const x = ctx.ropaActivities().find(y => y.id === id);
    if (!x) return;
    if (!val("#dp-rk-data")) $("#dp-rk-data").value = x.cat.slice(0, 4).join(", ");
    if (!val("#dp-rk-dp")) $("#dp-rk-dp").value = x.dpc.slice(0, 3).join(", ");
  };
  ACT["dp-risk-save"] = arg => {
    const a = cur();
    if (!a || !canFill(a)) return;
    const title = val("#dp-rk-title");
    if (!title) return showError("#dp-rk-err", "Describe the risk in a few words.");
    const n = id => Number(val(id));
    const r = {
      title, questionId: val("#dp-rk-q"), activityId: val("#dp-rk-act"), scenario: val("#dp-rk-desc"), threat: val("#dp-rk-threat"), harm: val("#dp-rk-harm"),
      affectedData: csv(val("#dp-rk-data")), affectedPrincipals: csv(val("#dp-rk-dp")),
      likelihood: n("#dp-rk-l"), impact: n("#dp-rk-i"), controlEffectiveness: n("#dp-rk-ce"), existingControls: val("#dp-rk-ec"),
      treatment: val("#dp-rk-mit"), owner: val("#dp-rk-owner"), targetDate: val("#dp-rk-due"), status: val("#dp-rk-status"), priority: val("#dp-rk-pri"),
    };
    a.risks = a.risks || [];
    const sc = riskScores(r);
    if (arg === "new") {
      r.id = nextRiskId(a);
      r.acceptance = { decision: "", by: "", at: "", rationale: "", escalatedTo: "" };
      a.risks.push(r);
      logActivity(a, `Recorded risk ${r.id}: ${title} (residual ${formatScore(sc.residual)} ${sc.rag}).`);
      if ($("#dp-rk-task")?.checked && r.treatment) {
        S().tasks.unshift({ id: "TK-" + uid(), title: r.treatment.length > 90 ? r.treatment.slice(0, 87) + "…" : r.treatment, assessment: a.id, owner: r.owner, due: r.targetDate || a.due, status: "Open", kind: "Mitigation", ref: r.id });
      }
    } else {
      Object.assign(a.risks[Number(arg)], r);
      logActivity(a, `Updated risk ${a.risks[Number(arg)].id}: ${title}.`);
    }
    touch(a);
    runtime.closeOv();
    persist(arg === "new" ? `Risk ${r.id} created` : "Risk updated");
    render();
    return undefined;
  };
  ACT["dp-risk-delete"] = k => {
    const a = cur();
    if (!a || !allow(canFill(a))) return;
    runtime.modal("Delete this risk?", a.risks[Number(k)].title, "<p>The risk is removed from this assessment. Tasks created for it stay.</p>", foot("dp-confirm-risk-delete", "Delete risk", "d", k));
  };
  ACT["dp-confirm-risk-delete"] = k => {
    const a = cur();
    if (!a || !canFill(a)) return;
    const [r] = a.risks.splice(Number(k), 1);
    logActivity(a, `Deleted risk ${r.id}: ${r.title}.`);
    runtime.closeOv();
    persist("Risk deleted");
    render();
  };
  ACT["dp-risk-task"] = k => {
    const a = cur();
    if (!a || !allow(canFill(a))) return;
    const r = a.risks[Number(k)];
    S().tasks.unshift({ id: "TK-" + uid(), title: (r.treatment || r.title).slice(0, 110), assessment: a.id, owner: r.owner || a.who, due: r.targetDate || a.due, status: "Open", kind: "Mitigation", ref: r.id });
    persist("Task created");
    render();
  };

  // Acceptance and escalation: AMBER and RED need the DPO and a rationale; RED also needs a body to escalate to
  const canDecide = (a, r) => {
    const rag = riskScores(r).rag;
    if (["RED", "AMBER"].includes(rag)) return role().review && a.status !== "Approved";
    return canFill(a) || (role().review && a.status !== "Approved");
  };
  ACT["dp-risk-accept"] = k => {
    const a = cur();
    const r = a && a.risks[Number(k)];
    if (!r) return;
    const rag = riskScores(r).rag;
    if (!allow(canDecide(a, r), ["RED", "AMBER"].includes(rag) ? `Only the DPO can accept or escalate a ${rag} risk` : undefined)) return;
    const acc = r.acceptance || {};
    runtime.modal(`Accept or escalate ${safe(r.id)}`, r.title, `
      <p>Residual ${formatScore(riskScores(r).residual)} ${ctx.ragPill(rag)}. ${rag === "RED" ? "A RED risk must be escalated, even when it is accepted." : ""}</p>
      <div class="dp-form-2">
        <div class="dp-field"><label for="dp-ac-dec">Decision</label><select id="dp-ac-dec">${opt(["Accepted", "Escalated"], acc.decision || (rag === "RED" ? "Escalated" : "Accepted"))}</select></div>
        <div class="dp-field"><label for="dp-ac-to">Escalated to${rag === "RED" ? " *" : ""}</label><select id="dp-ac-to"><option value="">None</option>${opt(ESCALATION_BODIES, acc.escalatedTo)}</select></div>
        <div class="dp-field dp-span-2"><label for="dp-ac-why">Rationale${["RED", "AMBER"].includes(rag) ? " *" : ""}</label><textarea id="dp-ac-why" rows="3" placeholder="Why the residual risk is acceptable, or what the escalation asks for">${safe(acc.rationale || "")}</textarea></div>
      </div>
      <p class="dp-error" id="dp-ac-err" role="alert"></p>`, foot("dp-risk-accept-save", "Record decision", "t", k));
    focus("#dp-ac-why");
  };
  ACT["dp-risk-accept-save"] = k => {
    const a = cur();
    const r = a && a.risks[Number(k)];
    if (!r || !canDecide(a, r)) return;
    const rag = riskScores(r).rag;
    const decision = val("#dp-ac-dec"), rationale = val("#dp-ac-why"), escalatedTo = val("#dp-ac-to");
    if (["RED", "AMBER"].includes(rag) && !rationale) return showError("#dp-ac-err", "Give a rationale for the decision.");
    if (rag === "RED" && !escalatedTo) return showError("#dp-ac-err", "A RED risk must be escalated. Choose who it goes to.");
    if (decision === "Escalated" && !escalatedTo) return showError("#dp-ac-err", "Choose who the risk is escalated to.");
    r.acceptance = { decision, by: ctx.currentUser.name, at: nowIso(), rationale, escalatedTo };
    if (decision === "Accepted") r.status = "Accepted";
    logActivity(a, `${decision} risk ${r.id} (${rag})${escalatedTo ? `, escalated to ${escalatedTo}` : ""}: ${rationale || "no rationale"}`);
    runtime.ledgerAdd(`DPIA risk ${decision.toLowerCase()}`, `${a.id} · ${r.id} · ${ctx.currentUser.name}`);
    runtime.closeOv();
    persist(`Risk ${r.id} ${decision.toLowerCase()}`);
    render();
    return undefined;
  };

  /* ---------------- risk register ---------------- */
  ACT["dp-r-rag"] = l => { ui.rRag = l; render(); };
  ACT["dp-r-status"] = s => { ui.rStatus = s; render(); };
  ACT["dp-r-priority"] = s => { ui.rPriority = s; render(); };
  ACT["dp-r-owner"] = s => { ui.rOwner = s; render(); };
  ACT["dp-r-activity"] = s => { ui.rActivity = s; render(); };
  ACT["dp-r-search"] = q => { ui.rSearch = q; render(); };
  ACT["dp-r-clear"] = () => { Object.assign(ui, { rRag: "", rStatus: "all", rPriority: "", rOwner: "", rActivity: "", rSearch: "" }); render(); };
  const cell = v => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  function download(name, header, rows) {
    const lines = [header.map(cell).join(",")].concat(rows.map(r => r.map(cell).join(",")));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv" }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  // Column order and headers follow the workbook's Risk Register sheet
  ACT["dp-risks-csv"] = () => {
    const rows = R().risks.filtered();
    const acc = r => { const x = r.acceptance || {}; return x.decision ? `${x.decision} by ${x.by}${x.escalatedTo ? `; escalated to ${x.escalatedTo}` : ""}${x.rationale ? ` – ${x.rationale}` : ""}` : ""; };
    download(`dpia-risk-register-${today()}.csv`,
      ["Risk ID", "DPIA Question ID", "Processing Activity", "Risk Scenario", "Affected Data / Data Principals", "Threat / Cause", "Potential Harm", "Existing Controls", "Likelihood", "Impact", "Inherent Risk", "Control Effectiveness", "Residual Risk", "RAG", "Risk Treatment", "Risk Owner", "Target Date", "Status", "Priority", "Risk Acceptance / Escalation"],
      rows.map(({ r, a }) => {
        const q = allQuestions(a).find(x => x.q.id === r.questionId);
        const act = ctx.ropaActivities().find(x => x.id === r.activityId);
        const sc = riskScores(r);
        return [`${a.id}-${r.id}`, q ? q.q.code || q.num : "", act ? `${act.id} ${act.name}` : r.activityId, r.scenario || r.title,
          [(r.affectedData || []).join("; "), (r.affectedPrincipals || []).join("; ")].filter(Boolean).join(" / "), r.threat, r.harm, r.existingControls,
          r.likelihood, r.impact, sc.inherent, r.controlEffectiveness, formatScore(sc.residual), sc.rag, r.treatment, r.owner, r.targetDate, r.status, r.priority, acc(r)];
      }));
    toast(`Exported ${rows.length} risks`);
  };

  /* ---------------- evidence register ---------------- */
  ACT["dp-e-filter"] = f => { ui.eFilter = f; render(); };
  ACT["dp-e-search"] = q => { ui.eSearch = q; render(); };
  const nextEvidenceId = () => `EV-${String((S().evidence || []).reduce((m, e) => Math.max(m, Number(String(e.id).replace(/\D/g, "")) || 0), 0) + 1).padStart(4, "0")}`;
  let evidenceTarget = null;   // { aid, qid } when the evidence is created from a control panel

  function evidenceModal(e, isNew) {
    const acts = ctx.ropaActivities(), assets = ctx.ropaAssets();
    const docs = ctx.ropaRecords("doc"), pols = ctx.ropaRecords("pol");
    runtime.modal(isNew ? "New evidence" : `Edit ${safe(e.id)}`, "Evidence register", `
      <div class="dp-form-2">
        <div class="dp-field dp-span-2"><label for="dp-ev-title">Title *</label><input id="dp-ev-title" value="${safe(e.title)}" maxlength="120" autocomplete="off" placeholder="For example, Quarterly access review – Q3 2026"></div>
        <div class="dp-field dp-span-2"><label for="dp-ev-desc">Description</label><textarea id="dp-ev-desc" rows="2">${safe(e.description)}</textarea></div>
        <div class="dp-field"><label for="dp-ev-type">Evidence type</label><select id="dp-ev-type">${opt(EVIDENCE_TYPES, e.type)}</select></div>
        <div class="dp-field"><label for="dp-ev-owner">Owner / custodian</label><select id="dp-ev-owner">${opt(PEOPLE.map(p => p.name), e.owner)}</select></div>
        <div class="dp-field"><label for="dp-ev-got">Date obtained</label><input id="dp-ev-got" type="date" value="${safe(e.obtainedOn)}"></div>
        <div class="dp-field"><label for="dp-ev-valid">Valid until</label><input id="dp-ev-valid" type="date" value="${safe(e.validUntil)}"></div>
        <div class="dp-field dp-span-2"><label for="dp-ev-loc">Location / reference</label><input id="dp-ev-loc" value="${safe(e.location)}" placeholder="URL or file path" autocomplete="off"></div>
        <div class="dp-field dp-span-2"><label for="dp-ev-qs">DPIA questions it supports</label><input id="dp-ev-qs" value="${safe((e.questionIds || []).join(", "))}" placeholder="For example, DPIA-077, DPIA-080" autocomplete="off"></div>
        <div class="dp-field"><label for="dp-ev-doc">Data Map document</label><select id="dp-ev-doc"><option value="">None</option>${docs.map(x => `<option value="${safe(x.id)}" ${x.id === e.ropaDocId ? "selected" : ""}>${safe(x.id)} · ${safe(x.name)}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-ev-pol">Data Map policy</label><select id="dp-ev-pol"><option value="">None</option>${pols.map(x => `<option value="${safe(x.id)}" ${x.id === e.ropaPolicyId ? "selected" : ""}>${safe(x.id)} · ${safe(x.name)}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-ev-suff">Sufficiency</label><select id="dp-ev-suff">${opt(EVIDENCE_SUFFICIENCY, e.sufficiency)}</select></div>
        <div class="dp-field"><label for="dp-ev-rel">Reliability</label><select id="dp-ev-rel">${opt(EVIDENCE_RELIABILITY, e.reliability)}</select></div>
        <fieldset class="dp-field dp-span-2"><legend>Frameworks</legend>${toggleChips(safe, { cls: "dp-ev-fw", items: FRAMEWORKS.map(f => ({ value: f, label: f })), chosen: e.frameworks || [], label: "Frameworks" })}</fieldset>
        <fieldset class="dp-field dp-span-2"><legend>Processes (Data Map activities)</legend>${pickList(safe, { cls: "dp-ev-acts", items: actItems(acts), chosen: e.activityIds || [], noun: "activities" })}</fieldset>
        <fieldset class="dp-field dp-span-2"><legend>Systems (Data Map assets)</legend>${pickList(safe, { cls: "dp-ev-assets", items: assetItems(assets), chosen: e.assetIds || [], noun: "systems" })}</fieldset>
        <div class="dp-field"><label for="dp-ev-notes">Reviewer notes</label><textarea id="dp-ev-notes" rows="2">${safe(e.reviewerNotes)}</textarea></div>
        <div class="dp-field"><label for="dp-ev-gap">Gap / follow-up</label><textarea id="dp-ev-gap" rows="2">${safe(e.followUp)}</textarea></div>
      </div>
      <p class="dp-error" id="dp-ev-err" role="alert"></p>`, foot("dp-ev-save", isNew ? "Add evidence" : "Save evidence", "t", isNew ? "new" : e.id), "wide");
    focus("#dp-ev-title");
  }
  const blankEvidence = () => ({ title: "", description: "", questionIds: [], assessmentIds: [], frameworks: ["DPDPA"], activityIds: [], assetIds: [], type: "Policy", owner: ctx.currentUser.name, obtainedOn: today(), validUntil: today(365), location: "", ropaDocId: "", ropaPolicyId: "", sufficiency: "Pending", reliability: "Medium", reviewerNotes: "", followUp: "" });
  ACT["dp-ev-new"] = arg => {
    if (!allow(canEdit())) return;
    const [code, aid, qid] = String(arg || "").split("|");
    evidenceTarget = aid && qid ? { aid, qid } : null;
    const e = blankEvidence();
    if (code) e.questionIds = [code];
    const a = aid && S().assessments.find(x => x.id === aid);
    if (a) { const c = (a.controls || {})[qid] || {}; e.activityIds = [c.activityId || a.activityId].filter(Boolean); e.assetIds = (c.assetIds || []).slice(); }
    evidenceModal(e, true);
  };
  ACT["dp-ev-edit"] = id => { const e = ctx.evidenceById(id); if (e && allow(canEdit())) { evidenceTarget = null; evidenceModal(e, false); } };
  ACT["dp-ev-save"] = arg => {
    if (!canEdit()) return;
    const title = val("#dp-ev-title");
    if (!title) return showError("#dp-ev-err", "Give the evidence a title.");
    const codes = csv(val("#dp-ev-qs")).map(x => x.toUpperCase());
    const known = new Set(DPIA_CHECKLIST.questions.map(q => q.id));
    const unknown = codes.filter(c => /^DPIA-/.test(c) && !known.has(c));
    if (unknown.length) return showError("#dp-ev-err", `${unknown.join(", ")} ${unknown.length > 1 ? "are not" : "is not a"} checklist question${unknown.length > 1 ? "s" : ""}.`);
    const got = val("#dp-ev-got"), until = val("#dp-ev-valid");
    if (got && until && until < got) return showError("#dp-ev-err", "Valid until cannot be before the date obtained.");
    const checked = cls => [...document.querySelectorAll(`.${cls} input[type=checkbox]:checked`)].map(x => x.value);
    const fields = {
      title, description: val("#dp-ev-desc"), type: val("#dp-ev-type"), owner: val("#dp-ev-owner"), obtainedOn: got, validUntil: until,
      location: val("#dp-ev-loc"), questionIds: [...new Set(codes)], ropaDocId: val("#dp-ev-doc"), ropaPolicyId: val("#dp-ev-pol"),
      sufficiency: val("#dp-ev-suff"), reliability: val("#dp-ev-rel"), frameworks: checked("dp-ev-fw"), activityIds: checked("dp-ev-acts"), assetIds: checked("dp-ev-assets"),
      reviewerNotes: val("#dp-ev-notes"), followUp: val("#dp-ev-gap"), updated: nowIso(),
    };
    S().evidence = S().evidence || [];
    let e;
    if (arg === "new") {
      e = { ...blankEvidence(), ...fields, id: nextEvidenceId(), created: nowIso(), createdBy: ctx.currentUser.name };
      S().evidence.unshift(e);
    } else {
      e = ctx.evidenceById(arg);
      Object.assign(e, fields);
    }
    const target = evidenceTarget;
    evidenceTarget = null;
    if (target) {
      const a = S().assessments.find(x => x.id === target.aid);
      if (a && canFill(a)) linkEvidence(a, target.qid, e.id);
    }
    runtime.closeOv();
    persist(arg === "new" ? `${e.id} added${target ? " and linked" : ""}` : "Evidence saved");
    render();
    return undefined;
  };
  ACT["dp-ev-delete"] = id => {
    const e = ctx.evidenceById(id);
    if (!e || !allow(canEdit())) return;
    const n = S().assessments.filter(a => Object.values(a.controls || {}).some(c => (c.evidenceIds || []).includes(id))).length;
    runtime.modal("Delete this evidence?", e.title, `<p>${n ? `It is cited in ${n} assessment${n > 1 ? "s" : ""}; those links are removed.` : "It is not cited anywhere."}</p>`, foot("dp-ev-confirm-delete", "Delete evidence", "d", id));
  };
  ACT["dp-ev-confirm-delete"] = id => {
    S().evidence = (S().evidence || []).filter(e => e.id !== id);
    S().assessments.forEach(a => Object.values(a.controls || {}).forEach(c => { if (c.evidenceIds) c.evidenceIds = c.evidenceIds.filter(x => x !== id); }));
    runtime.closeOv();
    persist("Evidence deleted");
    render();
  };
  // Column order and headers follow the workbook's Evidence Register sheet
  ACT["dp-evidence-csv"] = () => {
    const rows = R().evidence.filtered();
    const names = ids => ids.map(id => (ctx.ropaActivities().find(x => x.id === id) || ctx.ropaAssets().find(x => x.id === id) || { name: id }).name);
    download(`dpia-evidence-register-${today()}.csv`,
      ["Evidence ID", "Linked DPIA Question", "Framework", "Process / System", "Evidence Description", "Evidence Type", "Owner / Custodian", "Date Obtained", "Validity / Period", "Location / Reference", "Sufficiency", "Reliability", "Reviewer Notes", "Gap / Follow-up"],
      rows.map(e => [e.id, (e.questionIds || []).join("; "), (e.frameworks || []).join("; "), names((e.activityIds || []).concat(e.assetIds || [])).join("; "),
        [e.title, e.description].filter(Boolean).join(" – "), e.type, e.owner, e.obtainedOn, e.validUntil ? `Until ${e.validUntil}` : "", e.location, e.sufficiency, e.reliability, e.reviewerNotes, e.followUp]));
    toast(`Exported ${rows.length} evidence items`);
  };

  /* ---------------- frameworks ---------------- */
  ACT["dp-fw-scope"] = v => { ui.fwScope = v; render(); };
  // Opens the assessment filtered to the questions behind a crosswalk number
  ACT["dp-fw-open"] = arg => {
    const [aid, what, resp] = String(arg).split("|");
    const a = S().assessments.find(x => x.id === aid);
    if (!a) return;
    const qf = { resp: resp || "", rag: "", fw: "", ev: "", owner: "", domain: "" };
    if (what.startsWith("domain:")) qf.domain = what.slice(7); else qf.fw = what;
    requestLeave(() => {
      Object.assign(ui, { tab: "assessments", selected: aid, step: 0, qf, userMenuOpen: false });
      render();
      const c = $("#content"); if (c) c.scrollTop = 0;
    });
  };

  /* ---------------- tasks ---------------- */
  ACT["dp-k-filter"] = f => { ui.kFilter = f; render(); };
  ACT["dp-k-search"] = q => { ui.kSearch = q; render(); };
  const findTask = id => S().tasks.find(t => t.id === id);
  const canTask = t => canEdit() && (role().fillAny || t.owner === ctx.currentUser.name);
  ACT["dp-task-done"] = (checked, el) => {
    const t = findTask(el.getAttribute("data-id"));
    if (!t) return;
    if (!canTask(t)) { el.checked = t.status === "Done"; toast("Only the task owner or the DPO can change this task"); return; }
    t.status = checked === "true" ? "Done" : "Open";
    persist(t.status === "Done" ? "Task done" : "Task reopened");
    render();
  };
  ACT["dp-task-status"] = (v, el) => {
    const t = findTask(el.getAttribute("data-id"));
    if (!t || !canTask(t)) { render(); return; }
    t.status = v;
    persist("Task updated");
    render();
  };
  ACT["dp-task-new"] = () => {
    if (!allow(role().send)) return;
    runtime.modal("New task", "DPIA", `
      <div class="dp-field"><label for="dp-tk-title">Task *</label><input id="dp-tk-title" maxlength="120" autocomplete="off"></div>
      <div class="dp-form-2">
        <div class="dp-field"><label for="dp-tk-a">Assessment</label><select id="dp-tk-a"><option value="">None</option>${S().assessments.map(a => `<option value="${safe(a.id)}">${safe(a.name)}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-tk-owner">Owner</label><select id="dp-tk-owner">${opt(PEOPLE.map(p => p.name))}</select></div>
        <div class="dp-field"><label for="dp-tk-due">Due date</label><input id="dp-tk-due" type="date" min="${today()}" value="${today(14)}"></div>
        <div class="dp-field"><label for="dp-tk-kind">Kind</label><select id="dp-tk-kind">${opt(["Mitigation", "Review", "Follow-up"], "Follow-up")}</select></div>
      </div>
      <p class="dp-error" id="dp-tk-err" role="alert"></p>`, foot("dp-task-save", "Add task"));
    focus("#dp-tk-title");
  };
  ACT["dp-task-save"] = () => {
    const title = val("#dp-tk-title");
    if (!title) return showError("#dp-tk-err", "Enter the task.");
    S().tasks.unshift({ id: "TK-" + uid(), title, assessment: val("#dp-tk-a"), owner: val("#dp-tk-owner"), due: val("#dp-tk-due"), status: "Open", kind: val("#dp-tk-kind") });
    runtime.closeOv();
    persist("Task added");
    render();
    return undefined;
  };

  /* ---------------- templates: library ---------------- */
  ACT["dp-t-search"] = q => { ui.tSearch = q; render(); };
  ACT["dp-t-status"] = s => { ui.tStatus = s; render(); };
  ACT["dp-t-clear"] = () => { ui.tSearch = ""; ui.tStatus = "all"; ui.tBank = false; render(); };

  function openBuilder(t, mode, isNew) {
    ui.tplDraft = t;
    ui.tplSaved = isNew ? "" : JSON.stringify(t);
    ui.tplReadOnly = !role().build;
    ui.tplMode = mode;
    ui.openSec = 0;
    ui.previewAnswers = {};
    ui.previewStep = 0;
    ui.tab = "templates";
    render();
    const c = $("#content"); if (c) c.scrollTop = 0;
  }
  // A copy with fresh ids, so the copy's questions never collide with the original's
  const freshIds = (t, id) => ({
    ...clone(t), id,
    sections: t.sections.map(s => ({ ...clone(s), id: `${id}-s${uid()}`, qs: s.qs.map(q => ({ ...clone(q), id: `${id}-q${uid()}` })) })),
  });
  const blankTemplate = () => {
    const id = "tpl-" + uid();
    return { id, title: "", desc: "", regulation: "DPDP", status: "Draft", version: 1, lastPublished: null, created: nowIso(), updated: nowIso(), updatedBy: ctx.currentUser.name,
      sections: [{ id: `${id}-s${uid()}`, name: "", desc: "", qs: [{ id: `${id}-q${uid()}`, t: "", type: "Yes/No", req: true, help: "", flag: false, opts: [] }] }] };
  };

  ACT["dp-t-new"] = () => {
    if (!allow(role().build)) return;
    runtime.modal("New template", "DPIA", `
      <div class="dp-field"><label for="dp-nt-from">Start from</label><select id="dp-nt-from"><option value="">Blank template</option>
        ${S().templates.map(t => `<option value="${safe(t.id)}">Copy of ${safe(t.title)}</option>`).join("")}</select></div>
      <p class="dp-hint">Nothing is saved until you click Save draft or Publish in the builder.</p>`, foot("dp-t-create", "Open builder"));
  };
  ACT["dp-t-create"] = () => {
    const src = S().templates.find(t => t.id === val("#dp-nt-from"));
    runtime.closeOv();
    requestLeave(() => {
      let t = blankTemplate();
      if (src) t = { ...freshIds(src, t.id), title: `${src.title} (copy)`, status: "Draft", version: 1, lastPublished: null, created: nowIso(), updated: nowIso(), updatedBy: ctx.currentUser.name };
      openBuilder(t, "edit", true);
      focus("#dp-t-title");
    });
  };
  ACT["dp-t-duplicate"] = id => {
    if (!allow(role().build)) return;
    const src = S().templates.find(t => t.id === id);
    if (!src) return;
    requestLeave(() => {
      const nid = "tpl-" + uid();
      openBuilder({ ...freshIds(src, nid), title: `${src.title} (copy)`, status: "Draft", version: 1, lastPublished: null, created: nowIso(), updated: nowIso(), updatedBy: ctx.currentUser.name }, "edit", true);
      toast("Copy opened. Save it to add it to the library.");
    });
  };
  ACT["dp-t-edit"] = id => {
    if (!allow(role().build)) return;
    const t = S().templates.find(x => x.id === id);
    if (t) requestLeave(() => openBuilder(clone(t), "edit"));
  };
  ACT["dp-t-preview"] = id => {
    const t = S().templates.find(x => x.id === id);
    if (t) requestLeave(() => openBuilder(clone(t), "preview"));
  };
  ACT["dp-t-delete"] = id => {
    if (!allow(role().build)) return;
    const t = S().templates.find(x => x.id === id);
    const used = S().assessments.filter(a => a.tpl === id && ctx.OPEN_STATUSES.includes(a.status)).length;
    if (used) { toast(`${used} open assessment${used > 1 ? "s use" : " uses"} this template. Finish or delete them first.`); return; }
    runtime.modal("Delete this template?", t.title, "<p>Approved assessments keep their copy of the questions, so they are not affected.</p>", foot("dp-t-confirm-delete", "Delete template", "d", id));
  };
  ACT["dp-t-confirm-delete"] = id => {
    S().templates = S().templates.filter(t => t.id !== id);
    runtime.closeOv();
    persist("Template deleted");
    render();
  };

  /* ---------------- templates: builder ---------------- */
  const T = () => ui.tplDraft;
  const refreshHead = () => {
    const h = $("[data-live-thead]");
    if (h && T()) h.outerHTML = R().templates.head(T());
    const p = $("[data-live-problems]");
    if (p && T()) { const n = templateProblems(T(), S().templates).length; p.textContent = n ? `${n} thing${n > 1 ? "s" : ""} to fix before publishing.` : "Ready to publish."; }
  };
  const editable = () => T() && role().build && !ui.tplReadOnly;
  const pos = arg => String(arg).split("|").map(Number);

  ACT["dp-t-back"] = () => requestLeave(() => { render(); });
  ACT["dp-t-mode"] = m => { ui.tplMode = m; render(); };
  ACT["dp-t-pstep"] = i => { ui.previewStep = Number(i); render(); };
  ACT["dp-t-open"] = si => { ui.openSec = ui.openSec === Number(si) ? -1 : Number(si); render(); };

  ACT["dp-t-set"] = (v, el) => { if (!editable()) return; T()[el.getAttribute("data-key")] = v; refreshHead(); };
  ACT["dp-t-select"] = (v, el) => { if (!editable()) return; T()[el.getAttribute("data-key")] = v; refreshHead(); };
  ACT["dp-t-sec"] = (v, el) => { if (!editable()) return; T().sections[Number(el.getAttribute("data-si"))][el.getAttribute("data-key")] = v; refreshHead(); };
  const qOf = el => T().sections[Number(el.getAttribute("data-si"))].qs[Number(el.getAttribute("data-qi"))];
  ACT["dp-t-q"] = (v, el) => { if (!editable()) return; qOf(el)[el.getAttribute("data-key")] = v; refreshHead(); };
  ACT["dp-t-qtype"] = (v, el) => {
    if (!editable()) return;
    const q = qOf(el);
    if (!QUESTION_TYPES.includes(v)) return;
    q.type = v;
    if (OPTION_TYPES.includes(v) && (q.opts || []).filter(Boolean).length < 2) q.opts = (q.opts || []).filter(Boolean).concat(["", ""]).slice(0, Math.max(2, (q.opts || []).filter(Boolean).length));
    if (v !== "Yes/No" && v !== COMPLIANCE) q.flag = false;
    if (v === COMPLIANCE) { if (q.scored === undefined) q.scored = true; if (!q.answerFormat) q.answerFormat = "response"; }
    render();
  };
  ACT["dp-t-qflag"] = (c, el) => { if (!editable()) return; qOf(el)[el.getAttribute("data-key")] = c === "true"; refreshHead(); };
  ACT["dp-t-qsel"] = (v, el) => { if (!editable()) return; qOf(el)[el.getAttribute("data-key")] = v; refreshHead(); };
  ACT["dp-t-qcode"] = (v, el) => { if (!editable()) return; qOf(el).code = v.trim().toUpperCase(); refreshHead(); };
  ACT["dp-t-qtext"] = (c, el) => { if (!editable()) return; qOf(el).answerFormat = c === "true" ? "text+response" : "response"; refreshHead(); };
  ACT["dp-t-qfw"] = (c, el) => {
    if (!editable()) return;
    const q = qOf(el), fw = el.getAttribute("data-fw");
    q.frameworks = FRAMEWORKS.filter(f => (f === fw ? c === "true" : (q.frameworks || []).includes(f)));
    refreshHead();
  };
  ACT["dp-t-bank"] = c => { ui.tBank = c === "true"; render(); };
  ACT["dp-t-opt"] = (v, el) => { if (!editable()) return; qOf(el).opts[Number(el.getAttribute("data-oi"))] = v; refreshHead(); };
  ACT["dp-t-opt-add"] = arg => {
    if (!editable()) return;
    const [si, qi] = pos(arg);
    const q = T().sections[si].qs[qi];
    q.opts.push("");
    render();
    focus(`#dp-b-${si}-${qi}-o${q.opts.length - 1}`);
  };
  ACT["dp-t-opt-del"] = arg => { if (!editable()) return; const [si, qi, oi] = pos(arg); T().sections[si].qs[qi].opts.splice(oi, 1); render(); };
  ACT["dp-t-qadd"] = si => {
    if (!editable()) return;
    const s = T().sections[Number(si)];
    s.qs.push({ id: `${T().id}-q${uid()}`, t: "", type: "Long text", req: false, help: "", flag: false, opts: [] });
    render();
    focus(`#dp-b-${si}-${s.qs.length - 1}`);
  };
  ACT["dp-t-qmove"] = arg => {
    if (!editable()) return;
    const [si, qi, d] = pos(arg);
    const qs = T().sections[si].qs;
    if (qi + d < 0 || qi + d >= qs.length) return;
    [qs[qi], qs[qi + d]] = [qs[qi + d], qs[qi]];
    render();
    focus(`[data-act="dp-t-qmove"][data-arg="${si}|${qi + d}|${d}"]:not([disabled])`);
  };
  ACT["dp-t-qdup"] = arg => {
    if (!editable()) return;
    const [si, qi] = pos(arg);
    const qs = T().sections[si].qs;
    qs.splice(qi + 1, 0, { ...clone(qs[qi]), id: `${T().id}-q${uid()}` });
    render();
    focus(`#dp-b-${si}-${qi + 1}`);
  };
  ACT["dp-t-qdel"] = arg => {
    if (!editable()) return;
    const [si, qi] = pos(arg);
    const [q] = T().sections[si].qs.splice(qi, 1);
    render();
    toast(q.t ? `Removed “${q.t.slice(0, 40)}${q.t.length > 40 ? "…" : ""}”` : "Question removed");
  };
  ACT["dp-t-sadd"] = () => {
    if (!editable()) return;
    const t = T();
    t.sections.push({ id: `${t.id}-s${uid()}`, name: "", desc: "", qs: [{ id: `${t.id}-q${uid()}`, t: "", type: "Long text", req: false, help: "", flag: false, opts: [] }] });
    ui.openSec = t.sections.length - 1;
    render();
    focus(`#dp-bs-${t.sections.length - 1}`);
  };
  ACT["dp-t-smove"] = arg => {
    if (!editable()) return;
    const [si, d] = pos(arg);
    const s = T().sections;
    if (si + d < 0 || si + d >= s.length) return;
    [s[si], s[si + d]] = [s[si + d], s[si]];
    if (ui.openSec === si) ui.openSec = si + d;
    render();
  };
  ACT["dp-t-sdel"] = si => {
    if (!editable()) return;
    const s = T().sections[Number(si)];
    if (!s.qs.length) { T().sections.splice(Number(si), 1); render(); return; }
    runtime.modal("Delete this section?", s.name || `Section ${Number(si) + 1}`, `<p>Its ${s.qs.length} question${s.qs.length > 1 ? "s are" : " is"} removed from the draft.</p>`, foot("dp-t-confirm-sdel", "Delete section", "d", si));
  };
  ACT["dp-t-confirm-sdel"] = si => { T().sections.splice(Number(si), 1); ui.openSec = -1; runtime.closeOv(); render(); };

  function saveTemplate(publish) {
    const t = T();
    if (!t) return false;
    if (!t.title.trim()) { toast("Enter a template title before saving"); ui.tplMode = "edit"; render(); focus("#dp-t-title"); return false; }
    t.title = t.title.trim();
    t.updated = nowIso();
    t.updatedBy = ctx.currentUser.name;
    if (publish) {
      if (t.lastPublished) t.version += 1;
      t.lastPublished = t.updated;
      t.status = "Published";
      t.sections.forEach(s => { s.qs.forEach(q => { q.opts = (q.opts || []).map(o => String(o).trim()).filter(Boolean); }); });
    } else {
      t.status = "Draft";
    }
    const list = S().templates;
    const i = list.findIndex(x => x.id === t.id);
    if (i >= 0) list[i] = clone(t); else list.unshift(clone(t));
    ui.tplSaved = JSON.stringify(t);
    if (publish) runtime.ledgerAdd("DPIA template published", `${t.title} · v${t.version}`);
    persist(publish ? `Published “${t.title}” v${t.version}` : "Draft saved");
    return true;
  }
  ACT["dp-t-save"] = () => {
    if (!editable()) return;
    const saved = S().templates.find(x => x.id === T().id);
    if (saved && saved.status === "Published") {
      runtime.modal("Save as a draft?", T().title, "<p>The template stops being available for new assessments until you publish it again. Assessments already sent are not affected.</p>", foot("dp-t-confirm-save", "Save as draft"));
      return;
    }
    if (saveTemplate(false)) render();
  };
  ACT["dp-t-confirm-save"] = () => { runtime.closeOv(); if (saveTemplate(false)) render(); };
  ACT["dp-t-publish"] = () => {
    if (!editable()) return;
    const problems = templateProblems(T(), S().templates);
    if (problems.length) {
      runtime.modal("Fix these before publishing", T().title || "Template", `
        <ul class="dp-problems">${problems.map(p => `<li><span>${safe(p.msg)}</span>${typeof p.at === "number" ? `<button class="btn sm" data-act="dp-t-goto" data-arg="${p.at}">Open section</button>` : `<button class="btn sm" data-act="dp-t-goto" data-arg="settings">Go to settings</button>`}</li>`).join("")}</ul>`,
        '<button class="btn" data-act="close">Close</button>');
      return;
    }
    const v = T().lastPublished ? T().version + 1 : T().version;
    runtime.modal(`Publish version ${v}?`, T().title, "<p>New assessments will use this version. Assessments already sent keep the version they started with.</p>", foot("dp-t-confirm-publish", "Publish"));
  };
  ACT["dp-t-confirm-publish"] = () => { runtime.closeOv(); if (saveTemplate(true)) render(); };
  ACT["dp-t-goto"] = at => {
    runtime.closeOv();
    ui.tplMode = "edit";
    if (at === "settings") { render(); focus("#dp-t-title"); return; }
    ui.openSec = Number(at);
    render();
    focus(`#dp-bs-${at}`);
  };

  /* ---------------- Data Map hand-off ---------------- */
  AFTER.assess = () => {
    if (!pendingActivity) return;
    const id = pendingActivity;
    pendingActivity = null;
    const existing = S().assessments.find(a => a.activityId === id && ctx.OPEN_STATUSES.includes(a.status));
    if (existing) { setTimeout(() => { openAssessment(existing.id, 0); toast(`${existing.id} is already open for this activity`); }, 0); return; }
    if (!role().send) { toast("Ask the DPO to start a DPIA for this activity"); return; }
    setTimeout(() => ACT["dp-new-assessment"](`tpl-dpia|${id}`), 0);
  };

  /* ---------------- browser close guard ---------------- */
  const prev = window.__dpiaListeners;
  if (prev) prev.forEach(([t, type, fn]) => t.removeEventListener(type, fn));
  const listeners = [[window, "beforeunload", e => { if (tplDirty()) { e.preventDefault(); e.returnValue = ""; } }]];
  listeners.forEach(([t, type, fn]) => t.addEventListener(type, fn));
  window.__dpiaListeners = listeners;
}
