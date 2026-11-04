import { renderRecordList, distinct } from "../shared/RecordList.js";
import { fmtDate } from "../shared/format.js";

const daysUntil = iso => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);

export function reviewState(r) {
  if (!r.next) return { k: "none", n: 0 };
  const n = daysUntil(r.next);
  return n < 0 ? { k: "overdue", n: -n } : n <= 30 ? { k: "soon", n } : { k: "ok", n };
}

export function createPoliciesRenderer(context) {
  const { esc, pill, tag } = context;
  const cfg = {
    cols: [
      { label: "Name", cell: r => '<b>' + esc(r.name) + '</b>', text: r => r.name },
      { label: "Policy type", cell: r => esc(r.ptype || "—"), text: r => r.ptype },
      { label: "Version", cell: r => tag(r.ver || "—"), text: r => r.ver },
      { label: "Owner", cell: r => esc(r.resp || "—"), text: r => r.resp },
      { label: "Next review", cell: r => {
        const s = reviewState(r);
        if (s.k === "overdue") return pill("risk", "Overdue " + s.n + (s.n === 1 ? " day" : " days"));
        if (s.k === "soon") return fmtDate(r.next) + '<span class="sub">Due in ' + s.n + ' days</span>';
        return fmtDate(r.next);
      }, text: r => fmtDate(r.next) + (reviewState(r).k === "overdue" ? " overdue" : "") }
    ],
    filters: [
      { key: "ptype", label: "Policy type", options: rows => distinct(rows, r => r.ptype), match: (r, v) => r.ptype === v },
      { key: "due", label: "Review", hidden: true, display: () => "Due within 30 days or overdue", match: r => reviewState(r).k === "overdue" || reviewState(r).k === "soon" }
    ]
  };
  return function renderPolicies() {
    return renderRecordList(context, "pol", cfg);
  };
}
