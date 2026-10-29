import express from 'express';
import cors from 'cors';
import { ScannerService } from './scanner.js';
import { storage } from './storage.js';
import { startSchedulerDaemon, calculateNextRun } from './scheduler.js';
import { connectDB, closeDB } from './db.js';
import { cookieRouter } from './routes/cookieRoutes.js';
import { platformRouter } from './routes/platformRoutes.js';

const app = express();
const PORT = process.env.PORT || process.env.SCANNER_PORT || 3001;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount Modular API Routers
app.use('/api/cookies', cookieRouter);
app.use('/api/platform', platformRouter);

// Health Check
app.get('/api/scanner/health', async (_req, res) => {
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

// -------------------------------------------------------------
// SCAN OPERATIONS
// -------------------------------------------------------------

// Start a new scan
app.post('/api/scanner/scan', async (req, res) => {
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

    res.status(201).json({
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
app.get('/api/scanner/scan/:id', async (req, res) => {
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
app.get('/api/scanner/scan/:id/report', async (req, res) => {
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
app.post('/api/scanner/scan/:id/cancel', async (req, res) => {
  try {
    const cancelled = await ScannerService.cancelScan(req.params.id);
    if (!cancelled) {
      return res.status(404).json({ error: 'Scan not found or already terminated.' });
    }
    res.json({ success: true, message: 'Scan cancelled.', scan: cancelled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve all scans history
app.get('/api/scanner/history', async (_req, res) => {
  try {
    const scans = await storage.getAllScans();
    // Return summaries for fast listing
    const summaries = scans.map(s => ({
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
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a scan from history
app.delete('/api/scanner/scan/:id', async (req, res) => {
  try {
    await storage.deleteScan(req.params.id);
    res.json({ success: true, message: 'Scan removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compare two scans
app.post('/api/scanner/compare', async (req, res) => {
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

// -------------------------------------------------------------
// SCHEDULE OPERATIONS
// -------------------------------------------------------------

// Retrieve all schedules
app.get('/api/scanner/schedules', async (_req, res) => {
  try {
    const schedules = await storage.getAllSchedules();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new schedule
app.post('/api/scanner/schedules', async (req, res) => {
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
app.put('/api/scanner/schedules/:id', async (req, res) => {
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
app.delete('/api/scanner/schedules/:id', async (req, res) => {
  try {
    await storage.deleteSchedule(req.params.id);
    res.json({ success: true, message: 'Schedule deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger a scheduled scan immediately
app.post('/api/scanner/schedules/:id/run', async (req, res) => {
  try {
    const schedules = await storage.getAllSchedules();
    const schedule = schedules.find(s => s.id === req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }

    const scan = await ScannerService.startScan({
      url: schedule.url,
      type: schedule.type || 'Custom Scan',
      maxPages: schedule.pages || 10,
      additionalUrls: schedule.urls || [],
      allowLocalhost: schedule.allowLocalhost || false,
    });

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

// Start the server with MongoDB connection
async function startServer() {
  try {
    await connectDB();
  } catch (err) {
    console.error('[FATAL] Backend could not establish MongoDB connection:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[PrivacySEK Backend Server] listening on http://localhost:${PORT}`);
    startSchedulerDaemon();
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[PrivacySEK Backend Server] shutting down...');
    server.close(async () => {
      await closeDB();
      console.log('[PrivacySEK Backend Server] stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
