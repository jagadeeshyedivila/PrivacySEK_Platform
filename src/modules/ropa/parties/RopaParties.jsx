import { PARTY_TABS } from "../ropaConfig.js";
import { partyLinks } from "../ropaRules.js";
import { renderRecordList, distinct } from "../shared/RecordList.js";
import { plural } from "../shared/format.js";

export function createPartiesRenderer(context) {
  const { esc, tag, ui } = context;

  function config(type) {
    const store = () => context.getStore();
    const cols = [
      { label: "Name", cell: (r, iss) => '<b>' + esc(r.name) + '</b>' +
          (type === "ven" && iss.list.some(x => x.id === "R-17" || x.id === "R-18") ? ' ' + tag("DPA missing", "spi") : "") +
          '<span class="sub">' + esc((r.etype || []).join(", ")) + '</span>', text: r => r.name + " " + (r.etype || []).join(" ") },
      { label: "Country", cell: r => esc(r.country || "—"), text: r => r.country },
      { label: "Website", cell: r => r.web ? '<span class="mono rp-small">' + esc(r.web.replace(/^https?:\/\//, "")) + '</span>' : '<span class="dim">—</span>', text: r => r.web }
    ];
    if (type === "ven") cols.push({ label: "Audit type", cell: r => esc(r.atype || "—"), text: r => r.atype });
    cols.push({ label: "Linked activities", cell: r => {
      const n = partyLinks(store(), type, r).length;
      return n ? plural(n, "activity", "activities") : '<span class="dim">None</span>';
    }, text: () => "" });
    return {
      cols,
      filters: [{ key: "country", label: "Country", options: rows => distinct(rows, r => r.country), match: (r, v) => r.country === v }]
    };
  }

  return function renderParties() {
    const store = context.getStore();
    const sub = ui.partyTab || "ven";
    const subTabs = '<div class="rp-sub-tabs" role="tablist" aria-label="Third party type">' + PARTY_TABS.map(t =>
      '<button role="tab" class="rp-sub-tab' + (t[0] === sub ? " active" : "") + '" aria-selected="' + (t[0] === sub) + '" data-act="rp-party-tab" data-arg="' + t[0] + '">' +
      t[1] + ' · ' + (store[t[0]] || []).length + '</button>').join("") + '</div>';
    return subTabs + renderRecordList(context, sub, config(sub));
  };
}
