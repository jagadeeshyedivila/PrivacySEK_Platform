// Keeps a module's editable records in MongoDB through /api/store.
//
// Modules keep working on one plain in-memory object, as before: actions mutate it and call
// save(). save() compares it with what the server last confirmed and sends only the
// difference, one request per created, changed or deleted record, plus settings and record
// order when those changed. Reference data (anything not in storeSchemas.js) is rebuilt from
// the seed on every load and never sent.
//
// When the backend is unreachable at startup the module runs on its seed in memory, and
// changes last until the page is reloaded.
import { STORE_SCHEMAS, persistedKeys } from "./storeSchemas.js";
import { platformApi } from "./platformApi.js";

const stores = {};
let reportError = err => console.warn("[Store] " + err.message);

// The engine routes save failures to a toast
export function onStoreError(fn) { reportError = fn; }

export function hydrateModuleStores() {
  return Promise.all(Object.values(stores).map(s => s.hydrate()));
}

const DIRTY = "\0dirty";   // snapshot value that never matches, so the next save resends

export function createModuleStore(module, seed) {
  const schema = STORE_SCHEMAS[module];
  const colls = Object.keys(schema.collections);
  const persisted = persistedKeys(module);
  let data = null;     // the one object modules hold; hydrate and reset replace its contents
  let snap = null;     // what the server holds: { recs: {coll: Map(id -> json)}, order: {coll: "ids"}, singles: {k: json} }
  let online = false;
  let queue = Promise.resolve();
  let lastFailed = false;

  const idOf = (coll, doc) => String(doc[schema.collections[coll].key]);
  const orderOf = coll => (data[coll] || []).map(d => idOf(coll, d)).join("\n");

  function snapshot() {
    const s = { recs: {}, order: {}, singles: {} };
    colls.forEach(coll => {
      s.recs[coll] = new Map((data[coll] || []).map(d => [idOf(coll, d), JSON.stringify(d)]));
      s.order[coll] = orderOf(coll);
    });
    schema.singles.forEach(k => { s.singles[k] = JSON.stringify(data[k]); });
    return s;
  }

  // state: the API's { collections, singles }, or null to use the seed as is
  function fill(state) {
    const full = seed();
    if (state) {
      persisted.forEach(k => { delete full[k]; });
      Object.assign(full, state.collections, state.singles);
    }
    if (!data) data = full;
    else {
      Object.keys(data).forEach(k => { delete data[k]; });
      Object.assign(data, full);
    }
    snap = snapshot();
    return data;
  }

  // Requests that bring the server in line with `data`; the snapshot is advanced as they are queued
  function diff() {
    const ops = [], patch = { singles: {}, order: {} };
    colls.forEach(coll => {
      const before = snap.recs[coll], seen = new Set();
      (data[coll] || []).forEach(doc => {
        const id = idOf(coll, doc), json = JSON.stringify(doc);
        seen.add(id);
        if (!before.has(id)) ops.push({ kind: "create", coll, id, doc, json });
        else if (before.get(id) !== json) ops.push({ kind: "replace", coll, id, doc, json });
      });
      before.forEach((json, id) => { if (!seen.has(id)) ops.push({ kind: "delete", coll, id }); });
      const order = orderOf(coll);
      if (order !== snap.order[coll]) patch.order[coll] = order ? order.split("\n") : [];
    });
    schema.singles.forEach(k => {
      const json = JSON.stringify(data[k]);
      if (json !== snap.singles[k] && data[k] !== undefined) patch.singles[k] = data[k];
    });
    ops.forEach(op => { if (op.kind === "delete") snap.recs[op.coll].delete(op.id); else snap.recs[op.coll].set(op.id, op.json); });
    Object.keys(patch.order).forEach(coll => { snap.order[coll] = orderOf(coll); });
    Object.keys(patch.singles).forEach(k => { snap.singles[k] = JSON.stringify(data[k]); });
    return { ops, patch };
  }

  function send(op) {
    const call = op.kind === "create" ? platformApi.createRecord(module, op.coll, op.doc)
      : op.kind === "replace" ? platformApi.replaceRecord(module, op.coll, op.id, op.doc)
      : platformApi.deleteRecord(module, op.coll, op.id).catch(err => { if (!/not found/i.test(err.message)) throw err; });
    // A failed request leaves the record dirty so the next save tries it again
    return call.catch(err => {
      if (snap) snap.recs[op.coll].set(op.id, DIRTY);
      throw err;
    });
  }

  async function push({ ops, patch }) {
    const hasPatch = Object.keys(patch.order).length || Object.keys(patch.singles).length;
    const results = await Promise.allSettled(ops.map(send).concat(hasPatch ? [
      platformApi.patchModuleState(module, patch).catch(err => {
        Object.keys(patch.order).forEach(coll => { snap.order[coll] = DIRTY; });
        Object.keys(patch.singles).forEach(k => { snap.singles[k] = DIRTY; });
        throw err;
      })
    ] : []));
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length) lastFailed = true;
    if (failed.length) reportError(new Error("Couldn't save to the database (" + failed[0].reason.message + "). The change is kept on this page and will be retried on the next save."));
  }

  // Records this browser kept in localStorage before the backend existed are moved to the
  // server once; the browser copy is removed only after the server accepted all of it
  async function importLegacy() {
    let raw = null;
    try { raw = localStorage.getItem(schema.legacyStorageKey); } catch (err) { return; }
    if (!raw) return;
    let old;
    try { old = JSON.parse(raw); } catch (err) { old = null; }
    if (old && typeof old === "object") {
      persisted.forEach(k => { if (old[k] !== undefined) data[k] = old[k]; });
      lastFailed = false;
      store.save();
      await queue;
      if (lastFailed) return;
      console.info("[Store] Moved " + module + " records from this browser to the database.");
    }
    try { localStorage.removeItem(schema.legacyStorageKey); } catch (err) { /* storage blocked */ }
  }

  const store = {
    async hydrate() {
      try {
        fill(await platformApi.getModuleStore(module));
        online = true;
        await importLegacy();
      } catch (err) {
        online = false;
        console.warn("[Store] " + module + " is running on demo data in memory: " + err.message);
        fill(null);
      }
      return data;
    },

    get() {
      return data || fill(null);
    },

    save(next) {
      store.get();
      if (next && next !== data) {
        Object.keys(data).forEach(k => { delete data[k]; });
        Object.assign(data, next);
      }
      if (!online) return queue;
      const changes = diff();
      if (changes.ops.length || Object.keys(changes.patch.order).length || Object.keys(changes.patch.singles).length) {
        queue = queue.then(() => push(changes)).catch(err => console.error("[Store]", err));
      }
      return queue;
    },

    // Restores the module's demo data; resolves with the same object, refilled
    async reset() {
      if (!online) return fill(null);
      await queue;
      return fill(await platformApi.resetModuleStore(module));
    },

    isOnline: () => online
  };
  stores[module] = store;
  return store;
}
