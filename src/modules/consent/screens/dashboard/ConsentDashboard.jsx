// Consent Preference dashboard: every figure is computed from state (consent records,
// purposes, preferences, jurisdictions, builder config). Charts are plain HTML/CSS so
// hover tooltips work without JS and colours follow the light/dark tokens in consent.css.

const DECISIONS = [
  { key: 'Accept All', label: 'Accept All', cls: 'accept' },
  { key: 'Partial Consent', label: 'Partial', cls: 'partial' },
  { key: 'Reject All', label: 'Reject All', cls: 'reject' }
];
const DAY = 864e5;
const RENEWAL_WINDOW_DAYS = 30;

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const fmtPct = v => `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;

// Buckets sized to the range: daily up to 30 days, weekly to 90, monthly beyond
function makeBuckets(rangeDays, records, now) {
  let span = rangeDays;
  if (rangeDays >= 9999) {
    const oldest = Math.min(now, ...records.map(r => new Date(r.created).getTime()));
    span = Math.max(30, Math.ceil((now - oldest) / DAY) + 1);
  }
  const unit = span <= 31 ? 1 : span <= 92 ? 7 : 30.4;
  const count = Math.max(2, Math.ceil(span / unit));
  const fmt = new Intl.DateTimeFormat('en-US', unit === 30.4 ? { month: 'short' } : { month: 'short', day: 'numeric' });
  const buckets = Array.from({ length: count }, (_, i) => {
    const end = now - (count - 1 - i) * unit * DAY;
    const start = end - unit * DAY;
    const label = fmt.format(new Date(unit === 30.4 ? end - DAY : start));
    const inBucket = records.filter(r => {
      const t = new Date(r.created).getTime();
      return t > start && t <= end;
    });
    const counts = {};
    DECISIONS.forEach(d => { counts[d.key] = inBucket.filter(r => r.status === d.key).length; });
    return { label, start, end, total: inBucket.length, counts };
  });
  buckets.unit = unit === 1 ? 'day' : unit === 7 ? 'week' : 'month';
  return buckets;
}

export function createDashboardRenderer(context) {
  const { state, ui, DATE_RANGES, safe } = context;

  // Hoverable/focusable wrapper with a CSS tooltip
  const tip = (inner, tipHtml, cls = '') =>
    `<div class="cp-dash-tipwrap ${cls}" tabindex="0">${inner}<div class="cp-dash-tip" role="tooltip">${tipHtml}</div></div>`;

  function segmentedBar(parts, total, ariaLabel) {
    return `
      <div class="cp-dash-seg" role="img" aria-label="${safe(ariaLabel)}">
        ${parts.filter(p => p.count).map(p => {
          const w = (p.count / total) * 100;
          return `<span class="${p.cls}" style="flex:${p.count} 1 0" title="${safe(p.label)}: ${p.count} (${fmtPct(pct(p.count, total))})">
            ${w >= 12 ? `<em>${fmtPct(pct(p.count, total))}</em>` : ''}
          </span>`;
        }).join('')}
      </div>
      <div class="cp-dash-legend">
        ${parts.map(p => `
          <span><i class="${p.cls}"></i>${safe(p.label)} <b>${p.count}</b> <small>${fmtPct(pct(p.count, total))}</small></span>
        `).join('')}
      </div>
    `;
  }

  function rankedBars(rows, { valueLabel, max = 100, act }) {
    return `
      <div class="cp-dash-bars">
        ${rows.map(r => `
          <div class="cp-dash-barrow ${act ? 'is-click' : ''}" ${act ? `data-act="${act}" data-arg="${safe(r.arg ?? r.label)}"` : ''}
            title="${safe(r.title || `${r.label}: ${valueLabel(r)}`)}">
            <span class="cp-dash-barlabel">${safe(r.label)}${r.sub ? `<small>${safe(r.sub)}</small>` : ''}</span>
            <span class="cp-dash-bartrack"><span style="width:${Math.max(r.value ? 2 : 0, (r.value / max) * 100)}%"></span></span>
            <span class="cp-dash-barval">${valueLabel(r)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function delta(curr, prev, { invert = false, unit = 'pp' } = {}) {
    if (prev == null) return '<span class="cp-dash-delta flat">No earlier period</span>';
    const d = Math.round((curr - prev) * 10) / 10;
    if (d === 0) return '<span class="cp-dash-delta flat">No change vs previous</span>';
    const good = invert ? d < 0 : d > 0;
    return `<span class="cp-dash-delta ${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit} vs previous</span>`;
  }

  return function renderDashboard() {
    const rangeDays = ui.range || 365;
    const country = ui.dashCountry || 'all';
    const now = Date.now();
    const inRange = (c, from, to) => {
      const t = new Date(c.created).getTime();
      return t > from && t <= to;
    };
    const byCountry = c => country === 'all' || c.country === country;
    const all = state.consents.filter(byCountry);
    const records = rangeDays >= 9999 ? all : all.filter(c => inRange(c, now - rangeDays * DAY, now));
    const prevRecords = rangeDays >= 9999 ? null : all.filter(c => inRange(c, now - 2 * rangeDays * DAY, now - rangeDays * DAY));
    const total = records.length;

    // Headline metrics (current vs previous period)
    const metrics = list => {
      const n = list.length;
      return {
        n,
        optIn: pct(list.filter(c => c.status === 'Accept All').length, n),
        active: pct(list.filter(c => !c.withdrawn && !c.expired).length, n),
        withdrawn: pct(list.filter(c => c.withdrawn).length, n),
        verified: pct(list.filter(c => c.verified).length, n)
      };
    };
    const m = metrics(records);
    const p = prevRecords && prevRecords.length ? metrics(prevRecords) : null;

    const countries = Array.from(new Set(state.consents.map(c => c.country).filter(Boolean))).sort();

    const header = `
      <div class="cp-header-row">
        <div>
          <h2 class="cp-header-title">Consent Preference Dashboard</h2>
          <p class="cp-dash-sub">${total} consent record${total === 1 ? '' : 's'}${country !== 'all' ? ` from ${safe(country)}` : ''} · computed from Consent Records and the Preference Build Manager</p>
        </div>
        <div class="cp-header-controls">
          <select class="table-filter-select" data-act="cp-set-range" aria-label="Select date range">
            ${DATE_RANGES.map(([d, l]) => `<option value="${d}" ${d === rangeDays ? 'selected' : ''}>${safe(l)}</option>`).join('')}
          </select>
          <select class="table-filter-select" data-act="cp-dash-country" aria-label="Filter by country">
            <option value="all">All countries</option>
            ${countries.map(c => `<option value="${safe(c)}" ${c === country ? 'selected' : ''}>${safe(c)}</option>`).join('')}
          </select>
          ${country !== 'all' ? '<button class="btn sm o" data-act="cp-dash-country" data-arg="all">Clear country</button>' : ''}
          <button class="btn sm" data-act="cp-refresh" title="Refresh dashboard">Refresh</button>
        </div>
      </div>
    `;

    if (!total) {
      return header + `<div class="card cp-dash-empty">No consent records in the selected period${country !== 'all' ? ' for this country' : ''}.</div>`;
    }

    // 1. Stat tiles
    // With no earlier period to compare against, the tile shows the underlying count instead
    const count = (pred, noun) => `<span class="cp-dash-delta flat">${records.filter(pred).length} of ${total} ${noun}</span>`;
    const rangeLabel = (DATE_RANGES.find(([d]) => d === rangeDays) || [0, 'selected period'])[1];
    const tiles = [
      { label: 'Consents recorded', value: String(total), foot: p ? delta(total, p.n, { unit: '' }) : `<span class="cp-dash-delta flat">${safe(rangeLabel)}</span>`, act: 'cp-tab', arg: 'records' },
      { label: 'Opt-in rate', value: fmtPct(m.optIn), foot: p ? delta(m.optIn, p.optIn) : count(r => r.status === 'Accept All', 'accepted all'), help: 'Accept All ÷ all records' },
      { label: 'Active consents', value: fmtPct(m.active), foot: p ? delta(m.active, p.active) : count(r => !r.withdrawn && !r.expired, 'still active'), help: 'Not withdrawn or expired' },
      { label: 'Withdrawal rate', value: fmtPct(m.withdrawn), foot: p ? delta(m.withdrawn, p.withdrawn, { invert: true }) : count(r => r.withdrawn, 'withdrawn'), help: 'Records with consent withdrawn' },
      { label: 'Identity verified', value: fmtPct(m.verified), foot: p ? delta(m.verified, p.verified) : count(r => r.verified, 'verified'), help: 'Verified before consent was recorded' }
    ];
    const tilesHtml = `
      <div class="cp-dash-tiles">
        ${tiles.map(t => `
          <${t.act ? 'button' : 'div'} class="cp-dash-tile" ${t.act ? `data-act="${t.act}" data-arg="${t.arg}" title="Open Consent Records"` : `title="${safe(t.help)}"`}>
            <span class="cp-dash-tile-label">${safe(t.label)}</span>
            <span class="cp-dash-tile-value">${safe(t.value)}</span>
            ${t.foot}
          </${t.act ? 'button' : 'div'}>
        `).join('')}
      </div>
    `;

    // 2. Activity trend: stacked columns per bucket
    const buckets = makeBuckets(rangeDays, records, now);
    const maxBucket = Math.max(1, ...buckets.map(b => b.total));
    const niceMax = maxBucket <= 4 ? 4 : Math.ceil(maxBucket / 4) * 4;
    const labelEvery = Math.ceil(buckets.length / 8);
    const trendHtml = `
      <section class="card cp-dash-card cp-dash-wide">
        <div class="cp-dash-card-h">
          <div><h3>Consent activity</h3><p>New consent records per ${buckets.unit}, split by decision · hover a column for details</p></div>
          <div class="cp-dash-legend inline">
            ${DECISIONS.map(d => `<span><i class="${d.cls}"></i>${d.label}</span>`).join('')}
          </div>
        </div>
        <div class="cp-dash-trend">
          <div class="cp-dash-yaxis">${[niceMax, niceMax / 2, 0].map(v => `<span>${v}</span>`).join('')}</div>
          <div class="cp-dash-plot">
            <div class="cp-dash-gridlines"><i></i><i></i><i></i></div>
            <div class="cp-dash-cols">
              ${buckets.map((b, i) => tip(`
                <div class="cp-dash-col-stack" style="height:${(b.total / niceMax) * 100}%">
                  ${DECISIONS.slice().reverse().map(d => b.counts[d.key] ? `<span class="${d.cls}" style="flex:${b.counts[d.key]} 1 0"></span>` : '').join('')}
                </div>
                <small class="cp-dash-xlabel">${i % labelEvery === 0 || i === buckets.length - 1 ? safe(b.label) : ''}</small>
              `, `<b>${safe(b.label)}</b><span>${b.total} record${b.total === 1 ? '' : 's'}</span>${DECISIONS.map(d => `<span><i class="${d.cls}"></i>${d.label}: ${b.counts[d.key]}</span>`).join('')}`, 'cp-dash-col')).join('')}
            </div>
          </div>
        </div>
        <details class="cp-dash-table">
          <summary>View as table</summary>
          <table>
            <thead><tr><th>Period</th>${DECISIONS.map(d => `<th>${d.label}</th>`).join('')}<th>Total</th></tr></thead>
            <tbody>${buckets.map(b => `<tr><td>${safe(b.label)}</td>${DECISIONS.map(d => `<td>${b.counts[d.key]}</td>`).join('')}<td>${b.total}</td></tr>`).join('')}</tbody>
          </table>
        </details>
      </section>
    `;

    // 3. Decision mix
    const decisionParts = DECISIONS.map(d => ({ ...d, count: records.filter(r => r.status === d.key).length }));
    const decisionHtml = `
      <section class="card cp-dash-card">
        <div class="cp-dash-card-h"><div><h3>Decision mix</h3><p>How principals answered the preference page</p></div></div>
        ${segmentedBar(decisionParts, total, 'Decision mix')}
      </section>
    `;

    // 4. Lifecycle + renewals due
    const withdrawnN = records.filter(r => r.withdrawn).length;
    const expiredN = records.filter(r => r.expired && !r.withdrawn).length;
    const activeList = records.filter(r => !r.withdrawn && !r.expired);
    const validities = state.purposes.filter(pp => pp.status === 'Enabled').map(pp => Number(pp.validity) || 365);
    const validity = validities.length ? Math.min(...validities) : 365;
    const renewals = activeList.filter(r => {
      const ageDays = (now - new Date(r.created).getTime()) / DAY;
      return ageDays >= validity - RENEWAL_WINDOW_DAYS && ageDays < validity;
    }).length;
    const expiries = activeList.map(r => new Date(r.created).getTime() + validity * DAY).filter(t => t > now).sort((a, b) => a - b);
    const nextDue = expiries.length ? new Date(expiries[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    const lifecycleHtml = `
      <section class="card cp-dash-card">
        <div class="cp-dash-card-h"><div><h3>Consent lifecycle</h3><p>Status of the records in this period</p></div></div>
        ${segmentedBar([
          { label: 'Active', cls: 'active', count: activeList.length },
          { label: 'Withdrawn', cls: 'withdrawn', count: withdrawnN },
          { label: 'Expired', cls: 'expired', count: expiredN }
        ], total, 'Consent lifecycle')}
        <div class="cp-dash-callout ${renewals ? 'warn' : ''}">
          <b>${renewals}</b>
          <span>${renewals
            ? `active consent${renewals === 1 ? '' : 's'} reach the ${validity}-day purpose validity within ${RENEWAL_WINDOW_DAYS} days. Plan a re-consent campaign.`
            : `consents due for renewal in the next ${RENEWAL_WINDOW_DAYS} days.${nextDue ? ` The next one reaches the ${validity}-day validity on <b class="cp-dash-inline">${nextDue}</b>.` : ''}`}</span>
        </div>
      </section>
    `;

    // 5. Countries: 100% decision bars, ranked by volume (uses the date range, ignores the country filter)
    const rangeAll = rangeDays >= 9999 ? state.consents : state.consents.filter(c => inRange(c, now - rangeDays * DAY, now));
    const countryRows = countries.map(cn => {
      const list = rangeAll.filter(c => c.country === cn);
      return { cn, n: list.length, counts: DECISIONS.map(d => ({ ...d, count: list.filter(r => r.status === d.key).length })) };
    }).filter(r => r.n).sort((a, b) => b.n - a.n);
    const maxCountry = Math.max(1, ...countryRows.map(r => r.n));
    const countryHtml = `
      <section class="card cp-dash-card">
        <div class="cp-dash-card-h">
          <div><h3>Consents by country</h3><p>Bar length = volume · colours = decision mix · select a country to filter</p></div>
        </div>
        <div class="cp-dash-countries">
          ${countryRows.map(r => `
            <button class="cp-dash-country ${r.cn === country ? 'active' : ''}" data-act="cp-dash-country" data-arg="${safe(r.cn === country ? 'all' : r.cn)}"
              title="${safe(r.cn)}: ${r.n} records · ${r.counts.map(c => `${c.label} ${c.count}`).join(', ')}">
              <span class="cp-dash-barlabel">${safe(r.cn)}</span>
              <span class="cp-dash-country-track">
                <span class="cp-dash-seg mini" style="width:${(r.n / maxCountry) * 100}%">
                  ${r.counts.filter(c => c.count).map(c => `<span class="${c.cls}" style="flex:${c.count} 1 0"></span>`).join('')}
                </span>
              </span>
              <span class="cp-dash-barval">${r.n} <small>${fmtPct(pct(r.counts[0].count, r.n))} opt-in</small></span>
            </button>
          `).join('')}
        </div>
      </section>
    `;

    // 6. Preference opt-in
    const prefNames = Array.from(new Set(records.flatMap(r => (r.preferences || []).map(x => x.name))));
    const prefRows = prefNames.map(name => {
      const withPref = records.filter(r => (r.preferences || []).some(x => x.name === name));
      const allowed = withPref.filter(r => r.preferences.find(x => x.name === name).allowed).length;
      const def = state.preferences.find(x => x.name === name);
      return { label: name, sub: def ? def.channels.join(' · ') : '', value: pct(allowed, withPref.length), allowed, of: withPref.length };
    }).sort((a, b) => b.value - a.value);
    const prefHtml = `
      <section class="card cp-dash-card">
        <div class="cp-dash-card-h"><div><h3>Communication preferences</h3><p>Share of principals who allowed each preference</p></div>
          <button class="cp-dash-link" data-act="cp-open-prefs-modal">Manage →</button></div>
        ${prefRows.length ? rankedBars(prefRows, { valueLabel: r => `${fmtPct(r.value)} <small>${r.allowed}/${r.of}</small>` }) : '<div class="cp-dash-empty">No preferences recorded.</div>'}
      </section>
    `;

    // 7. Legal notice coverage
    const noticeIds = Array.from(new Set(records.flatMap(r => (r.legalNotices || []).map(n => n.identifier))));
    const noticeRows = noticeIds.map(id => {
      const hits = records.filter(r => (r.legalNotices || []).some(n => n.identifier === id));
      const versions = Array.from(new Set(hits.flatMap(r => r.legalNotices.filter(n => n.identifier === id).map(n => n.version))));
      return { label: id, sub: `v${versions.join(', v')}`, value: pct(hits.length, total), n: hits.length };
    }).sort((a, b) => b.value - a.value);
    const noticeHtml = `
      <section class="card cp-dash-card">
        <div class="cp-dash-card-h"><div><h3>Legal notice coverage</h3><p>Share of records that accepted each notice</p></div></div>
        ${noticeRows.length ? rankedBars(noticeRows, { valueLabel: r => `${fmtPct(r.value)} <small>${r.n}/${total}</small>` }) : '<div class="cp-dash-empty">No legal notices recorded.</div>'}
      </section>
    `;

    // 8. Evidence quality
    const withProof = records.filter(r => (r.proofs || []).length).length;
    const privateSrc = records.filter(r => r.source !== 'Public').length;
    const evidenceRows = [
      { label: 'Identity verified', value: m.verified, n: records.filter(r => r.verified).length },
      { label: 'Proof of consent attached', value: pct(withProof, total), n: withProof },
      { label: 'Collected from private source', value: pct(privateSrc, total), n: privateSrc }
    ];
    const evidenceHtml = `
      <section class="card cp-dash-card">
        <div class="cp-dash-card-h"><div><h3>Evidence quality</h3><p>How defensible each record is in an audit</p></div></div>
        ${rankedBars(evidenceRows, { valueLabel: r => `${fmtPct(r.value)} <small>${r.n}/${total}</small>` })}
      </section>
    `;

    // 9. Setup at a glance (configuration, not filtered)
    const enabledPurposes = state.purposes.filter(pp => pp.status === 'Enabled');
    const enabledPrefs = state.preferences.filter(pp => pp.status === 'Enabled');
    const regions = new Set(state.jurisdictions.flatMap(j => j.regions || []));
    const activeWf = (state.workflows || []).filter(w => w.status === 'Active').length;
    const b = state.builder || {};
    const setup = [
      { label: 'Purposes live', value: `${enabledPurposes.length}/${state.purposes.length}`, sub: `${enabledPurposes.filter(pp => pp.essential).length} essential`, tab: 'builder' },
      { label: 'Preferences live', value: `${enabledPrefs.length}/${state.preferences.length}`, sub: `${new Set(enabledPrefs.flatMap(pp => pp.channels)).size} channels`, tab: 'builder' },
      { label: 'Jurisdictions', value: String(state.jurisdictions.length), sub: `${regions.size} regions covered`, tab: 'jurisdictions' },
      { label: 'Languages', value: String((b.languages || []).length), sub: b.settings?.autoTranslate ? 'Auto-translate on' : 'Manual translation', tab: 'builder' },
      { label: 'Workflows active', value: `${activeWf}/${(state.workflows || []).length}`, sub: 'Downstream sync', tab: 'workflows' },
      { label: 'Preference page', value: b.dirty ? 'Draft' : 'Published', sub: b.history?.[0] ? `v${b.history[0].v}` : '—', tab: 'builder', warn: b.dirty }
    ];
    const setupHtml = `
      <section class="card cp-dash-card cp-dash-wide">
        <div class="cp-dash-card-h"><div><h3>Setup at a glance</h3><p>Current configuration (not affected by the filters)</p></div></div>
        <div class="cp-dash-setup">
          ${setup.map(s => `
            <button class="cp-dash-setup-item ${s.warn ? 'warn' : ''}" data-act="cp-tab" data-arg="${s.tab}">
              <span>${safe(s.label)}</span><b>${safe(s.value)}</b><small>${safe(s.sub)}</small>
            </button>
          `).join('')}
        </div>
      </section>
    `;

    return `
      <div class="cp-dash">
        ${header}
        ${tilesHtml}
        <div class="cp-dash-grid">
          ${trendHtml}
          ${decisionHtml}
          ${lifecycleHtml}
          ${countryHtml}
          ${prefHtml}
          ${noticeHtml}
          ${evidenceHtml}
          ${setupHtml}
        </div>
      </div>
    `;
  };
}
