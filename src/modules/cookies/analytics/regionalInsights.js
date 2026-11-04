// Regional and cross-border consent analytics for the Overview & Analytics dashboard.
// Inputs are the real consent receipts (state.consentRecords) and cookie inventory (state.cookies).
// The only non-system data is VENDOR_LOCATIONS, a reference table that is labelled in the UI.

import { REGION_COUNTRY_OPTIONS } from "../cookieData.js";

// Jurisdiction groups match the banner's regional configurations (cookieConfig REGIONS)
export const JURISDICTIONS = {
  "EEA & UK": { law: "GDPR / UK GDPR + ePrivacy", model: "Opt-in" },
  "USA": { law: "CCPA/CPRA & state laws", model: "Opt-out" },
  "India": { law: "DPDP Act 2023", model: "Opt-in" },
  "Global": { law: "Local law (PIPEDA, LGPD, APPI…)", model: "Varies" },
};

// Reference data, not collected by PrivacySEK: where each provider is headquartered.
// "public" = vendor's published HQ; "demo" = assumption for a demo vendor.
// Headquarters is a proxy: actual processing location depends on the vendor's contract.
export const VENDOR_LOCATIONS = {
  "Google Analytics": { country: "United States", entity: "Google LLC", source: "public" },
  "Meta Platforms": { country: "United States", entity: "Meta Platforms, Inc.", source: "public" },
  "The Trade Desk": { country: "United States", entity: "The Trade Desk, Inc.", source: "public" },
  "Clarity Insights": { country: "United States", entity: "Demo analytics vendor", source: "public" },
  "Media CDN": { country: "Singapore", entity: "Demo media CDN", source: "public" },
  "Support Desk": { country: "India", entity: "Demo support vendor", source: "public" },
};

// Transfer-mechanism guidance by origin jurisdiction → destination country (illustrative, not legal advice)
function transferBasis(origin, destCountry) {
  if (origin === "EEA & UK" && destCountry === "United States") return "EU-US DPF / UK Extension if the vendor is certified, otherwise SCCs / IDTA";
  if (origin === "EEA & UK") return "Adequacy decision or SCCs required";
  if (origin === "India") return "Permitted under DPDP s.16 unless the country is restricted";
  if (origin === "USA") return "No general transfer restriction; disclose in notice";
  return "Depends on local law";
}

const COUNTRY_TO_JURISDICTION = (() => {
  const map = {};
  Object.entries(REGION_COUNTRY_OPTIONS).forEach(([jur, list]) => list.forEach(c => { map[c] = jur; }));
  // Plain country names used by receipts but not listed in the banner's option lists
  map["United States"] = "USA";
  map["India"] = "India";
  return map;
})();

const JURISDICTION_OF_DEST = country => COUNTRY_TO_JURISDICTION[country] || "Global";

// A receipt's `region` holds either a visitor country (seeded/real geolocation) or,
// for banner-captured receipts, only the banner jurisdiction.
export function locate(record) {
  const raw = record.region || "";
  // "India" names both a country and a jurisdiction; either way the visitor is in India
  if (raw === "India") return { country: "India", jurisdiction: "India", label: "India" };
  if (JURISDICTIONS[raw]) return { country: null, jurisdiction: raw, label: raw + " (country not captured)" };
  if (!raw) return { country: null, jurisdiction: "Global", label: "Unknown location" };
  return { country: raw, jurisdiction: COUNTRY_TO_JURISDICTION[raw] || "Global", label: raw };
}

// Decision buckets follow common CMP definitions; every rate is a share of all receipts (total choices)
export function decisionOf(action) {
  if (action === "Accept All") return "accept";
  if (action === "Reject All" || action === "Disable All") return "reject";
  if (action === "Customize" || action === "Save Preferences") return "custom";
  if (action === "Do Not Sell") return "optout";
  return "dismiss"; // "Close" and anything unrecognised: no choice made
}

const OPTIONAL_CATEGORIES = ["functional", "analytics", "marketing", "advertising", "social_media"];

function emptyStats() {
  return { total: 0, accept: 0, reject: 0, custom: 0, dismiss: 0, optout: 0, cat: {}, catSeen: {} };
}

function addTo(stats, record) {
  stats.total += 1;
  stats[decisionOf(record.action)] += 1;
  const cats = record.categories || {};
  OPTIONAL_CATEGORIES.forEach(c => {
    if (c in cats) {
      stats.catSeen[c] = (stats.catSeen[c] || 0) + 1;
      if (cats[c]) stats.cat[c] = (stats.cat[c] || 0) + 1;
    }
  });
}

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export function rates(stats) {
  return {
    optIn: pct(stats.accept, stats.total),
    refusal: pct(stats.reject + stats.optout, stats.total),
    custom: pct(stats.custom, stats.total),
    noChoice: pct(stats.dismiss, stats.total),
  };
}

export function computeRegionalInsights(records, cookies) {
  const overall = emptyStats();
  const byCountry = {};
  const byJurisdiction = {};
  let countryKnown = 0;

  // Third-party cookies grouped by category → providers
  const providersByCategory = {};
  (cookies || []).filter(c => c.party === "Third-party").forEach(c => {
    (providersByCategory[c.category] = providersByCategory[c.category] || new Set()).add(c.provider);
  });

  const flows = {}; // "origin|destCountry" → { origin, dest, receipts, vendors:Set }
  const vendorFlows = {}; // provider → { receipts, origins:{} }
  let crossBorderReceipts = 0;
  const crossByOrigin = {};
  const unknownVendors = new Set();

  records.forEach(r => {
    const loc = locate(r);
    if (loc.country) countryKnown += 1;
    addTo(overall, r);
    const key = loc.country || loc.label;
    if (!byCountry[key]) byCountry[key] = { ...emptyStats(), label: key, jurisdiction: loc.jurisdiction, countryKnown: !!loc.country };
    addTo(byCountry[key], r);
    if (!byJurisdiction[loc.jurisdiction]) byJurisdiction[loc.jurisdiction] = emptyStats();
    addTo(byJurisdiction[loc.jurisdiction], r);

    // Cross-border: granted categories → third-party providers → vendor HQ outside the visitor's jurisdiction
    const granted = Object.keys(r.categories || {}).filter(c => r.categories[c] && c !== "necessary");
    let crosses = false;
    granted.forEach(cat => {
      (providersByCategory[cat] || []).forEach(provider => {
        const vendor = VENDOR_LOCATIONS[provider];
        if (!vendor) { unknownVendors.add(provider); return; }
        if (JURISDICTION_OF_DEST(vendor.country) === loc.jurisdiction) return;
        crosses = true;
        const fk = loc.jurisdiction + "|" + vendor.country;
        if (!flows[fk]) flows[fk] = { origin: loc.jurisdiction, dest: vendor.country, receipts: new Set(), vendors: new Set(), demo: false };
        flows[fk].receipts.add(r.id);
        flows[fk].vendors.add(provider);
        if (vendor.source === "demo") flows[fk].demo = true;
        if (!vendorFlows[provider]) vendorFlows[provider] = { provider, ...vendor, receipts: new Set(), origins: {}, categories: new Set() };
        vendorFlows[provider].receipts.add(r.id);
        vendorFlows[provider].categories.add(cat);
        vendorFlows[provider].origins[loc.jurisdiction] = (vendorFlows[provider].origins[loc.jurisdiction] || 0) + 1;
      });
    });
    if (crosses) {
      crossBorderReceipts += 1;
      crossByOrigin[loc.jurisdiction] = (crossByOrigin[loc.jurisdiction] || 0) + 1;
    }
  });

  const overallRates = rates(overall);
  const countries = Object.values(byCountry)
    .map(c => ({ ...c, rates: rates(c), delta: Math.round((rates(c).optIn - overallRates.optIn) * 10) / 10 }))
    .sort((a, b) => b.total - a.total);
  const jurisdictions = Object.keys(JURISDICTIONS)
    .filter(j => byJurisdiction[j])
    .map(j => ({ name: j, ...JURISDICTIONS[j], stats: byJurisdiction[j], rates: rates(byJurisdiction[j]) }));

  return {
    overall,
    overallRates,
    countries,
    jurisdictions,
    countryKnown,
    countryUnknown: records.length - countryKnown,
    cross: {
      receipts: crossBorderReceipts,
      share: pct(crossBorderReceipts, records.length),
      byOrigin: crossByOrigin,
      flows: Object.values(flows)
        .map(f => ({ ...f, receipts: f.receipts.size, vendors: [...f.vendors], basis: transferBasis(f.origin, f.dest) }))
        .sort((a, b) => b.receipts - a.receipts),
      vendors: Object.values(vendorFlows)
        .map(v => ({ ...v, receipts: v.receipts.size, categories: [...v.categories] }))
        .sort((a, b) => b.receipts - a.receipts),
      unknownVendors: [...unknownVendors],
      thirdPartyProviders: new Set(Object.values(providersByCategory).flatMap(set => [...set])).size,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */

// Below this many receipts a location's rates are shown but not compared with the overall rate
const MIN_SAMPLE = 20;

const CATEGORY_LABELS = { functional: "Functional", analytics: "Analytics", marketing: "Marketing", advertising: "Advertising", social_media: "Social Media" };

// `insights` ignores the location filter (so every location stays visible);
// `crossInsights` respects it.
export function renderRegionalPanels({ safe }, insights, crossInsights, { activeRegion, dashboardLink }) {
  const ins = insights;
  const o = ins.overallRates;
  const fmt = n => n.toLocaleString();
  const rateTone = v => (v >= 50 ? "good" : v >= 30 ? "mid" : "low");

  if (!ins.overall.total) {
    return `
      <section class="cc-dashboard-panel cc-geo-panel">
        <div class="cc-dashboard-panel-header"><div><h3>Regional Consent Distribution</h3><p>Consent receipts by visitor location</p></div></div>
        <div class="cc-dashboard-empty">No consent receipts in the selected date range.</div>
      </section>`;
  }

  // --- Country table -------------------------------------------------
  const countryRows = ins.countries.map(c => {
    const r = c.rates;
    const seg = (n, cls, label) => n ? `<span class="${cls}" style="width:${(n / c.total) * 100}%" title="${label}: ${n} (${Math.round(n / c.total * 100)}%)"></span>` : "";
    const delta = c.delta > 0 ? `+${c.delta}` : `${c.delta}`;
    const small = c.total < MIN_SAMPLE;
    const filterArg = c.countryKnown ? c.label : c.jurisdiction;
    const isActive = activeRegion === filterArg;
    return `
      <tr class="${isActive ? "active" : ""}" data-act="cc-dashboard-region" data-arg="${safe(isActive ? "all" : filterArg)}" title="${isActive ? "Clear location filter" : `Filter dashboard to ${safe(c.label)}`}">
        <td>
          <div class="cc-geo-country">${safe(c.label)}</div>
          <div class="cc-geo-sub">${safe(c.jurisdiction)} · ${safe(JURISDICTIONS[c.jurisdiction]?.model || "")}</div>
        </td>
        <td class="num">${fmt(c.total)}</td>
        <td>
          <div class="cc-geo-stack" role="img" aria-label="${safe(c.label)}: ${r.optIn}% accept, ${r.refusal}% refuse, ${r.custom}% customise, ${r.noChoice}% no choice">
            ${seg(c.accept, "accept", "Accept All")}${seg(c.custom, "custom", "Customised")}${seg(c.reject + c.optout, "reject", "Reject / opt-out")}${seg(c.dismiss, "dismiss", "No choice")}
          </div>
        </td>
        <td class="num"><b>${r.optIn}%</b></td>
        <td class="num">${r.refusal}%</td>
        <td class="num">${r.noChoice}%</td>
        <td class="num">${small
          ? `<span class="cc-geo-small" title="Fewer than ${MIN_SAMPLE} receipts: too few to compare">Small sample</span>`
          : `<span class="cc-geo-delta ${c.delta >= 0 ? "up" : "down"}">${delta} pp</span>`}</td>
      </tr>`;
  }).join("");

  const countryPanel = `
    <section class="cc-dashboard-panel cc-geo-panel">
      <div class="cc-dashboard-panel-header">
        <div>
          <h3>Regional Consent Distribution</h3>
          <p>${fmt(ins.overall.total)} receipts by visitor location · select a row to filter the dashboard</p>
        </div>
        <div class="cc-geo-legend">
          <span><i class="accept"></i>Accept All</span><span><i class="custom"></i>Customised</span>
          <span><i class="reject"></i>Reject / opt-out</span><span><i class="dismiss"></i>No choice</span>
        </div>
      </div>
      <div class="cc-geo-summary">
        <div><span>Opt-in rate</span><b>${o.optIn}%</b><small>Accept All ÷ all receipts</small></div>
        <div><span>Refusal rate</span><b>${o.refusal}%</b><small>Reject, Disable All or Do Not Sell</small></div>
        <div><span>Customised</span><b>${o.custom}%</b><small>Save Preferences or Customize</small></div>
        <div><span>No-choice rate</span><b>${o.noChoice}%</b><small>Banner closed without a decision</small></div>
        <div><span>Locations</span><b>${ins.countries.length}</b><small>${fmt(ins.countryKnown)} receipts with a country</small></div>
      </div>
      <div class="cc-geo-table-wrap">
        <table class="cc-geo-table">
          <thead><tr>
            <th scope="col">Visitor location</th><th scope="col" class="num">Receipts</th><th scope="col">Decision mix</th>
            <th scope="col" class="num">Opt-in</th><th scope="col" class="num">Refusal</th><th scope="col" class="num">No choice</th>
            <th scope="col" class="num" title="Opt-in rate compared with the overall opt-in rate, in percentage points">vs overall</th>
          </tr></thead>
          <tbody>${countryRows}</tbody>
        </table>
      </div>
    </section>`;

  // --- Category opt-in by jurisdiction --------------------------------
  const cats = Object.keys(CATEGORY_LABELS).filter(c => ins.jurisdictions.some(j => j.stats.catSeen[c]));
  const jurRows = ins.jurisdictions.map(j => `
    <tr>
      <td>
        <div class="cc-geo-country">${safe(j.name)}</div>
        <div class="cc-geo-sub">${safe(j.law)}</div>
      </td>
      <td class="num">${fmt(j.stats.total)}</td>
      <td class="num"><b>${j.rates.optIn}%</b></td>
      ${cats.map(c => {
        const seen = j.stats.catSeen[c] || 0;
        if (!seen) return `<td class="num"><span class="cc-geo-heat na" title="Category not recorded for this jurisdiction">—</span></td>`;
        const v = pct(j.stats.cat[c] || 0, seen);
        return `<td class="num"><span class="cc-geo-heat ${rateTone(v)}" title="${CATEGORY_LABELS[c]} granted in ${j.stats.cat[c] || 0} of ${seen} receipts">${v}%</span></td>`;
      }).join("")}
    </tr>`).join("");

  const jurisdictionPanel = `
    <section class="cc-dashboard-panel cc-geo-panel">
      <div class="cc-dashboard-panel-header">
        <div>
          <h3>Category Opt-in by Jurisdiction</h3>
          <p>Share of receipts granting each optional category, grouped by the banner's regional rules</p>
        </div>
      </div>
      <div class="cc-geo-table-wrap">
        <table class="cc-geo-table cc-geo-heat-table">
          <thead><tr>
            <th scope="col">Jurisdiction</th><th scope="col" class="num">Receipts</th><th scope="col" class="num">Opt-in</th>
            ${cats.map(c => `<th scope="col" class="num">${CATEGORY_LABELS[c]}</th>`).join("")}
          </tr></thead>
          <tbody>${jurRows}</tbody>
        </table>
      </div>
      <div class="cc-geo-scale"><span class="cc-geo-heat low">&lt; 30%</span><span class="cc-geo-heat mid">30–49%</span><span class="cc-geo-heat good">≥ 50%</span></div>
    </section>`;

  // --- Cross-border ---------------------------------------------------
  const cb = crossInsights.cross;
  const flowRows = cb.flows.map(f => `
    <div class="cc-geo-flow">
      <div class="cc-geo-flow-route">
        <span class="cc-geo-node">${safe(f.origin)}</span>
        <span class="cc-geo-arrow" aria-hidden="true">→</span>
        <span class="cc-geo-node dest">${safe(f.dest)}</span>
        ${f.demo ? '<span class="cc-geo-tag demo" title="At least one vendor on this route has a demo location"></span>' : ""}
      </div>
      <div class="cc-geo-flow-meta">
        <b>${fmt(f.receipts)}</b> receipts · ${safe(f.vendors.join(", "))}
      </div>
      <div class="cc-geo-flow-basis">${safe(f.basis)}</div>
    </div>`).join("");

  const vendorRows = cb.vendors.map(v => `
    <tr>
      <td><div class="cc-geo-country">${safe(v.provider)}</div><div class="cc-geo-sub">${safe(v.entity)}</div></td>
      <td>${safe(v.country)} <span class="cc-geo-tag ${v.source}">${v.source === "public" ? "Public HQ" : "Demo"}</span></td>
      <td>${safe(v.categories.map(c => CATEGORY_LABELS[c] || c).join(", "))}</td>
      <td class="num">${fmt(v.receipts)}</td>
      <td>${Object.entries(v.origins).map(([j, n]) => `<span class="cc-geo-chip">${safe(j)} · ${fmt(n)}</span>`).join("")}</td>
    </tr>`).join("");

  const originChips = Object.entries(cb.byOrigin).map(([j, n]) =>
    `<span class="cc-geo-chip">${safe(j)} · ${fmt(n)}</span>`).join("");

  const crossPanel = `
    <section class="cc-dashboard-panel cc-geo-panel">
      <div class="cc-dashboard-panel-header">
        <div>
          <h3>Cross-border Consent Insights</h3>
          <p>Receipts whose granted categories enable third-party cookies from vendors based outside the visitor's jurisdiction${activeRegion !== "all" ? ` · ${safe(activeRegion)} only` : ""}</p>
        </div>
        ${dashboardLink("Review vendors", "builder:vendors")}
      </div>
      <div class="cc-geo-notice">
        <b>Reference data.</b> Vendor locations are not collected by PrivacySEK. They come from a reference table
        (vendors' public headquarters, or demo assumptions where marked). Headquarters is a proxy: confirm actual
        processing locations in each vendor's DPA. Transfer guidance is illustrative, not legal advice.
      </div>
      ${cb.receipts ? `
        <div class="cc-geo-summary">
          <div><span>Receipts enabling transfers</span><b>${fmt(cb.receipts)}</b><small>${cb.share}% of ${fmt(crossInsights.overall.total)} receipts in view</small></div>
          <div><span>Transfer routes</span><b>${cb.flows.length}</b><small>Origin jurisdiction → vendor country</small></div>
          <div><span>Vendors receiving data</span><b>${cb.vendors.length}</b><small>of ${cb.thirdPartyProviders} third-party providers</small></div>
          <div class="wide"><span>By visitor jurisdiction</span><div class="cc-geo-chips">${originChips}</div></div>
        </div>
        <div class="cc-geo-cross-grid">
          <div>
            <div class="cc-geo-subhead">Transfer routes</div>
            <div class="cc-geo-flows">${flowRows}</div>
          </div>
          <div>
            <div class="cc-geo-subhead">Vendors receiving consented data</div>
            <div class="cc-geo-table-wrap">
              <table class="cc-geo-table">
                <thead><tr><th scope="col">Vendor</th><th scope="col">Location</th><th scope="col">Categories</th><th scope="col" class="num">Receipts</th><th scope="col">From</th></tr></thead>
                <tbody>${vendorRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      ` : `<div class="cc-dashboard-empty">No receipts in view granted a category served by a vendor outside the visitor's jurisdiction.</div>`}
      ${cb.unknownVendors.length ? `<p class="cc-geo-foot">Not counted, location unknown: ${safe(cb.unknownVendors.join(", "))}. Add them to the vendor reference table to include them.</p>` : ""}
    </section>`;

  // --- Data gaps ------------------------------------------------------
  const gaps = [
    ins.countryUnknown
      ? `${fmt(ins.countryUnknown)} receipt${ins.countryUnknown === 1 ? "" : "s"} captured from the banner store only the jurisdiction ("EEA & UK", "USA"…), not the visitor's country. Add IP-based country lookup to consent capture.`
      : "",
    "Banner impressions are not recorded per location, so interaction rate (choices ÷ banners shown) can only be estimated globally from page views.",
    "Consent receipts do not record Global Privacy Control as a separate signal from the Do Not Sell action.",
    "Vendor processing locations and transfer mechanisms (DPF certification, SCCs) are not stored in the inventory.",
  ].filter(Boolean);

  const gapsPanel = `
    <section class="cc-dashboard-panel cc-geo-panel">
      <div class="cc-dashboard-panel-header">
        <div><h3>Data Coverage</h3><p>What these regional metrics can and can't show yet</p></div>
      </div>
      <div class="cc-geo-coverage-wrap">
        <div class="cc-geo-coverage">
          <div><span>Receipts with visitor country</span><b>${pct(ins.countryKnown, ins.overall.total)}%</b></div>
          <div><span>Third-party providers with a known location</span><b>${pct(cb.thirdPartyProviders - cb.unknownVendors.length, cb.thirdPartyProviders)}%</b></div>
        </div>
        <ul class="cc-geo-gaps">${gaps.map(g => `<li>${safe(g)}</li>`).join("")}</ul>
      </div>
    </section>`;

  return countryPanel + jurisdictionPanel + crossPanel + gapsPanel;
}
