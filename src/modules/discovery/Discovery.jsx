import ModuleView from "../../components/ModuleView.jsx";
import { DISCOVERY_TABS, createDefaultDiscoveryUiState } from "./discoveryConfig.js";
import { getDiscoveryData, saveDiscoveryData, resetDiscoveryData } from "./discoveryData.js";
import "./discovery.css";

import { createOverviewRenderer } from "./overview/DiscoveryOverview.jsx";
import { createAssetsRenderer } from "./assets/DiscoveryAssets.jsx";
import { createDetectionsRenderer } from "./detections/DiscoveryDetections.jsx";
import { createClassificationRenderer } from "./classification/DiscoveryClassification.jsx";
import { createConnectionsRenderer } from "./connections/DiscoveryConnections.jsx";
import { createJobsRenderer } from "./jobs/DiscoveryJobs.jsx";
import { createProfilersRenderer } from "./profilers/DiscoveryProfilers.jsx";
import { createPostureRenderer } from "./posture/DiscoveryPosture.jsx";

import { registerOverviewActions } from "./actions/overviewActions.js";
import { registerAssetActions } from "./actions/assetActions.js";
import { registerConnectionActions } from "./actions/connectionActions.js";
import { registerJobActions } from "./actions/jobActions.js";
import { registerProfilerActions } from "./actions/profilerActions.js";
import { registerPostureActions } from "./actions/postureActions.js";
import { registerScanActions } from "./actions/scanActions.js";

// Single shared UI state instance across renders
const discoveryUiState = createDefaultDiscoveryUiState();

function buildDiscoveryContext(runtime) {
  return {
    ...runtime,
    ui: discoveryUiState,
    getStore: getDiscoveryData,
    saveStore: saveDiscoveryData,
    resetStore: resetDiscoveryData
  };
}

export function createDiscoveryView(runtime) {
  const context = buildDiscoveryContext(runtime);
  const { btn, curTab, head, tabs } = runtime;

  const renderOverview = createOverviewRenderer(context);
  const renderAssets = createAssetsRenderer(context);
  const renderDetections = createDetectionsRenderer(context);
  const renderClassification = createClassificationRenderer(context);
  const renderConnections = createConnectionsRenderer(context);
  const renderJobs = createJobsRenderer(context);
  const renderProfilers = createProfilersRenderer(context);
  const renderPosture = createPostureRenderer(context);

  return function renderDiscovery() {
    const store = getDiscoveryData();
    const connectionsCount = (store.connections || []).length;
    const openFindingsCount = (store.findings || []).filter(f => !f.done).length;

    const t = curTab("discovery", "overview");

    const headerActs =
      btn("Reset data", "dd-reset-demo-data", null, "o") +
      btn("Add connection", "dd-open-catalog", null, "", "plus") +
      btn("Run scan", "dd-run-scan", null, "p", "play");

    const tabsList = [
      ["overview", "Overview"],
      ["detections", `Detections · ${(store.overviewFindings || []).length.toLocaleString()}`],
      ["classification", "Classification"],
      ["assets", "Assets"],
      ["posture", `Risk & posture · ${openFindingsCount}`],
      ["connections", `Connections · ${connectionsCount}`],
      ["jobs", "Jobs"],
      ["profilers", "Profilers"]
    ];

    const h = head(
      "Find",
      "Data Discovery",
      `Metadata-first discovery across ${connectionsCount} sources. Raw values are evaluated in place and not copied into PrivacySEK.`,
      headerActs
    ) + tabs("discovery", tabsList);

    let tabBody = "";
    if (t === "overview") tabBody = renderOverview();
    else if (t === "detections") tabBody = renderDetections();
    else if (t === "classification") tabBody = renderClassification();
    else if (t === "assets") tabBody = renderAssets();
    else if (t === "connections") tabBody = renderConnections();
    else if (t === "jobs") tabBody = renderJobs();
    else if (t === "profilers") tabBody = renderProfilers();
    else if (t === "posture") tabBody = renderPosture();
    else tabBody = renderOverview();

    return `<div class="dd-container">${h}${tabBody}</div>`;
  };
}

export function registerDiscoveryActions(runtime, ACT, AFTER) {
  const context = buildDiscoveryContext(runtime);
  const { closeOv, modal, render, toast } = runtime;

  // Global "Reset demo data" action
  ACT["dd-reset-demo-data"] = function() {
    modal(
      "Reset Discovery data?",
      "Restore connections, jobs, profilers and findings to their defaults",
      `
        <p style="color:var(--text);font-size:13.5px;line-height:1.5">
          Data Discovery returns to its default state for Aarohan Finance.
          Connections, scan jobs, profilers and task status changes you made will be removed.
        </p>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm" style="background:var(--block);color:#fff" data-act="dd-confirm-reset-demo-data">
          Confirm Reset
        </button>
      `
    );
  };

  ACT["dd-confirm-reset-demo-data"] = function() {
    closeOv();
    resetDiscoveryData().then(() => {
      toast("Discovery data restored to defaults");
      render();
    }, err => toast("Couldn't reset Discovery data: " + err.message));
  };

  // Register per-tab delegated actions
  registerOverviewActions(context, ACT);
  registerAssetActions(context, ACT);
  registerConnectionActions(context, ACT);
  registerJobActions(context, ACT);
  registerProfilerActions(context, ACT);
  registerPostureActions(context, ACT);
  registerScanActions(context, ACT);
}

export default function Discovery({ html }) {
  return <ModuleView html={html} />;
}
