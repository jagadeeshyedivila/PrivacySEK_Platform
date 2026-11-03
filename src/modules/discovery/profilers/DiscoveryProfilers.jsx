import { RISK_LEVELS, canPerform, getUserRole } from "../discoveryConfig.js";

export function createProfilersRenderer(context) {
  const { D, esc, pill, ui } = context;

  function renderRiskBadge(rkKey) {
    const rk = RISK_LEVELS[rkKey] || RISK_LEVELS.L;
    if (rk.spi) {
      return `<span class="dd-risk-badge VH">● Very High</span> <span class="tag spi">SPI</span>`;
    }
    return `<span class="dd-risk-badge ${rk.key}">● ${rk.label}</span>`;
  }

  return function renderDiscoveryProfilers() {
    const data = context.getStore();
    const defaultProfilers = data.profilers || [];
    const customProfilers = data.customProfilers || [];
    const role = getUserRole(D);
    const canCreate = canPerform(role, "create");
    const canDelete = canPerform(role, "delete");

    const subTab = ui.profilersSubTab || "D";
    const activeProfilerName = ui.activeProfiler;

    // 1. Detailed Recognizer Library View (Drilldown)
    if (activeProfilerName) {
      const allProfilers = [
        ...defaultProfilers.map(p => ({ ...p, isCustom: false })),
        ...customProfilers.map(p => ({ ...p, isCustom: true }))
      ];
      const p = allProfilers.find(x => x.n === activeProfilerName);

      if (!p) {
        ui.activeProfiler = null;
        return renderDiscoveryProfilers();
      }

      const rf = ui.recognizerRiskFilter || "";
      const rq = (ui.recognizerSearch || "").toLowerCase().trim();

      const filteredRecs = (p.rec || []).filter(r => {
        const matchRisk = !rf || r.r === rf;
        const matchQuery = !rq || r.n.toLowerCase().includes(rq) || r.k.toLowerCase().includes(rq) || r.c.toLowerCase().includes(rq);
        return matchRisk && matchQuery;
      });

      return `
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px;flex-wrap:wrap;gap:10px">
            <div>
              <button class="btn sm o" data-act="dd-close-recognizers">
                ← Back to Profilers Library
              </button>
              <h2 style="margin:8px 0 2px;font-size:18px">
                ${esc(p.n)}
                ${p.isCustom ? '<span class="dd-badge-custom" style="margin-left:8px">CUSTOM</span>' : '<span class="dd-badge-default" style="margin-left:8px">DEFAULT</span>'}
              </h2>
              <div class="dim" style="font-size:12.5px">${(p.rec || []).length} active machine recognizers configured</div>
            </div>

            <div style="display:flex;align-items:center;gap:6px">
              <input
                type="search"
                class="field"
                style="height:32px;width:220px;border:1px solid var(--line);border-radius:6px;padding:0 8px;background:var(--surface)"
                placeholder="Search recognizers..."
                value="${esc(ui.recognizerSearch || '')}"
                data-input-act="dd-recognizer-search"
                aria-label="Search recognizers"
              />
              ${ui.recognizerSearch ? `
                <button class="btn sm t" data-act="dd-recognizer-clear-search">×</button>
              ` : ''}
            </div>
          </div>

          <!-- Risk Filter Pills Bar -->
          <div class="row" style="margin-bottom:12px">
            <div class="tabs" role="tablist">
              ${[
                ["", "All Risk Levels"],
                ["VH", "Very High (SPI)"],
                ["H", "High"],
                ["M", "Medium"],
                ["L", "Low"]
              ].map(([key, label]) => `
                <button
                  role="tab"
                  aria-selected="${rf === key ? 'true' : 'false'}"
                  class="${rf === key ? 'active' : ''}"
                  data-act="dd-filter-recognizer-risk"
                  data-arg="${esc(key)}"
                >
                  ${label}
                </button>
              `).join("")}
            </div>

            <span class="dim" style="font-size:12px">
              Showing <b>${filteredRecs.length}</b> of <b>${(p.rec || []).length}</b> rules
            </span>
          </div>

          <!-- Recognizer Card Grid -->
          ${filteredRecs.length ? `
            <div class="dd-recognizer-grid">
              ${filteredRecs.map(r => `
                <div class="dd-recognizer-card">
                  <div>
                    <div class="dd-recognizer-header">
                      <span class="dd-recognizer-key">${esc(r.k)}</span>
                      <span class="${p.isCustom ? 'dd-badge-custom' : 'dd-badge-default'}">${p.isCustom ? 'CUSTOM' : 'DEFAULT'}</span>
                    </div>
                    <div class="dd-recognizer-title">${esc(r.n)}</div>
                    <div class="dd-recognizer-desc">${esc(r.c)}</div>
                  </div>
                  <div>
                    ${renderRiskBadge(r.r)}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `
            <div class="table-empty-state" style="padding:32px">
              <h4 class="table-empty-title">No recognizers match selected filter</h4>
              <p class="table-empty-desc">Try clearing the search query or selecting "All Risk Levels".</p>
              <button class="btn sm t" data-act="dd-recognizer-reset-filters">Clear Filter</button>
            </div>
          `}
        </div>
      `;
    }

    // 2. Profilers Main Table View (Default vs Custom Tabs)
    const profilerList = subTab === "D" ? defaultProfilers : customProfilers;
    const q = (ui.profilersSearch || "").toLowerCase().trim();
    const filteredProfilers = profilerList.filter(p =>
      !q || p.n.toLowerCase().includes(q)
    );

    return `
      <div class="card" style="padding:0;overflow:hidden">
        <div class="card-h" style="padding:14px">
          <div>
            <h3 style="margin:0 0 2px">Profilers & Recognizers Library</h3>
            <span class="dim" style="font-size:12px">Pattern libraries, checksum validators, and India DPDP identifier detectors</span>
          </div>

          <div style="display:flex;align-items:center;gap:10px">
            <div style="display:flex;align-items:center;gap:6px">
              <input
                type="search"
                class="field"
                style="height:32px;width:200px;border:1px solid var(--line);border-radius:6px;padding:0 8px;background:var(--surface)"
                placeholder="Search profilers..."
                value="${esc(ui.profilersSearch || '')}"
                data-input-act="dd-profilers-search"
                aria-label="Search profilers"
              />
              ${ui.profilersSearch ? `
                <button class="btn sm t" data-act="dd-profilers-clear-search">×</button>
              ` : ''}
            </div>

            <button
              class="btn sm p"
              ${canCreate ? '' : 'disabled title="Your role cannot create custom profilers"'}
              data-act="dd-open-custom-profiler-modal"
            >
              + Create Custom Profiler
            </button>
          </div>
        </div>

        <div style="padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface)">
          <div class="dd-sub-tabs" style="margin:0">
            <button class="dd-sub-tab ${subTab === 'D' ? 'active' : ''}" data-act="dd-set-profilers-subtab" data-arg="D">
              Default Profilers (${defaultProfilers.length})
            </button>
            <button class="dd-sub-tab ${subTab === 'C' ? 'active' : ''}" data-act="dd-set-profilers-subtab" data-arg="C">
              Custom Profilers (${customProfilers.length})
            </button>
          </div>
        </div>

        <div class="tw">
          <table class="t">
            <colgroup>
              <col style="width: 55%;" />
              <col style="width: 25%;" />
              <col style="width: 20%;" />
            </colgroup>
            <thead>
              <tr>
                <th>Profiler Type</th>
                <th>Active Recognizers</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProfilers.length ? filteredProfilers.map((p, idx) => `
                <tr>
                  <td>
                    <a
                      href="javascript:void(0)"
                      class="lk"
                      style="font-size:13.5px;font-weight:600"
                      data-act="dd-view-recognizers"
                      data-arg="${esc(p.n)}"
                    >
                      ${esc(p.n)}
                    </a>
                  </td>
                  <td>
                    <span class="pill ok">● ${(p.rec || []).length} recognizers</span>
                  </td>
                  <td style="text-align:right;white-space:nowrap">
                    <button
                      class="btn sm o"
                      data-act="dd-view-recognizers"
                      data-arg="${esc(p.n)}"
                      title="Inspect recognizer library"
                    >
                      👁 View Rules
                    </button>
                    ${subTab === 'C' ? `
                      <button
                        class="btn sm o"
                        ${canDelete ? '' : 'disabled title="Your role cannot delete custom profilers"'}
                        data-act="dd-delete-custom-profiler"
                        data-arg="${idx}"
                        style="color:var(--block);margin-left:4px"
                        title="Delete custom profiler"
                      >
                        🗑
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="3" class="empty" style="text-align:center;padding:32px;color:var(--text-2)">
                    ${subTab === 'C' ? 'No custom profilers created yet. Click "+ Create Custom Profiler" above.' : 'No default profilers match your search query.'}
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
