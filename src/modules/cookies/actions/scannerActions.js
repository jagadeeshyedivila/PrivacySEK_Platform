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
  ACT["cc-scans-page"] = (p, el) => {
    const pageVal = p || el?.getAttribute("data-arg") || el?.getAttribute("data-page");
    ui.scannerHistoryPage = Math.max(1, Number(pageVal) || 1);
    runtime.render();
  };
  ACT["cc-scans-page-size"] = (s, el) => {
    const sizeVal = s || el?.value || el?.getAttribute("data-arg");
    ui.scannerHistoryPageSize = Math.max(1, Number(sizeVal) || 10);
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
      const scanList = Array.isArray(backendHistory) ? backendHistory : (backendHistory?.scans || []);
      if (scanList.length > 0) {
        // Merge backend scans into state.scans
        for (const bScan of scanList) {
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

          // Update matching schedule in state.schedules immediately
          const linkedSchedule = (state.schedules || []).find(s =>
            s.id === scan.scheduledId || s.lastScanId === scanId || (s.url === scan.url && s.lastRunStatus === "Running")
          );
          if (linkedSchedule) {
            linkedSchedule.lastRunStatus = scan.status;
            linkedSchedule.lastRunAt = scan.completedAt;
            if (linkedSchedule.frequency === "Once") {
              linkedSchedule.enabled = false;
              linkedSchedule.nextRunAt = null;
            }
          }

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

          // Sync fresh schedules from backend
          try {
            const freshSchedules = await scannerApi.getSchedules();
            if (Array.isArray(freshSchedules)) {
              state.schedules = freshSchedules;
            }
          } catch {
            // ignore if offline
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
      runtime.toast("Maximum pages to scan must be a whole number between 1 and 50.");
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

    // Schedule specific fields
    const frequency = readDialogField(element, "#cc-scan-frequency") || "Once";
    const scheduleTime = readDialogField(element, "#cc-scan-sched-time") || "09:00";
    const scheduleWeekday = Number(readDialogField(element, "#cc-scan-sched-weekday") || 1);
    const scheduleMonthDay = Number(readDialogField(element, "#cc-scan-sched-monthday") || 1);

    return {
      type,
      url: resolved.baseUrl,
      urls: resolved.urls,
      pages,
      depth,
      duration,
      includePaths,
      excludePaths,
      frequency,
      scheduleOptions: {
        time: scheduleTime,
        weekday: scheduleWeekday,
        monthDay: scheduleMonthDay,
      },
    };
  }

  ACT["cc-scan-base-url"] = value => { ui.scanBaseUrl = value; };

  // Scroll to a section of the scanner page (scan history / schedules)
  ACT["cc-scan-jump"] = targetId => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  ACT["cc-scan-page-limit"] = value => { ui.scanPageLimit = value; };
  ACT["cc-scan-setup-type"] = (value, element) => {
    const dialog = element?.closest('[role="dialog"]') || document.querySelector('.modal[role="dialog"]');
    const pageLimitField = dialog?.querySelector("#cc-scan-page-limit-field");
    if (pageLimitField) {
      const isDeep = value === "Deep Scan";
      pageLimitField.hidden = isDeep;
      pageLimitField.style.display = isDeep ? "none" : "block";
    }
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
        // <button id="cc-scan-advanced-toggle" type="button" class="btn sm" data-act="cc-toggle-scan-advanced" style="background:transparent;border:1px dashed var(--line);color:var(--text-2);">+ Show Advanced Path Filters</button>


  let lastSeedAddTimestamp = 0;

  ACT["cc-schedule-scan-modal"] = () => {
    ui.scanSeedCounter = 0;
    const startingUrl = ui.scanBaseUrl || runtime.$("#cc-scan-url")?.value || "";
    const pageLimit = ui.scanPageLimit || 10;

    runtime.modal("Configure Custom Scan or Schedule", "Define scan budget, starting URL, and automated recurrence", `
      <div class="g g2 cc-scan-setup-fields">
        <div class="field">
          <label for="cc-scan-setup-type">Scan Type</label>
          <select id="cc-scan-setup-type" data-act="cc-scan-setup-type">
            <option value="Custom Scan" selected>Custom Scan (Targeted configuration)</option>
            <option value="Deep Scan">Deep Scan (Broad site crawl up to 25 pages)</option>
          </select>
        </div>
        <div class="field cc-scan-page-limit-field" id="cc-scan-page-limit-field">
          <label for="cc-scan-setup-pages">Maximum Pages to Scan (Budget: 1–50)</label>
          <input id="cc-scan-setup-pages" type="number" min="1" max="50" step="1" value="${safe(pageLimit)}">
          <small style="color:var(--text-3);font-size:11px;margin-top:2px;">Unique eligible pages budget. The crawler finishes once this limit or all links are scanned.</small>
        </div>
        <div class="field cc-scan-base-field">
          <label for="cc-scan-setup-url">Target Website URL <span style="color:var(--risk);">*</span></label>
          <input id="cc-scan-setup-url" type="url" placeholder="https://example.com" value="${safe(startingUrl)}">
          <small style="color:var(--text-3);font-size:11px;margin-top:2px;">Must use HTTP or HTTPS. Fragments (#) are automatically ignored.</small>
        </div>
       
        <div class="field">
          <label for="cc-scan-frequency">Schedule Frequency</label>
          <select id="cc-scan-frequency" data-act="cc-scan-frequency-change">
            <option value="Once" selected>One-time Only (Immediate execution)</option>
            <option value="Daily">Daily Recurring Scan</option>
            <option value="Weekly">Weekly Recurring Scan</option>
            <option value="Monthly">Monthly Recurring Scan</option>
          </select>
        </div>
      </div>

      <!-- Conditional recurrence controls -->
      <div id="cc-scan-recurrence-options" class="g g3" style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:8px;display:none;" hidden>
        <div class="field">
          <label for="cc-scan-sched-time">Execution Time</label>
          <input id="cc-scan-sched-time" type="time" value="09:00">
        </div>
        <div class="field" id="cc-scan-weekday-wrap" style="display:none;" hidden>
          <label for="cc-scan-sched-weekday">Day of Week</label>
          <select id="cc-scan-sched-weekday">
            <option value="1" selected>Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
            <option value="0">Sunday</option>
          </select>
        </div>
        <div class="field" id="cc-scan-monthday-wrap" style="display:none;" hidden>
          <label for="cc-scan-sched-monthday">Day of Month</label>
          <input id="cc-scan-sched-monthday" type="number" min="1" max="31" value="1">
        </div>
      </div>

      <!-- Additional Starting URLs or Paths -->
      <div class="cc-scan-seeds-heading" style="margin-top:14px;">
        <div><strong>Additional Starting URLs or Paths</strong><small style="display:block;color:var(--text-3);font-size:11px;">Specify additional entry-point pages on the target origin, e.g. /pricing, /about</small></div>
        <button class="btn sm" type="button" data-act="cc-add-scan-seed">+ Add URL / Path</button>
      </div>
      <div id="cc-scan-seed-list" class="cc-scan-seed-list"></div>

      <!-- Advanced Path Filters (Collapsible) -->
      <div style="margin-top:14px;">
        <div id="cc-scan-advanced-section" class="g g2" style="margin-top:10px;display:none;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);" hidden>
          <div class="field">
            <label for="cc-scan-include-paths">Include Paths (comma-separated)</label>
            <input id="cc-scan-include-paths" type="text" placeholder="/products, /services, /shop/*">
            <small style="color:var(--text-3);font-size:11px;margin-top:2px;">If set, only URLs matching these prefixes or wildcards are scanned.</small>
          </div>
          <div class="field">
            <label for="cc-scan-exclude-paths">Exclude Paths (comma-separated)</label>
            <input id="cc-scan-exclude-paths" type="text" placeholder="/admin, /logout, /login, /api/*">
            <small style="color:var(--text-3);font-size:11px;margin-top:2px;">Exclusion takes priority over inclusion rules.</small>
          </div>
        </div>
      </div>

      <div class="field cc-scan-frequency-note" style="margin-top:12px;">
        <span class="cc-note">The Playwright engine operates in an isolated browser sandbox with real-time SSRF guards. It validates cookies (HTTP, JS, SameSite, Secure), observes dynamic tracking pixels, and tests pre/post consent states.</span>
      </div>
    `, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn" id="cc-btn-start-scan" data-act="cc-submit-scan-setup" data-arg="start">Scan Now</button>
      <button class="btn t" id="cc-btn-schedule-scan" data-act="cc-submit-scan-setup" data-arg="schedule" disabled title="Select a recurring frequency (Daily, Weekly, or Monthly) to schedule">Schedule for Later</button>
    `, "drawer-wide");
  };

  ACT["cc-scan-frequency-change"] = (value, element) => {
    const dialog = element?.closest('[role="dialog"]') || document.querySelector('.modal[role="dialog"]');
    const recurFields = dialog?.querySelector("#cc-scan-recurrence-options");
    const weekdayWrap = dialog?.querySelector("#cc-scan-weekday-wrap");
    const monthdayWrap = dialog?.querySelector("#cc-scan-monthday-wrap");
    const schedBtn = dialog?.querySelector("#cc-btn-schedule-scan");

    const isRecurring = value !== "Once";
    if (recurFields) {
      recurFields.hidden = !isRecurring;
      recurFields.style.display = isRecurring ? "grid" : "none";
    }
    if (weekdayWrap) {
      weekdayWrap.hidden = value !== "Weekly";
      weekdayWrap.style.display = value === "Weekly" ? "block" : "none";
    }
    if (monthdayWrap) {
      monthdayWrap.hidden = value !== "Monthly";
      monthdayWrap.style.display = value === "Monthly" ? "block" : "none";
    }
    if (schedBtn) {
      schedBtn.disabled = !isRecurring;
      if (!isRecurring) {
        schedBtn.title = "Select a recurring frequency (Daily, Weekly, or Monthly) to schedule";
      } else {
        schedBtn.removeAttribute("title");
      }
    }
  };

  ACT["cc-toggle-scan-advanced"] = (_value, element) => {
    const dialog = element?.closest('[role="dialog"]') || document.querySelector('.modal[role="dialog"]');
    const advSection = dialog?.querySelector("#cc-scan-advanced-section");
    const toggleBtn = dialog?.querySelector("#cc-scan-advanced-toggle") || element;
    if (advSection) {
      const willHide = !advSection.hidden;
      advSection.hidden = willHide;
      advSection.style.display = willHide ? "none" : "block";
      if (toggleBtn) {
        toggleBtn.textContent = willHide ? "+ Show Advanced Path Filters" : "- Hide Advanced Path Filters";
      }
    }
  };

  ACT["cc-add-scan-seed"] = (_arg, element) => {
    const now = Date.now();
    // Guard against rapid duplicate clicks within 350ms
    if (now - lastSeedAddTimestamp < 350) return;
    lastSeedAddTimestamp = now;

    const dialog = element?.closest('[role="dialog"]') || document.querySelector('.modal[role="dialog"]');
    const seedList = dialog?.querySelector("#cc-scan-seed-list");
    if (!seedList) return;

    // Check if the last seed input row is already empty
    const existingInputs = seedList.querySelectorAll(".cc-scan-seed");
    if (existingInputs.length > 0) {
      const lastInput = existingInputs[existingInputs.length - 1];
      if (!lastInput.value || !lastInput.value.trim()) {
        // Last input is still empty, do not add another empty box, simply focus it
        lastInput.focus();
        return;
      }
    }

    ui.scanSeedCounter = (ui.scanSeedCounter || 0) + 1;
    const row = document.createElement("div");
    row.className = "cc-scan-seed-row";
    row.innerHTML = `
      <input class="cc-scan-seed" type="text" placeholder="/pricing" aria-label="Additional URL or path ${ui.scanSeedCounter}">
      <button class="btn sm d" type="button" data-act="cc-remove-scan-seed" aria-label="Remove additional URL">×</button>
    `;
    seedList.appendChild(row);
    const input = row.querySelector("input");
    if (input) input.focus();
  };

  ACT["cc-remove-scan-seed"] = (_arg, element) => {
    const row = element?.closest(".cc-scan-seed-row");
    if (row) {
      row.remove();
    }
  };

  ACT["cc-submit-scan-setup"] = async (mode, element) => {
    if (element?.disabled) return;
    const setup = readScanSetup(element);
    if (!setup) return;

    const startBtn = element?.closest('[role="dialog"]')?.querySelector("#cc-btn-start-scan");
    const schedBtn = element?.closest('[role="dialog"]')?.querySelector("#cc-btn-schedule-scan");
    if (startBtn) startBtn.disabled = true;
    if (schedBtn) schedBtn.disabled = true;

    if (mode === "schedule") {
      if (setup.frequency === "Once") {
        runtime.toast("Please select Daily, Weekly, or Monthly for automated recurrence, or click Scan Now for an immediate scan.");
        if (startBtn) startBtn.disabled = false;
        if (schedBtn) schedBtn.disabled = false;
        return;
      }
      try {
        const schedule = await scannerApi.createSchedule({
          url: setup.url,
          type: setup.type,
          frequency: setup.frequency,
          pages: setup.pages,
          depth: setup.depth,
          duration: setup.duration,
          includePaths: setup.includePaths,
          excludePaths: setup.excludePaths,
          urls: setup.urls,
          options: setup.scheduleOptions,
          enabled: true,
        });

        state.schedules = state.schedules || [];
        state.schedules.unshift(schedule);
        ui.scanBaseUrl = setup.url;
        ui.scanPageLimit = setup.pages;
        runtime.closeOv();
        persist(`${setup.type} scheduled with ${setup.frequency.toLowerCase()} frequency`);
      } catch (err) {
        runtime.toast(`Failed to save schedule: ${err.message}`);
        if (startBtn) startBtn.disabled = false;
        if (schedBtn) schedBtn.disabled = false;
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
      if (schedule.frequency === "Once") {
        schedule.nextRunAt = null;
      }
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

    const isReview = c => c.category === "unclassified" || c.classificationStatus === "Review required";
    const defaultCats = [
      ["necessary", "Necessary"], ["functional", "Functional"], ["analytics", "Analytics"],
      ["marketing", "Marketing"], ["advertising", "Advertising"], ["social_media", "Social Media"],
    ];
    const catOptions = (state.categories && state.categories.length)
      ? state.categories.map(cat => [cat.id, cat.name])
      : defaultCats;
    const catName = id => (catOptions.find(([cid]) => cid === id) || defaultCats.find(([cid]) => cid === id) || [id, id || "Unclassified"])[1];
    const catKey = id => ["necessary", "functional", "analytics", "marketing", "advertising", "social_media"].includes(id) ? id : "other";

    let host = scan.url;
    try { host = new URL(scan.url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }

    const firstParty = cookies.filter(c => c.party === "First-party").length;
    const thirdParty = cookies.filter(c => c.party === "Third-party").length;
    const reviewCount = cookies.filter(isReview).length;
    const nonEssential = cookies.filter(c => !isReview(c) && c.category !== "necessary").length;

    // Category distribution (for the stacked bar + filter chips)
    const catCounts = {};
    cookies.forEach(c => {
      const key = isReview(c) ? "unclassified" : (c.category || "unclassified");
      catCounts[key] = (catCounts[key] || 0) + 1;
    });
    const distOrder = [...defaultCats.map(([id]) => id), ...Object.keys(catCounts).filter(k => !defaultCats.some(([id]) => id === k) && k !== "unclassified"), "unclassified"];
    const distSegments = distOrder.filter(k => catCounts[k]).map(k => ({
      id: k,
      label: k === "unclassified" ? "Needs review" : catName(k),
      count: catCounts[k],
      pct: cookies.length ? (catCounts[k] / cookies.length) * 100 : 0,
      key: k === "unclassified" ? "unclassified" : catKey(k),
    }));

    const confidenceHtml = c => {
      const level = String(c.confidence || "").toLowerCase();
      if (level === "manual") return `<span class="ccx-conf is-manual" title="Classified manually">Manual</span>`;
      const bars = level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;
      const label = bars ? level.charAt(0).toUpperCase() + level.slice(1) : "Unknown";
      return `<span class="ccx-conf lvl-${bars}" title="Classification confidence: ${safe(label)}"><span class="ccx-conf-bars"><i></i><i></i><i></i></span>${safe(label)}</span>`;
    };

    const cookieRows = cookies.map(c => {
      const review = isReview(c);
      const options = catOptions.map(([id, name]) => `<option value="${safe(id)}" ${!review && c.category === id ? "selected" : ""}>${safe(name)}</option>`).join("");
      const categoryControl = review ? `
        <span class="ccx-cat-pill is-review">
          <select class="cc-report-cat-select ccx-cat-select" data-act="cc-report-classify-cookie" data-scan-id="${safe(scan.id)}" data-cookie-name="${safe(c.name)}" aria-label="Classify ${safe(c.name)}">
            <option value="" disabled selected>Classify…</option>
            ${options}
          </select>
        </span>
      ` : `
        <span class="ccx-cat-pill" data-cat="${safe(catKey(c.category))}" title="Change category">
          <select class="cc-report-cat-select-sm ccx-cat-select" data-act="cc-report-classify-cookie" data-scan-id="${safe(scan.id)}" data-cookie-name="${safe(c.name)}" aria-label="Category for ${safe(c.name)}">
            ${catOptions.some(([id]) => id === c.category) ? "" : `<option value="${safe(c.category)}" selected>${safe(catName(c.category))}</option>`}
            ${options}
          </select>
        </span>
      `;

      return `
        <tr class="cc-report-cookie-row${review ? " is-review" : ""}" data-search="${safe(`${c.name} ${c.domain} ${c.provider} ${c.category}`).toLowerCase()}" data-category="${safe(review ? "unclassified" : c.category)}">
          <td>
            <span class="cc-report-cookie-title" title="${safe(c.name)}">${safe(c.name)}</span>
            <span class="cc-report-cookie-meta" title="Path ${safe(c.path)} · Expires ${safe(c.duration)}">${safe(c.path || "/")} · ${safe(c.duration || "Session")}</span>
          </td>
          <td>
            <span class="ccx-mono cc-report-cell-truncate" title="${safe(c.domain)}">${safe(c.domain)}</span>
            <span class="ccx-party ${c.party === "Third-party" ? "is-third" : ""}">${safe(c.party || "Unknown")}</span>
          </td>
          <td><span class="cc-report-cell-truncate" title="${safe(c.provider || "Unknown")}">${safe(c.provider || "Unknown")}</span></td>
          <td>${categoryControl}</td>
          <td>${confidenceHtml(c)}</td>
          <td>
            <span class="ccx-attrs">
              ${c.secure ? `<span class="ccx-attr is-ok">Secure</span>` : `<span class="ccx-attr is-warn" title="Cookie is not marked Secure">Not secure</span>`}
              ${c.httpOnly ? `<span class="ccx-attr is-ok">HttpOnly</span>` : ""}
              ${c.sameSite ? `<span class="ccx-attr" title="SameSite=${safe(c.sameSite)}">SameSite ${safe(c.sameSite)}</span>` : ""}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    const trackerRows = trackers.map(t => `
      <tr>
        <td>
          <span class="ccx-mono cc-report-cell-truncate" style="font-weight:600;" title="${safe(t.domain)}">${safe(t.domain)}</span>
          <span class="cc-report-cookie-meta" title="${safe(t.name)}">${safe(t.name || "Unknown network")}</span>
        </td>
        <td><span class="ccx-type-chip is-custom">${safe(t.type || "Tracker")}</span></td>
        <td><span class="ccx-attr">${safe(t.resourceType || "script")}</span></td>
        <td>
          <span class="ccx-url-cell">
            <span class="cc-report-code-url" title="${safe(t.urlSample)}">${safe(t.urlSample)}</span>
            <button type="button" class="ccx-icon-btn" data-act="cc-copy-report-url" data-arg="${safe(t.urlSample)}" title="Copy request URL" aria-label="Copy request URL">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
            </button>
          </span>
        </td>
      </tr>
    `).join("");

    const statusTone = scan.status === "Completed" ? "ok" : scan.status === "Partially Completed" ? "mask" : scan.status === "Running" ? "info" : "risk";
    const preCount = consent.preConsentCookieCount ?? cookies.length;
    const postCount = consent.postAcceptCookieCount ?? cookies.length;
    const extra = consent.additionalCookiesDetected || [];

    const kpi = (label, value, note, cls = "") => `
      <div class="ccx-rkpi">
        <span>${label}</span>
        <strong class="${cls}">${value}</strong>
        <small>${note}</small>
      </div>
    `;

    const modalBody = `
      <div class="cc-report-modal ccx-report">
        <div class="ccx-report-site">
          <span class="ccx-site-avatar is-lg" aria-hidden="true">${safe((host[0] || "?").toUpperCase())}</span>
          <div class="ccx-report-site-text">
            <div class="ccx-report-site-row">
              <strong>${safe(host)}</strong>
              ${runtime.pill(statusTone, scan.status || "Unknown")}
            </div>
            <a href="${safe(scan.url)}" target="_blank" rel="noopener noreferrer" class="ccx-site-url" title="${safe(scan.url)}">${safe(scan.url)}</a>
          </div>
          <dl class="ccx-report-facts">
            <div><dt>Scan type</dt><dd>${safe(scan.type || "—")}</dd></div>
            <div><dt>Started</dt><dd>${safe(dateLabel(scan.createdAt))}</dd></div>
            <div><dt>Duration</dt><dd>${durationSec ? `${durationSec}s` : "—"}</dd></div>
          </dl>
        </div>

        ${report?.redirectInfo?.redirected ? `
          <div class="ccx-notice">
            <b>Redirect followed.</b>
            <span><code>${safe(report.redirectInfo.initialUrl)}</code> redirected to <code>${safe(report.redirectInfo.finalUrl)}</code> in ${report.redirectInfo.redirectChain?.length || 1} hop(s).</span>
          </div>
        ` : ""}

        <div class="ccx-report-kpis">
          ${kpi("Cookies", cookies.length, `${firstParty} first · ${thirdParty} third party`, "is-accent")}
          ${kpi("Non-essential", nonEssential, "Need prior consent", nonEssential > 0 ? "is-warn" : "")}
          ${kpi("Needs review", reviewCount, reviewCount ? "Classify below" : "All classified", reviewCount ? "is-risk" : "is-ok")}
          ${kpi("Trackers", thirdPartyDomains.length, `${trackers.length} requests intercepted`)}
          ${kpi("Pages crawled", report?.pagesScanned || scan.pagesScanned || 0, failedList.length ? `<span class="is-risk">${failedList.length} failed</span>` : "No errors")}
        </div>

        ${cookies.length ? `
          <div class="ccx-dist">
            <div class="ccx-dist-bar" role="img" aria-label="Cookie category distribution">
              ${distSegments.map(s => `<span class="ccx-dist-seg" data-cat="${safe(s.key)}" style="width:${s.pct.toFixed(2)}%" title="${safe(s.label)}: ${s.count}"></span>`).join("")}
            </div>
          </div>
        ` : ""}

        <div class="cc-report-nav-tabs ccx-tabs" role="tablist">
          <button class="cc-report-tab-btn active" data-act="cc-switch-report-tab" data-arg="cookies" role="tab">
            Cookies <span class="cc-report-count-chip">${cookies.length}</span>
          </button>
          <button class="cc-report-tab-btn" data-act="cc-switch-report-tab" data-arg="trackers" role="tab">
            Trackers <span class="cc-report-count-chip">${trackers.length}</span>
          </button>
          <button class="cc-report-tab-btn" data-act="cc-switch-report-tab" data-arg="consent" role="tab">
            Consent test
          </button>
          <button class="cc-report-tab-btn" data-act="cc-switch-report-tab" data-arg="pages" role="tab">
            Pages <span class="cc-report-count-chip">${pagesList.length + failedList.length}</span>
          </button>
        </div>

        <!-- PANEL 1: Discovered Cookies -->
        <div class="cc-report-panel" data-panel="cookies">
          <div class="cc-report-filter-bar ccx-filter-bar">
            <div class="ccx-chips">
              <button class="cc-report-cat-btn ccx-chip active" data-act="cc-filter-report-category" data-arg="all">All <b>${cookies.length}</b></button>
              ${[...defaultCats.map(([id, name]) => [id, name, catCounts[id] || 0]), ["unclassified", "Needs review", reviewCount]]
                .map(([id, name, count]) => `<button class="cc-report-cat-btn ccx-chip${count ? "" : " is-empty"}" data-act="cc-filter-report-category" data-arg="${id}"><i data-cat="${id === "unclassified" ? "unclassified" : catKey(id)}"></i>${safe(name)} <b>${count}</b></button>`).join("")}
            </div>
            <label class="ccx-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input type="search" class="cc-report-search-input" placeholder="Search name, domain, provider" aria-label="Search cookies" data-input-act="cc-filter-report-cookies">
            </label>
          </div>

          <div class="cc-report-table-card">
            <div class="cc-report-table-wrapper">
              <table class="cc-report-table ccx-report-table">
                <colgroup>
                  <col style="width:21%;"><col style="width:19%;"><col style="width:14%;">
                  <col style="width:16%;"><col style="width:11%;"><col style="width:19%;">
                </colgroup>
                <thead>
                  <tr>
                    <th>Cookie</th><th>Domain</th><th>Provider</th><th>Category</th><th>Confidence</th><th>Attributes</th>
                  </tr>
                </thead>
                <tbody>
                  ${cookies.length ? cookieRows : `<tr><td colspan="6" class="ccx-table-empty">No cookies were observed on this website.</td></tr>`}
                  <tr class="ccx-noresults" hidden><td colspan="6" class="ccx-table-empty">No cookies match this filter.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PANEL 2: Network Trackers -->
        <div class="cc-report-panel" data-panel="trackers" hidden>
          <div class="cc-report-table-card">
            <div class="cc-report-table-wrapper">
              <table class="cc-report-table ccx-report-table">
                <colgroup><col style="width:30%;"><col style="width:16%;"><col style="width:12%;"><col style="width:42%;"></colgroup>
                <thead><tr><th>Tracker</th><th>Category</th><th>Resource</th><th>Sample request</th></tr></thead>
                <tbody>
                  ${trackers.length ? trackerRows : `<tr><td colspan="4" class="ccx-table-empty">No known third-party trackers or beacons were observed.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PANEL 3: Consent Interaction Test -->
        <div class="cc-report-panel" data-panel="consent" hidden>
          <div class="ccx-consent">
            <div class="ccx-verdict ${consent.bannerDetected ? "is-ok" : "is-warn"}">
              <strong>${consent.bannerDetected ? "Consent banner detected and accepted" : "No consent banner detected"}</strong>
              <p>${consent.bannerDetected
                ? `The crawler clicked <code>${safe(consent.buttonClicked)}</code> and compared cookies before and after acceptance.`
                : safe(consent.note || "No standard consent banner was found on the landing page, so only the pre-consent state was recorded.")}</p>
            </div>
            <div class="ccx-scenarios">
              <div class="ccx-scenario">
                <span>Before consent</span>
                <strong>${preCount}</strong>
                <small>Cookies set on first visit</small>
              </div>
              <div class="ccx-scenario-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                ${consent.bannerDetected ? `<b>+${Math.max(0, postCount - preCount)}</b>` : ""}
              </div>
              <div class="ccx-scenario">
                <span>After “Accept all”</span>
                <strong class="is-accent">${consent.bannerDetected ? postCount : "—"}</strong>
                <small>${consent.bannerDetected ? "Cookies set after acceptance" : "Not tested"}</small>
              </div>
            </div>
            ${extra.length ? `
              <div class="ccx-extra">
                <strong>Set only after consent (${extra.length})</strong>
                <div class="ccx-extra-list">${extra.map(name => `<span class="ccx-attr">${safe(name)}</span>`).join("")}</div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- PANEL 4: Crawled Pages -->
        <div class="cc-report-panel" data-panel="pages" hidden>
          <div class="ccx-pages">
            <div class="ccx-pages-col">
              <div class="ccx-pages-head"><span class="ccx-dot is-ok"></span>Visited <b>${pagesList.length}</b></div>
              <div class="ccx-pages-list">
                ${pagesList.length ? pagesList.map(p => `
                  <div class="cc-report-url-row ccx-page-row" title="${safe(p)}">
                    <span class="cc-report-url-row-text">${safe(p)}</span>
                    <button type="button" class="ccx-icon-btn" data-act="cc-copy-report-url" data-arg="${safe(p)}" title="Copy URL" aria-label="Copy URL">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
                    </button>
                  </div>
                `).join("") : `<div class="ccx-table-empty">No pages recorded.</div>`}
              </div>
            </div>
            <div class="ccx-pages-col">
              <div class="ccx-pages-head"><span class="ccx-dot is-risk"></span>Failed <b>${failedList.length}</b></div>
              <div class="ccx-pages-list">
                ${failedList.length ? failedList.map(f => `
                  <div class="cc-report-url-row ccx-page-row is-failed" title="${safe(f.url)}: ${safe(f.error)}">
                    <div style="min-width:0;flex:1;">
                      <div class="cc-report-url-row-text">${safe(f.url)}</div>
                      <small>${safe(f.error)}</small>
                    </div>
                  </div>
                `).join("") : `<div class="ccx-table-empty">Every page loaded without errors.</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    runtime.modal(`Scan Report: ${safe(host)}`, `${safe(scan.type || "Scan")} · ${safe(dateLabel(scan.createdAt))} · ${safe(scan.id)}`, modalBody, `
      <button class="btn" data-act="close">Close</button>
      <button class="btn t" data-act="cc-sync-scan-to-inventory" data-arg="${safe(scan.id)}">Add Discovered to Inventory</button>
    `, "drawer-wide ccx-report-modal-shell");
  };

  // Action to classify an unclassified cookie from the scan report
  ACT["cc-report-classify-cookie"] = async (newCategory, selectEl) => {
    if (!newCategory || !selectEl) return;
    const scanId = selectEl.getAttribute("data-scan-id");
    const cookieName = selectEl.getAttribute("data-cookie-name");
    const scan = state.scans.find(s => s.id === scanId);
    if (!scan) return;

    const cookies = scan.report?.cookies || [];
    const targetCookie = cookies.find(c => c.name === cookieName);
    if (!targetCookie) return;

    targetCookie.category = newCategory;
    targetCookie.classificationStatus = "Reviewed";
    targetCookie.confidence = "manual";
    const catObj = (state.categories || []).find(cat => cat.id === newCategory);
    targetCookie.purpose = catObj?.name || newCategory;

    // Recalculate scan counts
    scan.report.unclassifiedCount = cookies.filter(
      c => c.category === "unclassified" || c.classificationStatus === "Review required"
    ).length;
    scan.unclassifiedCount = scan.report.unclassifiedCount;

    // 1. Sync consistently to Cookie Inventory (state.cookies)
    let invCookie = (state.cookies || []).find(
      c => c.name.toLowerCase() === cookieName.toLowerCase()
    );
    if (invCookie) {
      invCookie.category = newCategory;
      invCookie.classificationStatus = "Reviewed";
      invCookie.purpose = targetCookie.purpose;
      try {
        await cookieApi.updateCookie(invCookie.id, {
          category: newCategory,
          classificationStatus: "Reviewed",
          purpose: targetCookie.purpose,
        });
      } catch (err) {
        console.warn("Could not update cookie inventory in DB:", err.message);
      }
    } else {
      const newInventoryCookie = {
        name: targetCookie.name,
        category: newCategory,
        domain: targetCookie.domain || (scan.url ? new URL(scan.url).hostname : "demo.privacysek.example"),
        path: targetCookie.path || "/",
        party: targetCookie.party || "First-party",
        provider: targetCookie.provider || "Discovered on Website",
        duration: targetCookie.duration || "Session",
        description: targetCookie.description || ("Discovered by Playwright scan on " + scan.url),
        httpOnly: Boolean(targetCookie.httpOnly),
        secure: Boolean(targetCookie.secure),
        sameSite: targetCookie.sameSite || "Lax",
        classificationStatus: "Reviewed",
        purpose: targetCookie.purpose,
        lastDetected: isoNow(),
        sourcePage: scan.url,
        scanId: scan.id,
      };
      try {
        const saved = await cookieApi.createCookie(newInventoryCookie);
        state.cookies.unshift(saved);
      } catch {
        state.cookies.unshift({
          id: "cookie-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          ...newInventoryCookie,
        });
      }
    }

    // 2. Persist update to MongoDB for scan report
    try {
      await scannerApi.updateScanCookie(scan.id, {
        cookieName: targetCookie.name,
        category: newCategory,
        classificationStatus: "Reviewed",
        confidence: "manual",
        purpose: targetCookie.purpose,
      });
    } catch (err) {
      console.warn("Could not save scan report update to scanner DB:", err.message);
    }

    // 3. Ensure Cookie Consent configuration reflects the category
    if (state.visitor && state.visitor.categories && state.visitor.categories[newCategory] === undefined) {
      state.visitor.categories[newCategory] = false;
    }
    if (state.draft) {
      persist();
    } else {
      runtime.render();
    }

    runtime.toast('Cookie "' + cookieName + '" categorized as ' + (catObj?.name || newCategory) + ' and saved to Inventory.');

    // 4. Re-render the Report modal, keeping the reviewer's active filter and search
    const openModal = document.querySelector(".cc-report-modal");
    const keepCat = openModal?.querySelector(".cc-report-cat-btn.active")?.getAttribute("data-arg") || "all";
    const keepQuery = openModal?.querySelector(".cc-report-search-input")?.value || "";
    const keepScroll = openModal?.querySelector(".cc-report-table-wrapper")?.scrollTop || 0;
    await ACT["cc-view-scan-report"](scan.id);
    const reopened = document.querySelector(".cc-report-modal");
    if (reopened) {
      const search = reopened.querySelector(".cc-report-search-input");
      if (search) search.value = keepQuery;
      const chip = reopened.querySelector(`.cc-report-cat-btn[data-arg="${keepCat}"]`);
      ACT["cc-filter-report-category"](chip ? keepCat : "all", reopened);
      const wrap = reopened.querySelector(".cc-report-table-wrapper");
      if (wrap) wrap.scrollTop = keepScroll;
    }
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

  // Shared report filtering: category chip + search query, with a "no matches" row
  const applyReportFilters = modal => {
    const activeCat = modal.querySelector(".cc-report-cat-btn.active")?.getAttribute("data-arg") || "all";
    const query = (modal.querySelector(".cc-report-search-input")?.value || "").toLowerCase().trim();
    let visible = 0;
    const rows = modal.querySelectorAll(".cc-report-cookie-row");
    rows.forEach(row => {
      const rowCat = (row.getAttribute("data-category") || "").toLowerCase();
      const rowSearch = (row.getAttribute("data-search") || "").toLowerCase();
      const catMatch = activeCat === "all" || rowCat === activeCat;
      const searchMatch = !query || rowSearch.includes(query);
      const show = catMatch && searchMatch;
      row.style.display = show ? "" : "none";
      if (show) visible += 1;
    });
    const empty = modal.querySelector(".ccx-noresults");
    if (empty) empty.hidden = !rows.length || visible > 0;
  };

  // Report modal category filtering
  ACT["cc-filter-report-category"] = (cat, element) => {
    const modal = element?.closest(".cc-report-modal") || document.querySelector(".cc-report-modal");
    if (!modal) return;
    modal.querySelectorAll(".cc-report-cat-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-arg") === cat);
    });
    applyReportFilters(modal);
  };

  // Report modal live cookie search
  ACT["cc-filter-report-cookies"] = (query, element) => {
    const modal = element?.closest(".cc-report-modal") || document.querySelector(".cc-report-modal");
    if (!modal) return;
    applyReportFilters(modal);
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
        if (dc.category && dc.category !== "unclassified") {
          existing.category = dc.category;
          existing.classificationStatus = "Reviewed";
        }
        updatedCount += 1;
        try {
          await cookieApi.updateCookie(existing.id, {
            lastDetected: existing.lastDetected,
            secure: existing.secure,
            httpOnly: existing.httpOnly,
            duration: existing.duration,
          });
        } catch (e) {
          console.warn("Could not sync updated cookie to DB:", e.message);
        }
      } else {
        const newRecord = {
          name: dc.name,
          category: dc.category && dc.category !== "unclassified" ? dc.category : "functional",
          domain: dc.domain || new URL(scan.url).hostname,
          path: dc.path || "/",
          party: dc.party || "First-party",
          provider: dc.provider || "Discovered on Website",
          duration: dc.duration || "Session",
          description: dc.description || `Discovered by Playwright scan on ${scan.url}`,
          httpOnly: Boolean(dc.httpOnly),
          secure: Boolean(dc.secure),
          sameSite: dc.sameSite || "Lax",
        };
        try {
          const saved = await cookieApi.createCookie(newRecord);
          state.cookies.unshift(saved);
          addedCount += 1;
        } catch {
          const fallback = {
            id: `cookie-scanned-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            ...newRecord,
            purpose: state.categories.find(c => c.id === dc.category)?.name || "Discovered Cookie",
            lastDetected: isoNow(),
            sourcePage: scan.url,
            classificationStatus: dc.category && dc.category !== "unclassified" ? "Reviewed" : "Review required",
            scanId: scan.id,
          };
          state.cookies.unshift(fallback);
          addedCount += 1;
        }
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
