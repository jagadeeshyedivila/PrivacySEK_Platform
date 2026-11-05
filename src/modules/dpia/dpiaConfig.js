// Static configuration and UI state for the DPIA module.

export const DPIA_TABS = [
  ["dashboard", "Dashboard"],
  ["assessments", "Assessments"],
  ["templates", "Templates"],
  ["risks", "Risk register"],
  ["tasks", "Tasks"],
  ["guide", "Guide"],
];

// Tabs each role can open
export const TAB_ACCESS = {
  DPO: DPIA_TABS.map(t => t[0]),
  Assessor: ["dashboard", "assessments", "templates", "risks", "tasks", "guide"],
  Auditor: ["dashboard", "assessments", "risks", "tasks", "guide"],
};

export function createDpiaUiState() {
  return {
    tab: "dashboard",
    userMenuOpen: false,

    // Assessments
    aSearch: "", aStatus: "", aMine: false,
    selected: null,       // assessment id open in the workspace
    step: 0,              // section index, "risks" or "summary"

    // Templates
    tSearch: "", tStatus: "all",
    tplDraft: null,       // copy of the template being edited; saved only on Save or Publish
    tplSaved: null,       // JSON of the template when editing began, to tell whether it changed
    tplMode: "edit",      // "edit" or "preview"
    openSec: 0,
    previewAnswers: {},
    previewStep: 0,

    // Risk register
    rLevel: "", rStatus: "open", rSearch: "",

    // Tasks
    kFilter: "open", kSearch: "",
  };
}
