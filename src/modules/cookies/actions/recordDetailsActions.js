export function registerActions(context, ACT) {
  const { state, runtime, safe, dateLabel } = context;

  ACT["cc-consent-record-details"] = index => {
    const record = state.consentRecords.slice(0, 15)[Number(index)];
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
