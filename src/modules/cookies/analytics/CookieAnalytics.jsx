export function createRenderer(context) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
  } = context;

  const CATEGORY_META = {
    necessary: { name: "Strictly Necessary", color: "#3b82f6" },
    functional: { name: "Functional", color: "#10b981" },
    analytics: { name: "Analytics", color: "#8b5cf6" },
    marketing: { name: "Marketing", color: "#f59e0b" },
    advertising: { name: "Advertising", color: "#ec4899" },
    social_media: { name: "Social Media", color: "#06b6d4" },
    unclassified: { name: "Unclassified", color: "#ef4444" },
  };

  function extractDomain(urlOrDomain) {
    if (!urlOrDomain) return "";
    try {
      if (urlOrDomain.startsWith("http://") || urlOrDomain.startsWith("https://")) {
        return new URL(urlOrDomain).hostname.replace(/^www\./, "").toLowerCase();
      }
      return urlOrDomain.replace(/^\./, "").replace(/^www\./, "").toLowerCase();
    } catch {
      return String(urlOrDomain).toLowerCase();
    }
  }

  function renderDashboardModule() {
    // 1. Filter configuration
    const rangeSetting = ui.dashboardRange || 30;
    const isAllTime = rangeSetting === "all";
    const rangeDays = isAllTime ? 365 : Number(rangeSetting);
    const activeRegion = ui.dashboardRegion || "all";
    const activeScanType = ui.dashboardScanType || "all";
    const activeDomain = ui.dashboardDomain || "all";
    const activeCategory = ui.dashboardCategory || "all";

    const hasActiveFilters = Boolean(
      (ui.dashboardRange && ui.dashboardRange !== 30) ||
      (activeScanType !== "all") ||
      (activeDomain !== "all") ||
      (activeCategory !== "all") ||
      (activeRegion !== "all")
    );

    // 2. Date range calculation
    const now = new Date();
    const rangeStart = new Date();
    if (!isAllTime) {
      rangeStart.setUTCHours(0, 0, 0, 0);
      rangeStart.setUTCDate(rangeStart.getUTCDate() - rangeDays + 1);
    } else {
      rangeStart.setTime(0);
    }
    const rangeEnd = new Date();
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const inDateRange = timestamp => {
      if (isAllTime) return true;
      if (!timestamp) return false;
      const t = new Date(timestamp).getTime();
      return Number.isFinite(t) && t >= rangeStart.getTime() && t <= rangeEnd.getTime();
    };

    // 3. Collect all unique domains from Scans & Inventory
    const allDomainsSet = new Set();
    (state.scans || []).forEach(s => {
      const d = extractDomain(s.url);
      if (d) allDomainsSet.add(d);
    });
    (state.cookies || []).forEach(c => {
      const d = extractDomain(c.domain);
      if (d) allDomainsSet.add(d);
    });
    const availableDomains = [...allDomainsSet].sort();

    // 4. Domain & Scan Type Matchers
    const matchesDomain = val => {
      if (activeDomain === "all") return true;
      if (!val) return false;
      const d = extractDomain(val);
      return d === activeDomain || d.endsWith(`.${activeDomain}`) || String(val).toLowerCase().includes(activeDomain.toLowerCase());
    };

    const matchesScanType = type => {
      if (activeScanType === "all") return true;
      if (activeScanType === "Deep Scan") return type === "Deep Scan";
      if (activeScanType === "Custom Scan") return type === "Custom Scan" || (type && type !== "Deep Scan");
      return type === activeScanType;
    };

    const matchesCategory = cookie => {
      if (activeCategory === "all") return true;
      if (activeCategory === "unclassified") {
        return cookie.category === "unclassified" || cookie.classificationStatus === "Review required" || !cookie.category;
      }
      return cookie.category === activeCategory;
    };

    // 5. Filtered Datasets
    const rawScans = state.scans || [];
    const filteredScans = rawScans.filter(s =>
      inDateRange(s.createdAt || s.completedAt) &&
      matchesScanType(s.type) &&
      matchesDomain(s.url)
    );

    const rawCookies = state.cookies || [];
    const filteredCookies = rawCookies.filter(c =>
      matchesCategory(c) &&
      matchesDomain(c.domain || c.provider || "")
    );

    const rawRecords = state.consentRecords || [];
    const filteredRecords = rawRecords.filter(r =>
      inDateRange(r.timestamp) &&
      (activeRegion === "all" || r.region === activeRegion) &&
      matchesDomain(r.property || "")
    );

    const pageViews = (state.pageViews || []).filter(view => inDateRange(`${view.date}T00:00:00.000Z`));

    // 6. Aggregate KPI Metrics
    const totalScans = filteredScans.length;
    const completedScans = filteredScans.filter(s => s.status === "Completed").length;
    const failedScans = filteredScans.filter(s => s.status === "Failed").length;
    const runningScans = filteredScans.filter(s => s.status === "Running").length;

    const deepScansCount = filteredScans.filter(s => s.type === "Deep Scan").length;
    const deepScansPct = totalScans ? Math.round(deepScansCount / totalScans * 100) : 0;

    const customScansCount = filteredScans.filter(s => s.type === "Custom Scan" || (s.type && s.type !== "Deep Scan")).length;
    const customScansPct = totalScans ? Math.round(customScansCount / totalScans * 100) : 0;

    const totalInventoryCookies = filteredCookies.length;
    const totalScannedCookies = filteredScans.reduce((sum, s) => sum + (Number(s.cookiesCount) || 0), 0);
    const totalPagesScanned = filteredScans.reduce((sum, s) => sum + (Number(s.pagesScanned) || 0), 0);

    const firstPartyCount = filteredCookies.filter(c => c.party === "First-party").length;
    const thirdPartyCount = filteredCookies.filter(c => c.party === "Third-party").length;
    const fpPct = totalInventoryCookies ? Math.round(firstPartyCount / totalInventoryCookies * 100) : 0;
    const tpPct = totalInventoryCookies ? Math.round(thirdPartyCount / totalInventoryCookies * 100) : 0;

    const pendingInventoryCount = filteredCookies.filter(c =>
      c.classificationStatus === "Review required" || c.category === "unclassified" || !c.category
    ).length;
    const pendingScansCount = filteredScans.reduce((sum, s) => sum + (Number(s.unclassifiedCount) || 0), 0);

    // 7. Consent decisions aggregation
    const acceptCount = filteredRecords.filter(r => r.action === "Accept All").length;
    const declineCount = filteredRecords.filter(r => ["Reject All", "Disable All"].includes(r.action)).length;
    const customizedCount = filteredRecords.filter(r => ["Customize", "Save Preferences"].includes(r.action)).length;
    const dismissedCount = filteredRecords.filter(r => r.action === "Close").length;
    const optOutCount = filteredRecords.filter(r => r.action === "Do Not Sell").length;
    const percentage = count => filteredRecords.length ? Math.round(count / filteredRecords.length * 100) : 0;

    // 8. Latest scan details & issues
    const latestScan = filteredScans.slice().sort((a, b) =>
      new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0)
    )[0];

    const enabledTags = (state.blockedTags || []).filter(tag => tag.status === "Enabled").length;
    const disabledTags = (state.blockedTags || []).filter(tag => tag.status !== "Enabled").length;
    const latestVersion = (state.versions || []).slice().sort((a, b) => b.version - a.version)[0];
    const hasUnpublishedChanges = JSON.stringify(state.draft) !== JSON.stringify(state.published);
    const publishDate = latestVersion?.publishedAt ? dateLabel(latestVersion.publishedAt) : "Not published";

    const pendingIssues = [];
    if (pendingInventoryCount || pendingScansCount) {
      pendingIssues.push({
        tone: "warning",
        title: `${pendingInventoryCount || pendingScansCount} cookie${(pendingInventoryCount || pendingScansCount) === 1 ? "" : "s"} require classification review`,
        detail: "Review unclassified inventory items before deploying category-specific blocking rules.",
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

    // 9. Chart 1: Scan Activity Over Time
    const bucketCount = 14;
    const scanBuckets = Array.from({ length: bucketCount }, () => ({
      deep: 0,
      custom: 0,
      pages: 0,
      label: "",
      title: "",
    }));

    let minScanTime = rangeStart.getTime();
    let maxScanTime = rangeEnd.getTime();
    if (isAllTime && filteredScans.length > 0) {
      const times = filteredScans.map(s => new Date(s.createdAt || s.completedAt || now).getTime()).filter(Number.isFinite);
      if (times.length) {
        minScanTime = Math.min(...times);
        maxScanTime = Math.max(...times, minScanTime + 86400000);
      }
    }
    const scanTimeSpan = Math.max(86400000, maxScanTime - minScanTime);

    const getScanBucketIndex = timestamp => {
      const t = new Date(timestamp).getTime();
      if (!Number.isFinite(t)) return 0;
      return Math.max(0, Math.min(bucketCount - 1, Math.floor((t - minScanTime) / scanTimeSpan * bucketCount)));
    };

    filteredScans.forEach(s => {
      const bIdx = getScanBucketIndex(s.createdAt || s.completedAt || now);
      if (s.type === "Deep Scan") {
        scanBuckets[bIdx].deep += 1;
      } else {
        scanBuckets[bIdx].custom += 1;
      }
      scanBuckets[bIdx].pages += (Number(s.pagesScanned) || 1);
    });

    scanBuckets.forEach((bucket, index) => {
      const bucketDate = new Date(minScanTime + (index / bucketCount) * scanTimeSpan);
      bucket.label = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(bucketDate);
      const totalInBucket = bucket.deep + bucket.custom;
      bucket.title = `${bucket.label}: ${totalInBucket} scan${totalInBucket === 1 ? "" : "s"} (${bucket.deep} Deep, ${bucket.custom} Custom) · ${bucket.pages} pages visited`;
    });

    const maxBucketScans = Math.max(1, ...scanBuckets.map(b => b.deep + b.custom));
    const scanTrendBars = scanBuckets.map(b => {
      const totalInBucket = b.deep + b.custom;
      const totalHeight = totalInBucket ? (totalInBucket / maxBucketScans * 100) : 0;
      const deepHeight = totalInBucket ? (b.deep / totalInBucket * 100) : 0;
      const customHeight = totalInBucket ? (b.custom / totalInBucket * 100) : 0;

      return `
        <div class="cc-dashboard-trend-column" title="${safe(b.title)}">
          <div class="cc-dashboard-trend-bars">
            <span class="deep" style="height:${b.deep ? Math.max(4, b.deep / maxBucketScans * 100) : 0}%"></span>
            <span class="custom" style="height:${b.custom ? Math.max(4, b.custom / maxBucketScans * 100) : 0}%"></span>
          </div>
          <small>${safe(b.label)}</small>
        </div>
      `;
    }).join("");

    // 10. Chart 2: Category-wise Cookie Distribution
    const categoryCounts = {};
    Object.keys(CATEGORY_META).forEach(catId => {
      categoryCounts[catId] = 0;
    });

    filteredCookies.forEach(c => {
      const catKey = (c.classificationStatus === "Review required" || c.category === "unclassified" || !c.category)
        ? "unclassified"
        : (c.category in CATEGORY_META ? c.category : "unclassified");
      categoryCounts[catKey] = (categoryCounts[catKey] || 0) + 1;
    });

    const categorySegmentsHtml = Object.entries(CATEGORY_META).map(([catId, meta]) => {
      const count = categoryCounts[catId] || 0;
      if (!count || !totalInventoryCookies) return "";
      const pct = Math.round(count / totalInventoryCookies * 100);
      return `
        <div class="cc-dashboard-dist-bar-seg" style="width:${pct}%;background:${meta.color};" title="${safe(meta.name)}: ${count} (${pct}%)"></div>
      `;
    }).join("");

    const categoryRowsHtml = Object.entries(CATEGORY_META).map(([catId, meta]) => {
      const count = categoryCounts[catId] || 0;
      const pct = totalInventoryCookies ? Math.round(count / totalInventoryCookies * 100) : 0;
      const isSelected = activeCategory === catId;

      return `
        <div class="cc-dashboard-dist-item ${isSelected ? 'active' : ''}" data-act="cc-dashboard-filter-category" data-arg="${catId}" role="button" tabindex="0" title="Click to filter by ${safe(meta.name)}">
          <div class="cc-dashboard-dist-header">
            <div class="cc-dashboard-dist-left">
              <span class="cc-dashboard-dist-dot" style="background:${meta.color};"></span>
              <strong>${safe(meta.name)}</strong>
              ${catId === "marketing" ? `<span class="badge sm" style="font-size:9px;padding:1px 5px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">New</span>` : ""}
            </div>
            <div class="cc-dashboard-dist-right">
              <span class="cc-dashboard-dist-count">${count.toLocaleString()}</span>
              <span class="cc-dashboard-dist-pct">${pct}%</span>
            </div>
          </div>
          <div class="cc-dashboard-dist-meter">
            <span style="width:${pct}%;background:${meta.color};"></span>
          </div>
        </div>
      `;
    }).join("");

    // 11. Visitor Choices Rows
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
            <p>Aggregated scan telemetry, cookie inventory taxonomy, and consent audit metrics.</p>
          </div>
          <div class="cc-dashboard-filters" aria-label="Dashboard filters">
            <label>
              <span>Date range</span>
              <select data-act="cc-dashboard-range" aria-label="Filter dashboard date range">
                <option value="7" ${rangeSetting === 7 ? "selected" : ""}>Last 7 days</option>
                <option value="30" ${rangeSetting === 30 ? "selected" : ""}>Last 30 days</option>
                <option value="90" ${rangeSetting === 90 ? "selected" : ""}>Last 90 days</option>
                <option value="all" ${rangeSetting === "all" ? "selected" : ""}>All time</option>
              </select>
            </label>
            <label>
              <span>Scan type</span>
              <select data-act="cc-dashboard-scantype" aria-label="Filter scan type">
                <option value="all" ${activeScanType === "all" ? "selected" : ""}>All Scan Types</option>
                <option value="Deep Scan" ${activeScanType === "Deep Scan" ? "selected" : ""}>Deep Scan</option>
                <option value="Custom Scan" ${activeScanType === "Custom Scan" ? "selected" : ""}>Custom Scan</option>
              </select>
            </label>
            <label>
              <span>Website / Domain</span>
              <select data-act="cc-dashboard-domain" aria-label="Filter website or domain">
                <option value="all" ${activeDomain === "all" ? "selected" : ""}>All Websites &amp; Domains</option>
                ${availableDomains.map(d => `<option value="${safe(d)}" ${activeDomain === d ? "selected" : ""}>${safe(d)}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Cookie category</span>
              <select data-act="cc-dashboard-category" aria-label="Filter cookie category">
                <option value="all" ${activeCategory === "all" ? "selected" : ""}>All Categories</option>
                <option value="necessary" ${activeCategory === "necessary" ? "selected" : ""}>Strictly Necessary</option>
                <option value="functional" ${activeCategory === "functional" ? "selected" : ""}>Functional</option>
                <option value="analytics" ${activeCategory === "analytics" ? "selected" : ""}>Analytics</option>
                <option value="marketing" ${activeCategory === "marketing" ? "selected" : ""}>Marketing</option>
                <option value="advertising" ${activeCategory === "advertising" ? "selected" : ""}>Advertising</option>
                <option value="social_media" ${activeCategory === "social_media" ? "selected" : ""}>Social Media</option>
                <option value="unclassified" ${activeCategory === "unclassified" ? "selected" : ""}>Unclassified</option>
              </select>
            </label>
            ${hasActiveFilters ? `
              <button class="btn sm t cc-dashboard-reset-btn" data-act="cc-dashboard-reset-filters" title="Reset all filters to defaults">
                Reset Filters
              </button>
            ` : ''}
          </div>
        </header>

        <div class="cc-dashboard-filter-note">
          Displaying verified metrics aggregated across ${totalScans.toLocaleString()} website scans and ${totalInventoryCookies.toLocaleString()} inventory cookies. ${hasActiveFilters ? "Active filters applied." : "All filters at default."}
        </div>

        <!-- 6 Requested KPI Cards -->
        <div class="cc-dashboard-kpis">
          <button class="cc-dashboard-kpi" data-act="cc-dashboard-go" data-arg="scanner" title="View all website scans in Cookie Scanner">
            <span>Total Scans</span>
            <strong>${totalScans.toLocaleString()}</strong>
            <small>${completedScans.toLocaleString()} completed${failedScans ? ` · ${failedScans} failed` : ""}</small>
          </button>

          <button class="cc-dashboard-kpi" data-act="cc-dashboard-filter-scantype" data-arg="Deep Scan" title="Filter by Deep Scans">
            <span>Deep Scans</span>
            <strong>${deepScansCount.toLocaleString()}</strong>
            <small>${deepScansPct}% of total · Up to 25 pages crawl</small>
          </button>

          <button class="cc-dashboard-kpi" data-act="cc-dashboard-filter-scantype" data-arg="Custom Scan" title="Filter by Custom Scans">
            <span>Custom Scans</span>
            <strong>${customScansCount.toLocaleString()}</strong>
            <small>${customScansPct}% of total · Targeted crawl</small>
          </button>

          <button class="cc-dashboard-kpi" data-act="cc-dashboard-go" data-arg="inventory" title="View all cookies in Cookie Inventory">
            <span>Total Cookies Identified</span>
            <strong>${totalInventoryCookies.toLocaleString()}</strong>
            <small>${totalScannedCookies.toLocaleString()} detected across scan runs</small>
          </button>

          <button class="cc-dashboard-kpi" data-act="cc-dashboard-go" data-arg="inventory" title="View First vs Third-party breakdown">
            <span>1st-Party vs 3rd-Party</span>
            <strong>${firstPartyCount} / ${thirdPartyCount}</strong>
            <small>${fpPct}% First-Party · ${tpPct}% Third-Party</small>
          </button>

          <button class="cc-dashboard-kpi ${pendingInventoryCount ? "attention" : ""}" data-act="cc-dashboard-go" data-arg="inventory" title="Review unclassified cookies in inventory">
            <span>Cookies Pending Classification</span>
            <strong>${pendingInventoryCount.toLocaleString()}</strong>
            <small>${pendingInventoryCount ? `${pendingInventoryCount} require classification` : "All classified"}${pendingScansCount ? ` · ${pendingScansCount} in scans` : ""}</small>
          </button>
        </div>

        <!-- Dashboard Grid with Charts and Panels -->
        <div class="cc-dashboard-grid">
          <!-- Chart 1: Scan Activity Over Time (Full-Width Panel) -->
          <section class="cc-dashboard-panel cc-dashboard-trend-panel">
            <div class="cc-dashboard-panel-header">
              <div>
                <h3>Scan Activity Over Time</h3>
                <p>${isAllTime ? "All recorded website scans" : `Last ${rangeDays} days`} · Deep Scans vs Custom Scans breakdown</p>
              </div>
              <div class="cc-dashboard-legend">
                <span class="deep"></span>Deep Scan
                <span class="custom"></span>Custom Scan
              </div>
            </div>
            ${filteredScans.length ? `
              <div class="cc-dashboard-trend-chart" role="img" aria-label="Scan activity over time">
                ${scanTrendBars}
              </div>
            ` : `<div class="cc-dashboard-empty">No website scans match the selected date range, scan type, or domain filters.</div>`}
            <div class="cc-dashboard-trend-summary">
              <span><b>${filteredScans.length.toLocaleString()}</b> total scans</span>
              <span><b>${deepScansCount.toLocaleString()}</b> Deep Scans</span>
              <span><b>${customScansCount.toLocaleString()}</b> Custom Scans</span>
              <span><b>${totalPagesScanned.toLocaleString()}</b> pages visited</span>
            </div>
          </section>

          <!-- Chart 2: Category-wise Cookie Distribution (Left Panel) -->
          <section class="cc-dashboard-panel cc-dashboard-category-panel">
            <div class="cc-dashboard-panel-header">
              <div>
                <h3>Category-wise Cookie Distribution</h3>
                <p>${totalInventoryCookies.toLocaleString()} cookies grouped across consent categories</p>
              </div>
              ${dashboardLink("Manage inventory", "inventory")}
            </div>
            ${totalInventoryCookies ? `
              <div class="cc-dashboard-dist-bar" title="Category breakdown">
                ${categorySegmentsHtml}
              </div>
              <div class="cc-dashboard-dist-list">
                ${categoryRowsHtml}
              </div>
            ` : `<div class="cc-dashboard-empty">No inventory cookies match the selected domain or category filter.</div>`}
          </section>

          <!-- Visitor Choices & Consent Receipts (Right Panel) -->
          <section class="cc-dashboard-panel">
            <div class="cc-dashboard-panel-header">
              <div>
                <h3>Visitor Choices</h3>
                <p>Consent receipts share for ${activeRegion !== "all" ? safe(activeRegion) : "all regions"}</p>
              </div>
              ${dashboardLink("View receipts", "records")}
            </div>
            ${filteredRecords.length ? `
              <div class="cc-dashboard-choices">${choiceRows}</div>
            ` : `<div class="cc-dashboard-empty">No consent receipts match the selected filters.</div>`}
          </section>

          <!-- Discovery & Operations Status (Left Panel) -->
          <section class="cc-dashboard-panel">
            <div class="cc-dashboard-panel-header">
              <div><h3>Discovery &amp; Crawl Operations</h3><p>Live telemetry and tag blocking status</p></div>
            </div>
            <div class="cc-dashboard-stat-list">
              <div><span>Latest website scan</span><b>${safe(latestScan ? (latestScan.status === "Completed" ? "Scan complete" : latestScan.status === "Running" ? "Crawling active" : latestScan.status) : "No scans yet")}</b></div>
              <div><span>Target site</span><b>${safe(latestScan?.url ? extractDomain(latestScan.url) : "—")}</b></div>
              <div><span>Scan page scope</span><b>${latestScan ? (latestScan.type === "Deep Scan" ? "Deep Scan · up to 25 pages" : `Custom Scan · up to ${Number(latestScan.pagesAttempted) || 10} pages`) : "—"}</b></div>
              <div><span>Total pages audited</span><b>${totalPagesScanned.toLocaleString()}</b></div>
              <div><span>Blocking rules enabled</span><b>${enabledTags} of ${(state.blockedTags || []).length}</b></div>
              ${disabledTags ? `<div><span>Disabled rules</span><b>${disabledTags}</b></div>` : ""}
            </div>
            <div class="cc-dashboard-panel-actions">
              ${dashboardLink("Open scanner", "scanner")}
              ${dashboardLink("Manage inventory", "inventory")}
              ${dashboardLink("Manage blocking", "blocking")}
            </div>
          </section>

          <!-- Configuration States (Right Panel) -->
          <section class="cc-dashboard-panel">
            <div class="cc-dashboard-panel-header">
              <div><h3>Configuration States</h3><p>Verified operational readiness</p></div>
            </div>
            <div class="cc-dashboard-status-list">
              ${statusRow(
                "Banner configuration",
                hasUnpublishedChanges ? "Draft changed" : latestVersion ? `Published v${latestVersion.version}` : "Not published",
                latestVersion ? `Last publication: ${publishDate}${hasUnpublishedChanges ? " · draft differs from published" : ""}` : "No published version recorded.",
                hasUnpublishedChanges ? "warning" : latestVersion ? "good" : "neutral",
                "builder"
              )}
              ${statusRow(
                "Automatic blocking",
                enabledTags ? `${enabledTags} enabled` : "No enabled rules",
                `${(state.blockedTags || []).length} configured rule${(state.blockedTags || []).length === 1 ? "" : "s"} · runtime blocking active`,
                enabledTags ? "good" : "neutral",
                "blocking"
              )}
              ${statusRow(
                "Implementation",
                "Snippet available",
                "The install snippet is available for web deployment.",
                "neutral",
                "install"
              )}
              ${statusRow(
                "Cookie scanner",
                latestScan ? (latestScan.status === "Completed" ? "Scan complete" : latestScan.status === "Running" ? "Scan running" : latestScan.status) : "Not run",
                latestScan ? `Last scan ${dateLabel(latestScan.completedAt || latestScan.createdAt)} on ${safe(extractDomain(latestScan.url))}.` : "No scan activity recorded.",
                "neutral",
                "scanner"
              )}
            </div>
          </section>

          <!-- Needs Attention (Full-Width Bottom Panel) -->
          <section class="cc-dashboard-panel cc-dashboard-issues ${pendingIssues.length ? "has-issues" : ""}">
            <div class="cc-dashboard-panel-header">
              <div><h3>Needs Attention</h3><p>Items requiring privacy review or publish action</p></div>
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
            ` : `<div class="cc-dashboard-empty">No pending review items or unpublished changes found.</div>`}
          </section>
        </div>
      </section>
    `;
  }

  return { renderDashboardModule };
}
