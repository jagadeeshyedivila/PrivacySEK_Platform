// Data Map & ROPA module configuration: tabs, option lists, wizard step specs, roles
// Aarohan Finance (NBFC, India, DPDP-first, GDPR for EU customers)

export const PAGE_SIZE = 10;

// Record types. `tab` is the module tab the record lives under.
export const RECORD_TYPES = {
  act: { tab: "act", prefix: "PA", noun: "activity", label: "Processing activity", plural: "activities", add: "Add activity" },
  ast: { tab: "ast", prefix: "AS", noun: "asset", label: "Asset", plural: "assets", add: "Add asset" },
  ven: { tab: "par", prefix: "VN", noun: "vendor", label: "Vendor", plural: "vendors", add: "Add vendor" },
  cus: { tab: "par", prefix: "CU", noun: "customer", label: "Customer", plural: "customers", add: "Add customer" },
  com: { tab: "par", prefix: "CO", noun: "company", label: "Company", plural: "companies", add: "Add company" },
  oth: { tab: "par", prefix: "OT", noun: "third party", label: "Other third party", plural: "records", add: "Add other" },
  pol: { tab: "pol", prefix: "PO", noun: "policy", label: "Policy", plural: "policies", add: "Add policy" },
  doc: { tab: "doc", prefix: "DC", noun: "document", label: "Document", plural: "documents", add: "Add document" }
};

export const PARTY_TABS = [["ven", "Vendors"], ["cus", "Customers"], ["com", "Companies"], ["oth", "Others"]];

/* ---------------- option lists ---------------- */

export const USERS = [
  ["Meera Iyer", "DPO"],
  ["Arjun Rao", "Deputy DPO"],
  ["Kavya Menon", "Lending Ops"],
  ["Rohit Shah", "Compliance"],
  ["Ananya Das", "Growth"],
  ["Vikram Pillai", "IT Security"],
  ["Sana Qureshi", "HR"]
];

export const CAT_GOV = "Government identifiers (Aadhaar, PAN, Voter ID, Passport)";
export const CAT_FIN = "Financial (bank, income, bureau, transactions)";
export const CAT_BIO = "Biometric / photo";
export const CAT_VOICE = "Voice recordings";
export const DPC_CHILD = "Children (under 18)";

export const ATTRS = {
  "Identity": ["Full name", "Date of birth", "Gender", "Father's / spouse's name"],
  "Contact": ["Mobile number", "Email address", "Postal address"],
  [CAT_GOV]: ["Aadhaar number", "PAN", "Passport no.", "Voter ID", "Driving licence"],
  [CAT_FIN]: ["Bank account", "Income", "CIBIL score", "Transaction history", "Loan details", "UPI ID", "Card number"],
  [CAT_BIO]: ["Photograph", "Signature", "Face match score"],
  "Location": ["GPS location", "IP-based location"],
  [CAT_VOICE]: ["Call recording"],
  "Device & online identifiers": ["Device ID", "IP address", "Advertising ID", "App events"],
  "Employment": ["Employee ID", "Designation", "Salary", "Attendance"]
};

export const COUNTRIES = ["India", "Germany", "Netherlands", "United Kingdom", "Singapore", "United States", "UAE"];
export const BUSINESS_UNITS = ["Retail Lending", "Gold Loans", "Digital & Cards", "Collections", "HR", "Growth", "Risk", "Compliance"];
export const REGULATIONS = ["DPDP Act 2023 (India)", "EU GDPR", "UK GDPR", "RBI Master Directions (sectoral)", "PMLA 2002"];

export const RETENTION = [
  "Until consent is withdrawn",
  "1 year (minimum log retention)",
  "3 years after last interaction",
  "5 years after relationship ends (RBI KYC / PMLA)",
  "8 years after loan closure (books of account)",
  "Custom…"
];

// Retention in years, used by R-19. Custom periods are computed from retn/retu.
export const RETENTION_YEARS = {
  "Until consent is withdrawn": 0,
  "1 year (minimum log retention)": 1,
  "3 years after last interaction": 3,
  "5 years after relationship ends (RBI KYC / PMLA)": 5,
  "8 years after loan closure (books of account)": 8
};

export const DPDP_ROLES = ["Data Fiduciary", "Data Processor", "Significant Data Fiduciary"];
export const GDPR_ROLES = ["Controller", "Processor", "Joint controller"];

export const DPDP_BASES = [
  "Consent (s.6)",
  "Voluntarily provided for a specified purpose (s.7(a))",
  "State function (s.7(b))",
  "Legal obligation (s.7(c))",
  "Court order (s.7(d))",
  "Medical emergency (s.7(e))",
  "Employment purposes (s.7(i))"
];
export const GDPR_BASES = [
  "Consent – Art. 6(1)(a)",
  "Contract – Art. 6(1)(b)",
  "Legal obligation – Art. 6(1)(c)",
  "Vital interests – Art. 6(1)(d)",
  "Public task – Art. 6(1)(e)",
  "Legitimate interests – Art. 6(1)(f)"
];

export const OPTIONS = {
  yn: ["Yes", "No"],
  ynu: ["Yes", "No", "Not yet decided"],
  regs: REGULATIONS,
  bu: BUSINESS_UNITS,
  purp: ["Credit decision", "Loan disbursal", "KYC & AML", "Collateral valuation", "Collections", "Customer support", "Marketing", "Fraud prevention", "Payroll", "Recruitment", "Analytics"],
  dpc: ["Customers", "Prospects / leads", "Co-borrowers & guarantors", "Nominees", "Employees", "Job applicants", "Website & app visitors", DPC_CHILD],
  cat: Object.keys(ATTRS),
  mode: ["Mobile app", "Website", "Branch form", "Call centre", "Partner API", "Video KYC"],
  freq: ["Continuous", "Daily", "Weekly", "Monthly", "One-time"],
  srct: ["Directly from the data principal", "Third party", "Public source"],
  cty: COUNTRIES,
  hold: ["Employees", "Contractors", "Vendors"],
  afq: ["Continuous", "Daily", "Weekly", "Monthly", "Rarely"],
  erole: ["Data Processor", "Independent Data Fiduciary", "Joint Data Fiduciary", "Sub-processor", "Government / regulator"],
  xm: ["API", "SFTP", "Cloud replication", "Email", "Remote access"],
  xs: ["Adequacy decision", "Standard Contractual Clauses", "Binding Corporate Rules", "Explicit consent (Art. 49)", "Contract necessity (Art. 49)"],
  ret: RETENTION,
  retu: ["Months", "Years"],
  dm: ["Secure wipe", "Cryptographic erasure", "Physical destruction", "Anonymisation"],
  rest: ["AES-256 encryption", "Disk encryption", "Tokenisation", "Masking", "Aadhaar Data Vault"],
  tr: ["TLS 1.3", "TLS 1.2", "HTTPS", "VPN / private link"],
  orgm: ["Role-based access", "MFA", "Access logs retained ≥ 1 year", "Quarterly access review", "Backups tested", "Vendor security clauses", "Staff privacy training"],
  stype: ["On-premises", "Cloud", "Hybrid"],
  net: ["Private VPC", "Internal LAN", "VPN / private link", "Public internet"],
  del: RETENTION.filter(r => r !== "Custom…"),
  secm: ["AES-256 encryption", "Tokenisation", "Masking", "Role-based access", "MFA", "Access logs retained ≥ 1 year", "Backups tested", "Network segmentation"],
  etype: ["Vendor", "Customer", "Company", "Supplier", "Credit bureau", "Government body", "Auditor", "Other"],
  atype: ["Audit not required", "Written confirmation", "Audit statement / SOC 2 / ISO 27001 certificate", "Self-assessment questionnaire", "On-site audit"],
  afreq: ["Annually", "Semi-annually", "Quarterly", "Ad hoc"],
  ptype: ["Privacy notice", "Cookie policy", "Retention policy", "Information security policy", "Grievance redressal policy", "Vendor management policy"],
  cfType: ["Text", "Number", "Date", "Dropdown", "Multi select"]
};

// Fallback systems list when Discovery has no connections
export const FALLBACK_SYSTEMS = ["core-banking-db", "los-db", "gl-db", "finacle-core", "Salesforce CRM", "moengage-campaigns", "sap-successfactors", "s3-kyc-docs", "freshdesk-support", "BigQuery Analytics"];

// Hints used by "Import from Data Discovery" on the asset wizard
export const DISCOVERY_HINTS = {
  "sap-successfactors": { loc: "Germany", stype: "Cloud" },
  "BigQuery Analytics": { loc: "United States", stype: "Cloud" },
  "Salesforce CRM": { loc: "Singapore", stype: "Cloud" },
  "s3-kyc-docs": { loc: "India", stype: "Cloud" },
  "azure-loan-archive": { loc: "India", stype: "Cloud" },
  "google-workspace-drive": { loc: "India", stype: "Cloud" }
};

// Discovery classification label → ROPA data category
export const DISCOVERY_CLASS_MAP = [
  [/aadhaar|pan card|passport|voter|driving/i, CAT_GOV],
  [/bank|upi|card|income|credit score|balance|compensation|loan|ifsc|provident/i, CAT_FIN],
  [/biometric|photo|facial/i, CAT_BIO],
  [/phone|email|address/i, "Contact"],
  [/full name|date of birth/i, "Identity"],
  [/device|ip address|session/i, "Device & online identifiers"],
  [/city|region/i, "Location"],
  [/employment/i, "Employment"]
];

/* ---------------- helpers for dynamic options ---------------- */

export function userOpts() {
  return USERS.map(u => ({ v: u[0], l: u[0] + " · " + u[1] }));
}

export function regsFlags(d) {
  const regs = (d && d.regs) || [];
  const dpdp = regs.some(r => r.indexOf("DPDP") === 0);
  const gdpr = regs.some(r => /GDPR/.test(r));
  // Sectoral-only selections are Indian law, so treat them as DPDP scope
  return { dpdp: dpdp || !gdpr, gdpr, both: dpdp && gdpr };
}

export function roleOpts(d) {
  const f = regsFlags(d);
  if (f.both) return DPDP_ROLES.map(r => ({ v: r, l: r + " (DPDP)" })).concat(GDPR_ROLES.map(r => ({ v: r, l: r + " (GDPR)" })));
  return f.gdpr ? GDPR_ROLES : DPDP_ROLES;
}

export function lawOpts(d) {
  const f = regsFlags(d);
  if (f.both) return DPDP_BASES.map(b => ({ v: b, l: b + " · DPDP" })).concat(GDPR_BASES.map(b => ({ v: b, l: b + " · GDPR" })));
  return f.gdpr ? GDPR_BASES : DPDP_BASES;
}

export function attrOpts(d) {
  const out = [];
  ((d && d.cat) || []).forEach(c => (ATTRS[c] || []).forEach(a => { if (out.indexOf(a) < 0) out.push(a); }));
  return out;
}

export const isYes = v => v === "Yes";
export const has = (arr, v) => Array.isArray(arr) && arr.indexOf(v) > -1;

/* ---------------- wizard step specs ----------------
   Step spec: { t, short, fields }. `short` names the lifecycle stage in the register.
   Field spec: { k, l, t, req, opts, showIf, help, max, full, prune, unique, noFuture, group }
   - group: starts a titled sub-section of the step at this field
   - t: select | multi | text | textarea | date | url | email | number | import
   - req: boolean or (data, ctx) => boolean
   - opts: key into OPTIONS, array, or (data, ctx) => options. ctx = { store, systems, type, id }
*/

const nameOf = r => r.name;

export function getSteps(type, ctx) {
  const store = ctx.store;
  const companies = () => (store.com || []).map(nameOf);
  const vendors = () => (store.ven || []).map(nameOf);
  const systems = () => ctx.systems;

  if (type === "act") {
    const steps = [
      { t: "Business process", short: "Business context", fields: [
        { k: "entity", group: "Organisation", l: "Entity (legal name)", t: "select", req: true, opts: companies },
        { k: "bu", l: "Business unit", t: "select", req: true, opts: "bu" },
        { k: "regs", l: "Applicable regulation(s)", t: "multi", req: true, opts: "regs", full: true },
        { k: "role", l: "Processing capacity", t: "select", req: true, opts: roleOpts, help: "Options follow the regulations you pick." },
        { k: "date", group: "Accountability", l: "Date of initial assessment", t: "date", req: true, noFuture: true },
        { k: "dpo", l: "DPO / grievance contact", t: "select", req: true, opts: () => [{ v: "Meera Iyer", l: "Meera Iyer (DPO)" }, { v: "Arjun Rao", l: "Arjun Rao (Deputy DPO)" }] }
      ] },
      { t: "Processing activity", short: "Purpose & data", fields: [
        { k: "name", group: "Purpose & lawful basis", l: "Activity name", t: "text", req: true, unique: true, max: 80 },
        { k: "sub", l: "Sub-processing activities", t: "text", help: "Separate with commas.", chips: true },
        { k: "desc", l: "Description", t: "textarea", req: true, max: 600, full: true },
        { k: "purp", l: "Purpose(s)", t: "multi", req: true, opts: "purp", full: true },
        { k: "law", l: "Lawful basis", t: "select", req: true, opts: lawOpts },
        { k: "dpia", l: "DPIA required?", t: "select", req: true, opts: "ynu" },
        { k: "dpiaWhy", l: "Reason for not running a DPIA", t: "textarea", req: true, full: true, showIf: d => d.dpia === "No" && d._dpiaRec },
        { k: "dpc", group: "Data involved", l: "Data principal categories", t: "multi", req: true, opts: "dpc", full: true },
        { k: "cat", l: "Personal data categories", t: "multi", req: true, opts: "cat", full: true },
        { k: "attr", l: "Data attributes", t: "multi", req: true, opts: attrOpts, prune: true, full: true, help: "Pick categories first. Attributes follow them." },
        { k: "ai", group: "Automated decisions", l: "Uses AI, ML or automated decision-making?", t: "select", req: true, opts: "yn" },
        { k: "aip", l: "AI purpose", t: "text", req: true, showIf: d => isYes(d.ai) },
        { k: "adm", l: "Decision made without human review?", t: "select", req: true, opts: "yn", showIf: d => isYes(d.ai) },
        { k: "owner", group: "Ownership", l: "Business process owner", t: "select", req: true, opts: userOpts },
        { k: "poc", l: "Point of contact", t: "select", req: true, opts: userOpts },
        { k: "apps", group: "Collection", l: "Applications & systems", t: "multi", req: true, opts: systems, full: true, help: "From Data Discovery connections." },
        { k: "mode", l: "Collection mode", t: "multi", req: true, opts: "mode", full: true },
        { k: "freq", l: "Collection frequency", t: "select", req: true, opts: "freq" },
        { k: "srct", l: "Data source", t: "select", req: true, opts: "srct" },
        { k: "srcj", l: "Source jurisdiction", t: "multi", req: true, opts: "cty", full: true }
      ] },
      { t: "Data storage", short: "Storage", fields: [
        { k: "ssys", group: "Where it lives", l: "Storage systems", t: "multi", req: true, opts: systems, full: true },
        { k: "sjur", l: "Storage jurisdiction", t: "multi", req: true, opts: "cty", full: true },
        { k: "hold", group: "Access", l: "Who can access", t: "multi", req: true, opts: "hold" },
        { k: "afq", l: "Access frequency", t: "select", req: true, opts: "afq" },
        { k: "bak", group: "Backups & copies", l: "Backup available?", t: "select", req: true, opts: "yn" },
        { k: "bjur", l: "Backup jurisdiction", t: "multi", req: true, opts: "cty", full: true, showIf: d => isYes(d.bak) },
        { k: "copy", l: "Personal data copies?", t: "select", req: true, opts: "yn" },
        { k: "csys", l: "Copy storage system", t: "text", req: true, showIf: d => isYes(d.copy) }
      ] },
      { t: "Data transfer", short: "Transfer", fields: [
        { k: "int", group: "Internal sharing", l: "Internal transfer?", t: "select", req: true, opts: "yn" },
        { k: "irec", l: "Internal recipients", t: "multi", req: true, opts: "bu", full: true, showIf: d => isYes(d.int) },
        { k: "ipur", l: "Internal purpose", t: "text", req: true, showIf: d => isYes(d.int) },
        { k: "ext", group: "External recipients", l: "External transfer?", t: "select", req: true, opts: "yn" },
        { k: "erec", l: "External recipients", t: "multi", req: true, opts: vendors, full: true, showIf: d => isYes(d.ext), help: "From the Vendors list." },
        { k: "epur", l: "External purpose", t: "text", req: true, showIf: d => isYes(d.ext) },
        { k: "erole", l: "Recipient role", t: "select", req: true, opts: "erole", showIf: d => isYes(d.ext) },
        { k: "dpa", l: "Contract / DPA signed?", t: "select", req: true, opts: "yn", showIf: d => isYes(d.ext) },
        { k: "dpal", l: "DPA link", t: "url", req: true, showIf: d => isYes(d.ext) && isYes(d.dpa) },
        { k: "xb", group: "Cross-border", l: "Cross-border transfer?", t: "select", req: true, opts: "yn" },
        { k: "xc", l: "Recipient countries", t: "multi", req: true, opts: "cty", full: true, showIf: d => isYes(d.xb) },
        { k: "xr", l: "Restrictions noted", t: "textarea", req: true, full: true, showIf: d => isYes(d.xb) },
        { k: "xm", l: "Transfer mode", t: "select", req: true, opts: "xm", showIf: d => isYes(d.xb) },
        { k: "xs", l: "Safeguards", t: "multi", req: d => regsFlags(d).gdpr, opts: "xs", full: true, showIf: d => isYes(d.xb), help: "Required when EU or UK GDPR applies." },
        { k: "xl", l: "Safeguard document link", t: "url", req: true, showIf: d => isYes(d.xb) && Array.isArray(d.xs) && d.xs.length > 0 }
      ] },
      { t: "Retention & disposal", short: "Retention", fields: [
        { k: "ret", group: "Retention", l: "Retention period", t: "select", req: true, opts: "ret" },
        { k: "retn", l: "Custom period", t: "number", req: true, showIf: d => d.ret === "Custom…" },
        { k: "retu", l: "Unit", t: "select", req: true, opts: "retu", showIf: d => d.ret === "Custom…" },
        { k: "rett", l: "Retention trigger", t: "text", req: true, showIf: d => d.ret === "Custom…", help: "For example: after the loan account is closed." },
        { k: "retp", l: "Retention reason", t: "text", req: true },
        { k: "dm", group: "Disposal", l: "Disposal method", t: "select", req: true, opts: "dm" },
        { k: "do", l: "Disposal owner", t: "select", req: true, opts: userOpts }
      ] },
      { t: "Security measures", short: "Security", fields: [
        { k: "sec", l: "Security measures applied?", t: "select", req: true, opts: "yn" },
        { k: "rest", l: "At rest", t: "multi", req: true, opts: "rest", full: true, showIf: d => isYes(d.sec) },
        { k: "tr", l: "In transit", t: "multi", req: true, opts: "tr", full: true, showIf: d => isYes(d.sec) },
        { k: "orgm", l: "Organisational", t: "multi", req: true, opts: "orgm", full: true, showIf: d => isYes(d.sec) }
      ] }
    ];
    const cf = store.cf || [];
    if (cf.length) {
      steps.push({ t: "Additional details", short: "Custom fields", fields: cf.map(customFieldSpec) });
    }
    return steps;
  }

  if (type === "ast") {
    return [
      { t: "Description", fields: [
        { k: "dsrc", l: "Import from Data Discovery", t: "import", opts: systems, full: true, help: "Optional. Pre-fills name, storage and data categories from the last scan." },
        { k: "name", l: "Asset name", t: "text", req: true, unique: true, max: 80 },
        { k: "purp", l: "Purpose", t: "select", req: true, opts: "purp" },
        { k: "desc", l: "Description", t: "textarea", max: 600, full: true }
      ] },
      { t: "Association", fields: [
        { k: "resp", l: "Person responsible", t: "select", req: true, opts: userOpts },
        { k: "area", l: "Business area", t: "select", req: true, opts: "bu" },
        { k: "dist", l: "Distribution areas", t: "multi", req: true, opts: "bu", full: true },
        { k: "acts", l: "Linked processing activities", t: "multi", opts: () => (store.act || []).map(a => ({ v: a.id, l: a.id + " · " + a.name })), full: true }
      ] },
      { t: "Data storage", fields: [
        { k: "stype", l: "Storage type", t: "select", req: true, opts: "stype" },
        { k: "etype", l: "Owning entity", t: "select", req: true, opts: companies },
        { k: "host", l: "Hosting provider", t: "select", opts: vendors },
        { k: "loc", l: "Storage location", t: "select", req: true, opts: "cty" },
        { k: "cat", l: "Data categories", t: "multi", req: true, opts: "cat", full: true },
        { k: "ds", l: "Data subjects", t: "multi", req: true, opts: "dpc", full: true },
        { k: "net", l: "Network type", t: "select", req: true, opts: "net" },
        { k: "sup", l: "Vendor support access?", t: "select", req: true, opts: "yn" }
      ] },
      { t: "Supplier", fields: [
        { k: "supp", l: "Supplier", t: "select", opts: vendors },
        { k: "contract", l: "Contract reference", t: "text" }
      ] },
      { t: "Asset information", fields: [
        { k: "pol", l: "Policies", t: "multi", req: true, opts: () => (store.pol || []).map(nameOf), full: true },
        { k: "del", l: "Deletion period", t: "select", req: true, opts: "del" },
        { k: "crit", l: "Business-critical?", t: "select", req: true, opts: "yn" },
        { k: "secm", l: "Security measures", t: "multi", req: true, opts: "secm", full: true }
      ] },
      { t: "Artificial intelligence", fields: [
        { k: "ai", l: "Does the asset use AI?", t: "select", req: true, opts: "yn" },
        { k: "aid", l: "Describe the AI use", t: "textarea", req: true, full: true, showIf: d => isYes(d.ai) },
        { k: "hr", l: "High-risk AI?", t: "select", req: true, opts: "yn", showIf: d => isYes(d.ai) },
        { k: "train", l: "Org data used to train models?", t: "select", req: true, opts: "yn", showIf: d => isYes(d.ai) }
      ] }
    ];
  }

  if (type === "ven" || type === "cus" || type === "com" || type === "oth") {
    const auditReq = () => type === "ven";
    return [
      { t: "Description", fields: [
        { k: "name", l: "Name", t: "text", req: true, unique: true, max: 80 },
        { k: "etype", l: "Entity type", t: "multi", req: true, opts: "etype", full: true },
        { k: "desc", l: "Description", t: "textarea", max: 600, full: true },
        { k: "web", l: "Website", t: "url", req: true }
      ] },
      { t: "Address", fields: [
        { k: "addr", l: "Address", t: "text", req: true, full: true },
        { k: "city", l: "City", t: "text", req: true },
        { k: "state", l: "State / province", t: "text", req: true },
        { k: "country", l: "Country", t: "select", req: true, opts: "cty" },
        { k: "zip", l: "PIN / postal code", t: "text", req: true }
      ] },
      { t: "Association", fields: [
        { k: "resp", l: "Person responsible", t: "select", req: true, opts: userOpts },
        { k: "area", l: "Business area", t: "select", req: true, opts: "bu" }
      ] },
      { t: "Audit", fields: [
        { k: "atype", l: "Audit type", t: "select", req: auditReq, opts: "atype", help: type === "ven" ? "" : "Optional for this record type." },
        { k: "afreq", l: "Audit frequency", t: "select", req: auditReq, opts: "afreq" }
      ] },
      { t: "Contact", fields: [
        { k: "cname", l: "Contact name", t: "text", req: true },
        { k: "cemail", l: "Contact email", t: "email", req: true },
        { k: "crole", l: "Contact role", t: "text", req: true },
        { k: "cphone", l: "Contact phone", t: "text", help: "Optional." }
      ] }
    ];
  }

  if (type === "pol") {
    return [{ t: "Policy", fields: [
      { k: "name", l: "Policy name", t: "text", req: true, max: 80 },
      { k: "ptype", l: "Policy type", t: "select", req: true, opts: "ptype" },
      { k: "resp", l: "Owner", t: "select", req: true, opts: userOpts },
      { k: "ver", l: "Version", t: "text", req: true, help: "For example v3 or v3.2" },
      { k: "eff", l: "Effective date", t: "date", req: true, noFuture: true },
      { k: "next", l: "Next review date", t: "date", req: true },
      { k: "link", l: "Link", t: "url", req: true, full: true }
    ] }];
  }

  if (type === "doc") {
    return [{ t: "Document", fields: [
      { k: "name", l: "Document name", t: "text", req: true, max: 80 },
      { k: "link", l: "Link", t: "url", req: true },
      { k: "desc", l: "Description", t: "textarea", max: 600, full: true },
      { k: "linked", l: "Linked to", t: "multi", full: true, opts: () => []
        .concat((store.act || []).map(a => ({ v: a.id, l: a.id + " · " + a.name })))
        .concat((store.ast || []).map(a => ({ v: a.id, l: a.id + " · " + a.name })))
        .concat((store.ven || []).map(a => ({ v: a.id, l: a.id + " · " + a.name }))) }
    ] }];
  }
  return [];
}

export function customFieldSpec(f) {
  const t = { "Text": "text", "Number": "number", "Date": "date", "Dropdown": "select", "Multi select": "multi" }[f.type] || "text";
  return { k: "cf_" + f.key, l: f.label, t, req: !!f.req, opts: f.opts || [], full: t === "multi", custom: true };
}

/* ---------------- tabs, roles, UI state ---------------- */

export function buildTabs(store) {
  const n = k => (store[k] || []).length;
  return [
    ["dash", "Dashboard"],
    ["act", "Processing Activities · " + n("act")],
    ["ast", "Assets · " + n("ast")],
    ["par", "Third Parties · " + (n("ven") + n("cus") + n("com") + n("oth"))],
    ["pol", "Policies · " + n("pol")],
    ["doc", "Documentation · " + n("doc")],
    ["cf", "Custom Fields"]
  ];
}

export const ROLES = ["Admin", "DPO", "Viewer"];

export const ROLE_PERMS = {
  Admin: { view: true, create: true, edit: true, delete: true, cf: true },
  DPO: { view: true, create: true, edit: true, delete: false, cf: true },
  Viewer: { view: true, create: false, edit: false, delete: false, cf: false }
};

export const DENY_MSG = {
  create: "Your role can't create records",
  edit: "Your role can't edit records",
  delete: "Your role can't delete records",
  cf: "Your role can't change custom fields"
};

export function roleFromOrg(D) {
  const r = ((D && D.org && D.org.user && D.org.user.role) || "").toLowerCase();
  if (r.indexOf("viewer") > -1 || r.indexOf("read") > -1) return "Viewer";
  if (r.indexOf("data protection") > -1 || r.indexOf("dpo") > -1) return "DPO";
  return "Admin";
}

export function can(ui, action) {
  return !!(ROLE_PERMS[ui.role] || ROLE_PERMS.Viewer)[action];
}

export function createDefaultRopaUiState() {
  return {
    role: null, // resolved from D.org on first render
    partyTab: "ven",
    lists: {},
    rowIds: [],
    wiz: null,
    dockOpen: false
  };
}

export function listState(ui, type) {
  if (!ui.lists[type]) ui.lists[type] = { q: "", page: 1, pageSize: PAGE_SIZE, filters: {} };
  return ui.lists[type];
}
