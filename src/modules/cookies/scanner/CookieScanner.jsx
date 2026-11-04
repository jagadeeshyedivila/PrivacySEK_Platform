export function createRenderer(context) {
  const { state, runtime, ui, safe, dateLabel, getRelativeTime } = context;

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

    const hostOf = value => {
      try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value || "—"; }
    };
    const latestId = latestScan?.id;

    const scanCols = [
      { key: "url", label: "Website", width: "27%", sortable: true },
      { key: "type", label: "Scan", width: "17%", sortable: true },
      { key: "createdAt", label: "Started", width: "13%", sortable: true },
      { key: "status", label: "Status", width: "12%", sortable: true },
      { key: "cookiesCount", label: "Cookies", width: "9%", align: "right", sortable: true },
      { key: "thirdPartyCount", label: "Trackers", width: "8%", align: "right", sortable: true },
      { key: "actions", label: "", width: "14%", align: "right" },
    ];

    const statusPill = status => {
      const map = {
        Completed: ["ok", "Completed"],
        Running: ["info", "Crawling"],
        Cancelled: ["n", "Cancelled"],
        "Partially Completed": ["mask", "Partial"],
        Interrupted: ["mask", "Interrupted"],
      };
      const [tone, label] = map[status] || ["risk", status || "Unknown"];
      return runtime.pill(tone, label);
    };

    const scanRows = pagedScans.map(item => {
      const copyIdBtn = runtime.copyButton ? runtime.copyButton(item.id, `Copy scan ID: ${item.id}`) : '';
      const targetUrl = item.url || item.urls?.[0] || "—";
      const host = hostOf(targetUrl);
      const cookies = item.report?.totalCookies ?? item.cookiesCount ?? 0;
      const trackers = item.report?.thirdPartyDomains?.length ?? item.thirdPartyCount ?? 0;
      const review = item.report?.unclassifiedCount ?? item.unclassifiedCount ?? 0;
      const isLatest = item.id === latestId;

      return [
        `
          <div class="ccx-site">
            <span class="ccx-site-avatar" aria-hidden="true">${safe((host[0] || "?").toUpperCase())}</span>
            <div class="ccx-site-text">
              <span class="ccx-site-host" title="${safe(targetUrl)}">${safe(host)}${isLatest ? `<span class="ccx-latest-tag">Latest</span>` : ""}</span>
              <a class="ccx-site-url" href="${safe(targetUrl)}" target="_blank" rel="noopener noreferrer" title="${safe(targetUrl)}">${safe(targetUrl)}</a>
            </div>
          </div>
        `,
        `
          <div class="ccx-scan-cell">
            <span class="ccx-type-chip ${item.type === "Deep Scan" ? "is-deep" : "is-custom"}">${safe(item.type || "Scan")}</span>
            <span class="ccx-scan-id"><span class="cell-truncate" title="${safe(item.id)}">${safe(item.id)}</span>${copyIdBtn}</span>
          </div>
        `,
        `
          <div class="ccx-time" title="${safe(dateLabel(item.createdAt))}">
            <span>${safe(getRelativeTime ? getRelativeTime(item.createdAt) : dateLabel(item.createdAt))}</span>
            <small>${safe(dateLabel(item.createdAt))}</small>
          </div>
        `,
        statusPill(item.status),
        `
          <div class="ccx-num">
            <b>${cookies}</b>
            ${review > 0 ? `<small class="is-risk">${review} to review</small>` : `<small>&nbsp;</small>`}
          </div>
        `,
        `<div class="ccx-num"><b class="${trackers > 0 ? "is-warn" : ""}">${trackers}</b><small>&nbsp;</small></div>`,
        `
          <div class="ccx-row-actions">
            <button class="btn sm ccx-report-btn" data-act="cc-view-scan-report" data-arg="${safe(item.id)}" title="View complete report and discovered cookies">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>
              Report
            </button>
            <button class="ccx-icon-btn" data-act="cc-compare-scans-modal" data-arg="${safe(item.id)}" title="Compare with another scan" aria-label="Compare with another scan">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            </button>
            <button class="ccx-icon-btn is-danger" data-act="cc-delete-scan" data-arg="${safe(item.id)}" title="Remove scan record" aria-label="Remove scan record">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
            </button>
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

    const latestSummary = latestScan ? (() => {
      const isRunning = latestScan.status === "Running";
      const isComplete = latestScan.status === "Completed";
      const isPartial = latestScan.status === "Partially Completed";
      const isFailed = latestScan.status === "Failed";
      const isCancelled = latestScan.status === "Cancelled";
      const tone = isRunning ? "running" : isComplete ? "complete" : isPartial ? "partial" : isFailed ? "failed" : "idle";

      const cookiesList = latestScan.report?.cookies || [];
      const totalCookies = latestScan.report?.totalCookies ?? latestScan.cookiesCount ?? cookiesList.length;
      const firstPartyCount = cookiesList.filter(c => c.party === "First-party").length;
      const thirdPartyCount = cookiesList.filter(c => c.party === "Third-party").length;
      const unclassifiedCount = latestScan.report?.unclassifiedCount ?? latestScan.unclassifiedCount ?? 0;
      const trackersCount = latestScan.report?.thirdPartyDomains?.length ?? latestScan.thirdPartyCount ?? 0;
      const bannerDetected = Boolean(latestScan.report?.consentScenario?.bannerDetected);
      const progressVal = Math.min(100, Math.max(0, Number(latestScan.progress) || (isRunning ? 12 : 100)));
      const targetUrl = latestScan.url || latestScan.urls?.[0] || "";
      const statusText = isRunning ? "Crawling" : isComplete ? "Completed" : isPartial ? "Partially completed" : isCancelled ? "Cancelled" : isFailed ? "Failed" : (latestScan.status || "Stopped");
      const timeText = latestScan.completedAt
        ? `Finished ${getRelativeTime ? getRelativeTime(latestScan.completedAt) : dateLabel(latestScan.completedAt)}`
        : isRunning ? "Worker active" : `Started ${dateLabel(latestScan.createdAt)}`;

      const metric = (label, value, note, cls = "") => `
        <div class="ccx-metric">
          <span class="ccx-metric-label">${label}</span>
          <strong class="ccx-metric-val ${cls}">${value}</strong>
          <small class="ccx-metric-note">${note}</small>
        </div>
      `;

      return `
        <div class="cc-scan-details-v2 ccx-latest">
          <div class="ccx-latest-head">
            <span class="ccx-status ${tone}" title="${safe(latestScan.resultNote || statusText)}"><span class="ccx-beacon"></span>${safe(statusText)}</span>
            <a href="${safe(targetUrl || "#")}" target="_blank" rel="noopener noreferrer" class="ccx-latest-host" title="${safe(targetUrl)}">
              ${safe(hostOf(targetUrl))}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
            </a>
            <span class="ccx-latest-meta">
              <span class="ccx-type-chip ${latestScan.type === "Deep Scan" ? "is-deep" : "is-custom"}">${safe(latestScan.type || "Scan")}</span>
              <span title="${safe(dateLabel(latestScan.completedAt || latestScan.createdAt))}">${safe(timeText)}</span>
              ${latestScan.redirected ? `<span class="ccx-redirect" title="Redirected from ${safe(latestScan.initialUrl)}">Redirected</span>` : ""}
            </span>
          </div>

          ${isRunning ? `
            <div class="cc-scan-progress ccx-progress" role="progressbar" aria-label="Scanning progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressVal}">
              <div class="ccx-progress-top">
                <span class="ccx-progress-label">${safe(latestScan.progressLabel || "Visiting target website…")}</span>
                <b>${progressVal}%</b>
              </div>
              <div class="ccx-progress-track"><div class="ccx-progress-fill" style="width:${progressVal}%"></div></div>
              <code class="ccx-progress-url" title="${safe(latestScan.currentUrl || targetUrl)}">${safe(latestScan.currentUrl || targetUrl)}</code>
            </div>
          ` : ""}

          <div class="cc-scan-metrics ccx-metrics">
            ${metric("Cookies", totalCookies, latestScan.report ? `${firstPartyCount} first · ${thirdPartyCount} third party` : "Discovered", "is-accent")}
            ${metric("Trackers", trackersCount, "Third-party domains", trackersCount > 0 ? "is-warn" : "")}
            ${metric("Pages", `${latestScan.pagesScanned || 0}<span class="ccx-metric-sub">/${latestScan.pagesAttempted || 10}</span>`, `${latestScan.pagesDiscovered || latestScan.pagesScanned || 0} discovered`)}
            ${metric("Needs review", unclassifiedCount, unclassifiedCount === 0 ? "All classified" : "Unclassified cookies", unclassifiedCount > 0 ? "is-risk" : "is-ok")}
            ${metric("Consent banner", bannerDetected ? "Detected" : "Not detected", bannerDetected ? "Accept flow tested" : "Pre-consent state only", bannerDetected ? "is-ok is-text" : "is-text")}
          </div>

          ${!isRunning && !isComplete && latestScan.resultNote ? `
            <p class="cc-scan-result-note ccx-result-note ${tone}">${safe(latestScan.resultNote)}</p>
          ` : ""}
        </div>
      `;
    })() : `
      <div class="cc-scan-empty ccx-empty">
        <strong>No scans yet</strong>
        <span>Enter a website URL above and start a Deep Scan to discover cookies and trackers.</span>
      </div>
    `;

    const latestActions = latestScan && latestScan.status !== "Running" ? `
      <div class="ccx-card-actions">
        <button class="btn sm t" data-act="cc-view-scan-report" data-arg="${safe(latestScan.id)}">View report</button>
        <button class="btn sm" data-act="cc-sync-scan-to-inventory" data-arg="${safe(latestScan.id)}" title="Add discovered cookies to the Cookie Categories inventory">Add to inventory</button>
        <button class="btn sm" data-act="cc-compare-scans-modal" data-arg="${safe(latestScan.id)}">Compare</button>
      </div>
    ` : "";

    return `
      <section class="cc-scan-page ccx-page">
        <header class="cc-scan-header ccx-header">
          <div>
            <h2>Cookie Scanner</h2>
            <p>Crawl your website to discover cookies and third-party trackers, then test consent behaviour.</p>
          </div>
          <nav class="ccx-jump" aria-label="Scanner sections">
            <button type="button" class="ccx-jump-btn" data-act="cc-scan-jump" data-arg="ccx-history">
              Scan history <span>${rawScans.length}</span>
            </button>
            <button type="button" class="ccx-jump-btn" data-act="cc-scan-jump" data-arg="ccx-schedules">
              Schedules <span>${schedules.length}</span>
            </button>
            <span class="cc-scan-local-label ccx-engine" title="Scans run in isolated headless Chromium contexts with SSRF safeguards"><span></span>Playwright Engine Active</span>
          </nav>
        </header>

        <div class="ccx-config">
          ${runtime.card("Configure Website Scan", `
            <div class="ccx-scanbar">
              <label class="ccx-url-field" for="cc-scan-url">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>
                <input id="cc-scan-url" type="url" aria-label="Target Website URL" placeholder="https://your-website.com" value="${safe(ui.scanBaseUrl || "")}" data-input-act="cc-scan-base-url" autocomplete="url">
              </label>
              <div class="cc-scan-actions ccx-scanbar-actions">
                <button class="btn t" data-act="cc-run-deep-scan" ${runningScan ? "disabled" : ""}>
                  ${runningScan ? "Crawl in Progress…" : "Start Deep Scan"}
                </button>
                <button class="btn" data-act="cc-schedule-scan-modal">Custom Scan / Schedule</button>
                ${runningScan ? `<button class="btn d" data-act="cc-cancel-scan" data-arg="${safe(runningScan.id)}">Cancel Scan</button>` : ""}
              </div>
            </div>
            <p class="ccx-scanbar-hint">
              <b>Deep Scan</b> follows same-origin links across up to 25 pages.
              <b>Custom Scan</b> sets page limits, seed paths, crawl depth and recurring schedules.
            </p>
          `)}
        </div>

        ${runtime.card("Latest Scan Details", latestSummary, latestActions, true)}

        <div id="ccx-history" class="ccx-anchor">
          ${runtime.card("Website Scans History", `
            <div class="ccx-history">
              ${runtime.tableToolbar ? runtime.tableToolbar({
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
                      { value: "Completed", label: "Completed" },
                      { value: "Running", label: "Crawling" },
                      { value: "Failed", label: "Failed" },
                      { value: "Cancelled", label: "Cancelled" },
                    ],
                  },
                ],
              }) : ''}
              ${runtime.table(scanCols, scanRows, {
                id: "cc-scans-history-table",
                className: "ccx-history-table",
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
            </div>
          `, `<span class="ccx-card-hint">Open a report to review cookies, or compare two scans to see what changed.</span>`, true)}
        </div>

        <div id="ccx-schedules" class="ccx-anchor">
          ${runtime.card("Saved Automated Schedules", schedules.length
            ? runtime.table(scheduleCols, scheduleRows, {
                id: "cc-schedules-table",
                className: "ccx-schedule-table",
                stickyHeader: true,
              })
            : `<div class="cc-scan-empty ccx-empty ccx-empty-row">
                <span>No recurring schedules yet. Automate audits so new cookies are caught early.</span>
                <button class="btn sm" data-act="cc-schedule-scan-modal">Create schedule</button>
              </div>`, `<span class="ccx-card-hint">${schedules.length} active</span>`, true)}
        </div>
      </section>
    `;
  }

  return { renderCookieScannerModule };
}
