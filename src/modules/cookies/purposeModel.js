// Cookie purposes (stored as cookie categories): what each field means, the options, and the
// defaults that fill purposes saved before these fields existed.
//
// A purpose is { id, name, description, required, defaultState, showInPref, ...fields below }.
// `required` and `defaultState` stay the stored truth for the consent model, so every
// existing reader (banner, records, blocking) keeps working:
//   Always Active  required: true                       (no toggle, cannot be hidden)
//   Opt-in         required: false, defaultState: false (off until the visitor allows it)
//   Opt-out        required: false, defaultState: true  (on until the visitor turns it off)

export const CONSENT_MODELS = [
  { id: "always_active", label: "Always Active", hint: "Strictly necessary. Visitors see it as always on, with no toggle, and it stays listed in the Preference Center. You can change this later." },
  { id: "opt_in", label: "Opt-in", hint: "Off until the visitor allows it. Required for non-essential cookies under GDPR and the DPDP Act." },
  { id: "opt_out", label: "Opt-out", hint: "On until the visitor turns it off. Only suitable where the law allows it, such as some US states." },
];

export const LEGAL_BASES = [
  { id: "strictly_necessary", label: "Strictly necessary (exempt)" },
  { id: "consent", label: "Consent" },
  { id: "legitimate_interest", label: "Legitimate interest" },
  { id: "legal_obligation", label: "Legal obligation" },
];

// Google Consent Mode v2 consent types a purpose grants when the visitor allows it
export const GOOGLE_SIGNALS = [
  { id: "ad_storage", label: "ad_storage", hint: "Advertising cookies" },
  { id: "ad_user_data", label: "ad_user_data", hint: "Send user data to Google for ads" },
  { id: "ad_personalization", label: "ad_personalization", hint: "Personalised ads and remarketing" },
  { id: "analytics_storage", label: "analytics_storage", hint: "Analytics cookies" },
  { id: "functionality_storage", label: "functionality_storage", hint: "Site features such as language" },
  { id: "personalization_storage", label: "personalization_storage", hint: "Personalised content" },
  { id: "security_storage", label: "security_storage", hint: "Authentication and fraud prevention" },
];

// IAB TCF v2.2 standard purposes
export const IAB_PURPOSES = [
  [1, "Store and/or access information on a device"],
  [2, "Use limited data to select advertising"],
  [3, "Create profiles for personalised advertising"],
  [4, "Use profiles to select personalised advertising"],
  [5, "Create profiles to personalise content"],
  [6, "Use profiles to select personalised content"],
  [7, "Measure advertising performance"],
  [8, "Measure content performance"],
  [9, "Understand audiences through statistics or combinations of data"],
  [10, "Develop and improve services"],
  [11, "Use limited data to select content"],
];

export const PURPOSE_REGIONS = ["EEA & UK", "USA", "India", "Global"];

// Defaults for the built-in purposes; any other purpose gets GENERIC
const DEFAULTS = {
  necessary: {
    legalBasis: "strictly_necessary",
    dataCollected: ["Session ID", "Consent choices", "Security and load-balancing tokens"],
    googleSignals: ["security_storage"],
    iabPurposes: [],
    saleOrShare: false,
  },
  functional: {
    legalBasis: "consent",
    dataCollected: ["Language and display preferences", "Support chat session ID"],
    googleSignals: ["functionality_storage", "personalization_storage"],
    iabPurposes: [],
    saleOrShare: false,
  },
  analytics: {
    legalBasis: "consent",
    dataCollected: ["Pseudonymous visitor ID", "Pages visited and time on page", "Device and browser type", "Approximate location (country)"],
    googleSignals: ["analytics_storage"],
    iabPurposes: [8, 9, 10],
    saleOrShare: false,
  },
  marketing: {
    legalBasis: "consent",
    dataCollected: ["Campaign and referral source", "Email engagement", "Pseudonymous visitor ID"],
    googleSignals: ["ad_storage", "ad_user_data", "ad_personalization"],
    iabPurposes: [1, 2, 7],
    saleOrShare: true,
  },
  advertising: {
    legalBasis: "consent",
    dataCollected: ["Advertising ID", "IP address", "Browsing activity across sites"],
    googleSignals: ["ad_storage", "ad_user_data", "ad_personalization"],
    iabPurposes: [1, 2, 3, 4, 7],
    saleOrShare: true,
  },
  social_media: {
    legalBasis: "consent",
    dataCollected: ["Social network user ID", "Pages shared"],
    googleSignals: ["ad_storage"],
    iabPurposes: [1],
    saleOrShare: true,
  },
};
const GENERIC = { legalBasis: "consent", dataCollected: [], googleSignals: [], iabPurposes: [], saleOrShare: false };

export function consentModelOf(purpose) {
  if (purpose.required) return "always_active";
  return purpose.defaultState ? "opt_out" : "opt_in";
}

// The stored flags for a consent model
export function consentModelFlags(model) {
  return { required: model === "always_active", defaultState: model === "always_active" || model === "opt_out" };
}

/** Fills fields a stored purpose is missing; never changes a value that is set. */
export function normalizePurpose(purpose) {
  const base = DEFAULTS[purpose.id] || GENERIC;
  const out = { ...purpose };
  for (const [key, value] of Object.entries(base)) {
    if (out[key] === undefined) out[key] = Array.isArray(value) ? value.slice() : value;
  }
  if (!Array.isArray(out.regions)) out.regions = [];
  if (out.showInPref === undefined) out.showInPref = true;
  if (out.required) { out.showInPref = true; out.legalBasis = "strictly_necessary"; }
  return out;
}

// No regions selected means every region
export const appliesToRegion = (purpose, region) =>
  !region || !Array.isArray(purpose.regions) || !purpose.regions.length || purpose.regions.includes(region);

/**
 * Google Consent Mode state for a set of choices: a signal is granted when any allowed
 * purpose maps to it. Signals no purpose maps stay denied.
 */
export function googleConsentState(purposes, choices) {
  const state = Object.fromEntries(GOOGLE_SIGNALS.map(s => [s.id, "denied"]));
  for (const p of purposes) {
    if (!(p.required || choices[p.id])) continue;
    for (const s of p.googleSignals || []) if (s in state) state[s] = "granted";
  }
  return state;
}

export const labelOf = (list, id) => list.find(x => x.id === id)?.label || id;
