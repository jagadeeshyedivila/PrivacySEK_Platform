export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

function renderDashboardModule() {
  const rangeDays = Number(ui.dashboardRange || 30);
  const region = ui.dashboardRegion || "all";
  const rangeStart = new Date();
  rangeStart.setUTCHours(0, 0, 0, 0);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - rangeDays + 1);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + rangeDays);
  const inRange = value => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= rangeStart.getTime() && time < rangeEnd.getTime();
  };
  const records = (state.consentRecords || []).filter(record =>
    inRange(record.timestamp) && (region === "all" || record.region === region)
  );
  const pageViews = (state.pageViews || []).filter(view => inRange(`${view.date}T00:00:00.000Z`));
  const acceptCount = records.filter(record => record.action === "Accept All").length;
  const declineCount = records.filter(record => ["Reject All", "Disable All"].includes(record.action)).length;
  const customizedCount = records.filter(record => ["Customize", "Save Preferences"].includes(record.action)).length;
  const dismissedCount = records.filter(record => record.action === "Close").length;
  const optOutCount = records.filter(record => record.action === "Do Not Sell").length;
  const percentage = count => records.length ? Math.round(count / records.length * 100) : 0;
  const cookies = state.cookies || [];
  const unclassifiedCookies = cookies.filter(cookie =>
    cookie.classificationStatus === "Review required" || cookie.category === "unclassified"
  );
  const reviewKeys = new Set(
    [...(state.reviewQueue || []), ...unclassifiedCookies]
      .map(cookie => `${cookie.name || cookie.id}|${cookie.domain || ""}`)
  );
  const pendingReviewCount = reviewKeys.size;
  const scans = state.scans || [];
  const latestScan = scans.slice().sort((a, b) =>
    new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0)
  )[0];
  const referenceCookieCount = new Set(scans.flatMap(scan => scan.cookieIds || [])).size;
  const enabledTags = (state.blockedTags || []).filter(tag => tag.status === "Enabled").length;
  const disabledTags = (state.blockedTags || []).filter(tag => tag.status !== "Enabled").length;
  const latestVersion = (state.versions || []).slice().sort((a, b) => b.version - a.version)[0];
  const hasUnpublishedChanges = JSON.stringify(state.draft) !== JSON.stringify(state.published);
  const publishDate = latestVersion?.publishedAt ? dateLabel(latestVersion.publishedAt) : "Not published";
  const pendingIssues = [];
  if (pendingReviewCount) {
    pendingIssues.push({
      tone: "warning",
      title: `${pendingReviewCount} cookie${pendingReviewCount === 1 ? "" : "s"} need classification review`,
      detail: "Review unclassified inventory items before relying on category-based consent rules.",
      target: "inventory",
    });
  }
  if (hasUnpublishedChanges) {
    pendingIssues.push({
      tone: "warning",
      title: "Banner draft differs from the published version",
      detail: "Configuration changes are saved in the working draft but are not part of the current published version.",
      target: "builder",
    });
  }
  const failedPages = Number(latestScan?.failedPages || 0);
  const scanErrors = latestScan?.errors?.length || 0;
  if (latestScan && (failedPages || scanErrors)) {
    pendingIssues.push({
      tone: "warning",
      title: "The latest scan reported incomplete coverage",
      detail: `${failedPages} failed page${failedPages === 1 ? "" : "s"}${scanErrors ? ` and ${scanErrors} scan error${scanErrors === 1 ? "" : "s"}` : ""}.`,
      target: "scanner",
    });
  }

  const bucketCount = Math.min(rangeDays, 14);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    decisions: 0,
    views: 0,
    label: "",
    title: "",
  }));
  const bucketIndex = value => {
    const time = new Date(value).getTime();
    return Math.max(0, Math.min(bucketCount - 1, Math.floor((time - rangeStart.getTime()) / (rangeDays * 86400000) * bucketCount)));
  };
  records.forEach(record => { buckets[bucketIndex(record.timestamp)].decisions += 1; });
  pageViews.forEach(view => { buckets[bucketIndex(`${view.date}T00:00:00.000Z`)].views += Number(view.count) || 0; });
  const intervalLabel = (index, total) => {
    const start = new Date(rangeStart.getTime() + index * rangeDays / total * 86400000);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(start);
  };
  buckets.forEach((bucket, index) => {
    bucket.label = intervalLabel(index, bucketCount);
    bucket.title = `${bucket.label}: ${bucket.decisions.toLocaleString()} consent receipts, ${bucket.views.toLocaleString()} page views`;
  });
  const maxDecisions = Math.max(1, ...buckets.map(bucket => bucket.decisions));
  const maxViews = Math.max(1, ...buckets.map(bucket => bucket.views));
  const trendBars = buckets.map(bucket => `
    <div class="cc-dashboard-trend-column" title="${safe(bucket.title)}">
      <div class="cc-dashboard-trend-bars">
        <span class="decisions" style="height:${bucket.decisions ? Math.max(3, bucket.decisions / maxDecisions * 100) : 0}%"></span>
        <span class="views" style="height:${bucket.views ? Math.max(3, bucket.views / maxViews * 100) : 0}%"></span>
      </div>
      <small>${safe(bucket.label)}</small>
    </div>
  `).join("");
  const choiceRows = [
    ["Accept All", acceptCount, "accept"],
    ["Reject / Disable All", declineCount, "decline"],
    ["Customize / Save Preferences", customizedCount, "customize"],
    ["Dismissed", dismissedCount, "dismissed"],
    ["Do Not Sell", optOutCount, "optout"],
  ].map(([label, count, tone]) => `
    <div class="cc-dashboard-choice-row">
      <div class="cc-dashboard-choice-label"><span>${safe(label)}</span><b>${count.toLocaleString()} <small>${percentage(count)}%</small></b></div>
      <div class="cc-dashboard-meter"><span class="${tone}" style="width:${percentage(count)}%"></span></div>
    </div>
  `).join("");
  const regionOptions = [...new Set((state.consentRecords || []).map(record => record.region).filter(Boolean))].sort();
  const dashboardLink = (label, target, section = "") => `
    <button class="cc-dashboard-link" data-act="cc-dashboard-go" data-arg="${target}${section ? `:${section}` : ""}">
      ${safe(label)} <span aria-hidden="true">→</span>
    </button>
  `;
  const statusRow = (title, stateLabel, description, tone, target, section = "") => `
    <div class="cc-dashboard-status-row">
      <div class="cc-dashboard-status-copy">
        <strong>${safe(title)}</strong>
        <span>${safe(description)}</span>
      </div>
      <span class="cc-dashboard-status-pill ${tone}">${safe(stateLabel)}</span>
      ${dashboardLink("Open", target, section)}
    </div>
  `;

  return `
    <section class="cc-dashboard">
      <header class="cc-dashboard-header">
        <div>
          <div class="cc-dashboard-eyebrow">Cookie Consent</div>
          <h2>Overview &amp; Analytics</h2>
          <p>Consent activity and operational status from the current Cookie Consent records.</p>
        </div>
        <div class="cc-dashboard-filters" aria-label="Dashboard filters">
          <label>
            <span>Date range</span>
            <select data-act="cc-dashboard-range" aria-label="Filter dashboard date range">
              <option value="7" ${rangeDays === 7 ? "selected" : ""}>Last 7 days</option>
              <option value="30" ${rangeDays === 30 ? "selected" : ""}>Last 30 days</option>
              <option value="90" ${rangeDays === 90 ? "selected" : ""}>Last 90 days</option>
            </select>
          </label>
          <label>
            <span>Consent region</span>
            <select data-act="cc-dashboard-region" aria-label="Filter consent region">
              <option value="all" ${region === "all" ? "selected" : ""}>All regions</option>
              ${regionOptions.map(option => `<option value="${safe(option)}" ${region === option ? "selected" : ""}>${safe(option)}</option>`).join("")}
            </select>
          </label>
        </div>
      </header>

      <div class="cc-dashboard-filter-note">
        Consent receipts use both filters. Page-view totals use the selected date range only; page-view records do not include region data.
      </div>

      <div class="cc-dashboard-kpis">
        <button class="cc-dashboard-kpi" data-act="cc-dashboard-go" data-arg="records">
          <span>Consent receipts</span><strong>${records.length.toLocaleString()}</strong><small>${rangeDays} days${region !== "all" ? ` · ${safe(region)}` : " · all regions"}</small>
        </button>
        <button class="cc-dashboard-kpi" data-act="cc-dashboard-go" data-arg="records">
          <span>Accept All rate</span><strong>${percentage(acceptCount)}%</strong><small>${acceptCount.toLocaleString()} of ${records.length.toLocaleString()} receipts</small>
        </button>
        <button class="cc-dashboard-kpi" data-act="cc-dashboard-go" data-arg="inventory">
          <span>Cookies in inventory</span><strong>${cookies.length.toLocaleString()}</strong><small>${referenceCookieCount.toLocaleString()} existing records referenced in preview history</small>
        </button>
        <button class="cc-dashboard-kpi ${pendingReviewCount ? "attention" : ""}" data-act="cc-dashboard-go" data-arg="inventory">
          <span>Classification review</span><strong>${pendingReviewCount.toLocaleString()}</strong><small>${pendingReviewCount ? "Pending review items" : "No unclassified inventory items"}</small>
        </button>
      </div>

      <div class="cc-dashboard-grid">
        <section class="cc-dashboard-panel cc-dashboard-trend-panel">
          <div class="cc-dashboard-panel-header">
            <div><h3>Activity trend</h3><p>${rangeDays} day view · independent scales</p></div>
            <div class="cc-dashboard-legend"><span class="decisions"></span>Consent receipts <span class="views"></span>Page views</div>
          </div>
          ${records.length || pageViews.length ? `
            <div class="cc-dashboard-trend-chart" role="img" aria-label="Consent receipts and page views trend for the selected date range">
              ${trendBars}
            </div>
          ` : `<div class="cc-dashboard-empty">No activity is available for this range.</div>`}
          <div class="cc-dashboard-trend-summary">
            <span><b>${records.length.toLocaleString()}</b> consent receipts</span>
            <span><b>${pageViews.reduce((sum, view) => sum + (Number(view.count) || 0), 0).toLocaleString()}</b> page views</span>
          </div>
        </section>

        <section class="cc-dashboard-panel">
          <div class="cc-dashboard-panel-header">
            <div><h3>Visitor choices</h3><p>Share of filtered consent receipts</p></div>
            ${dashboardLink("View records", "records")}
          </div>
          ${records.length ? `<div class="cc-dashboard-choices">${choiceRows}</div>` : `<div class="cc-dashboard-empty">No consent receipts match the selected filters.</div>`}
        </section>

        <section class="cc-dashboard-panel">
          <div class="cc-dashboard-panel-header">
            <div><h3>Discovery &amp; blocking</h3><p>Latest scan preview and configured tag rules</p></div>
          </div>
          <div class="cc-dashboard-stat-list">
            <div><span>Latest preview</span><b>${safe(latestScan ? latestScan.status === "Completed" ? "Preview complete" : latestScan.status === "Running" ? "Preview running" : latestScan.status : "No previews yet")}</b></div>
            <div><span>Scan page scope</span><b>${latestScan ? latestScan.type === "Deep Scan" ? "No page cap" : `Custom · up to ${Number(latestScan.pagesAttempted) || 0} pages` : "—"}</b></div>
            <div><span>Reference inventory records</span><b>${referenceCookieCount.toLocaleString()}</b></div>
            <div><span>Blocking rules enabled</span><b>${enabledTags} of ${(state.blockedTags || []).length}</b></div>
            ${disabledTags ? `<div><span>Disabled rules</span><b>${disabledTags}</b></div>` : ""}
          </div>
          <div class="cc-dashboard-panel-actions">
            ${dashboardLink("Open scanner", "scanner")}
            ${dashboardLink("Manage inventory", "inventory")}
            ${dashboardLink("Manage blocking", "blocking")}
          </div>
        </section>

        <section class="cc-dashboard-panel">
          <div class="cc-dashboard-panel-header">
            <div><h3>Configuration states</h3><p>Configured, published, and verified are reported separately</p></div>
          </div>
          <div class="cc-dashboard-status-list">
            ${statusRow(
              "Banner configuration",
              hasUnpublishedChanges ? "Draft changed" : latestVersion ? `Published v${latestVersion.version}` : "Not published",
              latestVersion ? `Last publication: ${publishDate}${hasUnpublishedChanges ? " · draft differs from published" : ""}` : "No published version is recorded.",
              hasUnpublishedChanges ? "warning" : latestVersion ? "good" : "neutral",
              "builder"
            )}
            ${statusRow(
              "Automatic blocking",
              enabledTags ? `${enabledTags} enabled` : "No enabled rules",
              `${(state.blockedTags || []).length} configured rule${(state.blockedTags || []).length === 1 ? "" : "s"} · runtime blocking verification is not recorded`,
              enabledTags ? "good" : "neutral",
              "blocking"
            )}
            ${statusRow(
              "Implementation",
              "Snippet available",
              "The install snippet is available; deployment verification is not tracked.",
              "neutral",
              "install"
            )}
            ${statusRow(
              "Cookie scanner",
              latestScan ? latestScan.status === "Completed" ? "Preview complete" : latestScan.status === "Running" ? "Preview running" : latestScan.status : "Not run",
              latestScan ? `Local preview only; no website pages were visited. Last preview ${dateLabel(latestScan.completedAt || latestScan.createdAt)}.` : "No preview activity is recorded.",
              "neutral",
              "scanner"
            )}
          </div>
        </section>

        <section class="cc-dashboard-panel cc-dashboard-issues ${pendingIssues.length ? "has-issues" : ""}">
          <div class="cc-dashboard-panel-header">
            <div><h3>Needs attention</h3><p>Items inferred from the current Cookie Consent records</p></div>
            <span class="cc-dashboard-issue-count">${pendingIssues.length} ${pendingIssues.length === 1 ? "item" : "items"}</span>
          </div>
          ${pendingIssues.length ? `
            <div class="cc-dashboard-issue-list">
              ${pendingIssues.map(issue => `
                <div class="cc-dashboard-issue">
                  <span class="cc-dashboard-issue-mark ${issue.tone}" aria-hidden="true">!</span>
                  <div><strong>${safe(issue.title)}</strong><small>${safe(issue.detail)}</small></div>
                  ${dashboardLink("Review", issue.target)}
                </div>
              `).join("")}
            </div>
          ` : `<div class="cc-dashboard-empty">No pending review items or unpublished banner changes are present in the current Cookie Consent state.</div>`}
        </section>
      </div>
    </section>
  `;
}

  return { renderDashboardModule };
}
