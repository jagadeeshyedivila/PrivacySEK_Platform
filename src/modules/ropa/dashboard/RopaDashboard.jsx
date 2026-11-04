import { RECORD_TYPES, getSteps } from "../ropaConfig.js";
import { annotate } from "../shared/RecordList.js";
import { ago, clickable, lawShort, lawRegime, plural } from "../shared/format.js";
import { reviewState } from "../policies/RopaPolicies.jsx";

const SEV_RANK = { error: 0, warning: 1 };

// Every open error/warning across the register, most severe first
export function registerIssues(context) {
  const out = [];
  Object.keys(RECORD_TYPES).forEach(type => {
    annotate(context, type).forEach(row => {
      row.iss.list.forEach(res => out.push({ type, rec: row.rec, res, high: res.sev === "error" || row.iss.ev.high.indexOf(res.id) > -1 }));
    });
  });
  out.sort((a, b) => (SEV_RANK[a.res.sev] - SEV_RANK[b.res.sev]) || (b.high - a.high));
  return out;
}

export function createDashboardRenderer(context) {
  const { card, esc, kpi, sevPill, table, tag, ui } = context;

  return function renderDashboard() {
    const store = context.getStore();
    const sdf = !store.settings || store.settings.sdf !== false;
    const acts = annotate(context, "act");
    const issues = registerIssues(context);
    const ven = annotate(context, "ven");

    const dpiaReq = acts.filter(a => a.rec.dpia === "Yes");
    const notStarted = dpiaReq.filter(a => (a.rec.dpiaState || "Not started") === "Not started").length;
    const aiActs = acts.filter(a => a.rec.ai === "Yes");
    const xbActs = acts.filter(a => a.rec.xb === "Yes");
    const xbCountries = Array.from(new Set([].concat.apply([], xbActs.map(a => a.rec.xc || []))));
    const highRisk = acts.filter(a => a.iss.ev.riskBand === "High").length;
    const dpaMissing = ven.filter(v => v.iss.list.some(x => x.id === "R-17" || x.id === "R-18")).length;
    const polDue = (store.pol || []).filter(p => ["overdue", "soon"].indexOf(reviewState(p).k) > -1);
    const polOver = polDue.filter(p => reviewState(p).k === "overdue").length;
    const highIssues = issues.filter(i => i.high).length;

    const banner = '<div class="banner' + (sdf ? " t" : "") + ' rp-sdf"><span>' +
      (sdf ? 'Aarohan Finance is an <b>SDF candidate</b>. Showing extra SDF checks (annual DPIA and audit, algorithmic due diligence).'
           : 'SDF checks are off. Turn them on to include Significant Data Fiduciary checks in the register.') +
      '</span><label class="r rp-sw-l"><span>SDF checks: ' + (sdf ? "On" : "Off") + '</span><input type="checkbox" class="rp-sw" data-change-act="rp-toggle-sdf"' + (sdf ? " checked" : "") + ' aria-label="SDF checks"></label></div>';

    const k = (label, val, sub, color, arg) => clickable(kpi(label, val, sub, color), "rp-dash-go", arg, "Open " + label);
    const kpis = '<div class="g g4">' +
      k("Processing activities", acts.length, plural(highRisk, "high-risk activity", "high-risk activities"), "#14B8A6", "act|") +
      k("Assets", (store.ast || []).length, plural((store.ast || []).filter(a => a.crit === "Yes").length, "business-critical asset"), "#3B82F6", "ast|") +
      k("Vendors", (store.ven || []).length, dpaMissing ? plural(dpaMissing, "vendor") + " with DPA missing" : "All DPAs on file", "#8B5CF6", "ven|") +
      k("DPIA required", dpiaReq.length, notStarted + " not started", "#F59E0B", "act|dpia=required") +
      k("Uses AI", aiActs.length, plural(aiActs.filter(a => a.rec.adm === "Yes").length, "fully automated decision"), "#0EA5E9", "act|ai=Yes") +
      k("Cross-border", xbActs.length, xbCountries.length ? xbCountries.join(", ") : "No transfers", "#6366F1", "act|xb=Yes") +
      k("Open compliance issues", issues.length, highIssues + " high", "#EF4444", "act|issues=open") +
      k("Policies due for review", polDue.length, polOver + " overdue", "#F59E0B", "pol|due=1") +
      '</div>';

    // Activities by lawful basis
    const byLaw = {};
    acts.forEach(a => { if (a.rec.law) byLaw[a.rec.law] = (byLaw[a.rec.law] || 0) + 1; });
    const lawKeys = Object.keys(byLaw).sort((a, b) => byLaw[b] - byLaw[a]);
    const max = Math.max(1, ...lawKeys.map(x => byLaw[x]));
    const lawBody = lawKeys.length ? '<div class="rp-bars">' + lawKeys.map(l =>
      '<button class="rp-barrow" data-act="rp-dash-go" data-arg="' + esc("act|law=" + l) + '"><span class="rp-bl">' + esc(lawShort(l)) + ' ' + tag(lawRegime(l) || "Other", lawRegime(l) === "GDPR" ? "" : "ref") + '</span>' +
      '<span class="bar"><span style="width:' + Math.round(byLaw[l] / max * 100) + '%"></span></span><span class="mono">' + byLaw[l] + '</span></button>').join("") + '</div>'
      : '<div class="empty">No activities yet</div>';

    const xbBody = xbActs.length ? '<div class="list">' + xbActs.map(a =>
      '<div class="li rp-click" data-act="rp-open" data-arg="' + esc("act|" + a.rec.id + "|3|xc") + '"><span class="mono dim">' + esc(a.rec.id) + '</span>' +
      '<span><b>' + esc(a.rec.name) + '</b><span class="tags" style="margin-top:4px">' + (a.rec.xc || []).map(c => tag(c)).join("") + '</span></span>' +
      '<span>' + ((a.rec.xs || []).length ? tag((a.rec.xs || [])[0], "pii") : tag("No safeguard", "spi")) + '</span></div>').join("") + '</div>'
      : '<div class="empty">No cross-border transfers recorded</div>';

    // Risk distribution
    const bands = { High: 0, Medium: 0, Low: 0 };
    acts.forEach(a => { bands[a.iss.ev.riskBand]++; });
    const total = Math.max(1, acts.length);
    const stack = '<div class="rp-stack" role="img" aria-label="' + bands.High + ' high, ' + bands.Medium + ' medium, ' + bands.Low + ' low">' +
      ["High", "Medium", "Low"].filter(b => bands[b]).map(b => '<span class="rp-' + b.toLowerCase() + '" style="width:' + (bands[b] / total * 100) + '%"></span>').join("") + '</div>' +
      '<div class="row rp-legend">' + ["High", "Medium", "Low"].map(b => '<button class="rp-link" data-act="rp-dash-go" data-arg="act|risk=' + b + '">' + sevPill(b) + ' <b>' + bands[b] + '</b></button>').join("") + '</div>';
    const top = acts.slice().sort((a, b) => b.iss.ev.riskScore - a.iss.ev.riskScore).slice(0, 5);
    const riskBody = stack + '<div class="list rp-top">' + top.map(a =>
      '<div class="li rp-click" data-act="rp-open" data-arg="' + esc("act|" + a.rec.id) + '"><span class="mono">' + a.iss.ev.riskScore + '</span><span><b>' + esc(a.rec.name) + '</b><small>' + esc(a.iss.ev.riskReasons.slice(0, 2).map(x => x[1]).join(" · ")) + '</small></span>' + sevPill(a.iss.ev.riskBand) + '</div>').join("") + '</div>';

    // Recently updated, any type
    const recent = [];
    Object.keys(RECORD_TYPES).forEach(t => (store[t] || []).forEach(r => recent.push({ t, r })));
    recent.sort((a, b) => String(b.r.upd).localeCompare(String(a.r.upd)));
    const recentBody = '<div class="list">' + recent.slice(0, 5).map(x =>
      '<div class="li rp-click" data-act="rp-open" data-arg="' + esc(x.t + "|" + x.r.id) + '">' + tag(RECORD_TYPES[x.t].label) + '<span><b>' + esc(x.r.name) + '</b><small>' + esc(x.r.id) + '</small></span><span class="dim rp-small">' + ago(x.r.upd) + '</span></div>').join("") + '</div>';

    // Compliance issues table
    const topIssues = issues.slice(0, 10);
    ui.issueRows = topIssues.map(i => i.type + "|" + i.rec.id + "|" + i.res.step + "|" + (i.res.field || ""));
    const issueTable = topIssues.length ? table(["Record", "Issue", "Cite", "Step"], topIssues.map(i => {
      const steps = getSteps(i.type, context.rulesCtx(i.type, i.rec.id));
      return [
        '<b>' + esc(i.rec.name) + '</b><span class="sub">' + esc(i.rec.id) + '</span>',
        '<span class="rp-issue ' + i.res.sev + '">' + esc(i.res.title) + '</span><span class="sub cell-break">' + esc(i.res.message) + '</span>',
        i.res.cite ? tag(i.res.cite, "ref") : "",
        steps.length > 1 && steps[i.res.step] ? esc((i.res.step + 1) + ". " + steps[i.res.step].t) : '<span class="dim">—</span>'
      ];
    }), "rp-issue-row") : '<div class="card-b"><div class="empty">✓ No open compliance issues</div></div>';

    return banner + kpis +
      '<div class="g g2">' + card("Activities by lawful basis", lawBody) + card("Cross-border transfers", xbBody, tag(plural(xbActs.length, "activity", "activities")), true) + '</div>' +
      '<div class="g g2">' + card("Risk distribution", riskBody) + card("Recently updated", recentBody, null, true) + '</div>' +
      card("Compliance issues", issueTable, tag("Top " + topIssues.length + " of " + issues.length), true) +
      '<p class="dim rp-small rp-foot">Compliance checks are illustrative guidance for this demo, not legal advice.</p>';
  };
}
