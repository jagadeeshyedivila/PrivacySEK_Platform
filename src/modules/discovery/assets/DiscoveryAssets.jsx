import { OVERVIEW_SEED } from "../discoveryData.js";
import { computeDiscoveryModel } from "../overview/discoveryInsights.js";
import { assetClassTag, renderCoverage } from "../overview/insightPanels.js";

export function createAssetsRenderer(context) {
  const { D, bar, btn, card, esc, pill, sevPill, table, tablePagination, tableToolbar, tag, ui } = context;

  return function renderDiscoveryAssets() {
    const rawAssets = D.assets || [];
    const search = (ui.assetsSearch || "").toLowerCase().trim();
    const sensFilter = ui.assetsSensFilter || "";
    const page = ui.assetsPage || 1;
    const pageSize = ui.assetsPageSize || 10;

    // Filter assets
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

    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    const toolbar = tableToolbar({
      title: "Data Asset Inventory",
      description: "Discovered tables, files and storage targets across all connected platforms",
      badge: `${filtered.length} of ${rawAssets.length} Assets`,
      search: {
        placeholder: "Search assets by name, source, or owner...",
        value: ui.assetsSearch || "",
        inputAct: "dd-assets-search",
        clearAct: "dd-assets-clear-search",
        table: "assets"
      },
      filters: [
        {
          label: "Sensitivity",
          act: "dd-assets-filter-sens",
          value: sensFilter,
          options: [
            { label: "All Sensitivities", value: "" },
            { label: "High / SPI", value: "High" },
            { label: "Medium", value: "Medium" },
            { label: "Low", value: "Low" },
            { label: "Exposed", value: "Exposed" }
          ]
        }
      ]
    });

    const paginationBar = tablePagination(
      {
        page,
        pageSize,
        totalRecords,
        totalPages
      },
      {
        pageAct: "dd-assets-page",
        sizeAct: "dd-assets-page-size",
        table: "assets",
        unit: "assets"
      }
    );

    const tableHtml = table(
      [
        { key: "n", label: "Asset Name", sortable: false },
        { key: "src", label: "Source System", sortable: false },
        { key: "own", label: "Asset Owner", sortable: false },
        { key: "cls", label: "Classified Data Types", sortable: false },
        { key: "rows", label: "Volume", sortable: false },
        { key: "loc", label: "Storage Location", sortable: false },
        { key: "sens", label: "Sensitivity", sortable: false },
        { key: "scan", label: "Last Profiled", sortable: false }
      ],
      paginated.map(function(a) {
        const originalIndex = rawAssets.findIndex(x => x.n === a.n);
        return [
          `<b>${esc(a.n)}</b>`,
          esc(a.src),
          a.own === "Unassigned" ? pill("risk", "Unassigned") : esc(a.own),
          `<div class="tags">${(a.cls || []).map(c => assetClassTag(esc, c[0], c[1])).join("")}</div>`,
          `<span class="mono">${esc(a.rows)}</span>`,
          esc(a.loc),
          sevPill(a.sens),
          `<span class="dim" style="font-size:12px">${esc(a.scan)}</span>`
        ];
      }),
      {
        act: "dd-open-asset-drawer",
        emptyText: "No data assets match your search criteria"
      }
    );

    const model = computeDiscoveryModel(context.getStore(), D, OVERVIEW_SEED);

    return `
      ${renderCoverage(context, model, OVERVIEW_SEED.bySource)}
      <div class="card" style="padding:0;overflow:hidden">
        ${toolbar}
        ${tableHtml}
        ${paginationBar}
      </div>
    `;
  };
}
