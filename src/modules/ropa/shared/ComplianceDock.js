// Live "Compliance check" side panel shown next to the wizard form
import { plural } from "./format.js";
import { loadDpiaState } from "../../dpia/dpiaData.js";
import { overallRag, ragOf } from "../../dpia/dpiaModel.js";
import { itemCredit, SELF_CREDIT } from "../ropaRules.js";

const RAG_TONE = { RED: "e", AMBER: "w", GREEN: "ok" };
const ragChip = (esc, rag) => rag ? '<span class="rp-rag ' + (RAG_TONE[rag] || "") + '">' + esc(rag) + '</span>' : '<span class="rp-rag n">Not assessed</span>';

// 5×5 DPIA matrix with this activity's inherent cell marked, and the residual worked out beside it
function renderMatrix(esc, x) {
  let grid = "";
  for (let i = 5; i >= 1; i--) {
    grid += '<span class="rp-mx-ax">' + i + '</span>';
    for (let l = 1; l <= 5; l++) {
      const here = l === x.likelihood && i === x.impact;
      grid += '<span class="rp-mx-c ' + (RAG_TONE[ragOf(l * i)] || "") + (here ? " on" : "") + '"' + (here ? ' aria-label="This activity: likelihood ' + l + ', impact ' + i + '"' : "") + '>' + (here ? l * i : "") + '</span>';
    }
  }
  grid += '<span></span>' + [1, 2, 3, 4, 5].map(l => '<span class="rp-mx-ax">' + l + '</span>').join("");
  const lines = [
    ["Likelihood", x.likelihood + " (" + x.likelihoodPts + " pts)"],
    ["Impact", x.impact + " (" + x.impactPts + " pts)"],
    ["Inherent", x.inherent + " " + x.inherentRag],
    ["Control effectiveness", x.assessed ? x.ce + " / 5" : "—"],
    ["Residual", x.assessed ? Number(x.residual).toFixed(1) : "—"]
  ];
  return '<div class="rp-mx"><div class="rp-mx-g" role="img" aria-label="Risk matrix, impact by likelihood">' + grid + '</div>' +
    '<dl class="rp-mx-kv">' + lines.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join("") + '</dl></div>';
}

// DPIA assessments that cover this activity, newest first
function dpiaLinks(id) {
  if (!id) return [];
  try {
    return (loadDpiaState().assessments || []).filter(a => a.activityId === id || (a.activityIds || []).includes(id));
  } catch (e) { return []; }
}

const SEV_ICON = { error: "✕", warning: "!", suggest: "→", info: "i" };

export function renderResult(context, res, idx, ro) {
  const { esc, tag } = context;
  let fix = "";
  if (res.fix) {
    if (res.fix.go) fix = '<button class="btn sm o" data-go="' + esc(res.fix.go) + '">' + esc(res.fix.label) + '</button>';
    else fix = '<button class="btn sm ' + (res.sev === "error" ? "t" : "o") + '" data-act="rp-fix" data-arg="' + esc(res.id + "#" + idx) + '"' +
      (ro && (res.fix.patch || res.fix.act) ? ' disabled title="View only. Your role can\'t edit records."' : "") + '>' + esc(res.fix.label) + '</button>';
  }
  return '<div class="rp-res rp-' + res.sev + '" data-act="rp-jump" data-arg="' + res.step + "|" + esc(res.field || "") + '">' +
    '<span class="rp-res-ic" aria-hidden="true">' + SEV_ICON[res.sev] + '</span>' +
    '<div class="rp-res-b"><b>' + esc(res.title) + '</b><p>' + esc(res.message) + '</p>' +
    '<div class="rp-res-f">' + (res.cite ? tag(res.cite, "ref") : "") + fix + '</div></div></div>';
}

export function renderDock(context, wiz, ev, extra) {
  const { esc, sevPill, ui } = context;
  const ro = extra.ro;
  const type = wiz.type;
  const errors = ev.results.filter(r => r.sev === "error");
  const warnings = ev.results.filter(r => r.sev === "warning");
  const guidance = ev.results.filter(r => r.sev === "suggest" || r.sev === "info");
  const issueCount = errors.length + warnings.length + (extra.fieldErrors || 0);
  const scored = type === "act" || type === "ast";

  // Index results by id occurrence so rp-fix can find the exact one
  const seen = {};
  const idxOf = r => { seen[r.id] = (seen[r.id] || 0) + 1; return seen[r.id] - 1; };
  const order = errors.concat(warnings, guidance).map(r => ({ r, i: idxOf(r) }));
  const group = (title, list) => list.length ? '<div class="rp-grp"><div class="sec-t">' + title + ' · ' + list.length + '</div>' + list.map(x => renderResult(context, x.r, x.i, ro)).join("") + '</div>' : "";
  const pick = sevs => order.filter(x => sevs.indexOf(x.r.sev) > -1);

  let body = "";
  if (scored) {
    const color = ev.riskBand === "High" ? "r" : ev.riskBand === "Medium" ? "w" : "";
    body += '<div class="rp-dock-sec"><div class="row"><span class="sec-t" style="margin:0">' + (type === "act" ? "Inherent risk score" : "Risk score") + '</span><span class="sp"></span>' + sevPill(ev.riskBand) + '</div>' +
      '<div class="rp-score"><b>' + ev.riskScore + '</b><span class="dim">/ 100</span></div>' +
      '<div class="bar rp-risk-bar ' + color + '"><span style="width:' + ev.riskScore + '%"></span></div>' +
      (ev.riskReasons.length ? '<ul class="rp-reasons">' + ev.riskReasons.slice(0, 4).map(x => '<li><span class="mono">+' + x[0] + '</span> ' + esc(x[1]) + '</li>').join("") + '</ul>' : '<p class="dim rp-small">No risk factors yet.</p>') +
      '</div>';
  }
  if (type === "act" && ev.residual) {
    const x = ev.residual;
    const why = x.assessed
      ? ["Security controls: " + x.secCredit + " (" + SELF_CREDIT[x.secCredit] + ")", "Regulations: " + wiz.data.regApp + " (" + SELF_CREDIT[wiz.data.regApp] + ")"].concat(x.notes, x.floor ? [x.floor] : [])
      : ["Answer the two self-assessment questions on the Security step to rate the residual risk."];
    body += '<div class="rp-dock-sec"><div class="row"><span class="sec-t" style="margin:0">Residual risk · RAG matrix</span><span class="sp"></span>' + ragChip(esc, x.rag) + '</div>' +
      renderMatrix(esc, x) +
      '<ul class="rp-reasons">' + why.map(t => '<li>' + esc(t) + '</li>').join("") + '</ul>' +
      '<p class="dim rp-small">Same 5×5 scoring and bands as the DPIA module (RED ≥ 13, AMBER ≥ 6).</p></div>';
  }
  if (type === "act") {
    body += '<div class="rp-dock-sec rp-dpia ' + (ev.dpiaRecommended ? "on" : "") + '"><b>' + (ev.dpiaRecommended ? "DPIA recommended" : "DPIA not required") + '</b><p class="dim rp-small">' + esc(ev.dpiaReason) + '</p></div>';
    const links = dpiaLinks(wiz.id);
    if (links.length) {
      body += '<div class="rp-dock-sec rp-small"><span class="sec-t" style="margin:0">DPIA</span>' + links.slice(0, 3).map(x => {
        const rag = overallRag(x);
        return '<p><button class="rp-link" data-go="assess">' + esc(x.id) + '</button> · ' + esc(x.status) + (rag ? ' · RAG ' + esc(rag) : "") + '</p>';
      }).join("") + '</div>';
    }
  }
  if (extra.fieldErrors) {
    body += '<div class="rp-dock-sec rp-small"><span class="rp-req">' + plural(extra.fieldErrors, "field") + '</span> to fix on the steps you\'ve checked.</div>';
  }
  body += group("Errors", pick(["error"])) + group("Warnings", pick(["warning"])) + group("Guidance", pick(["suggest", "info"]));
  if (!errors.length && !warnings.length && !guidance.length) body += '<div class="rp-dock-sec rp-clean">✓ No compliance issues found</div>';

  if (ev.rule6) {
    body += '<div class="rp-dock-sec"><div class="sec-t">Rule 6 safeguards</div><ul class="rp-check">' +
      ev.rule6.map(i => '<li class="' + (i.ok ? "ok" : "") + '"><span aria-hidden="true">' + (i.ok ? "☑" : "☐") + '</span>' + esc(i.label) + '</li>').join("") + '</ul>' +
      (ev.rule6Suggest ? '<p class="rp-small">Checklist suggests: <b>' + esc(ev.rule6Suggest.ans) + '</b> (' + ev.rule6Suggest.ok + ' of ' + ev.rule6Suggest.total + ')' +
        (wiz.data.secCtl && wiz.data.secCtl !== ev.rule6Suggest.ans ? ' <span class="dim">· your answer: ' + esc(wiz.data.secCtl) + '</span>' : "") + '</p>' : "") + '</div>';
  }
  (ev.completeness || []).forEach(m => {
    const done = m.items.reduce((n, i) => n + itemCredit(i[1]), 0);
    const pct = Math.round(done / m.items.length * 100);
    body += '<div class="rp-dock-sec"><div class="row"><span class="sec-t" style="margin:0">Record completeness</span><span class="sp"></span><span class="tag ref">' + esc(m.cite) + '</span></div>' +
      '<p class="rp-small"><b>' + done + ' of ' + m.items.length + '</b> ' + esc(m.name) + ' items</p><div class="bar"><span style="width:' + pct + '%"></span></div>' +
      (done < m.items.length ? '<p class="dim rp-small">Missing: ' + m.items.filter(i => i[1] !== true).map(i => esc(i[0]) + (i[1] === 0.5 ? " (partial)" : "")).join(", ") + '</p>' : "") + '</div>';
  });
  if (extra.progress) {
    const p = extra.progress;
    const pct = p.total ? Math.round(p.done / p.total * 100) : 100;
    body += '<div class="rp-dock-sec"><div class="sec-t">Required fields</div><p class="rp-small"><b>' + p.done + ' of ' + p.total + '</b> complete</p><div class="bar"><span style="width:' + pct + '%"></span></div></div>';
  }

  const barLabel = plural(issueCount, "issue") + (scored ? " · Risk: " + ev.riskBand : "") + (ev.residual ? " · RAG " + (ev.residual.rag || "not assessed") : "");
  return '<aside class="rp-dock' + (ui.dockOpen ? " open" : "") + '" aria-label="Compliance check">' +
    '<button class="rp-dock-bar" data-act="rp-dock-toggle" aria-expanded="' + (!!ui.dockOpen) + '">' + esc(barLabel) + ' <span aria-hidden="true">' + (ui.dockOpen ? "▴" : "▾") + '</span></button>' +
    '<div class="rp-dock-h"><h4>Compliance check</h4><span class="dim rp-small">Live</span></div>' +
    '<div class="rp-dock-b">' + body + '</div></aside>';
}
