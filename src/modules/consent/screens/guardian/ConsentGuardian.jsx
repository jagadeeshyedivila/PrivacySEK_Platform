// Guardian & Child Consent: verifiable consent of a parent or lawful guardian before a
// child's (or a person with disability's) data is processed. DPDP s.9(1), Rules 10–11.
// Verification is simulated; every screen says so.
import { principalById, maskedName, daysToEighteen, AGE_BAND_LABELS, RELATIONSHIP_LABELS } from '../../../../platform/principals.js';
import { VERIFY_METHODS, methodById, simulationBanner } from '../../../../platform/verifySim.js';

export const VPC_STATUS = {
  guardian_pending: ['risk', 'Awaiting guardian'],
  in_review: ['info', 'In review'],
  verified: ['ok', 'Verified'],
  rejected: ['act', 'Rejected'],
  expired: ['n', 'Expired'],
  withdrawn: ['n', 'Withdrawn'],
  aged_up: ['n', 'Aged up (18)']
};

export function createGuardianRenderer(context) {
  const { state, runtime, ui, safe, formatDate, canEdit } = context;

  const statusPill = s => runtime.pill(...(VPC_STATUS[s] || ['n', s]));
  const name = id => safe(maskedName(principalById(id)));
  const fullName = id => safe(principalById(id)?.displayName || id);

  function kpis(list, rels) {
    const count = s => list.filter(v => v.status === s).length;
    const children = new Set(list.map(v => v.childId)).size;
    const ageing = list.filter(v => v.status === 'verified').filter(v => {
      const d = daysToEighteen(principalById(v.childId));
      return d !== null && d <= 30;
    }).length;
    return `
      <div class="cp-gd-kpis">
        ${runtime.kpi('Child principals', children, 'Under 18 or under guardianship', '#3B82F6')}
        ${runtime.kpi('Awaiting guardian', count('guardian_pending'), 'Invite sent, no response', '#F59E0B')}
        ${runtime.kpi('In review', count('in_review'), 'Reviewer decision needed', '#8B5CF6')}
        ${runtime.kpi('Verified', count('verified'), `${rels.length} active relationships`, '#14B8A6')}
        ${runtime.kpi('Rejected / expired', count('rejected') + count('expired'), 'Processing stays blocked', '#EF4444')}
        ${runtime.kpi('Ageing out in 30 days', ageing, 'Turns 18: ask for their own consent', '#0EA5E9')}
      </div>
    `;
  }

  function queue(list) {
    const q = (ui.guardianSearch || '').trim().toLowerCase();
    const rows = list.filter(v => {
      if (ui.guardianStatus && v.status !== ui.guardianStatus) return false;
      if (ui.guardianMethod && (v.method || 'none') !== ui.guardianMethod) return false;
      if (q) {
        const text = `${v.id} ${principalById(v.childId)?.displayName} ${principalById(v.guardianId)?.displayName} ${v.service} ${v.channel}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
    return `
      <div class="cp-gd-toolbar">
        <input type="search" class="table-search-input" placeholder="Search child, guardian, ID or service" value="${safe(ui.guardianSearch || '')}" data-input-act="cp-gd-search" aria-label="Search guardian requests">
        <select class="table-filter-select" data-act="cp-gd-filter-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          ${Object.entries(VPC_STATUS).map(([k, [, l]]) => `<option value="${k}" ${ui.guardianStatus === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select class="table-filter-select" data-act="cp-gd-filter-method" aria-label="Filter by method">
          <option value="">All methods</option>
          ${VERIFY_METHODS.map(m => `<option value="${m.id}" ${ui.guardianMethod === m.id ? 'selected' : ''}>${safe(m.label)}</option>`).join('')}
          <option value="none" ${ui.guardianMethod === 'none' ? 'selected' : ''}>Not chosen yet</option>
        </select>
        <span class="cp-gd-count">${rows.length} of ${list.length}</span>
      </div>
      <div class="tw cp-table-wrap">
        <table class="t cp-gd-table">
          <thead><tr>
            <th scope="col">Request</th><th scope="col">Child</th><th scope="col">Guardian</th>
            <th scope="col">Service · purposes</th><th scope="col">Method</th><th scope="col">Status</th><th scope="col" aria-label="Actions"></th>
          </tr></thead>
          <tbody>
            ${rows.map(v => {
              const child = principalById(v.childId);
              const m = methodById(v.method);
              return `
                <tr>
                  <td><a href="javascript:void(0)" class="cp-id-link" data-act="cp-gd-open" data-arg="${safe(v.id)}">${safe(v.id)}</a><small class="cp-gd-sub">${safe(formatDate(v.requestedAt))}</small></td>
                  <td><b>${name(v.childId)}</b><small class="cp-gd-sub">${safe(AGE_BAND_LABELS[child?.ageBand] || '—')}${child?.dpdpClass === 'pwd' ? ' · person with disability' : ''}</small></td>
                  <td>${fullName(v.guardianId)}<small class="cp-gd-sub">${safe(RELATIONSHIP_LABELS[v.relationship] || v.relationship)}</small></td>
                  <td class="cp-gd-wrap"><span class="cp-gd-sub-strong">${safe(v.service)}</span><small class="cp-gd-sub">${safe(v.purposes.join(', '))} · ${safe(v.channel)}</small></td>
                  <td class="cp-gd-wrap">${m ? `${safe(m.label)}<small class="cp-gd-sub">${safe(m.ref)}</small>` : '<span class="dim">Not chosen</span>'}</td>
                  <td>${statusPill(v.status)}</td>
                  <td><button class="btn sm" data-act="cp-gd-open" data-arg="${safe(v.id)}">${['guardian_pending', 'in_review'].includes(v.status) && canEdit() ? 'Verify' : 'View'}</button></td>
                </tr>
              `;
            }).join('') || `<tr><td colspan="7" class="table-empty-cell"><div class="table-empty-state"><h4 class="table-empty-title">No guardian requests match</h4><button class="btn sm o" data-act="cp-gd-reset-filters">Reset filters</button></div></td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  function relationships(rels) {
    return `
      <div class="tw cp-table-wrap">
        <table class="t cp-gd-table">
          <thead><tr><th scope="col">Link</th><th scope="col">Guardian</th><th scope="col">Dependent</th><th scope="col">Type</th><th scope="col">Evidence</th><th scope="col">Declared</th><th scope="col">Status</th><th scope="col">Turns 18</th></tr></thead>
          <tbody>
            ${rels.map(r => {
              const dep = principalById(r.dependentId);
              const d = daysToEighteen(dep);
              return `
                <tr>
                  <td class="cp-cell-mono">${safe(r.id)}${r.primary ? ' <span class="cp-badge b-Active">Primary</span>' : ''}</td>
                  <td>${fullName(r.guardianId)}</td>
                  <td>${name(r.dependentId)}<small class="cp-gd-sub">${safe(dep?.service || '')}</small></td>
                  <td>${safe(RELATIONSHIP_LABELS[r.type] || r.type)}${r.guardianshipOrder ? `<small class="cp-gd-sub">${safe(r.guardianshipOrder.authority)} · ${safe(r.guardianshipOrder.orderNo)}</small>` : ''}</td>
                  <td><a href="javascript:void(0)" class="cp-id-link" data-act="cp-gd-open" data-arg="${safe(r.evidenceRef)}">${safe(r.evidenceRef)}</a></td>
                  <td><span class="cp-cell-mono dim">${safe(formatDate(r.declaredAt))}</span></td>
                  <td>${runtime.pill(r.status === 'active' ? 'ok' : 'n', r.status === 'active' ? 'Active' : r.status)}</td>
                  <td>${d === null ? '<span class="dim">—</span>' : d <= 30 ? runtime.pill('risk', `In ${d} days`) : `<span class="dim">${safe(formatDate(dep.turns18On))}</span>`}</td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="8" class="table-empty-cell">No relationships yet. One is created when a guardian is verified.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  return function renderGuardian() {
    const list = state.vpcRequests || [];
    const rels = state.relationships || [];
    const view = ui.guardianView === 'relationships' ? 'relationships' : 'queue';
    return `
      <div class="cp-gd">
        <div class="cp-header-row">
          <div>
            <h2 class="cp-header-title">Guardian &amp; Child Consent</h2>
            <p class="cp-gd-lede">Verifiable consent of a parent or lawful guardian before a child's data is processed (DPDP s.9(1), Rules 10–11). A checkbox or an OTP is never treated as verification.</p>
          </div>
        </div>
        ${simulationBanner(safe)}
        ${kpis(list, rels)}
        <div class="card cp-gd-card">
          <div class="cp-gd-seg" role="tablist" aria-label="Guardian views">
            <button role="tab" aria-selected="${view === 'queue'}" class="${view === 'queue' ? 'active' : ''}" data-act="cp-gd-view" data-arg="queue">Verification queue <span>${list.length}</span></button>
            <button role="tab" aria-selected="${view === 'relationships'}" class="${view === 'relationships' ? 'active' : ''}" data-act="cp-gd-view" data-arg="relationships">Relationships <span>${rels.length}</span></button>
          </div>
          ${view === 'queue' ? queue(list) : relationships(rels)}
        </div>
      </div>
    `;
  };
}
