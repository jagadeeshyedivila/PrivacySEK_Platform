import express from 'express';
import cors from 'cors';
import { connectDB } from '../server/db.js';
import { cookieRouter } from '../server/routes/cookieRoutes.js';
import { platformRouter } from '../server/routes/platformRoutes.js';
import { storage } from '../server/storage.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount modular API routers
app.use('/api/cookies', cookieRouter);
app.use('/api/platform', platformRouter);

// Health check
app.get('/api/scanner/health', async (_req, res) => {
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });
    res.json({
      status: 'ok',
      service: 'PrivacySEK Platform (Vercel Serverless)',
      database: 'connected (MongoDB)',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'demo',
      service: 'PrivacySEK Platform (Vercel Serverless Demo Mode)',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Scanner history
app.get('/api/scanner/history', async (_req, res) => {
  try {
    const scans = await storage.getAllScans();
    res.json(scans);
  } catch (_err) {
    res.json([]);
  }
});

// Scanner schedules
app.get('/api/scanner/schedules', async (_req, res) => {
  try {
    const schedules = await storage.getAllSchedules();
    res.json(schedules);
  } catch (_err) {
    res.json([]);
  }
});

// API root / status
app.get('/api', (_req, res) => {
  res.json({
    name: 'PrivacySEK Platform API',
    status: 'online',
    version: '2.0.0',
    serverless: true,
  });
});

export default app;
