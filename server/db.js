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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/privacysek';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'privacysek';

let client = null;
let db = null;
let isConnected = false;

export async function connectDB() {
  if (isConnected && db) return db;

  try {
    console.log(`[Database] Connecting to MongoDB at ${MONGODB_URI}...`);
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(MONGODB_DB_NAME);
    isConnected = true;

    // Verify connectivity by running a ping command
    await db.command({ ping: 1 });
    console.log(`[Database] Successfully connected to MongoDB database "${MONGODB_DB_NAME}".`);

    // Ensure indexes for performance and data integrity
    await initIndexes(db);

    return db;
  } catch (err) {
    isConnected = false;
    db = null;
    console.error(`[Database Error] Could not connect to MongoDB server:`, err.message);
    console.error(`[Database Error] Ensure MongoDB server is running on ${MONGODB_URI}.`);
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
