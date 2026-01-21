import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';

import { initializeDatabase } from './config/database.js';
import cardsRouter from './routes/cards.js';
import setsRouter from './routes/sets.js';
import valuationRouter from './routes/valuation.js';
import { scheduledSync, initialSync, fullResync, continueSync } from './services/sync.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/cards', cardsRouter);
app.use('/api/sets', setsRouter);
app.use('/api/valuation', valuationRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Manual sync trigger (for development/admin)
app.post('/api/sync/trigger', async (req, res) => {
  try {
    const result = await scheduledSync();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initial sync - syncs cards from multiple sets
app.post('/api/sync/initial', async (req, res) => {
  try {
    const result = await initialSync();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Initial sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Full resync - re-syncs all sets from scratch
app.post('/api/sync/full', async (req, res) => {
  try {
    const result = await fullResync();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Full resync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Continue sync - picks up where we left off
app.post('/api/sync/continue', async (req, res) => {
  try {
    const result = await continueSync();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Continue sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
let server;

async function start() {
  try {
    // Initialize database first
    await initializeDatabase();

    // Schedule automatic sync
    const syncSchedule = process.env.SYNC_SCHEDULE || '0 6 * * *';
    if (cron.validate(syncSchedule)) {
      cron.schedule(syncSchedule, async () => {
        console.log('Running scheduled sync...');
        try {
          await scheduledSync();
          console.log('Scheduled sync completed');
        } catch (error) {
          console.error('Scheduled sync failed:', error);
        }
      });
      console.log(`Sync scheduled: ${syncSchedule}`);
    }

    // Start server
    server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} - v1.0.1`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
function shutdown() {
  console.log('\nShutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
