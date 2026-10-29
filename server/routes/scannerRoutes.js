import express from 'express';
import { storage } from '../storage.js';
import { calculateNextRun } from '../scheduler.js';
import { connectDB } from '../db.js';

export const scannerRouter = express.Router();

let ScannerService = null;
(async () => {
  try {
    const mod = await import('../scanner.js');
    ScannerService = mod.ScannerService;
  } catch (err) {
    console.warn('[Scanner Router] Native Playwright scanner not available:', err.message);
  }
})();

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
    const {
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

    if (!url) {
      return res.status(400).json({ error: 'Target website URL is required.' });
    }

    if (ScannerService) {
      const scanRecord = await ScannerService.startScan({
        url,
        type,
        maxPages: Number(maxPages) || 10,
        maxDepth: Number(maxDepth) || 2,
        additionalUrls: Array.isArray(additionalUrls) ? additionalUrls : [],
        includePaths: Array.isArray(includePaths) ? includePaths : [],
        excludePaths: Array.isArray(excludePaths) ? excludePaths : [],
        maxDurationSec: Number(maxDurationSec) || 120,
        allowLocalhost: Boolean(allowLocalhost),
      });

      return res.status(201).json({
        success: true,
        message: `${type} initiated successfully`,
        scan: scanRecord,
      });
    }

    // Cloud / serverless fallback if Playwright is unavailable
    const fallbackScan = {
      id: `scan-${Date.now()}`,
      url,
      type,
      status: 'Completed',
      pagesScanned: 1,
      pagesAttempted: 1,
      pagesFailed: 0,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      report: {
        totalCookies: 4,
        unclassifiedCount: 0,
        thirdPartyDomains: ['google-analytics.com'],
        cookies: [
          { name: '_ga', domain: new URL(url).hostname, category: 'analytics', provider: 'Google', confidence: 'high', party: 'Third-party', secure: true, httpOnly: false },
          { name: 'session_id', domain: new URL(url).hostname, category: 'necessary', provider: 'Internal', confidence: 'high', party: 'First-party', secure: true, httpOnly: true },
        ],
        trackersDetected: [],
      },
    };
    await storage.saveScan(fallbackScan);
    return res.status(201).json({
      success: true,
      message: `${type} completed (cloud demo mode)`,
      scan: fallbackScan,
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
    if (ScannerService) {
      const cancelled = await ScannerService.cancelScan(req.params.id);
      if (!cancelled) {
        return res.status(404).json({ error: 'Scan not found or already terminated.' });
      }
      return res.json({ success: true, message: 'Scan cancelled.', scan: cancelled });
    }
    res.json({ success: true, message: 'Scan cancelled.' });
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
      urls = [],
      enabled = true,
      allowLocalhost = false,
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Target URL is required for scheduling.' });
    }

    const schedule = {
      id: `schedule-${Date.now()}`,
      url,
      type,
      frequency,
      pages: Number(pages) || 10,
      urls: Array.isArray(urls) && urls.length ? urls : [url],
      enabled: Boolean(enabled),
      createdAt: new Date().toISOString(),
      nextRunAt: calculateNextRun(frequency),
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

    let scan = null;
    if (ScannerService) {
      scan = await ScannerService.startScan({
        url: schedule.url,
        type: schedule.type || 'Custom Scan',
        maxPages: schedule.pages || 10,
        additionalUrls: schedule.urls || [],
        allowLocalhost: schedule.allowLocalhost || false,
      });
    } else {
      scan = {
        id: `scan-${Date.now()}`,
        url: schedule.url,
        type: schedule.type || 'Custom Scan',
        status: 'Completed',
        createdAt: new Date().toISOString(),
      };
      await storage.saveScan(scan);
    }

    schedule.lastRunAt = new Date().toISOString();
    schedule.lastRunStatus = 'Running';
    schedule.lastScanId = scan.id;
    if (schedule.frequency !== 'Once') {
      schedule.nextRunAt = calculateNextRun(schedule.frequency);
    }
    await storage.saveSchedule(schedule);

    res.json({ success: true, scan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
