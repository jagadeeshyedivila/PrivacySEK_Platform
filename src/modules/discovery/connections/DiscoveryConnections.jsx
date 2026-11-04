import { CONNECTOR_CATALOG, canPerform, getUserRole, connectorBadge, connectorLogoKey } from "../discoveryConfig.js";

export function createConnectionsRenderer(context) {
  const { D, I, esc, pill, ui } = context;

  return function renderDiscoveryConnections() {
    const data = context.getStore();
    const connections = data.connections || [];
    const pods = data.pods || [];
    const role = getUserRole(D);
    const canCreate = canPerform(role, "create");
    const canEdit = canPerform(role, "edit");
    const canDelete = canPerform(role, "delete");

    const subTab = ui.connSubTab || "conn";
    const connView = ui.connView || "list";

    // 1. Catalog View (Add Connection Flow)
    if (connView === "cat") {
      const catType = ui.connCatType || "S";
      const catSearch = (ui.connCatSearch || "").toLowerCase().trim();
      const catGroup = ui.connCatGroup || "all";
      const typeList = CONNECTOR_CATALOG[catType] || [];
      const groups = Array.from(new Set(typeList.map(c => c.group).filter(Boolean)));
      const catalogList = typeList.filter(c =>
        (catGroup === "all" || c.group === catGroup) &&
        (!catSearch || `${c.name} ${c.desc} ${c.group || ""}`.toLowerCase().includes(catSearch))
      );
      // How many existing connections already use each connector
      const inUse = entry => connections.filter(conn => {
        return entry.logo && connectorLogoKey(conn.type) === entry.logo;
      }).length;

      return `
        <section class="card dd-cat">
          <div class="dd-cat-head">
            <button class="btn sm o" data-act="dd-conn-view-list">← Back to Connections</button>
            <div class="dd-cat-title">
              <h2>Connect Tools &amp; Services</h2>
              <p>Pick a source to scan for personal data. Credentials stay in your vault; PrivacySEK reads metadata and samples in place.</p>
            </div>
          </div>

          <div class="dd-cat-toolbar">
            <div class="dd-cat-seg" role="tablist" aria-label="Data type">
              <button role="tab" class="${catType === "S" ? "active" : ""}" aria-selected="${catType === "S"}" data-act="dd-set-conn-cat-type" data-arg="S">
                Structured data <span>${CONNECTOR_CATALOG.S.length}</span>
              </button>
              <button role="tab" class="${catType === "U" ? "active" : ""}" aria-selected="${catType === "U"}" data-act="dd-set-conn-cat-type" data-arg="U">
                Unstructured data <span>${CONNECTOR_CATALOG.U.length}</span>
              </button>
            </div>
            <div class="dd-cat-search">
              <span class="dd-cat-search-ic" aria-hidden="true">${I.search || ""}</span>
              <input
                type="search"
                placeholder="Search connectors…"
                value="${esc(ui.connCatSearch || "")}"
                data-input-act="dd-conn-cat-search"
                aria-label="Search connector catalog"
              />
              ${ui.connCatSearch ? `<button class="dd-cat-clear" data-act="dd-conn-cat-clear-search" aria-label="Clear search">×</button>` : ""}
            </div>
          </div>

          ${groups.length > 1 ? `
            <div class="dd-cat-groups" role="group" aria-label="Filter by category">
              <button class="${catGroup === "all" ? "active" : ""}" aria-pressed="${catGroup === "all"}" data-act="dd-set-conn-cat-group" data-arg="all">All</button>
              ${groups.map(g => `
                <button class="${catGroup === g ? "active" : ""}" aria-pressed="${catGroup === g}" data-act="dd-set-conn-cat-group" data-arg="${esc(g)}">${esc(g)}</button>
              `).join("")}
            </div>
          ` : ""}

          ${catalogList.length ? `
            <div class="dd-catalog-grid">
              ${catalogList.map(c => {
                const used = inUse(c);
                return `
                  <button type="button" class="dd-catalog-tile" data-act="dd-open-add-conn-modal" data-arg="${esc(c.name)}|${esc(catType)}" aria-label="Configure ${esc(c.name)}">
                    <div class="dd-tile-top">
                      ${connectorBadge(esc, c.name, c.logo)}
                      ${used ? `<span class="dd-tile-used" title="${used} connection${used === 1 ? "" : "s"} already set up">● ${used} connected</span>` : ""}
                    </div>
                    <b>${esc(c.name)}</b>
                    <span class="dd-tile-group">${esc(c.group || (catType === "S" ? "Structured" : "Unstructured"))}</span>
                    <p>${esc(c.desc)}</p>
                    <div class="dd-tile-foot">
                      <span class="mono">${c.port === 443 ? "HTTPS · 443" : `TCP · ${c.port}`}</span>
                      <em>Configure <span aria-hidden="true">→</span></em>
                    </div>
                  </button>
                `;
              }).join("")}
              <button type="button" class="dd-catalog-tile dd-tile-request" data-act="dd-request-connector" aria-label="Request a connector">
                <span class="dd-logo dd-logo-md dd-logo-plus" aria-hidden="true">+</span>
                <b>Request a connector</b>
                <p>Missing a database, SaaS app or file store? Tell us and we will prioritise it.</p>
                <div class="dd-tile-foot"><span></span><em>Request <span aria-hidden="true">→</span></em></div>
              </button>
            </div>
          ` : `
            <div class="dd-cat-empty">
              <b>No connectors match "${esc(ui.connCatSearch || catGroup)}"</b>
              <p>Try another search, switch data type, or request the connector you need.</p>
              <div class="row" style="justify-content:center">
                <button class="btn sm o" data-act="dd-conn-cat-reset">Clear filters</button>
                <button class="btn sm t" data-act="dd-request-connector">Request a connector</button>
              </div>
            </div>
          `}
        </section>
      `;
    }

    // 2. Main Connections Sub-tabs
    const subTabsHeader = `
      <div class="row" style="margin-bottom:14px">
        <div class="dd-sub-tabs" style="margin:0">
          <button class="dd-sub-tab ${subTab === 'conn' ? 'active' : ''}" data-act="dd-set-conn-subtab" data-arg="conn">
            Connections (${connections.length})
          </button>
          <button class="dd-sub-tab ${subTab === 'pod' ? 'active' : ''}" data-act="dd-set-conn-subtab" data-arg="pod">
            Pod Connections (${pods.length})
          </button>
        </div>

        ${subTab === 'conn' ? `
          <button
            class="btn sm p"
            ${canCreate ? '' : 'disabled title="Your role cannot create new connections"'}
            data-act="dd-open-catalog"
          >
            + Add Connection
          </button>
        ` : ''}
      </div>
    `;

    // 3. Pod Connections Sub-tab
    if (subTab === "pod") {
      return `
        ${subTabsHeader}
        <div class="card" style="padding:0;overflow:hidden">
          <div class="card-h" style="padding:14px">
            <h3>Active Discovery Scanner Pods</h3>
            <span class="dim" style="font-size:12px">Containerized metadata reflection daemons</span>
          </div>
          <div class="tw">
            <table class="t">
              <thead>
                <tr>
                  <th>Pod Name</th>
                  <th>Service URL</th>
                  <th>Agent Version</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                ${pods.map(p => `
                  <tr>
                    <td><b>${esc(p.n)}</b></td>
                    <td class="mono dim" style="font-size:12px">${esc(p.url)}</td>
                    <td><span class="mono">${esc(p.v)}</span></td>
                    <td><span class="pill ok">● ${esc(p.st)}</span></td>
                    <td class="dim" style="font-size:12px">${esc(p.cr)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // 4. Connections List Sub-tab
    const q = (ui.connSearch || "").toLowerCase().trim();
    const filteredConns = connections.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
    );

    return `
      ${subTabsHeader}
      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-h" style="padding:14px">
          <div>
            <h3 style="margin:0 0 2px">Data Connections</h3>
            <span class="dim" style="font-size:12px">Manage credentials and monitor live schema reflection status</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <input
              type="search"
              class="field"
              style="height:32px;width:240px;border:1px solid var(--line);border-radius:6px;padding:0 8px;background:var(--surface)"
              placeholder="Search connections..."
              value="${esc(ui.connSearch || '')}"
              data-input-act="dd-conn-search"
              aria-label="Search connections"
            />
            ${ui.connSearch ? `
              <button class="btn sm t" data-act="dd-conn-clear-search">×</button>
            ` : ''}
          </div>
        </div>

        <div class="tw">
          <table class="t">
            <colgroup>
              <col style="width: 48px;" />
              <col style="width: 22%;" />
              <col style="width: 14%;" />
              <col style="width: 28%;" />
              <col style="width: 12%;" />
              <col style="width: 12%;" />
              <col style="width: 12%;" />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredConns.length ? filteredConns.map(c => `
                <tr>
                  <td>${connectorLogoKey(c.type) ? connectorBadge(esc, c.name, connectorLogoKey(c.type), "sm") : `<span style="font-size:16px">${I.db || "🛢"}</span>`}</td>
                  <td>
                    <a
                      href="javascript:void(0)"
                      class="lk"
                      style="font-weight:600"
                      data-act="dd-open-edit-conn-modal"
                      data-arg="${esc(c.id)}"
                    >
                      ${esc(c.name)}
                    </a>
                  </td>
                  <td><span class="mono">${esc(c.type.toUpperCase())}</span></td>
                  <td><span class="dim" style="font-size:12.5px">${esc(c.desc || '—')}</span></td>
                  <td>
                    ${c.status === 'ok' ? pill('ok', 'Connected') : c.status === 'risk' ? pill('risk', 'Attention') : pill('n', 'Pending')}
                  </td>
                  <td class="dim" style="font-size:12px">${esc(c.updated || c.created)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <button
                      class="btn sm o"
                      ${canEdit ? '' : 'disabled title="Your role cannot edit connections"'}
                      data-act="dd-open-edit-conn-modal"
                      data-arg="${esc(c.id)}"
                      title="Edit connection"
                    >
                      ✎ Edit
                    </button>
                    <button
                      class="btn sm o"
                      ${canDelete ? '' : 'disabled title="Your role cannot delete connections"'}
                      data-act="dd-confirm-delete-conn"
                      data-arg="${esc(c.id)}"
                      style="color:var(--block);margin-left:4px"
                      title="Delete connection"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="7" class="empty" style="text-align:center;padding:32px;color:var(--text-2)">
                    No connections found matching your search.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="padding:10px 14px;border-top:1px solid var(--line);font-size:12px;color:var(--text-3)">
          In total there are <b>${filteredConns.length}</b> connection${filteredConns.length === 1 ? '' : 's'} configured.
        </div>
      </div>
    `;
  };
}
