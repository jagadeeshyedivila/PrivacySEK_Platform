import { renderRecordList, distinct } from "../shared/RecordList.js";
import { issuesChip, plural } from "../shared/format.js";

export function createAssetsRenderer(context) {
  const { esc, pill, sevPill, tag } = context;
  const cfg = {
    cols: [
      { label: "Name", cell: r => '<b>' + esc(r.name) + '</b><span class="sub">' + esc(r.area || "") + '</span>', text: r => r.name + " " + (r.area || "") },
      { label: "Purpose", cell: r => esc(r.purp || "—"), text: r => r.purp },
      { label: "Storage location", cell: r => esc(r.loc || "—") + '<span class="sub">' + esc(r.stype || "") + '</span>', text: r => (r.loc || "") + " " + (r.stype || "") },
      { label: "Linked activities", cell: r => (r.acts || []).length ? '<span title="' + esc((r.acts || []).join(", ")) + '">' + plural((r.acts || []).length, "activity", "activities") + '</span>' : '<span class="dim">None</span>', text: r => (r.acts || []).join(" ") },
      { label: "Critical", cell: r => r.crit === "Yes" ? pill("risk", "Critical") : '<span class="dim">No</span>', text: r => r.crit === "Yes" ? "critical" : "" },
      { label: "AI", cell: r => r.ai === "Yes" ? tag("AI", "ref") : '<span class="dim">—</span>', text: r => r.ai === "Yes" ? "ai" : "" },
      { label: "Risk", cell: (r, iss) => sevPill(iss.ev.riskBand), text: (r, iss) => iss.ev.riskBand },
      { label: "Issues", cell: (r, iss) => issuesChip(pill, iss), text: () => "" }
    ],
    filters: [
      { key: "stype", label: "Storage type", options: rows => distinct(rows, r => r.stype), match: (r, v) => r.stype === v },
      { key: "crit", label: "Critical", options: () => [["Yes", "Business-critical"], ["No", "Not critical"]], match: (r, v) => r.crit === v }
    ]
  };
  return function renderAssets() {
    return renderRecordList(context, "ast", cfg);
  };
}
