// Every user action in the DPIA module. Changes are saved to MongoDB through the module store;
// starting, submitting and approving an assessment is written to the Proof Ledger, and linked
// Data Map activities follow the assessment's state.
import {
  QUESTION_TYPES, OPTION_TYPES, LIKELIHOOD, IMPACT, RISK_STATUSES, riskLevel, residualLevel,
  missingRequired, suggestedRisks, templateProblems, progress,
} from "../dpiaModel.js";
import { getRopaData, saveRopaData } from "../../ropa/ropaData.js";

const DAY = 864e5;
let pendingActivity = null;

// Called by the Data Map's "Start DPIA": opens the new assessment dialog for that activity
export function queueDpiaForActivity(id) { pendingActivity = id; }

export function registerDpiaActions(ctx, ACT, AFTER) {
  const { runtime, ui, safe, PEOPLE, DEMO_ACCOUNTS, persist, logActivity, canEdit, canFill, canReview, role } = ctx;
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
  ACT["dp-goto-risks"] = l => goTab("risks", { rLevel: l || "", rStatus: "open", rSearch: "" });
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
    Object.assign(ui, { selected: null, tplDraft: null, step: 0, userMenuOpen: false });
    render();
    toast("Demo data restored");
  };
  ACT["dp-print"] = () => window.print();

  /* ---------------- assessments list ---------------- */
  ACT["dp-a-search"] = q => { ui.aSearch = q; render(); };
  ACT["dp-a-status"] = s => { ui.aStatus = s; render(); };
  ACT["dp-a-mine"] = c => { ui.aMine = c === "true"; render(); };
  ACT["dp-a-clear"] = () => { Object.assign(ui, { aSearch: "", aStatus: "", aMine: false }); render(); };

  function openAssessment(id, step) {
    if (!S().assessments.some(a => a.id === id)) return;
    requestLeave(() => {
      Object.assign(ui, { tab: "assessments", selected: id, step: step ?? 0, userMenuOpen: false });
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
    const main = $(".dp-ws-main"); if (main) afterRender(() => main.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  ACT["dp-jump"] = arg => {
    const [si, qid] = String(arg).split("|");
    runtime.closeOv();
    ui.step = Number(si);
    render();
    focus(`#dp-q-${qid}, [data-qwrap="${qid}"] input`);
  };

  /* ---------------- answering ---------------- */
  function setAnswer(el, value, rerender) {
    const qid = el.getAttribute("data-q");
    if (el.getAttribute("data-mode") === "preview") {
      ui.previewAnswers[qid] = value;
      if (rerender) render();
      return;
    }
    const a = cur();
    if (!a || !canFill(a)) { render(); return; }
    if (a.status === "Not started") {
      a.status = "In progress";
      logActivity(a, "Started the assessment.");
      runtime.ledgerAdd("DPIA started", `${a.id} · ${a.name}`);
      syncRopa(a);
      rerender = true;
    }
    a.answers = a.answers || {};
    a.answers[qid] = value;
    a.updated = nowIso();
    persist(null, !rerender);
    if (rerender) { render(); return; }
    // Typing: refresh the progress in place so focus stays in the field
    const nav = $("[data-live-steps]");
    if (nav) nav.outerHTML = R().assessments.stepsNav(a);
    const p2 = $("[data-live-progress2]");
    if (p2) p2.innerHTML = R().assessments.pct(progress(a));
  }

  ACT["dp-answer"] = (v, el) => setAnswer(el, v, false);
  ACT["dp-answer-select"] = (v, el) => setAnswer(el, v, true);
  ACT["dp-answer-radio"] = (_, el) => setAnswer(el, el.value, true);
  ACT["dp-answer-multi"] = (_, el) => {
    const box = el.closest(".dp-multi");
    setAnswer(el, [...box.querySelectorAll("input:checked")].map(x => x.value), true);
  };

  /* ---------------- new assessment ---------------- */
  const nextAssessmentId = () => {
    const max = S().assessments.reduce((m, a) => Math.max(m, Number(String(a.id).split("-").pop()) || 0), 0);
    return `DPIA-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`;
  };
  ACT["dp-new-assessment"] = arg => {
    if (!allow(role().send)) return;
    const [tplId, actId] = String(arg || "").split("|");
    const tpls = S().templates.filter(t => t.status === "Published");
    if (!tpls.length) { toast("Publish a template first"); return; }
    const acts = ctx.ropaActivities();
    const act = acts.find(x => x.id === actId);
    const assessors = PEOPLE.map(p => p.name);
    runtime.modal("New assessment", act ? `For ${act.name} (${act.id})` : "DPIA", `
      <div class="dp-form-2">
        <div class="dp-field dp-span-2"><label for="dp-na-name">Assessment name *</label>
          <input id="dp-na-name" maxlength="90" autocomplete="off" value="${act ? safe(act.name) : ""}" placeholder="For example, New CRM rollout"></div>
        <div class="dp-field"><label for="dp-na-tpl">Template *</label>
          <select id="dp-na-tpl">${tpls.map(t => `<option value="${safe(t.id)}" ${t.id === (tplId || "tpl-dpia") ? "selected" : ""}>${safe(t.title)} · v${t.version}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-na-act">Data Map activity</label>
          <select id="dp-na-act" data-act="dp-na-activity"><option value="">Not linked</option>
            ${acts.map(x => `<option value="${safe(x.id)}" ${x.id === actId ? "selected" : ""}>${safe(x.id)} · ${safe(x.name)}</option>`).join("")}</select></div>
        <div class="dp-field"><label for="dp-na-who">Assignee *</label><select id="dp-na-who">${opt(assessors, act ? "Rohan Gupta" : "Daniel Okafor")}</select></div>
        <div class="dp-field"><label for="dp-na-rev">Reviewer *</label><select id="dp-na-rev">${opt(["Meera Iyer", "Daniel Okafor"], "Meera Iyer")}</select></div>
        <div class="dp-field"><label for="dp-na-due">Due date *</label><input id="dp-na-due" type="date" min="${today()}" value="${today(30)}"></div>
        <div class="dp-field dp-span-2"><label for="dp-na-desc">What is changing?</label>
          <textarea id="dp-na-desc" rows="2" placeholder="A sentence on the project, so the assignee knows the scope"></textarea></div>
      </div>
      <p class="dp-hint">The assessment keeps the template version it starts with. ${act ? "The Data Map entry will show the DPIA's progress." : ""}</p>
      <p class="dp-error" id="dp-na-err" role="alert"></p>
    `, foot("dp-save-assessment", "Send assessment"));
    focus("#dp-na-name");
  };
  ACT["dp-na-activity"] = id => {
    const name = $("#dp-na-name");
    const x = ctx.ropaActivities().find(r => r.id === id);
    if (name && x && !name.value.trim()) name.value = x.name;
  };
  ACT["dp-save-assessment"] = () => {
    if (!allow(role().send)) return;
    const name = val("#dp-na-name"), due = val("#dp-na-due");
    if (!name) return showError("#dp-na-err", "Enter a name for the assessment.");
    if (S().assessments.some(a => a.name.toLowerCase() === name.toLowerCase() && ctx.OPEN_STATUSES.includes(a.status))) return showError("#dp-na-err", "An open assessment already has this name.");
    if (!due) return showError("#dp-na-err", "Choose a due date.");
    if (due < today()) return showError("#dp-na-err", "The due date cannot be in the past.");
    const t = S().templates.find(x => x.id === val("#dp-na-tpl"));
    const act = ctx.ropaActivities().find(x => x.id === val("#dp-na-act"));
    const who = val("#dp-na-who");
    const now = nowIso();
    const a = {
      id: nextAssessmentId(), name, desc: val("#dp-na-desc"), tpl: t.id, tplTitle: t.title, tplVersion: t.version, sections: clone(t.sections),
      activityId: act ? act.id : "", activityName: act ? act.name : "",
      who, reviewer: val("#dp-na-rev"), due, status: "Not started", answers: {}, risks: [], reviewNote: "",
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
    if (miss.length) {
      runtime.modal("Answer the required questions first", a.name, `
        <p>${miss.length} required question${miss.length > 1 ? "s are" : " is"} unanswered.</p>
        <ul class="dp-problems">${miss.slice(0, 12).map(m => `<li><span><span class="dp-qn">${m.num}</span> ${safe(m.q.t)}</span><button class="btn sm" data-act="dp-jump" data-arg="${m.si}|${safe(m.q.id)}">Answer</button></li>`).join("")}</ul>
        ${miss.length > 12 ? `<p class="dp-hint">And ${miss.length - 12} more.</p>` : ""}`, '<button class="btn" data-act="close">Close</button>');
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

  ACT["dp-approve"] = () => {
    const a = cur();
    if (!a || !allow(canReview(a))) return;
    const high = (a.risks || []).filter(r => r.status !== "Closed" && ["High", "Critical"].includes(residualLevel(r)));
    runtime.modal("Approve this assessment?", a.name, `
      ${high.length ? `<div class="dp-banner is-risk"><b>${high.length} high or critical residual risk${high.length > 1 ? "s" : ""}:</b> ${high.map(r => safe(r.title)).join("; ")}</div>
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
    runtime.modal("Delete this assessment?", a.name, `<p>Its answers, risks and tasks are removed. Entries already in the Proof Ledger stay.${a.activityId ? " The Data Map entry goes back to “Not started”." : ""}</p>`, foot("dp-confirm-delete", "Delete assessment", "d"));
  };
  ACT["dp-confirm-delete"] = () => {
    const a = cur();
    if (!a) return;
    S().assessments = S().assessments.filter(x => x.id !== a.id);
    S().tasks = S().tasks.filter(t => t.assessment !== a.id);
    syncRopa(a, true);
    runtime.ledgerAdd("DPIA deleted", `${a.id} · ${a.name}`);
    runtime.closeOv();
    ui.selected = null;
    persist("Assessment deleted");
    render();
  };

  /* ---------------- risks ---------------- */
  const scoreSel = (id, list, v) => `<select id="${id}" data-act="dp-rk-score">${list.map((x, i) => `<option value="${i + 1}" ${Number(v) === i + 1 ? "selected" : ""}>${i + 1} · ${x}</option>`).join("")}</select>`;
  function riskModal(a, k, fromQ) {
    const r = k === "" ? null : a.risks[Number(k)];
    const flagged = fromQ && a.sections.flatMap((s, si) => s.qs.map((q, qi) => ({ q, num: `${si + 1}.${qi + 1}` }))).find(x => x.q.id === fromQ);
    const d = r || { title: "", desc: flagged ? `Flagged by question ${flagged.num}: ${flagged.q.t}` : "", l: 2, i: 2, rl: 0, ri: 0, mitigation: "", owner: a.who, status: "Open" };
    runtime.modal(r ? "Edit risk" : "Record a risk", a.name, `
      <div class="dp-field"><label for="dp-rk-title">Risk *</label><input id="dp-rk-title" value="${safe(d.title)}" maxlength="120" placeholder="For example, Data kept longer than needed" autocomplete="off"></div>
      <div class="dp-field"><label for="dp-rk-desc">Effect on data principals</label><textarea id="dp-rk-desc" rows="2">${safe(d.desc)}</textarea></div>
      <fieldset class="dp-score"><legend>Before mitigation <span id="dp-rk-inh">${ctx.levelPill(riskLevel(d.l, d.i))}</span></legend>
        <div class="dp-form-2"><div class="dp-field"><label for="dp-rk-l">Likelihood</label>${scoreSel("dp-rk-l", LIKELIHOOD, d.l)}</div>
        <div class="dp-field"><label for="dp-rk-i">Impact</label>${scoreSel("dp-rk-i", IMPACT, d.i)}</div></div></fieldset>
      <div class="dp-field"><label for="dp-rk-mit">Mitigation</label><textarea id="dp-rk-mit" rows="2" placeholder="What reduces or removes the risk?">${safe(d.mitigation)}</textarea></div>
      <fieldset class="dp-score"><legend>After mitigation <span id="dp-rk-res">${ctx.levelPill(riskLevel(d.rl || d.l, d.ri || d.i))}</span></legend>
        <div class="dp-form-2"><div class="dp-field"><label for="dp-rk-rl">Likelihood</label>${scoreSel("dp-rk-rl", LIKELIHOOD, d.rl || d.l)}</div>
        <div class="dp-field"><label for="dp-rk-ri">Impact</label>${scoreSel("dp-rk-ri", IMPACT, d.ri || d.i)}</div></div></fieldset>
      <div class="dp-form-2">
        <div class="dp-field"><label for="dp-rk-owner">Owner</label><select id="dp-rk-owner">${opt(PEOPLE.map(p => p.name), d.owner)}</select></div>
        <div class="dp-field"><label for="dp-rk-status">Status</label><select id="dp-rk-status">${opt(RISK_STATUSES, d.status)}</select></div>
      </div>
      ${r ? "" : `<label class="dp-check"><input type="checkbox" id="dp-rk-task" checked> Create a task for the mitigation owner</label>`}
      <p class="dp-error" id="dp-rk-err" role="alert"></p>
    `, foot("dp-risk-save", r ? "Save risk" : "Add risk", "t", r ? String(k) : `new|${fromQ || ""}`));
    focus("#dp-rk-title");
  }
  ACT["dp-risk-add"] = fromQ => { const a = cur(); if (a && allow(canFill(a), "Risks can be changed only while the assessment is with the assignee")) riskModal(a, "", fromQ || ""); };
  ACT["dp-risk-edit"] = k => { const a = cur(); if (a && allow(canFill(a), "Risks can be changed only while the assessment is with the assignee")) riskModal(a, k); };
  ACT["dp-rk-score"] = () => {
    const n = id => Number(val(id));
    const inh = $("#dp-rk-inh"), res = $("#dp-rk-res");
    if (inh) inh.innerHTML = ctx.levelPill(riskLevel(n("#dp-rk-l"), n("#dp-rk-i")));
    if (res) res.innerHTML = ctx.levelPill(riskLevel(n("#dp-rk-rl"), n("#dp-rk-ri")));
  };
  ACT["dp-risk-save"] = arg => {
    const a = cur();
    if (!a || !canFill(a)) return;
    const title = val("#dp-rk-title");
    if (!title) return showError("#dp-rk-err", "Describe the risk in a few words.");
    const n = id => Number(val(id));
    const r = { title, desc: val("#dp-rk-desc"), l: n("#dp-rk-l"), i: n("#dp-rk-i"), rl: n("#dp-rk-rl"), ri: n("#dp-rk-ri"), mitigation: val("#dp-rk-mit"), owner: val("#dp-rk-owner"), status: val("#dp-rk-status") };
    if (r.rl * r.ri > r.l * r.i) return showError("#dp-rk-err", "The risk after mitigation cannot be higher than before it.");
    r.level = riskLevel(r.rl, r.ri);
    const [kind, fromQ] = String(arg).split("|");
    a.risks = a.risks || [];
    if (kind === "new") {
      r.id = "R" + uid();
      r.from = fromQ || "";
      a.risks.push(r);
      logActivity(a, `Recorded risk: ${title} (${residualLevel(r)} after mitigation).`);
      if ($("#dp-rk-task")?.checked && r.mitigation) {
        S().tasks.unshift({ id: "TK-" + uid(), title: r.mitigation.length > 90 ? r.mitigation.slice(0, 87) + "…" : r.mitigation, assessment: a.id, owner: r.owner, due: a.due, status: "Open", kind: "Mitigation" });
      }
    } else {
      Object.assign(a.risks[Number(kind)], r);
      logActivity(a, `Updated risk: ${title}.`);
    }
    if (a.status === "Not started") { a.status = "In progress"; syncRopa(a); }
    runtime.closeOv();
    persist(kind === "new" ? "Risk recorded" : "Risk updated");
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
    logActivity(a, `Deleted risk: ${r.title}.`);
    runtime.closeOv();
    persist("Risk deleted");
    render();
  };

  /* ---------------- risk register ---------------- */
  ACT["dp-r-level"] = l => { ui.rLevel = l; render(); };
  ACT["dp-r-status"] = s => { ui.rStatus = s; render(); };
  ACT["dp-r-search"] = q => { ui.rSearch = q; render(); };
  ACT["dp-risks-csv"] = () => {
    const cell = v => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const rows = R().risks.filtered();
    const lines = [["Risk", "Assessment", "Assessment status", "Inherent", "Residual", "Owner", "Status", "Mitigation"].map(cell).join(",")]
      .concat(rows.map(({ r, a }) => [r.title, a.name, a.status, riskLevel(r.l, r.i), residualLevel(r), r.owner, r.status, r.mitigation].map(cell).join(",")));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    link.download = `dpia-risk-register-${today()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast(`Exported ${rows.length} risks`);
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
  ACT["dp-t-clear"] = () => { ui.tSearch = ""; ui.tStatus = "all"; render(); };

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
    if (v !== "Yes/No") q.flag = false;
    render();
  };
  ACT["dp-t-qflag"] = (c, el) => { if (!editable()) return; qOf(el)[el.getAttribute("data-key")] = c === "true"; refreshHead(); };
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
