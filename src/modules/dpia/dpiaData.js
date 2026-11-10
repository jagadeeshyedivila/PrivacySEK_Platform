// Demo data and persistence for the DPIA module. Templates, assessments, evidence and tasks are
// saved in MongoDB through the module store; accounts, roles and people are reference data.
// No DOM access: the server imports this file to seed the database.
import { createModuleStore } from "../../platform/moduleStore.js";
import { normalizeRisk, normalizeAssessment, COMPLIANCE, isGap, responseOf } from "./dpiaModel.js";
import { DPIA_CHECKLIST } from "./dpiaChecklistBank.js";
import { DOMAINS, FRAMEWORKS, INTEGRATED_TEMPLATE_ID, ANNUAL_TYPE, METHODOLOGY_VERSION } from "./dpiaConfig.js";
import { suggestFor, suggestionKey } from "./dpiaPrefill.js";
import { createInitialRopaData } from "../ropa/ropaData.js";
import { createInitialDiscoveryData } from "../discovery/discoveryData.js";
import { createDefaultConsentState } from "../consent/consentData.js";
import { createInitialRightsData } from "../rights/rightsData.js";
import sampleData from "../../data/sampleData.js";

const DAY = 864e5;
const USER_KEY = "dpia_current_user_v1";
// Bumped when the seed gains records that existing databases should receive (see migrate())
export const SEED_VERSION = 2;

export const PEOPLE = [
  { name: "Meera Iyer", team: "DPO office" },
  { name: "Daniel Okafor", team: "Privacy team" },
  { name: "Rohan Gupta", team: "Risk" },
  { name: "Kavya Menon", team: "IT" },
  { name: "Farah Ahmed", team: "Legal" },
];
export const teamOf = name => (PEOPLE.find(p => p.name === name) || {}).team || "";

export const DEMO_ACCOUNTS = [
  { id: "d1", name: "Meera Iyer", role: "DPO" },
  { id: "d2", name: "Rohan Gupta", role: "Assessor" },
  { id: "d3", name: "Priya Nair", role: "Auditor" },
];

// build: templates · send: start assessments · review: approve or return · fillAny: answer any
// assessment (assessors answer only their own) · edit: any change at all
export const ROLES = {
  DPO: { build: true, send: true, review: true, fillAny: true, edit: true, about: "Builds templates, sends and reviews assessments" },
  Assessor: { build: false, send: false, review: false, fillAny: false, edit: true, about: "Answers the assessments assigned to them" },
  Auditor: { build: false, send: false, review: false, fillAny: false, edit: false, about: "Read-only" },
};

export const REGULATIONS = ["DPDP", "GDPR", "DPDP + GDPR"];

/* ---------------- templates ---------------- */
const yesNo = t => /^(Does|Is|Can|Are|Have|Do you|Has|Will)\b/.test(t);
const longText = t => /^(Describe|Provide|Explain|List)\b/.test(t) || t.length > 90;

// Question text → [type, options] where the default guess is not right
const OVERRIDES = {
  "What categories of personal data are processed?": ["Multiple choice", ["Identity", "Contact", "Financial", "Government IDs (Aadhaar, PAN)", "Biometric", "Location", "Health", "Children's data"]],
  "What is the lawful basis for the processing?": ["Single choice", ["Consent (s.6)", "Legitimate use (s.7)", "Legal obligation (s.7(c))", "Employment (s.7(i))", "Contract – GDPR Art. 6(1)(b)", "Legitimate interests – GDPR Art. 6(1)(f)"]],
  "What geographies are involved in the processing?": ["Multiple choice", ["India", "EU / EEA", "United Kingdom", "United States", "Singapore", "Other"]],
  "How often is the data collected?": ["Single choice", ["Once", "Daily", "Weekly", "Monthly", "Continuously"]],
  "How many data principals are affected?": ["Single choice", ["Under 1,000", "1,000 – 1 lakh", "1 lakh – 10 lakh", "Over 10 lakh"]],
  "When does processing start?": ["Date", []],
  "Is the model built in-house or bought from a vendor?": ["Single choice", ["Built in-house", "Bought from a vendor", "Vendor model, tuned in-house"]],
};

function q(t, opts = {}) {
  const [type, options] = OVERRIDES[t] || [yesNo(t) ? "Yes/No" : longText(t) ? "Long text" : "Short text", []];
  return { t, type, opts: options, req: !!opts.req, help: opts.help || "", flag: !!opts.flag };
}
// Section helper: the first `req` questions are required; `flags` are indexes of risk indicators
const sec = (name, desc, texts, { req = 2, flags = [], help = {} } = {}) => ({
  name, desc, qs: texts.map((t, i) => q(t, { req: i < req, flag: flags.includes(i), help: help[i] })),
});

const DPIA_SECTIONS = [
  sec("Screening", "Decide whether a full DPIA is needed. A Yes to any of questions 1.2–1.6 means it is.", [
    "Describe broadly what the project aims to achieve.",
    "Does the project involve profiling or automated decisions with significant effects on people?",
    "Does the project process sensitive data such as financial, biometric, health or government ID data?",
    "Does the project involve systematic monitoring of people on a large scale?",
    "Does the project use new technology or process data in a novel way?",
    "Does the project process children's data or data of other vulnerable people?",
  ], { req: 6, flags: [1, 2, 3, 4, 5], help: { 0: "Attach the project brief or design document if you have one." } }),
  sec("Nature of processing", "How the data is collected, used, stored, shared and deleted.", [
    "Describe how the project collects personal data.",
    "Describe how the project uses the data.",
    "Describe where and how the data is stored.",
    "Describe how and when the data is deleted.",
    "Is the data shared with other organisations?",
    "Provide details of who the data is shared with and why.",
  ], { req: 4, flags: [4] }),
  sec("Scope of processing", "How much data, about whom, and for how long.", [
    "What categories of personal data are processed?",
    "How many data principals are affected?",
    "How often is the data collected?",
    "What is the retention period for the data?",
    "What geographies are involved in the processing?",
    "When does processing start?",
  ], { req: 5 }),
  sec("Context and purpose", "The relationship with the people concerned and what the processing is for.", [
    "Describe the purpose of the processing.",
    "Describe your relationship with the data principals.",
    "Are data principals told about the processing in a notice?",
    "How much control do data principals have over their data?",
    "Are there any public concerns about this kind of processing?",
  ], { req: 3, flags: [4] }),
  sec("Necessity and proportionality", "Why the processing is needed and how it stays limited.", [
    "What is the lawful basis for the processing?",
    "Explain why the processing is necessary to achieve the purpose.",
    "Describe how you keep the data to the minimum needed.",
    "Describe how data principals can exercise their rights.",
    "Describe how processors are held to your standards.",
    "Describe the safeguards for any transfers outside India.",
  ], { req: 4 }),
  sec("Consultation", "Who was consulted and what they said.", [
    "Which internal teams were consulted (Security, Legal, Compliance, Business)?",
    "Were data principals or their representatives consulted?",
    "Describe the main points raised and how they were addressed.",
  ], { req: 1 }),
  sec("Sign-off", "Outcome of the DPIA and the DPO's advice.", [
    "Describe the outcome of the DPIA and the measures approved.",
    "Do you need to consult the Data Protection Board or a supervisory authority before processing?",
    "Will the processing be reviewed again on a schedule?",
  ], { req: 2 }),
];

const AI_SECTIONS = [
  sec("System overview", "What the system does and who it affects.", [
    "Describe what the AI system does and the decision it supports.",
    "Is the model built in-house or bought from a vendor?",
    "Does the system make or support decisions with legal or similarly significant effects?",
    "Is a human involved before a decision affects someone?",
  ], { req: 3, flags: [2] }),
  sec("Data and training", "The data used to build and run the model.", [
    "Describe the data used to train the model.",
    "Does the training data include personal data?",
    "Does the training data include children's data?",
    "Describe how the training data is kept accurate and up to date.",
  ], { req: 2, flags: [1, 2] }),
  sec("Fairness and transparency", "Bias testing and explanations to people.", [
    "Has the model been tested for bias across groups such as gender, age and region?",
    "Describe how people are told that an AI system is involved.",
    "Describe how people can challenge an outcome and reach a human.",
  ], { req: 2 }),
  sec("Monitoring", "How the model is watched after launch.", [
    "Describe how model performance and drift are monitored.",
    "Describe the process when the model causes harm or an incident.",
  ], { req: 1 }),
];

const TRANSFER_SECTIONS = [
  sec("Transfer details", "Where the data goes and why.", [
    "What geographies are involved in the processing?",
    "Describe the recipient and their role (processor, partner, group company).",
    "Describe the purpose of the transfer.",
  ], { req: 3 }),
  sec("Restrictions", "Whether the transfer is allowed.", [
    "Is the destination country restricted by the Central Government under DPDP s.16?",
    "Does any sector rule (for example RBI data localisation) require the data to stay in India?",
  ], { req: 2, flags: [0, 1] }),
  sec("Safeguards", "Contracts and technical protections.", [
    "Describe the contractual safeguards in place.",
    "Describe how the data is protected in transit and at rest.",
  ], { req: 1 }),
];

const LEGIT_SECTIONS = [
  sec("Purpose", "The legitimate use relied on.", [
    "What is the lawful basis for the processing?",
    "Describe the specific purpose and why consent is not used.",
  ], { req: 2 }),
  sec("Necessity", "Whether the processing is needed.", [
    "Explain why the processing is necessary to achieve the purpose.",
    "Can the purpose be achieved with less personal data?",
  ], { req: 1 }),
  sec("Balancing", "The effect on the people concerned.", [
    "Would data principals reasonably expect this processing?",
    "Describe the safeguards that reduce the effect on data principals.",
  ], { req: 1, flags: [0] }),
];

const CHILD_SECTIONS = [
  sec("Children's data", "Verifiable parental consent and restrictions under DPDP s.9.", [
    "Describe how the age of the user is determined.",
    "Describe how verifiable parental consent is obtained.",
    "Does the processing involve tracking, behavioural monitoring or targeted advertising to children?",
  ], { req: 2, flags: [2] }),
];

function withIds(prefix, sections) {
  return sections.map((s, si) => ({
    id: `${prefix}-s${si + 1}`, name: s.name, desc: s.desc,
    qs: s.qs.map((x, qi) => ({ id: `${prefix}-s${si + 1}-q${qi + 1}`, ...x })),
  }));
}

function buildTemplates(now) {
  const t = (id, title, desc, regulation, sections, { status = "Published", version = 1, age = 200 } = {}) => ({
    id, title, desc, regulation, status, version,
    sections: withIds(id, sections),
    created: new Date(now - age * DAY).toISOString(),
    updated: new Date(now - Math.min(age, 30) * DAY).toISOString(),
    updatedBy: "Meera Iyer",
    // When it was last published; publishing again bumps the version
    lastPublished: status === "Published" ? new Date(now - Math.min(age, 30) * DAY).toISOString() : null,
  });
  return [
    t("tpl-dpia", "DPIA (DPDP)", "Data protection impact assessment for new or changed processing, including the periodic DPIA for Significant Data Fiduciaries.", "DPDP", DPIA_SECTIONS, { version: 3, age: 320 }),
    t("tpl-gdpr", "GDPR DPIA (Art. 35)", "DPIA for processing by the EU entity that is likely to result in a high risk under GDPR Article 35.", "GDPR", DPIA_SECTIONS, { version: 2, age: 260 }),
    t("tpl-ai", "AI impact assessment", "For models and AI features that make or support decisions about people.", "DPDP + GDPR", AI_SECTIONS, { age: 150 }),
    t("tpl-transfer", "Cross-border transfer assessment", "Checks a transfer of personal data outside India against DPDP s.16 and sector rules.", "DPDP", TRANSFER_SECTIONS, { age: 120 }),
    t("tpl-legit", "Legitimate use assessment", "Records why processing relies on a legitimate use under DPDP s.7 instead of consent.", "DPDP", LEGIT_SECTIONS, { age: 90 }),
    t("tpl-child", "Children's data assessment", "Draft checks for services likely to be used by children.", "DPDP", CHILD_SECTIONS, { status: "Draft", age: 12 }),
    integratedTemplate(now),
  ];
}

// The workbook's 194 questions, one section per domain, every question scored. Question ids are
// derived from the workbook code, so links to them survive template edits.
export function integratedTemplate(now = Date.now()) {
  const id = INTEGRATED_TEMPLATE_ID;
  const at = new Date(now - 20 * DAY).toISOString();
  return {
    id, title: "Integrated DPIA – DPDPA + ISO (194 questions)",
    desc: "Control-level DPIA from the integrated checklist: 16 domains mapped to DPDPA, ISO/IEC 27001, ISO 22301, ISO/IEC 20000-1 and ISO 31000, with 5×5 scoring, control effectiveness and evidence. Use it for the annual SDF DPIA.",
    regulation: "DPDP", status: "Published", version: 1, bank: DPIA_CHECKLIST.version,
    sections: DOMAINS.map(d => ({
      id: `${id}-${d.code}`, name: d.name, desc: `${d.code} · ${d.subDomain}`, domain: d.code,
      qs: DPIA_CHECKLIST.questions.filter(q => q.domain === d.code).map(q => ({
        id: `${id}-${q.id}`, t: q.text, type: COMPLIANCE, opts: [], req: true, help: "", flag: false,
        code: q.id, domain: q.domain, subDomain: q.subDomain, frameworks: q.frameworks.filter(f => FRAMEWORKS.includes(f)),
        qType: q.questionType, scored: true, answerFormat: q.answerFormat, ...(q.prefill ? { prefill: q.prefill } : {}),
      })),
    })),
    created: at, updated: at, updatedBy: "Meera Iyer", lastPublished: at,
  };
}

/* ---------------- evidence ---------------- */
function buildEvidence(now) {
  const date = d => new Date(now + d * DAY).toISOString().slice(0, 10);
  const iso = new Date(now - 15 * DAY).toISOString();
  const ev = (id, o) => ({
    id, title: "", description: "", questionIds: [], assessmentIds: [], frameworks: ["DPDPA"], activityIds: [], assetIds: [],
    type: "Policy", owner: "Meera Iyer", obtainedOn: date(-60), validUntil: date(300), location: "", ropaDocId: "", ropaPolicyId: "",
    sufficiency: "Sufficient", reliability: "High", reviewerNotes: "", followUp: "", created: iso, updated: iso, createdBy: "Meera Iyer", ...o,
  });
  const A = "DPIA-2026-015";
  return [
    ev("EV-0001", { title: "Privacy notice v4.1", description: "Published customer privacy notice covering lending and KYC.", questionIds: ["DPIA-007", "DPIA-048", "DPIA-049"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 27001"], activityIds: ["PA-001", "PA-002"], ropaPolicyId: "PO-001", location: "https://www.aarohan.example/privacy", obtainedOn: date(-40), validUntil: date(325) }),
    ev("EV-0002", { title: "DPA – MoEngage", description: "Signed data processing agreement with MoEngage, with breach notice and deletion clauses.", type: "Contract", questionIds: ["DPIA-119", "DPIA-120", "DPIA-122"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 27001"], activityIds: ["PA-004"], ropaDocId: "DC-001", location: "https://docs.aarohan.example/dpa/moengage", owner: "Farah Ahmed", obtainedOn: date(-300), validUntil: date(430) }),
    ev("EV-0003", { title: "SCCs – SAP", description: "Standard Contractual Clauses for payroll data hosted in Germany.", type: "Contract", questionIds: ["DPIA-130", "DPIA-136"], frameworks: ["DPDPA", "ISO 27001"], activityIds: ["PA-006"], assetIds: ["AS-008"], ropaDocId: "DC-003", location: "https://docs.aarohan.example/sccs/sap", owner: "Farah Ahmed", obtainedOn: date(-400), validUntil: date(330) }),
    ev("EV-0004", { title: "DPIA – Credit scoring model", description: "Earlier DPIA draft for the credit scoring model, with the bias-testing plan.", type: "Report", questionIds: ["DPIA-070", "DPIA-159", "DPIA-181"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 31000"], activityIds: ["PA-007"], ropaDocId: "DC-004", location: "https://docs.aarohan.example/dpia/credit-scoring", owner: "Rohan Gupta", obtainedOn: date(-9), validUntil: date(356), sufficiency: "Partially Sufficient", reliability: "Medium", followUp: "Add the bias-test results once the v4 model is validated." }),
    ev("EV-0005", { title: "Information security policy v3.0", description: "Board-approved information security policy covering encryption, access control and logging.", questionIds: ["DPIA-075", "DPIA-076", "DPIA-077", "DPIA-082"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 27001", "ISO 20000"], ropaPolicyId: "PO-004", location: "https://docs.aarohan.example/policies/infosec", owner: "Kavya Menon", obtainedOn: date(-150), validUntil: date(215) }),
    ev("EV-0006", { title: "Quarterly access review – Q2 2026", description: "Sign-off of user access reviews for los-db and core-banking-db.", type: "Record", questionIds: ["DPIA-080", "DPIA-078"], assessmentIds: [A], frameworks: ["ISO 27001", "ISO 20000"], assetIds: ["AS-001", "AS-002"], owner: "Kavya Menon", obtainedOn: date(-120), validUntil: date(-20), sufficiency: "Sufficient", reliability: "High", followUp: "Q3 review is late: request the sign-off from IT." }),
    ev("EV-0007", { title: "Retention policy v1.4", description: "Retention schedule by data category.", questionIds: ["DPIA-107", "DPIA-108", "DPIA-039"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 27001"], ropaPolicyId: "PO-003", location: "https://docs.aarohan.example/policies/retention", owner: "Farah Ahmed", obtainedOn: date(-388), validUntil: date(-23), sufficiency: "Partially Sufficient", reliability: "Medium", reviewerNotes: "Review date has passed.", followUp: "Policy owner to re-approve." }),
    ev("EV-0008", { title: "Discovery posture report – October scan", description: "Data Discovery scan results for databases, S3, Drive and ticketing.", type: "System Evidence", questionIds: ["DPIA-029", "DPIA-032", "DPIA-033", "DPIA-094"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 27001"], owner: "Kavya Menon", obtainedOn: date(-3), validUntil: date(87), location: "#discovery" }),
    ev("EV-0009", { title: "Penetration test report 2026", description: "External test of the lending app and APIs by a CERT-In empanelled auditor.", type: "Report", questionIds: ["DPIA-084", "DPIA-093"], assessmentIds: [A], frameworks: ["ISO 27001", "ISO 20000"], assetIds: ["AS-002"], owner: "Kavya Menon", obtainedOn: date(-75), validUntil: date(290), sufficiency: "Partially Sufficient", reliability: "High", followUp: "Two medium findings still open." }),
    ev("EV-0010", { title: "Backup restore test – September 2026", description: "Restore of core-banking-db from the Mumbai backup to the DR site.", type: "Record", questionIds: ["DPIA-089", "DPIA-090", "DPIA-144"], assessmentIds: [A], frameworks: ["ISO 27001", "ISO 22301", "ISO 20000"], assetIds: ["AS-001"], owner: "Kavya Menon", obtainedOn: date(-45), validUntil: date(135) }),
    ev("EV-0011", { title: "Grievance redressal policy v1.1", description: "Grievance channel, timelines and escalation to the Data Protection Board.", questionIds: ["DPIA-058", "DPIA-059"], assessmentIds: [A], frameworks: ["DPDPA", "ISO 20000"], ropaPolicyId: "PO-005", location: "https://www.aarohan.example/grievance", obtainedOn: date(-70), validUntil: date(295) }),
  ];
}

/* ---------------- the annual SDF DPIA ---------------- */
// Gaps found in the 2026 annual DPIA, with their control records
const ANNUAL_GAPS = {
  "DPIA-008": ["Partial", { finding: "RACI exists for lending and KYC but not for marketing or analytics.", recommendation: "Extend the privacy RACI to Growth and Digital teams.", likelihood: 3, impact: 3, controlEffectiveness: 2, controlOwner: "Meera Iyer", dataOwner: "Daniel Okafor", priority: "Low", targetDate: 60 }],
  "DPIA-021": ["Partial", { finding: "The credit model pulls 140 bureau attributes; no review of which are needed.", recommendation: "Feature-importance review; drop attributes with no lift.", likelihood: 4, impact: 3, controlEffectiveness: 2, controlOwner: "Rohan Gupta", dataOwner: "Kavya Menon", activityId: "PA-007", priority: "Medium", targetDate: 45 }],
  "DPIA-032": ["Partial", { finding: "Discovery found a copy of the KYC table on an analyst laptop share.", recommendation: "Delete the copy, notify the owner, and block CSV exports of KYC tables.", likelihood: 4, impact: 4, controlEffectiveness: 1, controlOwner: "Kavya Menon", dataOwner: "Farah Ahmed", activityId: "PA-002", priority: "High", targetDate: 14 }],
  "DPIA-047": ["No", { finding: "Withdrawing marketing consent stops MoEngage sends but not the Mailchimp list.", recommendation: "Add the Mailchimp suppression step to the withdrawal workflow.", likelihood: 3, impact: 4, controlEffectiveness: 1, controlOwner: "Daniel Okafor", activityId: "PA-004", priority: "Medium", targetDate: 30 }],
  "DPIA-062": ["No", { finding: "Erasure requests are not applied to backups, and there is no record of when backups age out.", recommendation: "Document backup expiry and suppress erased records on restore.", likelihood: 3, impact: 3, controlOwner: "Kavya Menon", controlEffectiveness: 1, priority: "Medium", targetDate: 60 }],
  "DPIA-072": ["Partial", { finding: "Analytics extracts use raw PAN; pseudonymisation is used only in the Aadhaar Data Vault.", recommendation: "Tokenise PAN in analytics extracts.", likelihood: 3, impact: 4, controlEffectiveness: 2, controlOwner: "Kavya Menon", activityId: "PA-007", priority: "Medium", targetDate: 45 }],
  "DPIA-088": ["No", { finding: "No DLP on S3 or email. Discovery found a public bucket holding PAN values (INC-2026-019).", recommendation: "Deploy DLP on S3 and email; block public buckets by policy.", likelihood: 4, impact: 5, controlEffectiveness: 0, controlOwner: "Kavya Menon", dataOwner: "Farah Ahmed", activityId: "PA-002", assetIds: ["AS-005"], priority: "Critical", targetDate: 21, notes: "Interview with the security lead, 28 Oct." }],
  "DPIA-092": ["Partial", { finding: "UAT copies of los-db are masked; the analytics sandbox is not.", recommendation: "Apply the masking job to the analytics sandbox.", likelihood: 3, impact: 4, controlEffectiveness: 2, controlOwner: "Kavya Menon", activityId: "PA-007", assetIds: ["AS-002"], priority: "Medium", targetDate: 45 }],
  "DPIA-109": ["Partial", { finding: "Automatic deletion runs for marketing leads and call recordings only.", recommendation: "Extend retention jobs to loan applications and KYC images.", likelihood: 3, impact: 3, controlEffectiveness: 3, controlOwner: "Farah Ahmed", priority: "Low", targetDate: 90 }],
  "DPIA-121": ["No", { finding: "The co-lending agreement has no breach notification clause.", recommendation: "Add a 6-hour breach notice clause to the co-lending agreement.", likelihood: 3, impact: 5, controlEffectiveness: 1, controlOwner: "Farah Ahmed", activityId: "PA-001", priority: "High", targetDate: 30 }],
};
const ANNUAL_NA = {
  "DPIA-030": "Ticketing (Freshdesk) is used only by the EU entity, which is outside this assessment.",
  "DPIA-115": "No applications holding personal data were decommissioned in the period.",
};
// Questions left unanswered, so the demo shows work still to do
const ANNUAL_OPEN_FROM = ["BREACH", 8];   // from the 9th BREACH question onwards
const ANNUAL_ANSWERED = ["GOV", "DATA", "CLASS", "LEGAL", "RIGHTS", "PRIV", "SEC", "BREACH", "RET", "VEND"];

function buildAnnual(now, templates) {
  const iso = d => new Date(now + d * DAY).toISOString();
  const date = d => iso(d).slice(0, 10);
  const t = templates.find(x => x.id === INTEGRATED_TEMPLATE_ID);
  const sections = JSON.parse(JSON.stringify(t.sections));
  const ropa = createInitialRopaData();
  const scope = ["PA-001", "PA-002", "PA-007", "PA-004"];
  const a = {
    id: "DPIA-2026-015", name: "Annual SDF DPIA 2026",
    desc: "Rule 13 annual DPIA of Aarohan's core lending, KYC, credit scoring and marketing processing, using the integrated checklist.",
    tpl: t.id, tplTitle: t.title, tplVersion: t.version, sections,
    activityId: "PA-001", activityName: "Loan origination", activityIds: scope,
    assessmentType: ANNUAL_TYPE, orgRole: "Data Fiduciary", sdf: true, frameworksInScope: FRAMEWORKS.slice(),
    assessors: ["Rohan Gupta", "Kavya Menon"], methodologyVersion: METHODOLOGY_VERSION,
    who: "Meera Iyer", reviewer: "Daniel Okafor", due: date(40), status: "In progress",
    answers: {}, controls: {}, risks: [], reviewNote: "",
    created: iso(-21), updated: iso(-1), submittedAt: null, completedAt: null,
    activity: [
      { at: iso(-21), by: "Meera Iyer", text: `Assessment sent to Meera Iyer using “${t.title}” v${t.version}.` },
      { at: iso(-20), by: "Meera Iyer", text: "Started the assessment." },
      { at: iso(-12), by: "Meera Iyer", text: "Accepted 38 suggestions from the Data Map, Discovery, Consent and Rights." },
    ],
  };
  const sources = { ropa, discovery: createInitialDiscoveryData(), consent: createDefaultConsentState(), rights: createInitialRightsData(), sample: sampleData };
  const evidence = buildEvidence(now);
  let accepted = 0;
  sections.forEach(s => {
    if (!ANNUAL_ANSWERED.includes(s.domain)) return;
    s.qs.forEach((q, qi) => {
      if (s.domain === ANNUAL_OPEN_FROM[0] && qi >= ANNUAL_OPEN_FROM[1]) return;
      const c = { evidenceIds: evidence.filter(e => e.assessmentIds.includes(a.id) && e.questionIds.includes(q.code)).map(e => e.id) };
      if (ANNUAL_GAPS[q.code]) {
        const [response, rec] = ANNUAL_GAPS[q.code];
        a.answers[q.id] = q.answerFormat === "text+response" ? { text: "", response } : response;
        Object.assign(c, rec, { targetDate: date(rec.targetDate), status: "Open" });
      } else if (ANNUAL_NA[q.code]) {
        a.answers[q.id] = "NA";
        c.notes = ANNUAL_NA[q.code];
      } else {
        const sug = suggestFor(q, a, sources);
        if (sug && !sug.hintOnly && sug.response && !["No", "Partial"].includes(sug.response)) {
          a.answers[q.id] = q.answerFormat === "text+response" ? { text: sug.text || "", response: sug.response } : sug.response;
          c.prefillAccepted = true;
          c.prefillKey = suggestionKey(sug);
          accepted++;
        } else {
          a.answers[q.id] = q.answerFormat === "text+response" ? { text: "Documented in the process owner's walkthrough notes.", response: "Yes" } : "Yes";
        }
      }
      if (c.evidenceIds.length || Object.keys(c).length > 1) a.controls[q.id] = c;
    });
  });
  a.activity[2].text = `Accepted ${accepted} suggestions from the Data Map, Discovery, Consent and Rights.`;
  // Risks raised from the worst gaps
  const fromGap = (rid, code, title, extra = {}) => {
    const qid = `${t.id}-${code}`;
    const c = a.controls[qid];
    const act = ropa.act.find(x => x.id === (c.activityId || "PA-001"));
    return risk(rid, title, c.finding, c.likelihood, c.impact, c.controlEffectiveness, c.recommendation, c.controlOwner, "Open", qid, {
      activityId: act.id, affectedData: act.cat.slice(0, 3), affectedPrincipals: act.dpc.slice(0, 2), targetDate: c.targetDate, priority: c.priority, ...extra,
    });
  };
  a.risks = [
    fromGap("R1", "DPIA-088", "PAN exposed through public storage without DLP", {
      threat: "Misconfigured S3 bucket and no data loss prevention", harm: "Identity theft and fraud against 2,318 customers",
      existingControls: "Manual bucket reviews; incident INC-2026-019 open",
      acceptance: { decision: "Escalated", by: "Meera Iyer", at: iso(-5), rationale: "Residual risk is RED until DLP is live. Escalated for funding and a 21-day deadline.", escalatedTo: "Risk Committee" },
    }),
    fromGap("R2", "DPIA-032", "KYC data copied outside approved locations", { threat: "Analysts exporting tables for ad-hoc work", harm: "Loss of Aadhaar and PAN data", existingControls: "Discovery scans weekly" }),
    fromGap("R3", "DPIA-121", "Co-lending partner not bound to report breaches", { threat: "No breach notice clause", harm: "Late notice to the Board and to borrowers", existingControls: "Relationship manager contact only" }),
    fromGap("R4", "DPIA-072", "Raw PAN used in analytics extracts", { threat: "No tokenisation in the analytics pipeline", harm: "Wider exposure if the sandbox is breached", existingControls: "Role-based access to the sandbox" }),
    fromGap("R5", "DPIA-047", "Consent withdrawal not passed to Mailchimp", { threat: "Manual list sync", harm: "Marketing after withdrawal; complaint to the Board", existingControls: "Weekly manual suppression" }),
  ];
  return a;
}

function buildMeta() {
  return { seedVersion: SEED_VERSION };
}

/* ---------------- assessments ---------------- */
const SAMPLE_TEXT = [
  "Documented in the project brief (v2). The data flows match the entry in the Data Map.",
  "Access is limited to the named team through role-based access, reviewed every quarter.",
  "Records are deleted by the scheduled retention job once the period in the Data Map entry ends.",
  "Reviewed with Security and Legal in the design workshop. Their actions are tracked in the project risk log.",
  "Stored in the primary data centre in Mumbai and encrypted at rest and in transit.",
];
// Flagged questions answer No unless the assessment lists them in `yes`
function sampleAnswer(q, k) {
  if (q.type === "Yes/No") return "No";
  if (q.type === "Single choice") return q.opts[k % q.opts.length];
  if (q.type === "Multiple choice") return q.opts.slice(0, 2 + (k % 2));
  if (q.type === "Date") return new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10);
  if (q.type === "Short text") return ["8 years after closure", "Around 2 lakh customers", "Core lending database", "Quarterly"][k % 4];
  return SAMPLE_TEXT[k % SAMPLE_TEXT.length];
}

// The first long answer describes the project itself; the rest are generic
function answersFor(sections, pct, forceYes = [], desc = "") {
  const qs = sections.flatMap(s => s.qs);
  const n = Math.round(qs.length * pct / 100);
  const out = {};
  let described = false;
  qs.slice(0, n).forEach((x, k) => {
    if (forceYes.includes(x.id)) out[x.id] = "Yes";
    else if (x.type === "Long text" && !described && desc) { out[x.id] = desc; described = true; }
    else out[x.id] = sampleAnswer(x, k);
  });
  return out;
}

// A risk in the workbook's shape: likelihood and impact 1–5, control effectiveness 0–5
function risk(id, title, scenario, likelihood, impact, controlEffectiveness, treatment, owner, status, questionId, extra = {}) {
  return normalizeRisk({
    id, title, questionId: questionId || "", activityId: "", scenario, threat: "", harm: "",
    affectedData: [], affectedPrincipals: [], likelihood, impact, existingControls: "", controlEffectiveness,
    treatment, owner, targetDate: "", status, priority: "",
    acceptance: { decision: "", by: "", at: "", rationale: "", escalatedTo: "" },
    ...extra,
  });
}

function buildAssessments(now, templates) {
  const iso = d => new Date(now + d * DAY).toISOString();
  const date = d => iso(d).slice(0, 10);
  const tpl = id => templates.find(t => t.id === id);
  const make = o => {
    const t = tpl(o.tpl);
    const sections = JSON.parse(JSON.stringify(t.sections));
    const created = iso(-o.age);
    const activity = [{ at: created, by: "Meera Iyer", text: `Assessment sent to ${o.who} using “${t.title}” v${t.version}.` }];
    (o.log || []).forEach(([d, by, text]) => activity.push({ at: iso(d), by, text }));
    return {
      id: o.id, name: o.name, desc: o.desc || "", tpl: t.id, tplTitle: t.title, tplVersion: t.version, sections,
      activityId: o.act || "", activityName: o.actName || "", activityIds: o.act ? [o.act] : [],
      assessmentType: "Project DPIA", orgRole: "Data Fiduciary", sdf: true, frameworksInScope: ["DPDPA"], assessors: [],
      methodologyVersion: METHODOLOGY_VERSION,
      who: o.who, reviewer: "Meera Iyer", due: date(o.due), status: o.status,
      answers: answersFor(sections, o.pct, (o.yes || []).map(k => `${t.id}-${k}`), o.desc),
      controls: {},
      risks: (o.risks || []).map(r => ({ ...r, activityId: r.activityId || o.act || "" })), reviewNote: o.note || "",
      created, updated: iso(Math.min(-1, -o.age + 3)),
      submittedAt: o.submitted != null ? iso(o.submitted) : null,
      completedAt: o.completed != null ? iso(o.completed) : null,
      activity,
    };
  };
  return [
    make({
      id: "DPIA-2026-014", name: "Credit scoring model v4", tpl: "tpl-ai", act: "PA-007", actName: "Credit scoring model",
      desc: "New gradient-boosted model replacing v3 for personal loan decisions.", who: "Rohan Gupta", status: "In progress", pct: 70, age: 18, due: 25,
      yes: ["s1-q3", "s2-q2"],
      log: [[-17, "Rohan Gupta", "Started the assessment."]],
      risks: [
        risk("R1", "Unfair outcomes for thin-file applicants", "The model may score applicants with little credit history lower, which could be indirect discrimination.", 4, 5, 3, "Bias testing across age, gender and region before launch; manual review of declines below the cut-off.", "Rohan Gupta", "In Progress", "tpl-ai-s1-q3", { activityId: "PA-007", threat: "Training data under-represents thin-file applicants", harm: "Loans refused on grounds unrelated to creditworthiness", existingControls: "Model validation by Risk; manual review above the threshold", targetDate: date(14), affectedData: ["Financial", "Government IDs"], affectedPrincipals: ["Customers"] }),
        risk("R2", "More bureau attributes than needed", "The feature set pulls 140 bureau attributes; fewer may be enough.", 2, 2, 3, "Feature importance review to drop attributes with no lift.", "Kavya Menon", "Open", "tpl-ai-s2-q2", { activityId: "PA-007", existingControls: "Feature list reviewed at model sign-off", targetDate: date(30) }),
      ],
    }),
    make({
      id: "DPIA-2026-013", name: "New CRM rollout", tpl: "tpl-dpia", desc: "Moving customer service records from the legacy CRM to Salesforce.",
      who: "Kavya Menon", status: "In progress", pct: 40, age: 12, due: 10,
      log: [[-11, "Kavya Menon", "Started the assessment."]],
      risks: [risk("R1", "Legacy records copied without retention rules", "Old tickets past their retention period could be migrated.", 4, 2, 4, "Apply retention filter before migration.", "Kavya Menon", "Open", "", { existingControls: "Migration runbook includes a retention check", targetDate: date(9) })],
    }),
    make({
      id: "DPIA-2026-012", name: "Co-lending data share", tpl: "tpl-dpia", desc: "Sharing loan and KYC summaries with the NBFC co-lending partner.",
      who: "Daniel Okafor", status: "Under review", pct: 100, age: 26, due: 3, submitted: -2, yes: ["s2-q5"],
      log: [[-25, "Daniel Okafor", "Started the assessment."], [-2, "Daniel Okafor", "Submitted for review."]],
      risks: [
        risk("R1", "Partner uses data beyond co-lending", "The partner could reuse shared KYC data for its own marketing.", 2, 4, 3, "Purpose limitation clause and annual audit right in the co-lending agreement.", "Farah Ahmed", "In Progress", "tpl-dpia-s2-q5", { threat: "Weak contractual purpose limitation", harm: "Unwanted marketing to borrowers", existingControls: "Co-lending agreement in negotiation", targetDate: date(7) }),
        risk("R2", "Over-sharing of KYC documents", "Full document images are shared where a summary would do.", 4, 4, 4, "Share masked KYC summary only; images on request.", "Daniel Okafor", "In Progress", "", { existingControls: "Masked summary export built", targetDate: date(10) }),
      ],
    }),
    make({
      id: "DPIA-2026-011", name: "Collections calling", tpl: "tpl-dpia", act: "PA-005", actName: "Collections calling",
      who: "Rohan Gupta", status: "Not started", pct: 0, age: 4, due: 20,
    }),
    make({
      id: "DPIA-2026-010", name: "Support copilot", tpl: "tpl-ai", desc: "Generative AI assistant drafting replies for support agents.",
      who: "Kavya Menon", status: "Changes requested", pct: 85, age: 40, due: 6, submitted: -9,
      note: "Please describe how agents are told the reply was drafted by AI, and add the vendor's retention terms to section 2.",
      log: [[-39, "Kavya Menon", "Started the assessment."], [-9, "Kavya Menon", "Submitted for review."], [-7, "Meera Iyer", "Requested changes: Please describe how agents are told the reply was drafted by AI, and add the vendor's retention terms to section 2."]],
      risks: [risk("R1", "Customer data sent to the model vendor", "Ticket text including account numbers is sent to the LLM provider.", 4, 4, 2, "Redact account numbers and PAN before sending; zero-retention API terms.", "Kavya Menon", "In Progress", "", { threat: "Unredacted ticket text in prompts", harm: "Account numbers held by a third party", existingControls: "Zero-retention API terms signed", targetDate: date(-2) })],
    }),
    make({
      id: "DPIA-2026-009", name: "Marketing lookalike audiences", tpl: "tpl-legit", desc: "Building lookalike audiences from existing borrowers for ad platforms.",
      who: "Daniel Okafor", status: "In progress", pct: 50, age: 30, due: -4,
      log: [[-29, "Daniel Okafor", "Started the assessment."]],
    }),
    make({
      id: "DPIA-2026-007", name: "Loan origination", tpl: "tpl-dpia", act: "PA-001", actName: "Loan origination",
      desc: "Personal loan applications on web, app and at branches, from KYC to credit decision and disbursal.",
      who: "Daniel Okafor", status: "Approved", pct: 100, age: 80, due: -40, submitted: -45, completed: -31, yes: ["s1-q3"],
      log: [[-79, "Daniel Okafor", "Started the assessment."], [-45, "Daniel Okafor", "Submitted for review."], [-31, "Meera Iyer", "Approved. Residual risk accepted by the DPO."]],
      risks: [
        risk("R1", "Large volume of financial and ID data", "Applications hold PAN, bank statements and income proofs.", 4, 4, 4, "Encryption at rest, masked display of PAN, quarterly access reviews.", "Kavya Menon", "Accepted", "tpl-dpia-s1-q3", { activityId: "PA-001", existingControls: "AES-256 at rest, PAN masking, quarterly access reviews", acceptance: { decision: "Accepted", by: "Meera Iyer", at: iso(-31), rationale: "Residual risk is low once the controls are in place.", escalatedTo: "" } }),
        risk("R2", "Applications abandoned midway keep data", "Partial applications were kept indefinitely.", 4, 2, 4, "Delete incomplete applications after 90 days.", "Rohan Gupta", "Closed", "", { activityId: "PA-001", existingControls: "90-day deletion job" }),
      ],
    }),
    make({
      id: "DPIA-2026-005", name: "KYC verification", tpl: "tpl-dpia", act: "PA-002", actName: "KYC verification",
      desc: "Identity verification with Aadhaar e-KYC, PAN validation and a face match for new customers.",
      who: "Farah Ahmed", status: "Approved", pct: 100, age: 120, due: -70, submitted: -80, completed: -72, yes: ["s1-q3"],
      log: [[-119, "Farah Ahmed", "Started the assessment."], [-80, "Farah Ahmed", "Submitted for review."], [-72, "Meera Iyer", "Approved."]],
      risks: [risk("R1", "Aadhaar numbers stored in full", "Full Aadhaar numbers could be exposed in a breach.", 2, 5, 3, "Store only the last 4 digits and the reference token from the Aadhaar Data Vault.", "Kavya Menon", "Accepted", "tpl-dpia-s1-q3", { activityId: "PA-002", existingControls: "Aadhaar Data Vault with tokenisation", acceptance: { decision: "Accepted", by: "Meera Iyer", at: iso(-72), rationale: "Tokenised storage meets UIDAI requirements.", escalatedTo: "" } })],
    }),
    make({
      id: "DPIA-2026-004", name: "Payment gateway in Singapore", tpl: "tpl-transfer", desc: "Card tokens processed by the payment gateway's Singapore region.",
      who: "Farah Ahmed", status: "Approved", pct: 100, age: 150, due: -100, submitted: -110, completed: -104,
      log: [[-149, "Farah Ahmed", "Started the assessment."], [-110, "Farah Ahmed", "Submitted for review."], [-104, "Meera Iyer", "Approved."]],
    }),
  ];
}

function buildTasks(now) {
  const date = d => new Date(now + d * DAY).toISOString().slice(0, 10);
  return [
    { id: "TK-1", title: "Review “Co-lending data share”", assessment: "DPIA-2026-012", owner: "Meera Iyer", due: date(3), status: "Open", kind: "Review" },
    { id: "TK-2", title: "Bias testing across age, gender and region", assessment: "DPIA-2026-014", owner: "Rohan Gupta", due: date(14), status: "Open", kind: "Mitigation" },
    { id: "TK-3", title: "Add purpose limitation clause to the co-lending agreement", assessment: "DPIA-2026-012", owner: "Farah Ahmed", due: date(7), status: "In progress", kind: "Mitigation" },
    { id: "TK-4", title: "Redact account numbers before sending tickets to the model", assessment: "DPIA-2026-010", owner: "Kavya Menon", due: date(-2), status: "Open", kind: "Mitigation" },
    { id: "TK-5", title: "Delete incomplete loan applications after 90 days", assessment: "DPIA-2026-007", owner: "Rohan Gupta", due: date(-35), status: "Done", kind: "Mitigation" },
  ];
}

function annualTasks(now) {
  const date = d => new Date(now + d * DAY).toISOString().slice(0, 10);
  return [
    { id: "TK-6", title: "Deploy DLP on S3 and email; block public buckets by policy", assessment: "DPIA-2026-015", owner: "Kavya Menon", due: date(21), status: "In progress", kind: "Mitigation", ref: "R1" },
    { id: "TK-7", title: "Delete the KYC copy on the analyst share and block CSV exports", assessment: "DPIA-2026-015", owner: "Kavya Menon", due: date(14), status: "Open", kind: "Mitigation", ref: "R2" },
  ];
}

export function createInitialDpiaData() {
  const now = Date.now();
  const templates = buildTemplates(now);
  return {
    templates,
    assessments: [buildAnnual(now, templates)].concat(buildAssessments(now, templates)),
    evidence: buildEvidence(now),
    tasks: annualTasks(now).concat(buildTasks(now)),
    meta: buildMeta(),
  };
}

// Brings data saved by an older version up to date: adds seed records that did not exist then
// (the integrated template, the evidence register and the annual SDF DPIA) and maps legacy
// risks to the 5×5 model. Returns true when something changed and should be saved.
const normalized = typeof WeakSet === "function" ? new WeakSet() : null;
export function migrate(s) {
  let changed = false;
  if (!Array.isArray(s.evidence)) { s.evidence = []; }
  if (!s.meta || (s.meta.seedVersion || 1) < SEED_VERSION) {
    const seed = createInitialDpiaData();
    const add = (coll, list, front) => list.forEach(x => {
      if (!s[coll].some(y => y.id === x.id)) { if (front) s[coll].unshift(x); else s[coll].push(x); }
    });
    add("templates", seed.templates.filter(t => t.id === INTEGRATED_TEMPLATE_ID));
    add("evidence", seed.evidence);
    add("assessments", seed.assessments.filter(a => a.id === "DPIA-2026-015"), true);
    add("tasks", annualTasks(Date.now()), true);
    s.meta = buildMeta();
    changed = true;
  }
  (s.assessments || []).forEach(a => {
    if (normalized && normalized.has(a)) return;
    const before = JSON.stringify(a);
    normalizeAssessment(a, { orgRole: "Data Fiduciary", sdf: true });
    if (JSON.stringify(a) !== before) changed = true;
    if (normalized) normalized.add(a);
  });
  return changed;
}

const dpiaStore = createModuleStore("dpia", createInitialDpiaData);
export const loadDpiaState = () => {
  const s = dpiaStore.get();
  if (migrate(s)) dpiaStore.save(s);
  return s;
};
export const saveDpiaState = s => dpiaStore.save(s);
export const resetDpiaState = () => dpiaStore.reset();

export function loadCurrentUser() {
  try {
    const u = JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
    if (u && ROLES[u.role]) return u;
  } catch (e) { /* storage blocked */ }
  return DEMO_ACCOUNTS[0];
}
export function saveCurrentUser(u) {
  try { sessionStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) { /* storage blocked */ }
}
