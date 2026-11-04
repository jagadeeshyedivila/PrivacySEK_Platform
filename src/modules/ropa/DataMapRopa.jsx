import ModuleView from "../../components/ModuleView.jsx";
import { RECORD_TYPES, ROLES, FALLBACK_SYSTEMS, buildTabs, createDefaultRopaUiState, roleFromOrg } from "./ropaConfig.js";
import { getRopaData, saveRopaData, resetRopaData } from "./ropaData.js";
import { getDiscoveryData } from "../discovery/discoveryData.js";
import { lawShort, dpiaLabel } from "./shared/format.js";
import { renderWizard } from "./shared/RopaWizard.js";
import { drawFlows } from "./shared/dataFlow.js";
import "./ropa.css";

import { createDashboardRenderer } from "./dashboard/RopaDashboard.jsx";
import { createActivitiesRenderer } from "./activities/RopaActivities.jsx";
import { createAssetsRenderer } from "./assets/RopaAssets.jsx";
import { createPartiesRenderer } from "./parties/RopaParties.jsx";
import { createPoliciesRenderer } from "./policies/RopaPolicies.jsx";
import { createDocumentationRenderer } from "./documentation/RopaDocumentation.jsx";
import { createCustomFieldsRenderer } from "./customFields/RopaCustomFields.jsx";

import { registerDashboardActions } from "./actions/dashboardActions.js";
import { registerRecordActions } from "./actions/recordActions.js";
import { registerWizardActions } from "./actions/wizardActions.js";
import { registerCustomFieldActions } from "./actions/customFieldActions.js";

// Single shared UI state instance across renders
const ropaUiState = createDefaultRopaUiState();

function discoveryStore() {
  try { return getDiscoveryData(); } catch (err) { return null; }
}

function buildRopaContext(runtime) {
  const context = {
    ...runtime,
    ui: ropaUiState,
    getStore: getRopaData,
    saveStore: saveRopaData,
    resetStore: resetRopaData
  };
  if (!ropaUiState.role) ropaUiState.role = roleFromOrg(runtime.D);
  // Inputs for the rule engine: the store plus data from Discovery, Vendor Risk and Consent
  context.rulesCtx = function(type, id) {
    const store = getRopaData();
    const disc = discoveryStore();
    const names = ((disc && disc.connections) || []).map(c => c.name);
    return {
      store, type, id,
      systems: names.length ? names : FALLBACK_SYSTEMS,
      sdf: !store.settings || store.settings.sdf !== false,
      vendorRisk: runtime.D.vendors || [],
      consentProfiles: runtime.D.consentProfiles || [],
      discovery: disc
    };
  };
  return context;
}

export function createDataMapRopaView(runtime) {
  const context = buildRopaContext(runtime);
  const { btn, curTab, head, tabs } = runtime;
  const ui = context.ui;

  const renderers = {
    dash: createDashboardRenderer(context),
    act: createActivitiesRenderer(context),
    ast: createAssetsRenderer(context),
    par: createPartiesRenderer(context),
    pol: createPoliciesRenderer(context),
    doc: createDocumentationRenderer(context),
    cf: createCustomFieldsRenderer(context)
  };

  return function renderDataMapRopa() {
    const store = getRopaData();
    const t = curTab("ropa", "dash");

    const headerActs =
      '<label class="rp-viewas"><span>View as</span><select class="table-filter-select" data-act="rp-role" aria-label="View as">' +
        ROLES.map(r => '<option' + (r === ui.role ? " selected" : "") + '>' + r + '</option>').join("") + '</select></label>' +
      btn("Reset demo data", "rp-reset-demo-data", null, "o") +
      btn("Export register", "rp-export", null, "p");

    const h = head(
      "Find",
      "Data Map &amp; ROPA",
      "Records of processing for Aarohan Finance, kept in step with Data Discovery. Industry pack: NBFC &amp; lending.",
      headerActs
    ) + tabs("ropa", buildTabs(store));

    let body;
    if (ui.wiz && RECORD_TYPES[ui.wiz.type].tab === t) body = renderWizard(context);
    else body = (renderers[t] || renderers.dash)();

    return '<div class="rp-container">' + h + body + '</div>';
  };
}

function csvCell(v) {
  const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function registerDataMapRopaActions(runtime, ACT, AFTER) {
  const context = buildRopaContext(runtime);
  const { closeOv, ledgerAdd, modal, render, toast } = runtime;
  const ui = context.ui;

  ACT["rp-role"] = function(role) {
    ui.role = ROLES.indexOf(role) > -1 ? role : "Viewer";
    render();
    toast("Viewing as " + ui.role + (ui.role === "Viewer" ? " (read-only)" : ui.role === "DPO" ? " (can't delete records)" : " (full access)"));
  };

  ACT["rp-reset-demo-data"] = function() {
    modal(
      "Restore Demo Data?",
      "Reset the Aarohan Finance register",
      `
        <p style="color:var(--text);font-size:13.5px;line-height:1.5">
          This restores the initial Aarohan Finance sample data for Data Map &amp; ROPA.
          Any activities, assets, third parties, policies, documents or custom fields you added or changed will be reset.
        </p>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm" style="background:var(--block);color:#fff" data-act="rp-confirm-reset-demo-data">
          Confirm Reset
        </button>
      `
    );
  };

  ACT["rp-confirm-reset-demo-data"] = function() {
    closeOv();
    resetRopaData().then(() => {
      ui.wiz = null;
      ui.lists = {};
      toast("ROPA demo data restored to initial state");
      render();
    }, err => toast("Couldn't reset ROPA data: " + err.message));
  };

  ACT["rp-export"] = function() {
    const acts = getRopaData().act || [];
    const cols = [["ID", "id"], ["Activity", "name"], ["Entity", "entity"], ["Business unit", "bu"], ["Role", "role"], ["Purposes", "purp"], ["Lawful basis", "law"],
      ["Data principals", "dpc"], ["Data categories", "cat"], ["Systems", "apps"], ["Recipients", "erec"], ["Cross-border", "xb"], ["Countries", "xc"], ["Safeguards", "xs"],
      ["Retention", "ret"], ["Security measures", "sec"]];
    const lines = [cols.map(c => c[0]).concat(["DPIA"]).join(",")].concat(acts.map(a =>
      cols.map(c => csvCell(c[1] === "law" ? lawShort(a.law) : a[c[1]])).concat([csvCell(dpiaLabel(a))]).join(",")));
    try {
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "aarohan_ropa_register.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.warn("CSV export failed:", err.message);
    }
    ledgerAdd("ROPA register exported", acts.length + " activities");
    toast("Register exported (CSV) for the regulator");
  };

  // Move focus to a field after Next/Save/jump, once React has painted
  AFTER.ropa = function() {
    setTimeout(drawFlows, 30); // data flow edges need the nodes' painted positions
    const w = ui.wiz;
    if (!w || !w.focus) return;
    const k = w.focus;
    w.focus = null;
    setTimeout(function() {
      const el = document.getElementById("rp-f-" + k);
      if (!el) return;
      const target = el.tagName === "DIV" ? (el.querySelector("button:not([disabled])") || el) : el;
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      if (el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
  };

  registerRecordActions(context, ACT);
  registerWizardActions(context, ACT);
  registerDashboardActions(context, ACT);
  registerCustomFieldActions(context, ACT);
}

export default function DataMapRopa({ html }) {
  return <ModuleView html={html} />;
}
