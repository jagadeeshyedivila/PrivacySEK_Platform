import express from 'express';
import { connectDB } from '../db.js';
import { STORE_SCHEMAS, splitState } from '../../src/platform/storeSchemas.js';
import { createInitialRopaData } from '../../src/modules/ropa/ropaData.js';
import { createDefaultConsentState } from '../../src/modules/consent/consentData.js';
import { createInitialDiscoveryData } from '../../src/modules/discovery/discoveryData.js';
import { createInitialRightsData } from '../../src/modules/rights/rightsData.js';
import { createInitialDpiaData } from '../../src/modules/dpia/dpiaData.js';

// Editable module records (ROPA, Consent, Data Discovery, Rights Requests, DPIA), one document per record.
//
//   GET    /api/store/:module                 everything the module persists (seeds on first use)
//   GET    /api/store/:module/:coll           one collection, in display order
//   GET    /api/store/:module/:coll/:id       one record
//   POST   /api/store/:module/:coll           create a record (409 if the key exists)
//   PUT    /api/store/:module/:coll/:id       replace a record (creates it if missing)
//   DELETE /api/store/:module/:coll/:id       delete a record
//   PATCH  /api/store/:module/state           { singles?, order? } settings and record order
//   POST   /api/store/:module/reset           restore the module's demo data
export const storeRouter = express.Router();

const SEEDS = {
  ropa: createInitialRopaData,
  consent: createDefaultConsentState,
  discovery: createInitialDiscoveryData,
  rights: createInitialRightsData,
  dpia: createInitialDpiaData,
};

const STATE_COLLECTION = 'module_state';
const MASK = '••••••••';

// Connection passwords are never stored, only whether one was given
const SANITIZE = {
  'discovery.connections': doc => {
    if (doc.fields && doc.fields.pw) doc.fields = { ...doc.fields, pw: MASK };
    return doc;
  },
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function schemaOf(module) {
  const schema = STORE_SCHEMAS[module];
  if (!schema) throw new HttpError(404, `Unknown module "${module}".`);
  return schema;
}

function collOf(module, coll) {
  const c = schemaOf(module).collections[coll];
  if (!c) throw new HttpError(404, `Unknown collection "${coll}" in ${module}.`);
  return c;
}

function cleanDoc(module, coll, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  const { _id, ...doc } = body;
  const fix = SANITIZE[module + '.' + coll];
  return fix ? fix(doc) : doc;
}

function keyOf(c, doc) {
  const v = doc[c.key];
  if (v === undefined || v === null || String(v).trim() === '') throw new HttpError(400, `Field "${c.key}" is required.`);
  return String(v);
}

const ready = {};

// Indexes, then demo data the first time a module is used
function ensureModule(module) {
  if (!ready[module]) {
    ready[module] = (async () => {
      const db = await connectDB();
      const schema = schemaOf(module);
      await db.collection(STATE_COLLECTION).createIndex({ module: 1 }, { unique: true });
      await Promise.all(Object.values(schema.collections).map(c => db.collection(c.name).createIndex({ [c.key]: 1 }, { unique: true })));
      const state = await db.collection(STATE_COLLECTION).findOne({ module }, { projection: { _id: 1 } });
      if (!state) await seedModule(module);
    })().catch(err => { ready[module] = null; throw err; });
  }
  return ready[module];
}

async function seedModule(module) {
  const db = await connectDB();
  const schema = schemaOf(module);
  const { collections, singles } = splitState(module, SEEDS[module]());
  const order = {};
  await Promise.all(Object.entries(schema.collections).map(async ([coll, c]) => {
    const docs = collections[coll].map(d => cleanDoc(module, coll, structuredClone(d)));
    order[coll] = docs.map(d => keyOf(c, d));
    await db.collection(c.name).deleteMany({});
    if (docs.length) await db.collection(c.name).insertMany(docs);
  }));
  const now = new Date().toISOString();
  await db.collection(STATE_COLLECTION).replaceOne(
    { module },
    { module, singles, order, seededAt: now, updatedAt: now },
    { upsert: true },
  );
  console.log(`[Store] Seeded ${module} demo data.`);
}

async function readCollection(db, module, coll, state) {
  const c = collOf(module, coll);
  const docs = await db.collection(c.name).find({}, { projection: { _id: 0 } }).toArray();
  const pos = new Map(((state && state.order && state.order[coll]) || []).map((id, i) => [id, i]));
  // Records missing from the saved order (e.g. inserted directly) go last
  return docs.sort((a, b) => (pos.get(String(a[c.key])) ?? Infinity) - (pos.get(String(b[c.key])) ?? Infinity));
}

async function readModule(module) {
  const db = await connectDB();
  const schema = schemaOf(module);
  const state = await db.collection(STATE_COLLECTION).findOne({ module });
  const collections = {};
  await Promise.all(Object.keys(schema.collections).map(async coll => {
    collections[coll] = await readCollection(db, module, coll, state);
  }));
  return { collections, singles: (state && state.singles) || {} };
}

// Runs a handler after the module is ready and maps errors to status codes
const handle = fn => async (req, res) => {
  try {
    schemaOf(req.params.module);
    await ensureModule(req.params.module);
    await fn(req, res, await connectDB());
  } catch (err) {
    if (err.code === 11000) err = new HttpError(409, 'A record with this key already exists.');
    if (!err.status) console.error('[Store API]', err);
    res.status(err.status || 500).json({ error: err.message });
  }
};

storeRouter.get('/:module', handle(async (req, res) => {
  res.json(await readModule(req.params.module));
}));

storeRouter.post('/:module/reset', handle(async (req, res) => {
  await seedModule(req.params.module);
  res.json(await readModule(req.params.module));
}));

storeRouter.patch('/:module/state', handle(async (req, res, db) => {
  const { module } = req.params;
  const schema = schemaOf(module);
  const { singles = {}, order = {} } = req.body || {};
  const set = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(singles)) {
    if (!schema.singles.includes(k)) throw new HttpError(400, `"${k}" is not a setting of ${module}.`);
    set['singles.' + k] = v;
  }
  for (const [coll, ids] of Object.entries(order)) {
    collOf(module, coll);
    if (!Array.isArray(ids)) throw new HttpError(400, `Order for "${coll}" must be an array of keys.`);
    set['order.' + coll] = ids.map(String);
  }
  await db.collection(STATE_COLLECTION).updateOne({ module }, { $set: set }, { upsert: true });
  res.json({ ok: true });
}));

storeRouter.get('/:module/:coll', handle(async (req, res, db) => {
  const state = await db.collection(STATE_COLLECTION).findOne({ module: req.params.module });
  res.json(await readCollection(db, req.params.module, req.params.coll, state));
}));

storeRouter.get('/:module/:coll/:id', handle(async (req, res, db) => {
  const c = collOf(req.params.module, req.params.coll);
  const doc = await db.collection(c.name).findOne({ [c.key]: req.params.id }, { projection: { _id: 0 } });
  if (!doc) throw new HttpError(404, 'Record not found.');
  res.json(doc);
}));

storeRouter.post('/:module/:coll', handle(async (req, res, db) => {
  const { module, coll } = req.params;
  const c = collOf(module, coll);
  const doc = cleanDoc(module, coll, req.body);
  keyOf(c, doc);
  await db.collection(c.name).insertOne(doc);
  const { _id, ...saved } = doc;
  res.status(201).json(saved);
}));

storeRouter.put('/:module/:coll/:id', handle(async (req, res, db) => {
  const { module, coll, id } = req.params;
  const c = collOf(module, coll);
  const doc = cleanDoc(module, coll, req.body);
  if (keyOf(c, doc) !== id) throw new HttpError(400, `Field "${c.key}" must match the record in the URL.`);
  await db.collection(c.name).replaceOne({ [c.key]: id }, doc, { upsert: true });
  res.json(doc);
}));

storeRouter.delete('/:module/:coll/:id', handle(async (req, res, db) => {
  const c = collOf(req.params.module, req.params.coll);
  const r = await db.collection(c.name).deleteOne({ [c.key]: req.params.id });
  if (!r.deletedCount) throw new HttpError(404, 'Record not found.');
  res.status(204).end();
}));
