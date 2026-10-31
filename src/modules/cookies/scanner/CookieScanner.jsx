export function createRenderer(context) {
  const { state, runtime, ui, safe, dateLabel } = context;

  function renderCookieScannerModule() {
    const rawScans = (state.scans || []).slice();
    const latestScan = rawScans.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
    const runningScan = rawScans.find(item => item.status === "Running");
    const schedules = state.schedules || [];

    // Filter scans
    const scanSearch = (ui.scannerHistorySearch || "").toLowerCase().trim();
    const scanStatus = ui.scannerHistoryStatus || "all";
    const sortBy = ui.scannerHistorySortBy || "createdAt";
    const sortOrder = ui.scannerHistorySortOrder || "desc";

    let filteredScans = rawScans.filter(item => {
      const matchSearch = !scanSearch || `${item.id || ''} ${item.url || ''} ${item.type || ''}`.toLowerCase().includes(scanSearch);
      const matchStatus = scanStatus === "all" || item.status === scanStatus;
      return matchSearch && matchStatus;
    });

    filteredScans.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const totalScans = filteredScans.length;
    const scansPageSize = ui.scannerHistoryPageSize || 10;
    const totalScanPages = Math.max(1, Math.ceil(totalScans / scansPageSize));
    const currentScanPage = Math.min(totalScanPages, Math.max(1, ui.scannerHistoryPage || 1));

    const pagedScans = filteredScans.slice((currentScanPage - 1) * scansPageSize, currentScanPage * scansPageSize);

    const scanCols = [
      { key: "id", label: "Scan ID", width: "16%", sortable: true },
      { key: "url", label: "Target Website", width: "22%", sortable: true },
      { key: "type", label: "Scan Type", width: "12%", sortable: true },
      { key: "createdAt", label: "Started", width: "14%", sortable: true },
      { key: "status", label: "Status", width: "10%", sortable: true },
      { key: "cookiesCount", label: "Cookies", width: "8%", align: "right", sortable: true },
      { key: "thirdPartyCount", label: "Trackers", width: "8%", align: "right", sortable: true },
      { key: "actions", label: "Actions", width: "10%", align: "right" },
    ];

    const scanRows = pagedScans.map(item => {
      const copyIdBtn = runtime.copyButton ? runtime.copyButton(item.id, `Copy scan ID: ${item.id}`) : '';
      const copyUrlBtn = runtime.copyButton && item.url ? runtime.copyButton(item.url, `Copy target URL: ${item.url}`) : '';
      const targetUrl = item.url || item.urls?.[0] || "—";

      return [
        `
          <div style="display:flex;align-items:center;gap:6px;max-width:100%;">
            <span class="cell-mono cell-truncate" style="font-size:11.5px;color:var(--text-3);" title="${safe(item.id)}">${safe(item.id)}</span>
            ${copyIdBtn}
          </div>
        `,
        `
          <div style="display:flex;align-items:center;gap:6px;max-width:100%;">
            <b class="cell-mono cell-truncate" style="font-size:12px;" title="${safe(targetUrl)}">${safe(targetUrl)}</b>
            ${copyUrlBtn}
          </div>
        `,
        safe(item.type),
        `<span class="cell-mono" style="font-size:11px;color:var(--text-2);">${safe(dateLabel(item.createdAt))}</span>`,
        runtime.pill(
          item.status === "Completed" ? "ok" : item.status === "Running" ? "info" : item.status === "Cancelled" ? "n" : "risk",
          item.status === "Completed" ? "Scan complete" : item.status === "Running" ? "Crawling" : item.status
        ),
        `<b>${item.report?.totalCookies ?? item.cookiesCount ?? 0}</b>`,
        `<b>${item.report?.thirdPartyDomains?.length ?? item.thirdPartyCount ?? 0}</b>`,
        `
          <div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap;">
            <button class="btn sm" data-act="cc-view-scan-report" data-arg="${safe(item.id)}" title="View complete report and discovered cookies">Report</button>
            <button class="btn sm" data-act="cc-compare-scans-modal" data-arg="${safe(item.id)}" title="Compare with another scan">Compare</button>
            <button class="btn sm d" data-act="cc-delete-scan" data-arg="${safe(item.id)}" title="Remove scan record">×</button>
          </div>
        `,
      ];
    });

    const scheduleCols = [
      { key: "type", label: "Scan Type & Target", width: "35%" },
      { key: "frequency", label: "Frequency", width: "15%" },
      { key: "nextRun", label: "Next Run", width: "18%" },
      { key: "pages", label: "Page Scope", width: "14%" },
      { key: "status", label: "Last Status", width: "10%" },
      { key: "actions", label: "Actions", width: "8%", align: "right" },
    ];

    const scheduleRows = schedules.map(schedule => {
      const target = schedule.urls?.length > 1 ? `${schedule.urls.length} URLs` : schedule.url;
      const copyUrlBtn = runtime.copyButton && schedule.url ? runtime.copyButton(schedule.url, `Copy target URL: ${schedule.url}`) : '';

      // Check whether this schedule is currently running in active scans
      const isScheduleRunning = (schedule.lastRunStatus === "Running" || schedule.lastRunStatus === "Queued") &&
        state.scans.some(s => s.id === schedule.lastScanId && (s.status === "Running" || s.status === "queued"));

      // Determine effective status (reconciles with scan record if completed)
      let effectiveStatus = schedule.lastRunStatus;
      if (effectiveStatus === "Running" && !isScheduleRunning) {
        const finishedScan = state.scans.find(s => s.id === schedule.lastScanId || (s.scheduledId === schedule.id));
        if (finishedScan && finishedScan.status !== "Running") {
          effectiveStatus = finishedScan.status;
        } else if (!runningScan) {
          effectiveStatus = "Completed";
        }
      }

      let statusPill = "—";
      if (effectiveStatus) {
        if (isScheduleRunning) {
          statusPill = runtime.pill("info", "Running…");
        } else if (effectiveStatus === "Completed") {
          statusPill = runtime.pill("ok", "Completed");
        } else if (effectiveStatus === "Partially Completed") {
          statusPill = runtime.pill("mask", "Partially Completed");
        } else if (effectiveStatus === "Cancelled") {
          statusPill = runtime.pill("dim", "Cancelled");
        } else if (effectiveStatus.startsWith("Failed")) {
          statusPill = runtime.pill("risk", "Failed");
        } else {
          statusPill = runtime.pill("ok", effectiveStatus);
        }
      }

      // Next Run label
      let nextRunLabel = "—";
      if (schedule.frequency === "Once") {
        nextRunLabel = (effectiveStatus && effectiveStatus !== "Running" && effectiveStatus !== "Queued")
          ? "Completed (Once)"
          : (schedule.nextRunAt ? dateLabel(schedule.nextRunAt) : "One-time");
      } else if (schedule.nextRunAt) {
        nextRunLabel = dateLabel(schedule.nextRunAt);
      }

      // Action button label
      let runBtnLabel = "Run Now";
      if (isScheduleRunning) {
        runBtnLabel = "Running…";
      } else if (effectiveStatus === "Completed" || effectiveStatus === "Partially Completed") {
        runBtnLabel = "Run Again";
      }

      return [
        `
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <b>${safe(schedule.type)}</b>
              ${copyUrlBtn}
            </div>
            <span class="sub cell-mono" style="display:block;font-size:11px;color:var(--text-3);margin-top:2px;">
              ${safe(target)}
            </span>
          </div>
        `,
        safe(schedule.frequency),
        safe(nextRunLabel),
        `Up to ${Number(schedule.pages) || 10} pages`,
        statusPill,
        `
          <div style="display:flex;gap:4px;justify-content:flex-end;">
            <button class="btn sm" data-act="cc-run-scheduled-scan" data-arg="${safe(schedule.id)}" ${runningScan || isScheduleRunning ? "disabled" : ""}>${runBtnLabel}</button>
            <button class="btn sm d" data-act="cc-delete-scan-schedule" data-arg="${safe(schedule.id)}">Remove</button>
          </div>
        `,
      ];
    });

    return `
      <section class="cc-scan-page">
        <header class="cc-scan-header">
          <div>
            <div class="cc-scan-eyebrow">Cookie Consent</div>
            <h2>Cookie Scanner</h2>
            <p>Automated real website crawler powered by Playwright to discover cookies, third-party trackers, and audit consent choices.</p>
          </div>
          <span class="cc-scan-local-label" style="background:rgba(20,184,166,0.12);color:var(--accent);border:1px solid rgba(20,184,166,0.25);">
            <span style="background:var(--accent);box-shadow:0 0 8px var(--accent);"></span> Playwright Engine Active
          </span>
        </header>

        <div class="cc-scan-layout">
          ${runtime.card("Configure Website Scan", `
            <div class="field">
              <label for="cc-scan-url">Target Website URL</label>
              <input id="cc-scan-url" type="url" placeholder="https://your-website.com" value="${safe(ui.scanBaseUrl || "")}" data-input-act="cc-scan-base-url" style="font-family:var(--f-mono);">
            </div>
            <div class="cc-scan-scope-note">
              <strong>Deep Scan vs Custom Scan</strong>
              <span>Deep Scan traverses links across same-origin pages (up to 25 pages). Custom Scan lets you define custom page limits (1–50), seed URL paths, crawl link depth, and recurring schedules.</span>
            </div>
            <div class="cc-note cc-scan-local-note" style="border-left-color:var(--accent);">
              Scans run in isolated headless Chromium browser contexts with strict SSRF destination safeguards. The worker extracts HTTP-only, secure, and JavaScript cookies, captures network tracking telemetry, and tests pre-consent vs. post-consent states.
            </div>
            <div class="cc-scan-actions">
              <button class="btn t" data-act="cc-run-deep-scan" ${runningScan ? "disabled" : ""}>
                ${runningScan ? "Crawl in Progress…" : "Start Deep Scan"}
              </button>
              <button class="btn" data-act="cc-schedule-scan-modal">
                Custom Scan / Schedule
              </button>
              ${runningScan ? `
                <button class="btn d" data-act="cc-cancel-scan" data-arg="${safe(runningScan.id)}">
                  Cancel Scan
                </button>
              ` : ""}
            </div>
          `)}

          ${runtime.card("Latest Scan Details", latestScan ? (() => {
            const isRunning = latestScan.status === "Running";
            const isComplete = latestScan.status === "Completed";
            const isPartial = latestScan.status === "Partially Completed";
            const isFailed = latestScan.status === "Failed";
            const isCancelled = latestScan.status === "Cancelled";

            const cookiesList = latestScan.report?.cookies || [];
            const totalCookies = latestScan.report?.totalCookies ?? latestScan.cookiesCount ?? cookiesList.length;
            const firstPartyCount = cookiesList.filter(c => c.party === "First-party").length;
            const thirdPartyCount = cookiesList.filter(c => c.party === "Third-party").length;
            const unclassifiedCount = latestScan.report?.unclassifiedCount ?? latestScan.unclassifiedCount ?? 0;
            const trackersCount = latestScan.report?.thirdPartyDomains?.length ?? latestScan.thirdPartyCount ?? 0;
            const bannerDetected = Boolean(latestScan.report?.consentScenario?.bannerDetected);
            const progressVal = Math.min(100, Math.max(0, Number(latestScan.progress) || (isRunning ? 12 : 100)));

            return `
              <div class="cc-scan-details-v2">
                <!-- Status Header Banner -->
                <div class="cc-scan-hero-banner ${isRunning ? 'is-running' : isComplete ? 'is-complete' : isPartial ? 'is-partial' : isFailed ? 'is-failed' : 'is-idle'}">
                  <div class="cc-scan-hero-left">
                    <span class="cc-scan-status-badge ${isRunning ? 'running' : isComplete ? 'complete' : isPartial ? 'partial' : isFailed ? 'failed' : 'idle'}">
                      <span class="cc-scan-beacon"></span>
                      ${safe(isRunning ? "Crawling Target Website…" : isComplete ? "Scan Completed" : isPartial ? "Partially Completed" : isCancelled ? "Cancelled" : "Scan Failed")}
                    </span>
                    <div class="cc-scan-hero-meta">
                      <span class="cc-scan-hero-type">${safe(latestScan.type || "Website Scan")}</span>
                      <span class="cc-scan-hero-dot">•</span>
                      <span class="cc-scan-hero-id" title="Scan ID">${safe(latestScan.id)}</span>
                    </div>
                  </div>
                  <div class="cc-scan-hero-right">
                    <span class="cc-scan-hero-timer">
                      ${safe(latestScan.completedAt ? `Finished ${dateLabel(latestScan.completedAt)}` : isRunning ? "Worker Active (Headless Chromium)" : dateLabel(latestScan.createdAt))}
                    </span>
                  </div>
                </div>

                <!-- Active Crawl Loader & Real-Time Telemetry (When Running) -->
                ${isRunning ? `
                  <div class="cc-scan-active-loader cc-scan-progress" role="progressbar" aria-label="Playwright scanning progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressVal}">
                    <div class="cc-scan-loader-header">
                      <div class="cc-scan-loader-title">
                        <span class="cc-scan-spin-radar"></span>
                        <div class="cc-scan-loader-label-group">
                          <strong class="cc-scan-loader-action">${safe(latestScan.progressLabel || "Visiting target website...")}</strong>
                          <span class="cc-scan-loader-sub">Playwright headless worker inspecting DOM, storage, and network trackers</span>
                        </div>
                      </div>
                      <div class="cc-scan-loader-pct">
                        <span>${progressVal}<b>%</b></span>
                      </div>
                    </div>

                    <div class="cc-scan-loader-track">
                      <div class="cc-scan-loader-fill" style="width:${progressVal}%">
                        <div class="cc-scan-loader-shimmer"></div>
                      </div>
                    </div>

                    <div class="cc-scan-live-feed">
                      <div class="cc-scan-feed-item">
                        <span class="cc-scan-feed-tag">ACTIVE URL</span>
                        <code class="cc-scan-feed-url" title="${safe(latestScan.currentUrl || latestScan.url)}">${safe(latestScan.currentUrl || latestScan.url)}</code>
                      </div>
                      <div class="cc-scan-feed-stats">
                        <span><b>${latestScan.pagesScanned || 1}</b> / <b>${latestScan.pagesAttempted || 10}</b> pages</span>
                        <span class="cc-scan-dot-sep">•</span>
                        <span><b>${totalCookies}</b> cookies</span>
                        <span class="cc-scan-dot-sep">•</span>
                        <span><b>${trackersCount}</b> trackers</span>
                      </div>
                    </div>
                  </div>
                ` : ""}

                <!-- Detailed Target Site & Scope Bar -->
                <div class="cc-scan-target-bar">
                  <div class="cc-scan-target-item">
                    <span class="cc-scan-target-label">Target Website</span>
                    <div class="cc-scan-target-val">
                      <a href="${safe(latestScan.url || latestScan.urls?.[0] || "#")}" target="_blank" rel="noopener noreferrer" class="cc-scan-domain-link">
                        ${safe(latestScan.url || latestScan.urls?.[0] || "—")}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                      </a>
                      ${latestScan.redirected ? `<span class="cc-scan-redirect-pill">↳ Redirected from ${safe(latestScan.initialUrl)}</span>` : ""}
                    </div>
                  </div>
                  <div class="cc-scan-target-item">
                    <span class="cc-scan-target-label">Crawl Scope</span>
                    <span class="cc-scan-target-sub">${latestScan.type === "Deep Scan" ? "Autonomous deep link discovery (up to 25 pages)" : `Configured: ${latestScan.pagesAttempted || 10} pages · Depth ${latestScan.config?.maxDepth || 2}`}</span>
                  </div>
                  <div class="cc-scan-target-item">
                    <span class="cc-scan-target-label">Scan Started</span>
                    <span class="cc-scan-target-sub">${safe(dateLabel(latestScan.createdAt))}</span>
                  </div>
                </div>

                <!-- Visual Metrics Grid -->
                <div class="cc-scan-metrics-v2 cc-scan-metrics">
                  <div class="cc-scan-metric-card">
                    <div class="cc-scan-metric-header">
                      <span>Discovered Cookies</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 109 9 3 3 0 01-3-3 3 3 0 01-3-3 3 3 0 01-3-3z"/><circle cx="9" cy="11" r="1"/><circle cx="14" cy="15" r="1"/><circle cx="9" cy="16" r="1"/></svg>
                    </div>
                    <strong class="cc-scan-metric-val cc-val-accent">${totalCookies}</strong>
                    <small class="cc-scan-metric-note">
                      ${latestScan.report ? `${firstPartyCount} 1st-party · ${thirdPartyCount} 3rd-party` : "Cookies identified"}
                    </small>
                  </div>

                  <div class="cc-scan-metric-card">
                    <div class="cc-scan-metric-header">
                      <span>Third-Party Trackers</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>
                    </div>
                    <strong class="cc-scan-metric-val ${trackersCount > 0 ? 'cc-val-warning' : ''}">${trackersCount}</strong>
                    <small class="cc-scan-metric-note">Ad networks & beacons</small>
                  </div>

                  <div class="cc-scan-metric-card">
                    <div class="cc-scan-metric-header">
                      <span>Pages Audited</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>
                    </div>
                    <strong class="cc-scan-metric-val">${latestScan.pagesScanned || 0} <span class="cc-scan-metric-subval">/ ${latestScan.pagesAttempted || 10}</span></strong>
                    <small class="cc-scan-metric-note">${latestScan.pagesDiscovered || latestScan.pagesScanned || 1} pages queued</small>
                  </div>

                  <div class="cc-scan-metric-card">
                    <div class="cc-scan-metric-header">
                      <span>Review Required</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5h.01"/></svg>
                    </div>
                    <strong class="cc-scan-metric-val ${unclassifiedCount > 0 ? 'cc-val-risk' : 'cc-val-ok'}">
                      ${unclassifiedCount}
                    </strong>
                    <small class="cc-scan-metric-note">${unclassifiedCount === 0 ? "All cookies classified" : "Pending categorization"}</small>
                  </div>

                  <div class="cc-scan-metric-card">
                    <div class="cc-scan-metric-header">
                      <span>Consent Banner Test</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>
                    </div>
                    <strong class="cc-scan-metric-val" style="font-size:13px;font-weight:600;">
                      ${bannerDetected ? "Banner Detected" : "Pre-Consent Only"}
                    </strong>
                    <small class="cc-scan-metric-note">${bannerDetected ? "OneTrust / CMP verified" : "Prior consent compliance"}</small>
                  </div>
                </div>

                <!-- Result Note & Actions (When not running) -->
                ${!isRunning ? `
                  <div class="cc-scan-callout ${isComplete ? 'is-complete' : isPartial ? 'is-partial' : 'is-default'} cc-scan-result-note">
                    <div class="cc-scan-callout-icon">
                      ${isComplete ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>` : isPartial ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5h.01"/></svg>`}
                    </div>
                    <div class="cc-scan-callout-text">
                      <strong>${isComplete ? "Crawl Completed Successfully" : isPartial ? "Scan Completed with Limits" : "Scan Terminated"}</strong>
                      <p>${safe(latestScan.resultNote || `Scan finished ${dateLabel(latestScan.completedAt)}.`)}</p>
                    </div>
                  </div>

                  <div class="cc-scan-footer-actions" style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
                    <button class="btn sm t" data-act="cc-view-scan-report" data-arg="${safe(latestScan.id)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      View Detailed Report & Cookies
                    </button>
                    <button class="btn sm" data-act="cc-sync-scan-to-inventory" data-arg="${safe(latestScan.id)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg>
                      Add Discovered Cookies to Inventory
                    </button>
                    <button class="btn sm" data-act="cc-compare-scans-modal" data-arg="${safe(latestScan.id)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
                      Compare Scans
                    </button>
                  </div>
                ` : ""}
              </div>
            `;
          })() : `
            <div class="cc-scan-empty">
              No scans have been executed yet. Enter a valid website URL and start a Deep Scan or configure a Custom Scan.
            </div>
          `, null, true)}
        </div>

        ${runtime.card("Saved Automated Schedules", schedules.length
          ? runtime.table(scheduleCols, scheduleRows, {
              id: "cc-schedules-table",
              stickyHeader: true,
            })
          : `<div class="cc-scan-empty">No recurring schedules configured. Use Custom Scan / Schedule to create automated audits.</div>`, null, true)}

        ${runtime.card("Website Scans History", `
          <div class="cc-scan-history-note" style="margin-bottom:12px;">
            Real website crawl telemetry stored in backend database. Click "Report" to review observed cookies or "Compare" to audit cookie additions and removals.
          </div>
          ${runtime.tableToolbar ? runtime.tableToolbar({
            badge: `${totalScans} Scan Records`,
            search: {
              value: ui.scannerHistorySearch || "",
              placeholder: "Search scan ID, URL, type...",
              inputAct: "cc-scans-search",
              clearAct: "cc-scans-clear-search",
            },
            filters: [
              {
                label: "Status",
                act: "cc-scans-filter-status",
                value: scanStatus,
                options: [
                  { value: "all", label: "All Statuses" },
                  { value: "Completed", label: "Scan complete" },
                  { value: "Running", label: "Crawling" },
                  { value: "Failed", label: "Failed" },
                  { value: "Cancelled", label: "Cancelled" },
                ],
              },
            ],
          }) : ''}
          ${runtime.table(scanCols, scanRows, {
            id: "cc-scans-history-table",
            sortField: sortBy,
            sortDir: sortOrder,
            sortAct: "cc-scans-sort",
            stickyHeader: true,
            emptyText: scanSearch || scanStatus !== "all" ? "No scans match your search or filter" : "No scan history recorded yet",
            emptyResetAct: "cc-scans-reset-filters",
          })}
          ${runtime.tablePagination ? runtime.tablePagination({
            page: currentScanPage,
            pageSize: scansPageSize,
            totalRecords: totalScans,
            totalPages: totalScanPages,
          }, {
            pageAct: "cc-scans-page",
            sizeAct: "cc-scans-page-size",
            table: "scans",
            unit: "scans",
            sizes: [10, 25, 50],
          }) : ''}
        `, null, true)}
      </section>
    `;
  }

  return { renderCookieScannerModule };
}
