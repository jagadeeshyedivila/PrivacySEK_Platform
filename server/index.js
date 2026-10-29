import express from 'express';
import cors from 'cors';
import { startSchedulerDaemon } from './scheduler.js';
import { connectDB, closeDB } from './db.js';
import { runMigration } from './migrate.js';
import { cookieRouter } from './routes/cookieRoutes.js';
import { platformRouter } from './routes/platformRoutes.js';
import { scannerRouter } from './routes/scannerRoutes.js';

const app = express();
const PORT = process.env.PORT || process.env.SCANNER_PORT || 3001;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount Modular API Routers
app.use('/api/cookies', cookieRouter);
app.use('/api/platform', platformRouter);
app.use('/api/scanner', scannerRouter);

// Start the server with MongoDB connection
async function startServer() {
  try {
    const db = await connectDB();
    const settings = await db.collection('platform_settings').findOne(
      { key: 'org_settings' },
      { projection: { _id: 1 } },
    );

    if (!settings) {
      console.log('[Setup] No platform data found. Initializing demo data in MongoDB...');
      await closeDB();
      await runMigration();
      await connectDB();
    }
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
