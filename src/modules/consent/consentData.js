// Consent Preference Module Demo Data and State Management
import { createModuleStore } from '../../platform/moduleStore.js';

const USER_KEY = 'cp_consent_user_v1';

export const DEFAULT_RIGHTS = [
  ['Right to Opt-Out (OCPA)', 'Opt-out of sale or sharing', 'Right to opt-out of the sale or sharing of personal information'],
  ['Right to Data Portability', 'Download my data', 'Receive a copy of your personal data in a portable format'],
  ['Right to Access', 'Access my data', 'Confirm whether data is processed and obtain a copy'],
  ['Right to Deletion', 'Delete my data', 'Request erasure of personal data'],
  ['Right to Correction', 'Correct my data', 'Request correction of inaccurate data'],
  ['Right to Withdraw Consent', 'Withdraw consent', 'Withdraw previously given consent at any time']
];

export const LEGAL_BASIS_OPTIONS = [
  'Consent-Opt In',
  'Consent-Opt Out',
  'Legitimate Interest - Objectable',
  'Legitimate Use - DPDP s.7',
  'Legal Obligation',
  'Contract'
];

// DPDP has consent and the legitimate uses of s.7 only: no "legitimate interest" and no
// opt-out consent (s.6(1) needs a clear affirmative action). Other laws do not have s.7.
export function legalBasisOptionsFor(regulations = []) {
  const dpdp = regulations.includes('DPDPA');
  return LEGAL_BASIS_OPTIONS.filter(o => dpdp
    ? !/^Legitimate Interest|Opt Out/.test(o)
    : !/^Legitimate Use/.test(o));
}

// Whether a purpose may be offered for a child's data (DPDP s.9). "exemption": only when the
// processing activity records a Fourth Schedule exemption (Rule 12).
export const CHILD_RULES = {
  yes: 'Yes, with verified guardian consent',
  no: 'No, never for children',
  exemption: 'Only for a Fourth Schedule exempt class or purpose'
};
// An exemption lifts s.9(1) (guardian consent) and s.9(3) (tracking, ads) only. The duty not to
// harm a child's well-being (s.9(2)) always applies.
export const CHILD_EXEMPTION_NOTE = 'A Fourth Schedule exemption lifts only s.9(1) and s.9(3). The well-being duty in s.9(2) still applies.';

// Downstream targets told to stop when a consent is withdrawn (s.6(6)). Systems come from
// the active consent workflows; processors from Vendor Risk.
export const PROPAGATION_TARGETS = [
  { system: 'Salesforce CRM', type: 'system', action: 'update_flag' },
  { system: 'MoEngage campaigns', type: 'processor', action: 'suppress' },
  { system: 'Mailchimp', type: 'processor', action: 'suppress' },
  { system: 'Partner NBFC (co-lending)', type: 'processor', action: 'stop_processing' }
];

// Data Map activities that rely on consent, by purpose category
export const CONSENT_ACTIVITIES = {
  Marketing: [{ id: 'PA-004', name: 'Diwali campaign' }, { id: 'PA-009', name: 'App analytics' }],
  Sharing: [{ id: 'PA-001', name: 'Loan origination (co-lending share)' }],
  Processing: [{ id: 'PA-009', name: 'App analytics' }],
  Service: [],
  Legal: []
};

export const REGION_TREE = {
  Africa: {
    'Northern Africa': ['Algeria', 'Egypt', 'Libya', 'Morocco', 'Sudan']
  },
  Americas: {
    'North America': ['Canada', 'United States', 'Mexico'],
    'South America': ['Brazil', 'Chile']
  },
  Asia: {
    'Southern Asia': ['India', 'Sri Lanka', 'Nepal'],
    'Eastern Asia': ['Japan', 'South Korea']
  },
  Europe: {
    'Western Europe': ['France', 'Germany', 'Netherlands'],
    'Southern Europe': ['Italy', 'Spain']
  },
  Oceania: {
    'Australia and New Zealand': ['Australia', 'New Zealand']
  }
};

export const DATA_ATTRIBUTES = [
  'Nationality',
  'Permanent Address',
  'Current Address',
  'Residential Status',
  'Socio-Economic Profile',
  'Email Address',
  'Phone Number'
];

export const PURPOSE_CATEGORIES = [
  'Legal',
  'Service',
  'Processing',
  'Sharing',
  'Marketing'
];

export const CHANNELS = [
  'Email',
  'In App',
  'SMS',
  'Postal'
];

export const ALL_LANGUAGES = [
  { name: 'English', code: 'en-US' },
  { name: 'Bengali', code: 'bn-IN' },
  { name: 'Maltese', code: 'mt-MT' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Greek', code: 'el-GR' },
  { name: 'Sanskrit', code: 'sa-IN' },
  { name: 'Turkish', code: 'tr-TR' },
  { name: 'Danish', code: 'da-DK' },
  { name: 'German', code: 'de-DE' },
  { name: 'French', code: 'fr-FR' },
  { name: 'Spanish', code: 'es-ES' }
];

export const INTEGRATIONS = [
  ['mailchimp', 'Mailchimp', 0],
  ['salesforce', 'Salesforce', 0],
  ['rest', 'REST API', 0],
  ['hubspot', 'HubSpot', 1],
  ['brevo', 'Brevo (Sendinblue)', 1],
  ['activecampaign', 'ActiveCampaign', 1],
  ['sendgrid', 'SendGrid', 0],
  ['omnisend', 'Omnisend', 0]
];

export const DEMO_ACCOUNTS = [
  { id: 'u1', name: 'Asha Verma', email: 'asha.verma@aarohan.example', role: 'Super Administrator' },
  { id: 'u2', name: 'Meera Iyer', email: 'meera.iyer@aarohan.example', role: 'DPO' },
  { id: 'u3', name: 'Priya Nair', email: 'priya.nair@aarohan.example', role: 'Auditor' }
];

export const ROLES = {
  'Super Administrator': {
    modules: ['dashboard', 'records', 'guardian', 'builder', 'jurisdictions', 'workflows', 'emails', 'implementation'],
    edit: true
  },
  'DPO': {
    modules: ['dashboard', 'records', 'guardian', 'builder', 'jurisdictions', 'workflows', 'emails', 'implementation'],
    edit: true
  },
  'Auditor': {
    modules: ['dashboard', 'records', 'guardian', 'jurisdictions'],
    edit: false
  }
};

const METHOD_REFS = {
  existing_kyc_record: 'Rule 10(1)(a)',
  authority_issued_details: 'Rule 10(1)(b)',
  virtual_token: 'Rule 10(1)(b), 10(2)',
  guardianship_order: 'Rule 11'
};

// Guardian verification requests (Guardian & Child Consent tab) and the relationships the
// verified ones created. All verification is simulated and flagged as such.
function createGuardianSeed(now, day) {
  const at = (d, h = 10) => new Date(now - d * day + h * 36e5).toISOString();
  const LOAN = { service: 'Loan origination (minor co-applicant)', activityIds: ['PA-001'], purposes: ['Account opening', 'Loan servicing communication'], noticeVersion: 'Minor co-applicant (guardian) v1.3' };
  const APP = { service: 'Aarohan Money Smart', activityIds: ['PA-010'], purposes: ['Money Smart lessons', 'Progress reports to guardian'], noticeVersion: 'Money Smart guardian notice v1.0' };
  const PWD = { service: 'Loan servicing', activityIds: ['PA-001'], purposes: ['Loan servicing communication'], noticeVersion: 'Lawful guardian notice v1.0' };

  // [id, child, guardian, relationship, kind, channel, method, status, requested days ago, extra]
  const rows = [
    ['VPC-2026-0118', 'DP-10482', 'DP-04471', 'parent', LOAN, 'Branch tablet', 'existing_kyc_record', 'verified', 13],
    ['VPC-2026-0121', 'DP-10511', 'DP-04512', 'parent', APP, 'Web', 'existing_kyc_record', 'verified', 9],
    ['VPC-2026-0124', 'DP-10530', 'DP-04530', 'parent', APP, 'Mobile app', 'existing_kyc_record', 'verified', 7],
    ['VPC-2026-0127', 'DP-10575', 'DP-04575', 'parent', APP, 'Mobile app', 'virtual_token', 'verified', 5],
    ['VPC-2026-0130', 'DP-10560', 'DP-04560', 'parent', APP, 'Web', 'virtual_token', 'verified', 40],
    ['VPC-2026-0133', 'DP-03310', 'DP-03311', 'pwd_guardian', PWD, 'Branch tablet', 'guardianship_order', 'verified', 22,
      { guardianshipOrder: { authority: 'District Court, Chennai', orderNo: 'GO/2024/118', issuedOn: '2024-06-02', law: 'RPwD Act 2016', validTill: null } }],
    ['VPC-2026-0136', 'DP-10544', 'DP-04544', 'parent', APP, 'Web', 'authority_issued_details', 'in_review', 2],
    ['VPC-2026-0139', 'DP-10602', 'DP-04588', 'parent', APP, 'Mobile app', 'authority_issued_details', 'in_review', 1],
    // A sibling of Aarav: the guardian is already verified, so the identity can be reused
    ['VPC-2026-0142', 'DP-10628', 'DP-04471', 'parent', LOAN, 'Branch tablet', 'existing_kyc_record', 'in_review', 1],
    ['VPC-2026-0145', 'DP-10615', 'DP-04602', 'parent', APP, 'Web', null, 'guardian_pending', 3],
    ['VPC-2026-0148', 'DP-10590', 'DP-04619', 'parent', APP, 'Mobile app', 'virtual_token', 'rejected', 6,
      { reason: 'Guardian must be an adult (Rule 10). The person who identified as the parent is under 18.' }],
    ['VPC-2026-0109', 'DP-10544', 'DP-04544', 'parent', APP, 'Web', null, 'expired', 19,
      { reason: 'Guardian did not respond within 7 days. Processing stays blocked.' }]
  ];

  const vpcRequests = rows.map(([id, childId, guardianId, relationship, kind, channel, method, status, ago, extra = {}], i) => {
    const requestedAt = at(ago, 9);
    const history = [{ at: requestedAt, status: 'guardian_pending', by: 'System', note: 'Age gate: under 18. Guardian invited.' }];
    if (method) history.push({ at: at(ago, 10), status: 'in_review', by: 'System', note: 'Verification method chosen.' });
    const decided = status === 'verified' || status === 'rejected';
    if (decided) history.push({ at: at(ago, 11), status, by: 'Meera Iyer', note: status === 'verified' ? 'Guardian verified. Consent active.' : extra.reason });
    if (status === 'expired') history.push({ at: at(ago - 7, 9), status: 'expired', by: 'System', note: extra.reason });
    const checks = method ? [{ step: 'guardian_contact_otp', result: 'passed', note: 'Confirms contact only. Not verification.' }] : [];
    if (method && status !== 'in_review') {
      checks.push(status === 'rejected'
        ? { step: 'guardian_is_adult', result: 'failed', source: 'Age on record: under 18' }
        : { step: 'guardian_is_adult', result: 'passed', source: method === 'existing_kyc_record' ? 'KYC record PA-002 · DOB on file' : method === 'virtual_token' ? 'Token TKN-' + (4100 + i) + ' · adult: true' : 'Identity on record' });
    }
    if (method === 'guardianship_order') checks.push({ step: 'guardianship_order', result: 'passed', source: 'District Court, Chennai · GO/2024/118 · reviewer confirmed' });
    return {
      id,
      childId,
      guardianId,
      relationship,
      relationshipDeclaration: relationship === 'pwd_guardian'
        ? 'Guardian declared they are the court-appointed lawful guardian.'
        : 'Guardian declared they are the parent of the child.',
      service: kind.service,
      activityIds: kind.activityIds,
      purposes: kind.purposes,
      channel,
      noticeVersion: kind.noticeVersion,
      method,
      methodRef: method ? METHOD_REFS[method] : null,
      simulated: true,
      checks,
      evidenceRef: method === 'virtual_token' ? 'TKN-' + (4100 + i) : method === 'guardianship_order' ? 'GO/2024/118' : method === 'authority_issued_details' ? 'DOC-' + (52000 + i) : null,
      status,
      reason: extra.reason || '',
      requestedAt,
      decidedBy: decided ? 'Meera Iyer' : null,
      decidedAt: decided ? at(ago, 11) : null,
      expiresAt: status === 'guardian_pending' ? at(ago - 7, 9) : null,
      guardianshipOrder: extra.guardianshipOrder || null,
      history
    };
  });

  const relationships = vpcRequests.filter(v => v.status === 'verified').map((v, i) => ({
    id: 'REL-' + String(31 + i).padStart(4, '0'),
    guardianId: v.guardianId,
    dependentId: v.childId,
    type: v.relationship,
    declaredAt: v.requestedAt,
    declaration: v.relationshipDeclaration,
    evidenceRef: v.id,
    status: 'active',
    primary: true,
    guardianshipOrder: v.guardianshipOrder
  }));

  return { vpcRequests, relationships };
}

// The withdrawal the demo follows: Rahul Deshmukh withdrew marketing consent (CR-5007)
function createSeedPropagation(now, day) {
  const t = mins => new Date(now - 1 * day + mins * 6e4).toISOString();
  return {
    id: 'PRP-0407',
    consentId: 'CR-5007',
    principalId: 'DP-02210',
    purposes: ['Personalised Offers and Advertising', 'Promotional Offers'],
    activities: [{ id: 'PA-004', name: 'Diwali campaign' }, { id: 'PA-009', name: 'App analytics' }],
    targets: [
      { system: 'Salesforce CRM', type: 'system', action: 'update_flag', sentAt: t(0), ack: 'acknowledged', ackAt: t(2) },
      { system: 'MoEngage campaigns', type: 'processor', action: 'suppress', sentAt: t(0), ack: 'acknowledged', ackAt: t(5) },
      { system: 'Mailchimp', type: 'processor', action: 'suppress', sentAt: t(0), ack: 'acknowledged', ackAt: t(4) },
      { system: 'Partner NBFC (co-lending)', type: 'processor', action: 'stop_processing', sentAt: t(0), ack: 'pending', ackAt: null }
    ],
    retention: { outcome: 'retain', reason: 'Active loan: KYC and loan records kept under RBI KYC Directions. Marketing data erased.', jobId: 'DEL-2026-114' },
    guardPolicy: 'GP-WD-0407',
    createdAt: t(0),
    createdBy: 'Meera Iyer'
  };
}

export function createDefaultConsentState() {
  const day = 864e5;
  const now = Date.now();
  let seed = 5;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  // [name, description, category, subject, essential, allowed for children, status]
  const rawPurposes = [
    ['Legal and Regulatory Compliance (KYC, RBI reporting)', 'To verify identity and meet RBI KYC Directions, PMLA and other legal obligations.', 'Legal', 'Customer', 1, 'yes'],
    // Was "Trade or Transfer of Personal Data of Minors (13–16 years)": a GDPR age band. Under
    // DPDP every person under 18 is a child. Aarohan (an NBFC) is not a Fourth Schedule exempt
    // class and partner sharing is not an exempt purpose, so this is never allowed. It is kept,
    // disabled, as a record of the decision.
    ["Sharing of Children's Data with Partners (under 18)", 'Not permitted. Aarohan is not an exempt class under the Fourth Schedule and sharing with partners is not an exempt purpose. Disabled so it is never offered.', 'Sharing', 'Child', 0, 'no', 'Disabled'],
    ['Customer Support and Service Communication', 'To respond to support queries and send service and security messages.', 'Service', 'Customer', 1, 'yes'],
    ["Processing of Children's Personal Data (under 18)", "To open and service accounts for children, with the verified consent of a parent or lawful guardian (DPDP s.9(1), Rule 10).", 'Processing', 'Child', 0, 'yes'],
    ['Credit Assessment and Bureau Checks', 'To assess loan applications using bureau reports and income details.', 'Processing', 'Customer', 0, 'no'],
    ['Sharing with Co-lending Partners', 'To share loan application data with co-lending partner banks and NBFCs.', 'Sharing', 'Customer', 0, 'no'],
    ['Personalised Offers and Advertising', 'To personalise loan offers and ads based on app and website behaviour.', 'Marketing', 'Customer', 0, 'no'],
    ['Product Analytics and Improvement', 'To analyse how customers use the app and website to improve products.', 'Processing', 'Customer', 0, 'no']
  ];

  const purposes = rawPurposes.map((p, i) => ({
    id: 'pur-' + (1000 + i),
    name: p[0],
    description: p[1],
    category: p[2],
    subject: p[3],
    essential: Boolean(p[4]),
    allowForChildren: p[5],
    validity: 365,
    attributes: ['Nationality', 'Current Address'],
    status: p[6] || 'Enabled',
    created: new Date(now - (340 - i * 7) * day).toISOString(),
    updated: new Date(now - (30 - i) * day).toISOString()
  }));

  // Service messages (security alerts) are sent to run the account, not on consent, so they
  // are never offered as a withdrawable consent choice
  const rawPrefs = [
    ['Feature Announcements', 'Be first to hear about new features.', ['Email', 'In App'], 'Marketing'],
    ['Security Alerts', 'Important alerts about your account security. Sent as a service message.', ['Email', 'SMS', 'In App'], 'Service'],
    ['Advertising', 'Relevant offers from us and partners.', ['Email'], 'Marketing'],
    ['Promotional Offers', 'Discounts and seasonal promotions.', ['Email', 'SMS'], 'Marketing'],
    ['Product Updates', 'Release notes and roadmap news.', ['Email', 'In App'], 'Marketing']
  ];

  const preferences = rawPrefs.map((p, i) => ({
    id: 'prf-' + (2000 + i),
    name: p[0],
    description: p[1],
    channels: p[2],
    category: p[3],
    status: 'Enabled',
    created: new Date(now - (300 - i * 11) * day).toISOString(),
    updated: new Date(now - (24 - i * 3) * day).toISOString()
  }));

  const createJur = (name, code, desc, regs, rg, regions, created, updated) => ({
    // Stable, so the server can tell a deleted demo jurisdiction from one it has already
    id: 'jur-' + code,
    name,
    code,
    description: desc,
    regulations: regs,
    rights: rg,
    regions,
    legalBases: {},
    created,
    updated
  });

  const jurisdictions = [
    createJur('India', 'india', 'Covers India under the DPDP Act', ['DPDPA'], [0, 1, 2, 3, 5], ['India'], '2025-06-12T17:38:00Z', '2025-06-12T17:38:00Z'),
    createJur('US - New Hampshire', 'new_hampshire', 'Covers New Hampshire under NHPA', ['NHPA'], [0, 1, 2, 3, 4], ['United States'], '2025-06-12T17:35:00Z', '2026-08-20T10:39:00Z'),
    createJur('US - Virginia', 'virginia', 'Covers Virginia under the VCDPA', ['VCDPA'], [0, 1, 2, 3, 4], ['United States'], '2025-06-12T17:40:00Z', '2025-06-12T17:40:00Z'),
    createJur('EU / EEA', 'eu_eea', 'Covers EU member states under GDPR', ['GDPR'], [1, 2, 3, 4, 5], ['France', 'Germany', 'Netherlands', 'Italy', 'Spain'], '2025-06-12T17:45:00Z', '2026-02-03T09:00:00Z'),
    createJur('Brazil', 'brazil', 'Covers Brazil under the LGPD', ['LGPD'], [1, 2, 3, 4, 5], ['Brazil'], '2025-06-12T17:50:00Z', '2025-06-12T17:50:00Z'),
    createJur('Canada', 'canada', 'Covers Canada under PIPEDA', ['PIPEDA'], [2, 4, 5], ['Canada'], '2025-06-12T17:55:00Z', '2025-06-12T17:55:00Z')
  ];

  jurisdictions.forEach(j => {
    purposes.forEach((p, i) => {
      j.legalBases[p.id] = {
        basis: i === 0 ? 'Legal Obligation' : i === 2 ? 'Contract' : 'Consent-Opt In',
        enabled: i < 5
      };
    });
  });

  // Aarohan Finance customers (adults). [first, last, country, city, principal id, language]
  const people = [
    ['Ravi', 'Kumar', 'India', 'Hyderabad', 'DP-02101', 'te-IN'],
    ['Priya', 'Kulkarni', 'India', 'Pune', 'DP-04471', 'mr-IN'],
    ['Rahul', 'Deshmukh', 'India', 'Mumbai', 'DP-02210', 'en-IN'],
    ['Ananya', 'Sharma', 'India', 'New Delhi', 'DP-04512', 'hi-IN'],
    ['Lakshmi', 'Narayanan', 'India', 'Chennai', 'DP-03311', 'ta-IN'],
    ['Imran', 'Qureshi', 'India', 'Hyderabad', 'DP-04575', 'ur-IN'],
    ['Tara', 'Singh', 'India', 'Mumbai', 'DP-02144', 'hi-IN'],
    ['Arjun', 'Mehta', 'India', 'Ahmedabad', 'DP-02167', 'gu-IN'],
    // Card customers of Aarohan Finance (EU) B.V. (Data Map PA-008, GDPR)
    ['Anika', 'Rao', 'Germany', 'Frankfurt', 'DP-08011', 'de-DE'],
    ['Vikram', 'Nair', 'Netherlands', 'Amsterdam', 'DP-08024', 'nl-NL']
  ];
  const consentChannels = ['Web', 'Mobile app', 'Branch tablet', 'Call centre'];

  const consents = [];
  for (let i = 0; i < 42; i++) {
    const p = pick(people);
    const r = rnd();
    const st = r < 0.55 ? 'Accept All' : r < 0.75 ? 'Reject All' : 'Partial Consent';
    const age = Math.floor(rnd() * 330);
    // CR-5007 is the withdrawal the platform demo follows (Purpose Guard, Proof Ledger)
    const withdrawn = i === 7 || rnd() < 0.12;
    const expired = !withdrawn && rnd() < 0.1;
    const notices = [['Newsletter', '1.0'], ['Terms and Conditions', '2.1'], ['Privacy Policy', '3.0']]
      .filter(() => rnd() < 0.6)
      .map(n => ({ identifier: n[0], version: n[1], content: n[0] + ' accepted' }));

    consents.push({
      id: 'CR-' + (5000 + i),
      principalId: i === 7 ? 'DP-02210' : p[4],
      ageBand: '18_plus',
      channel: consentChannels[i % consentChannels.length],
      language: p[5],
      notice: { id: 'NT-01', version: i % 5 === 0 ? 'v3.1' : 'v3.2' },
      first: i === 7 ? 'Rahul' : p[0],
      last: i === 7 ? 'Deshmukh' : p[1],
      email: (i === 7 ? 'rahul.deshmukh' : (p[0] + '.' + p[1]).toLowerCase()) + i + '@example.in',
      authId: 'auth-' + Math.floor(rnd() * 1e5),
      source: rnd() < 0.8 ? 'Private' : 'Public',
      country: p[2],
      city: p[3],
      ip: '198.51.' + Math.floor(rnd() * 255) + '.' + Math.floor(rnd() * 255),
      // Aadhaar is stored masked (last 4 digits only), as UIDAI requires for display
      aadhaar: p[2] === 'India' ? 'XXXX XXXX ' + String(1000 + Math.floor(rnd() * 9000)) : '',
      verified: rnd() < 0.7,
      maskIP: false,
      phone: '+91 98' + String(100 + i * 7).slice(-3) + ' ••' + String(200 + i * 3).slice(-3),
      zip: String(411001 + i * 13),
      status: st,
      withdrawn,
      expired,
      created: new Date(now - age * day).toISOString(),
      owner: 'own-' + Math.floor(rnd() * 1e3),
      preferences: preferences.slice(0, 3).map(x => ({
        name: x.name,
        allowed: st === 'Accept All' ? true : st === 'Reject All' ? false : rnd() < 0.5
      })),
      proofs: [{ content: 'Banner v2 accepted via web', form: 'Consent Preference Page' }],
      legalNotices: notices,
      additional: ''
    });
  }

  // Children's consents, each given by a verified parent or lawful guardian (s.9(1)).
  // [child id, first, last, guardian id, city, channel, vpc id, purposes, days ago]
  const childConsents = [
    ['DP-10482', 'Aarav', 'Kulkarni', 'DP-04471', 'Pune', 'Branch tablet', 'VPC-2026-0118', ['Account opening', 'Loan servicing communication'], 13],
    ['DP-10511', 'Diya', 'Sharma', 'DP-04512', 'New Delhi', 'Web', 'VPC-2026-0121', ['Money Smart lessons', 'Progress reports to guardian'], 9],
    ['DP-10530', 'Kabir', 'Reddy', 'DP-04530', 'Vijayawada', 'Mobile app', 'VPC-2026-0124', ['Money Smart lessons'], 7],
    ['DP-10575', 'Zoya', 'Qureshi', 'DP-04575', 'Hyderabad', 'Mobile app', 'VPC-2026-0127', ['Money Smart lessons', 'Progress reports to guardian'], 5],
    ['DP-10560', 'Meher', 'Bose', 'DP-04560', 'Kolkata', 'Web', 'VPC-2026-0130', ['Money Smart lessons'], 40],
    ['DP-03310', 'Suresh', 'Narayanan', 'DP-03311', 'Chennai', 'Branch tablet', 'VPC-2026-0133', ['Loan servicing communication'], 22]
  ];
  childConsents.forEach(([pid, first, last, gid, city, channel, vpcId, purposesGiven, ago], k) => {
    const created = new Date(now - ago * day).toISOString();
    consents.push({
      id: 'CR-' + (5042 + k),
      principalId: pid,
      actingPrincipalId: gid,
      actingAs: pid === 'DP-03310' ? 'pwd_guardian' : 'guardian',
      vpcId,
      ageBand: pid === 'DP-03310' ? '18_plus' : 'under_18',
      channel,
      language: 'en-IN',
      notice: { id: 'NT-07', version: 'Guardian notice v1.3' },
      first,
      last: last[0] + '.',
      email: 'guardian.' + gid.toLowerCase() + '@example.in',
      authId: 'auth-' + (61000 + k),
      source: 'Private',
      country: 'India',
      city,
      ip: '203.0.113.' + (20 + k),
      aadhaar: '',
      verified: true,
      maskIP: true,
      phone: '—',
      zip: '',
      status: 'Partial Consent',
      withdrawn: false,
      expired: false,
      created,
      owner: 'own-guardian',
      preferences: [
        { name: 'Security Alerts', allowed: true },
        { name: 'Promotional Offers', allowed: false },
        { name: 'Advertising', allowed: false }
      ],
      purposesGiven,
      proofs: [{ content: 'Guardian consent after verification ' + vpcId, form: 'Guardian & Child Consent' }],
      legalNotices: [{ identifier: 'Guardian notice', version: '1.3', content: 'Guardian notice accepted' }],
      receipt: { id: 'RCPT-' + (88213 + k), issuedAt: created },
      additional: ''
    });
  });

  return {
    company: 'Aarohan Finance Ltd',
    workspace: 'aarohan-finance',
    accounts: DEMO_ACCOUNTS,
    roles: ROLES,
    consents,
    purposes,
    preferences,
    jurisdictions,
    rights: DEFAULT_RIGHTS,
    legalBasisOptions: LEGAL_BASIS_OPTIONS,
    regionTree: REGION_TREE,
    attributes: DATA_ATTRIBUTES,
    purposeCategories: PURPOSE_CATEGORIES,
    channels: CHANNELS,
    languages: ALL_LANGUAGES,
    builder: {
      settings: {
        watermark: true,
        maskIP: false,
        badge: false,
        verification: true,
        emailVerify: true,
        whatsappVerify: false,
        smsVerify: true,
        countryCodes: 34,
        modalSize: 'Full Screen',
        defaultRoute: 'Consent Preference Page',
        autoTranslate: false,
        brandColor: '#1f8a70',
        logoName: '(none)',
        privacyUrl: 'https://aarohan.example/privacy',
        termsUrl: 'https://aarohan.example/terms',
        // Age gate before consent (DPDP s.9, Rule 10). Under 18 starts the guardian path.
        collectAge: true,
        ageMethod: 'Age band',
        unknownAgeAsChild: false
      },
      languages: ['en-US', 'hi-IN'],
      content: {
        purposeTitle: 'Consent Purposes',
        preferenceTitle: 'Communication Preferences',
        reject: 'Reject All',
        accept: 'Accept All',
        save: 'Save My Choice',
        verifyBtn: 'Verify',
        verifyTitle: 'Record your privacy choice by identifying yourself'
      },
      theme: 'Light Theme',
      customColors: ['#2f6fe4', '#9b51e0', '#e83e8c'],
      published: true,
      dirty: false,
      lastPublished: '2026-08-20T10:39:00Z',
      history: [
        { v: 3, at: '2026-08-20T10:39:00Z', by: 'Asha Verma' },
        { v: 2, at: '2026-03-04T09:00:00Z', by: 'Asha Verma' },
        { v: 1, at: '2025-11-03T16:58:00Z', by: 'Asha Verma' }
      ]
    },
    workflows: [
      {
        id: 'w1',
        name: 'Consent Withdrawal Sync',
        status: 'Active',
        created: '2026-05-14T09:20:00Z',
        updated: '2026-07-02T10:00:00Z',
        nodes: [
          { id: 'n1', type: 'start', label: 'Start' },
          { id: 'n2', type: 'salesforce', label: 'Salesforce', action: 'Update Contact', conn: 'Demo Salesforce' },
          { id: 'n3', type: 'end', label: 'End' }
        ],
        edges: [['n1', 'n2'], ['n2', 'n3']]
      },
      {
        id: 'w2',
        name: 'Newsletter Opt-in to Mailchimp',
        status: 'Draft',
        created: '2026-08-28T11:05:00Z',
        updated: '2026-09-12T10:00:00Z',
        nodes: [
          { id: 'n1', type: 'start', label: 'Start' },
          { id: 'n2', type: 'mailchimp', label: 'Mailchimp', action: 'Add to List', conn: 'Demo Mailchimp' },
          { id: 'n3', type: 'end', label: 'End' }
        ],
        edges: [['n1', 'n2'], ['n2', 'n3']]
      }
    ],
    ...createGuardianSeed(now, day),
    propagations: [createSeedPropagation(now, day)],
    integrations: INTEGRATIONS,
    senders: [
      { name: 'Privacy Compliance', email: 'privacy@aarohan.example' },
      { name: 'Support Team', email: 'support@aarohan.example' }
    ],
    email: {
      sender: 'privacy@privacysek.test',
      subject: 'PrivacySEK Consent Verification',
      body: 'Hey {full_name},<br><br>Please verify your email to confirm your privacy preferences.<br><br><a href="#" style="color:#10b981;font-weight:bold">Verify email</a>'
    }
  };
}

// Records, purposes, preferences, jurisdictions, workflows, senders, the banner builder and
// the email template are saved; accounts, roles and option lists are reference data
const consentStore = createModuleStore('consent', createDefaultConsentState);

export function loadConsentState() {
  return consentStore.get();
}

export function saveConsentState(state) {
  return consentStore.save(state);
}

// Async: resolves with the same state object, refilled with the demo data
export function resetConsentState() {
  return consentStore.reset();
}

export function loadCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEMO_ACCOUNTS[0]; // Super Administrator default
}

export function saveCurrentUser(user) {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {}
}
