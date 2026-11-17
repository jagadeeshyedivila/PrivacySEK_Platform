// Platform event bus: modules announce what happened (vpc.verified, consent.withdrawn,
// propagation.failed …) without importing each other. The top-bar bell and the Obligation
// Cockpit read the list. Events live in memory for the session; the durable record of
// anything that matters is the Proof Ledger entry written alongside.

const MAX = 50;
const listeners = new Set();
let seq = 42;

const stamp = () => {
  const d = new Date();
  return `EVT-${d.toISOString().slice(0, 10).replace(/-/g, "")}-${String(seq++).padStart(4, "0")}`;
};

// Initial notifications (the ones the bell showed before events existed)
const list = [
  { type: "breach.report_due", title: "Breach report due in 41 hours", detail: "INC-2026-019", source: "breach", go: "breach", severity: "act" },
  { type: "guard.approval", title: "New approval: Partner NBFC share", detail: "APR-118 · 11 min", source: "guard", go: "guard", severity: "risk" },
  { type: "rights.sla_75", title: "Grievance at 75% of the 90-day limit", detail: "GRV-2026-0471 · Rule 14(3)", source: "rights", go: "rights", severity: "risk" },
  { type: "discovery.child_found", title: "Children's data found in moneysmart-app-db", detail: "9,870 rows · CHILD_AGE, GUARDIAN_REL", source: "discovery", go: "discovery", severity: "risk" },
  { type: "vendor.dpa_due", title: "Mailchimp DPA renewal due", detail: "Vendor Risk", source: "vendors", go: "vendors", severity: "info" },
].map(e => ({ id: stamp(), at: new Date().toISOString(), read: false, ...e }));

// type: "area.what". title/detail: what the bell shows. go: module to open on click.
export function emit(type, { title, detail = "", source = type.split(".")[0], go = source, severity = "info", principalId = null, refs = {} } = {}) {
  const evt = { id: stamp(), type, at: new Date().toISOString(), title: title || type, detail, source, go, severity, principalId, refs, read: false };
  list.unshift(evt);
  if (list.length > MAX) list.length = MAX;
  listeners.forEach(fn => { try { fn(evt); } catch (err) { console.warn("[events]", err); } });
  return evt;
}

// Returns an unsubscribe function
export function on(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const events = () => list.slice();
export const unreadCount = () => list.filter(e => !e.read).length;
export function markAllRead() { list.forEach(e => { e.read = true; }); }
