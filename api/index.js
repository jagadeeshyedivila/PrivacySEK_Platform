import express from 'express';
import cors from 'cors';
import { cookieRouter } from '../server/routes/cookieRoutes.js';
import { platformRouter } from '../server/routes/platformRoutes.js';
import { scannerRouter } from '../server/routes/scannerRoutes.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount routers with /api prefix (standard frontend calls)
app.use('/api/cookies', cookieRouter);
app.use('/api/platform', platformRouter);
app.use('/api/scanner', scannerRouter);

// Also mount without /api prefix in case Vercel rewrites strip the /api prefix
app.use('/cookies', cookieRouter);
app.use('/platform', platformRouter);
app.use('/scanner', scannerRouter);

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
