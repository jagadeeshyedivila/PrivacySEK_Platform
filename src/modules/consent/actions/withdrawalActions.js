// Consent withdrawal with an impact step and downstream propagation (DPDP s.6(4), s.6(6)).
// Step 1: choose what is withdrawn. Step 2: see the activities, systems, processors and the
// retention outcome. On confirm: the record is withdrawn, a propagation job is created, Purpose
// Guard blocks further use, and every step is written to the Proof Ledger.
import { principalById } from '../../../platform/principals.js';
import { emit } from '../../../platform/events.js';
import { PROPAGATION_TARGETS, CONSENT_ACTIVITIES } from '../consentData.js';

const ACTION_LABEL = { update_flag: 'Update consent flag', suppress: 'Suppress from campaigns', stop_processing: 'Stop processing', delete: 'Delete' };
const ACK_PILL = { acknowledged: ['ok', 'Acknowledged'], pending: ['risk', 'Pending'], sent: ['info', 'Sent'], failed: ['act', 'Failed'] };

export function registerWithdrawalActions(context, ACT) {
  const { state, runtime, saveConsentState, safe, formatDateTime, canEdit, loadCurrentUser } = context;
  const nowIso = () => new Date().toISOString();
  const who = () => (loadCurrentUser() || {}).name || 'Privacy team';
  const findRecord = id => state.consents.find(c => c.id === id);
  const findProp = id => (state.propagations || []).find(p => p.id === id);

  // Purposes a record can withdraw: what the guardian gave, else the non-essential purposes
  function withdrawable(c) {
    if (Array.isArray(c.purposesGiven) && c.purposesGiven.length) return c.purposesGiven.map(n => ({ name: n, category: 'Processing' }));
    // Purposes that only exist for children never apply to an adult's record
    const purposes = state.purposes.filter(p => !p.essential && p.status !== 'Disabled' && (p.subject !== 'Child' || c.ageBand === 'under_18')).map(p => ({ name: p.name, category: p.category }));
    // Service messages (e.g. security alerts) do not rest on consent, so they cannot be withdrawn
    const isService = name => {
      const pref = (state.preferences || []).find(x => x.name === name);
      return pref ? pref.category === 'Service' : /security alert/i.test(name);
    };
    const prefs = (c.preferences || []).filter(p => p.allowed && !isService(p.name)).map(p => ({ name: p.name, category: 'Marketing' }));
    return purposes.concat(prefs);
  }

  function impactOf(c, chosen) {
    const all = withdrawable(c).filter(p => chosen.includes(p.name));
    const seen = new Set();
    const activities = [];
    all.forEach(p => (CONSENT_ACTIVITIES[p.category] || []).forEach(a => { if (!seen.has(a.id)) { seen.add(a.id); activities.push(a); } }));
    const p = principalById(c.principalId);
    // A Draft workflow means that connector is not live: the send will fail
    const mailchimpLive = (state.workflows || []).some(w => /mailchimp/i.test(w.name) && w.status === 'Active');
    const targets = PROPAGATION_TARGETS.map(t => ({ ...t, willFail: t.system === 'Mailchimp' && !mailchimpLive }));
    const hasLoan = p ? (p.systems || []).some(s => /core-banking|los-db/.test(s)) : /Kulkarni|Deshmukh/.test(c.last || '');
    const retention = hasLoan
      ? { outcome: 'retain', reason: 'Active loan: KYC and loan records kept under RBI KYC Directions. Data used only for the withdrawn purposes is erased.' }
      : { outcome: 'erase', reason: 'No other legal basis applies. A deletion job is created with 48 hours\' notice.' };
    return { purposes: all.map(x => x.name), activities, targets, retention };
  }

  ACT['cp-open-withdraw'] = id => {
    const c = findRecord(id);
    if (!c || !canEdit()) return;
    const items = withdrawable(c);
    runtime.modal('Withdraw consent', `Step 1 of 2 · ${id}`, `
      <p class="cp-gd-note">Choose what the data principal${c.actingAs ? ' (through their guardian)' : ''} is withdrawing. Withdrawing must be as easy as giving consent (s.6(4)).</p>
      <div class="cp-wd-list">
        ${items.map((p, i) => `<label class="cp-wd-item"><input type="checkbox" class="cp-wd-pick" value="${safe(p.name)}" checked> <span>${safe(p.name)}</span><small class="dim">${safe(p.category)}</small></label>`).join('') || '<p class="dim">Nothing to withdraw on this record.</p>'}
      </div>
      <p class="rr-error" id="cp-wd-err" role="alert"></p>
    `, `
      <button class="btn sm o" data-act="close">Cancel</button>
      <button class="btn sm p" data-act="cp-wd-impact" data-arg="${safe(id)}">Next: review impact</button>
    `);
  };

  ACT['cp-wd-impact'] = id => {
    const c = findRecord(id);
    if (!c) return;
    const chosen = [...document.querySelectorAll('.cp-wd-pick:checked')].map(x => x.value);
    if (!chosen.length) { const e = document.getElementById('cp-wd-err'); if (e) e.textContent = 'Choose at least one purpose.'; return; }
    const imp = impactOf(c, chosen);
    context.ui.pendingWithdrawal = { id, purposes: chosen };
    runtime.modal('Withdraw consent', `Step 2 of 2 · Impact · ${id}`, `
      <div class="cp-wd-impact">
        <h4>Purposes withdrawn</h4>
        <p>${imp.purposes.map(safe).join(', ')}</p>
        <h4>Data Map activities affected</h4>
        <p>${imp.activities.length ? imp.activities.map(a => `<span class="cp-cell-mono">${safe(a.id)}</span> ${safe(a.name)}`).join(' · ') : '<span class="dim">None of the withdrawn purposes feed a recorded activity.</span>'}</p>
        <h4>Systems and processors told to stop (s.6(6))</h4>
        <ul class="cp-wd-targets">
          ${imp.targets.map(t => `<li><b>${safe(t.system)}</b> <span class="dim">${t.type === 'processor' ? 'processor' : 'internal system'} · ${safe(ACTION_LABEL[t.action] || t.action)}</span>${t.willFail ? ' ' + runtime.pill('risk', 'Connector not active') : ''}</li>`).join('')}
        </ul>
        <h4>Purpose Guard</h4>
        <p>Further use for these purposes is blocked for this principal from now on.</p>
        <h4>Retention outcome</h4>
        <p>${runtime.pill(imp.retention.outcome === 'erase' ? 'info' : 'risk', imp.retention.outcome === 'erase' ? 'Erase' : 'Retain (legal hold)')} ${safe(imp.retention.reason)}</p>
      </div>
    `, `
      <button class="btn sm o" data-act="cp-open-withdraw" data-arg="${safe(id)}">Back</button>
      <button class="btn sm p" style="background:#ef4444;color:#fff" data-act="cp-confirm-withdraw" data-arg="${safe(id)}">Confirm withdrawal</button>
    `);
  };

  ACT['cp-confirm-withdraw'] = id => {
    const c = findRecord(id);
    if (!c || c.withdrawn) return;
    const pending = context.ui.pendingWithdrawal && context.ui.pendingWithdrawal.id === id ? context.ui.pendingWithdrawal.purposes : withdrawable(c).map(p => p.name);
    const imp = impactOf(c, pending);
    const at = nowIso();
    c.withdrawn = true;
    c.withdrawnAt = at;
    c.events = (c.events || []).concat([{ at, type: 'withdrawn', purposes: imp.purposes, by: who() }]);

    state.propagations = state.propagations || [];
    const n = state.propagations.reduce((mx, p) => Math.max(mx, parseInt(String(p.id).slice(4), 10) || 0), 407) + 1;
    const prop = {
      id: 'PRP-' + String(n).padStart(4, '0'),
      consentId: c.id,
      principalId: c.principalId || null,
      purposes: imp.purposes,
      activities: imp.activities,
      targets: imp.targets.map(t => ({ system: t.system, type: t.type, action: t.action, sentAt: at, ack: 'sent', ackAt: null, willFail: !!t.willFail })),
      retention: { ...imp.retention, jobId: imp.retention.outcome === 'erase' ? 'DEL-2026-' + (114 + n - 407) : null },
      guardPolicy: 'GP-WD-' + String(n).padStart(4, '0'),
      createdAt: at,
      createdBy: who()
    };
    state.propagations.unshift(prop);
    c.propagationId = prop.id;
    context.ui.pendingWithdrawal = null;

    runtime.ledgerAdd('Consent withdrawn', `${c.id} · ${imp.purposes.length} purpose(s) · ${prop.id}`);
    emit('consent.withdrawn', { title: `Consent withdrawn · ${c.id}`, detail: `${imp.purposes.join(', ')} · ${prop.targets.length} targets notified`, source: 'consent', go: 'consent', severity: 'info', principalId: c.principalId, refs: { consentId: c.id, propagationId: prop.id } });
    saveConsentState(state);
    runtime.closeOv();
    runtime.toast(`Consent withdrawn. ${prop.id} sent to ${prop.targets.length} systems and processors.`);
    runtime.render();

    // Simulated acknowledgements: internal systems answer quickly, processors may lag
    setTimeout(() => {
      prop.targets.forEach(t => {
        if (t.ack !== 'sent') return;
        if (t.willFail) {
          t.ack = 'failed';
          t.error = 'Connector not active (workflow is a draft)';
          emit('propagation.failed', { title: `Withdrawal not delivered to ${t.system}`, detail: `${prop.id} · ${t.error}`, source: 'consent', go: 'consent', severity: 'act', principalId: prop.principalId, refs: { propagationId: prop.id } });
        } else if (t.system === 'Partner NBFC (co-lending)') {
          t.ack = 'pending';
        } else {
          t.ack = 'acknowledged';
          t.ackAt = nowIso();
          runtime.ledgerAdd('Withdrawal acknowledged', `${prop.id} · ${t.system}`);
        }
      });
      saveConsentState(state);
      if (document.querySelector('[data-prop-drawer="' + prop.id + '"]')) ACT['cp-prop-open'](prop.id);
      else runtime.render();
    }, 1500);
  };

  function trackerBody(p) {
    const done = p.targets.filter(t => t.ack === 'acknowledged').length;
    return `
      <div data-prop-drawer="${safe(p.id)}">
        <dl class="kv">
          <dt>Consent record</dt><dd class="cp-cell-mono">${safe(p.consentId)}</dd>
          <dt>Principal</dt><dd>${safe(principalById(p.principalId)?.displayName || p.principalId || '—')}</dd>
          <dt>Purposes</dt><dd>${safe(p.purposes.join(', '))}</dd>
          <dt>Activities</dt><dd>${safe((p.activities || []).map(a => a.id + ' ' + a.name).join(' · ') || '—')}</dd>
          <dt>Purpose Guard</dt><dd><span class="cp-cell-mono">${safe(p.guardPolicy)}</span> · use for these purposes is blocked</dd>
          <dt>Retention</dt><dd>${safe(p.retention.outcome === 'erase' ? 'Erase' : 'Retain')}${p.retention.jobId ? ' · ' + safe(p.retention.jobId) : ''} · ${safe(p.retention.reason)}</dd>
          <dt>Sent</dt><dd>${safe(formatDateTime(p.createdAt))} by ${safe(p.createdBy || '—')}</dd>
        </dl>
        <p class="cp-gd-note">${done} of ${p.targets.length} targets acknowledged.</p>
        <div class="tw"><table class="t cp-gd-table">
          <thead><tr><th>Target</th><th>Action</th><th>Status</th><th>Acknowledged</th><th></th></tr></thead>
          <tbody>${p.targets.map((t, i) => `
            <tr>
              <td><b>${safe(t.system)}</b><small class="cp-gd-sub">${t.type === 'processor' ? 'Processor' : 'Internal system'}</small></td>
              <td>${safe(ACTION_LABEL[t.action] || t.action)}</td>
              <td>${runtime.pill(...(ACK_PILL[t.ack] || ['n', t.ack]))}${t.error ? `<small class="cp-gd-sub">${safe(t.error)}</small>` : ''}</td>
              <td><span class="cp-cell-mono dim">${t.ackAt ? safe(formatDateTime(t.ackAt)) : '—'}</span></td>
              <td>${canEdit() && t.ack === 'failed' ? `<button class="btn sm" data-act="cp-prop-retry" data-arg="${safe(p.id)}|${i}">Retry</button>` : canEdit() && t.ack === 'pending' ? `<button class="btn sm" data-act="cp-prop-ack" data-arg="${safe(p.id)}|${i}">Mark acknowledged</button>` : ''}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
    `;
  }

  ACT['cp-prop-open'] = id => {
    const p = findProp(id);
    if (!p) return runtime.toast(`${id} not found`);
    runtime.drawer(`Withdrawal propagation · ${safe(p.id)}`, 'Consent withdrawal · s.6(6)', trackerBody(p), '', true);
  };

  function setAck(arg, fromRetry) {
    const [id, idx] = String(arg).split('|');
    const p = findProp(id);
    const t = p && p.targets[+idx];
    if (!t) return;
    t.ack = 'acknowledged';
    t.ackAt = nowIso();
    t.error = null;
    t.willFail = false;
    runtime.ledgerAdd(fromRetry ? 'Withdrawal resent and acknowledged' : 'Withdrawal acknowledged', `${p.id} · ${t.system}`);
    saveConsentState(state);
    runtime.toast(`${t.system} acknowledged`);
    ACT['cp-prop-open'](p.id);
    runtime.render();
  }
  ACT['cp-prop-retry'] = arg => setAck(arg, true);
  ACT['cp-prop-ack'] = arg => setAck(arg, false);
}
