import express from 'express';
import { connectDB } from '../db.js';

export const platformRouter = express.Router();

async function getCollection(name) {
  const db = await connectDB();
  return db.collection(name);
}

// Helper to generate hash for proof ledger
function generateHash() {
  const h = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 4; i++) s += h[Math.floor(Math.random() * 16)];
  let t = "";
  for (let i = 0; i < 4; i++) t += h[Math.floor(Math.random() * 16)];
  return s + "…" + t;
}

// -------------------------------------------------------------
// COMPREHENSIVE PLATFORM INITIALIZER
// -------------------------------------------------------------
platformRouter.get('/init', async (_req, res) => {
  try {
    const [
      dutiesCol,
      assetsCol,
      sourcesCol,
      findingsCol,
      ropaCol,
      consentProfilesCol,
      noticesCol,
      policiesCol,
      approvalsCol,
      feedCol,
      retentionCol,
      deletionJobsCol,
      vendorsCol,
      rightsCol,
      incidentsCol,
      assessmentsCol,
      ledgerCol,
      aiCol,
      settingsCol,
    ] = await Promise.all([
      getCollection('duties'),
      getCollection('discovery_assets'),
      getCollection('discovery_sources'),
      getCollection('discovery_findings'),
      getCollection('ropa_activities'),
      getCollection('consent_profiles'),
      getCollection('notices'),
      getCollection('purpose_guard_policies'),
      getCollection('purpose_guard_approvals'),
      getCollection('purpose_guard_feed'),
      getCollection('retention_schedules'),
      getCollection('deletion_jobs'),
      getCollection('vendors'),
      getCollection('rights_requests'),
      getCollection('incidents'),
      getCollection('assessments'),
      getCollection('proof_ledger'),
      getCollection('ai_inventory'),
      getCollection('platform_settings'),
    ]);

    const [
      duties,
      assets,
      sourcesDocs,
      findings,
      ropa,
      consentProfiles,
      notices,
      policies,
      approvals,
      feedDocs,
      retention,
      deletionJobsDocs,
      vendors,
      rights,
      incidents,
      assessments,
      ledgerDocs,
      ai,
      settingsDoc,
    ] = await Promise.all([
      dutiesCol.find({}, { projection: { _id: 0 } }).toArray(),
      assetsCol.find({}, { projection: { _id: 0 } }).toArray(),
      sourcesCol.find({}, { projection: { _id: 0 } }).toArray(),
      findingsCol.find({}, { projection: { _id: 0 } }).toArray(),
      ropaCol.find({}, { projection: { _id: 0 } }).toArray(),
      consentProfilesCol.find({}, { projection: { _id: 0 } }).toArray(),
      noticesCol.find({}, { projection: { _id: 0 } }).toArray(),
      policiesCol.find({}, { projection: { _id: 0 } }).toArray(),
      approvalsCol.find({ status: 'pending' }, { projection: { _id: 0 } }).toArray(),
      feedCol.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(10).toArray(),
      retentionCol.find({}, { projection: { _id: 0 } }).toArray(),
      deletionJobsCol.find({}, { projection: { _id: 0 } }).toArray(),
      vendorsCol.find({}, { projection: { _id: 0 } }).toArray(),
      rightsCol.find({}, { projection: { _id: 0 } }).toArray(),
      incidentsCol.find({}, { projection: { _id: 0 } }).toArray(),
      assessmentsCol.find({}, { projection: { _id: 0 } }).toArray(),
      ledgerCol.find({}, { projection: { _id: 0 } }).sort({ seq: 1 }).toArray(),
      aiCol.find({}, { projection: { _id: 0 } }).toArray(),
      settingsCol.findOne({ key: 'org_settings' }, { projection: { _id: 0 } }),
    ]);

    // Format sources into array format [name, details, status] expected by UI
    const sources = sourcesDocs.map(s => [s.name, s.details, s.status]);

    // Format feed into array format [time, activity, requestedBy, destination, records, decision]
    const feed = feedDocs.map(f => [f.time, f.activity, f.requestedBy, f.destination, f.records, f.decision]);

    // Format deletion jobs into array format [id, name, systems, records, status, action]
    const deletionJobs = deletionJobsDocs.map(j => [j.id, j.name, j.systems, j.records, j.status, j.action]);

    // Format ledger into array format [timestamp, event, context, hash]
    const ledger = ledgerDocs.map(l => [l.timestamp, l.event, l.context, l.hash]);

    res.json({
      org: settingsDoc?.org || {},
      templates: settingsDoc?.templates || [],
      atemplates: settingsDoc?.atemplates || [],
      training: settingsDoc?.training || [],
      workflows: settingsDoc?.workflows || [],
      integrations: settingsDoc?.integrations || [],
      langs: settingsDoc?.langs || [],
      duties,
      assets,
      sources,
      findings,
      ropa,
      consentProfiles,
      notices,
      guard: {
        policies,
        feed,
        approvals,
      },
      retention,
      deletionJobs,
      vendors,
      rights,
      incidents,
      assessments,
      ledger,
      ai,
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to load platform data from MongoDB: ${err.message}` });
  }
});

// -------------------------------------------------------------
// ROPA (Records of Processing Activities)
// -------------------------------------------------------------
platformRouter.get('/ropa', async (_req, res) => {
  try {
    const col = await getCollection('ropa_activities');
    const activities = await col.find({}, { projection: { _id: 0 } }).toArray();
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.post('/ropa', async (req, res) => {
  try {
    const { n, p, b = 'Consent', cats = '', sys = 'gl-db', v = '—', own = 'Gold Loans', ret = '8 years after loan closure', risk = 'High', att = 'Attested today' } = req.body;
    if (!n) return res.status(400).json({ error: 'Activity name is required.' });

    const ropaCol = await getCollection('ropa_activities');
    const ledgerCol = await getCollection('proof_ledger');

    const activity = {
      n, p, b, cats, sys, v, own, ret, risk, att,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ropaCol.insertOne(activity);

    // Record in Proof Ledger
    const hash = generateHash();
    const ledgerCount = await ledgerCol.countDocuments();
    const ledgerEntry = {
      timestamp: `24 Oct ${new Date().toTimeString().slice(0, 8)}`,
      event: 'Processing activity registered',
      context: n,
      hash,
      seq: ledgerCount,
      createdAt: new Date().toISOString(),
    };
    await ledgerCol.insertOne(ledgerEntry);

    const { _id, ...clean } = activity;
    res.status(201).json({ activity: clean, ledger: ledgerEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// RIGHTS REQUESTS / DSAR
// -------------------------------------------------------------
platformRouter.get('/rights', async (_req, res) => {
  try {
    const col = await getCollection('rights_requests');
    const requests = await col.find({}, { projection: { _id: 0 } }).toArray();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const RSTEPS = ["Received", "Verified", "Located", "Fulfilled", "Reviewed", "Responded"];

platformRouter.put('/rights/:id/step', async (req, res) => {
  try {
    const rightsCol = await getCollection('rights_requests');
    const ledgerCol = await getCollection('proof_ledger');

    const request = await rightsCol.findOne({ id: req.params.id });
    if (!request) return res.status(404).json({ error: 'Rights request not found.' });

    const currentStep = typeof req.body.step === 'number' ? req.body.step : request.step + 1;
    if (currentStep >= RSTEPS.length) {
      return res.status(400).json({ error: 'Request is already in the final state.' });
    }

    const nextStatus = RSTEPS[currentStep];
    const now = new Date().toISOString();

    const updated = await rightsCol.findOneAndUpdate(
      { id: req.params.id },
      { $set: { step: currentStep, st: nextStatus, updatedAt: now } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    // Record in Proof Ledger
    const hash = generateHash();
    const ledgerCount = await ledgerCol.countDocuments();
    const ledgerEntry = {
      timestamp: `24 Oct ${new Date().toTimeString().slice(0, 8)}`,
      event: `Rights request: ${nextStatus}`,
      context: `${request.id} · ${request.t}`,
      hash,
      seq: ledgerCount,
      createdAt: now,
    };
    await ledgerCol.insertOne(ledgerEntry);

    res.json({ request: updated, ledger: ledgerEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PURPOSE GUARD (Approvals, Policies, Decisions)
// -------------------------------------------------------------
platformRouter.get('/guard/approvals', async (_req, res) => {
  try {
    const col = await getCollection('purpose_guard_approvals');
    const approvals = await col.find({ status: 'pending' }, { projection: { _id: 0 } }).toArray();
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.post('/guard/approvals/:id/decision', async (req, res) => {
  try {
    const { decision } = req.body; // 'a' (Approve), 'r' (Reject), 'm' (Mask)
    if (!['a', 'r', 'm'].includes(decision)) {
      return res.status(400).json({ error: 'Valid decision is "a", "r", or "m".' });
    }

    const approvalsCol = await getCollection('purpose_guard_approvals');
    const ledgerCol = await getCollection('proof_ledger');

    const approval = await approvalsCol.findOne({ id: req.params.id });
    if (!approval) return res.status(404).json({ error: 'Approval request not found.' });

    const statusMap = { a: 'approved', r: 'rejected', m: 'masked' };
    const eventMap = { a: 'Approval granted', r: 'Approval rejected', m: 'Approved with masking' };
    const now = new Date().toISOString();

    await approvalsCol.updateOne(
      { id: req.params.id },
      { $set: { status: statusMap[decision], decidedAt: now, updatedAt: now } }
    );

    // Record in Proof Ledger
    const hash = generateHash();
    const ledgerCount = await ledgerCol.countDocuments();
    const ledgerEntry = {
      timestamp: `24 Oct ${new Date().toTimeString().slice(0, 8)}`,
      event: eventMap[decision],
      context: `${approval.id} · ${approval.n}`,
      hash,
      seq: ledgerCount,
      createdAt: now,
    };
    await ledgerCol.insertOne(ledgerEntry);

    res.json({ success: true, decision: statusMap[decision], ledger: ledgerEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DISCOVERY FINDINGS (Remediation)
// -------------------------------------------------------------
platformRouter.post('/discovery/findings/:id/remediate', async (req, res) => {
  try {
    const findingsCol = await getCollection('discovery_findings');
    const ledgerCol = await getCollection('proof_ledger');

    const finding = await findingsCol.findOne({ a: req.params.id });
    if (!finding) return res.status(404).json({ error: 'Security finding not found.' });

    const now = new Date().toISOString();
    await findingsCol.updateOne(
      { a: req.params.id },
      { $set: { done: true, remediatedAt: now, updatedAt: now } }
    );

    // Record in Proof Ledger
    const hash = generateHash();
    const ledgerCount = await ledgerCol.countDocuments();
    const ledgerEntry = {
      timestamp: `24 Oct ${new Date().toTimeString().slice(0, 8)}`,
      event: 'Security finding remediated',
      context: finding.a,
      hash,
      seq: ledgerCount,
      createdAt: now,
    };
    await ledgerCol.insertOne(ledgerEntry);

    res.json({ success: true, message: 'Remediation recorded.', ledger: ledgerEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PROOF LEDGER
// -------------------------------------------------------------
platformRouter.get('/ledger', async (req, res) => {
  try {
    const col = await getCollection('proof_ledger');
    const filter = {};
    if (req.query.scope && req.query.scope !== 'All') {
      const map = {
        Consent: 'onsent',
        Rights: 'ights',
        Guard: 'Purpose Guard',
        Breach: 'reach',
        Notices: 'otice',
      };
      const pattern = map[req.query.scope] || req.query.scope;
      filter.$or = [
        { event: { $regex: pattern, $options: 'i' } },
        { context: { $regex: pattern, $options: 'i' } },
      ];
    }
    const entries = await col.find(filter, { projection: { _id: 0 } }).sort({ seq: 1 }).toArray();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.post('/ledger', async (req, res) => {
  try {
    const { event, context } = req.body;
    if (!event) return res.status(400).json({ error: 'Event description is required.' });

    const col = await getCollection('proof_ledger');
    const count = await col.countDocuments();
    const hash = generateHash();
    const now = new Date().toISOString();

    const entry = {
      timestamp: `24 Oct ${new Date().toTimeString().slice(0, 8)}`,
      event,
      context: context || '',
      hash,
      seq: count,
      createdAt: now,
    };

    await col.insertOne(entry);
    const { _id, ...clean } = entry;
    res.status(201).json(clean);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
