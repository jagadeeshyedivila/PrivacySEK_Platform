import ModuleView from "../../components/ModuleView.jsx";
import {
  loadConsentState,
  saveConsentState,
  resetConsentState,
  loadCurrentUser,
  saveCurrentUser,
  DEMO_ACCOUNTS,
  ROLES,
  DEFAULT_RIGHTS,
  REGION_TREE,
  LEGAL_BASIS_OPTIONS,
  PURPOSE_CATEGORIES,
  DATA_ATTRIBUTES,
  CHANNELS,
} from "./consentData.js";
import {
  CONSENT_TOP_TABS,
  BUILDER_STEPS,
  BUILDER_STEP_ICONS,
  BUILDER_SUBS,
  DATE_RANGES,
  createConsentUiState,
} from "./consentConfig.js";

import { createDashboardRenderer } from "./screens/dashboard/ConsentDashboard.jsx";
import { createRecordsRenderer } from "./screens/records/ConsentRecords.jsx";
import { createBuilderRenderer } from "./screens/builder/ConsentBuilder.jsx";
import { createJurisdictionsRenderer } from "./screens/jurisdictions/ConsentJurisdictions.jsx";
import { createWorkflowsRenderer } from "./screens/workflows/ConsentWorkflows.jsx";
import { createEmailsRenderer } from "./screens/emails/ConsentEmails.jsx";
import { createImplementationRenderer } from "./screens/implementation/ConsentImplementation.jsx";
import { registerConsentActions as registerActions } from "./actions/consentActions.js";
import "./consent.css";

let state;
let runtime;
let ui = createConsentUiState();
let currentUser = loadCurrentUser();
let renderers;

const safe = value => runtime.esc(String(value ?? ""));
const formatDate = d => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const formatDateTime = d => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const canEdit = () => Boolean(ROLES[currentUser?.role]?.edit ?? true);

function getConsentContext() {
  return {
    state,
    runtime,
    ui,
    loadConsentState,
    saveConsentState,
    resetConsentState,
    loadCurrentUser,
    saveCurrentUser,
    DEMO_ACCOUNTS,
    ROLES,
    DEFAULT_RIGHTS,
    REGION_TREE,
    LEGAL_BASIS_OPTIONS,
    PURPOSE_CATEGORIES,
    DATA_ATTRIBUTES,
    CHANNELS,
    CONSENT_TOP_TABS,
    BUILDER_STEPS,
    BUILDER_STEP_ICONS,
    BUILDER_SUBS,
    DATE_RANGES,
    safe,
    formatDate,
    formatDateTime,
    canEdit,
    currentUser,
    switchUser: user => {
      currentUser = user;
      saveCurrentUser(user);
    },
    // Refills the same state object, so references held by actions stay valid
    resetState: () => resetConsentState(),
    renderers,
  };
}

export function createConsentView(moduleRuntime) {
  runtime = moduleRuntime;
  if (!state) {
    state = loadConsentState();
  }
  if (!currentUser) {
    currentUser = loadCurrentUser();
  }

  const context = getConsentContext();
  renderers = {
    dashboard: createDashboardRenderer(context),
    records: createRecordsRenderer(context),
    builder: createBuilderRenderer(context),
    jurisdictions: createJurisdictionsRenderer(context),
    workflows: createWorkflowsRenderer(context),
    emails: createEmailsRenderer(context),
    implementation: createImplementationRenderer(context),
  };
  context.renderers = renderers;

  return function renderConsent() {
    const activeTab = ui.topTab || "dashboard";
    const allowedModules = ROLES[currentUser.role]?.modules || [];
    const isAllowed = allowedModules.includes(activeTab);
    const tabObj = CONSENT_TOP_TABS.find(([id]) => id === activeTab);
    const tabTitle = tabObj ? tabObj[1] : "Consent Module";

    const topNavigationHtml = `
      <nav class="cp-top-nav" aria-label="Consent Module Submodules">
        ${CONSENT_TOP_TABS.map(([id, label]) => {
          const isTabActive = activeTab === id;
          const isPermitted = allowedModules.includes(id);
          return `
            <button
              class="cp-top-nav-btn ${isTabActive ? "active" : ""} ${isPermitted ? "" : "restricted"}"
              data-act="cp-tab"
              data-arg="${id}"
              title="${safe(label)}${isPermitted ? "" : " (Restricted for " + currentUser.role + ")"}"
            >
              ${safe(label)}
              ${isPermitted ? "" : '<span style="font-size:11px;opacity:0.6">🔒</span>'}
            </button>
          `;
        }).join("")}
      </nav>
    `;

    const userInitials = (currentUser.name || "Asha Verma")
      .split(" ")
      .map(w => w[0])
      .join("");

    const metaBarHtml = `
      <div class="cp-meta-bar">
        <div class="cp-crumb">
          <span>Privacy</span>
          <span>/</span>
          <span>Consent Preference</span>
          <span>/</span>
          <b>${safe(tabTitle)}</b>
          ${ui.selectedRecordId ? `<span>/</span> <b>${safe(ui.selectedRecordId)}</b>` : ""}
        </div>

        <div class="cp-meta-actions">
          <!-- Role & Account Switcher Dropdown -->
          <div style="position:relative">
            <button
              class="cp-user-badge"
              data-act="cp-toggle-user-menu"
              title="Click to switch simulated demo account"
            >
              <span class="cp-user-avatar">${safe(userInitials)}</span>
              <span style="font-weight:600;color:var(--text)">${safe(currentUser.name)}</span>
              <span class="cp-role-tag">${safe(currentUser.role)}</span>
              <span style="font-size:10px;opacity:0.6">▼</span>
            </button>

            ${ui.userMenuOpen ? `
              <div class="cp-user-dropdown" role="menu">
                <div style="padding:4px 8px;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em">
                  Switch Demo Account
                </div>
                ${DEMO_ACCOUNTS.map(a => `
                  <button
                    class="cp-user-dropdown-item ${a.id === currentUser.id ? "active" : ""}"
                    data-act="cp-switch-user"
                    data-arg="${safe(a.id)}"
                    role="menuitem"
                  >
                    <b>${safe(a.name)}</b>
                    <small>${safe(a.role)} · ${ROLES[a.role].edit ? "Can edit" : "Read-only"}</small>
                  </button>
                `).join("")}
                <hr style="border:0;border-top:1px solid var(--line);margin:4px 0" />
                <button
                  class="cp-user-dropdown-item"
                  data-act="cp-reset-demo-data"
                  style="color:#ef4444"
                  role="menuitem"
                >
                  <b style="color:#ef4444">↺ Reset demo data</b>
                  <small>Restore initial dummy records</small>
                </button>
              </div>
            ` : ""}
          </div>

          <button class="btn sm o" data-act="cp-reset-demo-data" title="Restore fresh sample dataset">
            Reset Data
          </button>
        </div>
      </div>
    `;

    const readOnlyBannerHtml = !canEdit() ? `
      <div class="cp-alert-banner warning">
        <span>👁</span>
        <span>
          <b>Read-only mode:</b> Your current role (<b>${safe(currentUser.role)}</b>) has view-only access. Modification actions are disabled.
        </span>
      </div>
    ` : "";

    let bodyHtml = "";
    if (!isAllowed) {
      bodyHtml = `
        <div class="card" style="text-align:center;padding:50px 20px;margin-top:10px">
          <div style="font-size:38px;margin-bottom:12px">🔒</div>
          <h3 style="margin:0 0 8px;font-size:18px;color:var(--text)">Access Restricted</h3>
          <p style="color:var(--text-2);font-size:13.5px;max-width:440px;margin:0 auto 20px">
            Your assigned role (<b>${safe(currentUser.role)}</b>) does not have access permissions for the <b>${safe(tabTitle)}</b> submodule.
          </p>
          <button class="btn sm p" data-act="cp-tab" data-arg="dashboard">
            Back to Dashboard
          </button>
        </div>
      `;
    } else {
      const renderer = renderers[activeTab];
      bodyHtml = renderer ? renderer() : `<div class="card empty">Submodule not found.</div>`;
    }

    return `
      <div class="cp-module">
        ${topNavigationHtml}
        ${metaBarHtml}
        ${readOnlyBannerHtml}
        <div class="cp-body-wrap" style="margin-top:4px">
          ${bodyHtml}
        </div>
      </div>
    `;
  };
}

export function registerConsentActions(moduleRuntime, ACT, AFTER) {
  runtime = moduleRuntime;
  const context = getConsentContext();
  context.renderers = renderers;
  registerActions(context, ACT);
}

export default function Consent({ html }) {
  return <ModuleView html={html} />;
}
