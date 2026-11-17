// Demo records for the collections read by /api/platform/init and /api/cookies.
//
// Each entry names a collection, the fields that identify a record (matching the unique
// indexes in db.js) and a function that builds the documents. The documents come from the
// same front-end data the app falls back to in Demo Mode, so a seeded database and Demo
// Mode show the same thing.
//
// ROPA, Consent, Discovery, Rights and DPIA are not listed here: /api/store seeds them
// (see storeRoutes.js), and seedDatabase() triggers that too.
import sampleData from '../../src/data/sampleData.js';
import { createCookieDemoState } from '../../src/modules/cookies/cookieData.js';

const clone = value => structuredClone(value);
const stamp = docs => {
  const now = new Date().toISOString();
  return docs.map(d => ({ ...clone(d), updatedAt: now }));
};

// Built once per seed run so every cookie collection comes from the same demo state
let cookieState = null;
const cookies = () => (cookieState ||= createCookieDemoState());

export const PLATFORM_SEEDS = [
  { collection: 'duties', key: ['id'], docs: () => stamp(sampleData.duties) },
  { collection: 'discovery_assets', key: ['n'], docs: () => stamp(sampleData.assets) },
  {
    collection: 'discovery_sources', key: ['name'],
    docs: () => stamp(sampleData.sources.map(([name, details, status]) => ({ name, details, status }))),
  },
  {
    collection: 'discovery_findings', key: ['a', 'n'],
    docs: () => stamp(sampleData.findings.map(f => ({ ...f, done: Boolean(f.done) }))),
  },
  { collection: 'ropa_activities', key: ['n'], docs: () => stamp(sampleData.ropa) },
  { collection: 'consent_profiles', key: ['n'], docs: () => stamp(sampleData.consentProfiles) },
  { collection: 'notices', key: ['n'], docs: () => stamp(sampleData.notices) },
  { collection: 'purpose_guard_policies', key: ['n'], docs: () => stamp(sampleData.guard.policies) },
  {
    collection: 'purpose_guard_approvals', key: ['id'],
    docs: () => stamp(sampleData.guard.approvals.map(a => ({ ...a, status: 'pending' }))),
  },
  {
    // The feed is read newest first, so createdAt steps back one second per entry
    collection: 'purpose_guard_feed', key: ['time', 'activity'],
    docs: () => sampleData.guard.feed.map(([time, activity, requestedBy, destination, records, decision], i) => ({
      time, activity, requestedBy, destination, records, decision,
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
    })),
  },
  { collection: 'retention_schedules', key: ['c'], docs: () => stamp(sampleData.retention) },
  {
    collection: 'deletion_jobs', key: ['id'],
    docs: () => stamp(sampleData.deletionJobs.map(([id, name, systems, records, status, action]) => ({ id, name, systems, records, status, action }))),
  },
  { collection: 'vendors', key: ['n'], docs: () => stamp(sampleData.vendors) },
  { collection: 'rights_requests', key: ['id'], docs: () => stamp(sampleData.rights) },
  { collection: 'incidents', key: ['id'], docs: () => stamp(sampleData.incidents) },
  { collection: 'assessments', key: ['n'], docs: () => stamp(sampleData.assessments) },
  {
    collection: 'proof_ledger', key: ['hash'],
    docs: () => sampleData.ledger.map(([timestamp, event, context, hash], seq) => ({
      timestamp, event, context, hash, seq, createdAt: new Date().toISOString(),
    })),
  },
  { collection: 'ai_inventory', key: ['n'], docs: () => stamp(sampleData.ai) },
  {
    // The front end treats the platform as initialized once org.short is present
    collection: 'platform_settings', key: ['key'],
    docs: () => stamp([{
      key: 'org_settings',
      org: sampleData.org,
      templates: sampleData.templates,
      atemplates: sampleData.atemplates,
      training: sampleData.training,
      workflows: sampleData.workflows,
      integrations: sampleData.integrations,
      langs: sampleData.langs,
    }]),
  },

  // Cookie Consent
  { collection: 'cookie_categories', key: ['id'], docs: () => clone(cookies().categories) },
  { collection: 'cookies', key: ['id'], docs: () => clone(cookies().cookies) },
  {
    collection: 'banner_configs', key: ['key'],
    docs: () => stamp([{ ...cookies().draft, key: 'draft' }, { ...cookies().published, key: 'published' }]),
  },
  { collection: 'banner_versions', key: ['version'], docs: () => clone(cookies().versions) },
  {
    collection: 'cookie_tags', key: ['id'],
    docs: () => clone([...cookies().blockedTags, ...cookies().availableTags]),
  },
  {
    collection: 'consent_records', key: ['id'],
    docs: () => cookies().consentRecords.map(r => ({ ...clone(r), createdAt: r.timestamp })),
  },
  { collection: 'page_views', key: ['date'], docs: () => clone(cookies().pageViews) },
];

export function resetSeedCache() {
  cookieState = null;
}
