// Demo data and persistence for the DPIA module. Templates, assessments and tasks are saved in
// MongoDB through the module store; accounts, roles and people are reference data.
import { createModuleStore } from "../../platform/moduleStore.js";
import { riskLevel } from "./dpiaModel.js";

const DAY = 864e5;
const USER_KEY = "dpia_current_user_v1";

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
  ];
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

function risk(id, title, desc, l, i, rl, ri, mitigation, owner, status, from) {
  return { id, title, desc, l, i, rl, ri, mitigation, owner, status, from: from || "", level: riskLevel(rl || l, ri || i) };
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
      activityId: o.act || "", activityName: o.actName || "",
      who: o.who, reviewer: "Meera Iyer", due: date(o.due), status: o.status,
      answers: answersFor(sections, o.pct, (o.yes || []).map(k => `${t.id}-${k}`), o.desc),
      risks: o.risks || [], reviewNote: o.note || "",
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
        risk("R1", "Unfair outcomes for thin-file applicants", "The model may score applicants with little credit history lower, which could be indirect discrimination.", 3, 4, 2, 3, "Bias testing across age, gender and region before launch; manual review of declines below the cut-off.", "Rohan Gupta", "Mitigating", "tpl-ai-s1-q3"),
        risk("R2", "More bureau attributes than needed", "The feature set pulls 140 bureau attributes; fewer may be enough.", 2, 2, 1, 2, "Feature importance review to drop attributes with no lift.", "Kavya Menon", "Open", "tpl-ai-s2-q2"),
      ],
    }),
    make({
      id: "DPIA-2026-013", name: "New CRM rollout", tpl: "tpl-dpia", desc: "Moving customer service records from the legacy CRM to Salesforce.",
      who: "Kavya Menon", status: "In progress", pct: 40, age: 12, due: 10,
      log: [[-11, "Kavya Menon", "Started the assessment."]],
      risks: [risk("R1", "Legacy records copied without retention rules", "Old tickets past their retention period could be migrated.", 3, 2, 1, 2, "Apply retention filter before migration.", "Kavya Menon", "Open")],
    }),
    make({
      id: "DPIA-2026-012", name: "Co-lending data share", tpl: "tpl-dpia", desc: "Sharing loan and KYC summaries with the NBFC co-lending partner.",
      who: "Daniel Okafor", status: "Under review", pct: 100, age: 26, due: 3, submitted: -2, yes: ["s2-q5"],
      log: [[-25, "Daniel Okafor", "Started the assessment."], [-2, "Daniel Okafor", "Submitted for review."]],
      risks: [
        risk("R1", "Partner uses data beyond co-lending", "The partner could reuse shared KYC data for its own marketing.", 2, 3, 1, 3, "Purpose limitation clause and annual audit right in the co-lending agreement.", "Farah Ahmed", "Mitigating", "tpl-dpia-s2-q5"),
        risk("R2", "Over-sharing of KYC documents", "Full document images are shared where a summary would do.", 3, 3, 2, 2, "Share masked KYC summary only; images on request.", "Daniel Okafor", "Mitigating"),
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
      risks: [risk("R1", "Customer data sent to the model vendor", "Ticket text including account numbers is sent to the LLM provider.", 3, 3, 2, 2, "Redact account numbers and PAN before sending; zero-retention API terms.", "Kavya Menon", "Mitigating")],
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
        risk("R1", "Large volume of financial and ID data", "Applications hold PAN, bank statements and income proofs.", 3, 3, 1, 3, "Encryption at rest, masked display of PAN, quarterly access reviews.", "Kavya Menon", "Accepted", "tpl-dpia-s1-q3"),
        risk("R2", "Applications abandoned midway keep data", "Partial applications were kept indefinitely.", 3, 2, 1, 1, "Delete incomplete applications after 90 days.", "Rohan Gupta", "Closed"),
      ],
    }),
    make({
      id: "DPIA-2026-005", name: "KYC verification", tpl: "tpl-dpia", act: "PA-002", actName: "KYC verification",
      desc: "Identity verification with Aadhaar e-KYC, PAN validation and a face match for new customers.",
      who: "Farah Ahmed", status: "Approved", pct: 100, age: 120, due: -70, submitted: -80, completed: -72, yes: ["s1-q3"],
      log: [[-119, "Farah Ahmed", "Started the assessment."], [-80, "Farah Ahmed", "Submitted for review."], [-72, "Meera Iyer", "Approved."]],
      risks: [risk("R1", "Aadhaar numbers stored in full", "Full Aadhaar numbers could be exposed in a breach.", 2, 4, 1, 3, "Store only the last 4 digits and the reference token from the Aadhaar Data Vault.", "Kavya Menon", "Accepted", "tpl-dpia-s1-q3")],
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

export function createInitialDpiaData() {
  const now = Date.now();
  const templates = buildTemplates(now);
  return {
    templates,
    assessments: buildAssessments(now, templates),
    tasks: buildTasks(now),
  };
}

const dpiaStore = createModuleStore("dpia", createInitialDpiaData);
export const loadDpiaState = () => dpiaStore.get();
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
