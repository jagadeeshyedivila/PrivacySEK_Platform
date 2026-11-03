// What each module persists in MongoDB. Shared by the browser sync layer and the API.
//
// collections: records users can create, edit and delete. One MongoDB collection each,
//   one document per record, addressed by `key`.
// singles: editable settings saved whole in the module's state document.
// Everything else in a module's seed is reference data: it is rebuilt from the seed on
// every load and never written to the database.
export const STORE_SCHEMAS = {
  ropa: {
    legacyStorageKey: "privacysek.ropa.demo.v1",
    collections: {
      act: { name: "ropa_processing_activities", key: "id" },
      ast: { name: "ropa_assets", key: "id" },
      ven: { name: "ropa_vendors", key: "id" },
      cus: { name: "ropa_customers", key: "id" },
      com: { name: "ropa_companies", key: "id" },
      oth: { name: "ropa_other_parties", key: "id" },
      pol: { name: "ropa_policies", key: "id" },
      doc: { name: "ropa_documents", key: "id" },
      cf: { name: "ropa_custom_fields", key: "id" }
    },
    singles: ["settings", "seq"]
  },
  consent: {
    legacyStorageKey: "cp_consent_state_v1",
    collections: {
      consents: { name: "consent_mgmt_records", key: "id" },
      purposes: { name: "consent_mgmt_purposes", key: "id" },
      preferences: { name: "consent_mgmt_preferences", key: "id" },
      jurisdictions: { name: "consent_mgmt_jurisdictions", key: "id" },
      workflows: { name: "consent_mgmt_workflows", key: "id" },
      senders: { name: "consent_mgmt_senders", key: "email" }
    },
    singles: ["builder", "email"]
  },
  discovery: {
    legacyStorageKey: "privacysek.discovery.demo.v1",
    collections: {
      connections: { name: "discovery_connections", key: "id" },
      jobs: { name: "discovery_scan_jobs", key: "id" },
      tasks: { name: "discovery_tasks", key: "id" },
      customProfilers: { name: "discovery_custom_profilers", key: "n" },
      findings: { name: "discovery_posture_findings", key: "id" }
    },
    singles: ["lastScan"]
  }
};

// Collection and single keys of a module, i.e. everything that is not reference data
export function persistedKeys(module) {
  const s = STORE_SCHEMAS[module];
  return Object.keys(s.collections).concat(s.singles);
}

// The persisted part of a full module state, in the shape the API returns
export function splitState(module, full) {
  const s = STORE_SCHEMAS[module];
  const collections = {}, singles = {};
  Object.keys(s.collections).forEach(k => { collections[k] = full[k] || []; });
  s.singles.forEach(k => { if (full[k] !== undefined) singles[k] = full[k]; });
  return { collections, singles };
}
