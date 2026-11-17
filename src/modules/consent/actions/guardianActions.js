// Actions for the Guardian & Child Consent tab (DPDP s.9(1), Rules 10–11).
import { principalById, maskedName, guardiansOf, dependentsOf, isAdult, AGE_BAND_LABELS, RELATIONSHIP_LABELS } from '../../../platform/principals.js';
import { VERIFY_METHODS, methodById, simulateVerification, simulationBanner } from '../../../platform/verifySim.js';
import { emit } from '../../../platform/events.js';
import { VPC_STATUS } from '../screens/guardian/ConsentGuardian.jsx';

const OPEN = ['guardian_pending', 'in_review'];
const CHECK_LABEL = { guardian_contact_otp: 'Guardian contact (OTP)', guardian_is_adult: 'Guardian is an identifiable adult', guardianship_order: 'Guardianship order' };

export function registerGuardianActions(context, ACT) {
  const { state, runtime, ui, saveConsentState, safe, formatDateTime, canEdit, loadCurrentUser } = context;

  const nowIso = () => new Date().toISOString();
  const find = id => (state.vpcRequests || []).find(v => v.id === id);
  const who = () => (loadCurrentUser() || {}).name || 'Privacy team';
  const pill = s => runtime.pill(...(VPC_STATUS[s] || ['n', s]));
  const val = sel => (document.querySelector(sel)?.value || '').trim();
  const persist = () => saveConsentState(state);

  function log(v, status, note) {
    v.history = v.history || [];
    v.history.push({ at: nowIso(), status, by: who(), note });
  }

  function checkRows(v) {
    if (!v.checks || !v.checks.length) return '<p class="dim cp-gd-note">No checks run yet.</p>';
    return `<div class="cp-gd-checks">${v.checks.map(c => `
      <div class="cp-gd-check">
        ${runtime.pill(c.result === 'passed' ? 'ok' : c.result === 'failed' ? 'act' : 'info', c.result === 'needs_review' ? 'Needs review' : c.result === 'passed' ? 'Passed' : 'Failed')}
        <span><b>${safe(CHECK_LABEL[c.step] || c.step)}</b><small>${safe(c.source || c.note || '')}</small></span>
      </div>`).join('')}</div>`;
  }

  function drawerBody(v) {
    const child = principalById(v.childId);
    const guardian = principalById(v.guardianId);
    const open = OPEN.includes(v.status) && canEdit();
    const chosen = ui.gdMethod && ui.gdMethodFor === v.id ? ui.gdMethod : v.method;
    const m = methodById(chosen);
    // Guardian already verified for another child: Rule 10(1)(a) lets the identity be reused
    const sibling = dependentsOf(v.guardianId, state.relationships).find(r => r.dependentId !== v.childId);
    const order = v.guardianshipOrder || {};
    // s.9(3) (no tracking or targeted ads) applies to children only, not to persons with disability
    const isMinor = child?.ageBand === 'under_18';
    return `
      ${simulationBanner(safe)}
      <section class="cp-gd-sec">
        <h4>1 · ${isMinor ? 'Child' : 'Data principal'} and requested purposes</h4>
        <dl class="kv">
          <dt>${isMinor ? 'Child' : 'Data principal'}</dt><dd>${safe(maskedName(child))} <span class="dim cp-cell-mono">${safe(v.childId)}</span></dd>
          <dt>Age band</dt><dd>${safe(AGE_BAND_LABELS[child?.ageBand] || '—')}${child?.ageSource ? ` <span class="dim">· ${safe(child.ageSource.replace('_', ' '))}</span>` : ''}${child?.dpdpClass === 'pwd' ? ' · person with disability (Rule 11)' : ''}</dd>
          <dt>Service</dt><dd>${safe(v.service)} <span class="dim">· ${safe((v.activityIds || []).join(', '))}</span></dd>
          <dt>Purposes</dt><dd>${safe(v.purposes.join(', '))}</dd>
          <dt>Notice</dt><dd>${safe(v.noticeVersion)}</dd>
          <dt>Channel</dt><dd>${safe(v.channel)}</dd>
        </dl>
        ${isMinor
          ? '<p class="cp-gd-note">Tracking, behavioural monitoring and targeted ads stay blocked for this child whatever the guardian accepts (s.9(3)).</p>'
          : '<p class="cp-gd-note">An adult who cannot take legally binding decisions, even with support. Processing needs the verified consent of their lawful guardian (s.9(1), Rule 11).</p>'}
      </section>

      <section class="cp-gd-sec">
        <h4>2 · Guardian and relationship</h4>
        <dl class="kv">
          <dt>Guardian</dt><dd>${safe(guardian?.displayName || v.guardianId)} <span class="dim cp-cell-mono">${safe(v.guardianId)}</span></dd>
          <dt>Contact</dt><dd>${safe(guardian?.mobileMasked || '—')}</dd>
          <dt>Relationship</dt><dd>${safe(RELATIONSHIP_LABELS[v.relationship] || v.relationship)}</dd>
          <dt>Declaration</dt><dd>${safe(v.relationshipDeclaration)}</dd>
        </dl>
        ${guardian && !isAdult(guardian) ? '<div class="banner r"><span><b>Guardian must be an adult (Rule 10).</b> The person who identified as the guardian is recorded as under 18.</span></div>' : ''}
        ${sibling ? `<div class="banner t"><span><b>Reuse verified identity.</b> ${safe(guardian?.displayName)} is already verified for ${safe(maskedName(principalById(sibling.dependentId)))} (${safe(sibling.id)}). Rule 10(1)(a) lets you rely on that record.</span></div>` : ''}
      </section>

      <section class="cp-gd-sec">
        <h4>3 · Verification method</h4>
        <div class="cp-gd-methods" role="radiogroup" aria-label="Verification method">
          ${VERIFY_METHODS.filter(x => (v.relationship === 'pwd_guardian') === (x.id === 'guardianship_order')).map(x => `
            <label class="cp-gd-method ${chosen === x.id ? 'on' : ''}">
              <input type="radio" name="cp-gd-method" value="${x.id}" data-act="cp-gd-method" data-arg="${safe(v.id)}|${x.id}" ${chosen === x.id ? 'checked' : ''} ${open ? '' : 'disabled'}>
              <span><b>${safe(x.label)}</b> <small class="dim">${safe(x.ref)}</small><small>${safe(x.hint)}</small></span>
            </label>`).join('')}
        </div>
        <p class="cp-gd-note">An OTP to the guardian confirms they can be reached. It is recorded as a supporting check, never as the verification.</p>
      </section>

      <section class="cp-gd-sec">
        <h4>4 · Evidence</h4>
        ${chosen === 'guardianship_order' ? `
          <div class="cp-gd-fields">
            <div class="field"><label for="cp-gd-authority">Issuing authority</label><input id="cp-gd-authority" value="${safe(order.authority || '')}" placeholder="e.g. District Court, Chennai" ${open ? '' : 'disabled'}></div>
            <div class="field"><label for="cp-gd-order">Order number</label><input id="cp-gd-order" value="${safe(order.orderNo || '')}" placeholder="e.g. GO/2024/118" ${open ? '' : 'disabled'}></div>
            <div class="field"><label for="cp-gd-issued">Issued on</label><input id="cp-gd-issued" type="date" value="${safe(order.issuedOn || '')}" ${open ? '' : 'disabled'}></div>
            <div class="field"><label for="cp-gd-law">Law</label><select id="cp-gd-law" ${open ? '' : 'disabled'}>${['RPwD Act 2016', 'National Trust Act 1999'].map(l => `<option ${order.law === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          </div>` : chosen === 'authority_issued_details' ? '<p class="cp-gd-note">Document placeholder: no file is stored in the demo. A reviewer confirms the details before approval.</p>'
          : chosen === 'virtual_token' ? '<p class="cp-gd-note">A simulated token issuer returns only “adult: true/false”. No identity data is fetched.</p>'
          : chosen === 'existing_kyc_record' ? `<p class="cp-gd-note">Looks up the guardian's existing record. ${guardian?.kycVerified ? `Record on file: <b>${safe(guardian.kycRef || guardian.customerId)}</b>.` : 'No KYC-verified record exists for this person, so this method will fail.'}</p>` : '<p class="cp-gd-note">Choose a method first.</p>'}
        ${v.evidenceRef ? `<p class="cp-gd-note">Evidence reference: <span class="cp-cell-mono">${safe(v.evidenceRef)}</span></p>` : ''}
        ${checkRows(v)}
        ${open ? `<button class="btn sm" data-act="cp-gd-run" data-arg="${safe(v.id)}" ${m ? '' : 'disabled'}>Run simulated check</button>` : ''}
      </section>

      <section class="cp-gd-sec">
        <h4>5 · Decision</h4>
        <div class="cp-gd-status">${pill(v.status)}${v.decidedBy ? `<span class="dim">by ${safe(v.decidedBy)} · ${safe(formatDateTime(v.decidedAt))}</span>` : ''}</div>
        ${v.reason ? `<p class="cp-gd-note">${safe(v.reason)}</p>` : ''}
        ${open ? `<div class="field"><label for="cp-gd-reason">Reason (required to reject or ask for more information)</label><textarea id="cp-gd-reason" rows="2" placeholder="e.g. Order copy is unreadable"></textarea></div><p class="rr-error cp-gd-err" id="cp-gd-err" role="alert"></p>` : ''}
        <ol class="cp-gd-history">
          ${(v.history || []).slice().reverse().map(h => `<li><b>${safe((VPC_STATUS[h.status] || [, h.status])[1])}</b> <small>${safe(formatDateTime(h.at))} · ${safe(h.by)}</small>${h.note ? `<p>${safe(h.note)}</p>` : ''}</li>`).join('')}
        </ol>
      </section>
    `;
  }

  function drawerFoot(v) {
    if (!canEdit()) return '<span class="dim">Read-only for your role</span>';
    if (OPEN.includes(v.status)) {
      return `
        <button class="btn sm" data-act="cp-gd-info" data-arg="${safe(v.id)}">Request more info</button>
        <button class="btn sm d" data-act="cp-gd-reject" data-arg="${safe(v.id)}">Reject</button>
        <button class="btn sm p" data-act="cp-gd-approve" data-arg="${safe(v.id)}">Approve</button>`;
    }
    if (v.status === 'expired' || v.status === 'rejected') return `<button class="btn sm" data-act="cp-gd-resend" data-arg="${safe(v.id)}">Send a new guardian invite</button>`;
    return '';
  }

  function openDrawer(v) {
    runtime.drawer(`${safe(v.id)} · ${safe(maskedName(principalById(v.childId)))}`, 'Guardian & Child Consent', drawerBody(v), drawerFoot(v), true);
  }

  ACT['cp-gd-open'] = id => {
    const v = find(id);
    if (!v) return runtime.toast(`${id} not found`);
    // A toast from an earlier action must not sit over a different request
    document.querySelector('.toast')?.remove();
    ui.gdMethod = null;
    ui.gdMethodFor = null;
    openDrawer(v);
  };

  ACT['cp-gd-method'] = arg => {
    const [id, method] = String(arg).split('|');
    const v = find(id);
    if (!v) return;
    ui.gdMethod = method;
    ui.gdMethodFor = id;
    openDrawer(v);
  };

  ACT['cp-gd-run'] = id => {
    const v = find(id);
    if (!v || !OPEN.includes(v.status)) return;
    const method = ui.gdMethodFor === id && ui.gdMethod ? ui.gdMethod : v.method;
    const evidence = { authority: val('#cp-gd-authority'), orderNo: val('#cp-gd-order'), issuedOn: val('#cp-gd-issued'), law: val('#cp-gd-law') };
    const res = simulateVerification(method, v.guardianId, evidence);
    v.method = method;
    v.methodRef = methodById(method)?.ref || null;
    v.checks = res.checks;
    v.evidenceRef = res.evidenceRef || v.evidenceRef || null;
    if (method === 'guardianship_order' && evidence.orderNo) {
      v.guardianshipOrder = { authority: evidence.authority, orderNo: evidence.orderNo, issuedOn: evidence.issuedOn || null, law: evidence.law, validTill: null };
    }
    if (v.status === 'guardian_pending') v.status = 'in_review';
    v.reason = res.result === 'failed' ? res.reason : '';
    log(v, v.status, `Simulated check (${methodById(method)?.label}): ${res.result === 'needs_review' ? 'needs reviewer confirmation' : res.result}.`);
    persist();
    // The outcome shows in the drawer (checks and reason), so no toast is left behind
    ui.gdMethod = null;
    openDrawer(v);
    runtime.render();
  };

  ACT['cp-gd-approve'] = id => {
    const v = find(id);
    if (!v || !OPEN.includes(v.status)) return;
    const err = msg => { const el = document.getElementById('cp-gd-err'); if (el) el.textContent = msg; runtime.toast(msg); };
    if (!v.method || !v.checks || !v.checks.some(c => c.step !== 'guardian_contact_otp')) return err('Run the verification check before approving.');
    if (v.checks.some(c => c.result === 'failed')) return err(v.reason || 'A check failed. The guardian cannot be approved.');
    // The reviewer's approval is the confirmation for checks that needed one
    v.checks.forEach(c => { if (c.result === 'needs_review') { c.result = 'passed'; c.source = `${c.source} · confirmed by ${who()}`; } });
    v.status = 'verified';
    v.decidedBy = who();
    v.decidedAt = nowIso();
    v.reason = '';
    log(v, 'verified', 'Guardian verified. Requested purposes are active for the child.');

    state.relationships = state.relationships || [];
    let rel = state.relationships.find(r => r.guardianId === v.guardianId && r.dependentId === v.childId);
    if (!rel) {
      const n = state.relationships.reduce((mx, r) => Math.max(mx, parseInt(String(r.id).slice(4), 10) || 0), 30) + 1;
      rel = {
        id: 'REL-' + String(n).padStart(4, '0'),
        guardianId: v.guardianId,
        dependentId: v.childId,
        type: v.relationship,
        declaredAt: v.requestedAt,
        declaration: v.relationshipDeclaration,
        evidenceRef: v.id,
        status: 'active',
        primary: guardiansOf(v.childId, state.relationships).length === 0,
        guardianshipOrder: v.guardianshipOrder || null
      };
      state.relationships.push(rel);
    } else {
      rel.status = 'active';
      rel.evidenceRef = v.id;
    }

    // The guardian's consent becomes a consent record with a receipt
    const child = principalById(v.childId);
    const guardian = principalById(v.guardianId);
    if (!state.consents.some(c => c.vpcId === v.id)) {
      const n = state.consents.reduce((mx, c) => Math.max(mx, parseInt(String(c.id).slice(3), 10) || 0), 5000) + 1;
      const [first, last = ''] = (child?.displayName || v.childId).split(' ');
      state.consents.unshift({
        id: 'CR-' + n, principalId: v.childId, actingPrincipalId: v.guardianId,
        actingAs: v.relationship === 'pwd_guardian' ? 'pwd_guardian' : 'guardian', vpcId: v.id,
        ageBand: child?.ageBand || 'unknown', channel: v.channel, language: 'en-IN',
        notice: { id: 'NT-07', version: v.noticeVersion },
        first, last: last ? last[0] + '.' : '', email: 'guardian.' + v.guardianId.toLowerCase() + '@example.in',
        authId: 'auth-' + n, source: 'Private', country: 'India', city: child?.city || '', ip: '203.0.113.' + (n % 250),
        aadhaar: '', verified: true, maskIP: true, phone: guardian?.mobileMasked || '—', zip: '',
        status: 'Partial Consent', withdrawn: false, expired: false, created: nowIso(), owner: 'own-guardian',
        preferences: [{ name: 'Security Alerts', allowed: true }, { name: 'Promotional Offers', allowed: false }, { name: 'Advertising', allowed: false }],
        purposesGiven: v.purposes.slice(),
        proofs: [{ content: 'Guardian consent after verification ' + v.id, form: 'Guardian & Child Consent' }],
        legalNotices: [{ identifier: 'Guardian notice', version: String(v.noticeVersion).replace(/^.* v/, ''), content: 'Guardian notice accepted' }],
        receipt: { id: 'RCPT-' + (88000 + n), issuedAt: nowIso() },
        additional: ''
      });
    }

    runtime.ledgerAdd('VPC verified', `${v.id} · ${methodById(v.method)?.ref} · ${rel.id} · simulated`);
    emit('vpc.verified', { title: `Guardian verified for ${maskedName(child)}`, detail: `${v.id} · ${methodById(v.method)?.label}`, source: 'consent', go: 'consent', severity: 'info', principalId: v.childId, refs: { vpcId: v.id, relationshipId: rel.id } });
    persist();
    runtime.closeOv();
    runtime.toast(`Guardian verified. ${rel.id} created and written to the Proof Ledger.`);
    runtime.render();
  };

  ACT['cp-gd-reject'] = id => {
    const v = find(id);
    if (!v || !OPEN.includes(v.status)) return;
    const reason = val('#cp-gd-reason');
    if (!reason) {
      const el = document.getElementById('cp-gd-err');
      if (el) el.textContent = 'A reason is required to reject.';
      return;
    }
    v.status = 'rejected';
    v.reason = reason;
    v.decidedBy = who();
    v.decidedAt = nowIso();
    log(v, 'rejected', reason);
    runtime.ledgerAdd('VPC rejected', `${v.id} · ${reason}`);
    emit('vpc.rejected', { title: `Guardian verification rejected`, detail: `${v.id} · ${reason}`, source: 'consent', go: 'consent', severity: 'risk', principalId: v.childId, refs: { vpcId: v.id } });
    persist();
    runtime.closeOv();
    runtime.toast(`${v.id} rejected. The child's data stays blocked.`);
    runtime.render();
  };

  ACT['cp-gd-info'] = id => {
    const v = find(id);
    if (!v || !OPEN.includes(v.status)) return;
    const reason = val('#cp-gd-reason');
    if (!reason) {
      const el = document.getElementById('cp-gd-err');
      if (el) el.textContent = 'Say what the guardian needs to provide.';
      return;
    }
    log(v, v.status, `More information requested from the guardian: ${reason}`);
    persist();
    runtime.toast('Request for more information sent to the guardian (simulated)');
    openDrawer(v);
  };

  ACT['cp-gd-resend'] = id => {
    const v = find(id);
    if (!v || OPEN.includes(v.status) || v.status === 'verified') return;
    v.status = 'guardian_pending';
    v.method = null;
    v.methodRef = null;
    v.checks = [];
    v.reason = '';
    v.decidedBy = null;
    v.decidedAt = null;
    v.requestedAt = nowIso();
    v.expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
    log(v, 'guardian_pending', 'New guardian invite sent. Expires in 7 days.');
    emit('vpc.requested', { title: 'Guardian invite sent', detail: v.id, source: 'consent', go: 'consent', principalId: v.childId, refs: { vpcId: v.id } });
    persist();
    runtime.toast('New guardian invite sent (simulated)');
    openDrawer(v);
    runtime.render();
  };

  // Opens the Guardian & Child tab from elsewhere (Obligation Cockpit, notifications)
  ACT['cp-open-guardian'] = () => {
    ui.topTab = 'guardian';
    ui.selectedRecordId = null;
    if (location.hash === '#consent') runtime.render();
    else location.hash = '#consent';
  };

  ACT['cp-gd-view'] = view => { ui.guardianView = view === 'relationships' ? 'relationships' : 'queue'; runtime.render(); };
  ACT['cp-gd-search'] = q => { ui.guardianSearch = q; runtime.render(); };
  ACT['cp-gd-filter-status'] = s => { ui.guardianStatus = s; runtime.render(); };
  ACT['cp-gd-filter-method'] = m => { ui.guardianMethod = m; runtime.render(); };
  ACT['cp-gd-reset-filters'] = () => { ui.guardianStatus = ''; ui.guardianMethod = ''; ui.guardianSearch = ''; runtime.render(); };
}
