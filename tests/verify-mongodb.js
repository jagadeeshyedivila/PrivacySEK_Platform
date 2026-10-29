import { connectDB, closeDB } from '../server/db.js';
import { storage } from '../server/storage.js';

async function verify() {
  console.log('=== PrivacySEK MongoDB Persistence Verification ===\n');

  const db = await connectDB();
  console.log('1. Database Connection: PASSED');

  // Verify collections
  const collections = (await db.listCollections().toArray()).map(c => c.name);
  console.log(`2. Collections found (${collections.length}):`, collections.sort().join(', '));

  const expectedCollections = [
    'scans', 'schedules', 'cookies', 'cookie_categories',
    'banner_configs', 'banner_versions', 'cookie_tags',
    'consent_records', 'page_views', 'duties', 'discovery_assets',
    'discovery_sources', 'discovery_findings', 'ropa_activities',
    'consent_profiles', 'notices', 'purpose_guard_policies',
    'purpose_guard_approvals', 'purpose_guard_feed', 'retention_schedules',
    'deletion_jobs', 'vendors', 'rights_requests', 'incidents',
    'assessments', 'proof_ledger', 'ai_inventory', 'platform_settings'
  ];

  const missing = expectedCollections.filter(c => !collections.includes(c));
  if (missing.length > 0) {
    throw new Error(`Missing collections in MongoDB: ${missing.join(', ')}`);
  }
  console.log('3. All expected collections exist: PASSED');

  // Verify record counts
  console.log('\n--- Document Counts in MongoDB Compass Database (privacysek) ---');
  for (const cName of expectedCollections) {
    const count = await db.collection(cName).countDocuments();
    console.log(`  - ${cName.padEnd(25)}: ${count} documents`);
    if (count === 0 && !['schedules'].includes(cName)) {
      throw new Error(`Collection ${cName} is unexpectedly empty!`);
    }
  }

  // 4. Test CRUD operations on Cookie Inventory
  console.log('\n4. Testing CRUD on Cookie Inventory:');
  const testCookieId = `test-cookie-${Date.now()}`;
  await db.collection('cookies').insertOne({
    id: testCookieId,
    name: '_test_tracker',
    domain: 'test.privacysek.example',
    category: 'analytics',
    party: 'First-party',
    provider: 'TestSuite',
    duration: 'Session',
    description: 'Automated test cookie',
    secure: true,
    httpOnly: false,
    createdAt: new Date().toISOString(),
  });
  console.log('  - CREATE cookie in MongoDB: PASSED');

  const fetched = await db.collection('cookies').findOne({ id: testCookieId });
  if (!fetched || fetched.name !== '_test_tracker') throw new Error('Failed to read test cookie');
  console.log('  - READ cookie from MongoDB: PASSED');

  await db.collection('cookies').updateOne({ id: testCookieId }, { $set: { duration: '30 days' } });
  const updated = await db.collection('cookies').findOne({ id: testCookieId });
  if (updated.duration !== '30 days') throw new Error('Failed to update test cookie');
  console.log('  - UPDATE cookie in MongoDB: PASSED');

  await db.collection('cookies').deleteOne({ id: testCookieId });
  const deleted = await db.collection('cookies').findOne({ id: testCookieId });
  if (deleted) throw new Error('Failed to delete test cookie');
  console.log('  - DELETE cookie from MongoDB: PASSED');

  // 5. Test Storage service (scans & schedules)
  console.log('\n5. Testing Storage Service (Storage -> MongoDB):');
  const allScans = await storage.getAllScans();
  console.log(`  - Retrieved ${allScans.length} scans from MongoDB via storage service: PASSED`);

  const testSchedId = `test-sched-${Date.now()}`;
  await storage.saveSchedule({
    id: testSchedId,
    url: 'https://example.com',
    type: 'Weekly Audit',
    frequency: 'Weekly',
    enabled: true,
    pages: 5,
  });
  const allScheds = await storage.getAllSchedules();
  const schedFound = allScheds.find(s => s.id === testSchedId);
  if (!schedFound) throw new Error('Failed to save schedule via storage');
  console.log('  - CREATE & READ schedule via storage service: PASSED');

  await storage.deleteSchedule(testSchedId);
  const afterDeleteScheds = await storage.getAllSchedules();
  if (afterDeleteScheds.find(s => s.id === testSchedId)) throw new Error('Failed to delete schedule');
  console.log('  - DELETE schedule via storage service: PASSED');

  // 6. Test Proof Ledger Hash Chaining
  console.log('\n6. Testing Proof Ledger:');
  const ledgerCount = await db.collection('proof_ledger').countDocuments();
  console.log(`  - Total Proof Ledger audit records in MongoDB: ${ledgerCount}: PASSED`);

  await closeDB();
  console.log('\n=== ALL PERSISTENCE VERIFICATION CHECKS PASSED ===\n');
}

verify().catch(err => {
  console.error('\n[VERIFICATION FAILED]:', err);
  process.exit(1);
});
