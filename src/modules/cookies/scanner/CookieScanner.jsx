export function createRenderer(context) {
  const { state, runtime, ui, safe, dateLabel } = context;

  function renderCookieScannerModule() {
    const scans = (state.scans || []).slice().sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const latestScan = scans[0];
    const runningScan = scans.find(item => item.status === "Running");
    const schedules = state.schedules || [];

    const scanRows = scans.map(item => [
      `<span class="cc-scan-id">${safe(item.id)}</span>`,
      `<span class="cc-scan-url">${safe(item.url || item.urls?.[0] || "—")}</span>`,
      safe(item.type),
      safe(dateLabel(item.createdAt)),
      safe(item.completedAt ? dateLabel(item.completedAt) : item.status === "Running" ? "In progress" : "—"),
      runtime.pill(
        item.status === "Completed" ? "ok" : item.status === "Running" ? "info" : item.status === "Cancelled" ? "n" : "risk",
        item.status === "Completed" ? "Scan complete" : item.status === "Running" ? "Crawling" : item.status
      ),
      `<b>${item.report?.totalCookies ?? item.cookiesCount ?? "—"}</b>`,
      `<b>${item.report?.thirdPartyDomains?.length ?? item.thirdPartyCount ?? "—"}</b>`,
      `${item.pagesScanned ?? 0} / ${item.pagesAttempted ?? (item.type === "Deep Scan" ? 25 : 10)}`,
      `
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn sm" data-act="cc-view-scan-report" data-arg="${safe(item.id)}" title="View complete report and discovered cookies">Report</button>
          <button class="btn sm" data-act="cc-compare-scans-modal" data-arg="${safe(item.id)}" title="Compare with another scan">Compare</button>
          <button class="btn sm d" data-act="cc-delete-scan" data-arg="${safe(item.id)}" title="Remove scan record">×</button>
        </div>
      `,
    ]);

    const scheduleRows = schedules.map(schedule => [
      `<b>${safe(schedule.type)}</b><span class="sub" style="display:block;font-size:10px;color:var(--text-3);">${safe(schedule.urls?.length > 1 ? `${schedule.urls.length} URLs` : schedule.url)}</span>`,
      safe(schedule.frequency),
      safe(schedule.nextRunAt ? dateLabel(schedule.nextRunAt) : "—"),
      `Up to ${Number(schedule.pages) || 10} pages`,
      schedule.lastRunStatus ? runtime.pill(schedule.lastRunStatus.startsWith("Running") ? "info" : "ok", schedule.lastRunStatus) : "—",
      `
        <button class="btn sm" data-act="cc-run-scheduled-scan" data-arg="${safe(schedule.id)}" ${runningScan ? "disabled" : ""}>Run Now</button>
        <button class="btn sm d" data-act="cc-delete-scan-schedule" data-arg="${safe(schedule.id)}">Remove</button>
      `,
    ]);

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

          ${runtime.card("Latest Scan Details", latestScan ? `
            <div class="cc-scan-status-line">
              <span class="cc-scan-status-indicator ${latestScan.status === "Running" ? "running" : latestScan.status === "Completed" ? "complete" : ""}"></span>
              <div>
                <small>Scan Status</small>
                <strong>${safe(latestScan.status === "Running" ? "Crawling Target Website…" : latestScan.status)}</strong>
              </div>
              <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
                ${runtime.pill(
                  latestScan.status === "Completed" ? "ok" : latestScan.status === "Running" ? "info" : latestScan.status === "Cancelled" ? "n" : "risk",
                  latestScan.type
                )}
                <span class="sub" style="font-family:var(--f-mono);font-size:10px;color:var(--text-3);">${safe(latestScan.id)}</span>
              </div>
            </div>

            <dl class="cc-scan-detail-grid">
              <div><dt>Scan Started</dt><dd>${safe(dateLabel(latestScan.createdAt))}</dd></div>
              <div><dt>Scan Finished</dt><dd>${safe(latestScan.completedAt ? dateLabel(latestScan.completedAt) : latestScan.status === "Running" ? "In progress…" : "—")}</dd></div>
              <div>
                <dt>Target Website</dt>
                <dd class="cc-scan-url">
                  ${safe(latestScan.url || latestScan.urls?.[0] || "—")}
                  ${latestScan.redirected ? `<span style="display:block;font-size:9.5px;color:var(--accent);margin-top:2px;">↳ Safe redirect followed from ${safe(latestScan.initialUrl)}</span>` : ""}
                </dd>
              </div>
              <div><dt>Page Scope</dt><dd>${latestScan.type === "Deep Scan" ? "Deep link discovery (up to 25 pages)" : `Configured: ${latestScan.pagesAttempted || 10} pages`}</dd></div>
            </dl>

            <div class="cc-scan-metrics">
              <div>
                <span>Discovered Cookies</span>
                <strong style="color:var(--accent);font-size:14px;">${latestScan.report?.totalCookies ?? latestScan.cookiesCount ?? 0}</strong>
              </div>
              <div>
                <span>Third-Party Trackers</span>
                <strong style="font-size:14px;">${latestScan.report?.thirdPartyDomains?.length ?? latestScan.thirdPartyCount ?? 0}</strong>
              </div>
              <div>
                <span>Pages Crawled</span>
                <strong style="font-size:14px;">${latestScan.pagesScanned || 0} / ${latestScan.pagesAttempted || 10}</strong>
              </div>
              <div>
                <span>Unclassified Cookies</span>
                <strong style="color:${(latestScan.report?.unclassifiedCount || latestScan.unclassifiedCount) ? 'var(--risk)' : 'var(--text-2)'};font-size:14px;">
                  ${latestScan.report?.unclassifiedCount ?? latestScan.unclassifiedCount ?? 0}
                </strong>
              </div>
              <div>
                <span>Consent Banner Test</span>
                <strong style="font-size:12px;">
                  ${latestScan.report?.consentScenario?.bannerDetected ? "Banner Detected" : "Pre-Consent Only"}
                </strong>
              </div>
            </div>

            ${latestScan.status === "Running" ? `
              <div class="cc-scan-progress" role="progressbar" aria-label="Playwright scanning progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Number(latestScan.progress) || 0}">
                <div class="cc-scan-progress-label">
                  <span>${safe(latestScan.progressLabel || "Visiting target website...")}</span>
                  <b>${Number(latestScan.progress) || 0}%</b>
                </div>
                <div class="cc-scan-progress-track">
                  <span style="width:${Number(latestScan.progress) || 0}%"></span>
                </div>
                <small style="color:var(--text-3);font-family:var(--f-mono);">
                  Current: ${safe(latestScan.currentUrl || latestScan.url)}
                </small>
              </div>
            ` : `
              <div class="cc-scan-result-note">
                ${safe(latestScan.resultNote || `Scan finished ${dateLabel(latestScan.completedAt)}.`)}
              </div>
              <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
                <button class="btn sm t" data-act="cc-view-scan-report" data-arg="${safe(latestScan.id)}">
                  View Detailed Report & Cookies
                </button>
                <button class="btn sm" data-act="cc-sync-scan-to-inventory" data-arg="${safe(latestScan.id)}">
                  Add Discovered Cookies to Inventory
                </button>
                <button class="btn sm" data-act="cc-compare-scans-modal" data-arg="${safe(latestScan.id)}">
                  Compare Scans
                </button>
              </div>
            `}
          ` : `
            <div class="cc-scan-empty">
              No scans have been executed yet. Enter a valid website URL and start a Deep Scan or configure a Custom Scan.
            </div>
          `, null, true)}
        </div>

        ${runtime.card("Saved Automated Schedules", schedules.length
          ? runtime.table(["Scan Type & Target", "Frequency", "Next Run", "Page Scope", "Last Status", "Actions"], scheduleRows)
          : `<div class="cc-scan-empty">No recurring schedules configured. Use Custom Scan / Schedule to create automated audits.</div>`, null, true)}

        ${runtime.card("Website Scans History", scans.length
          ? `
            <div class="cc-scan-history-note">
              Real website crawl telemetry stored in backend database. Click "Report" to review observed cookies or "Compare" to audit cookie additions and removals.
            </div>
            ${runtime.table([
              "Scan ID", "Target Website", "Scan Type", "Started", "Finished",
              "Status", "Discovered Cookies", "Third-Party Domains", "Pages Crawled", "Actions"
            ], scanRows)}
          `
          : `<div class="cc-scan-empty">No scan history recorded yet.</div>`, null, true)}
      </section>
    `;
  }

  return { renderCookieScannerModule };
}
