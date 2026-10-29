export function registerActions(context, ACT) {
  const { state, runtime, ui, safe, dateLabel, cookieApi } = context;

  const reloadRecords = async () => {
    try {
      ui.recordsLoading = true;
      runtime.render();

      const res = await cookieApi.getRecords({
        page: ui.recordsPage || 1,
        pageSize: ui.recordsPageSize || 25,
        search: ui.recordsSearch || "",
        region: ui.recordsRegion || "all",
        action: ui.recordsAction || "all",
        sortBy: ui.recordsSortBy || "timestamp",
        sortOrder: ui.recordsSortOrder || "desc",
      });

      if (res && res.records) {
        state.paginatedConsentRecords = res.records;
        ui.recordsTotal = res.total;
        if (res.pagination) {
          ui.recordsPage = res.pagination.page;
          ui.recordsPageSize = res.pagination.pageSize;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch paginated consent records from server:", err.message);
    } finally {
      ui.recordsLoading = false;
      runtime.render();
    }
  };

  // Pagination & Filter Actions for Consent Records
  let recordSearchTimer = null;
  ACT["cc-records-search"] = q => {
    ui.recordsSearch = q;
    ui.recordsPage = 1;
    clearTimeout(recordSearchTimer);
    recordSearchTimer = setTimeout(() => {
      reloadRecords();
    }, 250);
  };
  ACT["cc-records-clear-search"] = () => {
    ui.recordsSearch = "";
    ui.recordsPage = 1;
    reloadRecords();
  };
  ACT["cc-records-filter-region"] = reg => {
    ui.recordsRegion = reg;
    ui.recordsPage = 1;
    reloadRecords();
  };
  ACT["cc-records-filter-action"] = actName => {
    ui.recordsAction = actName;
    ui.recordsPage = 1;
    reloadRecords();
  };
  ACT["cc-records-sort"] = col => {
    if (ui.recordsSortBy === col) {
      ui.recordsSortOrder = ui.recordsSortOrder === "asc" ? "desc" : "asc";
    } else {
      ui.recordsSortBy = col;
      ui.recordsSortOrder = "desc";
    }
    ui.recordsPage = 1;
    reloadRecords();
  };
  ACT["cc-records-page"] = p => {
    ui.recordsPage = Math.max(1, Number(p) || 1);
    reloadRecords();
  };
  ACT["cc-records-page-size"] = s => {
    ui.recordsPageSize = Math.max(1, Number(s) || 25);
    ui.recordsPage = 1;
    reloadRecords();
  };
  ACT["cc-records-reset-filters"] = () => {
    ui.recordsSearch = "";
    ui.recordsRegion = "all";
    ui.recordsAction = "all";
    ui.recordsPage = 1;
    reloadRecords();
  };

  ACT["cc-consent-record-details"] = indexOrId => {
    const recordsPool = state.paginatedConsentRecords || state.consentRecords || [];
    const record = recordsPool.find(r => r.id === indexOrId)
      || recordsPool[Number(indexOrId)]
      || (state.consentRecords || []).slice(0, 15)[Number(indexOrId)];

    if (!record) {
      runtime.toast("This consent record is no longer available");
      return;
    }

    const categories = state.categories.map(category => ({
      name: category.name,
      allowed: Boolean(record.categories?.[category.id]),
      required: category.required,
    })).filter(category => category.allowed || category.required);
    const additionalFields = [
      ["Authorization ID", record.authId],
      ["Device ID", record.deviceId],
      ["IP address", record.ipAddress],
      ["Operating system", record.os],
      ["Consent language", record.language || record.consentLanguage],
      ["Consent string", record.consentString || record.consent],
    ].filter(([, value]) => value !== undefined && value !== null && value !== "");

    const detailRows = [
      ["Receipt ID", record.id],
      ["Banner / consent action", record.action],
      ["Recorded outcome", record.result],
      ["Consent date", dateLabel(record.timestamp)],
      ["Property", record.property],
      ["Region", record.region],
      ["Device", record.device],
      ["Consent version", record.version],
      ["Source", record.source],
    ].filter(([, value]) => value !== undefined && value !== null && value !== "");

    const details = detailRows.map(([label, value]) => `
      <div class="cc-record-detail-field">
        <dt>${safe(label)}</dt>
        <dd>${safe(value)}</dd>
      </div>
    `).join("");
    const consentRows = state.categories.map(category => {
      const selected = Boolean(record.categories?.[category.id]);
      return `
        <div class="cc-record-consent-row">
          <span>${safe(category.name)}</span>
          <strong class="${selected ? "allowed" : "not-allowed"}">${selected ? "Allowed" : category.required ? "Required" : "Not allowed"}</strong>
        </div>
      `;
    }).join("");
    const extraRows = additionalFields.map(([label, value]) => `
      <div class="cc-record-detail-field">
        <dt>${safe(label)}</dt>
        <dd class="cc-record-detail-long">${safe(value)}</dd>
      </div>
    `).join("");
    const body = `
      <div class="cc-record-detail">
        <section class="cc-record-detail-section">
          <h3>Consent Information</h3>
          <dl class="cc-record-detail-grid">${details}</dl>
        </section>
        <section class="cc-record-detail-section">
          <h3>Purpose Consent</h3>
          <div class="cc-record-consent-list">${consentRows}</div>
        </section>
        <section class="cc-record-detail-section">
          <h3>Additional Record Data</h3>
          ${extraRows
            ? `<dl class="cc-record-detail-grid">${extraRows}</dl>`
            : `<p class="cc-record-detail-note">This receipt does not contain a consent string, vendor list, authorization ID, IP address, or device identifier.</p>`}
        </section>
      </div>
    `;

    runtime.drawer("Consent Details", `Receipt ${safe(record.id)}`, body, `<button class="btn" data-act="close">Close</button>`, true);
  };
}
