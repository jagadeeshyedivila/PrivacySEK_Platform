// Copies every collection (documents, _id values and indexes) from one MongoDB database to
// another: for example from the local test database to a PrivacySEK cluster.
//
//   npm run db:copy -- --dry-run          list what would be copied, write nothing
//   npm run db:copy                       copy; stops if the target already holds data
//   npm run db:copy -- --drop             replace the target's copies of those collections
//   npm run db:copy -- --only vendors,incidents
//
// Source: SOURCE_MONGODB_URI / SOURCE_DB_NAME, else MONGODB_URI / MONGODB_DB_NAME from .env
// Target: TARGET_MONGODB_URI / TARGET_DB_NAME (required)
//
// Pass connection strings through environment variables rather than flags, so passwords
// stay out of shell history. --from, --from-db, --to and --to-db exist for local URIs.
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (process.loadEnvFile && fs.existsSync(envPath)) process.loadEnvFile(envPath);
} catch { /* rely on process.env */ }

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};

const source = {
  uri: option('from') || process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  db: option('from-db') || process.env.SOURCE_DB_NAME || process.env.MONGODB_DB_NAME || 'privacysek',
};
const target = {
  uri: option('to') || process.env.TARGET_MONGODB_URI,
  db: option('to-db') || process.env.TARGET_DB_NAME || source.db,
};
const dryRun = flag('dry-run');
const drop = flag('drop');
const only = option('only')?.split(',').map(s => s.trim()).filter(Boolean);
const BATCH = 1000;

const redact = uri => String(uri).replace(/\/\/([^:@/]+):[^@/]*@/, '//$1:***@');

function fail(msg) {
  console.error(`\n[db:copy] ${msg}`);
  process.exit(1);
}

if (!target.uri) fail('Set TARGET_MONGODB_URI (and TARGET_DB_NAME if the name differs) to the database to copy into.');
if (source.uri === target.uri && source.db === target.db) fail('Source and target are the same database.');

console.log(`Source: ${redact(source.uri)} / ${source.db}`);
console.log(`Target: ${redact(target.uri)} / ${target.db}`);
console.log(`Mode:   ${dryRun ? 'dry run (no writes)' : drop ? 'copy, replacing target collections' : 'copy into empty collections only'}\n`);

const opts = { serverSelectionTimeoutMS: 15000 };
const from = new MongoClient(source.uri, opts);
const to = new MongoClient(target.uri, opts);

try {
  await Promise.all([from.connect(), to.connect()]);
  const src = from.db(source.db);
  const dst = to.db(target.db);

  let names = (await src.listCollections({ type: 'collection' }, { nameOnly: true }).toArray())
    .map(c => c.name)
    .filter(n => !n.startsWith('system.'))
    .sort();
  if (only) {
    const unknown = only.filter(n => !names.includes(n));
    if (unknown.length) fail(`Not in the source database: ${unknown.join(', ')}`);
    names = names.filter(n => only.includes(n));
  }
  if (!names.length) fail('The source database has no collections. Check SOURCE_MONGODB_URI / SOURCE_DB_NAME.');

  // Check everything before writing anything, so a refusal leaves the target untouched
  const plan = [];
  for (const name of names) {
    plan.push({
      collection: name,
      source: await src.collection(name).countDocuments(),
      targetBefore: await dst.collection(name).countDocuments(),
    });
  }
  const occupied = plan.filter(p => p.targetBefore > 0);
  if (occupied.length && !drop && !dryRun) {
    console.table(plan);
    fail(`The target already has data in: ${occupied.map(p => p.collection).join(', ')}.\n` +
      'Nothing was written. Re-run with --drop to replace those collections, or --only to pick others.');
  }

  if (dryRun) {
    console.table(plan);
    console.log('Dry run: nothing was written.');
  } else {
    for (const p of plan) {
      const s = src.collection(p.collection);
      if (drop && p.targetBefore > 0) await dst.collection(p.collection).drop();
      const d = dst.collection(p.collection);

      const indexes = (await s.indexes())
        .filter(ix => ix.name !== '_id_')
        .map(({ v, ns, ...ix }) => ix);
      if (indexes.length) await d.createIndexes(indexes);

      let batch = [];
      for await (const doc of s.find({})) {
        batch.push(doc);
        if (batch.length >= BATCH) { await d.insertMany(batch, { ordered: false }); batch = []; }
      }
      if (batch.length) await d.insertMany(batch, { ordered: false });

      p.targetAfter = await d.countDocuments();
      p.ok = p.targetAfter === p.source ? 'yes' : 'COUNT MISMATCH';
      console.log(`  ${p.collection}: ${p.targetAfter}/${p.source}`);
    }
    console.table(plan);
    const bad = plan.filter(p => p.ok !== 'yes');
    if (bad.length) fail(`Counts differ for: ${bad.map(p => p.collection).join(', ')}`);
    console.log(`Copied ${plan.length} collections. Point MONGODB_URI / MONGODB_DB_NAME at the target to use it.`);
  }
} catch (err) {
  fail(err.message);
} finally {
  await Promise.all([from.close(), to.close()]);
}
