import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';

// Load environment variables from .env file if available
try {
  if (process.loadEnvFile) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
} catch {
  // If native loadEnvFile fails, rely on process.env
}

// Which database the app uses is decided only by these two variables, so moving from the
// local test database to a cluster is a config change: set them and run `npm run seed`
// (fresh database) or `npm run db:copy` (bring existing data along).
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production the URI must be given, so a missing variable fails loudly instead of
// quietly pointing at a localhost database that does not exist there.
if (IS_PRODUCTION && !process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set. Set it to the production MongoDB connection string.');
}

export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'privacysek';

// mongodb+srv://user:secret@host -> mongodb+srv://user:***@host, safe to print in logs
export function redactUri(uri) {
  return String(uri).replace(/\/\/([^:@/]+):[^@/]*@/, '//$1:***@');
}

let client = null;
let db = null;
let isConnected = false;
let connecting = null;

// Callers often connect in parallel (Promise.all over collections); they share one
// connection attempt instead of each opening its own client.
export function connectDB() {
  if (isConnected && db) return Promise.resolve(db);
  if (!connecting) connecting = openConnection().finally(() => { connecting = null; });
  return connecting;
}

async function openConnection() {
  try {
    console.log(`[Database] Connecting to MongoDB at ${redactUri(MONGODB_URI)} (database "${MONGODB_DB_NAME}")...`);
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    const database = client.db(MONGODB_DB_NAME);

    // Verify connectivity by running a ping command
    await database.command({ ping: 1 });

    // Ensure indexes for performance and data integrity
    await initIndexes(database);

    db = database;
    isConnected = true;
    console.log(`[Database] Successfully connected to MongoDB database "${MONGODB_DB_NAME}".`);
    return db;
  } catch (err) {
    isConnected = false;
    db = null;
    if (client) await client.close().catch(() => {});
    client = null;
    console.error(`[Database Error] Could not connect to MongoDB server:`, err.message);
    console.error(`[Database Error] Check that MongoDB is reachable at ${redactUri(MONGODB_URI)}.`);
    throw new Error(`MongoDB connection failed: ${err.message}`);
  }
}

export function getDB() {
  if (!isConnected || !db) {
    throw new Error('Database is not connected. Call connectDB() first.');
  }
  return db;
}

export function getClient() {
  return client;
}

export async function closeDB() {
  if (client) {
    await client.close();
    isConnected = false;
    db = null;
    console.log('[Database] MongoDB connection closed.');
  }
}

async function initIndexes(database) {
  try {
    // 1. Scanner & Schedules
    await database.collection('scans').createIndex({ id: 1 }, { unique: true });
    await database.collection('scans').createIndex({ createdAt: -1 });
    await database.collection('schedules').createIndex({ id: 1 }, { unique: true });
    await database.collection('schedules').createIndex({ nextRunAt: 1 });

    // 2. Cookie Inventory & Categories
    await database.collection('cookies').createIndex({ id: 1 }, { unique: true });
    await database.collection('cookies').createIndex({ name: 1, domain: 1 });
    await database.collection('cookies').createIndex({ category: 1 });
    await database.collection('cookie_categories').createIndex({ id: 1 }, { unique: true });

    // 3. Banner Configs & Versions
    await database.collection('banner_configs').createIndex({ key: 1 }, { unique: true });
    await database.collection('banner_versions').createIndex({ version: 1 }, { unique: true });

    // 4. Tags & Consent Records & PageViews
    await database.collection('cookie_tags').createIndex({ id: 1 }, { unique: true });
    await database.collection('consent_records').createIndex({ id: 1 }, { unique: true });
    await database.collection('consent_records').createIndex({ timestamp: -1 });
    await database.collection('page_views').createIndex({ date: 1 }, { unique: true });

    // 5. Governance & Compliance Collections
    await database.collection('duties').createIndex({ id: 1 }, { unique: true });
    await database.collection('discovery_assets').createIndex({ n: 1 }, { unique: true });
    await database.collection('discovery_sources').createIndex({ name: 1 }, { unique: true });
    await database.collection('discovery_findings').createIndex({ a: 1, n: 1 }, { unique: true });
    await database.collection('ropa_activities').createIndex({ n: 1 }, { unique: true });
    await database.collection('consent_profiles').createIndex({ n: 1 }, { unique: true });
    await database.collection('notices').createIndex({ n: 1 }, { unique: true });
    await database.collection('purpose_guard_policies').createIndex({ n: 1 }, { unique: true });
    await database.collection('purpose_guard_approvals').createIndex({ id: 1 }, { unique: true });
    await database.collection('purpose_guard_feed').createIndex({ createdAt: -1 });
    await database.collection('retention_schedules').createIndex({ c: 1 }, { unique: true });
    await database.collection('deletion_jobs').createIndex({ id: 1 }, { unique: true });
    await database.collection('vendors').createIndex({ n: 1 }, { unique: true });
    await database.collection('rights_requests').createIndex({ id: 1 }, { unique: true });
    await database.collection('incidents').createIndex({ id: 1 }, { unique: true });
    await database.collection('assessments').createIndex({ n: 1 }, { unique: true });
    await database.collection('proof_ledger').createIndex({ hash: 1 }, { unique: true });
    await database.collection('ai_inventory').createIndex({ n: 1 }, { unique: true });
    await database.collection('platform_settings').createIndex({ key: 1 }, { unique: true });

    console.log('[Database] MongoDB indexes verified successfully.');
  } catch (err) {
    console.warn('[Database] Notice during index initialization:', err.message);
  }
}
