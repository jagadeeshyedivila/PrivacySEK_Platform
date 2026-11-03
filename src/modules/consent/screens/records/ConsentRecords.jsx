export function createRecordsRenderer(context) {
  const { state, runtime, ui, DATE_RANGES, safe, formatDate, formatDateTime, canEdit } = context;

  function renderRecordDetail(c) {
    if (!c) {
      return `
        <div class="card empty" style="text-align:center;padding:40px;color:var(--text-2)">
          Record not found.
          <br><br>
          <button class="btn sm" data-act="cp-back-to-records">Back to Records</button>
        </div>
      `;
    }

    const badgeClass = c.status === 'Accept All' ? 'b-Accept' : c.status === 'Reject All' ? 'b-Reject' : 'b-Partial';

    return `
      <div class="cp-header-row">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn sm o" data-act="cp-back-to-records">← Back to Records</button>
          <h2 class="cp-header-title">
            ${safe(c.first)} ${safe(c.last)}
            <span class="dim" style="font-size:13px;font-family:var(--f-mono)">(${safe(c.id)})</span>
            <span class="cp-badge ${badgeClass}">${safe(c.status)}</span>
            ${c.withdrawn ? '<span class="cp-badge b-Withdrawn">Withdrawn</span>' : ''}
            ${c.expired ? '<span class="cp-badge b-Expired">Expired</span>' : ''}
          </h2>
        </div>
        <div>
          ${!c.withdrawn ? `
            <button class="btn sm" style="background:#ef4444;color:#fff" ${canEdit() ? '' : 'disabled title="Read-only mode"'} data-act="cp-open-withdraw" data-arg="${safe(c.id)}">
              Withdraw consent
            </button>
          ` : `
            <span class="dim" style="font-size:12.5px">Consent was withdrawn</span>
          `}
        </div>
      </div>

      <div class="card" style="padding:18px;margin-bottom:14px">
        <h4 style="margin:0 0 14px;color:var(--text);font-size:14px">Identity & Origin Details</h4>
        <div class="cp-grid-4">
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Email</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.email)}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Authentication ID</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.authId || '—')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Data Source</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.source || 'Private')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Country</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.country || '—')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">City</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.city || '—')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">IP Address</small>
            <div style="font-weight:600;margin-top:2px">${c.maskIP ? '•••• (Masked)' : safe(c.ip || '—')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Verified</small>
            <div style="font-weight:600;margin-top:2px">${c.verified ? 'Yes (Verified)' : 'No'}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Created</small>
            <div style="font-weight:600;margin-top:2px">${safe(formatDateTime(c.created))}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Owner ID</small>
            <div style="font-weight:600;margin-top:2px" class="cp-cell-mono">${safe(c.owner || '—')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Aadhaar (masked)</small>
            <div style="font-weight:600;margin-top:2px" class="cp-cell-mono">${safe(c.aadhaar || '—')}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">Phone / Landline</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.phone || '—')}${c.landline ? ' · ' + safe(c.landline) : ''}</div>
          </div>
          <div>
            <small style="color:var(--text-2);font-size:11.5px">ZIP / PIN Code</small>
            <div style="font-weight:600;margin-top:2px">${safe(c.zip || '—')}</div>
          </div>
        </div>
      </div>

      <div class="cp-grid-2">
        <div class="card" style="padding:18px">
          <h4 style="margin:0 0 12px;color:var(--text);font-size:14px">Consent Preferences</h4>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${c.preferences && c.preferences.length ? c.preferences.map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface-2);border-radius:6px">
                <span style="font-weight:550;color:var(--text)">${safe(p.name)}</span>
                <span class="cp-badge ${p.allowed ? 'b-Yes' : 'b-Reject'}">${p.allowed ? 'Allowed' : 'Not allowed'}</span>
              </div>
            `).join('') : '<div class="dim" style="font-size:12.5px">No preferences recorded.</div>'}
          </div>
        </div>

        <div class="card" style="padding:18px">
          <h4 style="margin:0 0 12px;color:var(--text);font-size:14px">Proofs & Legal Notices</h4>
          <div style="margin-bottom:14px">
            <b style="font-size:12.5px;color:var(--text-2);display:block;margin-bottom:6px">Proofs</b>
            ${c.proofs && c.proofs.length ? c.proofs.map(p => `
              <div style="padding:6px 0;border-bottom:1px solid var(--line-2);font-size:13px">
                <b>${safe(p.content)}</b> <span class="dim">(${safe(p.form)})</span>
              </div>
            `).join('') : '<div class="dim" style="font-size:12px">None</div>'}
          </div>

          <div>
            <b style="font-size:12.5px;color:var(--text-2);display:block;margin-bottom:6px">Legal Notices</b>
            ${c.legalNotices && c.legalNotices.length ? c.legalNotices.map(l => `
              <div style="padding:6px 0;border-bottom:1px solid var(--line-2);font-size:13px;display:flex;align-items:center;justify-content:space-between">
                <span>${safe(l.identifier)}</span>
                <span class="cp-badge b-Active">v${safe(l.version)}</span>
              </div>
            `).join('') : '<div class="dim" style="font-size:12px">None</div>'}
          </div>
        </div>
      </div>

      ${Array.isArray(c.additional) && c.additional.length ? `
        <div class="card" style="padding:18px;margin-top:14px">
          <h4 style="margin:0 0 12px;color:var(--text);font-size:14px">Additional Data</h4>
          <dl class="kv">
            ${c.additional.map(a => `<dt>${safe(a.key)}</dt><dd>${safe(a.value)}</dd>`).join('')}
          </dl>
        </div>
      ` : ''}
    `;
  }

  return function renderConsentRecords() {
    if (ui.selectedRecordId) {
      const record = state.consents.find(c => c.id === ui.selectedRecordId);
      return renderRecordDetail(record);
    }

    const rangeDays = ui.range || 365;
    const now = Date.now();
    const query = (ui.recordsSearch || '').trim().toLowerCase();
    const statusFilter = ui.recordsStatusFilter || '';

    // Filter
    let filtered = state.consents.filter(c => {
      if (rangeDays < 9999) {
        const ageMs = now - new Date(c.created).getTime();
        if (ageMs > rangeDays * 864e5) return false;
      }
      if (statusFilter && c.status !== statusFilter) return false;
      if (query) {
        const text = `${c.id} ${c.first} ${c.last} ${c.email} ${c.aadhaar || ''} ${c.country} ${c.city} ${c.status} ${c.owner}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    // Sort
    const sortCol = ui.recordsSortCol || 'created';
    const sortDir = ui.recordsSortDir || -1;
    filtered.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];
      if (sortCol === 'name') {
        valA = `${a.first} ${a.last}`.toLowerCase();
        valB = `${b.first} ${b.last}`.toLowerCase();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB || '').toLowerCase();
      }
      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });

    // Pagination
    const pageSize = ui.recordsPageSize || 10;
    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPage = Math.min(Math.max(1, ui.recordsPage || 1), totalPages);
    ui.recordsPage = currentPage;

    const startIndex = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    // Compute window of page numbers
    const pageButtons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      pageButtons.push(`<button type="button" class="pg-num" data-act="cp-records-page" data-arg="1">1</button>`);
      if (startPage > 2) {
        pageButtons.push('<span class="pg-ellipsis" aria-hidden="true">…</span>');
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const isCur = p === currentPage;
      pageButtons.push(`
        <button type="button" class="pg-num ${isCur ? 'is-active' : ''}" data-act="cp-records-page" data-arg="${p}" aria-current="${isCur ? 'page' : 'false'}">
          ${p}
        </button>
      `);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageButtons.push('<span class="pg-ellipsis" aria-hidden="true">…</span>');
      }
      pageButtons.push(`<button type="button" class="pg-num" data-act="cp-records-page" data-arg="${totalPages}">${totalPages}</button>`);
    }

    const sortButton = (colKey, colLabel) => {
      const isSorted = sortCol === colKey;
      const indicator = isSorted
        ? (sortDir === 1 ? ' <span class="sort-indicator asc">▲</span>' : ' <span class="sort-indicator desc">▼</span>')
        : ' <span class="sort-indicator neutral">↕</span>';

      return `
        <th class="th-sortable ${isSorted ? 'is-sorted' : ''}" scope="col">
          <button type="button" class="th-sort-btn" data-act="cp-sort-records" data-arg="${colKey}" aria-label="Sort by ${colLabel}">
            <span>${colLabel}</span>${indicator}
          </button>
        </th>
      `;
    };

    return `
      <div class="card cp-records-card">
        <!-- Toolbar & Controls -->
        <div class="cp-records-toolbar">
          <div class="cp-records-toolbar-top">
            <div class="cp-records-title-group">
              <h2 class="cp-header-title">Consent Records</h2>
              <span class="cp-records-badge">${totalRecords.toLocaleString()} Records</span>
            </div>

            <div class="cp-records-actions">
              <button class="btn sm o" data-act="cp-export-csv" title="Download filtered records as CSV">
                <span style="font-size:12px;opacity:0.8">📥</span> CSV
              </button>
              <button class="btn sm p" ${canEdit() ? '' : 'disabled title="Read-only mode"'} data-act="cp-open-add-record">
                <span>+</span> Add Consent
              </button>
            </div>
          </div>

          <div class="cp-records-controls-row">
            <div class="cp-records-search-wrap">
              <span class="cp-records-search-icon">🔍</span>
              <input
                type="search"
                class="table-search-input cp-records-search-input"
                placeholder="Search by name, email, ID, country..."
                value="${safe(ui.recordsSearch || '')}"
                data-input-act="cp-records-search"
                aria-label="Search records"
              />
              ${ui.recordsSearch ? `
                <button
                  type="button"
                  class="cp-records-search-clear"
                  data-act="cp-records-clear-search"
                  title="Clear search"
                  aria-label="Clear search"
                >×</button>
              ` : ''}
            </div>

            <div class="cp-records-filters">
              <div class="cp-filter-group">
                <label class="cp-filter-label" for="cp-date-range-select">Period:</label>
                <select id="cp-date-range-select" class="table-filter-select" data-act="cp-set-range" aria-label="Select date range">
                  ${DATE_RANGES.map(([d, l]) => `
                    <option value="${d}" ${d === rangeDays ? 'selected' : ''}>${safe(l)}</option>
                  `).join('')}
                </select>
              </div>

              <div class="cp-filter-group">
                <label class="cp-filter-label" for="cp-status-filter-select">Status:</label>
                <select id="cp-status-filter-select" class="table-filter-select" data-act="cp-records-status-filter" aria-label="Filter by status">
                  <option value="">All statuses</option>
                  <option value="Accept All" ${statusFilter === 'Accept All' ? 'selected' : ''}>Accept All</option>
                  <option value="Reject All" ${statusFilter === 'Reject All' ? 'selected' : ''}>Reject All</option>
                  <option value="Partial Consent" ${statusFilter === 'Partial Consent' ? 'selected' : ''}>Partial Consent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View with Sticky Header and Horizontal Scroll -->
        <div class="tw tw-sticky cp-table-wrap">
          <table class="t cp-records-table">
            <colgroup>
              <col style="width: 10%; min-width: 100px;" />
              <col style="width: 9%; min-width: 90px;" />
              <col style="width: 13%; min-width: 120px;" />
              <col style="width: 16%; min-width: 150px;" />
              <col style="width: 13%; min-width: 135px;" />
              <col style="width: 13%; min-width: 130px;" />
              <col style="width: 9%; min-width: 85px;" />
              <col style="width: 5%; min-width: 55px;" />
              <col style="width: 12%; min-width: 115px;" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Owner</th>
                ${sortButton('name', 'Name')}
                ${sortButton('email', 'Email')}
                <th scope="col">Aadhaar</th>
                ${sortButton('status', 'Status')}
                <th scope="col">Country</th>
                <th scope="col" style="text-align:center">Verified</th>
                ${sortButton('created', 'Created Date')}
              </tr>
            </thead>
            <tbody>
              ${paginated.length ? paginated.map(r => {
                const bCls = r.status === 'Accept All' ? 'b-Accept' : r.status === 'Reject All' ? 'b-Reject' : 'b-Partial';
                return `
                  <tr>
                    <td>
                      <div class="cp-cell-id">
                        <a
                          href="javascript:void(0)"
                          data-act="cp-view-record"
                          data-arg="${safe(r.id)}"
                          class="cp-id-link"
                          title="View consent receipt ${safe(r.id)}"
                        >
                          ${safe(r.id)}
                        </a>
                      </div>
                    </td>
                    <td>
                      <span class="cp-cell-mono dim">${safe(r.owner)}</span>
                    </td>
                    <td>
                      <div class="cp-cell-truncate cp-cell-name" title="${safe(r.first)} ${safe(r.last)}">
                        ${safe(r.first)} ${safe(r.last)}
                      </div>
                    </td>
                    <td>
                      <div class="cp-cell-truncate cp-cell-email" title="${safe(r.email)}">
                        ${safe(r.email)}
                      </div>
                    </td>
                    <td>
                      ${r.aadhaar ? `<span class="cp-cell-mono" title="Masked Aadhaar number">${safe(r.aadhaar)}</span>` : '<span class="dim">—</span>'}
                    </td>
                    <td>
                      <div class="cp-cell-status-wrap">
                        <span class="cp-badge ${bCls}">${safe(r.status)}</span>
                        ${r.withdrawn ? '<span class="cp-badge b-Withdrawn">Withdrawn</span>' : ''}
                        ${r.expired ? '<span class="cp-badge b-Expired">Expired</span>' : ''}
                      </div>
                    </td>
                    <td>
                      <span class="cp-cell-truncate cp-cell-country" title="${safe(r.country || '—')}">
                        ${safe(r.country || '—')}
                      </span>
                    </td>
                    <td style="text-align:center">
                      <span class="cp-verified-badge ${r.verified ? 'is-verified' : 'is-unverified'}" title="${r.verified ? 'Identity Verified' : 'Unverified'}">
                        ${r.verified ? '✓' : '—'}
                      </span>
                    </td>
                    <td>
                      <span class="cp-cell-mono dim">${safe(formatDate(r.created))}</span>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="9" class="table-empty-cell">
                    <div class="table-empty-state">
                      <div class="table-empty-icon">🔍</div>
                      <h4 class="table-empty-title">No matching consent records</h4>
                      <p class="table-empty-desc">
                        ${query || statusFilter || rangeDays < 9999
                          ? 'No records found matching your active filters. Try adjusting your search keywords or resetting filters.'
                          : 'No consent records have been recorded yet.'}
                      </p>
                      ${query || statusFilter || rangeDays < 9999 ? `
                        <button type="button" class="btn sm o table-empty-reset" data-act="cp-records-reset-filters">
                          Reset Filters
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Table Pagination Footer -->
        <div class="table-pagination-bar cp-records-pagination">
          <div class="table-pagination-info">
            Showing <b>${totalRecords ? startIndex + 1 : 0}–${Math.min(startIndex + pageSize, totalRecords)}</b> of <b>${totalRecords.toLocaleString()}</b> entries
          </div>

          <div class="table-pagination-controls">
            <div class="table-page-size-selector">
              <span class="page-size-label">Per page:</span>
              <select class="table-page-size-select" data-act="cp-records-page-size" aria-label="Select items per page">
                ${[5, 10, 25, 50].map(n => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>

            <div class="table-pagination-nav" role="navigation" aria-label="Consent records pagination">
              <button
                type="button"
                class="pg-btn pg-prev"
                data-act="cp-records-page"
                data-arg="${Math.max(1, currentPage - 1)}"
                ${currentPage <= 1 ? 'disabled aria-disabled="true"' : ''}
                title="Previous page"
                aria-label="Previous page"
              >
                ‹ Prev
              </button>

              <div class="pg-numbers">
                ${pageButtons.join('')}
              </div>

              <button
                type="button"
                class="pg-btn pg-next"
                data-act="cp-records-page"
                data-arg="${Math.min(totalPages, currentPage + 1)}"
                ${currentPage >= totalPages ? 'disabled aria-disabled="true"' : ''}
                title="Next page"
                aria-label="Next page"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  };
}
