// Simulated verification provider for parent / lawful-guardian checks (DPDP Rules 10–11)
// and for guardian-filed rights requests.
//
// Nothing here contacts DigiLocker, Aadhaar, a bank or any identity provider. Every screen
// that uses it shows SIMULATION_NOTICE. The methods mirror the routes the Rules allow:
//   Rule 10(1)(a) – identity and age details the fiduciary already holds reliably
//   Rule 10(1)(b) – details issued by an authorised entity, or a virtual token mapped to them
//                   (including through a Digital Locker service provider)
//   Rule 11       – order appointing the lawful guardian of a person with a disability
// A "Yes, I'm the parent" checkbox or an OTP is not one of them. OTP only confirms that the
// guardian can be reached, so it is recorded as a supporting check, never as the method.
import { principalById, isAdult } from "./principals.js";

export const SIMULATION_NOTICE = "Simulated verification for demonstration. No identity provider was contacted. This is not legal verification.";

export const VERIFY_METHODS = [
  {
    id: "existing_kyc_record",
    label: "Existing verified record",
    ref: "Rule 10(1)(a)",
    hint: "The guardian is an existing customer whose identity and age Aarohan already holds (KYC).",
  },
  {
    id: "authority_issued_details",
    label: "Authority-issued identity and age details",
    ref: "Rule 10(1)(b)",
    hint: "The guardian provides identity and age details issued by an entity authorised by law. A reviewer checks them.",
  },
  {
    id: "virtual_token",
    label: "Virtual token (Digital Locker-style)",
    ref: "Rule 10(1)(b), 10(2)",
    hint: "A token mapped to the guardian's identity and age, issued by an authorised entity.",
  },
  {
    id: "guardianship_order",
    label: "Guardianship order (person with disability)",
    ref: "Rule 11",
    hint: "Order of a court, designated authority or local-level committee under the RPwD Act 2016 or National Trust Act 1999.",
  },
];

export const methodById = id => VERIFY_METHODS.find(m => m.id === id) || null;

// The banner every simulated step carries
export function simulationBanner(esc = s => s) {
  return `<div class="banner sim-notice" role="note"><span><b>Simulated.</b> ${esc(SIMULATION_NOTICE)}</span></div>`;
}

const tokenId = () => "TKN-" + Math.random().toString(36).slice(2, 8).toUpperCase();

// Runs a simulated check. Returns { result: "passed" | "failed" | "needs_review", checks, evidenceRef }
// guardianId: DP id. evidence: { orderNo, authority, issuedOn } for guardianship orders.
export function simulateVerification(methodId, guardianId, evidence = {}) {
  const g = principalById(guardianId);
  const checks = [{ step: "guardian_contact_otp", result: "passed", note: "Confirms contact only. Not verification." }];
  const method = methodById(methodId);
  if (!method) return { result: "failed", checks, reason: "Choose a verification method." };

  // Whatever the method, the guardian must be an identifiable adult
  if (!g || !isAdult(g)) {
    checks.push({ step: "guardian_is_adult", result: "failed", source: g ? "Age on record: under 18" : "No record for this guardian" });
    return { result: "failed", checks, reason: "Guardian must be an adult (Rule 10)." };
  }

  if (methodId === "existing_kyc_record") {
    if (!g.kycVerified) {
      checks.push({ step: "guardian_is_adult", result: "failed", source: "No KYC-verified record for this person" });
      return { result: "failed", checks, reason: "No reliable identity and age details are held for this guardian. Use another method." };
    }
    checks.push({ step: "guardian_is_adult", result: "passed", source: g.kycRef || "KYC record · DOB on file" });
    return { result: "passed", checks, evidenceRef: g.customerId || g.id };
  }
  if (methodId === "virtual_token") {
    const t = tokenId();
    checks.push({ step: "guardian_is_adult", result: "passed", source: `Token ${t} · adult: true (simulated issuer)` });
    return { result: "passed", checks, evidenceRef: t };
  }
  if (methodId === "authority_issued_details") {
    checks.push({ step: "guardian_is_adult", result: "needs_review", source: "Document placeholder uploaded · reviewer must confirm" });
    return { result: "needs_review", checks, evidenceRef: "DOC-" + Math.floor(Math.random() * 9e4 + 1e4) };
  }
  // guardianship_order
  if (!evidence.orderNo || !evidence.authority) {
    checks.push({ step: "guardianship_order", result: "failed", source: "Order number and issuing authority are required" });
    return { result: "failed", checks, reason: "Enter the guardianship order number and issuing authority." };
  }
  checks.push({ step: "guardian_is_adult", result: "passed", source: g.kycRef || "Identity on record" });
  checks.push({ step: "guardianship_order", result: "needs_review", source: `${evidence.authority} · ${evidence.orderNo}` });
  return { result: "needs_review", checks, evidenceRef: evidence.orderNo };
}
