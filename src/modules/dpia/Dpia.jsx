import ModuleView from "../../components/ModuleView.jsx";
import {
  PEOPLE, DEMO_ACCOUNTS, ROLES, REGULATIONS, teamOf,
  loadDpiaState, saveDpiaState, resetDpiaState, loadCurrentUser, saveCurrentUser,
} from "./dpiaData.js";
import { DPIA_TABS, TAB_ACCESS, createDpiaUiState } from "./dpiaConfig.js";
import { STATUSES, OPEN_STATUSES, isOverdue, overallRag, evidenceExpired } from "./dpiaModel.js";
import { suggestFor } from "./dpiaPrefill.js";
import { createDashboardRenderer } from "./screens/DpiaDashboard.js";
import { createAssessmentsRenderer } from "./screens/DpiaAssessments.js";
import { createTemplatesRenderer } from "./screens/DpiaTemplates.js";
import { createRisksRenderer } from "./screens/DpiaRisks.js";
import { createTasksRenderer } from "./screens/DpiaTasks.js";
import { createGuideRenderer } from "./screens/DpiaGuide.js";
import { createEvidenceRenderer } from "./screens/DpiaEvidence.js";
import { createFrameworksRenderer } from "./screens/DpiaFrameworks.js";
import { registerDpiaActions as registerActions } from "./actions/dpiaActions.js";
import { getRopaData } from "../ropa/ropaData.js";
import { getDiscoveryData } from "../discovery/discoveryData.js";
import { loadConsentState } from "../consent/consentData.js";
import { loadRightsState } from "../rights/rightsData.js";
import sampleData from "../../data/sampleData.js";
import "./dpia.css";

const ui = createDpiaUiState();
let runtime;
let renderers;
let currentUser = loadCurrentUser();
let saveTimer = null;
let renderCount = 0;
const DAY = 864e5;

const state = () => loadDpiaState();
const safe = v => runtime.esc(String(v ?? ""));
const formatDate = d => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const formatDateTime = d => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const role = () => ROLES[currentUser.role] || ROLES.Auditor;
const canEdit = () => role().edit;
const dis = (ok = canEdit()) => (ok ? "" : 'disabled title="Your role cannot do this"');
const daysLeft = due => Math.ceil((new Date(due + "T23:59:59") - Date.now()) / DAY);

// Who may answer an assessment: the assignee, or the DPO, while it is with the assessor
const canFill = a => role().edit && (role().fillAny || a.who === currentUser.name) && ["Not started", "In progress", "Changes requested"].includes(a.status);
const canReview = a => role().review && a.status === "Under review";

const STATUS_TONE = { "Not started": "n", "In progress": "info", "Under review": "risk", "Changes requested": "act", Approved: "ok" };
const RAG_TONE = { GREEN: "ok", AMBER: "risk", RED: "block" };
const statusPill = s => runtime.pill(STATUS_TONE[s] || "n", s);
// RAG rating from the residual score; "—" when nothing is scored
const ragPill = rag => (rag ? `<span class="dp-rag is-${rag.toLowerCase()}">${rag}</span>` : '<span class="dp-dim">—</span>');

function dueBadge(a) {
  if (!OPEN_STATUSES.includes(a.status)) return '<span class="dp-due is-closed">—</span>';
  const d = daysLeft(a.due);
  if (d < 0) return `<span class="dp-due is-late">${-d} day${d === -1 ? "" : "s"} late</span>`;
  return `<span class="dp-due ${d <= 7 ? "is-soon" : ""}">${d === 0 ? "Due today" : `${d} day${d === 1 ? "" : "s"}`}</span>`;
}

// Saves now, or after typing pauses when `soon` is set
function persist(message, soon) {
  clearTimeout(saveTimer);
  if (soon) saveTimer = setTimeout(() => saveDpiaState(state()), 700);
  else saveDpiaState(state());
  if (message) runtime.toast(message);
}

function logActivity(a, text) {
  const at = new Date().toISOString();
  a.activity = a.activity || [];
  a.activity.push({ at, by: currentUser.name, text });
  a.updated = at;
}

// Processing activities and assets from the Data Map, for linking assessments, controls and risks
function ropaActivities() {
  try { return (getRopaData().act || []).map(x => ({ id: x.id, name: x.name, dpia: x.dpia, dpiaState: x.dpiaState, bu: x.bu, cat: x.cat || [], dpc: x.dpc || [], xb: x.xb, ai: x.ai, apps: x.apps || [] })); }
  catch (e) { return []; }
}
function ropaAssets() {
  try { return (getRopaData().ast || []).map(x => ({ id: x.id, name: x.name, acts: x.acts || [], stype: x.stype, loc: x.loc })); }
  catch (e) { return []; }
}
function ropaRecords(type) {
  try { return getRopaData()[type] || []; } catch (e) { return []; }
}

// Records other modules hold, for suggested answers. Each source is optional.
function sources() {
  const get = fn => { try { return fn(); } catch (e) { return {}; } };
  return { ropa: get(getRopaData), discovery: get(getDiscoveryData), consent: get(loadConsentState), rights: get(loadRightsState), sample: sampleData };
}
const suggestion = (q, a) => suggestFor(q, a, sources());
const evidenceById = id => (state().evidence || []).find(e => e.id === id);

function getContext() {
  return {
    get state() { return state(); },
    get currentUser() { return currentUser; },
    get renderers() { return renderers; },
    runtime, ui,
    PEOPLE, DEMO_ACCOUNTS, ROLES, REGULATIONS, STATUSES, OPEN_STATUSES, DPIA_TABS, TAB_ACCESS,
    teamOf, safe, formatDate, formatDateTime, role, canEdit, canFill, canReview, dis, daysLeft,
    statusPill, ragPill, dueBadge, isOverdue, overallRag, evidenceExpired,
    persist, logActivity, ropaActivities, ropaAssets, ropaRecords, sources, suggestion, evidenceById, sampleData,
    switchUser: u => { currentUser = u; saveCurrentUser(u); },
    resetState: () => resetDpiaState(),
  };
}

export function createDpiaView(moduleRuntime) {
  runtime = moduleRuntime;
  const ctx = getContext();
  renderers = {
    dashboard: createDashboardRenderer(ctx),
    assessments: createAssessmentsRenderer(ctx),
    templates: createTemplatesRenderer(ctx),
    risks: createRisksRenderer(ctx),
    tasks: createTasksRenderer(ctx),
    guide: createGuideRenderer(ctx),
    evidence: createEvidenceRenderer(ctx),
    frameworks: createFrameworksRenderer(ctx),
  };

  return function renderDpia() {
    const allowed = TAB_ACCESS[currentUser.role] || [];
    const tab = ui.tab || "dashboard";
    const label = (DPIA_TABS.find(([id]) => id === tab) || [])[1] || "DPIA";
    const expired = (state().evidence || []).filter(e => evidenceExpired(e)).length;
    const open = state().assessments.filter(a => OPEN_STATUSES.includes(a.status)).length;
    const review = state().assessments.filter(a => a.status === "Under review").length;

    const nav = `
      <nav class="dp-top-nav" aria-label="DPIA sections">
        ${DPIA_TABS.map(([id, l]) => {
          const ok = allowed.includes(id);
          const count = id === "assessments" ? open : id === "evidence" && expired ? expired : null;
          return `
            <button class="dp-top-nav-btn ${tab === id ? "active" : ""} ${ok ? "" : "restricted"}" data-act="dp-tab" data-arg="${id}"
              aria-current="${tab === id ? "page" : "false"}" title="${safe(l)}${ok ? "" : ` (restricted for ${safe(currentUser.role)})`}">
              ${safe(l)}${count != null ? `<span class="dp-nav-count">${count}</span>` : ""}${ok ? "" : '<span aria-hidden="true">🔒</span>'}
            </button>`;
        }).join("")}
      </nav>`;

    const a = tab === "assessments" && ui.selected ? state().assessments.find(x => x.id === ui.selected) : null;
    const t = tab === "templates" && ui.tplDraft ? ui.tplDraft : null;
    const tail = a ? ` <span>/</span> <b>${safe(a.name)}</b>` : t ? ` <span>/</span> <b>${safe(t.title || "Untitled template")}</b>` : "";
    const initials = currentUser.name.split(" ").map(w => w[0]).join("");

    const meta = `
      <div class="dp-meta-bar">
        <div class="dp-crumb"><span>DPIA</span><span>/</span><b>${safe(label)}</b>${tail}</div>
        <div class="dp-meta-actions">
          ${review && role().review ? `<button class="dp-review-chip" data-act="dp-goto-review">${review} waiting for your review</button>` : ""}
          <div class="dp-user-wrap">
            <button class="dp-user-badge" data-act="dp-user-menu" aria-haspopup="menu" aria-expanded="${ui.userMenuOpen}" title="Switch demo account">
              <span class="dp-user-avatar">${safe(initials)}</span><span class="dp-user-name">${safe(currentUser.name)}</span>
              <span class="dp-role-tag">${safe(currentUser.role)}</span><span aria-hidden="true">▾</span>
            </button>
            ${ui.userMenuOpen ? `
              <div class="dp-user-menu" role="menu">
                <div class="dp-user-menu-h">Switch demo account</div>
                ${DEMO_ACCOUNTS.map(x => `
                  <button class="dp-user-item ${x.id === currentUser.id ? "active" : ""}" data-act="dp-switch-user" data-arg="${x.id}" role="menuitem">
                    <b>${safe(x.name)}</b><small>${safe(x.role)} · ${safe(ROLES[x.role].about)}</small>
                  </button>`).join("")}
              </div>` : ""}
          </div>
          <button class="btn sm" data-act="dp-reset" ${dis(role().build)}>Reset demo data</button>
        </div>
      </div>`;

    const banner = canEdit() ? "" : `<div class="dp-banner is-warn" role="status"><b>Read-only.</b> Your role (${safe(currentUser.role)}) can view assessments and risks but cannot change them.</div>`;

    let body;
    if (!allowed.includes(tab)) {
      body = `<div class="card dp-empty-card"><h3>Access restricted</h3><p>Your role (${safe(currentUser.role)}) cannot open ${safe(label)}.</p>
        <button class="btn sm t" data-act="dp-tab" data-arg="dashboard">Back to Dashboard</button></div>`;
    } else {
      body = renderers[tab].render();
    }

    return `
      <div class="page dp-module">
        ${runtime.head("Prove", "DPIA", "Data protection impact assessments: screening, the integrated DPDPA + ISO checklist, 5×5 risk scoring, evidence, framework coverage, review and sign-off, linked to your Data Map.")}
        ${nav}${meta}${banner}
        <div class="dp-body">${body}</div>
        <span hidden data-dp-render="${++renderCount}"></span>
      </div>`;
  };
}

export function registerDpiaActions(moduleRuntime, ACT, AFTER) {
  runtime = moduleRuntime;
  registerActions(getContext(), ACT, AFTER);
}

export default function Dpia({ html }) {
  return <ModuleView html={html} />;
}
