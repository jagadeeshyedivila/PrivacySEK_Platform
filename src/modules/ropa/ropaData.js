// Data Map & ROPA store, persisted in MongoDB through moduleStore, with Aarohan Finance seed data.
// Dates are relative to today so the demo never goes stale.
import { createModuleStore } from "../../platform/moduleStore.js";
import { RECORD_TYPES, CAT_GOV, CAT_FIN, CAT_BIO, CAT_VOICE, DPC_CHILD } from "./ropaConfig.js";

const DAY = 864e5;
export function daysAgo(n) { return new Date(Date.now() - n * DAY).toISOString().slice(0, 10); }
export function daysAhead(n) { return daysAgo(-n); }
function stamp(hours) { return new Date(Date.now() - hours * 36e5).toISOString(); }

const DPDP = "DPDP Act 2023 (India)";
const RBI = "RBI Master Directions (sectoral)";
const SEC_STRONG = {
  sec: "Yes",
  rest: ["AES-256 encryption", "Masking"],
  tr: ["TLS 1.3"],
  orgm: ["Role-based access", "MFA", "Access logs retained ≥ 1 year", "Backups tested", "Quarterly access review"]
};
const BASE = {
  entity: "Aarohan Finance Ltd", regs: [DPDP, RBI], role: "Data Fiduciary", dpo: "Meera Iyer",
  hold: ["Employees"], afq: "Daily", bak: "Yes", bjur: ["India"], copy: "No",
  srct: "Directly from the data principal", srcj: ["India"], int: "No", ext: "No", xb: "No",
  dm: "Secure wipe", do: "Vikram Pillai"
};
const act = (o) => Object.assign({}, BASE, SEC_STRONG, o);

function seedActivities() {
  return [
    act({
      id: "PA-001", bu: "Retail Lending", date: daysAgo(31), name: "Loan origination",
      sub: "Application intake, Bureau pull, Sanction, Disbursal",
      desc: "Collects applicant identity, income and bureau data to assess and disburse personal and MSME loans, including minor co-applicants added with a guardian.",
      purp: ["Credit decision", "Loan disbursal"], law: "Consent (s.6)", dpia: "Yes", dpiaState: "Completed",
      dpc: ["Customers", "Co-borrowers & guarantors", DPC_CHILD],
      cat: ["Identity", "Contact", CAT_GOV, CAT_FIN, CAT_BIO],
      attr: ["Full name", "Date of birth", "Mobile number", "PAN", "Bank account", "Income", "CIBIL score", "Loan details", "Photograph"],
      ai: "No", owner: "Kavya Menon", poc: "Rohit Shah", apps: ["los-db", "core-banking-db"],
      mode: ["Mobile app", "Website", "Branch form"], freq: "Continuous",
      ssys: ["los-db", "core-banking-db"], sjur: ["India"], hold: ["Employees", "Vendors"],
      int: "Yes", irec: ["Risk", "Collections"], ipur: "Credit risk review and collections handover",
      ext: "Yes", erec: ["TransUnion CIBIL", "Partner NBFC (co-lending)"], epur: "Bureau check and co-lending",
      erole: "Independent Data Fiduciary", dpa: "Yes", dpal: "https://docs.aarohan.example/dpa/partner-nbfc",
      ret: "8 years after loan closure (books of account)", retp: "Loan records are books of account (Companies Act s.128)",
      cf_branch_code: "MUM-001", upd: stamp(5)
    }),
    act({
      id: "PA-002", bu: "Compliance", date: daysAgo(45), name: "KYC verification",
      sub: "Aadhaar eKYC, PAN check, Video KYC",
      desc: "Verifies customer identity against Aadhaar, PAN and a live photo before any account is opened, as required by the RBI KYC Master Direction and PMLA.",
      purp: ["KYC & AML"], law: "Legal obligation (s.7(c))", dpia: "Yes", dpiaState: "Completed",
      dpc: ["Customers", "Co-borrowers & guarantors"], cat: ["Identity", CAT_GOV, CAT_BIO],
      attr: ["Full name", "Date of birth", "Aadhaar number", "PAN", "Photograph", "Face match score"],
      ai: "No", owner: "Rohit Shah", poc: "Meera Iyer", apps: ["core-banking-db", "s3-kyc-docs"],
      mode: ["Mobile app", "Branch form", "Video KYC"], freq: "Continuous",
      ssys: ["core-banking-db", "s3-kyc-docs"], sjur: ["India"],
      ext: "Yes", erec: ["UIDAI"], epur: "Aadhaar authentication", erole: "Government / regulator", dpa: "No",
      ret: "5 years after relationship ends (RBI KYC / PMLA)", retp: "PMLA s.12 and RBI KYC record keeping",
      rest: ["AES-256 encryption", "Aadhaar Data Vault", "Tokenisation"], upd: stamp(30)
    }),
    act({
      id: "PA-003", bu: "Gold Loans", date: daysAgo(425), name: "Gold loan valuation",
      sub: "Ornament photo, Purity test, Valuation",
      desc: "Captures ornament photos, purity results and the customer's address at the branch to value gold collateral and set the loan amount.",
      purp: ["Collateral valuation"], law: "Consent (s.6)", dpia: "No",
      dpc: ["Customers"], cat: ["Identity", "Contact", CAT_BIO, CAT_FIN],
      attr: ["Full name", "Postal address", "Photograph", "Loan details"],
      ai: "No", owner: "Kavya Menon", poc: "Kavya Menon", apps: ["gl-db"],
      mode: ["Branch form"], freq: "Daily", ssys: ["gl-db"], sjur: ["India"],
      ret: "8 years after loan closure (books of account)", retp: "Collateral records are books of account",
      cf_branch_code: "KOC-014", upd: stamp(72)
    }),
    act({
      id: "PA-004", bu: "Growth", date: daysAgo(20), name: "Diwali campaign",
      sub: "Segment build, SMS and WhatsApp offers, Email offers",
      desc: "Sends festive pre-approved loan offers to customers who opted in to marketing, using segments built from the CRM and sent through MoEngage and Mailchimp.",
      purp: ["Marketing"], law: "Consent (s.6)", dpia: "No",
      dpc: ["Customers", "Prospects / leads"], cat: ["Contact", "Device & online identifiers"],
      attr: ["Mobile number", "Email address", "App events"],
      ai: "No", owner: "Ananya Das", poc: "Ananya Das", apps: ["moengage-campaigns", "Salesforce CRM"],
      mode: ["Mobile app", "Website"], freq: "Weekly", ssys: ["moengage-campaigns", "Salesforce CRM"], sjur: ["India"],
      ext: "Yes", erec: ["MoEngage", "Mailchimp"], epur: "Campaign delivery", erole: "Data Processor", dpa: "Yes",
      dpal: "https://docs.aarohan.example/dpa/moengage",
      ret: "3 years after last interaction", retp: "Erased earlier when marketing consent is withdrawn", upd: stamp(26)
    }),
    act({
      id: "PA-005", bu: "Collections", date: daysAgo(60), name: "Collections calling",
      sub: "Reminder calls, Field visits, Call recording",
      desc: "Contacts borrowers with overdue EMIs by phone and field visits, records calls for quality and dispute handling, and shares dues with the collection agency.",
      purp: ["Collections"], law: "Voluntarily provided for a specified purpose (s.7(a))", dpia: "Yes", dpiaState: "Not started",
      dpc: ["Customers", "Co-borrowers & guarantors"], cat: ["Identity", "Contact", CAT_GOV, CAT_FIN, CAT_VOICE],
      attr: ["Full name", "Mobile number", "PAN", "Loan details", "Call recording"],
      ai: "No", owner: "Kavya Menon", poc: "Rohit Shah", apps: ["los-db", "core-banking-db"],
      mode: ["Call centre"], freq: "Continuous", ssys: ["core-banking-db"], sjur: ["India"], hold: ["Employees", "Contractors", "Vendors"],
      ext: "Yes", erec: ["Recovery Associates"], epur: "Recovery of overdue dues", erole: "Data Processor", dpa: "No",
      ret: "3 years after last interaction", retp: "Dispute window for collection calls", upd: stamp(50)
    }),
    act({
      id: "PA-006", bu: "HR", date: daysAgo(90), name: "Payroll",
      sub: "Salary run, PF and TDS filings",
      desc: "Processes monthly salaries, provident fund and tax deductions for Aarohan employees in SAP SuccessFactors, which is hosted in the EU.",
      purp: ["Payroll"], law: "Employment purposes (s.7(i))", dpia: "No", dpiaWhy: "Standard employment processing reviewed by HR and Legal in the annual SDF DPIA.",
      dpc: ["Employees"], cat: ["Identity", "Employment", CAT_GOV, CAT_FIN],
      attr: ["Full name", "Employee ID", "Salary", "PAN", "Bank account"],
      ai: "No", owner: "Sana Qureshi", poc: "Sana Qureshi", apps: ["sap-successfactors"],
      mode: ["Website"], freq: "Monthly", ssys: ["sap-successfactors"], sjur: ["India", "Germany"], afq: "Monthly",
      ext: "Yes", erec: ["SAP"], epur: "Payroll processing", erole: "Data Processor", dpa: "Yes",
      dpal: "https://docs.aarohan.example/dpa/sap",
      xb: "Yes", xc: ["Germany"], xr: "No restriction notified under s.16(1) for Germany.", xm: "Cloud replication",
      xs: ["Standard Contractual Clauses"], xl: "https://docs.aarohan.example/sccs/sap",
      ret: "8 years after loan closure (books of account)", retp: "Payroll records are books of account", upd: stamp(120)
    }),
    act({
      id: "PA-007", bu: "Risk", date: daysAgo(40), name: "Credit scoring model",
      sub: "Feature build, Scoring, Decision",
      desc: "Scores loan applications with an in-house ML model using bureau, income and transaction data, and auto-approves small-ticket loans under the threshold.",
      purp: ["Credit decision"], law: "Consent (s.6)", dpia: "Yes", dpiaState: "In progress",
      dpc: ["Customers"], cat: ["Identity", CAT_GOV, CAT_FIN],
      attr: ["Full name", "PAN", "Income", "CIBIL score", "Transaction history"],
      ai: "Yes", aip: "Probability-of-default scoring for loan decisions", adm: "Yes",
      owner: "Kavya Menon", poc: "Vikram Pillai", apps: ["los-db", "core-banking-db"],
      mode: ["Mobile app", "Website"], freq: "Continuous", ssys: ["los-db"], sjur: ["India"],
      ret: "8 years after loan closure (books of account)", retp: "Decision logs kept with the loan record", upd: stamp(8)
    }),
    act({
      id: "PA-008", entity: "Aarohan Finance (EU) B.V.", bu: "Digital & Cards", regs: [DPDP, "EU GDPR"], role: "Controller",
      date: daysAgo(15), name: "EU customer servicing", dpo: "Arjun Rao",
      sub: "Ticket intake, Account queries",
      desc: "Handles support tickets from EU-resident customers of Aarohan Finance (EU) B.V. in Freshdesk, with the support team in India answering them.",
      purp: ["Customer support"], law: "Contract – Art. 6(1)(b)", dpia: "No",
      dpc: ["Customers"], cat: ["Identity", "Contact"], attr: ["Full name", "Email address", "Mobile number"],
      ai: "No", owner: "Arjun Rao", poc: "Arjun Rao", apps: ["freshdesk-support"],
      mode: ["Website"], freq: "Daily", srcj: ["Netherlands", "Germany"],
      ssys: ["freshdesk-support"], sjur: ["Netherlands", "India"], bjur: ["Netherlands"],
      ext: "Yes", erec: ["Freshdesk"], epur: "Ticketing platform", erole: "Data Processor", dpa: "Yes",
      dpal: "https://docs.aarohan.example/dpa/freshdesk",
      xb: "Yes", xc: ["India"], xr: "Transfer from the EU to India under SCCs. India has no EU adequacy decision.", xm: "API",
      xs: ["Standard Contractual Clauses"], xl: "https://docs.aarohan.example/sccs/freshdesk",
      ret: "3 years after last interaction", retp: "Complaint handling and limitation period", upd: stamp(3)
    }),
    act({
      id: "PA-009", bu: "Digital & Cards", date: daysAgo(10), name: "App analytics",
      sub: "Event capture, Churn scoring",
      desc: "Captures in-app events, device IDs, location and transaction events in BigQuery to measure app usage and score churn and cross-sell propensity.",
      purp: ["Analytics"], law: "Consent (s.6)", dpia: "Not yet decided",
      dpc: ["Customers", "Website & app visitors"], cat: ["Device & online identifiers", "Location", CAT_FIN],
      attr: ["Device ID", "App events", "GPS location", "Transaction history"],
      ai: "Yes", aip: "Churn and propensity scoring on app events", adm: "No",
      owner: "Ananya Das", poc: "Vikram Pillai", apps: ["BigQuery Analytics"],
      mode: ["Mobile app"], freq: "Continuous", ssys: ["BigQuery Analytics"], sjur: ["India", "United States"],
      bak: "No", ret: "1 year (minimum log retention)", retp: "Rolling analytics window",
      rest: ["AES-256 encryption"], tr: ["TLS 1.2"], orgm: ["Role-based access"], upd: stamp(1)
    })
  ];
}

function asset(o) {
  return Object.assign({
    resp: "Vikram Pillai", stype: "On-premises", etype: "Aarohan Finance Ltd", loc: "India", net: "Private VPC",
    sup: "No", pol: ["Information security policy", "Retention policy"], del: "8 years after loan closure (books of account)",
    crit: "Yes", secm: ["AES-256 encryption", "Role-based access", "MFA", "Access logs retained ≥ 1 year"], ai: "No",
    ds: ["Customers"]
  }, o);
}

function seedAssets() {
  return [
    asset({ id: "AS-001", dsrc: "core-banking-db", name: "core-banking-db", purp: "Loan disbursal", desc: "Primary transaction processing database for customer accounts and balances.", area: "Retail Lending", dist: ["Retail Lending", "Collections"], acts: ["PA-001", "PA-002", "PA-005"], cat: ["Identity", "Contact", CAT_FIN], host: "Amazon Web Services", upd: stamp(20) }),
    asset({ id: "AS-002", dsrc: "los-db", name: "los-db", purp: "Credit decision", desc: "Loan origination system database for retail and MSME loan workflows.", area: "Retail Lending", dist: ["Retail Lending", "Risk"], acts: ["PA-001", "PA-007"], cat: ["Identity", CAT_GOV, CAT_FIN], host: "Amazon Web Services", upd: stamp(28) }),
    asset({ id: "AS-003", dsrc: "gl-db", name: "gl-db", purp: "Collateral valuation", desc: "Oracle database holding collateral valuation and gold loan vault ledgers.", area: "Gold Loans", dist: ["Gold Loans"], acts: ["PA-003"], cat: ["Identity", CAT_BIO, CAT_FIN], upd: stamp(70) }),
    asset({ id: "AS-004", dsrc: "finacle-core", name: "finacle-core", purp: "Loan disbursal", desc: "Core ledger used for daily reconciliation of loan accounts.", area: "Retail Lending", dist: ["Retail Lending"], acts: [], cat: [CAT_FIN], upd: stamp(200) }),
    asset({ id: "AS-005", dsrc: "s3-kyc-docs", name: "s3-kyc-docs", purp: "KYC & AML", desc: "S3 bucket for uploaded Aadhaar, PAN and bank statement PDFs.", stype: "Cloud", area: "Compliance", dist: ["Compliance"], acts: ["PA-002"], cat: ["Identity", CAT_GOV, CAT_FIN], host: "Amazon Web Services", del: "5 years after relationship ends (RBI KYC / PMLA)", secm: ["AES-256 encryption", "Tokenisation", "Role-based access", "MFA"], upd: stamp(32) }),
    asset({ id: "AS-006", dsrc: "Salesforce CRM", name: "Salesforce CRM", purp: "Marketing", desc: "Customer acquisition and retail loan leads pipeline.", stype: "Cloud", loc: "Singapore", area: "Growth", dist: ["Growth", "Retail Lending"], acts: ["PA-004"], cat: ["Identity", "Contact"], ds: ["Customers", "Prospects / leads"], host: "Salesforce", supp: "Salesforce", contract: "MSA-SF-2024-07", sup: "Yes", crit: "No", del: "3 years after last interaction", upd: stamp(40) }),
    asset({ id: "AS-007", dsrc: "moengage-campaigns", name: "moengage-campaigns", purp: "Marketing", desc: "Marketing engine for loan offer messaging.", stype: "Cloud", area: "Growth", dist: ["Growth"], acts: ["PA-004"], cat: ["Contact", "Device & online identifiers"], host: "MoEngage", supp: "MoEngage", contract: "MOE-2025-02", sup: "Yes", crit: "No", ai: "Yes", aid: "Send-time optimisation for campaign messages.", hr: "No", train: "No", del: "3 years after last interaction", upd: stamp(27) }),
    asset({ id: "AS-008", dsrc: "sap-successfactors", name: "sap-successfactors", purp: "Payroll", desc: "Employee HR, payroll and statutory PF records.", stype: "Cloud", loc: "Germany", area: "HR", dist: ["HR"], acts: ["PA-006"], cat: ["Identity", "Employment", CAT_GOV, CAT_FIN], ds: ["Employees"], host: "SAP", supp: "SAP", contract: "SAP-SF-2023-11", sup: "Yes", upd: stamp(118) })
  ];
}

function party(o) {
  return Object.assign({ resp: "Rohit Shah", area: "Compliance", country: "India", afreq: "Annually" }, o);
}

function seedVendors() {
  return [
    party({ id: "VN-001", name: "MoEngage", etype: ["Vendor"], desc: "Customer messaging platform.", web: "https://www.moengage.example", addr: "Outer Ring Road, Bellandur", city: "Bengaluru", state: "Karnataka", zip: "560103", area: "Growth", atype: "Audit statement / SOC 2 / ISO 27001 certificate", cname: "Ritu Sharma", cemail: "privacy@moengage.example", crole: "Privacy lead", cphone: "+91 9810012345", upd: stamp(48) }),
    party({ id: "VN-002", name: "Freshdesk", etype: ["Vendor"], desc: "Support ticketing.", web: "https://www.freshdesk.example", addr: "Rajiv Gandhi Salai", city: "Chennai", state: "Tamil Nadu", zip: "600096", area: "Digital & Cards", atype: "Audit statement / SOC 2 / ISO 27001 certificate", cname: "Karthik R", cemail: "dpo@freshdesk.example", crole: "DPO", upd: stamp(100) }),
    party({ id: "VN-003", name: "Partner NBFC (co-lending)", etype: ["Vendor"], desc: "Co-lending partner under the RBI co-lending model.", web: "https://www.partnernbfc.example", addr: "Bandra Kurla Complex", city: "Mumbai", state: "Maharashtra", zip: "400051", area: "Retail Lending", atype: "Self-assessment questionnaire", cname: "Neha Kulkarni", cemail: "compliance@partnernbfc.example", crole: "Compliance officer", upd: stamp(150) }),
    party({ id: "VN-004", name: "Recovery Associates", etype: ["Vendor"], desc: "Collections agency.", web: "https://www.recoveryassociates.example", addr: "Sector 44", city: "Gurugram", state: "Haryana", zip: "122003", area: "Collections", atype: "Audit not required", cname: "Manoj Verma", cemail: "manoj.verma@mailbox.example", crole: "Account manager", cphone: "9876543210", upd: stamp(170) }),
    party({ id: "VN-005", name: "Amazon Web Services", etype: ["Vendor", "Supplier"], desc: "Cloud hosting, Mumbai region.", web: "https://aws.example", addr: "Andheri East", city: "Mumbai", state: "Maharashtra", zip: "400093", area: "Risk", resp: "Vikram Pillai", atype: "Audit statement / SOC 2 / ISO 27001 certificate", cname: "Account team", cemail: "aws-india@aws.example", crole: "Enterprise account", upd: stamp(300) }),
    party({ id: "VN-006", name: "Salesforce", etype: ["Vendor", "Supplier"], desc: "CRM platform.", web: "https://www.salesforce.example", addr: "Marina Bay Financial Centre", city: "Singapore", state: "Singapore", country: "Singapore", zip: "018983", area: "Growth", atype: "Audit statement / SOC 2 / ISO 27001 certificate", cname: "Lim Wei", cemail: "privacy@salesforce.example", crole: "Privacy counsel", cphone: "+6561234567", upd: stamp(260) }),
    party({ id: "VN-007", name: "SAP", etype: ["Vendor", "Supplier"], desc: "HR and payroll cloud.", web: "https://www.sap.example", addr: "Dietmar-Hopp-Allee 16", city: "Walldorf", state: "Baden-Württemberg", country: "Germany", zip: "69190", area: "HR", resp: "Sana Qureshi", atype: "Audit statement / SOC 2 / ISO 27001 certificate", cname: "Jonas Weber", cemail: "dpo@sap.example", crole: "DPO", cphone: "+496227700000", upd: stamp(220) }),
    party({ id: "VN-008", name: "Mailchimp", etype: ["Vendor"], desc: "Email delivery.", web: "https://mailchimp.example", addr: "405 N Angier Ave", city: "Atlanta", state: "Georgia", country: "United States", zip: "30308", area: "Growth", resp: "Ananya Das", atype: "Written confirmation", cname: "Privacy desk", cemail: "privacy@mailchimp.example", crole: "Privacy team", upd: stamp(400) }),
    party({ id: "VN-009", name: "TransUnion CIBIL", etype: ["Vendor", "Credit bureau"], desc: "Credit bureau for credit reports and scores.", web: "https://www.cibil.example", addr: "Lower Parel", city: "Mumbai", state: "Maharashtra", zip: "400013", area: "Risk", atype: "Audit statement / SOC 2 / ISO 27001 certificate", cname: "Member services", cemail: "members@cibil.example", crole: "Member relations", upd: stamp(90) })
  ];
}

function seedCustomers() {
  return [
    party({ id: "CU-001", name: "Navrang Co-Lending Partners Pvt Ltd", etype: ["Customer"], desc: "Corporate co-lending partner buying loan pools.", web: "https://www.navrang.example", addr: "Nariman Point", city: "Mumbai", state: "Maharashtra", zip: "400021", area: "Retail Lending", cname: "Asha Menon", cemail: "asha.menon@navrang.example", crole: "Head of partnerships", upd: stamp(500) }),
    party({ id: "CU-002", name: "Pragati Rural Finance Ltd", etype: ["Customer"], desc: "Corporate co-lending partner for rural gold loans.", web: "https://www.pragati.example", addr: "MG Road", city: "Kochi", state: "Kerala", zip: "682016", area: "Gold Loans", cname: "Joseph Thomas", cemail: "joseph@pragati.example", crole: "COO", upd: stamp(600) })
  ];
}

function seedCompanies() {
  return [
    party({ id: "CO-001", name: "Aarohan Finance Ltd", etype: ["Company"], desc: "Parent NBFC registered with the RBI.", web: "https://www.aarohan.example", addr: "G Block, Bandra Kurla Complex", city: "Mumbai", state: "Maharashtra", zip: "400051", resp: "Meera Iyer", cname: "Meera Iyer", cemail: "dpo@aarohan.example", crole: "Data Protection Officer", upd: stamp(700) }),
    party({ id: "CO-002", name: "Aarohan Gold Loans Pvt Ltd", etype: ["Company"], desc: "Gold loan subsidiary.", web: "https://gold.aarohan.example", addr: "Marine Drive", city: "Kochi", state: "Kerala", zip: "682011", area: "Gold Loans", cname: "Arjun Rao", cemail: "arjun.rao@aarohan.example", crole: "Deputy DPO", upd: stamp(710) }),
    party({ id: "CO-003", name: "Aarohan Finance (EU) B.V.", etype: ["Company"], desc: "EU entity serving EU-resident customers.", web: "https://eu.aarohan.example", addr: "Herengracht 182", city: "Amsterdam", state: "North Holland", country: "Netherlands", zip: "1017", area: "Digital & Cards", resp: "Arjun Rao", cname: "Arjun Rao", cemail: "eu-privacy@aarohan.example", crole: "EU representative", upd: stamp(720) })
  ];
}

function seedOthers() {
  return [
    party({ id: "OT-001", name: "Deshpande & Rao LLP", etype: ["Auditor"], desc: "Statutory auditor.", web: "https://www.deshpanderao.example", addr: "Fort", city: "Mumbai", state: "Maharashtra", zip: "400001", cname: "Sunil Deshpande", cemail: "sunil@deshpanderao.example", crole: "Partner", upd: stamp(800) }),
    party({ id: "OT-002", name: "UIDAI", etype: ["Government body"], desc: "Unique Identification Authority of India, for Aadhaar authentication.", web: "https://uidai.gov.in", addr: "Bangla Sahib Road", city: "New Delhi", state: "Delhi", zip: "110001", cname: "Authentication desk", cemail: "authsupport@uidai.gov.in", crole: "AUA support", upd: stamp(900) })
  ];
}

function seedPolicies() {
  const p = (o) => Object.assign({ resp: "Meera Iyer" }, o);
  return [
    p({ id: "PO-001", name: "Privacy notice", ptype: "Privacy notice", ver: "v4.1", eff: daysAgo(40), next: daysAhead(325), link: "https://www.aarohan.example/privacy", upd: stamp(60) }),
    p({ id: "PO-002", name: "Cookie policy", ptype: "Cookie policy", ver: "v2.0", eff: daysAgo(120), next: daysAhead(245), link: "https://www.aarohan.example/cookies", resp: "Ananya Das", upd: stamp(400) }),
    p({ id: "PO-003", name: "Retention policy", ptype: "Retention policy", ver: "v1.4", eff: daysAgo(388), next: daysAgo(23), link: "https://docs.aarohan.example/policies/retention", resp: "Rohit Shah", upd: stamp(2000) }),
    p({ id: "PO-004", name: "Information security policy", ptype: "Information security policy", ver: "v3.0", eff: daysAgo(150), next: daysAhead(215), link: "https://docs.aarohan.example/policies/infosec", resp: "Vikram Pillai", upd: stamp(900) }),
    p({ id: "PO-005", name: "Grievance redressal policy", ptype: "Grievance redressal policy", ver: "v1.1", eff: daysAgo(70), next: daysAhead(295), link: "https://www.aarohan.example/grievance", upd: stamp(500) }),
    p({ id: "PO-006", name: "Vendor management policy", ptype: "Vendor management policy", ver: "v2.2", eff: daysAgo(200), next: daysAhead(25), link: "https://docs.aarohan.example/policies/vendors", resp: "Rohit Shah", upd: stamp(1200) })
  ];
}

function seedDocs() {
  return [
    { id: "DC-001", name: "DPA – MoEngage", link: "https://docs.aarohan.example/dpa/moengage", desc: "Signed data processing agreement with MoEngage.", linked: ["PA-004", "VN-001"], upd: stamp(300) },
    { id: "DC-002", name: "DPA template – processors", link: "https://docs.aarohan.example/dpa/template", desc: "Standard DPA template with DPDP s.8(2) and GDPR Art. 28 clauses.", linked: [], upd: stamp(1000) },
    { id: "DC-003", name: "SCCs – SAP", link: "https://docs.aarohan.example/sccs/sap", desc: "Standard Contractual Clauses for payroll data hosted in the EU.", linked: ["PA-006", "VN-007", "AS-008"], upd: stamp(1100) },
    { id: "DC-004", name: "DPIA – Credit scoring model", link: "https://docs.aarohan.example/dpia/credit-scoring", desc: "DPIA draft for the credit scoring model.", linked: ["PA-007"], upd: stamp(9) }
  ];
}

export function createInitialRopaData() {
  const data = {
    act: seedActivities(),
    ast: seedAssets(),
    ven: seedVendors(),
    cus: seedCustomers(),
    com: seedCompanies(),
    oth: seedOthers(),
    pol: seedPolicies(),
    doc: seedDocs(),
    cf: [{ id: "cf-1", label: "Branch code", key: "branch_code", type: "Text", req: false, opts: [] }],
    settings: { sdf: true },
    seq: {}
  };
  Object.keys(RECORD_TYPES).forEach(t => { data.seq[t] = data[t].length; });
  return data;
}

const ropaStore = createModuleStore("ropa", createInitialRopaData);

export function getRopaData() {
  return ropaStore.get();
}

export function saveRopaData(data) {
  return ropaStore.save(data);
}

// Async: resolves once the server has restored the demo data
export function resetRopaData() {
  return ropaStore.reset();
}

export function nextId(store, type) {
  store.seq = store.seq || {};
  let n = store.seq[type] || (store[type] || []).length;
  let id;
  do { n += 1; id = RECORD_TYPES[type].prefix + "-" + String(n).padStart(3, "0"); }
  while ((store[type] || []).some(r => r.id === id));
  store.seq[type] = n;
  return id;
}

export function findRecord(store, type, id) {
  return (store[type] || []).find(r => r.id === id) || null;
}

// Look up any record by id across types (ids carry a unique prefix)
export function findAnyRecord(store, id) {
  const types = Object.keys(RECORD_TYPES);
  for (let i = 0; i < types.length; i++) {
    const r = findRecord(store, types[i], id);
    if (r) return { type: types[i], rec: r };
  }
  return null;
}
