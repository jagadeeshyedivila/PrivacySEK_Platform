import { CONNECTOR_CATALOG, canPerform, getUserRole, connectorBadge, connectorLogoKey } from "../discoveryConfig.js";

export function registerConnectionActions(context, ACT) {
  const { $, D, closeOv, esc, ledgerAdd, modal, nowT, render, toast, ui } = context;

  ACT["dd-set-conn-subtab"] = function(tab) {
    ui.connSubTab = tab;
    render();
  };

  ACT["dd-conn-search"] = function(val) {
    ui.connSearch = val || "";
    render();
  };

  ACT["dd-conn-clear-search"] = function() {
    ui.connSearch = "";
    render();
  };

  ACT["dd-open-catalog"] = function() {
    ui.connView = "cat";
    ui.connSubTab = "conn";
    ui.connCatSearch = "";
    // The header button works from any tab: switch to Connections first, then show the catalogue
    if (context.S && context.S.tab) context.S.tab.discovery = "connections";
    render();
    const content = document.getElementById("content");
    if (content) content.scrollTop = 0;
  };

  ACT["dd-conn-view-list"] = function() {
    ui.connView = "list";
    ui.connSearch = "";
    render();
  };

  ACT["dd-set-conn-cat-type"] = function(type) {
    ui.connCatType = type;
    render();
  };

  ACT["dd-conn-cat-search"] = function(val) {
    ui.connCatSearch = val || "";
    render();
  };

  ACT["dd-conn-cat-clear-search"] = function() {
    ui.connCatSearch = "";
    render();
  };

  ACT["dd-set-conn-cat-group"] = function(group) {
    ui.connCatGroup = group || "all";
    render();
  };

  ACT["dd-conn-cat-reset"] = function() {
    ui.connCatSearch = "";
    ui.connCatGroup = "all";
    render();
  };

  ACT["dd-request-connector"] = function() {
    const wanted = (ui.connCatSearch || "").trim();
    ledgerAdd("Connector requested", wanted ? `Data Discovery · ${wanted}` : "Data Discovery · unspecified source");
    toast(wanted ? `Request logged for a "${wanted}" connector` : "Connector request logged. The product team will follow up.");
  };

  // Render connection form modal (Add or Edit)
  function showConnectionFormModal(existingId, connectorName, kind = "S") {
    const store = context.getStore();
    const conn = existingId ? store.connections.find(c => c.id === existingId) : null;
    const catEntry = !conn ? [...CONNECTOR_CATALOG.S, ...CONNECTOR_CATALOG.U].find(c => c.name === connectorName) : null;
    const isStructured = conn ? conn.kind === "S" : (catEntry ? CONNECTOR_CATALOG.S.some(x => x.name === catEntry.name) : kind === "S");
    const sysType = conn ? conn.type.toUpperCase() : (catEntry?.sys || "DATABASE");
    const defaultPort = catEntry?.port || (isStructured ? 5432 : 443);
    const f = conn?.fields || {};

    const role = getUserRole(D);
    const isReadOnly = !canPerform(role, conn ? "edit" : "create");

    const modalTitle = conn ? `Edit Connection: ${esc(conn.name)}` : `Add ${esc(connectorName || 'Data')} Connection`;

    const logoKey = conn ? connectorLogoKey(conn.type) : catEntry?.logo;
    const bodyHtml = `
      <div class="dd-conn-modal-brand">
        ${connectorBadge(esc, conn?.name || connectorName || "Data", logoKey, "lg")}
        <div>
          <b>${esc(catEntry?.name || (conn ? conn.type.toUpperCase() : connectorName || "Data source"))}</b>
          <small>${esc(catEntry?.group || (isStructured ? "Structured data source" : "Unstructured data source"))} · ${esc(sysType)}</small>
        </div>
      </div>
      <div id="dd-conn-form-errors" class="dd-form-error" style="margin-bottom:12px"></div>

      <div class="dd-form-group">
        <label class="dd-form-label required" for="dd_cf_name">Connection Name</label>
        <input
          id="dd_cf_name"
          class="dd-form-input"
          type="text"
          value="${esc(conn?.name || '')}"
          placeholder="e.g. core-banking-db"
          ${isReadOnly ? 'disabled' : ''}
        />
        <div class="dd-form-hint">Unique identifier for this data connection within PrivacySEK.</div>
      </div>

      <div class="dd-form-group">
        <label class="dd-form-label" for="dd_cf_desc">Description</label>
        <textarea
          id="dd_cf_desc"
          class="dd-form-textarea"
          rows="2"
          placeholder="Purpose and business context of this data source"
          ${isReadOnly ? 'disabled' : ''}
        >${esc(conn?.desc || '')}</textarea>
      </div>

      <div class="dd-form-group">
        <label class="dd-form-label">System Type</label>
        <input class="dd-form-input" value="${esc(sysType)}" disabled style="background:var(--surface-2)" />
      </div>

      ${isStructured ? `
        <div class="dd-grid-2">
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_host">Database Host</label>
            <input id="dd_cf_host" class="dd-form-input" type="text" value="${esc(f.host || '')}" placeholder="db.internal.aarohan.fin" ${isReadOnly ? 'disabled' : ''} />
          </div>
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_port">Port</label>
            <input id="dd_cf_port" class="dd-form-input" type="number" value="${esc(f.port || defaultPort)}" ${isReadOnly ? 'disabled' : ''} />
          </div>
        </div>

        <div class="dd-form-group">
          <label class="dd-form-label required" for="dd_cf_db">Database Name / Service</label>
          <input id="dd_cf_db" class="dd-form-input" type="text" value="${esc(f.db || '')}" placeholder="production_db" ${isReadOnly ? 'disabled' : ''} />
        </div>

        <div class="dd-grid-2">
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_user">Username</label>
            <input id="dd_cf_user" class="dd-form-input" type="text" value="${esc(f.user || '')}" placeholder="psek_reader" ${isReadOnly ? 'disabled' : ''} />
          </div>
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_pw">Password</label>
            <input id="dd_cf_pw" class="dd-form-input" type="password" value="${f.pw ? '••••••••' : ''}" placeholder="••••••••" ${isReadOnly ? 'disabled' : ''} />
          </div>
        </div>
      ` : `
        <div class="dd-grid-2">
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_tenant">Tenant ID / Account</label>
            <input id="dd_cf_tenant" class="dd-form-input" type="text" value="${esc(f.tenant || '')}" placeholder="e.g. af-kyc-documents" ${isReadOnly ? 'disabled' : ''} />
          </div>
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_group">Group / Bucket Name</label>
            <input id="dd_cf_group" class="dd-form-input" type="text" value="${esc(f.group || '')}" placeholder="e.g. production-storage" ${isReadOnly ? 'disabled' : ''} />
          </div>
        </div>

        <div class="dd-grid-2">
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_client">Client / Access Key ID</label>
            <input id="dd_cf_client" class="dd-form-input" type="text" value="${esc(f.client || '')}" placeholder="e.g. AKIA_EXAMPLE_KEY" ${isReadOnly ? 'disabled' : ''} />
          </div>
          <div class="dd-form-group">
            <label class="dd-form-label required" for="dd_cf_secret">Client Secret</label>
            <input id="dd_cf_secret" class="dd-form-input" type="password" value="${f.secret ? '••••••••' : ''}" placeholder="••••••••" ${isReadOnly ? 'disabled' : ''} />
          </div>
        </div>
      `}

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <button class="btn sm o" data-act="dd-test-conn" type="button">
          ⚡ Test Connection
        </button>
        <span id="dd-test-result" style="font-size:12px;color:var(--text-3);flex:1;text-align:right"></span>
      </div>
    `;

    const footHtml = `
      <button class="btn sm o" data-act="close">Cancel</button>
      <button
        class="btn sm p"
        ${isReadOnly ? 'disabled title="Your role cannot save changes"' : ''}
        data-act="dd-save-conn"
        data-arg="${esc(existingId || '')}|${isStructured ? 'S' : 'U'}|${esc(sysType.toLowerCase())}"
      >
        ${conn ? 'Update Connection' : 'Save Connection'}
      </button>
    `;

    modal(modalTitle, "Scoped read-only credential vault configuration", bodyHtml, footHtml, "modal-wide");
  }

  ACT["dd-open-add-conn-modal"] = function(arg) {
    const [name, kind] = (arg || "").split("|");
    showConnectionFormModal(null, name, kind);
  };

  ACT["dd-open-edit-conn-modal"] = function(id) {
    showConnectionFormModal(id, null);
  };

  ACT["dd-test-conn"] = function() {
    const resultEl = $("#dd-test-result");
    const errEl = $("#dd-conn-form-errors");
    if (!resultEl) return;

    const name = ($("#dd_cf_name")?.value || "").trim();
    if (!name) {
      if (errEl) errEl.textContent = "Please provide a Connection Name before testing.";
      return;
    }
    if (errEl) errEl.textContent = "";

    resultEl.innerHTML = `<span class="pill info" style="font-size:11px">Testing connectivity…</span>`;
    setTimeout(() => {
      const el = $("#dd-test-result");
      if (el) {
        el.innerHTML = `<span class="pill ok" style="font-size:11px">✔ Connection successful (read-only probe verified)</span>`;
      }
    }, 700);
  };

  ACT["dd-save-conn"] = function(arg) {
    const [id, kind, type] = (arg || "").split("|");
    const errEl = $("#dd-conn-form-errors");

    const name = ($("#dd_cf_name")?.value || "").trim();
    const desc = ($("#dd_cf_desc")?.value || "").trim();

    if (!name) {
      if (errEl) errEl.textContent = "Connection Name is required.";
      return;
    }

    const store = context.getStore();
    const isStructured = kind === "S";

    let fields = {};
    if (isStructured) {
      const host = ($("#dd_cf_host")?.value || "").trim();
      const port = Number($("#dd_cf_port")?.value) || 5432;
      const db = ($("#dd_cf_db")?.value || "").trim();
      const user = ($("#dd_cf_user")?.value || "").trim();
      const pw = ($("#dd_cf_pw")?.value || "").trim();

      if (!host || !db || !user) {
        if (errEl) errEl.textContent = "Please fill all required connection host and database fields.";
        return;
      }
      fields = { host, port, db, user, pw: pw || "••••••••" };
    } else {
      const tenant = ($("#dd_cf_tenant")?.value || "").trim();
      const group = ($("#dd_cf_group")?.value || "").trim();
      const client = ($("#dd_cf_client")?.value || "").trim();
      const secret = ($("#dd_cf_secret")?.value || "").trim();

      if (!tenant || !group || !client) {
        if (errEl) errEl.textContent = "Please fill all required cloud tenant and credential fields.";
        return;
      }
      fields = { tenant, group, client, secret: secret || "••••••••" };
    }

    if (id) {
      const existing = store.connections.find(c => c.id === id);
      if (existing) {
        existing.name = name;
        existing.desc = desc;
        existing.updated = nowT();
        existing.fields = fields;
      }
      toast(`Connection "${name}" updated successfully`);
      ledgerAdd("Connection updated", `${name} (${type})`);
    } else {
      const newConn = {
        id: `c-${Date.now()}`,
        name,
        type,
        kind,
        desc,
        status: "ok",
        created: nowT(),
        updated: nowT(),
        failed: 0,
        lastScanned: null, // added in the demo: first Run scan reports its findings as new
        fields,
        tables: isStructured ? [
          {
            name: `${name.replace(/-/g, '_')}_master`,
            cols: [
              { col: "record_id", cat: "Online Identifiers", cl: "Record Identifier", rk: "L" },
              { col: "customer_name", cat: "Demographic Information", cl: "Full Name", rk: "H" },
              { col: "contact_email", cat: "Contact Information", cl: "Email Address", rk: "H" }
            ]
          }
        ] : []
      };
      store.connections.unshift(newConn);
      toast(`Connection "${name}" added successfully`);
      ledgerAdd("Connection registered", `${name} (${type})`);
    }

    context.saveStore(store);
    closeOv();
    ui.connView = "list";
    render();
  };

  ACT["dd-confirm-delete-conn"] = function(id) {
    const store = context.getStore();
    const conn = store.connections.find(c => c.id === id);
    if (!conn) return;

    modal(
      "Delete Connection?",
      "Irreversible data source removal",
      `
        <p style="color:var(--text);font-size:13.5px;margin-bottom:8px">
          Are you sure you want to delete <b>“${esc(conn.name)}”</b>?
        </p>
        <p class="dim" style="font-size:12.5px;line-height:1.5">
          Its associated cataloged schema, ${conn.tables?.length || 0} tables, and all classified column findings will be removed from future discovery reports.
        </p>
      `,
      `
        <button class="btn sm o" data-act="close">Cancel</button>
        <button class="btn sm" style="background:var(--block);color:#fff" data-act="dd-delete-conn" data-arg="${esc(id)}">
          Confirm Delete
        </button>
      `
    );
  };

  ACT["dd-delete-conn"] = function(id) {
    const store = context.getStore();
    const conn = store.connections.find(c => c.id === id);
    const connName = conn?.name || id;

    store.connections = store.connections.filter(c => c.id !== id);
    context.saveStore(store);
    closeOv();
    toast(`Connection "${connName}" deleted`);
    ledgerAdd("Connection deleted", connName);
    render();
  };
}
