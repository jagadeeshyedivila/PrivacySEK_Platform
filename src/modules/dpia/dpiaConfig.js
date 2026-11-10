// Static configuration and UI state for the DPIA module. No DOM access: dpiaModel.js and the
// server import the enums from here.
import { DPIA_CHECKLIST } from "./dpiaChecklistBank.js";

export const DPIA_TABS = [
  ["dashboard", "Dashboard"],
  ["assessments", "Assessments"],
  ["templates", "Templates"],
  ["risks", "Risk register"],
  ["evidence", "Evidence"],
  ["frameworks", "Frameworks"],
  ["tasks", "Tasks"],
  ["guide", "Guide"],
];

// Tabs each role can open
export const TAB_ACCESS = {
  DPO: DPIA_TABS.map(t => t[0]),
  Assessor: DPIA_TABS.map(t => t[0]),
  Auditor: ["dashboard", "assessments", "risks", "evidence", "frameworks", "tasks", "guide"],
};

/* ---------------- checklist enums (from the workbook's Lists sheet) ---------------- */
const L = DPIA_CHECKLIST.lists;
const S = DPIA_CHECKLIST.scoring;

export const RESPONSES = L.response;                       // Yes / No / Partial / NA / Not Assessed
export const GAP_RESPONSES = ["No", "Partial"];
export const CONTROL_STATUSES = L.status;                  // Open / In Progress / Closed / Accepted / Not Applicable
export const RISK_STATUSES = L.status;
export const CLOSED_RISK_STATUSES = ["Closed", "Not Applicable"];
export const PRIORITIES = L.priority;                      // Critical / High / Medium / Low
export const EVIDENCE_TYPES = L.evidenceType;
export const EVIDENCE_SUFFICIENCY = L.evidenceSufficiency;
export const EVIDENCE_RELIABILITY = L.evidenceReliability;

// Score labels. The workbook names only the end points; the middle labels are editable here.
export const LIKELIHOOD_LABELS = { ...S.likelihoodLabels };
export const IMPACT_LABELS = { ...S.impactLabels };
export const CE_LABELS = { ...S.controlEffectivenessLabels };
export const SCALE_1_5 = [1, 2, 3, 4, 5];
export const SCALE_0_5 = [0, 1, 2, 3, 4, 5];

// RAG bands on the residual score: 1–5 GREEN, 6–12 AMBER, 13–25 RED
export const RAG_BANDS = { RED: 13, AMBER: 6 };
export const RAG_ORDER = ["GREEN", "AMBER", "RED"];

export const FRAMEWORKS = DPIA_CHECKLIST.frameworks;      // DPDPA, ISO 27001, ISO 22301, ISO 20000, ISO 31000
export const FRAMEWORK_SHORT = { DPDPA: "DPDPA", "ISO 27001": "27001", "ISO 22301": "22301", "ISO 20000": "20000", "ISO 31000": "31000" };
export const FRAMEWORK_FULL = { DPDPA: "DPDP Act 2023", "ISO 27001": "ISO/IEC 27001", "ISO 22301": "ISO 22301", "ISO 20000": "ISO/IEC 20000-1", "ISO 31000": "ISO 31000" };
export const DOMAINS = DPIA_CHECKLIST.domains;
export const METHODOLOGY_VERSION = DPIA_CHECKLIST.version;

/* ---------------- assessment context ---------------- */
export const ASSESSMENT_TYPES = ["Project DPIA", "Annual SDF DPIA (Rule 13)", "Periodic review"];
export const ANNUAL_TYPE = "Annual SDF DPIA (Rule 13)";
export const ORG_ROLES = ["Data Fiduciary", "Data Processor", "Both"];
export const ESCALATION_BODIES = ["Risk Committee", "Board", "Audit Committee", "Executive Committee"];

export const INTEGRATED_TEMPLATE_ID = "tpl-integrated";

export function createDpiaUiState() {
  return {
    tab: "dashboard",
    userMenuOpen: false,

    // Assessments
    aSearch: "", aStatus: "", aMine: false,
    selected: null,       // assessment id open in the workspace
    step: 0,              // section index, "risks" or "summary"
    qf: { resp: "", rag: "", fw: "", ev: "", owner: "", domain: "" },   // question filter in the workspace
    ctlOpen: {},          // question id → true/false when the control panel was opened or closed by hand

    // Templates
    tSearch: "", tStatus: "all", tBank: false,
    tplDraft: null,       // copy of the template being edited; saved only on Save or Publish
    tplSaved: null,       // JSON of the template when editing began, to tell whether it changed
    tplMode: "edit",      // "edit" or "preview"
    openSec: 0,
    previewAnswers: {},
    previewStep: 0,

    // Risk register
    rRag: "", rStatus: "open", rSearch: "", rPriority: "", rOwner: "", rActivity: "",

    // Evidence
    eFilter: "all", eSearch: "",

    // Frameworks
    fwScope: "",          // assessment id, or "" for all approved assessments

    // Tasks
    kFilter: "open", kSearch: "",
  };
}
