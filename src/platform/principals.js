// Shared Data Principals for the Aarohan Finance demo.
//
// One person, one id (DP-xxxxx), so the same customer, child or guardian lines up across
// Consent, Cookie Consent, Rights Requests, Purpose Guard and Person Finder. Modules read
// people from here; who is linked to whom (guardian ↔ child, guardian ↔ person with a
// disability) is owned by Consent and stored in its `relationships` collection.
//
// Legal class is kept apart from the internal risk tag: DPDP has no "sensitive" category,
// only children (s.2(f), s.9) and persons with disability (s.9 read with Rule 11) get extra
// protection. GDPR Art. 9 and CCPA "sensitive PI" are separate flags.

const DAY = 864e5;
const inDays = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

// ageBand: under_18 | 18_plus | unknown. ageSource: self_declared | account_record | token
function person(id, name, extra) {
  return {
    id,
    displayName: name,
    ageBand: "18_plus",
    ageSource: "account_record",
    dpdpClass: "general",
    gdprArt9: false,
    ccpaSensitive: false,
    riskTag: "medium",
    kycVerified: false,
    systems: [],
    ...extra,
  };
}

export const PRINCIPALS = [
  // Adults whose identity and age Aarohan already holds from KYC (Rule 10(1)(a) route)
  person("DP-04471", "Priya Kulkarni", { customerId: "CUST-4471", mobileMasked: "+91 98••••21", kycVerified: true, kycRef: "KYC record PA-002 · DOB on file", city: "Pune", language: "Marathi", systems: ["Salesforce CRM", "core-banking-db", "los-db", "MoEngage"] }),
  person("DP-04512", "Ananya Sharma", { customerId: "CUST-4512", mobileMasked: "+91 98••••07", kycVerified: true, kycRef: "KYC record PA-002 · DOB on file", city: "New Delhi", language: "Hindi", systems: ["Salesforce CRM", "core-banking-db"] }),
  person("DP-04530", "Vijay Reddy", { customerId: "CUST-4530", mobileMasked: "+91 97••••44", kycVerified: true, kycRef: "KYC record PA-002 · DOB on file", city: "Vijayawada", language: "Telugu", systems: ["Salesforce CRM", "core-banking-db"] }),
  person("DP-04544", "Kavya Menon", { mobileMasked: "+91 99••••18", city: "Kochi", language: "English", systems: ["moneysmart-app-db"] }),
  person("DP-04560", "Sneha Bose", { mobileMasked: "+91 90••••63", city: "Kolkata", language: "Bengali", systems: ["moneysmart-app-db"] }),
  person("DP-04575", "Imran Qureshi", { customerId: "CUST-4575", mobileMasked: "+91 98••••90", kycVerified: true, kycRef: "KYC record PA-002 · DOB on file", city: "Hyderabad", language: "Urdu", systems: ["Salesforce CRM", "core-banking-db"] }),
  person("DP-04588", "Farah Ahmed", { mobileMasked: "+91 93••••52", city: "Lucknow", language: "Hindi", systems: ["moneysmart-app-db"] }),
  person("DP-04602", "Rohit Verma", { mobileMasked: "+91 94••••36", city: "Jaipur", language: "Hindi", systems: ["moneysmart-app-db"] }),
  // Claims to be a guardian but is a minor: verification must stop (Rule 10 needs an adult)
  person("DP-04619", "Rohan Patil", { ageBand: "under_18", ageSource: "self_declared", dpdpClass: "child", dobYear: 2009, mobileMasked: "+91 91••••75", city: "Bengaluru", language: "Kannada", systems: ["moneysmart-app-db"] }),
  person("DP-02210", "Rahul Deshmukh", { customerId: "CUST-2210", mobileMasked: "+91 98••••12", kycVerified: true, city: "Mumbai", language: "English", systems: ["Salesforce CRM", "core-banking-db", "MoEngage", "Partner NBFC (co-lending)"] }),
  // Lawful guardian of a person with a disability (Rule 11) and the person they act for
  person("DP-03311", "Lakshmi Narayanan", { customerId: "CUST-3311", mobileMasked: "+91 94••••80", kycVerified: true, kycRef: "KYC record PA-002 · DOB on file", city: "Chennai", language: "Tamil", systems: ["Salesforce CRM", "core-banking-db"] }),
  person("DP-03310", "Suresh Narayanan", { customerId: "CUST-3310", dpdpClass: "pwd", riskTag: "high", city: "Chennai", language: "Tamil", systems: ["core-banking-db", "los-db"] }),

  // Children (under 18). Loan origination holds minor co-applicants; Aarohan Money Smart is
  // the financial-literacy app for 13–17-year-olds.
  person("DP-10482", "Aarav Kulkarni", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2010, turns18On: inDays(500), city: "Pune", language: "Marathi", systems: ["los-db", "core-banking-db", "s3-kyc-docs"], service: "Loan origination (minor co-applicant)" }),
  person("DP-10511", "Diya Sharma", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2011, turns18On: inDays(820), city: "New Delhi", language: "Hindi", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10530", "Kabir Reddy", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2010, turns18On: inDays(260), city: "Vijayawada", language: "Telugu", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10544", "Ishaan Menon", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", ageSource: "self_declared", dobYear: 2012, turns18On: inDays(1300), city: "Kochi", language: "English", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10560", "Meher Bose", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2008, turns18On: inDays(21), city: "Kolkata", language: "Bengali", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10575", "Zoya Qureshi", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2013, turns18On: inDays(1650), city: "Hyderabad", language: "Urdu", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10590", "Arnav Patil", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", ageSource: "self_declared", dobYear: 2011, turns18On: inDays(900), city: "Bengaluru", language: "Kannada", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10602", "Tara Ahmed", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2012, turns18On: inDays(1200), city: "Lucknow", language: "Hindi", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10615", "Neel Verma", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2010, turns18On: inDays(420), city: "Jaipur", language: "Hindi", systems: ["moneysmart-app-db"], service: "Aarohan Money Smart" }),
  person("DP-10628", "Riya Kulkarni", { ageBand: "under_18", dpdpClass: "child", riskTag: "high", dobYear: 2012, turns18On: inDays(1100), city: "Pune", language: "Marathi", systems: ["los-db", "core-banking-db"], service: "Loan origination (minor co-applicant)" }),
];

const BY_ID = new Map(PRINCIPALS.map(p => [p.id, p]));

export const principalById = id => BY_ID.get(id) || null;
export const isChild = p => !!p && p.ageBand === "under_18";
export const isAdult = p => !!p && p.ageBand === "18_plus";

// Masked display name for a child: first name and initial only
export function maskedName(p) {
  if (!p) return "Unknown";
  if (!isChild(p)) return p.displayName;
  const [first, last] = p.displayName.split(" ");
  return `${first} ${last ? last[0] + "." : ""}`.trim();
}

export const AGE_BAND_LABELS = { under_18: "Under 18", "18_plus": "18 or over", unknown: "Unknown" };
export const RELATIONSHIP_LABELS = { parent: "Parent", lawful_guardian: "Lawful guardian", pwd_guardian: "Lawful guardian (PwD)" };

// Days until a child turns 18, or null for adults / unknown
export function daysToEighteen(p) {
  if (!isChild(p) || !p.turns18On) return null;
  return Math.ceil((new Date(p.turns18On).getTime() - Date.now()) / DAY);
}

// relationships: Consent's `relationships` collection
export function guardiansOf(dependentId, relationships = []) {
  return relationships.filter(r => r.dependentId === dependentId && r.status === "active");
}
export function dependentsOf(guardianId, relationships = []) {
  return relationships.filter(r => r.guardianId === guardianId && r.status === "active");
}
