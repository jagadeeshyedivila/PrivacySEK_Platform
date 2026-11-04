import { CP_ICONS } from '../../consentIcons.js';

// Date on one line, time beneath it, so date columns stay narrow
function dateTimeCell(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    '<small class="cp-cell-time">' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</small>';
}

export function createJurisdictionsRenderer(context) {
  const { state, runtime, ui, safe, formatDateTime, canEdit } = context;

  return function renderJurisdictions() {
    const q = (ui.jurisdictionSearch || '').trim().toLowerCase();
    const regFilter = ui.jurisdictionRegFilter || '';
    const isEditable = canEdit();

    const filtered = state.jurisdictions.filter(j => {
      const matchesQuery = !q || (
        j.name.toLowerCase().includes(q) ||
        j.code.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q))
      );
      const matchesReg = !regFilter || (j.regulations && j.regulations.includes(regFilter));
      return matchesQuery && matchesReg;
    });

    // Summary statistics
    const totalJurisdictions = state.jurisdictions.length;
    const allRegs = Array.from(new Set(state.jurisdictions.flatMap(j => j.regulations || [])));
    const totalRegions = Array.from(new Set(state.jurisdictions.flatMap(j => j.regions || []))).length;

    return `
      <!-- Top Metrics Summary -->
      <div class="cp-grid-4" style="margin-bottom:14px">
        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Configured Jurisdictions</span>
            <span class="cp-stat-icon" style="color:var(--accent)">${CP_ICONS.globe}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">${totalJurisdictions}</div>
          <small class="dim" style="font-size:11.5px">Active policy profiles</small>
        </div>

        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Statutory Frameworks</span>
            <span class="cp-stat-icon" style="color:#3b82f6">${CP_ICONS.shield}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">${allRegs.length}</div>
          <small class="dim" style="font-size:11.5px">${allRegs.slice(0, 3).join(', ')}${allRegs.length > 3 ? '…' : ''}</small>
        </div>

        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Mapped Regions</span>
            <span class="cp-stat-icon" style="color:#10b981">${CP_ICONS.pin}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">${totalRegions}</div>
          <small class="dim" style="font-size:11.5px">Countries & territories</small>
        </div>

        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Enforcement Engine</span>
            <span class="cp-stat-icon" style="color:#8b5cf6">${CP_ICONS.check}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">100%</div>
          <small class="dim" style="font-size:11.5px">Geo-targeting synchronized</small>
        </div>
      </div>

      <!-- Header & Toolbar -->
      <div class="cp-header-row">
        <div style="display:flex;align-items:center;gap:10px">
          <h2 class="cp-header-title">Jurisdictions</h2>
          <span class="cp-records-badge">${filtered.length} profile${filtered.length === 1 ? '' : 's'}</span>
        </div>
        <div class="cp-header-controls">
          <div class="cp-records-search-wrap" style="width:230px;min-width:0">
            <span class="cp-records-search-icon">${CP_ICONS.search}</span>
            <input
              type="search"
              class="cp-records-search-input"
              placeholder="Search jurisdictions..."
              value="${safe(ui.jurisdictionSearch || '')}"
              data-input-act="cp-jurisdiction-search"
              aria-label="Search jurisdictions"
            />
            ${ui.jurisdictionSearch ? `
              <button class="cp-records-search-clear" data-act="cp-jurisdiction-clear-search" aria-label="Clear search">
                ${CP_ICONS.x}
              </button>
            ` : ''}
          </div>

          <button
            class="btn sm p"
            ${isEditable ? '' : 'disabled title="Read-only mode"'}
            data-act="cp-open-add-jurisdiction"
          >
            <span class="cp-btn-icon">${CP_ICONS.plus}</span> Add Jurisdiction
          </button>
        </div>
      </div>

      <!-- Modern Table Card -->
      <div class="card cp-records-card" style="padding:0;overflow:hidden">
        <div class="cp-table-wrap">
          <table class="t cp-records-table cp-table-auto">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Code</th>
                <th>Description</th>
                <th>Regulations</th>
                <th>Regions</th>
                <th>Created At</th>
                <th>Last Updated</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map(j => {
                const regList = j.regulations || [];
                const regChips = regList.slice(0, 3).map(r =>
                  `<span class="cp-reg-pill">${safe(r)}</span>`
                ).join('') + (regList.length > 3 ? `<span class="cp-reg-pill more">+${regList.length - 3}</span>` : '');

                return `
                  <tr>
                    <td>
                      <a
                        href="javascript:void(0)"
                        class="cp-id-link"
                        data-act="cp-view-jurisdiction"
                        data-arg="${safe(j.id)}"
                      >
                        ${safe(j.id)}
                      </a>
                    </td>
                    <td>
                      <div class="cp-cell-name">${safe(j.name)}</div>
                    </td>
                    <td>
                      <span class="cp-code-pill">${safe(j.code)}</span>
                    </td>
                    <td>
                      ${j.description ? `<span class="cp-cell-wrap" title="${safe(j.description)}">${safe(j.description)}</span>` : '<span class="dim">—</span>'}
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;flex-wrap:wrap">
                        ${regChips || '<span class="dim">—</span>'}
                      </div>
                    </td>
                    <td>
                      <span class="cp-badge b-Disabled" style="font-size:11px">
                        ${(j.regions || []).length} region${(j.regions || []).length === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td class="dim cp-cell-mono">${dateTimeCell(j.created)}</td>
                    <td class="dim cp-cell-mono">${dateTimeCell(j.updated)}</td>
                    <td style="text-align:right;white-space:nowrap">
                      <button class="btn sm o" data-act="cp-view-jurisdiction" data-arg="${safe(j.id)}" style="padding:4px 8px;font-size:12px" title="View ${safe(j.name)}" aria-label="View ${safe(j.name)}">
                        <span class="cp-btn-icon">${CP_ICONS.eye}</span>
                      </button>
                      ${isEditable ? `
                        <button
                          class="btn sm o"
                          data-act="cp-delete-jurisdiction"
                          data-arg="${safe(j.id)}"
                          style="padding:4px 8px;font-size:12px;color:#ef4444;margin-left:4px"
                          title="Delete ${safe(j.name)}" aria-label="Delete ${safe(j.name)}"
                        >
                          <span class="cp-btn-icon" style="color:#ef4444">${CP_ICONS.trash}</span>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="9">
                    <div class="cp-empty-state">
                      <div class="cp-empty-icon">${CP_ICONS.globe}</div>
                      <b>No Jurisdictions Found</b>
                      <p>No jurisdictions match your search criteria. Try a different query or clear the filter.</p>
                      <button class="btn sm o" data-act="cp-jurisdiction-clear-search">Clear Search</button>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };
}
