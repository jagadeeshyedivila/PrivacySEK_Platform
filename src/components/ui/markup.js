export function createMarkupHelpers({ S, esc, I }) {
  function pill(k, t){ return '<span class="v '+k+'">'+esc(t)+'</span>'; }
  function tag(t, k){ return '<span class="tag '+(k||"")+'">'+esc(t)+'</span>'; }
  function bar(v, k){ return '<div class="pb"><div class="bar '+(k||"")+'"><span style="width:'+v+'%"></span></div><span class="mono">'+v+'%</span></div>'; }
  function card(title, body, right, nopad){ return '<section class="card">'+(title?'<div class="card-h"><h3>'+title+'</h3><div class="r">'+(right||"")+'</div></div>':"")+(nopad?body:'<div class="card-b">'+body+'</div>')+'</section>'; }
  function kpi(label, val, sub, color){ return '<div class="card kpi" style="--k:'+(color||"transparent")+'"><small>'+label+'</small><b>'+val+'</b><span>'+sub+'</span></div>'; }

  function copyButton(text, label = "Copy to clipboard", cls = "") {
    const copyIcon = I?.clip || '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    return `<button class="btn-copy ${cls}" data-act="copy" data-arg="${esc(text)}" title="${esc(label)}" aria-label="${esc(label)}">${copyIcon}</button>`;
  }

  function tableEmptyState({ title = "No matching records found", description = "Try adjusting your search keywords or clearing active filters.", resetAct = null, resetText = "Reset Filters", icon = null }) {
    const displayIcon = icon || I?.search || '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    return `
      <div class="table-empty-state">
        <div class="table-empty-icon">${displayIcon}</div>
        <h4 class="table-empty-title">${esc(title)}</h4>
        <p class="table-empty-desc">${esc(description)}</p>
        ${resetAct ? `<button class="btn sm t table-empty-reset" data-act="${esc(resetAct)}">${esc(resetText)}</button>` : ""}
      </div>
    `;
  }

  function tableSkeleton(cols, rowCount = 5) {
    const colCount = Array.isArray(cols) ? cols.length : 5;
    let rowsHtml = '';
    for (let r = 0; r < rowCount; r++) {
      rowsHtml += '<tr class="skeleton-row">';
      for (let c = 0; c < colCount; c++) {
        const widths = [60, 80, 45, 70, 90, 50, 35];
        const w = widths[(r + c) % widths.length];
        rowsHtml += `<td><div class="skeleton-shimmer" style="width:${w}%;height:14px;border-radius:4px;"></div></td>`;
      }
      rowsHtml += '</tr>';
    }
    return rowsHtml;
  }

  function table(cols, rows, actOrOptions) {
    const isOpts = actOrOptions && typeof actOrOptions === "object";
    const act = isOpts ? actOrOptions.act : actOrOptions;
    const tableId = isOpts ? actOrOptions.id : null;
    const stickyHeader = isOpts && actOrOptions.stickyHeader;
    const maxHeight = isOpts && actOrOptions.maxHeight;
    const sortField = isOpts ? actOrOptions.sortField : null;
    const sortDir = isOpts ? actOrOptions.sortDir : 'desc';
    const sortAct = isOpts ? actOrOptions.sortAct : null;
    const loading = isOpts && actOrOptions.loading;
    const emptyText = isOpts && actOrOptions.emptyText ? actOrOptions.emptyText : "No records to display";
    const emptyResetAct = isOpts ? actOrOptions.emptyResetAct : null;
    const className = (isOpts && actOrOptions.className) ? actOrOptions.className : "";
    const colgroup = (isOpts && actOrOptions.colgroup) ? actOrOptions.colgroup : null;

    // Normalize column headers
    const normalizedCols = cols.map((col, idx) => {
      if (typeof col === "object" && col !== null) {
        return {
          key: col.key || `col_${idx}`,
          label: col.label || "",
          width: col.width || null,
          align: col.align || "left",
          sortable: Boolean(col.sortable),
          className: col.className || "",
        };
      }
      return {
        key: `col_${idx}`,
        label: String(col),
        width: null,
        align: "left",
        sortable: false,
        className: "",
      };
    });

    const theadHtml = normalizedCols.map((c) => {
      const isCurrentSort = sortField && c.key === sortField;
      const alignCls = c.align === "right" ? " text-right" : c.align === "center" ? " text-center" : "";
      const customCls = c.className ? ` ${c.className}` : "";

      if (c.sortable && sortAct) {
        const nextDir = isCurrentSort && sortDir === 'asc' ? 'desc' : 'asc';
        const indicator = isCurrentSort
          ? (sortDir === 'asc' ? ' <span class="sort-indicator asc" aria-hidden="true">▲</span>' : ' <span class="sort-indicator desc" aria-hidden="true">▼</span>')
          : ' <span class="sort-indicator neutral" aria-hidden="true">↕</span>';

        return `<th class="th-sortable${isCurrentSort ? ' is-sorted' : ''}${alignCls}${customCls}" data-act="${sortAct}" data-arg="${esc(c.key)}" data-sort-dir="${nextDir}" scope="col" aria-sort="${isCurrentSort ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}" style="${c.width ? `width:${c.width};` : ''}">
          <button type="button" class="th-sort-btn">${c.label}${indicator}</button>
        </th>`;
      }

      return `<th class="${alignCls}${customCls}" scope="col" style="${c.width ? `width:${c.width};` : ''}">${c.label}</th>`;
    }).join("");

    let colgroupHtml = "";
    if (colgroup) {
      colgroupHtml = colgroup;
    } else if (normalizedCols.some(c => c.width)) {
      colgroupHtml = `<colgroup>${normalizedCols.map(c => `<col${c.width ? ` style="width:${c.width};"` : ''}>`).join("")}</colgroup>`;
    }

    let tbodyHtml = "";
    if (loading) {
      tbodyHtml = tableSkeleton(cols, 5);
    } else if (!rows || rows.length === 0) {
      tbodyHtml = `<tr><td colspan="${normalizedCols.length}" class="table-empty-cell">${tableEmptyState({ title: emptyText, resetAct: emptyResetAct })}</td></tr>`;
    } else {
      tbodyHtml = rows.map(function(r, i){
        const rowClass = act ? ' class="click"' : '';
        const rowActAttr = act ? ` data-act="${esc(act)}" data-arg="${i}"` : '';
        const cells = r.map(function(c, cellIdx){
          const colDef = normalizedCols[cellIdx];
          const alignCls = colDef && colDef.align === "right" ? ' class="text-right"' : colDef && colDef.align === "center" ? ' class="text-center"' : '';
          return `<td${alignCls}>${c}</td>`;
        }).join("");
        return `<tr${rowClass}${rowActAttr}>${cells}</tr>`;
      }).join("");
    }

    const wrapperStyles = [
      maxHeight ? `max-height:${maxHeight};overflow-y:auto;` : "",
    ].filter(Boolean).join("");

    return `
      <div class="tw${stickyHeader ? ' tw-sticky' : ''}"${wrapperStyles ? ` style="${wrapperStyles}"` : ''}${tableId ? ` id="${tableId}-wrap"` : ''}>
        <table class="t ${className}"${tableId ? ` id="${tableId}"` : ''}>
          ${colgroupHtml}
          <thead><tr>${theadHtml}</tr></thead>
          <tbody>${tbodyHtml}</tbody>
        </table>
      </div>
    `;
  }

  function tableToolbar({
    title = "",
    description = "",
    badge = "",
    search = null,
    filters = [],
    actions = [],
    paginationSummary = "",
  }) {
    const hasHeader = title || description || badge;
    const hasControls = search || (filters && filters.length) || (actions && actions.length) || paginationSummary;

    if (!hasHeader && !hasControls) return "";

    return `
      <div class="table-toolbar">
        ${hasHeader ? `
          <div class="table-toolbar-header">
            <div class="table-toolbar-title-wrap">
              ${title ? `<h3 class="table-toolbar-title">${title}</h3>` : ""}
              ${badge ? `<span class="table-toolbar-badge">${badge}</span>` : ""}
            </div>
            ${description ? `<p class="table-toolbar-desc">${description}</p>` : ""}
          </div>
        ` : ""}
        ${hasControls ? `
          <div class="table-toolbar-controls">
            ${search ? `
              <div class="table-toolbar-search">
                <span class="table-search-icon">${I?.search || '🔍'}</span>
                <input
                  type="search"
                  class="table-search-input"
                  placeholder="${esc(search.placeholder || 'Search records...')}"
                  value="${esc(search.value || '')}"
                  data-input-act="${esc(search.inputAct || 'table-search')}"
                  ${search.table ? `data-table="${esc(search.table)}"` : ''}
                  aria-label="${esc(search.placeholder || 'Search records')}"
                />
                ${search.value ? `
                  <button type="button" class="table-search-clear" data-act="${esc(search.clearAct || 'table-clear-search')}" ${search.table ? `data-table="${esc(search.table)}"` : ''} title="Clear search" aria-label="Clear search">×</button>
                ` : ''}
              </div>
            ` : ""}
            ${filters && filters.length ? filters.map(f => `
              <div class="table-toolbar-filter">
                ${f.label ? `<label class="table-filter-label" for="${esc(f.id || '')}">${esc(f.label)}</label>` : ''}
                <select
                  class="table-filter-select"
                  ${f.id ? `id="${esc(f.id)}"` : ''}
                  data-act="${esc(f.act || 'table-filter')}"
                  ${f.arg ? `data-arg="${esc(f.arg)}"` : ''}
                  ${f.table ? `data-table="${esc(f.table)}"` : ''}
                  aria-label="${esc(f.label || 'Filter')}"
                >
                  ${f.options.map(opt => `
                    <option value="${esc(opt.value)}" ${opt.value === f.value ? 'selected' : ''}>${esc(opt.label)}</option>
                  `).join('')}
                </select>
              </div>
            `).join('') : ''}
            ${actions && actions.length ? `
              <div class="table-toolbar-actions">
                ${actions.join('')}
              </div>
            ` : ''}
            ${paginationSummary ? `
              <div class="table-toolbar-summary">${paginationSummary}</div>
            ` : ''}
          </div>
        ` : ""}
      </div>
    `;
  }

  function tablePagination(pagination, options = {}) {
    if (!pagination) return "";
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize || pagination.limit) || 10;
    const totalRecords = Number(pagination.totalRecords ?? pagination.total) || 0;
    const totalPages = Math.max(1, Number(pagination.totalPages) || Math.ceil(totalRecords / pageSize) || 1);

    const pageAct = options.pageAct || "table-page";
    const sizeAct = options.sizeAct || "table-page-size";
    const tableId = options.table || "";

    const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(totalRecords, page * pageSize);
    const summaryText = `Showing <b>${start}–${end}</b> of <b>${totalRecords.toLocaleString()}</b> ${options.unit || "records"}`;

    const sizes = options.sizes || [10, 25, 50, 100];

    // Compute window of page numbers
    const pageButtons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      pageButtons.push(`<button type="button" class="pg-num" data-act="${pageAct}" data-page="1" ${tableId ? `data-table="${tableId}"` : ''} aria-label="Page 1">1</button>`);
      if (startPage > 2) {
        pageButtons.push('<span class="pg-ellipsis" aria-hidden="true">…</span>');
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const isCur = p === page;
      pageButtons.push(`
        <button type="button" class="pg-num${isCur ? ' is-active' : ''}" data-act="${pageAct}" data-page="${p}" ${tableId ? `data-table="${tableId}"` : ''} aria-current="${isCur ? 'page' : 'false'}" aria-label="Page ${p}">
          ${p}
        </button>
      `);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageButtons.push('<span class="pg-ellipsis" aria-hidden="true">…</span>');
      }
      pageButtons.push(`<button type="button" class="pg-num" data-act="${pageAct}" data-page="${totalPages}" ${tableId ? `data-table="${tableId}"` : ''} aria-label="Page ${totalPages}">${totalPages}</button>`);
    }

    return `
      <div class="table-pagination-bar" ${tableId ? `data-table-pagination="${tableId}"` : ''}>
        <div class="table-pagination-info">${summaryText}</div>
        <div class="table-pagination-controls">
          <div class="table-page-size-selector">
            <span class="page-size-label">Per page:</span>
            <select class="table-page-size-select" data-act="${sizeAct}" ${tableId ? `data-table="${tableId}"` : ''} aria-label="Select items per page">
              ${sizes.map(s => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="table-pagination-nav" role="navigation" aria-label="Table pagination">
            <button type="button" class="pg-btn pg-first" data-act="${pageAct}" data-page="1" ${tableId ? `data-table="${tableId}"` : ''} ${page <= 1 ? 'disabled aria-disabled="true"' : ''} title="First page" aria-label="First page">
              «
            </button>
            <button type="button" class="pg-btn pg-prev" data-act="${pageAct}" data-page="${Math.max(1, page - 1)}" ${tableId ? `data-table="${tableId}"` : ''} ${page <= 1 ? 'disabled aria-disabled="true"' : ''} title="Previous page" aria-label="Previous page">
              ‹ Prev
            </button>
            <div class="pg-numbers">
              ${pageButtons.join('')}
            </div>
            <button type="button" class="pg-btn pg-next" data-act="${pageAct}" data-page="${Math.min(totalPages, page + 1)}" ${tableId ? `data-table="${tableId}"` : ''} ${page >= totalPages ? 'disabled aria-disabled="true"' : ''} title="Next page" aria-label="Next page">
              Next ›
            </button>
            <button type="button" class="pg-btn pg-last" data-act="${pageAct}" data-page="${totalPages}" ${tableId ? `data-table="${tableId}"` : ''} ${page >= totalPages ? 'disabled aria-disabled="true"' : ''} title="Last page" aria-label="Last page">
              »
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function tabs(view, list){ var cur = S.tab[view] || list[0][0];
    return '<div class="tabs" role="tablist">'+list.map(function(t){ return '<button role="tab" aria-selected="'+(t[0]===cur)+'" data-act="tab" data-arg="'+view+'|'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>'; }
  function curTab(view, def){ return S.tab[view] || def; }
  function head(eyebrow, h, p, acts){ return '<div class="ph"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+h+'</h1>'+(p?'<p>'+p+'</p>':'')+'</div><div class="acts">'+(acts||"")+'</div></div>'; }
  function btn(t, act, arg, cls, ic){ return '<button class="btn '+(cls||"")+'" data-act="'+act+'"'+(arg!=null?' data-arg="'+esc(arg)+'"':'')+'>'+(ic?I[ic]:"")+t+'</button>'; }
  function stl(st){ return {ok:"ok",risk:"risk",act:"act"}[st]||"n"; }
  return { pill, tag, bar, card, kpi, table, tableToolbar, tablePagination, tableEmptyState, tableSkeleton, copyButton, tabs, curTab, head, btn, stl };
}
