import { postureKind } from "../overview/discoveryInsights.js";
import { assetClassTag } from "../overview/insightPanels.js";

export function registerAssetActions(context, ACT) {
  const { D, bar, btn, drawer, esc, ledgerAdd, pill, render, sevPill, table, tag, toast, ui } = context;

  ACT["dd-assets-search"] = function(val) {
    ui.assetsSearch = val || "";
    ui.assetsPage = 1;
    render();
  };

  ACT["dd-assets-clear-search"] = function() {
    ui.assetsSearch = "";
    ui.assetsPage = 1;
    render();
  };

  ACT["dd-assets-filter-sens"] = function(val) {
    ui.assetsSensFilter = val || "";
    ui.assetsPage = 1;
    render();
  };

  ACT["dd-assets-page"] = function(p) {
    ui.assetsPage = Math.max(1, Number(p) || 1);
    render();
  };

  ACT["dd-assets-page-size"] = function(size) {
    ui.assetsPageSize = Number(size) || 10;
    ui.assetsPage = 1;
    render();
  };

  // Open posture finding of a given kind that names this asset
  function postureFor(a, kind) {
    const key = String(a.n || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return (context.getStore().findings || []).find(f => !f.done && postureKind(f).kind === kind &&
      String(f.a || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(key));
  }

  ACT["dd-open-asset-drawer"] = function(idxStr) {
    const rawAssets = D.assets || [];
    const search = (ui.assetsSearch || "").toLowerCase().trim();
    const sensFilter = ui.assetsSensFilter || "";
    const filtered = rawAssets.filter(a => {
      const matchSearch = !search || (
        a.n.toLowerCase().includes(search) ||
        a.src.toLowerCase().includes(search) ||
        a.own.toLowerCase().includes(search) ||
        a.loc.toLowerCase().includes(search)
      );
      const matchSens = !sensFilter || a.sens === sensFilter;
      return matchSearch && matchSens;
    });

    const page = ui.assetsPage || 1;
    const pageSize = ui.assetsPageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const a = filtered[startIndex + Number(idxStr)] || rawAssets[Number(idxStr)];
    if (!a) return;

    const drawerBody = `
      <div class="row" style="margin-bottom:14px">
        ${sevPill(a.sens)}
        <span class="mono dim">${esc(a.rows)} records</span>
        <span class="dim" style="font-size:12px;margin-left:auto">Last scanned: ${esc(a.scan)}</span>
      </div>

      <div style="margin-bottom:16px">
        <div class="sec-t" style="margin-bottom:8px">Classification · Review Machine Suggestions</div>
        <div class="card" style="padding:0;overflow:hidden">
          ${table(
            ["Field", "Detected Type", "Asset Confidence", "Signals", "Action"],
            (a.cls || []).map(function(c, k) {
              return [
                `<span class="mono"><b>${esc(c[0].toLowerCase().replace(/ /g, "_"))}</b></span>`,
                assetClassTag(esc, c[0], c[1]),
                bar(a.conf),
                `<span class="dim" style="font-size:12px">regex · dictionary · checksum</span>`,
                `<button class="btn sm" data-act="dd-accept-classification" data-arg="${esc(a.n)}|${esc(c[0])}">Accept</button>`
              ];
            })
          )}
        </div>
      </div>

      <dl class="kv">
        <dt>Owner</dt>
        <dd>${a.own === 'Unassigned' ? '<span class="pill risk">Unassigned</span>' : esc(a.own)}</dd>
        <dt>Storage Location</dt>
        <dd>${esc(a.loc)}</dd>
        <dt>Linked Processing</dt>
        <dd>${a.n.includes('kyc') || a.n.includes('loan') ? 'Loan origination, KYC verification' : 'By linked processing activity'}</dd>
        <dt>Retention</dt>
        <dd>${postureFor(a, "Retention beyond schedule") ? `<span style="color:var(--mask);font-weight:600">${esc(postureFor(a, "Retention beyond schedule").n)}</span>` : "Set per processing activity in the ROPA"}</dd>
        <dt>Access</dt>
        <dd>${/public/i.test(a.loc) || a.sens === "Exposed"
          ? '<span style="color:var(--block);font-weight:600">Public · outside approved boundary</span>'
          : postureFor(a, "Over-broad access")
            ? `<span style="color:var(--mask);font-weight:600">${esc(postureFor(a, "Over-broad access").n)}</span>`
            : '<span class="dim">Permission data not connected</span>'}</dd>
      </dl>

      <div class="row" style="margin-top:16px;gap:8px">
        <button class="btn sm o" data-go="lineage" title="View data lineage and downstream consumers">
          View Lineage →
        </button>
        <button class="btn sm o" data-go="ropa" title="Navigate to processing records">
          Link to Processing (ROPA) →
        </button>
      </div>
    `;

    const drawerFoot = `
      <button class="btn sm" data-act="dd-assign-owner" data-arg="${esc(a.n)}">
        Assign Owner
      </button>
      <button class="btn sm p" data-go="ropa">
        Link to ROPA
      </button>
    `;

    drawer(a.n, a.src + " · " + a.loc, drawerBody, drawerFoot, true);
  };

  ACT["dd-accept-classification"] = function(arg) {
    const [assetName, fieldName] = (arg || "").split("|");
    toast(`Classification accepted for ${fieldName || 'field'} on ${assetName || 'asset'}`);
    ledgerAdd("Classification accepted", `${assetName} · ${fieldName}`);
  };

  ACT["dd-assign-owner"] = function(assetName) {
    toast(`Owner assigned and notified for ${assetName}`);
    ledgerAdd("Asset owner assigned", `${assetName} assigned to Lending Operations`);
    render();
  };
}
