import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkDatabaseHealth } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';
import { baseRouter } from './routes/baseRoutes.js';
import { huntingRouter } from './routes/huntingRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createExpressApp() {
  const app = express();

  // Basic security and parsing middleware
  app.use(cors({
    origin: '*', // Mini App can be embedded in Telegram webview
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data']
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Static files for 3D Mini App
  const publicWebappPath = path.resolve(__dirname, '../../public/webapp');
  app.use('/webapp', express.static(publicWebappPath));

  // Mount Voxel Base & Hunting APIs
  app.use('/api/base', baseRouter);
  app.use('/api/hunting', huntingRouter);

  // Healthcheck endpoint
  app.get('/health', async (req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      const status = dbHealth.healthy ? 'ok' : 'degraded';
      const statusCode = dbHealth.healthy ? 200 : 503;

      res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealth,
        environment: config.NODE_ENV
      });
    } catch (err) {
      logger.error('Healthcheck endpoint failure:', err);
      res.status(500).json({
        status: 'error',
        error: err.message
      });
    }
  });

  // Base route for sanity check
  app.get('/', (req, res) => {
    res.json({
      name: 'Legends of Rane API',
      status: 'online',
      version: '1.0.0',
      miniapp: '/webapp'
    });
  });

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl
    });
  });

  // Global Express Error Handler
  app.use((err, req, res, _next) => {
    logger.error(`Express error [${req.method} ${req.originalUrl}]:`, err);

    const statusCode = err.statusCode || 500;
    const response = {
      error: err.message || 'Internal Server Error',
      code: err.code || 'SERVER_ERROR'
    };

    if (config.IS_DEVELOPMENT && err.stack) {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  });

  return app;
}

export default createExpressApp;
