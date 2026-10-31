import express from 'express';
import { storage } from '../storage.js';
import { calculateNextRun } from '../scheduler.js';
import { connectDB } from '../db.js';

export const scannerRouter = express.Router();

let scannerServicePromise;
function getScannerService() {
  if (!scannerServicePromise) {
    scannerServicePromise = import('../scanner.js')
      .then(mod => mod.ScannerService)
      .catch(err => {
        scannerServicePromise = null;
        throw err;
      });
  }
  return scannerServicePromise;
}

// Health Check
scannerRouter.get('/health', async (_req, res) => {
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });
    res.json({
      status: 'ok',
      service: 'PrivacySEK Platform & Scanner API',
      database: 'connected (MongoDB)',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Start a new scan
scannerRouter.post('/scan', async (req, res) => {
  try {
    let {
      url,
      type = 'Custom Scan',
      maxPages = 10,
      maxDepth = 2,
      additionalUrls = [],
      includePaths = [],
      excludePaths = [],
      maxDurationSec = 120,
      allowLocalhost = false,
    } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Target website URL is required.' });
    }

    // Normalize URL
    let cleanUrl = url.trim();
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(cleanUrl);
    if (hasScheme && !/^https?:\/\//i.test(cleanUrl)) {
      return res.status(400).json({ error: 'Website URL must use HTTP or HTTPS protocol.' });
    }
    if (!hasScheme) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const parsed = new URL(cleanUrl);
      parsed.hash = '';
      cleanUrl = parsed.href;
    } catch {
      return res.status(400).json({ error: 'Enter a valid website URL.' });
    }

    // Validate page limit (1 to 50)
    const numPages = Number(maxPages);
    if (!Number.isInteger(numPages) || numPages < 1 || numPages > 50) {
      return res.status(400).json({ error: 'Maximum pages to scan must be an integer between 1 and 50.' });
    }

    // Validate crawl depth (1, 2, or 3)
    const numDepth = Number(maxDepth);
    if (![1, 2, 3].includes(numDepth)) {
      return res.status(400).json({ error: 'Crawl link depth must be 1, 2, or 3.' });
    }

    // Validate max duration
    const numDuration = Number(maxDurationSec);
    if (isNaN(numDuration) || numDuration < 30 || numDuration > 600) {
      return res.status(400).json({ error: 'Maximum duration must be between 30 and 600 seconds.' });
    }

    let ScannerService;
    try {
      ScannerService = await getScannerService();
    } catch (err) {
      console.error('[Scanner Router] Could not load scanner service:', err);
      return res.status(503).json({
        success: false,
        error: 'The scanner service is unavailable. Check the production dependency installation and backend logs.',
      });
    }

    const scanRecord = await ScannerService.startScan({
      url: cleanUrl,
      type,
      maxPages: numPages,
      maxDepth: numDepth,
      additionalUrls: Array.isArray(additionalUrls) ? additionalUrls : [],
      includePaths: Array.isArray(includePaths) ? includePaths.map(p => String(p).trim()).filter(Boolean) : [],
      excludePaths: Array.isArray(excludePaths) ? excludePaths.map(p => String(p).trim()).filter(Boolean) : [],
      maxDurationSec: numDuration,
      allowLocalhost: Boolean(allowLocalhost),
    });

    return res.status(201).json({
      success: true,
      message: `${type} initiated successfully`,
      scan: scanRecord,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// Retrieve live status and progress of a scan
scannerRouter.get('/scan/:id', async (req, res) => {
  try {
    const scan = await storage.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan job not found.' });
    }
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve full detailed report of a completed or partial scan
scannerRouter.get('/scan/:id/report', async (req, res) => {
  try {
    const scan = await storage.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }
    if (!scan.report) {
      return res.status(404).json({
        error: 'Report is not ready yet or scan failed before data collection.',
        status: scan.status,
      });
    }
    res.json({
      scanId: scan.id,
      url: scan.url,
      type: scan.type,
      status: scan.status,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt,
      report: scan.report,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a running scan
scannerRouter.post('/scan/:id/cancel', async (req, res) => {
  try {
    const ScannerService = await getScannerService();
    const cancelled = await ScannerService.cancelScan(req.params.id);
    if (!cancelled) {
      return res.status(404).json({ error: 'Scan not found or already terminated.' });
    }
    return res.json({ success: true, message: 'Scan cancelled.', scan: cancelled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a cookie classification within a scan report
scannerRouter.patch('/scan/:id/cookie', async (req, res) => {
  try {
    const { cookieName, category, classificationStatus, confidence, purpose, provider } = req.body;
    if (!cookieName || !category) {
      return res.status(400).json({ error: 'cookieName and category are required.' });
    }

    const scan = await storage.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    if (scan.report && Array.isArray(scan.report.cookies)) {
      const cookie = scan.report.cookies.find(c => c.name === cookieName);
      if (cookie) {
        cookie.category = category;
        if (classificationStatus) cookie.classificationStatus = classificationStatus;
        if (confidence) cookie.confidence = confidence;
        if (purpose) cookie.purpose = purpose;
        if (provider) cookie.provider = provider;

        scan.report.unclassifiedCount = scan.report.cookies.filter(
          c => c.category === 'unclassified' || c.classificationStatus === 'Review required'
        ).length;
        scan.unclassifiedCount = scan.report.unclassifiedCount;

        await storage.saveScan(scan);
        return res.json({ success: true, cookie, scan });
      }
    }

    return res.status(404).json({ error: 'Cookie not found in scan report.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve all scans history
scannerRouter.get('/history', async (req, res) => {
  try {
    const scans = await storage.getAllScans();
    let summaries = scans.map(s => ({
      id: s.id,
      url: s.url,
      type: s.type,
      status: s.status,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
      pagesScanned: s.pagesScanned || 0,
      pagesAttempted: s.pagesAttempted || 0,
      pagesFailed: s.pagesFailed || 0,
      cookiesCount: s.report?.totalCookies ?? (s.cookieIds?.length || 0),
      unclassifiedCount: s.report?.unclassifiedCount ?? 0,
      thirdPartyCount: s.report?.thirdPartyDomains?.length ?? 0,
      resultNote: s.resultNote,
    }));

    if (req.query.search) {
      const q = req.query.search.trim().toLowerCase();
      summaries = summaries.filter(s =>
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.url && s.url.toLowerCase().includes(q)) ||
        (s.type && s.type.toLowerCase().includes(q)) ||
        (s.status && s.status.toLowerCase().includes(q))
      );
    }

    if (req.query.status && req.query.status !== 'all') {
      summaries = summaries.filter(s => s.status === req.query.status);
    }

    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    summaries.sort((a, b) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    const isPaginated = req.query.page != null || req.query.pageSize != null || req.query.limit != null || req.query.paginate === 'true';

    if (isPaginated) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || req.query.limit) || 10));
      const total = summaries.length;
      const totalPages = Math.ceil(total / pageSize) || 1;
      const skip = (page - 1) * pageSize;
      const paginated = summaries.slice(skip, skip + pageSize);

      return res.json({
        success: true,
        scans: paginated,
        total,
        page,
        pageSize,
        totalPages,
        pagination: {
          page,
          pageSize,
          totalRecords: total,
          totalPages,
        },
      });
    }

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a scan from history
scannerRouter.delete('/scan/:id', async (req, res) => {
  try {
    await storage.deleteScan(req.params.id);
    res.json({ success: true, message: 'Scan removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compare two scans
scannerRouter.post('/compare', async (req, res) => {
  try {
    const { baseScanId, targetScanId } = req.body;
    if (!baseScanId || !targetScanId) {
      return res.status(400).json({ error: 'baseScanId and targetScanId are required.' });
    }
    const diff = await storage.compareScans(baseScanId, targetScanId);
    res.json(diff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Retrieve all schedules
scannerRouter.get('/schedules', async (_req, res) => {
  try {
    const schedules = await storage.getAllSchedules();
    for (const sched of schedules) {
      if (sched.lastRunStatus === 'Running' && sched.lastScanId) {
        const scan = await storage.getScan(sched.lastScanId);
        if (scan && scan.status !== 'running' && scan.status !== 'queued') {
          sched.lastRunStatus = scan.status === 'completed' ? 'Completed'
            : scan.status === 'partially_completed' ? 'Partially Completed'
            : scan.status === 'cancelled' ? 'Cancelled'
            : 'Failed';
          sched.lastRunAt = scan.completedAt || sched.lastRunAt;
          if (sched.frequency === 'Once') {
            sched.enabled = false;
            sched.nextRunAt = null;
          }
          await storage.saveSchedule(sched);
        }
      }
    }
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new schedule
scannerRouter.post('/schedules', async (req, res) => {
  try {
    const {
      url,
      type = 'Custom Scan',
      frequency = 'Weekly',
      pages = 10,
      depth = 2,
      duration = 120,
      includePaths = [],
      excludePaths = [],
      urls = [],
      options = {},
      enabled = true,
      allowLocalhost = false,
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Target URL is required for scheduling.' });
    }

    const nextRun = frequency === 'Once' ? null : calculateNextRun(frequency, new Date(), options);

    const schedule = {
      id: req.body.id || `schedule-${Date.now()}`,
      url,
      type,
      frequency,
      pages: Number(pages) || 10,
      depth: Number(depth) || 2,
      duration: Number(duration) || 120,
      includePaths: Array.isArray(includePaths) ? includePaths : [],
      excludePaths: Array.isArray(excludePaths) ? excludePaths : [],
      urls: Array.isArray(urls) && urls.length ? urls : [url],
      options: options || {},
      enabled: Boolean(enabled),
      createdAt: new Date().toISOString(),
      nextRunAt: nextRun,
      lastRunAt: null,
      lastRunStatus: null,
      allowLocalhost: Boolean(allowLocalhost),
    };

    await storage.saveSchedule(schedule);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update an existing schedule
scannerRouter.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await storage.saveSchedule({
      id: req.params.id,
      ...req.body,
    });
    res.json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a schedule
scannerRouter.delete('/schedules/:id', async (req, res) => {
  try {
    await storage.deleteSchedule(req.params.id);
    res.json({ success: true, message: 'Schedule deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger a scheduled scan immediately
scannerRouter.post('/schedules/:id/run', async (req, res) => {
  try {
    const schedules = await storage.getAllSchedules();
    const schedule = schedules.find(s => s.id === req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }

    const ScannerService = await getScannerService();
    const scan = await ScannerService.startScan({
      url: schedule.url,
      type: schedule.type || 'Custom Scan',
      maxPages: schedule.pages || 10,
      maxDepth: schedule.depth || 2,
      maxDurationSec: schedule.duration || 120,
      includePaths: schedule.includePaths || [],
      excludePaths: schedule.excludePaths || [],
      additionalUrls: schedule.urls || [],
      allowLocalhost: schedule.allowLocalhost || false,
      scheduleId: schedule.id,
    });

    schedule.lastRunAt = new Date().toISOString();
    schedule.lastRunStatus = 'Running';
    schedule.lastScanId = scan.id;
    if (schedule.frequency === 'Once') {
      schedule.nextRunAt = null;
    } else {
      schedule.nextRunAt = calculateNextRun(schedule.frequency, new Date(), schedule.options || {});
    }
    await storage.saveSchedule(schedule);

    res.json({ success: true, scan, schedule });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
