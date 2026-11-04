// Static configuration for the Rights Requests (DSAR) module: tabs, stages, ranges and UI state.

export const RIGHTS_TOP_TABS = [
  ["dashboard", "Dashboard"],
  ["requests", "Requests"],
  ["forms", "Web Forms"],
  ["workflows", "Workflows"],
  ["templates", "Email Templates"],
  ["tasks", "Tasks"],
];

// Processing phases a request moves through, one step at a time. "Rejected" is terminal.
export const STAGES = ["New", "Verifying Identity", "In Progress", "Complete"];
export const CLOSED = ["Complete", "Rejected"];

export const DATE_RANGES = [
  [30, "Last 30 days"],
  [90, "Last 90 days"],
  [365, "This year"],
  [9999, "All time"],
];

export const FORM_TABS = ["Basic", "Form", "Settings", "Systems", "Integrate"];
export const FORM_SECTIONS = ["Form fields", "Styling", "Text"];
export const DETAIL_TABS = ["Activity", "Email", "Tasks", "Systems"];
export const FIELD_TYPES = ["Textbox", "Select", "Radio", "Checkbox", "Textarea", "Datepicker"];

export function createRightsUiState() {
  return {
    topTab: "dashboard",
    range: 365,
    userMenuOpen: false,

    // Requests list
    reqSearch: "",
    reqStatus: "",
    reqType: "all",
    reqSort: "created",
    reqDir: "desc",
    reqPage: 1,
    reqPageSize: 10,
    reqPagedIds: [],
    selectedRequestId: null,
    detailTab: "Activity",
    mailVis: "Private",

    // Web forms
    selectedFormId: null,
    formTab: "Basic",
    formSection: "Form fields",
    addingField: false,

    // Workflows
    wfSearch: "",
    wfSort: "updated",
    wfDir: "desc",
    wfPage: 1,
    wfPageSize: 10,
    wfPagedIds: [],

    // Templates
    tplSearch: "",

    // Tasks
    taskFilter: "open",
    taskSearch: "",
  };
}
