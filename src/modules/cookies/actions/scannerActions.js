import { scannerApi } from "../scanner/scannerApi.js";

export function registerActions(context, ACT) {
  const {
    state, runtime, ui,
    safe, dateLabel, isoNow, clone,
    persist, readDialogField, validateScanSeeds, nextScanScheduleDate,
  } = context;

  let activePollingInterval = null;

  ACT["cc-scans-search"] = q => {
    ui.scannerHistorySearch = q;
    ui.scannerHistoryPage = 1;
    runtime.render();
  };
  ACT["cc-scans-clear-search"] = () => {
    ui.scannerHistorySearch = "";
    ui.scannerHistoryPage = 1;
    runtime.render();
  };
  ACT["cc-scans-filter-status"] = status => {
    ui.scannerHistoryStatus = status;
    ui.scannerHistoryPage = 1;
    runtime.render();
  };
  ACT["cc-scans-sort"] = col => {
    if (ui.scannerHistorySortBy === col) {
      ui.scannerHistorySortOrder = ui.scannerHistorySortOrder === "asc" ? "desc" : "asc";
    } else {
      ui.scannerHistorySortBy = col;
      ui.scannerHistorySortOrder = "desc";
    }
    ui.scannerHistoryPage = 1;
    runtime.render();
  };
  ACT["cc-scans-page"] = p => {
    ui.scannerHistoryPage = Math.max(1, Number(p) || 1);
    runtime.render();
  };
  ACT["cc-scans-page-size"] = s => {
    ui.scannerHistoryPageSize = Math.max(1, Number(s) || 10);
    ui.scannerHistoryPage = 1;
    runtime.render();
  };
  ACT["cc-scans-reset-filters"] = () => {
    ui.scannerHistorySearch = "";
    ui.scannerHistoryStatus = "all";
    ui.scannerHistoryPage = 1;
    runtime.render();
  };

  // Sync initial backend history and schedules on action registration
  (async function syncBackendData() {
    try {
      const [backendHistory, backendSchedules] = await Promise.all([
        scannerApi.getHistory().catch(() => null),
        scannerApi.getSchedules().catch(() => null),
      ]);

      let changed = false;
      if (Array.isArray(backendHistory) && backendHistory.length > 0) {
        // Merge backend scans into state.scans
        for (const bScan of backendHistory) {
          const existing = state.scans.find(s => s.id === bScan.id);
          if (!existing) {
            state.scans.push({
              id: bScan.id,
              url: bScan.url,
              type: bScan.type,
              status: bScan.status === "completed" ? "Completed"
                : bScan.status === "running" ? "Running"
                : bScan.status === "partially_completed" ? "Partially Completed"
                : bScan.status === "cancelled" ? "Cancelled"
                : "Failed",
              createdAt: bScan.createdAt,
              completedAt: bScan.completedAt,
              pagesAttempted: bScan.pagesAttempted,
              pagesScanned: bScan.pagesScanned,
              pagesFailed: bScan.pagesFailed,
              cookiesCount: bScan.cookiesCount,
              unclassifiedCount: bScan.unclassifiedCount,
              thirdPartyCount: bScan.thirdPartyCount,
              resultNote: bScan.resultNote,
            });
            changed = true;
          }
        }
      }

      if (Array.isArray(backendSchedules) && backendSchedules.length > 0) {
        for (const bSched of backendSchedules) {
          const existing = (state.schedules || []).find(s => s.id === bSched.id);
          if (!existing) {
            state.schedules = state.schedules || [];
            state.schedules.push(bSched);
            changed = true;
          }
        }
      }

      if (changed) {
        runtime.render();
      }

      // Check if any scan is running on the backend and resume polling
      const runningScan = state.scans.find(s => s.status === "Running");
      if (runningScan) {
        startPolling(runningScan.id);
      }
    } catch {
      // Backend unavailable or starting up
    }
  })();

  function startPolling(scanId) {
    if (activePollingInterval) {
      clearInterval(activePollingInterval);
      activePollingInterval = null;
    }

    activePollingInterval = setInterval(async () => {
      try {
        const statusData = await scannerApi.getScanStatus(scanId);
        const scan = state.scans.find(s => s.id === scanId);
        if (!scan) {
          clearInterval(activePollingInterval);
          activePollingInterval = null;
          return;
        }

        scan.progress = statusData.progress || 0;
        scan.progressLabel = statusData.progressLabel || "Scanning...";
        scan.currentUrl = statusData.currentUrl || scan.url;
        scan.pagesScanned = statusData.pagesScanned || 0;
        scan.pagesAttempted = statusData.pagesAttempted || scan.pagesAttempted;
        scan.pagesFailed = statusData.pagesFailed || 0;
        scan.failedPages = statusData.failedPages || [];

        const rawStatus = (statusData.status || "").toLowerCase();

        if (rawStatus === "running" || rawStatus === "queued") {
          scan.status = "Running";
          runtime.render();
        } else {
          // Terminal state: completed, partially_completed, failed, cancelled
          clearInterval(activePollingInterval);
          activePollingInterval = null;

          scan.status = rawStatus === "completed" ? "Completed"
            : rawStatus === "partially_completed" ? "Partially Completed"
            : rawStatus === "cancelled" ? "Cancelled"
            : "Failed";
          scan.completedAt = statusData.completedAt || isoNow();
          scan.resultNote = statusData.resultNote;

          // Fetch full report
          try {
            const reportData = await scannerApi.getScanReport(scanId);
            scan.report = reportData.report;
            scan.cookiesCount = reportData.report?.totalCookies || 0;
            scan.unclassifiedCount = reportData.report?.unclassifiedCount || 0;
            scan.thirdPartyCount = reportData.report?.thirdPartyDomains?.length || 0;
          } catch {
            // report might not be available if failed immediately
          }

          persist(`Scan ${scan.status.toLowerCase()}: ${scan.resultNote || ""}`);
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 1200);
  }

  // Scanner actions
  async function triggerRealScan({ type, url, urls = [], pages = 10, depth = 2, duration = 120, includePaths = [], excludePaths = [] }) {
    if (state.scans.some(scan => scan.status === "Running")) {
      runtime.toast("A scan is already in progress. Wait or cancel the running scan.");
      return false;
    }

    try {
      runtime.toast(`Initiating Playwright ${type} on ${url}...`);

      const response = await scannerApi.startScan({
        url,
        type,
        maxPages: pages,
        maxDepth: depth,
        additionalUrls: urls.filter(u => u !== url),
        includePaths,
        excludePaths,
        maxDurationSec: duration,
      });

      const serverScan = response.scan;
      const scanItem = {
        id: serverScan.id,
        type,
        url: serverScan.url,
        urls: serverScan.urls || [url],
        createdAt: serverScan.createdAt || isoNow(),
        completedAt: null,
        status: "Running",
        pagesAttempted: serverScan.pagesAttempted || pages,
        pagesScanned: 0,
        pagesFailed: 0,
        progress: serverScan.progress || 5,
        progressLabel: serverScan.progressLabel || "Initializing Playwright browser context...",
        currentUrl: url,
        cookiesCount: 0,
        unclassifiedCount: 0,
        thirdPartyCount: 0,
        resultNote: "Real Playwright browser crawl in progress.",
      };

      state.scans.unshift(scanItem);
      persist(`${type} launched successfully`);

      // Start live polling
      startPolling(serverScan.id);
      return true;
    } catch (err) {
      runtime.toast(`Scan initiation failed: ${err.message}`);
      return false;
    }
  }

  function readScanSetup(element) {
    const type = readDialogField(element, "#cc-scan-setup-type") || "Custom Scan";
    const isDeepScan = type === "Deep Scan";
    const baseValue = readDialogField(element, "#cc-scan-setup-url")?.trim();
    const rawPages = readDialogField(element, "#cc-scan-setup-pages");
    const pages = isDeepScan ? 25 : Number(rawPages);
    if (!isDeepScan && (!Number.isInteger(pages) || pages < 1 || pages > 50)) {
      runtime.toast("Enter a page limit between 1 and 50");
      return null;
    }
    const depth = Number(readDialogField(element, "#cc-scan-setup-depth") || 2);
    const duration = Number(readDialogField(element, "#cc-scan-setup-duration") || 120);

    const additionalValues = [...(element?.closest('[role="dialog"]')?.querySelectorAll("#cc-scan-seed-list .cc-scan-seed") || [])]
      .map(input => input.value);
    const resolved = validateScanSeeds(baseValue, additionalValues, isDeepScan ? null : pages);
    if (resolved.error) {
      runtime.toast(resolved.error);
      return null;
    }

    const includePaths = (readDialogField(element, "#cc-scan-include-paths") || "")
      .split(",").map(p => p.trim()).filter(Boolean);
    const excludePaths = (readDialogField(element, "#cc-scan-exclude-paths") || "")
      .split(",").map(p => p.trim()).filter(Boolean);

    return {
      type,
      url: resolved.baseUrl,
      urls: resolved.urls,
      pages,
      depth,
      duration,
      includePaths,
      excludePaths,
    };
  }

  ACT["cc-scan-base-url"] = value => { ui.scanBaseUrl = value; };
  ACT["cc-scan-page-limit"] = value => { ui.scanPageLimit = value; };
  ACT["cc-scan-setup-type"] = (value, element) => {
    const pageLimitField = element?.closest('[role="dialog"]')?.querySelector("#cc-scan-page-limit-field");
    if (pageLimitField) pageLimitField.hidden = value === "Deep Scan";
  };

  ACT["cc-run-deep-scan"] = () => {
    const baseValue = runtime.$("#cc-scan-url")?.value?.trim();
    ui.scanBaseUrl = baseValue;
    const resolved = validateScanSeeds(baseValue, [], null);
    if (resolved.error) {
      runtime.toast(resolved.error);
      return;
    }
    triggerRealScan({
      type: "Deep Scan",
      url: resolved.baseUrl,
      urls: resolved.urls,
      pages: 25,
      depth: 2,
    });
  };

  ACT["cc-run-scan"] = ACT["cc-run-deep-scan"];

  ACT["cc-cancel-scan"] = async id => {
    try {
      runtime.toast("Cancelling scan...");
      await scannerApi.cancelScan(id);
      const scan = state.scans.find(s => s.id === id);
      if (scan) {
        scan.status = "Cancelled";
        scan.completedAt = isoNow();
        scan.progressLabel = "Scan cancelled by user.";
        scan.resultNote = "Scan was cancelled. Partial findings preserved.";
      }
      if (activePollingInterval) {
        clearInterval(activePollingInterval);
        activePollingInterval = null;
      }
      persist("Scan cancelled");
    } catch (err) {
      runtime.toast(`Cancellation failed: ${err.message}`);
    }
  };

  ACT["cc-schedule-scan-modal"] = () => {
    ui.scanSeedCounter = 1;
    const startingUrl = ui.scanBaseUrl || runtime.$("#cc-scan-url")?.value || "";
    const pageLimit = ui.scanPageLimit || 12;

    runtime.modal("Configure Custom Scan or Schedule", "Choose scan scope, depth, and automated schedule frequency", `
      <div class="g g2 cc-scan-setup-fields">
        <div class="field">
          <label for="cc-scan-setup-type">Scan Type</label>
          <select id="cc-scan-setup-type" data-act="cc-scan-setup-type">
            <option value="Custom Scan" selected>Custom Scan (Configurable limits)</option>
            <option value="Deep Scan">Deep Scan (Breadth-first crawl up to 25 pages)</option>
          </select>
        </div>
        <div class="field cc-scan-page-limit-field" id="cc-scan-page-limit-field">
          <label for="cc-scan-setup-pages">Maximum Pages to Scan (1–50)</label>
          <input id="cc-scan-setup-pages" type="number" min="1" max="50" value="${safe(pageLimit)}">
        </div>
        <div class="field cc-scan-base-field">
          <label for="cc-scan-setup-url">Target Website URL</label>
          <input id="cc-scan-setup-url" type="url" placeholder="https://example.com" value="${safe(startingUrl)}">
        </div>
        <div class="field">
          <label for="cc-scan-setup-depth">Crawl Link Depth</label>
          <select id="cc-scan-setup-depth">
            <option value="1">Depth 1 (Seed URLs only)</option>
            <option value="2" selected>Depth 2 (Seed URLs + 1 link jump)</option>
            <option value="3">Depth 3 (Seed URLs + 2 link jumps)</option>
          </select>
        </div>
        <div class="field">
          <label for="cc-scan-setup-duration">Max Scan Duration</label>
          <select id="cc-scan-setup-duration">
            <option value="60">1 Minute</option>
            <option value="120" selected>2 Minutes (Recommended)</option>
            <option value="300">5 Minutes</option>
          </select>
        </div>
        <div class="field">
          <label for="cc-scan-frequency">Schedule Frequency</label>
          <select id="cc-scan-frequency">
            <option value="Once" selected>One-time Only</option>
            <option value="Daily">Daily Automated Scan</option>
            <option value="Weekly">Weekly Automated Scan</option>
            <option value="Monthly">Monthly Automated Scan</option>
          </select>
        </div>
      </div>

      <div class="g g2" style="margin-top:10px;">
        <div class="field">
          <label for="cc-scan-include-paths">Include Paths (comma-separated, optional)</label>
          <input id="cc-scan-include-paths" type="text" placeholder="/products, /services, /shop">
        </div>
        <div class="field">
          <label for="cc-scan-exclude-paths">Exclude Paths (comma-separated, optional)</label>
          <input id="cc-scan-exclude-paths" type="text" placeholder="/admin, /logout, /login">
        </div>
      </div>

      <div class="cc-scan-seeds-heading" style="margin-top:14px;">
        <div><strong>Additional Starting URLs or Paths</strong><small style="display:block;color:var(--text-3);font-size:11px;">Add specific pages on the target domain, e.g. /pricing, /about</small></div>
        <button class="btn sm" type="button" data-act="cc-add-scan-seed">+ Add URL / Path</button>
      </div>
      <div id="cc-scan-seed-list" class="cc-scan-seed-list">
        <div class="cc-scan-seed-row">
          <input class="cc-scan-seed" type="text" placeholder="/services" aria-label="Additional URL or path 1">
          <button class="btn sm d" type="button" data-act="cc-remove-scan-seed" aria-label="Remove additional URL">×</button>
        </div>
      </div>

      <div class="field cc-scan-frequency-note" style="margin-top:12px;">
        <span class="cc-note">The Playwright scanner worker runs in an isolated browser environment with SSRF protections. It will inspect cookies (including HttpOnly/SameSite), observe network tracking requests, and test consent banner compliance.</span>
      </div>
    `, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn" data-act="cc-submit-scan-setup" data-arg="start">Start Real Scan</button>
      <button class="btn t" data-act="cc-submit-scan-setup" data-arg="schedule">Save Schedule</button>
    `, "drawer-wide");
  };

  ACT["cc-add-scan-seed"] = () => {
    const list = runtime.$("#cc-scan-seed-list");
    if (!list) return;
    const index = ++ui.scanSeedCounter;
    list.insertAdjacentHTML("beforeend", `
      <div class="cc-scan-seed-row">
        <input class="cc-scan-seed" type="text" placeholder="/pricing" aria-label="Additional URL or path ${index}">
        <button class="btn sm d" type="button" data-act="cc-remove-scan-seed" aria-label="Remove additional URL">×</button>
      </div>
    `);
    list.lastElementChild?.querySelector("input")?.focus();
  };

  ACT["cc-remove-scan-seed"] = (_value, element) => {
    const row = element?.closest(".cc-scan-seed-row");
    if (row) row.remove();
  };

  ACT["cc-submit-scan-setup"] = async (mode, element) => {
    const setup = readScanSetup(element);
    if (!setup) return;

    if (mode === "schedule") {
      const frequency = readDialogField(element, "#cc-scan-frequency") || "Weekly";
      try {
        const schedule = await scannerApi.createSchedule({
          url: setup.url,
          type: setup.type,
          frequency,
          pages: setup.pages,
          urls: setup.urls,
          enabled: true,
        });

        state.schedules = state.schedules || [];
        state.schedules.unshift(schedule);
        ui.scanBaseUrl = setup.url;
        ui.scanPageLimit = setup.pages;
        runtime.closeOv();
        persist(`${setup.type} scheduled with ${frequency.toLowerCase()} frequency`);
      } catch (err) {
        runtime.toast(`Failed to save schedule: ${err.message}`);
      }
      return;
    }

    runtime.closeOv();
    ui.scanBaseUrl = setup.url;
    ui.scanPageLimit = setup.pages;
    triggerRealScan(setup);
  };

  ACT["cc-run-scheduled-scan"] = async id => {
    const schedule = (state.schedules || []).find(item => item.id === id);
    if (!schedule) return;
    if (state.scans.some(scan => scan.status === "Running")) {
      runtime.toast("A scan is already in progress");
      return;
    }

    try {
      runtime.toast(`Running scheduled scan for ${schedule.url}...`);
      const res = await scannerApi.runSchedule(id);
      const serverScan = res.scan;

      const scanItem = {
        id: serverScan.id,
        type: schedule.type || "Custom Scan",
        url: schedule.url,
        urls: schedule.urls || [schedule.url],
        createdAt: serverScan.createdAt || isoNow(),
        completedAt: null,
        status: "Running",
        pagesAttempted: schedule.pages || 10,
        pagesScanned: 0,
        pagesFailed: 0,
        progress: 5,
        progressLabel: "Starting scheduled Playwright scan...",
        cookiesCount: 0,
        unclassifiedCount: 0,
        thirdPartyCount: 0,
        scheduledId: id,
      };

      state.scans.unshift(scanItem);
      schedule.lastRunAt = isoNow();
      schedule.lastRunStatus = "Running";
      schedule.lastScanId = serverScan.id;
      persist("Scheduled scan initiated");

      startPolling(serverScan.id);
    } catch (err) {
      runtime.toast(`Failed to run scheduled scan: ${err.message}`);
    }
  };

  ACT["cc-delete-scan-schedule"] = async id => {
    try {
      await scannerApi.deleteSchedule(id);
      state.schedules = (state.schedules || []).filter(schedule => schedule.id !== id);
      persist("Scan schedule removed");
    } catch (err) {
      runtime.toast(`Failed to remove schedule: ${err.message}`);
    }
  };

  ACT["cc-delete-scan"] = async id => {
    try {
      await scannerApi.deleteScan(id);
      state.scans = state.scans.filter(s => s.id !== id);
      persist("Scan record removed");
    } catch (err) {
      runtime.toast(`Delete error: ${err.message}`);
    }
  };

  // View detailed scan report modal
  ACT["cc-view-scan-report"] = async id => {
    let scan = state.scans.find(s => s.id === id);
    if (!scan) return;

    // Load full report if missing
    if (!scan.report) {
      try {
        runtime.toast("Loading detailed scan report from scanner backend...");
        const res = await scannerApi.getScanReport(id);
        scan.report = res.report;
        scan.cookiesCount = res.report?.totalCookies || 0;
        scan.unclassifiedCount = res.report?.unclassifiedCount || 0;
        scan.thirdPartyCount = res.report?.thirdPartyDomains?.length || 0;
      } catch (err) {
        runtime.toast(`Could not load full report: ${err.message}`);
      }
    }

    const report = scan.report;
    const cookies = report?.cookies || [];
    const trackers = report?.trackersDetected || [];
    const thirdPartyDomains = report?.thirdPartyDomains || [];
    const consent = report?.consentScenario || {};
    const pagesList = report?.pagesVisitedList || [];
    const failedList = report?.failedPages || [];
    const durationSec = scan.completedAt && scan.createdAt ? Math.round((new Date(scan.completedAt) - new Date(scan.createdAt)) / 1000) : null;

    const cookieRows = cookies.map((c, idx) => `
      <tr class="cc-report-cookie-row" data-search="${safe(`${c.name} ${c.domain} ${c.provider} ${c.category}`).toLowerCase()}" data-category="${safe(c.category)}">
        <td style="width:26%;">
          <span class="cc-report-cookie-title" title="${safe(c.name)}">${safe(c.name)}</span>
          <span class="cc-report-cookie-meta" title="${safe(c.path)} · ${safe(c.duration)}">${safe(c.path)} · ${safe(c.duration)}</span>
        </td>
        <td style="width:20%;font-family:var(--f-mono);font-size:11px;">
          <span class="cc-report-cell-truncate" title="${safe(c.domain)}">${safe(c.domain)}</span>
        </td>
        <td style="width:14%;">
          <span class="cc-report-cell-truncate" title="${safe(c.provider || "Unknown")}">${safe(c.provider || "Unknown")}</span>
        </td>
        <td style="width:14%;">
          ${runtime.pill(c.category === "necessary" ? "ok" : c.category === "analytics" ? "info" : c.category === "advertising" ? "risk" : "n", c.category)}
        </td>
        <td style="width:12%;">
          ${runtime.pill(c.confidence === "high" ? "ok" : c.confidence === "medium" ? "info" : "risk", c.confidence || "Needs Review")}
        </td>
        <td style="width:14%;">
          <span style="font-size:10.5px;color:var(--text-2);display:block;">${safe(c.party)}</span>
          <span style="display:inline-flex;gap:3px;margin-top:2px;">
            ${c.secure ? runtime.pill("ok", "Secure") : runtime.pill("n", "HTTP")}
            ${c.httpOnly ? runtime.pill("ok", "HttpOnly") : ""}
          </span>
        </td>
      </tr>
    `).join("");

    const trackerRows = trackers.map(t => `
      <tr>
        <td style="width:24%;font-family:var(--f-mono);font-weight:600;">
          <span class="cc-report-cell-truncate" title="${safe(t.domain)}">${safe(t.domain)}</span>
        </td>
        <td style="width:14%;">
          ${runtime.pill("info", t.type)}
        </td>
        <td style="width:18%;">
          <span class="cc-report-cell-truncate" title="${safe(t.name)}">${safe(t.name)}</span>
        </td>
        <td style="width:12%;">
          <code style="font-size:10px;padding:2px 4px;background:rgba(255,255,255,0.06);border-radius:4px;">${safe(t.resourceType || "script")}</code>
        </td>
        <td style="width:32%;">
          <span class="cc-report-code-url" title="${safe(t.urlSample)}" data-act="cc-copy-report-url" data-arg="${safe(t.urlSample)}">
            ${safe(t.urlSample)}
          </span>
        </td>
      </tr>
    `).join("");

    const modalBody = `
      <div class="cc-report-modal">
        <!-- Safe Redirect Notification if followed -->
        ${report?.redirectInfo?.redirected ? `
          <div class="cc-report-redirect-badge">
            <span style="font-weight:700;">Safe Redirect Verified:</span>
            <span><code>${safe(report.redirectInfo.initialUrl)}</code> ↳ Final Destination: <code>${safe(report.redirectInfo.finalUrl)}</code> (${report.redirectInfo.redirectChain?.length || 1} hop(s))</span>
          </div>
        ` : ""}

        <!-- Top KPIs -->
        <div class="cc-report-kpis">
          <div class="cc-report-kpi">
            <span>Target Website</span>
            <strong style="font-family:var(--f-mono);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safe(scan.url)}">
              ${safe(new URL(scan.url).hostname || scan.url)}
            </strong>
            <small>${report?.redirectInfo?.redirected ? "Redirected destination" : "Direct scan target"}</small>
          </div>
          <div class="cc-report-kpi">
            <span>Total Cookies Discovered</span>
            <strong style="color:var(--accent);">${cookies.length}</strong>
            <small>${cookies.filter(c => c.party === "First-party").length} 1st-party · ${cookies.filter(c => c.party === "Third-party").length} 3rd-party</small>
          </div>
          <div class="cc-report-kpi">
            <span>Third-Party Trackers</span>
            <strong>${thirdPartyDomains.length}</strong>
            <small>${trackers.length} tracking requests intercepted</small>
          </div>
          <div class="cc-report-kpi">
            <span>Pages Crawled</span>
            <strong>${report?.pagesScanned || scan.pagesScanned || 0}</strong>
            <small>${durationSec ? `${durationSec}s duration` : "Complete"} · ${failedList.length ? `<span style="color:var(--risk);">${failedList.length} failed</span>` : "0 errors"}</small>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="cc-report-nav-tabs" role="tablist">
          <button class="cc-report-tab-btn active" data-act="cc-switch-report-tab" data-arg="cookies" role="tab">
            Discovered Cookies <span class="cc-report-count-chip">${cookies.length}</span>
          </button>
          <button class="cc-report-tab-btn" data-act="cc-switch-report-tab" data-arg="trackers" role="tab">
            Network Trackers & Pixels <span class="cc-report-count-chip">${trackers.length}</span>
          </button>
          <button class="cc-report-tab-btn" data-act="cc-switch-report-tab" data-arg="consent" role="tab">
            Consent Interaction Scenario Test
          </button>
          <button class="cc-report-tab-btn" data-act="cc-switch-report-tab" data-arg="pages" role="tab">
            Crawled Pages <span class="cc-report-count-chip">${pagesList.length}</span>
          </button>
        </div>

        <!-- PANEL 1: Discovered Cookies Table -->
        <div class="cc-report-panel" data-panel="cookies">
          <div class="cc-report-filter-bar">
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <button class="btn sm cc-report-cat-btn active" data-act="cc-filter-report-category" data-arg="all">All (${cookies.length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="necessary">Necessary (${cookies.filter(c => c.category === 'necessary').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="analytics">Analytics (${cookies.filter(c => c.category === 'analytics').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="advertising">Advertising (${cookies.filter(c => c.category === 'advertising').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="functional">Functional (${cookies.filter(c => c.category === 'functional').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="unclassified">Needs Review (${cookies.filter(c => c.category === 'unclassified' || c.classificationStatus === 'Review required').length})</button>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="search" class="cc-report-search-input" placeholder="Filter cookies..." data-input-act="cc-filter-report-cookies">
              <button class="btn sm t" data-act="cc-sync-scan-to-inventory" data-arg="${safe(scan.id)}">Add All to Cookie Categories Inventory</button>
            </div>
          </div>

          <div class="cc-report-table-card">
            <div class="cc-report-table-wrapper">
              <table class="cc-report-table">
                <colgroup>
                  <col style="width:26%;">
                  <col style="width:20%;">
                  <col style="width:14%;">
                  <col style="width:14%;">
                  <col style="width:12%;">
                  <col style="width:14%;">
                </colgroup>
                <thead>
                  <tr>
                    <th>Cookie Name & Scope</th>
                    <th>Domain</th>
                    <th>Provider</th>
                    <th>Category</th>
                    <th>Confidence</th>
                    <th>Party & Security</th>
                  </tr>
                </thead>
                <tbody>
                  ${cookies.length ? cookieRows : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-3);">No cookies observed on this website.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PANEL 2: Network Trackers & Scripts -->
        <div class="cc-report-panel" data-panel="trackers" hidden>
          <div class="cc-report-filter-bar">
            <div>
              <span style="font-size:12px;font-weight:600;color:var(--text);">Observed Third-Party Trackers & Network Requests</span>
              <small style="display:block;font-size:10.5px;color:var(--text-3);">Click any truncated request URL to copy full URL to clipboard.</small>
            </div>
          </div>

          <div class="cc-report-table-card">
            <div class="cc-report-table-wrapper">
              <table class="cc-report-table">
                <colgroup>
                  <col style="width:24%;">
                  <col style="width:14%;">
                  <col style="width:18%;">
                  <col style="width:12%;">
                  <col style="width:32%;">
                </colgroup>
                <thead>
                  <tr>
                    <th>Tracker Domain</th>
                    <th>Category</th>
                    <th>Provider / Network</th>
                    <th>Resource</th>
                    <th>Sample Request URL (Click to Copy)</th>
                  </tr>
                </thead>
                <tbody>
                  ${trackers.length ? trackerRows : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-3);">No known third-party tracking scripts or beacons observed.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PANEL 3: Consent Interaction Audit -->
        <div class="cc-report-panel" data-panel="consent" hidden>
          <div style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:9px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="font-size:13px;color:var(--text);">Consent Interaction Scenario Test</strong>
              ${runtime.pill(consent.bannerDetected ? "ok" : "n", consent.bannerDetected ? "Standard Banner Detected" : "No Standard Banner Detected")}
            </div>
            <p style="font-size:11.5px;color:var(--text-2);margin:0 0 14px;line-height:1.5;">
              ${consent.bannerDetected
                ? `Standard consent banner detected using selector <code>${safe(consent.buttonClicked)}</code>. Initial visit (pre-consent) set <b>${consent.preConsentCookieCount || 0}</b> cookies. Post-Accept visit fired <b>${consent.postAcceptCookieCount || 0}</b> cookies (${consent.additionalCookiesDetected?.length || 0} additional cookies observed after simulated acceptance).`
                : (consent.note || "No standard consent banner detected or interacted with reliably on the landing page.")}
            </p>

            <div class="g g2">
              <div style="background:var(--surface);border:1px solid var(--line-2);border-radius:8px;padding:12px;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text-3);font-weight:600;letter-spacing:0.04em;">Pre-Consent Scenario</span>
                <div style="font-size:20px;font-weight:700;color:var(--text);margin:4px 0;">${consent.preConsentCookieCount ?? cookies.length} Cookies</div>
                <small style="color:var(--text-3);font-size:10.5px;">Fired on first arrival before visitor consent choice.</small>
              </div>
              <div style="background:var(--surface);border:1px solid var(--line-2);border-radius:8px;padding:12px;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text-3);font-weight:600;letter-spacing:0.04em;">Post-Accept All Scenario</span>
                <div style="font-size:20px;font-weight:700;color:var(--accent);margin:4px 0;">${consent.postAcceptCookieCount ?? cookies.length} Cookies</div>
                <small style="color:var(--text-3);font-size:10.5px;">Fired after clicking consent banner acceptance.</small>
              </div>
            </div>

            ${consent.additionalCookiesDetected?.length ? `
              <div style="margin-top:12px;padding:10px 12px;background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.25);border-radius:8px;">
                <strong style="font-size:11.5px;color:var(--accent);display:block;margin-bottom:4px;">Cookies Requiring Prior Consent (+${consent.additionalCookiesDetected.length})</strong>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${consent.additionalCookiesDetected.map(name => `<span class="pill sm ok">${safe(name)}</span>`).join("")}
                </div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- PANEL 4: Crawled Pages & Errors -->
        <div class="cc-report-panel" data-panel="pages" hidden>
          <div class="g g2">
            <div style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:9px;padding:12px;">
              <span style="font-size:11px;font-weight:600;color:var(--text);display:block;margin-bottom:8px;">
                Successfully Visited Pages (${pagesList.length})
              </span>
              <div style="max-height:220px;overflow-y:auto;overflow-x:hidden;">
                ${pagesList.map(p => `
                  <div class="cc-report-url-row" title="${safe(p)}">
                    <span class="cc-report-url-row-text" style="color:var(--ok);">✓ ${safe(p)}</span>
                    <button class="btn sm" style="padding:1px 6px;font-size:9.5px;" data-act="cc-copy-report-url" data-arg="${safe(p)}">Copy</button>
                  </div>
                `).join("")}
              </div>
            </div>

            <div style="background:var(--surface-2);border:1px solid var(--line-2);border-radius:9px;padding:12px;">
              <span style="font-size:11px;font-weight:600;color:var(--text);display:block;margin-bottom:8px;">
                Failed or Unreachable Pages (${failedList.length})
              </span>
              <div style="max-height:220px;overflow-y:auto;overflow-x:hidden;">
                ${failedList.length ? failedList.map(f => `
                  <div class="cc-report-url-row" style="border-left:2px solid var(--risk);" title="${safe(f.url)}: ${safe(f.error)}">
                    <div style="min-width:0;flex:1;">
                      <div class="cc-report-url-row-text" style="color:var(--risk);">✗ ${safe(f.url)}</div>
                      <small style="color:var(--text-3);font-size:9.5px;display:block;">${safe(f.error)}</small>
                    </div>
                  </div>
                `).join("") : `<div style="padding:16px;color:var(--text-3);font-size:11px;text-align:center;">All pages were visited successfully with 0 errors.</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    runtime.modal(`Scan Report: ${safe(scan.url)}`, `Scan ID: ${safe(scan.id)} · Type: ${safe(scan.type)} · ${safe(dateLabel(scan.createdAt))}`, modalBody, `
      <button class="btn" data-act="close">Close</button>
      <button class="btn t" data-act="cc-sync-scan-to-inventory" data-arg="${safe(scan.id)}">Add Discovered to Inventory</button>
    `, "drawer-wide");
  };

  // Report modal interactive tab switching
  ACT["cc-switch-report-tab"] = (tabName, element) => {
    const modal = element?.closest(".cc-report-modal") || document.querySelector(".cc-report-modal");
    if (!modal) return;

    modal.querySelectorAll(".cc-report-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-arg") === tabName);
    });

    modal.querySelectorAll(".cc-report-panel").forEach(panel => {
      panel.hidden = panel.getAttribute("data-panel") !== tabName;
    });
  };

  // Report modal category filtering
  ACT["cc-filter-report-category"] = (cat, element) => {
    const modal = element?.closest(".cc-report-modal") || document.querySelector(".cc-report-modal");
    if (!modal) return;

    modal.querySelectorAll(".cc-report-cat-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-arg") === cat);
    });

    const searchInput = modal.querySelector(".cc-report-search-input");
    const query = (searchInput?.value || "").toLowerCase().trim();

    modal.querySelectorAll(".cc-report-cookie-row").forEach(row => {
      const rowCat = (row.getAttribute("data-category") || "").toLowerCase();
      const rowSearch = (row.getAttribute("data-search") || "").toLowerCase();
      const catMatch = cat === "all" || (cat === "unclassified" ? (rowCat === "unclassified" || row.innerText.toLowerCase().includes("review required")) : rowCat === cat);
      const searchMatch = !query || rowSearch.includes(query);
      row.style.display = (catMatch && searchMatch) ? "" : "none";
    });
  };

  // Report modal live cookie search
  ACT["cc-filter-report-cookies"] = (query, element) => {
    const modal = element?.closest(".cc-report-modal") || document.querySelector(".cc-report-modal");
    if (!modal) return;

    const activeCatBtn = modal.querySelector(".cc-report-cat-btn.active");
    const activeCat = activeCatBtn?.getAttribute("data-arg") || "all";
    const q = (query || "").toLowerCase().trim();

    modal.querySelectorAll(".cc-report-cookie-row").forEach(row => {
      const rowCat = (row.getAttribute("data-category") || "").toLowerCase();
      const rowSearch = (row.getAttribute("data-search") || "").toLowerCase();
      const catMatch = activeCat === "all" || (activeCat === "unclassified" ? (rowCat === "unclassified" || row.innerText.toLowerCase().includes("review required")) : rowCat === activeCat);
      const searchMatch = !q || rowSearch.includes(q);
      row.style.display = (catMatch && searchMatch) ? "" : "none";
    });
  };

  // Report modal URL copy helper
  ACT["cc-copy-report-url"] = url => {
    if (!url) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url);
      }
      runtime.toast("Copied URL to clipboard");
    } catch {
      runtime.toast("Copied URL to clipboard");
    }
  };

  // Sync discovered cookies into Cookie Categories inventory
  ACT["cc-sync-scan-to-inventory"] = async id => {
    let scan = state.scans.find(s => s.id === id);
    if (!scan) return;

    if (!scan.report) {
      try {
        const res = await scannerApi.getScanReport(id);
        scan.report = res.report;
      } catch (err) {
        runtime.toast(`Could not load report for sync: ${err.message}`);
        return;
      }
    }

    const discoveredCookies = scan.report?.cookies || [];
    if (!discoveredCookies.length) {
      runtime.toast("No cookies were discovered in this scan to add.");
      return;
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const dc of discoveredCookies) {
      const existing = state.cookies.find(
        c => c.name.toLowerCase() === dc.name.toLowerCase() && (c.domain.toLowerCase() === dc.domain.toLowerCase() || !dc.domain)
      );

      if (existing) {
        existing.lastDetected = isoNow();
        existing.secure = dc.secure;
        existing.httpOnly = dc.httpOnly;
        existing.duration = dc.duration || existing.duration;
        updatedCount += 1;
      } else {
        const newRecord = {
          id: `cookie-scanned-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: dc.name,
          category: dc.category && dc.category !== "unclassified" ? dc.category : "functional",
          domain: dc.domain || new URL(scan.url).hostname,
          path: dc.path || "/",
          purpose: state.categories.find(c => c.id === dc.category)?.name || "Discovered Cookie",
          party: dc.party || "First-party",
          provider: dc.provider || "Discovered on Website",
          duration: dc.duration || "Session",
          description: dc.description || `Discovered by Playwright scan on ${scan.url}`,
          httpOnly: Boolean(dc.httpOnly),
          secure: Boolean(dc.secure),
          sameSite: dc.sameSite || "Lax",
          lastDetected: isoNow(),
          sourcePage: scan.url,
          classificationStatus: dc.category && dc.category !== "unclassified" ? "Reviewed" : "Review required",
          scanId: scan.id,
        };
        state.cookies.unshift(newRecord);
        addedCount += 1;
      }
    }

    persist(`Added ${addedCount} new cookies to Inventory (${updatedCount} updated)`);
  };

  // Compare scans modal
  ACT["cc-compare-scans-modal"] = async targetScanId => {
    const completedScans = state.scans.filter(s => s.status === "Completed" || s.status === "Partially Completed");
    if (completedScans.length < 2) {
      runtime.toast("At least 2 completed scans are needed to perform a comparison.");
      return;
    }

    const currentScan = state.scans.find(s => s.id === targetScanId) || completedScans[0];
    const previousScan = completedScans.find(s => s.id !== currentScan.id) || completedScans[1];

    const modalBody = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div class="g g2">
          <div class="field">
            <label for="cc-compare-base-scan">Base (Older) Scan</label>
            <select id="cc-compare-base-scan">
              ${completedScans.map(s => `
                <option value="${safe(s.id)}" ${s.id === previousScan.id ? "selected" : ""}>
                  ${safe(s.url)} (${safe(dateLabel(s.createdAt))})
                </option>
              `).join("")}
            </select>
          </div>
          <div class="field">
            <label for="cc-compare-target-scan">Target (Newer) Scan</label>
            <select id="cc-compare-target-scan">
              ${completedScans.map(s => `
                <option value="${safe(s.id)}" ${s.id === currentScan.id ? "selected" : ""}>
                  ${safe(s.url)} (${safe(dateLabel(s.createdAt))})
                </option>
              `).join("")}
            </select>
          </div>
        </div>
        <div id="cc-compare-results-area" style="min-height:120px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:12px;">
          <p style="color:var(--text-3);font-size:12px;margin:0;">Click "Compare Scans" to compute additions, disappearances, and attribute drift between the two selected scans.</p>
        </div>
      </div>
    `;

    runtime.modal("Compare Website Cookie Scans", "Identify newly added cookies, unobserved cookies, and tracker drift", modalBody, `
      <button class="btn" data-act="close">Close</button>
      <button class="btn t" data-act="cc-run-compare-scans">Run Comparison</button>
    `, "drawer-wide");
  };

  ACT["cc-run-compare-scans"] = async (_arg, element) => {
    const dialog = element?.closest('[role="dialog"]');
    const baseId = dialog?.querySelector("#cc-compare-base-scan")?.value;
    const targetId = dialog?.querySelector("#cc-compare-target-scan")?.value;

    if (!baseId || !targetId) {
      runtime.toast("Select both scans to compare.");
      return;
    }
    if (baseId === targetId) {
      runtime.toast("Select two different scans to compare.");
      return;
    }

    const resultsArea = dialog?.querySelector("#cc-compare-results-area");
    if (resultsArea) {
      resultsArea.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-3);">Computing scan diff...</div>`;
    }

    try {
      const diff = await scannerApi.compareScans(baseId, targetId);
      if (!resultsArea) return;

      const newCookiesHtml = (diff.newCookies || []).map(c => `
        <tr>
          <td><b style="color:var(--ok);">${safe(c.name)}</b></td>
          <td>${safe(c.domain)}</td>
          <td>${runtime.pill("info", c.category)}</td>
          <td>${safe(c.party)}</td>
          <td>${safe(c.duration)}</td>
        </tr>
      `).join("");

      const notObservedHtml = (diff.notObservedCookies || []).map(c => `
        <tr>
          <td><b style="color:var(--risk);">${safe(c.name)}</b></td>
          <td>${safe(c.domain)}</td>
          <td>${safe(c.category)}</td>
          <td>${safe(c.party)}</td>
          <td style="font-size:10px;color:var(--text-3);">Not observed in target scan</td>
        </tr>
      `).join("");

      const attributeChangesHtml = (diff.changedAttributes || []).map(a => `
        <tr>
          <td><b>${safe(a.name)}</b><span class="sub" style="display:block;font-size:10px;">${safe(a.domain)}</span></td>
          <td colspan="4" style="color:var(--accent);font-size:11px;">${a.changes.join("<br>")}</td>
        </tr>
      `).join("");

      resultsArea.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <!-- Summary chips -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${runtime.pill("ok", `+${diff.newCookies?.length || 0} Newly Discovered`)}
            ${runtime.pill("risk", `-${diff.notObservedCookies?.length || 0} Not Observed`)}
            ${runtime.pill("info", `${diff.changedAttributes?.length || 0} Attribute Changes`)}
            ${runtime.pill("n", `+${diff.domainChanges?.newDomains?.length || 0} New Trackers`)}
          </div>

          <!-- Newly Discovered Table -->
          ${diff.newCookies?.length ? `
            <div>
              <strong style="display:block;font-size:12px;color:var(--ok);margin-bottom:4px;">Newly Discovered Cookies (+${diff.newCookies.length})</strong>
              <div style="max-height:120px;overflow-y:auto;border:1px solid var(--line-2);border-radius:6px;">
                <table class="t" style="margin:0;width:100%;font-size:11px;">
                  <thead><tr><th>Name</th><th>Domain</th><th>Category</th><th>Party</th><th>Duration</th></tr></thead>
                  <tbody>${newCookiesHtml}</tbody>
                </table>
              </div>
            </div>
          ` : `<div style="font-size:11px;color:var(--text-3);">No new cookies appeared.</div>`}

          <!-- Not Observed Table -->
          ${diff.notObservedCookies?.length ? `
            <div>
              <strong style="display:block;font-size:12px;color:var(--risk);margin-bottom:4px;">Cookies Not Observed in Target Scan (-${diff.notObservedCookies.length})</strong>
              <div style="max-height:120px;overflow-y:auto;border:1px solid var(--line-2);border-radius:6px;">
                <table class="t" style="margin:0;width:100%;font-size:11px;">
                  <thead><tr><th>Name</th><th>Domain</th><th>Category</th><th>Party</th><th>Note</th></tr></thead>
                  <tbody>${notObservedHtml}</tbody>
                </table>
              </div>
            </div>
          ` : ""}

          <!-- Changed Attributes -->
          ${diff.changedAttributes?.length ? `
            <div>
              <strong style="display:block;font-size:12px;color:var(--accent);margin-bottom:4px;">Attribute Drift (${diff.changedAttributes.length})</strong>
              <div style="max-height:100px;overflow-y:auto;border:1px solid var(--line-2);border-radius:6px;">
                <table class="t" style="margin:0;width:100%;font-size:11px;">
                  <thead><tr><th>Cookie</th><th colspan="4">Detected Changes</th></tr></thead>
                  <tbody>${attributeChangesHtml}</tbody>
                </table>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    } catch (err) {
      if (resultsArea) {
        resultsArea.innerHTML = `<div style="color:var(--risk);padding:10px;">Comparison failed: ${safe(err.message)}</div>`;
      }
    }
  };
}
