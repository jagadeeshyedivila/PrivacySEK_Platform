// Seeds a database with the demo data, and puts back demo records that were deleted.
//
// Everything in this app is sample data, so the rule is simply: every demo record should
// exist. For each collection the seed's records are matched to the database by their key
// fields (the unique indexes in db.js), and only the missing ones are inserted:
//   - a new, empty database gets the full demo data set;
//   - a demo record a user deleted comes back on the next run;
//   - demo records still present are left as they are, edits included;
//   - records users added are never touched.
//
// It runs on every server start (and on the first request of a serverless instance), and
// with `npm run seed`. The store modules (ROPA, Consent, Discovery, Rights, DPIA) restore
// their own records the same way through ensureModule().
import { connectDB } from '../db.js';
import { ensureModule, resetModule, restoreModule, STORE_MODULES } from '../routes/storeRoutes.js';
import { PLATFORM_SEEDS, resetSeedCache } from './platformSeed.js';

const keyOf = (spec, doc) => spec.key.map(k => JSON.stringify(doc[k] ?? null)).join('|');

async function insertIgnoringDuplicates(collection, docs) {
  if (!docs.length) return 0;
  try {
    const r = await collection.insertMany(docs, { ordered: false });
    return r.insertedCount;
  } catch (err) {
    // Another instance inserted some of the same records at the same time
    if (err.code === 11000 || err.writeErrors?.every(e => e.code === 11000)) return err.result?.insertedCount ?? 0;
    throw err;
  }
}

/**
 * Inserts every demo record missing from the connected database.
 * @param {{ dryRun?: boolean, log?: (msg: string) => void }} options
 *   dryRun: report what would be inserted without writing anything
 * @returns {Promise<Array<{collection: string, present: number, restored: number}>>}
 */
export async function seedDatabase({ dryRun = false, log = msg => console.log(msg) } = {}) {
  const db = await connectDB();
  const report = [];
  resetSeedCache();

  for (const spec of PLATFORM_SEEDS) {
    const col = db.collection(spec.collection);
    const projection = Object.fromEntries([['_id', 0], ...spec.key.map(k => [k, 1])]);
    const present = new Set((await col.find({}, { projection }).toArray()).map(d => keyOf(spec, d)));
    const missing = spec.docs().filter(d => !present.has(keyOf(spec, d)));
    const restored = dryRun ? missing.length : await insertIgnoringDuplicates(col, missing);
    report.push({ collection: spec.collection, present: present.size, restored });
  }

  for (const module of STORE_MODULES) {
    if (dryRun) {
      const counts = await restoreModule(module, { dryRun: true }).catch(() => ({}));
      for (const [coll, n] of Object.entries(counts)) report.push({ collection: `${module}.${coll}`, present: null, restored: n });
    } else {
      await ensureModule(module);
    }
  }

  const changed = report.filter(r => r.restored);
  log(changed.length
    ? `[Seed] ${dryRun ? 'Would restore' : 'Restored'} demo records: ${changed.map(r => `${r.collection} (${r.restored})`).join(', ')}`
    : '[Seed] All demo records present; nothing to restore.');
  return report;
}

/**
 * Replaces every demo collection with a fresh copy of the seed: edits, added records and
 * records a newer seed renamed or dropped all go. Scans and schedules are kept.
 */
export async function resetDatabase({ log = msg => console.log(msg) } = {}) {
  const db = await connectDB();
  resetSeedCache();
  for (const spec of PLATFORM_SEEDS) {
    const col = db.collection(spec.collection);
    await col.deleteMany({});
    await col.insertMany(spec.docs());
  }
  for (const module of STORE_MODULES) {
    await ensureModule(module);
    await resetModule(module);
  }
  log(`[Seed] Reset ${PLATFORM_SEEDS.length} platform collections and modules ${STORE_MODULES.join(', ')} to the demo data.`);
}

// One run per process, shared by every caller (server start, serverless requests)
let seeding = null;
export function ensureSeeded() {
  if (process.env.SEED_DEMO_DATA === 'false') return Promise.resolve([]);
  if (!seeding) seeding = seedDatabase().catch(err => { seeding = null; throw err; });
  return seeding;
}
