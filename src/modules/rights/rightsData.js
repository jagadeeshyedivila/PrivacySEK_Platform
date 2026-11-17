// Demo data and persistence for the Rights Requests (DSAR) module.
// Requests, web forms, workflows and email templates are saved in MongoDB through the
// module store; accounts, roles and option lists are reference data rebuilt on every load.
import { createModuleStore } from "../../platform/moduleStore.js";
import { normalizeForm } from "./forms/formModel.js";

const USER_KEY = "rr_current_user_v1";
const DAY = 864e5;

export const COMPANY = "Aarohan Finance Ltd";

// Request types and the provision each one is raised under
export const REQUEST_TYPES = [
  { id: "Access", ref: "DPDP s.11" },
  { id: "Correction", ref: "DPDP s.12(2)" },
  { id: "Erasure", ref: "DPDP s.12(3)" },
  { id: "Withdraw consent", ref: "DPDP s.6(4)" },
  { id: "Nomination", ref: "DPDP s.14" },
  { id: "Grievance", ref: "DPDP s.13" },
  { id: "Portability", ref: "GDPR Art. 20" },
  { id: "Opt out", ref: "CCPA §1798.120" },
];
export const typeRef = type => (REQUEST_TYPES.find(t => t.id === type) || {}).ref || "—";

// Who the data principal is. Acting for someone else (parent, guardian, nominee) is asked
// separately ("I am submitting for"), so "Nominee" is not a subject type.
export const SUBJECT_TYPES = ["Customer", "Borrower", "Employee", "Contractor"];

// "I am submitting for" on web forms, and the requester relation it maps to
export const ON_BEHALF = [
  ["Myself", "self"],
  ["My child (under 18)", "parent"],
  ["A person under my lawful guardianship", "pwd_guardian"],
  ["As a nominee", "nominee"],
];
export const RELATION_LABELS = { self: "Self", parent: "Parent", lawful_guardian: "Lawful guardian", pwd_guardian: "Lawful guardian (PwD)", nominee: "Nominee" };
export const CHANNELS = ["Rights portal", "Mobile app", "Branch", "Email", "Call centre"];
export const LANGUAGES = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Urdu", "Bengali"];
export const PROPERTIES = ["Aarohan Personal Loans", "Aarohan Gold Loans", "Aarohan HR"];
export const RISKS = ["Low", "Low", "Medium", "High"];
export const REGULATIONS = ["DPDP", "GDPR", "CCPA"];

// Systems Person Finder searches for a data principal's records
export const SYSTEMS = [
  { name: "Salesforce CRM", fields: "Name, email, mobile" },
  { name: "Core banking (core-db)", fields: "Aadhaar, PAN, address, loan account" },
  { name: "MoEngage", fields: "Mobile, consent flags" },
  { name: "SAP HR", fields: "Employee ID, payroll, bank details" },
  { name: "Mailchimp", fields: "Email, campaign history" },
];

export const MACROS = [
  ["[Data Principal Name]", "Full name of the person who raised the request"],
  ["[Request ID]", "The request reference number"],
  ["[Due Date]", "The statutory response deadline"],
  ["[Company privacy team]", "Aarohan Finance privacy team signature"],
];

export const DEMO_ACCOUNTS = [
  { id: "u1", name: "Meera Iyer", email: "meera.iyer@aarohan.example", role: "DPO" },
  { id: "u2", name: "Daniel Okafor", email: "daniel.okafor@aarohan.example", role: "Privacy Team" },
  { id: "u3", name: "Priya Nair", email: "priya.nair@aarohan.example", role: "Auditor" },
];

export const ROLES = {
  DPO: { tabs: ["dashboard", "requests", "forms", "workflows", "templates", "tasks"], edit: true },
  "Privacy Team": { tabs: ["dashboard", "requests", "forms", "workflows", "templates", "tasks"], edit: true },
  Auditor: { tabs: ["dashboard", "requests", "workflows", "tasks"], edit: false },
};

const STAGES = ["New", "Verifying Identity", "In Progress", "Complete"];

const PEOPLE = [
  ["Priya", "Kulkarni", "Maharashtra", "Pune", "Marathi"],
  ["Rahul", "Deshmukh", "Maharashtra", "Mumbai", "English"],
  ["Ananya", "Sharma", "Delhi", "New Delhi", "Hindi"],
  ["Imran", "Qureshi", "Telangana", "Hyderabad", "Urdu"],
  ["Lakshmi", "Narayanan", "Tamil Nadu", "Chennai", "Tamil"],
  ["Suresh", "Patil", "Karnataka", "Bengaluru", "Kannada"],
  ["Farah", "Ahmed", "Uttar Pradesh", "Lucknow", "Hindi"],
  ["Vijay", "Reddy", "Andhra Pradesh", "Vijayawada", "Telugu"],
  ["Arjun", "Mehta", "Gujarat", "Ahmedabad", "English"],
  ["Sneha", "Bose", "West Bengal", "Kolkata", "Bengali"],
  ["Kavya", "Menon", "Kerala", "Kochi", "English"],
  ["Rohit", "Verma", "Rajasthan", "Jaipur", "Hindi"],
];

const DETAILS = {
  Access: "Please share a copy of all personal data you hold about me and how it is used.",
  Correction: "My registered address and date of birth are wrong in my loan account.",
  Erasure: "I have closed my loan. Please delete my personal data that you no longer need.",
  "Withdraw consent": "I withdraw consent for promotional calls and messages.",
  Nomination: "I want to nominate my spouse to exercise my rights if I am unable to.",
  Grievance: "I still receive promotional calls after withdrawing consent.",
  Portability: "Send me my data in a machine-readable format.",
  "Opt out": "Do not sell or share my personal information.",
};

const TASKS_BY_TYPE = {
  Access: ["Locate data in all systems", "Compile response pack", "DPO review"],
  Correction: ["Verify supporting documents", "Update core banking record"],
  Erasure: ["Check legal retention holds", "Run deletion job", "Confirm deletion with vendors"],
  "Withdraw consent": ["Update consent flags", "Notify marketing processors"],
  Nomination: ["Verify nominee identity", "Record nomination"],
  Grievance: ["Investigate complaint", "Draft response", "DPO sign-off"],
  Portability: ["Export data as JSON/CSV", "Secure delivery"],
  "Opt out": ["Suppress record from data sharing"],
};

function seededRandom(seed) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

function systemsFor(type, status) {
  const done = status === "Complete";
  const base = type === "Nomination" || type === "Grievance" ? SYSTEMS.slice(0, 1) : SYSTEMS.slice(0, 3);
  return base.map(s => ({
    name: s.name,
    fields: s.fields,
    action: type === "Erasure" ? (s.name.startsWith("Core") ? "Retain · KYC hold" : "Delete")
      : type === "Correction" ? "Correct" : "Include",
    state: done ? "Searched" : "Not searched",
  }));
}

function buildRequests(now) {
  const rnd = seededRandom(17);
  const pick = list => list[Math.floor(rnd() * list.length)];
  const requests = [];

  // The first requests mirror the cases used across the platform demo (Cockpit, Proof Ledger)
  const fixed = [
    ["DSR-2026-0482", "Access", 0, 21, "In Progress", "Rights portal"],
    ["DSR-2026-0481", "Correction", 1, 22, "In Progress", "Branch"],
    ["DSR-2026-0479", "Erasure", 2, 33, "Verifying Identity", "Email"],
    ["DSR-2026-0476", "Withdraw consent", 3, 34, "Complete", "Mobile app"],
    ["GRV-2026-0471", "Grievance", 4, 86, "In Progress", "Call centre"],
    ["GRV-2026-0468", "Grievance", 5, 88, "New", "Rights portal"],
    ["NOM-2026-0466", "Nomination", 6, 45, "Complete", "Mobile app"],
    ["DSR-2026-0460", "Access", 7, 47, "Complete", "Rights portal"],
  ];

  fixed.forEach(([id, type, pi, age, status, channel]) => {
    requests.push(makeRequest({ id, type, person: PEOPLE[pi], age, status, channel, rnd, pick, now }));
  });

  // Requests filed by a parent, a lawful guardian or a nominee for someone else. Under DPDP
  // s.2(j) the parent or lawful guardian is the Data Principal for a child or a person with
  // disability, so they exercise the rights. The link comes from Consent's relationships.
  // [id, type, principal (as PEOPLE row), age, status, channel, requester]
  const onBehalf = [
    ["DSR-2026-0491", "Erasure", ["Aarav", "K.", "Maharashtra", "Pune", "Marathi"], 3, "Verifying Identity", "Rights portal",
      { relation: "parent", name: "Priya Kulkarni", principalId: "DP-04471", dependentId: "DP-10482", relationshipId: "REL-0031", verification: { method: null, simulated: true, result: "pending" } }],
    ["DSR-2026-0489", "Access", ["Diya", "S.", "Delhi", "New Delhi", "Hindi"], 6, "In Progress", "Mobile app",
      { relation: "parent", name: "Ananya Sharma", principalId: "DP-04512", dependentId: "DP-10511", relationshipId: "REL-0032", verification: { method: "existing_kyc_record", simulated: true, result: "passed" } }],
    ["DSR-2026-0487", "Withdraw consent", ["Kabir", "R.", "Andhra Pradesh", "Vijayawada", "Telugu"], 1, "New", "Rights portal",
      { relation: "parent", name: "Vijay Reddy", principalId: "DP-04530", dependentId: "DP-10530", relationshipId: "REL-0033", verification: { method: null, simulated: true, result: "pending" } }],
    ["DSR-2026-0485", "Correction", ["Suresh", "Narayanan", "Tamil Nadu", "Chennai", "Tamil"], 4, "Verifying Identity", "Branch",
      { relation: "pwd_guardian", name: "Lakshmi Narayanan", principalId: "DP-03311", dependentId: "DP-03310", relationshipId: "REL-0036", verification: { method: null, simulated: true, result: "pending" } }],
    ["NOM-2026-0484", "Access", ["Mohan", "Iyer", "Karnataka", "Bengaluru", "Kannada"], 8, "Verifying Identity", "Email",
      { relation: "nominee", name: "Revathi Iyer", principalId: null, dependentId: null, relationshipId: null, nominationId: "NOM-0012", evidence: "death_certificate", verification: { method: null, simulated: true, result: "pending" } }],
  ];
  onBehalf.forEach(([id, type, person, age, status, channel, requester]) => {
    const r = makeRequest({ id, type, person, age, status, channel, rnd, pick, now });
    // Subject type describes the data principal; who filed is in r.requester
    r.subject = requester.relation === "nominee" ? "Customer (deceased)"
      : requester.relation === "pwd_guardian" ? "Person with disability (via guardian)" : "Child (via guardian)";
    r.principalId = requester.dependentId;
    // Replies go to the person who filed. A child has no email of their own on record; a
    // deceased principal keeps theirs, shown apart from the nominee's.
    requester.email = `${requester.name}`.toLowerCase().replace(/\s+/g, ".") + "@example.in";
    if (requester.relation !== "nominee") r.email = "";
    r.requester = requester;
    const forWhom = requester.relation === "pwd_guardian" ? "the person under my guardianship" : "my child";
    const ask = {
      Erasure: `My child was added as a co-applicant on a loan that was never taken. Please delete my child's personal data.`,
      Access: `Please share a copy of the personal data you hold about ${forWhom} and how it is used.`,
      "Withdraw consent": `I withdraw consent for ${forWhom}'s progress reports and lesson reminders on Money Smart.`,
      Correction: `The address and date of birth recorded for ${forWhom} are wrong.`,
    }[type] || DETAILS[type];
    r.details = requester.relation === "nominee"
      ? "I am the registered nominee. The account holder has passed away. Please share the data you hold so I can close the accounts."
      : `I am submitting this for ${forWhom}. ${ask}`;
    // Verifying the guardian replaces the plain OTP step
    r.activity = r.activity.map(a => /Identity verified with OTP/.test(a.text) ? { ...a, text: "Guardian identity and relationship verified (simulated). Status advanced to In Progress." } : a);
    requests.push(r);
  });

  for (let i = 0; i < 30; i++) {
    const type = pick(REQUEST_TYPES).id;
    const r = rnd();
    const stageIdx = r < 0.18 ? 0 : r < 0.36 ? 1 : r < 0.6 ? 2 : 3;
    const status = rnd() < 0.1 ? "Rejected" : STAGES[stageIdx];
    const prefix = type === "Grievance" ? "GRV" : type === "Nomination" ? "NOM" : "DSR";
    const id = `${prefix}-2026-${String(400 + i * 2).padStart(4, "0")}`;
    // Open requests are recent; closed ones spread across the year
    const age = status === "Complete" || status === "Rejected" ? Math.floor(rnd() * 200) + 10 : Math.floor(rnd() * 34) + 1;
    requests.push(makeRequest({ id, type, person: pick(PEOPLE), age, status, channel: pick(CHANNELS), rnd, pick, now }));
  }
  return requests.sort((a, b) => new Date(b.created) - new Date(a.created));
}

function makeRequest({ id, type, person, age, status, channel, rnd, pick, now }) {
  const [first, last, state, city, language] = person;
  const created = new Date(now - age * DAY);
  // Only the grievance limit is statutory under DPDP (Rule 14(3)); the rest is internal policy
  const slaDays = type === "Grievance" ? 90 : 30;
  const slaType = type === "Grievance" ? "statutory" : "internal";
  const deadline = new Date(created.getTime() + slaDays * DAY);
  const completedAt = status === "Complete"
    ? new Date(Math.min(now - DAY, created.getTime() + (4 + Math.floor(rnd() * 34)) * DAY))
    : null;
  const stageIdx = STAGES.indexOf(status);
  const activity = [{ at: created.toISOString(), by: "System", text: `Request received via ${channel}.` }];
  if (stageIdx >= 1 || status === "Rejected") activity.push({ at: new Date(created.getTime() + DAY).toISOString(), by: "Meera Iyer", text: "Status advanced to Verifying Identity." });
  if (stageIdx >= 2) activity.push({ at: new Date(created.getTime() + 2 * DAY).toISOString(), by: "Daniel Okafor", text: "Identity verified with OTP. Status advanced to In Progress." });
  if (status === "Complete") activity.push({ at: completedAt.toISOString(), by: "Meera Iyer", text: "Response sent. Status advanced to Complete." });
  if (status === "Rejected") activity.push({ at: new Date(created.getTime() + 3 * DAY).toISOString(), by: "Meera Iyer", text: "Request rejected: identity could not be verified." });

  const taskTitles = TASKS_BY_TYPE[type] || [];
  const tasks = stageIdx >= 2 ? taskTitles.map((title, k) => ({
    id: `t${k + 1}`,
    title,
    done: status === "Complete" || k === 0,
  })) : [];

  const subject = type === "Nomination" ? "Customer" : pick(["Customer", "Customer", "Borrower", "Employee"]);
  return {
    id,
    type,
    subject,
    status,
    first,
    last,
    email: `${first}.${last}`.toLowerCase() + "@example.in",
    mobile: `+91 98${Math.floor(rnd() * 900 + 100)} ••${Math.floor(rnd() * 900 + 100)}`,
    state,
    city,
    country: "India",
    language,
    channel,
    form: subject === "Employee" ? "form-employee" : "form-portal",
    property: pick(PROPERTIES.slice(0, 2)),
    approver: pick(["Meera Iyer", "Daniel Okafor"]),
    workflow: `DPDP ${type} Workflow`,
    risk: type === "Grievance" ? "High" : pick(RISKS),
    details: DETAILS[type],
    created: created.toISOString(),
    updated: (completedAt || new Date(created.getTime() + Math.min(age, 3) * DAY)).toISOString(),
    deadline: deadline.toISOString(),
    slaType,
    slaDays,
    completedAt: completedAt ? completedAt.toISOString() : null,
    verified: stageIdx >= 2 || status === "Complete",
    rejectReason: status === "Rejected" ? "Identity could not be verified." : "",
    activity,
    emails: [],
    tasks,
    systems: systemsFor(type, status),
  };
}

function buildWorkflows(now) {
  const list = [];
  const types = REQUEST_TYPES.map(t => t.id);
  REGULATIONS.forEach(reg => {
    const regTypes = reg === "DPDP" ? types.slice(0, 6) : reg === "GDPR" ? ["Access", "Erasure", "Portability", "Correction"] : ["Access", "Erasure", "Opt out"];
    regTypes.forEach((type, ti) => {
      const n = list.length;
      list.push({
        id: `wf-${n + 1}`,
        name: `${reg} ${type} Workflow`,
        regulation: reg,
        requestType: type,
        status: n % 7 === 6 ? "Draft" : "Active",
        slaDays: type === "Grievance" ? 90 : reg === "CCPA" ? 45 : 30,
        steps: STAGES.slice(),
        createdBy: "Meera Iyer",
        updatedBy: ti % 2 ? "Daniel Okafor" : "Meera Iyer",
        created: new Date(now - (220 - n * 4) * DAY).toISOString(),
        updated: new Date(now - (70 - n * 2) * DAY).toISOString(),
      });
    });
  });
  return list;
}

export function createInitialRightsData() {
  const now = Date.now();
  return {
    requests: buildRequests(now),
    forms: [
      {
        id: "form-portal",
        name: "Data Principal Rights Portal",
        identifier: "rights-portal",
        property: "Aarohan Personal Loans",
        status: "Published",
        created: new Date(now - 300 * DAY).toISOString(),
        updated: new Date(now - 12 * DAY).toISOString(),
        languages: ["English", "Hindi", "Marathi", "Tamil"],
        requestTypes: REQUEST_TYPES.slice(0, 6).map(t => t.id),
        subjectTypes: ["Customer", "Borrower"],
        headerColor: "#0f766e",
        headerText: "#ffffff",
        headerSize: 24,
        footerColor: "#f1f3f6",
        footerSize: 12,
        welcome: "Use this form to access, correct or erase your data, nominate someone, or raise a grievance. We respond within our published timelines; grievances within 90 days (DPDP Rules, Rule 14(3)).",
        footer: "Aarohan Finance Ltd · Grievance Officer: dpo@aarohan.example · You may also complain to the Data Protection Board of India.",
        deadlineDays: 30,
        captcha: true,
        verifyOtp: true,
        verification: "OTP to registered mobile",
        systems: SYSTEMS.slice(0, 3).map(s => s.name),
        custom: [{ type: "Textbox", label: "Loan account number", required: false, options: [] }],
        history: [
          { v: 3, at: new Date(now - 12 * DAY).toISOString(), by: "Meera Iyer", name: "Data Principal Rights Portal" },
          { v: 2, at: new Date(now - 90 * DAY).toISOString(), by: "Daniel Okafor", name: "Data Principal Rights Portal" },
          { v: 1, at: new Date(now - 300 * DAY).toISOString(), by: "Meera Iyer", name: "Customer Rights Form" },
        ],
      },
      {
        id: "form-employee",
        name: "Employee Data Request Form",
        identifier: "employee-requests",
        property: "Aarohan HR",
        status: "Draft",
        created: new Date(now - 40 * DAY).toISOString(),
        updated: new Date(now - 5 * DAY).toISOString(),
        languages: ["English", "Hindi"],
        requestTypes: ["Access", "Correction", "Erasure"],
        subjectTypes: ["Employee", "Contractor"],
        headerColor: "#1e3a8a",
        headerText: "#ffffff",
        headerSize: 22,
        footerColor: "#f1f3f6",
        footerSize: 12,
        welcome: "Employees and contractors can use this form to exercise their data rights.",
        footer: "Aarohan Finance HR · hr-privacy@aarohan.example",
        deadlineDays: 30,
        captcha: false,
        verifyOtp: true,
        verification: "Employee SSO",
        systems: ["SAP HR"],
        custom: [{ type: "Textbox", label: "Employee ID", required: true, options: [] }],
        history: [],
      },
    ].map(normalizeForm),
    workflows: buildWorkflows(now),
    templates: [
      {
        id: "tpl-ack",
        name: "Request acknowledgement",
        body: "Dear [Data Principal Name],<br><br>We have received your request <b>[Request ID]</b> and will respond by [Due Date].<br><br>Regards,<br>[Company privacy team]",
        created: new Date(now - 200 * DAY).toISOString(),
        updated: new Date(now - 200 * DAY).toISOString(),
      },
      {
        id: "tpl-verify",
        name: "Identity verification reminder",
        body: "Hello [Data Principal Name],<br><br>Please verify your identity using the OTP we sent to your registered mobile so we can continue with request [Request ID].<br><br>[Company privacy team]",
        created: new Date(now - 150 * DAY).toISOString(),
        updated: new Date(now - 60 * DAY).toISOString(),
      },
      {
        id: "tpl-done",
        name: "Request completed",
        body: "Dear [Data Principal Name],<br><br>Your request [Request ID] is complete. If you are not satisfied with our response, you may complain to the Data Protection Board of India.<br><br>[Company privacy team]",
        created: new Date(now - 120 * DAY).toISOString(),
        updated: new Date(now - 30 * DAY).toISOString(),
      },
    ],
  };
}

const rightsStore = createModuleStore("rights", createInitialRightsData);

export function loadRightsState() {
  return rightsStore.get();
}

export function saveRightsState(state) {
  return rightsStore.save(state);
}

// Async: resolves with the same state object, refilled with the demo data
export function resetRightsState() {
  return rightsStore.reset();
}

export function loadCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (ROLES[user.role]) return user;
    }
  } catch (e) { /* storage blocked */ }
  return DEMO_ACCOUNTS[0];
}

export function saveCurrentUser(user) {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) { /* storage blocked */ }
}
