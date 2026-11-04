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
  'Legal Obligation',
  'Contract'
];

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
  { id: 'u1', name: 'Asha Verma', email: 'asha.verma@demo-acme.test', role: 'Super Administrator' },
  { id: 'u2', name: 'Daniel Okafor', email: 'daniel.okafor@demo-acme.test', role: 'DPO' },
  { id: 'u3', name: 'Priya Nair', email: 'priya.nair@demo-acme.test', role: 'Auditor' }
];

export const ROLES = {
  'Super Administrator': {
    modules: ['dashboard', 'records', 'builder', 'jurisdictions', 'workflows', 'emails', 'implementation'],
    edit: true
  },
  'DPO': {
    modules: ['dashboard', 'records', 'builder', 'jurisdictions', 'workflows', 'emails', 'implementation'],
    edit: true
  },
  'Auditor': {
    modules: ['dashboard', 'records', 'jurisdictions'],
    edit: false
  }
};

export function createDefaultConsentState() {
  const day = 864e5;
  const now = Date.now();
  let seed = 5;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  const rawPurposes = [
    ['Data Processing for Legal and Regulatory Compliance', 'To process personal data needed to meet legal and regulatory obligations.', 'Legal', 'Customer', 1],
    ['Trade or Transfer of Personal Data of Minors (13–16 years)', 'To share data of minors aged 13–16 with partners, with guardian consent.', 'Sharing', 'Customer', 0],
    ['Customer Support and Service Communication', 'To respond to support queries and send service messages.', 'Service', 'Customer', 1],
    ['Personal Data Processing of Minors', 'To process personal data of minors under applicable law.', 'Processing', 'Customer', 0],
    ['Use of Confidential Information', 'To handle confidential information shared with the organisation.', 'Processing', 'Customer', 0],
    ['Trade or Transfer of Personal Data', 'To sell or share personal data with third parties in line with data protection laws.', 'Sharing', 'Customer', 0],
    ['Behavioral Advertising', 'To personalise advertising based on browsing and purchase behaviour.', 'Marketing', 'Customer', 0],
    ['Data Utilization for Additional Purposes', 'To use collected data for purposes beyond the original collection.', 'Processing', 'Customer', 0]
  ];

  const purposes = rawPurposes.map((p, i) => ({
    id: 'pur-' + (1000 + i),
    name: p[0],
    description: p[1],
    category: p[2],
    subject: p[3],
    essential: Boolean(p[4]),
    validity: 365,
    attributes: ['Nationality', 'Current Address'],
    status: 'Enabled',
    created: new Date(now - (340 - i * 7) * day).toISOString(),
    updated: new Date(now - (30 - i) * day).toISOString()
  }));

  const rawPrefs = [
    ['Feature Announcements', 'Be first to hear about new features.', ['Email', 'In App']],
    ['Security Alerts', 'Important alerts about your account security.', ['Email', 'SMS', 'In App']],
    ['Advertising', 'Relevant offers from us and partners.', ['Email']],
    ['Promotional Offers', 'Discounts and seasonal promotions.', ['Email', 'SMS']],
    ['Product Updates', 'Release notes and roadmap news.', ['Email', 'In App']]
  ];

  const preferences = rawPrefs.map((p, i) => ({
    id: 'prf-' + (2000 + i),
    name: p[0],
    description: p[1],
    channels: p[2],
    status: 'Enabled',
    created: new Date(now - (300 - i * 11) * day).toISOString(),
    updated: new Date(now - (24 - i * 3) * day).toISOString()
  }));

  const createJur = (name, code, desc, regs, rg, regions, created, updated) => ({
    id: Math.random().toString(16).slice(2, 10) + '-' + code.slice(0, 4),
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

  const people = [
    ['Ravi', 'Kumar', 'India', 'Hyderabad'],
    ['Anna', 'Schmidt', 'Germany', 'Berlin'],
    ['Lucie', 'Martin', 'France', 'Lyon'],
    ['Jake', 'Thompson', 'United States', 'Denver'],
    ['Marta', 'Ruiz', 'Spain', 'Valencia'],
    ['Pieter', 'Jansen', 'Netherlands', 'Utrecht'],
    ['Tara', 'Singh', 'India', 'Mumbai'],
    ['Lena', 'Fischer', 'Germany', 'Hamburg']
  ];

  const consents = [];
  for (let i = 0; i < 48; i++) {
    const p = pick(people);
    const r = rnd();
    const st = r < 0.55 ? 'Accept All' : r < 0.75 ? 'Reject All' : 'Partial Consent';
    const age = Math.floor(rnd() * 330);
    const withdrawn = rnd() < 0.12;
    const expired = !withdrawn && rnd() < 0.1;
    const notices = [['Newsletter', '1.0'], ['Terms and Conditions', '2.1'], ['Privacy Policy', '3.0']]
      .filter(() => rnd() < 0.6)
      .map(n => ({ identifier: n[0], version: n[1], content: n[0] + ' accepted' }));

    consents.push({
      id: 'CR-' + (5000 + i),
      first: p[0],
      last: p[1],
      email: (p[0] + '.' + p[1]).toLowerCase() + i + '@example.test',
      authId: 'auth-' + Math.floor(rnd() * 1e5),
      source: rnd() < 0.8 ? 'Private' : 'Public',
      country: p[2],
      city: p[3],
      ip: '198.51.' + Math.floor(rnd() * 255) + '.' + Math.floor(rnd() * 255),
      // Aadhaar is stored masked (last 4 digits only), as UIDAI requires for display
      aadhaar: p[2] === 'India' ? 'XXXX XXXX ' + String(1000 + Math.floor(rnd() * 9000)) : '',
      verified: rnd() < 0.7,
      maskIP: false,
      phone: '+1 555-01' + String(10 + i),
      zip: '1000' + (i % 9),
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

  return {
    company: 'Demo Acme Corp',
    workspace: 'privacysek-demo',
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
        privacyUrl: 'https://northwind.example/privacy',
        termsUrl: 'https://northwind.example/terms'
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
    integrations: INTEGRATIONS,
    senders: [
      { name: 'Privacy Compliance', email: 'privacy@demo-acme.test' },
      { name: 'Support Team', email: 'support@demo-acme.test' }
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
