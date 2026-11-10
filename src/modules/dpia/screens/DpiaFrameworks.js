// Framework crosswalk: how much of each framework the checklist answers cover, and maturity by
// domain. The ISO mappings are crosswalks: the standards do not themselves require a DPIA.
import { crosswalk, domainMatrix, usesChecklist } from "../dpiaModel.js";
import { FRAMEWORKS, FRAMEWORK_FULL, DOMAINS, RESPONSES } from "../dpiaConfig.js";

export function createFrameworksRenderer(ctx) {
  const { ui, safe } = ctx;
  const pc = v => (v === null || v === undefined ? "—" : `${Math.round(v * 1000) / 10}%`);

  function scope() {
    const list = ctx.state.assessments.filter(usesChecklist);
    const one = ui.fwScope && list.find(a => a.id === ui.fwScope);
    return { list, one, items: one ? [one] : list.filter(a => a.status === "Approved") };
  }

  function render() {
    const { list, one, items } = scope();
    const cw = crosswalk(items);
    const dm = domainMatrix(items);
    // Numbers open the assessment filtered to those questions, when one assessment is selected
    const num = (n, what, resp) => (one && n ? `<button class="dp-link dp-num-link" data-act="dp-fw-open" data-arg="${safe(one.id)}|${safe(what)}|${safe(resp)}" title="Show these questions">${n}</button>` : `${n}`);
    const bar = v => `<span class="dp-cov"><span style="width:${v ? Math.round(v * 100) : 0}%"></span></span>`;
    const respKey = r => (r === "Not Assessed" ? "Not Assessed" : r);
    return `
      <div class="dp-screen-head">
        <div><h2>Framework crosswalk</h2><p>Coverage = Yes ÷ (mapped − NA). Effective = (Yes + ½ Partial) ÷ (mapped − NA). Open gaps = No. Questions are <em>mapped to</em> each framework as a practical crosswalk; the ISO standards do not require a DPIA.</p></div>
        <div class="dp-head-actions"><label class="dp-qf-f"><span>Scope</span>
          <select id="dp-fw-scope" data-act="dp-fw-scope" aria-label="Assessment scope">
            <option value="" ${!ui.fwScope ? "selected" : ""}>All approved assessments</option>
            ${list.map(a => `<option value="${safe(a.id)}" ${ui.fwScope === a.id ? "selected" : ""}>${safe(a.id)} · ${safe(a.name)}</option>`).join("")}
          </select></label></div>
      </div>
      ${!items.length ? `<div class="card dp-empty-card"><h3>Nothing to show yet</h3><p>${list.length ? "No approved assessment uses the checklist. Choose an assessment above to see its coverage while it is in progress." : "No assessment uses a checklist template yet. Start one from the Integrated DPIA template."}</p></div>` : `
      <section class="card dp-table-card">
        <div class="card-h"><h3>Coverage by framework</h3><div class="r dp-muted">${items.length} assessment${items.length === 1 ? "" : "s"}${one ? "" : " · choose one assessment to drill into the numbers"}</div></div>
        <div class="tw"><table class="t dp-table" id="dp-fw-table">
          <thead><tr><th>Framework</th><th>Mapped</th><th>Yes</th><th>Partial</th><th>No</th><th>NA</th><th>Not assessed</th><th>Applicable</th><th>Coverage</th><th>Effective</th><th>Open gaps</th></tr></thead>
          <tbody>${FRAMEWORKS.map(fw => { const c = cw[fw]; return `
            <tr data-fw="${safe(fw)}">
              <td><b>${safe(fw)}</b><small class="dp-muted"> ${safe(FRAMEWORK_FULL[fw] || "")}</small></td>
              <td>${num(c.mapped, fw, "")}</td>
              ${RESPONSES.map(r => `<td>${num(c[r], fw, respKey(r))}</td>`).join("")}
              <td>${c.applicable}</td>
              <td data-col="coverage">${pc(c.coverage)} ${bar(c.coverage)}</td>
              <td data-col="effective">${pc(c.effective)} ${bar(c.effective)}</td>
              <td data-col="gaps" class="${c.openGaps ? "dp-red-t" : ""}">${num(c.openGaps, fw, "No")}</td>
            </tr>`; }).join("")}
          </tbody>
        </table></div>
      </section>
      <section class="card dp-table-card">
        <div class="card-h"><h3>Maturity by domain</h3></div>
        <div class="tw"><table class="t dp-table dp-heat" id="dp-domain-table">
          <thead><tr><th>Domain</th>${RESPONSES.map(r => `<th>${safe(r)}</th>`).join("")}<th>Effective</th></tr></thead>
          <tbody>${DOMAINS.filter(d => dm[d.code] && dm[d.code].mapped).map(d => { const c = dm[d.code]; return `
            <tr><td><span class="dp-dcode">${safe(d.code)}</span> ${safe(d.name)}</td>
              ${RESPONSES.map(r => { const share = c.mapped ? c[r] / c.mapped : 0; return `<td class="dp-heat-c h-${r.replace(/\s/g, "").toLowerCase()}" style="--h:${share.toFixed(2)}">${num(c[r], "domain:" + d.code, respKey(r))}</td>`; }).join("")}
              <td>${pc(c.effective)} ${bar(c.effective)}</td></tr>`; }).join("")}
          </tbody>
        </table></div>
      </section>`}`;
  }
  return { render };
}
