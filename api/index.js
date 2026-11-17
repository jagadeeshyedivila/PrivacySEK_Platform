import express from 'express';
import cors from 'cors';
import { cookieRouter } from '../server/routes/cookieRoutes.js';
import { platformRouter } from '../server/routes/platformRoutes.js';
import { scannerRouter } from '../server/routes/scannerRoutes.js';
import { storeRouter } from '../server/routes/storeRoutes.js';
import { ensureSeeded } from '../server/seed/index.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
// Same limit as server/index.js: web forms carry a small logo and favicon
app.use(express.json({ limit: '2mb' }));

// Serverless has no startup hook, so the first request on a new database seeds it.
// ensureSeeded() runs once per instance and is a no-op once the data is there.
app.use(async (_req, _res, next) => {
  try { await ensureSeeded(); } catch (err) { console.error('[Seed] Could not seed demo data:', err.message); }
  next();
});

// Mount routers with /api prefix (standard frontend calls)
app.use('/api/cookies', cookieRouter);
app.use('/api/platform', platformRouter);
app.use('/api/scanner', scannerRouter);
app.use('/api/store', storeRouter);

// Also mount without /api prefix in case Vercel rewrites strip the /api prefix
app.use('/cookies', cookieRouter);
app.use('/platform', platformRouter);
app.use('/scanner', scannerRouter);
app.use('/store', storeRouter);

// Root and status health
app.get(['/', '/api'], (_req, res) => {
  res.json({
    name: 'PrivacySEK Platform API',
    status: 'online',
    version: '2.0.0',
    serverless: true,
  });
});

export default app;
