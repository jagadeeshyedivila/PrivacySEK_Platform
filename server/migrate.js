import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB, closeDB } from './db.js';
import sampleData from '../src/data/sampleData.js';
import {
  createDefaultBannerConfig,
  INITIAL_IAB_VENDORS,
  INITIAL_GOOGLE_VENDORS
} from '../src/modules/cookies/cookieData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const SCANS_FILE = path.join(DATA_DIR, 'scans.json');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');

const clone = val => JSON.parse(JSON.stringify(val));

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.warn(`[Migrate] Warning reading ${filePath}:`, err.message);
    return [];
  }
}

async function backupFile(filePath) {
  try {
    await fs.access(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    console.log(`[Migrate] Backed up ${path.basename(filePath)} -> ${path.basename(backupPath)}`);
    return backupPath;
  } catch {
    return null;
  }
}

export async function runMigration() {
  console.log('====================================================');
  console.log('PrivacySEK Platform: Migration to Local MongoDB');
  console.log('====================================================');

  const db = await connectDB();
  const stats = {
    scans: { imported: 0, skipped: 0, total: 0 },
    schedules: { imported: 0, skipped: 0, total: 0 },
    cookies: { imported: 0, skipped: 0, total: 0 },
    cookie_categories: { imported: 0, skipped: 0, total: 0 },
    banner_configs: { imported: 0, skipped: 0, total: 0 },
    banner_versions: { imported: 0, skipped: 0, total: 0 },
    cookie_tags: { imported: 0, skipped: 0, total: 0 },
    consent_records: { imported: 0, skipped: 0, total: 0 },
    page_views: { imported: 0, skipped: 0, total: 0 },
    platform_entities: { imported: 0, skipped: 0, total: 0 },
  };

  // 1. Back up JSON files
  await backupFile(SCANS_FILE);
  await backupFile(SCHEDULES_FILE);

  // 2. Migrate Scans from server/data/scans.json
  const rawScans = await readJsonSafe(SCANS_FILE);
  stats.scans.total = rawScans.length;
  for (const scan of rawScans) {
    if (!scan.id) {
      stats.scans.skipped++;
      continue;
    }
    const sanitized = {
      ...scan,
      updatedAt: scan.updatedAt || scan.completedAt || scan.createdAt || new Date().toISOString(),
    };
    const res = await db.collection('scans').updateOne(
      { id: scan.id },
      { $set: sanitized },
      { upsert: true }
    );
    if (res.upsertedCount > 0 || res.modifiedCount > 0) stats.scans.imported++;
    else stats.scans.skipped++;
  }

  // 3. Migrate Schedules from server/data/schedules.json
  const rawSchedules = await readJsonSafe(SCHEDULES_FILE);
  stats.schedules.total = rawSchedules.length;
  for (const schedule of rawSchedules) {
    if (!schedule.id) {
      stats.schedules.skipped++;
      continue;
    }
    const sanitized = {
      ...schedule,
      updatedAt: schedule.updatedAt || new Date().toISOString(),
    };
    const res = await db.collection('schedules').updateOne(
      { id: schedule.id },
      { $set: sanitized },
      { upsert: true }
    );
    if (res.upsertedCount > 0 || res.modifiedCount > 0) stats.schedules.imported++;
    else stats.schedules.skipped++;
  }

  // 4. Migrate Cookie Categories
  const initialCategories = [
    { id: "necessary", name: "Necessary", description: "Supports core site features, authentication, and security. Cannot be disabled.", required: true, defaultState: true, showInPref: true },
    { id: "functional", name: "Functional", description: "Remembers optional settings such as language, theme, and saved items.", required: false, defaultState: false, showInPref: true },
    { id: "analytics", name: "Analytics", description: "Measures site usage to help teams understand visitor engagement and optimize journeys.", required: false, defaultState: false, showInPref: true },
    { id: "marketing", name: "Marketing", description: "Enables promotional campaigns, cross-device marketing attribution, and conversion tracking across channels.", required: false, defaultState: false, showInPref: true },
    { id: "advertising", name: "Advertising", description: "Supports marketing attribution, relevant advertising, and campaign measurement across platforms.", required: false, defaultState: false, showInPref: true },
    { id: "social_media", name: "Social Media", description: "Enables social sharing buttons, embedded media players, and community widgets.", required: false, defaultState: false, showInPref: true },
  ];
  stats.cookie_categories.total = initialCategories.length;
  for (const cat of initialCategories) {
    const res = await db.collection('cookie_categories').updateOne(
      { id: cat.id },
      { $setOnInsert: cat },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.cookie_categories.imported++;
    else stats.cookie_categories.skipped++;
  }

  // 5. Migrate Initial Cookie Inventory
  const DAY = 24 * 60 * 60 * 1000;
  const initialCookiesData = [
    ["privacysek-session", "necessary", "First-party", "PrivacySEK", "Session", "Maintains an active authenticated visitor session.", true, true],
    ["consent-state", "necessary", "First-party", "PrivacySEK", "12 months", "Stores the visitor's verified consent choices and timestamps.", true, true],
    ["lang_pref", "functional", "First-party", "PrivacySEK", "6 months", "Remembers the selected display language for the banner and interface.", false, true],
    ["theme_pref", "functional", "First-party", "PrivacySEK", "6 months", "Remembers the selected interface appearance and contrast settings.", false, true],
    ["_ga", "analytics", "Third-party", "Google Analytics", "13 months", "Distinguishes visitors in the analytics pipeline.", false, true],
    ["_gid", "analytics", "Third-party", "Google Analytics", "24 hours", "Groups page views into short visitor sessions.", false, true],
    ["_cl_demo", "analytics", "Third-party", "Clarity Insights", "30 days", "Unique identifier for session heatmaps and engagement measurement.", false, true],
    ["campaign_ref", "marketing", "First-party", "PrivacySEK", "30 days", "Attributes inbound referral campaigns to landing pages.", false, true],
    ["_fbp", "advertising", "Third-party", "Meta Platforms", "90 days", "Stores and tracks visits across websites for advertising attribution.", false, true],
    ["ad_demo_id", "advertising", "Third-party", "The Trade Desk", "90 days", "Campaign measurement and frequency capping identifier.", false, true],
    ["video-player-id", "social_media", "Third-party", "Media CDN", "Session", "Maintains video player volume and playback state.", false, false],
    ["support-session", "functional", "Third-party", "Support Desk", "30 days", "Maintains customer support chat session state.", false, false],
  ].map((cookie, index) => ({
    id: `cookie-${index + 1}`,
    name: cookie[0],
    category: cookie[1],
    domain: cookie[2] === "First-party" ? "demo.privacysek.example" : `${cookie[3].toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
    path: "/",
    purpose: initialCategories.find(category => category.id === cookie[1])?.name || "Needs review",
    party: cookie[2],
    provider: cookie[3],
    duration: cookie[4],
    description: cookie[5],
    httpOnly: cookie[6],
    secure: cookie[7],
    sameSite: "Lax",
    lastDetected: new Date(Date.now() - index * DAY).toISOString(),
    sourcePage: "https://demo.privacysek.example/",
    classificationStatus: cookie[1] === "unclassified" ? "Review required" : "Reviewed",
    scanId: "scan-initial",
  }));

  stats.cookies.total = initialCookiesData.length;
  for (const cookie of initialCookiesData) {
    const res = await db.collection('cookies').updateOne(
      { id: cookie.id },
      { $setOnInsert: cookie },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.cookies.imported++;
    else stats.cookies.skipped++;
  }

  // 6. Migrate Banner Configurations & Versions
  const defaultBanner = createDefaultBannerConfig();
  stats.banner_configs.total = 2; // draft & published
  for (const key of ['draft', 'published']) {
    const res = await db.collection('banner_configs').updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          ...clone(defaultBanner),
          updatedAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.banner_configs.imported++;
    else stats.banner_configs.skipped++;
  }

  const initialVersion = {
    version: 1,
    publishedAt: new Date(Date.now() - 14 * DAY).toISOString(),
    publishedBy: "Security Lead (admin@privacysek.example)",
    config: clone(defaultBanner),
    note: "Initial production consent banner deployment"
  };
  stats.banner_versions.total = 1;
  const versionRes = await db.collection('banner_versions').updateOne(
    { version: 1 },
    { $setOnInsert: initialVersion },
    { upsert: true }
  );
  if (versionRes.upsertedCount > 0) stats.banner_versions.imported++;
  else stats.banner_versions.skipped++;

  // 7. Migrate Cookie Tags & Rules
  const initialTags = [
    { id: "tag-analytics", name: "Google Analytics Tag", host: "insights.example", source: "https://insights.example/demo-script.js", type: "JavaScript", category: "analytics", status: "Enabled", lastDetected: "2026-10-24" },
    { id: "tag-ads", name: "Meta Conversion Pixel", host: "campaigns.example", source: "https://campaigns.example/demo-script.js", type: "JavaScript", category: "advertising", status: "Enabled", lastDetected: "2026-10-24" },
    { id: "tag-video", name: "Video Player Embed Script", host: "media.example", source: "https://media.example/demo-script.js", type: "JavaScript", category: "social_media", status: "Available", lastDetected: "2026-10-24" },
    { id: "tag-support", name: "Support Chat Widget", host: "support.example", source: "https://support.example/demo-script.js", type: "JavaScript", category: "functional", status: "Available", lastDetected: "2026-10-24" },
  ];
  stats.cookie_tags.total = initialTags.length;
  for (const tag of initialTags) {
    const res = await db.collection('cookie_tags').updateOne(
      { id: tag.id },
      { $setOnInsert: tag },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.cookie_tags.imported++;
    else stats.cookie_tags.skipped++;
  }

  // 8. Migrate Initial Consent Records & Page Views
  let seed = 41;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const countries = ["India", "Germany", "France", "United States", "United Kingdom", "Spain"];
  const devices = ["Desktop", "Mobile", "Tablet"];
  const actions = ["Accept All", "Reject All", "Customize", "Save Preferences", "Close", "Do Not Sell"];
  const today = new Date();
  const consentRecords = [];
  const pageViews = [];

  for (let day = 89; day >= 0; day -= 1) {
    const date = new Date(today.getTime() - day * DAY);
    date.setHours(12, 0, 0, 0);
    const dateKey = date.toISOString().slice(0, 10);
    const views = 160 + Math.floor(random() * 110);
    pageViews.push({ date: dateKey, count: views });
    const eventCount = 5 + Math.floor(random() * 8);
    for (let index = 0; index < eventCount; index += 1) {
      const actionRoll = random();
      const action = actions[actionRoll < 0.39 ? 0 : actionRoll < 0.53 ? 1 : actionRoll < 0.66 ? 2 : actionRoll < 0.79 ? 3 : actionRoll < 0.94 ? 4 : 5];
      const selected = {
        necessary: true,
        functional: action === "Accept All" || (action === "Save Preferences" && random() > 0.45),
        analytics: action === "Accept All" || (action === "Save Preferences" && random() > 0.5),
        marketing: action === "Accept All" || (action === "Save Preferences" && random() > 0.6),
        advertising: action === "Accept All" || (action === "Save Preferences" && random() > 0.65),
        social_media: action === "Accept All" || (action === "Save Preferences" && random() > 0.7),
      };
      consentRecords.push({
        id: `receipt-${1000 + consentRecords.length}`,
        property: "demo.privacysek.example",
        timestamp: new Date(date.getTime() - Math.floor(random() * 10 * 60 * 60 * 1000)).toISOString(),
        action,
        categories: selected,
        result: action === "Close" ? "No change" : action === "Reject All" ? "Optional categories off" : "Choice recorded",
        version: 1,
        source: action === "Do Not Sell" ? "Global Privacy Control" : "Consent banner",
        device: devices[Math.floor(random() * devices.length)],
        region: countries[Math.floor(random() * countries.length)],
        createdAt: new Date(date.getTime()).toISOString(),
      });
    }
  }

  stats.consent_records.total = consentRecords.length;
  for (const rec of consentRecords) {
    const res = await db.collection('consent_records').updateOne(
      { id: rec.id },
      { $setOnInsert: rec },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.consent_records.imported++;
    else stats.consent_records.skipped++;
  }

  stats.page_views.total = pageViews.length;
  for (const pv of pageViews) {
    const res = await db.collection('page_views').updateOne(
      { date: pv.date },
      { $setOnInsert: pv },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.page_views.imported++;
    else stats.page_views.skipped++;
  }

  // 9. Migrate Platform Entities from sampleData.js
  // 9a. Duties
  for (const d of sampleData.duties) {
    stats.platform_entities.total++;
    const res = await db.collection('duties').updateOne(
      { id: d.id },
      { $setOnInsert: { ...d, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9b. Discovery Assets
  for (const a of sampleData.assets) {
    stats.platform_entities.total++;
    const res = await db.collection('discovery_assets').updateOne(
      { n: a.n },
      { $setOnInsert: { ...a, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9c. Discovery Sources
  for (const s of sampleData.sources) {
    stats.platform_entities.total++;
    const res = await db.collection('discovery_sources').updateOne(
      { name: s[0] },
      { $setOnInsert: { name: s[0], details: s[1], status: s[2], updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9d. Discovery Findings
  for (const f of sampleData.findings) {
    stats.platform_entities.total++;
    const res = await db.collection('discovery_findings').updateOne(
      { n: f.n, a: f.a },
      { $setOnInsert: { ...f, done: Boolean(f.done), updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9e. ROPA
  for (const r of sampleData.ropa) {
    stats.platform_entities.total++;
    const res = await db.collection('ropa_activities').updateOne(
      { n: r.n },
      { $setOnInsert: { ...r, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9f. Consent Profiles
  for (const p of sampleData.consentProfiles) {
    stats.platform_entities.total++;
    const res = await db.collection('consent_profiles').updateOne(
      { n: p.n },
      { $setOnInsert: { ...p, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9g. Notices
  for (const n of sampleData.notices) {
    stats.platform_entities.total++;
    const res = await db.collection('notices').updateOne(
      { n: n.n },
      { $setOnInsert: { ...n, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9h. Purpose Guard (Policies, Approvals, Feed)
  for (const pol of sampleData.guard.policies) {
    stats.platform_entities.total++;
    const res = await db.collection('purpose_guard_policies').updateOne(
      { n: pol.n },
      { $setOnInsert: { ...pol, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  for (const appr of sampleData.guard.approvals) {
    stats.platform_entities.total++;
    const res = await db.collection('purpose_guard_approvals').updateOne(
      { id: appr.id },
      { $setOnInsert: { ...appr, status: "pending", updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  for (const fd of sampleData.guard.feed) {
    stats.platform_entities.total++;
    const res = await db.collection('purpose_guard_feed').updateOne(
      { time: fd[0], activity: fd[1] },
      {
        $setOnInsert: {
          time: fd[0],
          activity: fd[1],
          requestedBy: fd[2],
          destination: fd[3],
          records: fd[4],
          decision: fd[5],
          createdAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9i. Retention & Deletion Jobs
  for (const ret of sampleData.retention) {
    stats.platform_entities.total++;
    const res = await db.collection('retention_schedules').updateOne(
      { c: ret.c },
      { $setOnInsert: { ...ret, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  for (const dj of sampleData.deletionJobs) {
    stats.platform_entities.total++;
    const res = await db.collection('deletion_jobs').updateOne(
      { id: dj[0] },
      {
        $setOnInsert: {
          id: dj[0],
          name: dj[1],
          systems: dj[2],
          records: dj[3],
          status: dj[4],
          action: dj[5],
          updatedAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9j. Vendors & Templates
  for (const v of sampleData.vendors) {
    stats.platform_entities.total++;
    const res = await db.collection('vendors').updateOne(
      { n: v.n },
      { $setOnInsert: { ...v, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9k. Rights Requests
  for (const r of sampleData.rights) {
    stats.platform_entities.total++;
    const res = await db.collection('rights_requests').updateOne(
      { id: r.id },
      { $setOnInsert: { ...r, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9l. Incidents
  for (const inc of sampleData.incidents) {
    stats.platform_entities.total++;
    const res = await db.collection('incidents').updateOne(
      { id: inc.id },
      { $setOnInsert: { ...inc, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9m. Assessments
  for (const ass of sampleData.assessments) {
    stats.platform_entities.total++;
    const res = await db.collection('assessments').updateOne(
      { n: ass.n },
      { $setOnInsert: { ...ass, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9n. Proof Ledger
  for (let idx = 0; idx < sampleData.ledger.length; idx++) {
    const entry = sampleData.ledger[idx];
    stats.platform_entities.total++;
    const res = await db.collection('proof_ledger').updateOne(
      { hash: entry[3] },
      {
        $setOnInsert: {
          timestamp: entry[0],
          event: entry[1],
          context: entry[2],
          hash: entry[3],
          seq: idx,
          createdAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9o. AI Inventory
  for (const ai of sampleData.ai) {
    stats.platform_entities.total++;
    const res = await db.collection('ai_inventory').updateOne(
      { n: ai.n },
      { $setOnInsert: { ...ai, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) stats.platform_entities.imported++;
    else stats.platform_entities.skipped++;
  }

  // 9p. Settings & Organization
  stats.platform_entities.total++;
  const settingsRes = await db.collection('platform_settings').updateOne(
    { key: "org_settings" },
    {
      $setOnInsert: {
        key: "org_settings",
        org: sampleData.org,
        templates: sampleData.templates,
        atemplates: sampleData.atemplates,
        training: sampleData.training,
        workflows: sampleData.workflows,
        integrations: sampleData.integrations,
        langs: sampleData.langs,
        updatedAt: new Date().toISOString(),
      }
    },
    { upsert: true }
  );
  if (settingsRes.upsertedCount > 0) stats.platform_entities.imported++;
  else stats.platform_entities.skipped++;

  console.log('\nMigration Completed Successfully:');
  console.table(stats);

  await closeDB();
  return stats;
}

// Execute migration if run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigration().catch(err => {
    console.error('[Migration Failed]', err);
    process.exit(1);
  });
}
