// npm run seed               insert every demo record missing from MONGODB_URI / MONGODB_DB_NAME
// npm run seed -- --dry-run  show what would be inserted, write nothing
// npm run seed -- --reset    replace all demo data with a fresh copy of the seed
//                            (use after changing the seed, e.g. renaming a record)
import { closeDB, MONGODB_DB_NAME, MONGODB_URI, redactUri } from '../db.js';
import { resetDatabase, seedDatabase } from './index.js';

const dryRun = process.argv.includes('--dry-run');
const reset = process.argv.includes('--reset');

console.log(`Target: ${redactUri(MONGODB_URI)} / ${MONGODB_DB_NAME}${dryRun ? '  (dry run)' : reset ? '  (reset)' : ''}\n`);

try {
  if (reset && !dryRun) {
    await resetDatabase();
  } else {
    const report = await seedDatabase({ dryRun });
    const changed = report.filter(r => r.restored);
    if (changed.length) console.table(changed);
  }
} catch (err) {
  console.error('[Seed failed]', err.message);
  process.exitCode = 1;
} finally {
  await closeDB();
}
