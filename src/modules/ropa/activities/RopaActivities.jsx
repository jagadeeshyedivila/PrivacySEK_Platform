import { renderRecordList, distinct, annotate } from "../shared/RecordList.js";
import { dpiaLabel, lawShort, lawRegime } from "../shared/format.js";
import { getSteps, listState } from "../ropaConfig.js";
import { stageStates, stageTrack } from "../shared/stages.js";

const DPIA_TONE = { "Completed": "ok", "In progress": "w", "Not started": "e" };
const RISK_TONE = { High: "e", Medium: "w", Low: "ok" };

// Text with a status dot. Used instead of pills so only the colour carries the state.
const status = (tone, text) => '<span class="rp-st ' + tone + '">' + text + '</span>';

function listText(esc, arr, n) {
  const a = arr || [];
  if (!a.length) return '<span class="dim">—</span>';
  return esc(a.slice(0, n).join(", ")) + (a.length > n ? ' <span class="dim">+' + (a.length - n) + '</span>' : "");
}

// Stages are computed once per row per render and kept on the row's issue summary
function stagesOf(context, r, iss) {
  if (!iss._stages) iss._stages = stageStates("act", r, iss.ev, context.rulesCtx("act", r.id));
  return iss._stages;
}

function renderLifecycle(context, rows, active) {
  const { esc } = context;
  const steps = getSteps("act", context.rulesCtx("act"));
  const per = rows.map(row => stagesOf(context, row.rec, row.iss));
  const tiles = steps.map((s, i) => {
    const n = { ok: 0, w: 0, e: 0, todo: 0 };
    per.forEach(st => { if (st[i]) n[st[i].state]++; });
    const gaps = rows.length - n.ok;
    const note = [n.e && n.e + " with errors", n.todo && n.todo + " incomplete", n.w && n.w + " with warnings"].filter(Boolean).join(" · ") || "No gaps";
    const on = active === String(i);
    return '<button type="button" class="rp-stage' + (on ? " on" : "") + '" data-act="rp-filter-toggle" data-arg="act|stage|' + i + '" aria-pressed="' + on + '"' +
      (gaps ? "" : ' disabled') + ' title="' + esc(gaps ? "List the activities with gaps in " + s.t : "Every activity is complete at this stage") + '">' +
      '<span class="rp-stage-n">' + String(i + 1).padStart(2, "0") + '</span>' +
      '<b>' + esc(s.short || s.t) + '</b>' +
      '<span class="rp-stage-c"><b>' + n.ok + '</b> / ' + rows.length + ' complete</span>' +
      '<span class="rp-stage-bar" aria-hidden="true">' + ["ok", "w", "todo", "e"].filter(k => n[k]).map(k => '<i class="' + k + '" style="flex:' + n[k] + '"></i>').join("") + '</span>' +
      '<small class="' + (gaps ? "" : "ok") + '">' + note + '</small></button>';
  });
  return '<section class="card rp-life"><div class="rp-life-h"><div><h4>Record lifecycle</h4>' +
    '<p class="dim rp-small">Each activity is documented in ' + steps.length + ' stages. Select a stage to list the activities with gaps in it.</p></div>' +
    '<div class="rp-life-key" aria-hidden="true">' + status("ok", "Complete") + status("w", "Warnings") + status("n", "Incomplete") + status("e", "Errors") + '</div></div>' +
    '<div class="rp-stages" style="--n:' + steps.length + '">' + tiles.join("") + '</div></section>';
}

export function activityListConfig(context) {
  const { esc } = context;
  const steps = getSteps("act", context.rulesCtx("act"));
  return {
    noId: true,
    rowActions: r => '<button class="btn sm o" data-act="rp-flow-open" data-arg="' + esc("act|" + r.id) + '" title="Data flow for ' + esc(r.name) + '">Flow</button>',
    cols: [
      { label: "Activity", cell: r => '<div class="rp-wrap"><b>' + esc(r.name) + '</b><span class="sub"><span class="mono">' + esc(r.id) + '</span> · ' + esc(r.bu || "—") + ' · ' + esc(r.role || "—") + '</span></div>', text: r => r.id + " " + r.name + " " + (r.bu || "") + " " + (r.role || "") },
      { label: "Lawful basis", cell: r => {
        const l = lawShort(r.law).split(" · ");
        return esc(l[0]) + '<span class="sub">' + esc([l[1], lawRegime(r.law)].filter(Boolean).join(" · ") || "—") + '</span>';
      }, text: r => r.law },
      { label: "Data principals", cell: r => '<div class="rp-wrap">' + listText(esc, r.dpc, 2) + '<span class="sub">' +
        (r.xb === "Yes" ? "Cross-border → " + esc((r.xc || []).join(", ") || "unnamed") : "No cross-border transfer") + '</span></div>',
        text: r => (r.dpc || []).join(" ") + (r.xb === "Yes" ? " " + (r.xc || []).join(" ") : "") },
      { label: "Lifecycle", cell: (r, iss) => stageTrack(context, "act", r.id, stagesOf(context, r, iss)), text: () => "" },
      // Risk score on top, DPIA status under it: the DPIA is the response to that risk
      { label: "Risk & DPIA", cell: (r, iss) => {
        const ev = iss.ev, l = dpiaLabel(r);
        const dpia = "DPIA " + l.toLowerCase();
        const flag = ev.dpiaRecommended && r.dpia !== "Yes" ? ' <span class="rp-warn-t">· recommended</span>' : "";
        return '<div class="rp-meter ' + (RISK_TONE[ev.riskBand] || "n") + '"><span><b>' + ev.riskScore + '</b> ' + esc(ev.riskBand) + '</span>' +
          '<i><s style="width:' + ev.riskScore + '%"></s></i>' + status(DPIA_TONE[l] || "n", esc(dpia) + flag) + '</div>';
      }, text: (r, iss) => iss.ev.riskBand + " " + dpiaLabel(r) }
    ],
    filters: [
      { key: "law", label: "Lawful basis", options: rows => distinct(rows, r => r.law).map(o => [o[0], lawShort(o[0])]), match: (r, v) => r.law === v },
      { key: "risk", label: "Risk", options: () => [["High", "High"], ["Medium", "Medium"], ["Low", "Low"]], match: (r, v, iss) => iss.ev.riskBand === v },
      { key: "dpia", label: "DPIA", options: () => [["Not started", "Required · not started"], ["In progress", "In progress"], ["Completed", "Completed"], ["Not required", "Not required"], ["Undecided", "Undecided"], ["required", "Required (any status)"]], match: (r, v) => v === "required" ? r.dpia === "Yes" : dpiaLabel(r) === v },
      { key: "bu", label: "Business unit", options: rows => distinct(rows, r => r.bu), match: (r, v) => r.bu === v },
      { key: "stage", label: "Lifecycle", hidden: true, display: v => "Gaps in " + (steps[v] ? steps[v].t : "stage " + v), match: (r, v, iss) => { const s = stagesOf(context, r, iss)[Number(v)]; return !!s && s.state !== "ok"; } },
      { key: "ai", label: "Uses AI", hidden: true, match: (r, v) => r.ai === v },
      { key: "xb", label: "Cross-border", hidden: true, match: (r, v) => r.xb === v },
      { key: "issues", label: "Issues", hidden: true, display: v => v === "high" ? "High severity" : "Open", match: (r, v, iss) => v === "high" ? iss.high > 0 : iss.list.length > 0 }
    ]
  };
}

export function createActivitiesRenderer(context) {
  return function renderActivities() {
    const cfg = activityListConfig(context);
    const rows = annotate(context, "act");
    if (rows.length) cfg.before = renderLifecycle(context, rows, listState(context.ui, "act").filters.stage);
    return renderRecordList(context, "act", cfg);
  };
}
