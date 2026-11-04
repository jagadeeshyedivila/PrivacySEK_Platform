import ModuleView from "../../components/ModuleView.jsx";
import {
  COMPANY,
  REQUEST_TYPES,
  SUBJECT_TYPES,
  CHANNELS,
  LANGUAGES,
  PROPERTIES,
  REGULATIONS,
  SYSTEMS,
  MACROS,
  DEMO_ACCOUNTS,
  ROLES,
  typeRef,
  loadRightsState,
  saveRightsState,
  resetRightsState,
  loadCurrentUser,
  saveCurrentUser,
} from "./rightsData.js";
import {
  RIGHTS_TOP_TABS,
  STAGES,
  CLOSED,
  DATE_RANGES,
  FORM_TABS,
  FORM_SECTIONS,
  DETAIL_TABS,
  FIELD_TYPES,
  createRightsUiState,
} from "./rightsConfig.js";
import { createDashboardRenderer } from "./screens/RightsDashboard.js";
import { createRequestsRenderer } from "./screens/RightsRequestList.js";
import { createRequestDetailRenderer } from "./screens/RightsRequestDetail.js";
import { createFormsRenderer } from "./screens/RightsForms.js";
import { createWorkflowsRenderer } from "./screens/RightsWorkflows.js";
import { createTemplatesRenderer } from "./screens/RightsTemplates.js";
import { createTasksRenderer } from "./screens/RightsTasks.js";
import { registerRightsActions as registerActions } from "./actions/rightsActions.js";
import "./rights.css";

const ui = createRightsUiState();
let runtime;
let renderers;
let currentUser = loadCurrentUser();
let saveTimer = null;

const DAY = 864e5;
const state = () => loadRightsState();
const safe = value => runtime.esc(String(value ?? ""));
const formatDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatDateTime = d => d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const isClosed = r => CLOSED.includes(r.status);
const dueIn = r => Math.ceil((new Date(r.deadline) - Date.now()) / DAY);
const canEdit = () => Boolean(ROLES[currentUser.role]?.edit);
// Attribute that disables a control for read-only roles
const dis = () => (canEdit() ? "" : 'disabled title="Read-only: your role cannot change data"');
const inRange = r => Date.now() - new Date(r.created) <= ui.range * DAY;

function statusPill(status) {
  const tone = { New: "n", "Verifying Identity": "risk", "In Progress": "info", Complete: "ok", Rejected: "act" }[status] || "n";
  return runtime.pill(tone, status);
}

function dueBadge(r) {
  if (isClosed(r)) return '<span class="rr-due is-closed">—</span>';
  const d = dueIn(r);
  if (d < 0) return `<span class="rr-due is-late">${-d} days late</span>`;
  return `<span class="rr-due ${d <= 7 ? "is-soon" : ""}">${d} days</span>`;
}

// Saves immediately, or after typing pauses when `soon` is set (form editor fields)
function persist(message, soon) {
  clearTimeout(saveTimer);
  if (soon) {
    saveTimer = setTimeout(() => saveRightsState(state()), 600);
  } else {
    saveRightsState(state());
  }
  if (message) runtime.toast(message);
}

function logActivity(request, text) {
  const at = new Date().toISOString();
  request.activity = request.activity || [];
  request.activity.push({ at, by: currentUser.name, text });
  request.updated = at;
}

// Removes every tag and attribute except simple formatting from rich text
function sanitizeRich(html) {
  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "UL", "OL", "LI"]);
  const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 1) {
        if (!allowed.has(child.tagName)) {
          child.replaceWith(...child.childNodes);
          walk(node);
          return;
        }
        [...child.attributes].forEach(a => child.removeAttribute(a.name));
        walk(child);
      } else if (child.nodeType !== 3) {
        child.remove();
      }
    });
  };
  const root = doc.body.firstChild;
  walk(root);
  return root.innerHTML;
}

function getContext() {
  return {
    get state() { return state(); },
    get currentUser() { return currentUser; },
    runtime,
    ui,
    COMPANY, REQUEST_TYPES, SUBJECT_TYPES, CHANNELS, LANGUAGES, PROPERTIES, REGULATIONS, SYSTEMS, MACROS,
    DEMO_ACCOUNTS, ROLES, STAGES, CLOSED, DATE_RANGES, FORM_TABS, FORM_SECTIONS, DETAIL_TABS, FIELD_TYPES,
    typeRef, safe, formatDate, formatDateTime, isClosed, dueIn, canEdit, dis, inRange, statusPill, dueBadge,
    persist, logActivity, sanitizeRich,
    switchUser: user => {
      currentUser = user;
      saveCurrentUser(user);
    },
    resetState: () => resetRightsState(),
    get renderers() { return renderers; },
  };
}

export function createRightsRequestsView(moduleRuntime) {
  runtime = moduleRuntime;
  const context = getContext();
  renderers = {
    dashboard: createDashboardRenderer(context),
    requests: createRequestsRenderer(context),
    detail: createRequestDetailRenderer(context),
    forms: createFormsRenderer(context),
    workflows: createWorkflowsRenderer(context),
    templates: createTemplatesRenderer(context),
    tasks: createTasksRenderer(context),
  };

  return function renderRightsRequests() {
    const activeTab = ui.topTab || "dashboard";
    const allowed = ROLES[currentUser.role]?.tabs || [];
    const isAllowed = allowed.includes(activeTab);
    const tabLabel = (RIGHTS_TOP_TABS.find(([id]) => id === activeTab) || [])[1] || "Rights Requests";
    const openCount = state().requests.filter(r => !isClosed(r)).length;

    const nav = `
      <nav class="rr-top-nav" aria-label="Rights Requests sections">
        ${RIGHTS_TOP_TABS.map(([id, label]) => {
          const permitted = allowed.includes(id);
          return `
            <button class="rr-top-nav-btn ${activeTab === id ? "active" : ""} ${permitted ? "" : "restricted"}"
              data-act="rr-tab" data-arg="${id}" aria-current="${activeTab === id ? "page" : "false"}"
              title="${safe(label)}${permitted ? "" : ` (restricted for ${safe(currentUser.role)})`}">
              ${safe(label)}
              ${id === "requests" ? `<span class="rr-nav-count">${openCount}</span>` : ""}
              ${permitted ? "" : '<span class="rr-lock" aria-hidden="true">🔒</span>'}
            </button>
          `;
        }).join("")}
      </nav>
    `;

    const initials = currentUser.name.split(" ").map(w => w[0]).join("");
    const crumbTail = activeTab === "requests" && ui.selectedRequestId ? ` <span>/</span> <b>${safe(ui.selectedRequestId)}</b>`
      : activeTab === "forms" && ui.selectedFormId ? ` <span>/</span> <b>${safe((state().forms.find(f => f.id === ui.selectedFormId) || {}).name || "Form")}</b>`
      : "";

    const meta = `
      <div class="rr-meta-bar">
        <div class="rr-crumb"><span>Rights Requests</span><span>/</span><b>${safe(tabLabel)}</b>${crumbTail}</div>
        <div class="rr-meta-actions">
          <div class="rr-user-wrap">
            <button class="rr-user-badge" data-act="rr-toggle-user-menu" aria-haspopup="menu" aria-expanded="${ui.userMenuOpen}" title="Switch demo account">
              <span class="rr-user-avatar">${safe(initials)}</span>
              <span class="rr-user-name">${safe(currentUser.name)}</span>
              <span class="rr-role-tag">${safe(currentUser.role)}</span>
              <span class="rr-caret" aria-hidden="true">▾</span>
            </button>
            ${ui.userMenuOpen ? `
              <div class="rr-user-menu" role="menu">
                <div class="rr-user-menu-h">Switch demo account</div>
                ${DEMO_ACCOUNTS.map(a => `
                  <button class="rr-user-item ${a.id === currentUser.id ? "active" : ""}" data-act="rr-switch-user" data-arg="${safe(a.id)}" role="menuitem">
                    <b>${safe(a.name)}</b>
                    <small>${safe(a.role)} · ${ROLES[a.role].edit ? "Can create and change records" : "Read-only"}</small>
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
          <button class="btn sm" data-act="rr-reset" ${dis()}>Reset demo data</button>
        </div>
      </div>
    `;

    const readOnly = canEdit() ? "" : `
      <div class="rr-banner is-warn" role="status">
        <b>Read-only.</b> Your role (${safe(currentUser.role)}) can view requests but cannot change them.
      </div>
    `;

    let body;
    if (!isAllowed) {
      body = `
        <div class="card rr-restricted">
          <h3>Access restricted</h3>
          <p>Your role (${safe(currentUser.role)}) cannot open ${safe(tabLabel)}.</p>
          <button class="btn sm t" data-act="rr-tab" data-arg="dashboard">Back to Dashboard</button>
        </div>
      `;
    } else if (activeTab === "requests" && ui.selectedRequestId) {
      body = renderers.detail.render();
    } else {
      body = renderers[activeTab] ? renderers[activeTab].render() : '<div class="card rr-restricted">Section not found.</div>';
    }

    return `
      <div class="page rr-module">
        ${runtime.head("Prove", "Rights Requests", "Access, correction, erasure, nomination and grievance requests with statutory clocks, workflows and evidence in the Proof Ledger.")}
        ${nav}
        ${meta}
        ${readOnly}
        <div class="rr-body">${body}</div>
      </div>
    `;
  };
}

export function registerRightsRequestsActions(moduleRuntime, ACT) {
  runtime = moduleRuntime;
  registerActions(getContext(), ACT);
}

export default function RightsRequests({ html }) {
  return <ModuleView html={html} />;
}
