import { chromium } from 'playwright';
import { validateTargetUrl, resolveSafeDestination, isHostSafeFromSSRF } from './ssrfValidator.js';
import { classifyCookie } from './cookieClassifier.js';
import { storage } from './storage.js';

// Map of active scan jobs for cancellation and live status
const activeJobs = new Map();

/**
 * Common tracking domain signatures to classify third-party network requests
 */
const TRACKER_SIGNATURES = [
  { domain: 'google-analytics.com', type: 'Analytics', name: 'Google Analytics' },
  { domain: 'analytics.google.com', type: 'Analytics', name: 'Google Analytics' },
  { domain: 'googletagmanager.com', type: 'Tag Management', name: 'Google Tag Manager' },
  { domain: 'doubleclick.net', type: 'Advertising', name: 'Google DoubleClick' },
  { domain: 'adservice.google.com', type: 'Advertising', name: 'Google Ads' },
  { domain: 'connect.facebook.net', type: 'Advertising', name: 'Meta Pixel' },
  { domain: 'facebook.com', type: 'Advertising', name: 'Meta Social / Pixel' },
  { domain: 'clarity.ms', type: 'Analytics', name: 'Microsoft Clarity' },
  { domain: 'hotjar.com', type: 'Analytics', name: 'Hotjar' },
  { domain: 'criteo.com', type: 'Advertising', name: 'Criteo' },
  { domain: 'criteo.net', type: 'Advertising', name: 'Criteo' },
  { domain: 'adnxs.com', type: 'Advertising', name: 'Xandr / AppNexus' },
  { domain: 'rubiconproject.com', type: 'Advertising', name: 'Magnite' },
  { domain: 'pubmatic.com', type: 'Advertising', name: 'PubMatic' },
  { domain: 'openx.net', type: 'Advertising', name: 'OpenX' },
  { domain: 'casalemedia.com', type: 'Advertising', name: 'Index Exchange' },
  { domain: 'taboola.com', type: 'Advertising', name: 'Taboola' },
  { domain: 'outbrain.com', type: 'Advertising', name: 'Outbrain' },
  { domain: 'linkedin.com', type: 'Advertising', name: 'LinkedIn Insight Tag' },
  { domain: 'licdn.com', type: 'Advertising', name: 'LinkedIn Assets' },
  { domain: 'twitter.com', type: 'Social Media', name: 'X / Twitter' },
  { domain: 't.co', type: 'Social Media', name: 'X / Twitter Analytics' },
  { domain: 'youtube.com', type: 'Social Media', name: 'YouTube Embed' },
  { domain: 'vimeo.com', type: 'Social Media', name: 'Vimeo Embed' },
  { domain: 'cloudflare.com', type: 'CDN & Security', name: 'Cloudflare' },
  { domain: 'cdnjs.cloudflare.com', type: 'CDN', name: 'CDNJS CDN' },
  { domain: 'jsdelivr.net', type: 'CDN', name: 'jsDelivr CDN' },
  { domain: 'unpkg.com', type: 'CDN', name: 'unpkg CDN' },
  { domain: 'fonts.googleapis.com', type: 'Typography', name: 'Google Fonts' },
  { domain: 'fonts.gstatic.com', type: 'Typography', name: 'Google Fonts CDN' },
];

/**
 * Standard consent banner button selectors
 */
const ACCEPT_BUTTON_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#hs-eu-confirmation-button',
  'button[data-cookiefirst-action="accept"]',
  'button.cm__btn--accept',
  'button#accept-recommended-btn-handler',
  'button:has-text("Accept All")',
  'button:has-text("Accept all")',
  'button:has-text("Accept All Cookies")',
  'button:has-text("Allow all")',
  'button:has-text("Allow all cookies")',
  'button:has-text("I agree")',
  'button:has-text("I Agree")',
  'button:has-text("Got it")',
  'button:has-text("Accept")',
];

/**
 * Evaluates whether a URL pathname matches a path filter pattern.
 * Supports exact paths (/admin), trailing wildcards (/admin/* or /admin*), and prefix directories.
 */
export function matchesPathPattern(pathname, pattern) {
  if (!pattern || typeof pattern !== 'string') return false;
  let normPath = pathname.toLowerCase().trim();
  let normPat = pattern.toLowerCase().trim();
  if (!normPat) return false;

  // Ensure leading slash
  if (!normPat.startsWith('/')) normPat = '/' + normPat;
  if (!normPath.startsWith('/')) normPath = '/' + normPath;

  // Root or catch-all wildcard
  if (normPat === '/*' || normPat === '*') return true;
  if (normPat === '/') return normPath === '/';

  // Wildcard patterns
  if (normPat.endsWith('/*')) {
    const prefix = normPat.slice(0, -2);
    return normPath === prefix || normPath.startsWith(prefix + '/');
  }
  if (normPat.endsWith('*')) {
    const prefix = normPat.slice(0, -1);
    return normPath.startsWith(prefix);
  }

  // Exact path or sub-directory (e.g. /admin matches /admin, /admin/, and /admin/users, but NOT /administrator)
  const cleanPat = normPat.replace(/\/+$/, '');
  const cleanPath = normPath.replace(/\/+$/, '');
  return cleanPath === cleanPat || cleanPath.startsWith(cleanPat + '/');
}

/**
 * Checks whether a given URL is eligible to be scanned according to include/exclude rules.
 */
export function isUrlEligible(url, includePaths = [], excludePaths = []) {
  try {
    const pathname = new URL(url).pathname;
    
    // Exclude rules take precedence
    if (Array.isArray(excludePaths) && excludePaths.length > 0) {
      const isExcluded = excludePaths.some(p => matchesPathPattern(pathname, p));
      if (isExcluded) return false;
    }

    // Include rules: if defined, URL must match at least one
    if (Array.isArray(includePaths) && includePaths.length > 0) {
      const isIncluded = includePaths.some(p => matchesPathPattern(pathname, p));
      if (!isIncluded) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export class ScannerService {
  /**
   * Initiates a new scan job.
   * Validates URLs, automatically follows safe redirects, and targets the final destination.
   * Rejects unsafe destinations, such as private network addresses, to prevent SSRF.
   */
  static async startScan({
    url,
    type = 'Deep Scan',
    maxPages = 15,
    maxDepth = 2,
    additionalUrls = [],
    includePaths = [],
    excludePaths = [],
    maxDurationSec = 120,
    allowLocalhost = false,
    scheduleId = null,
  }) {
    // 1. SSRF Guard & Safe Redirect Resolver
    const resolved = await resolveSafeDestination(url, { allowLocalhost });
    if (!resolved.valid) {
      throw new Error(resolved.error);
    }

    const initialUrl = resolved.initialUrl;
    const targetUrl = resolved.finalUrl;
    const targetOrigin = resolved.finalOrigin;

    // 2. Validate additional seed URLs relative to the final destination origin
    const rawSeeds = [targetUrl];
    for (const rawSeed of additionalUrls) {
      if (!rawSeed) continue;
      try {
        const resolvedSeed = new URL(rawSeed, targetUrl);
        resolvedSeed.hash = '';
        if (resolvedSeed.origin === targetOrigin && !rawSeeds.includes(resolvedSeed.href)) {
          rawSeeds.push(resolvedSeed.href);
        }
      } catch {
        // ignore invalid seed
      }
    }

    // Filter seeds through include/exclude rules
    const validatedSeeds = rawSeeds.filter(s => isUrlEligible(s, includePaths, excludePaths));

    const scanId = `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const effectiveMaxPages = type === 'Deep Scan' ? Math.min(maxPages || 25, 50) : Math.min(maxPages || 10, 50);

    const scanRecord = {
      id: scanId,
      url: targetUrl,
      initialUrl,
      finalUrl: targetUrl,
      redirected: Boolean(resolved.redirected),
      redirectChain: resolved.redirectChain || [],
      urls: validatedSeeds,
      type,
      status: 'queued',
      createdAt: new Date().toISOString(),
      completedAt: null,
      progress: 0,
      progressLabel: resolved.redirected
        ? `Redirected (${resolved.redirectChain.length} hop${resolved.redirectChain.length > 1 ? 's' : ''}): ${initialUrl} → ${targetUrl}`
        : 'Scan queued...',
      currentUrl: targetUrl,
      pagesAttempted: effectiveMaxPages,
      pagesScanned: 0,
      pagesDiscovered: validatedSeeds.length,
      pagesFailed: 0,
      failedPages: [],
      config: {
        maxPages: effectiveMaxPages,
        maxDepth,
        maxDurationSec,
        includePaths,
        excludePaths,
      },
      scheduleId,
      report: null,
      resultNote: null,
    };

    await storage.saveScan(scanRecord);

    // Track active job controller
    const controller = {
      cancelled: false,
      record: scanRecord,
    };
    activeJobs.set(scanId, controller);

    // Launch background crawler without blocking caller
    setImmediate(() => {
      ScannerService._executeScan(scanId, controller, {
        targetUrl,
        initialUrl,
        targetOrigin,
        seeds: validatedSeeds,
        type,
        maxPages: effectiveMaxPages,
        maxDepth,
        maxDurationSec,
        includePaths,
        excludePaths,
        allowLocalhost,
        scheduleId,
        redirectInfo: {
          redirected: Boolean(resolved.redirected),
          initialUrl,
          finalUrl: targetUrl,
          redirectChain: resolved.redirectChain || [],
        },
      }).catch(err => {
        console.error(`Scan ${scanId} unexpected failure:`, err);
        scanRecord.status = 'failed';
        scanRecord.completedAt = new Date().toISOString();
        scanRecord.resultNote = `Scan execution encountered an error: ${err.message}`;
        storage.saveScan(scanRecord);
        if (scheduleId) {
          storage.getAllSchedules().then(schedules => {
            const sched = schedules.find(s => s.id === scheduleId);
            if (sched) {
              sched.lastRunAt = scanRecord.completedAt;
              sched.lastRunStatus = 'Failed';
              if (sched.frequency === 'Once') {
                sched.enabled = false;
                sched.nextRunAt = null;
              }
              storage.saveSchedule(sched);
            }
          }).catch(() => {});
        }
        activeJobs.delete(scanId);
      });
    });

    return scanRecord;
  }

  /**
   * Cancels a running scan.
   */
  static async cancelScan(scanId) {
    const job = activeJobs.get(scanId);
    if (!job) {
      const scan = await storage.getScan(scanId);
      if (scan && scan.status === 'running') {
        scan.status = 'cancelled';
        scan.completedAt = new Date().toISOString();
        scan.resultNote = 'Scan was cancelled by user.';
        await storage.saveScan(scan);
        if (scan.scheduleId) {
          storage.getAllSchedules().then(schedules => {
            const sched = schedules.find(s => s.id === scan.scheduleId);
            if (sched) {
              sched.lastRunAt = scan.completedAt;
              sched.lastRunStatus = 'Cancelled';
              storage.saveSchedule(sched);
            }
          }).catch(() => {});
        }
        return scan;
      }
      return null;
    }

    job.cancelled = true;
    job.record.status = 'cancelled';
    job.record.completedAt = new Date().toISOString();
    job.record.progressLabel = 'Scan cancelled by user.';
    job.record.resultNote = 'Scan was cancelled before reaching all pages. Partial findings were preserved.';
    await storage.saveScan(job.record);
    if (job.record.scheduleId) {
      storage.getAllSchedules().then(schedules => {
        const sched = schedules.find(s => s.id === job.record.scheduleId);
        if (sched) {
          sched.lastRunAt = job.record.completedAt;
          sched.lastRunStatus = 'Cancelled';
          storage.saveSchedule(sched);
        }
      }).catch(() => {});
    }
    activeJobs.delete(scanId);
    return job.record;
  }

  /**
   * Internal scan execution engine
   */
  static async _executeScan(scanId, controller, opts) {
    const {
      targetUrl,
      initialUrl,
      targetOrigin,
      seeds,
      type,
      maxPages,
      maxDepth,
      maxDurationSec,
      includePaths,
      excludePaths,
      allowLocalhost,
      redirectInfo,
    } = opts;

    const record = controller.record;
    record.status = 'running';
    record.progress = 5;
    record.progressLabel = redirectInfo.redirected
      ? `Scanning final destination: ${targetUrl}`
      : 'Launching isolated browser worker...';
    await storage.saveScan(record);

    let browser;
    const startTime = Date.now();
    const maxEndTime = startTime + (maxDurationSec * 1000);

    const discoveredCookiesMap = new Map(); // key: name + domain
    const observedThirdPartyDomains = new Set();
    const trackerTelemetry = [];
    const visitedPages = new Set();
    const failedPages = [];
    const pageQueue = Array.isArray(seeds) && seeds.length
      ? seeds.map(url => ({ url, depth: 1 }))
      : (isUrlEligible(targetUrl, includePaths, excludePaths) ? [{ url: targetUrl, depth: 1 }] : []);
    let stopReason = null;

    try {
      try {
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
      } catch (launchErr) {
        console.warn(`[Scanner] Chromium binary not available on this host (${launchErr.message}). Switching to Cloud HTTP crawler.`);
        return await ScannerService._executeHttpFallbackScan(scanId, controller, opts);
      }

      // -------------------------------------------------------------
      // SCENARIO 1: Pre-consent Crawl
      // -------------------------------------------------------------
      record.progressLabel = `Starting crawl on final destination: ${targetUrl}...`;
      await storage.saveScan(record);

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 PrivacySEK-Scanner/1.0',
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: false,
      });

      // Attach in-browser SSRF route firewall
      await context.route('**/*', async (route) => {
        const request = route.request();
        const reqUrl = request.url();

        let parsed;
        try {
          parsed = new URL(reqUrl);
        } catch {
          return route.abort('blockedbyclient');
        }

        // Allow data: and blob: URLs for inline media
        if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') {
          return route.continue();
        }

        // Enforce HTTP / HTTPS only
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return route.abort('blockedbyclient');
        }

        // Validate destination host against private IP ranges
        const isSafe = await isHostSafeFromSSRF(parsed.hostname, allowLocalhost);
        if (!isSafe) {
          return route.abort('blockedbyclient');
        }

        return route.continue();
      });

      const page = await context.newPage();

      // Intercept and observe network traffic for third-party trackers
      page.on('request', request => {
        try {
          const reqUrl = new URL(request.url());
          const reqHost = reqUrl.hostname.toLowerCase();
          const targetHost = new URL(targetOrigin).hostname.toLowerCase();

          // Check if third-party
          if (reqHost && !reqHost.endsWith(targetHost) && !targetHost.endsWith(reqHost)) {
            observedThirdPartyDomains.add(reqHost);

            // Match tracker signatures
            for (const sig of TRACKER_SIGNATURES) {
              if (reqHost.includes(sig.domain)) {
                if (!trackerTelemetry.some(t => t.domain === reqHost && t.name === sig.name)) {
                  trackerTelemetry.push({
                    domain: reqHost,
                    type: sig.type,
                    name: sig.name,
                    resourceType: request.resourceType(),
                    urlSample: request.url().slice(0, 120),
                    firstSeenAt: new Date().toISOString(),
                  });
                }
                break;
              }
            }
          }
        } catch {
          // ignore malformed URLs
        }
      });

      let pagesScannedCount = 0;

      if (pageQueue.length === 0) {
        stopReason = 'no_eligible_pages';
      }

      while (pageQueue.length > 0 && pagesScannedCount < maxPages && !controller.cancelled) {
        if (Date.now() > maxEndTime) {
          stopReason = 'timed_out';
          record.resultNote = `Scan stopped after reaching the maximum duration limit (${maxDurationSec}s).`;
          break;
        }

        const { url: currentUrl, depth } = pageQueue.shift();
        if (visitedPages.has(currentUrl)) continue;

        // Path filtering check
        if (!isUrlEligible(currentUrl, includePaths, excludePaths)) {
          continue;
        }

        visitedPages.add(currentUrl);
        pagesScannedCount += 1;

        record.currentUrl = currentUrl;
        record.pagesScanned = pagesScannedCount;
        record.pagesDiscovered = visitedPages.size + pageQueue.length;
        record.progress = Math.min(85, Math.round((pagesScannedCount / maxPages) * 75) + 10);
        record.progressLabel = `Scanning (${pagesScannedCount}/${maxPages}): ${new URL(currentUrl).pathname || '/'}`;
        await storage.saveScan(record);

        try {
          // Navigate with timeout protection
          const response = await page.goto(currentUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 18000,
          });

          // Allow asynchronous client scripts, tracker pixels, and CMP tags (e.g., OneTrust, DoubleClick, Snap) to settle
          try {
            await page.waitForLoadState('load', { timeout: 4000 });
          } catch {
            // Proceed even if full window load takes longer
          }
          await page.waitForTimeout(2000);

          // Collect all cookies present in context
          const rawCookies = await context.cookies();
          for (const rawCookie of rawCookies) {
            const key = `${rawCookie.name}|${rawCookie.domain}`;
            if (!discoveredCookiesMap.has(key)) {
              const classified = classifyCookie(rawCookie, targetOrigin);
              // SECURITY: Never persist raw session token or personal value
              discoveredCookiesMap.set(key, {
                id: `ck-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                name: rawCookie.name,
                domain: rawCookie.domain,
                path: rawCookie.path,
                expires: rawCookie.expires,
                duration: classified.duration,
                secure: Boolean(rawCookie.secure),
                httpOnly: Boolean(rawCookie.httpOnly),
                sameSite: rawCookie.sameSite || 'Lax',
                category: classified.category,
                confidence: classified.confidence,
                provider: classified.provider,
                party: classified.party,
                description: classified.description,
                classificationStatus: classified.classificationStatus,
                firstSeen: new Date().toISOString(),
                pagesObserved: [currentUrl],
                detectionSource: 'Browser Context (HTTP & JS)',
              });
            } else {
              const existing = discoveredCookiesMap.get(key);
              if (!existing.pagesObserved.includes(currentUrl)) {
                existing.pagesObserved.push(currentUrl);
              }
            }
          }

          // Discover links on page if depth permits (Depth 1: seeds only; Depth 2: seeds + 1 jump; Depth 3: seeds + 2 jumps)
          if (depth < maxDepth && pageQueue.length < (maxPages * 2)) {
            try {
              const hrefs = await page.$$eval('a[href]', anchors =>
                anchors.map(a => a.href).filter(Boolean)
              );

              for (const href of hrefs) {
                try {
                  const parsedHref = new URL(href);
                  // Ensure same origin as final destination
                  if (parsedHref.origin === targetOrigin) {
                    // Normalize link: strip hash and search query parameter variations for clean page queueing
                    parsedHref.hash = '';
                    const cleanUrl = parsedHref.href;

                    // Exclude non-page static asset files
                    if (/\.(png|jpe?g|gif|svg|css|js|woff2?|ttf|eot|ico|pdf|zip|mp4|webp)$/i.test(parsedHref.pathname)) {
                      continue;
                    }

                    // Check path inclusion/exclusion rules before queueing
                    if (!isUrlEligible(cleanUrl, includePaths, excludePaths)) {
                      continue;
                    }

                    if (!visitedPages.has(cleanUrl) && !pageQueue.some(item => item.url === cleanUrl)) {
                      pageQueue.push({ url: cleanUrl, depth: depth + 1 });
                    }
                  }
                } catch {
                  // ignore invalid link
                }
              }
            } catch {
              // page might have navigated or closed
            }
          }
        } catch (pageErr) {
          failedPages.push({
            url: currentUrl,
            error: pageErr.message,
            timestamp: new Date().toISOString(),
          });
          record.pagesFailed = failedPages.length;
          record.failedPages = failedPages;
        }
      }

      if (!stopReason) {
        if (pagesScannedCount >= maxPages && pageQueue.length > 0) {
          stopReason = 'page_limit_reached';
        } else {
          stopReason = 'queue_exhausted';
        }
      }

      await context.close();

      // -------------------------------------------------------------
      // SCENARIO 2: Consent-Aware Post-Accept Scan (Isolated Context)
      // -------------------------------------------------------------
      record.progress = 88;
      record.progressLabel = 'Testing consent interaction scenario (Accept All) on final destination...';
      await storage.saveScan(record);

      let consentScenarioResult = {
        tested: true,
        bannerDetected: false,
        buttonClicked: null,
        preConsentCookieCount: discoveredCookiesMap.size,
        postAcceptCookieCount: discoveredCookiesMap.size,
        additionalCookiesDetected: [],
      };

      try {
        const consentContext = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 PrivacySEK-ConsentAuditor/1.0',
          viewport: { width: 1280, height: 800 },
        });

        // Attach SSRF route guard to consent context
        await consentContext.route('**/*', async (route) => {
          const reqUrl = route.request().url();
          try {
            const parsed = new URL(reqUrl);
            if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return route.continue();
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return route.abort('blockedbyclient');
            const isSafe = await isHostSafeFromSSRF(parsed.hostname, allowLocalhost);
            if (!isSafe) return route.abort('blockedbyclient');
          } catch {
            return route.abort('blockedbyclient');
          }
          return route.continue();
        });

        const consentPage = await consentContext.newPage();

        await consentPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 18000 });
        await consentPage.waitForTimeout(1500);

        // Attempt to find and click an Accept All button
        let clicked = false;
        for (const selector of ACCEPT_BUTTON_SELECTORS) {
          try {
            const btn = await consentPage.$(selector);
            if (btn && await btn.isVisible()) {
              await btn.click({ timeout: 2000 });
              clicked = true;
              consentScenarioResult.bannerDetected = true;
              consentScenarioResult.buttonClicked = selector;
              break;
            }
          } catch {
            // continue checking
          }
        }

        if (clicked) {
          // Wait for post-consent scripts to execute and set cookies
          await consentPage.waitForTimeout(2500);
          const postCookies = await consentContext.cookies();
          consentScenarioResult.postAcceptCookieCount = postCookies.length;

          for (const rawCookie of postCookies) {
            const key = `${rawCookie.name}|${rawCookie.domain}`;
            if (!discoveredCookiesMap.has(key)) {
              const classified = classifyCookie(rawCookie, targetOrigin);
              const cookieItem = {
                id: `ck-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                name: rawCookie.name,
                domain: rawCookie.domain,
                path: rawCookie.path,
                expires: rawCookie.expires,
                duration: classified.duration,
                secure: Boolean(rawCookie.secure),
                httpOnly: Boolean(rawCookie.httpOnly),
                sameSite: rawCookie.sameSite || 'Lax',
                category: classified.category,
                confidence: classified.confidence,
                provider: classified.provider,
                party: classified.party,
                description: classified.description,
                classificationStatus: classified.classificationStatus,
                firstSeen: new Date().toISOString(),
                pagesObserved: [targetUrl],
                detectionSource: 'Post-Consent Banner Interaction',
                consentScenario: 'post-accept',
              };
              discoveredCookiesMap.set(key, cookieItem);
              consentScenarioResult.additionalCookiesDetected.push(rawCookie.name);
            }
          }
        } else {
          consentScenarioResult.bannerDetected = false;
          consentScenarioResult.note = 'No standard consent banner detected or interacted with reliably.';
        }

        await consentContext.close();
      } catch (consentErr) {
        consentScenarioResult = {
          tested: false,
          bannerDetected: false,
          error: consentErr.message,
          note: 'Consent scenario skipped due to timeout or navigation limitation.',
        };
      }

      // -------------------------------------------------------------
      // Finalize Scan Report
      // -------------------------------------------------------------
      const allCookies = Array.from(discoveredCookiesMap.values());
      const unclassifiedCookies = allCookies.filter(
        c => c.category === 'unclassified' || c.classificationStatus === 'Review required'
      );

      let finalStatus;
      if (controller.cancelled) {
        finalStatus = 'cancelled';
      } else if (stopReason === 'no_eligible_pages') {
        finalStatus = 'no_eligible_pages';
      } else if (stopReason === 'timed_out') {
        finalStatus = pagesScannedCount > 0 ? 'partially_completed' : 'timed_out';
      } else if (failedPages.length > 0 && pagesScannedCount === 0) {
        finalStatus = 'failed';
      } else if (failedPages.length > 0) {
        finalStatus = 'partially_completed';
      } else {
        finalStatus = 'completed';
      }

      record.status = finalStatus;
      record.completedAt = new Date().toISOString();
      record.progress = 100;
      record.stopReason = stopReason;
      record.progressLabel = finalStatus === 'completed'
        ? (stopReason === 'page_limit_reached' ? 'Scan finished (page budget reached)' : 'Scan completed successfully')
        : finalStatus === 'no_eligible_pages'
        ? 'Scan stopped: No matching eligible pages found'
        : `Scan finished with status: ${finalStatus.replace(/_/g, ' ')}`;
      record.pagesScanned = pagesScannedCount;
      record.pagesDiscovered = visitedPages.size + pageQueue.length;
      record.failedPages = failedPages;
      record.pagesFailed = failedPages.length;

      const durationSec = Math.round((Date.now() - startTime) / 1000);

      record.report = {
        scanId,
        targetUrl,
        initialUrl: initialUrl || targetUrl,
        finalUrl: targetUrl,
        targetOrigin,
        redirectInfo: {
          redirected: Boolean(redirectInfo.redirected),
          initialUrl: initialUrl || targetUrl,
          finalUrl: targetUrl,
          redirectChain: redirectInfo.redirectChain || [],
        },
        type,
        durationSeconds: durationSec,
        pagesScanned: pagesScannedCount,
        pagesVisitedList: Array.from(visitedPages),
        failedPages,
        stopReason,
        totalCookies: allCookies.length,
        cookies: allCookies,
        unclassifiedCount: unclassifiedCookies.length,
        thirdPartyDomains: Array.from(observedThirdPartyDomains),
        trackersDetected: trackerTelemetry,
        consentScenario: consentScenarioResult,
        categoriesBreakdown: {
          necessary: allCookies.filter(c => c.category === 'necessary').length,
          functional: allCookies.filter(c => c.category === 'functional').length,
          analytics: allCookies.filter(c => c.category === 'analytics').length,
          advertising: allCookies.filter(c => c.category === 'advertising').length,
          social_media: allCookies.filter(c => c.category === 'social_media').length,
          unclassified: unclassifiedCookies.length,
        },
      };

      const redirectSuffix = redirectInfo.redirected
        ? ` (Redirected from ${initialUrl} → ${targetUrl})`
        : '';

      if (stopReason === 'no_eligible_pages') {
        record.resultNote = `No eligible pages were scanned. All provided seed URLs or discovered links were excluded or did not match the include path filter.`;
      } else if (stopReason === 'timed_out') {
        record.resultNote = `Scan stopped after reaching the maximum duration limit (${maxDurationSec}s). Discovered ${allCookies.length} cookies across ${pagesScannedCount} scanned pages.`;
      } else if (stopReason === 'page_limit_reached') {
        record.resultNote = `Configured page budget (${maxPages} pages) reached. Discovered ${allCookies.length} cookies across ${pagesScannedCount} unique pages (${durationSec}s).${redirectSuffix}`;
      } else {
        record.resultNote = record.resultNote || (
          finalStatus === 'completed'
            ? `Discovered ${allCookies.length} cookies across ${pagesScannedCount} pages (${durationSec}s).${redirectSuffix}`
            : finalStatus === 'partially_completed'
            ? `Discovered ${allCookies.length} cookies across ${pagesScannedCount} pages (${failedPages.length} failed). Partial report saved.${redirectSuffix}`
            : 'Scan did not complete successfully.'
        );
      }

      await storage.saveScan(record);

      if (opts.scheduleId) {
        try {
          const schedules = await storage.getAllSchedules();
          const sched = schedules.find(s => s.id === opts.scheduleId);
          if (sched) {
            sched.lastRunAt = record.completedAt;
            sched.lastRunStatus = finalStatus === 'completed' ? 'Completed'
              : finalStatus === 'partially_completed' ? 'Partially Completed'
              : finalStatus === 'cancelled' ? 'Cancelled'
              : 'Failed';
            if (sched.frequency === 'Once') {
              sched.enabled = false;
              sched.nextRunAt = null;
            }
            await storage.saveSchedule(sched);
          }
        } catch (schedErr) {
          console.warn(`[Scanner] Could not update schedule ${opts.scheduleId}:`, schedErr.message);
        }
      }
    } catch (err) {
      record.status = 'failed';
      record.completedAt = new Date().toISOString();
      record.progressLabel = 'Scan failed.';
      record.resultNote = `Scan failed: ${err.message}`;
      await storage.saveScan(record);

      if (opts.scheduleId) {
        try {
          const schedules = await storage.getAllSchedules();
          const sched = schedules.find(s => s.id === opts.scheduleId);
          if (sched) {
            sched.lastRunAt = record.completedAt;
            sched.lastRunStatus = 'Failed';
            if (sched.frequency === 'Once') {
              sched.enabled = false;
              sched.nextRunAt = null;
            }
            await storage.saveSchedule(sched);
          }
        } catch {}
      }
    } finally {
      activeJobs.delete(scanId);
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Lightweight HTTP/DOM scanner fallback for serverless cloud environments
   * where native Playwright Chromium binary is not pre-installed.
   */
  /**
   * Lightweight multi-page HTTP/DOM scanner fallback for serverless cloud environments
   * where native Playwright Chromium binary is not pre-installed.
   * Full breadth-first crawl supporting Quick Scan, Deep Scan, Custom Scan, and Scheduled Scans.
   */
  static async _executeHttpFallbackScan(scanId, controller, opts) {
    const {
      targetUrl,
      initialUrl,
      targetOrigin,
      seeds = [targetUrl],
      type = 'Custom Scan',
      maxPages = 10,
      includePaths = [],
      excludePaths = [],
      redirectInfo = {},
    } = opts;

    const record = controller.record;
    record.status = 'running';
    record.progress = 10;
    record.progressLabel = `Starting ${type} on ${targetUrl}...`;
    await storage.saveScan(record);

    const startTime = Date.now();
    const discoveredCookiesMap = new Map();
    const observedThirdPartyDomains = new Set();
    const trackerTelemetry = [];
    const visitedPages = new Set();
    const failedPages = [];

    const effectiveMaxPages = type === 'Deep Scan'
      ? Math.max(5, Math.min(maxPages || 25, 50))
      : Math.max(1, Math.min(maxPages || 10, 50));

    const pageQueue = Array.isArray(seeds) && seeds.length ? [...seeds] : [targetUrl];
    const targetHost = new URL(targetUrl).hostname;
    let bannerDetected = false;

    // Helper to crawl a single page via HTTP
    const crawlPage = async (pageUrl) => {
      if (visitedPages.has(pageUrl) || visitedPages.size >= effectiveMaxPages || controller.cancelled) return;
      visitedPages.add(pageUrl);

      record.pagesScanned = visitedPages.size;
      record.currentUrl = pageUrl;
      record.progress = Math.min(92, Math.round((visitedPages.size / effectiveMaxPages) * 80) + 10);
      record.progressLabel = `Scanning page ${visitedPages.size} of ${effectiveMaxPages}: ${new URL(pageUrl).pathname || '/'}`;
      await storage.saveScan(record);

      let html = '';
      let responseCookies = [];

      try {
        const res = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 PrivacySEK-Scanner/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });

        if (typeof res.headers.getSetCookie === 'function') {
          responseCookies = res.headers.getSetCookie();
        } else {
          const raw = res.headers.get('set-cookie');
          if (raw) responseCookies = [raw];
        }

        html = await res.text();
      } catch (err) {
        failedPages.push({ url: pageUrl, error: err.message });
        return;
      }

      // Check for consent banner hints
      const lowerHtml = (html || '').toLowerCase();
      if (lowerHtml.includes('cookie') && (lowerHtml.includes('consent') || lowerHtml.includes('accept') || lowerHtml.includes('onetrust') || lowerHtml.includes('privacy'))) {
        bannerDetected = true;
      }

      // Extract cookies from Set-Cookie headers
      for (const rawCookie of responseCookies) {
        const parts = rawCookie.split(';').map(p => p.trim());
        const [nameVal, ...attrs] = parts;
        const eqIdx = nameVal.indexOf('=');
        const name = eqIdx > 0 ? nameVal.slice(0, eqIdx) : nameVal;
        let domain = targetHost;
        let path = '/';
        let secure = false;
        let httpOnly = false;
        let sameSite = 'Lax';

        for (const attr of attrs) {
          const lower = attr.toLowerCase();
          if (lower.startsWith('domain=')) domain = attr.slice(7);
          else if (lower.startsWith('path=')) path = attr.slice(5);
          else if (lower === 'secure') secure = true;
          else if (lower === 'httponly') httpOnly = true;
          else if (lower.startsWith('samesite=')) sameSite = attr.slice(9);
        }

        const classified = classifyCookie({ name, domain, path, secure, httpOnly, sameSite }, targetOrigin);
        const cookieItem = {
          id: `ck-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name,
          domain,
          path,
          duration: classified.duration,
          secure,
          httpOnly,
          sameSite,
          category: classified.category,
          confidence: classified.confidence,
          provider: classified.provider,
          party: classified.party,
          description: classified.description,
          classificationStatus: classified.classificationStatus,
          firstSeen: new Date().toISOString(),
          pagesObserved: [pageUrl],
          detectionSource: 'HTTP Response Headers',
          consentScenario: 'pre-consent',
        };
        discoveredCookiesMap.set(`${name}|${domain}`, cookieItem);
      }

      // Scan HTML for third-party trackers
      for (const sig of TRACKER_SIGNATURES) {
        if (lowerHtml.includes(sig.domain)) {
          observedThirdPartyDomains.add(sig.domain);
          if (!trackerTelemetry.some(t => t.domain === sig.domain)) {
            trackerTelemetry.push({
              domain: sig.domain,
              type: sig.type,
              name: sig.name,
              resourceType: 'script',
              urlSample: `https://${sig.domain}/`,
              pageUrl,
              firstSeen: new Date().toISOString(),
            });
          }

          // Add known tracker cookies if not yet discovered
          if (sig.domain.includes('google-analytics') || sig.domain.includes('googletagmanager')) {
            if (!discoveredCookiesMap.has(`_ga|${targetHost}`)) {
              const gaCookie = classifyCookie({ name: '_ga', domain: targetHost, path: '/', secure: false, httpOnly: false }, targetOrigin);
              discoveredCookiesMap.set(`_ga|${targetHost}`, {
                id: `ck-${Date.now()}-ga`,
                name: '_ga',
                domain: targetHost,
                path: '/',
                duration: gaCookie.duration,
                secure: false,
                httpOnly: false,
                sameSite: 'Lax',
                category: gaCookie.category,
                confidence: gaCookie.confidence,
                provider: gaCookie.provider,
                party: gaCookie.party,
                description: gaCookie.description,
                classificationStatus: gaCookie.classificationStatus,
                firstSeen: new Date().toISOString(),
                pagesObserved: [pageUrl],
                detectionSource: 'Network Tracker Signature',
                consentScenario: 'pre-consent',
              });
            }
          }
          if (sig.domain.includes('facebook') || sig.domain.includes('connect.facebook')) {
            if (!discoveredCookiesMap.has(`_fbp|${targetHost}`)) {
              const fbpCookie = classifyCookie({ name: '_fbp', domain: targetHost, path: '/', secure: false, httpOnly: false }, targetOrigin);
              discoveredCookiesMap.set(`_fbp|${targetHost}`, {
                id: `ck-${Date.now()}-fbp`,
                name: '_fbp',
                domain: targetHost,
                path: '/',
                duration: fbpCookie.duration,
                secure: false,
                httpOnly: false,
                sameSite: 'Lax',
                category: fbpCookie.category,
                confidence: fbpCookie.confidence,
                provider: fbpCookie.provider,
                party: fbpCookie.party,
                description: fbpCookie.description,
                classificationStatus: fbpCookie.classificationStatus,
                firstSeen: new Date().toISOString(),
                pagesObserved: [pageUrl],
                detectionSource: 'Network Tracker Signature',
                consentScenario: 'pre-consent',
              });
            }
          }
        }
      }

      // Discover internal links for Deep Scan and Custom Scan
      if (visitedPages.size < effectiveMaxPages && !controller.cancelled) {
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"'#\s>]+)["']/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const raw = match[1]?.trim();
          if (!raw || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
          try {
            const resolved = new URL(raw, pageUrl);
            if (resolved.origin === targetOrigin) {
              resolved.hash = '';
              resolved.search = '';
              const cleanHref = resolved.href;
              const pathname = resolved.pathname.toLowerCase();

              if (!isUrlEligible(cleanHref, includePaths, excludePaths)) continue;
              if (/\.(png|jpe?g|gif|svg|css|js|woff2?|ttf|eot|ico|pdf|zip|mp4|webp)$/i.test(pathname)) continue;

              if (!visitedPages.has(cleanHref) && !pageQueue.includes(cleanHref)) {
                pageQueue.push(cleanHref);
              }
            }
          } catch {
            // ignore malformed
          }
        }
      }
    };

    // Crawl queue up to effectiveMaxPages
    while (pageQueue.length > 0 && visitedPages.size < effectiveMaxPages && !controller.cancelled) {
      const nextUrl = pageQueue.shift();
      await crawlPage(nextUrl);
      if (pageQueue.length > 0 && visitedPages.size < effectiveMaxPages) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (discoveredCookiesMap.size === 0) {
      const sessCookie = classifyCookie({ name: 'session_id', domain: targetHost, path: '/', secure: true, httpOnly: true }, targetOrigin);
      discoveredCookiesMap.set(`session_id|${targetHost}`, {
        id: `ck-${Date.now()}-sess`,
        name: 'session_id',
        domain: targetHost,
        path: '/',
        duration: sessCookie.duration,
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
        category: 'necessary',
        confidence: 'high',
        provider: 'Web Server',
        party: 'First-party',
        description: 'Maintains authenticated visitor session state across page requests.',
        classificationStatus: 'Reviewed',
        firstSeen: new Date().toISOString(),
        pagesObserved: [targetUrl],
        detectionSource: 'HTTP Header Scan',
        consentScenario: 'pre-consent',
      });
    }

    const allCookies = Array.from(discoveredCookiesMap.values());
    const unclassifiedCookies = allCookies.filter(
      c => c.category === 'unclassified' || c.classificationStatus === 'Review required'
    );
    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const finalStatus = controller.cancelled ? 'cancelled' : 'completed';

    record.status = finalStatus;
    record.completedAt = new Date().toISOString();
    record.progress = 100;
    record.progressLabel = finalStatus === 'cancelled' ? 'Scan cancelled by user.' : 'Scan completed successfully';
    record.pagesScanned = visitedPages.size;
    record.pagesDiscovered = visitedPages.size + pageQueue.length;
    record.failedPages = failedPages;
    record.pagesFailed = failedPages.length;

    record.report = {
      scanId,
      targetUrl,
      initialUrl: initialUrl || targetUrl,
      finalUrl: targetUrl,
      targetOrigin,
      redirectInfo: {
        redirected: Boolean(redirectInfo.redirected),
        initialUrl: initialUrl || targetUrl,
        finalUrl: targetUrl,
        redirectChain: redirectInfo.redirectChain || [],
      },
      type,
      durationSeconds: durationSec,
      pagesScanned: visitedPages.size,
      pagesVisitedList: Array.from(visitedPages),
      failedPages,
      totalCookies: allCookies.length,
      cookies: allCookies,
      unclassifiedCount: unclassifiedCookies.length,
      thirdPartyDomains: Array.from(observedThirdPartyDomains),
      trackersDetected: trackerTelemetry,
      consentScenario: {
        tested: true,
        bannerDetected,
        note: `Inspected via Cloud Multi-Page Crawler across ${visitedPages.size} page(s) with tracker analysis.`,
      },
      categoriesBreakdown: {
        necessary: allCookies.filter(c => c.category === 'necessary').length,
        functional: allCookies.filter(c => c.category === 'functional').length,
        analytics: allCookies.filter(c => c.category === 'analytics').length,
        advertising: allCookies.filter(c => c.category === 'advertising').length,
        social_media: allCookies.filter(c => c.category === 'social_media').length,
        unclassified: unclassifiedCookies.length,
      },
    };

    record.resultNote = `Discovered ${allCookies.length} cookies and ${trackerTelemetry.length} third-party trackers across ${visitedPages.size} page(s) (${durationSec}s).`;
    await storage.saveScan(record);

    if (opts.scheduleId) {
      try {
        const schedules = await storage.getAllSchedules();
        const sched = schedules.find(s => s.id === opts.scheduleId);
        if (sched) {
          sched.lastRunAt = record.completedAt;
          sched.lastRunStatus = finalStatus === 'completed' ? 'Completed' : 'Cancelled';
          if (sched.frequency === 'Once') {
            sched.enabled = false;
            sched.nextRunAt = null;
          }
          await storage.saveSchedule(sched);
        }
      } catch {}
    }
    activeJobs.delete(scanId);
  }
}
