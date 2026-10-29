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
    const validatedSeeds = [targetUrl];
    for (const rawSeed of additionalUrls) {
      if (!rawSeed) continue;
      try {
        const resolvedSeed = new URL(rawSeed, targetUrl);
        if (resolvedSeed.origin === targetOrigin && !validatedSeeds.includes(resolvedSeed.href)) {
          validatedSeeds.push(resolvedSeed.href);
        }
      } catch {
        // ignore invalid seed
      }
    }

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
    const pageQueue = seeds.map(url => ({ url, depth: 0 }));

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
          if (request.isNavigationRequest()) {
            failedPages.push({
              url: reqUrl,
              error: `Navigation blocked for SSRF protection: destination "${parsed.hostname}" resolved to a private or reserved network address.`,
              timestamp: new Date().toISOString(),
            });
          }
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

      while (pageQueue.length > 0 && pagesScannedCount < maxPages && !controller.cancelled) {
        if (Date.now() > maxEndTime) {
          record.resultNote = `Scan stopped after reaching the maximum duration limit (${maxDurationSec}s).`;
          break;
        }

        const { url: currentUrl, depth } = pageQueue.shift();
        if (visitedPages.has(currentUrl)) continue;

        // Path filtering
        if (includePaths.length > 0) {
          const pathName = new URL(currentUrl).pathname;
          const matches = includePaths.some(p => pathName.includes(p));
          if (!matches) continue;
        }
        if (excludePaths.length > 0) {
          const pathName = new URL(currentUrl).pathname;
          const blocked = excludePaths.some(p => pathName.includes(p));
          if (blocked) continue;
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

          // Wait for dynamic client scripts and cookies to settle
          await page.waitForTimeout(1200);

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

          // Discover links on page if depth permits
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
                    // Normalize link: strip hash
                    parsedHref.hash = '';
                    const cleanUrl = parsedHref.href;
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

      const finalStatus = controller.cancelled
        ? 'cancelled'
        : failedPages.length > 0 && pagesScannedCount > 0
        ? 'partially_completed'
        : failedPages.length > 0 && pagesScannedCount === 0
        ? 'failed'
        : 'completed';

      record.status = finalStatus;
      record.completedAt = new Date().toISOString();
      record.progress = 100;
      record.progressLabel = finalStatus === 'completed' ? 'Scan completed successfully' : `Scan finished with status: ${finalStatus}`;
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

      record.resultNote = record.resultNote || (
        finalStatus === 'completed'
          ? `Discovered ${allCookies.length} cookies across ${pagesScannedCount} pages (${durationSec}s).${redirectSuffix}`
          : finalStatus === 'partially_completed'
          ? `Discovered ${allCookies.length} cookies across ${pagesScannedCount} pages (${failedPages.length} failed). Partial report saved.${redirectSuffix}`
          : 'Scan did not complete successfully.'
      );

      await storage.saveScan(record);
    } catch (err) {
      record.status = 'failed';
      record.completedAt = new Date().toISOString();
      record.progressLabel = 'Scan failed.';
      record.resultNote = `Scan failed: ${err.message}`;
      await storage.saveScan(record);
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
}
