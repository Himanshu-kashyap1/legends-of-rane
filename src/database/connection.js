import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

let isConnected = false;
let connectionPromise = null;

// Configure Mongoose global options
mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB with pooling and event listeners.
 * @param {string} [uri] - Optional MongoDB connection URI override
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDatabase(uri = config.MONGO_URI) {
  if (isConnected && mongoose.connection.readyState === 1) {
    logger.debug('Using existing MongoDB connection');
    return mongoose;
  }

  if (!uri) {
    throw new DatabaseError('MongoDB connection URI is not defined. Please check your .env configuration.');
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  logger.info(`Connecting to MongoDB at: ${config.getMaskedMongoUri()}`);

  connectionPromise = mongoose.connect(uri, options)
    .then((m) => {
      isConnected = true;
      logger.info('Successfully connected to MongoDB');
      return m;
    })
    .catch((err) => {
      isConnected = false;
      connectionPromise = null;
      logger.error('Failed to connect to MongoDB', err);
      throw new DatabaseError(`MongoDB connection error: ${err.message}`, err);
    });

  // Attach event handlers only once
  if (!mongoose.connection.listenerCount('error')) {
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection encountered an error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      connectionPromise = null;
      logger.warn('MongoDB connection lost. Reconnection will be attempted by driver.');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB reconnected successfully.');
    });
  }

  return connectionPromise;
}

/**
 * Disconnect cleanly from MongoDB during graceful shutdown.
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.disconnect();
    isConnected = false;
    connectionPromise = null;
    logger.info('MongoDB connection closed.');
  }
}

/**
 * Healthcheck / ping status of database connection.
 * @returns {Promise<{ status: string, readyState: number, pingMs?: number }>}
 */
export async function checkDatabaseHealth() {
  const readyState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateStr = states[readyState] || 'unknown';

  if (readyState !== 1 || !mongoose.connection.db) {
    return {
      status: stateStr,
      readyState,
      healthy: false
    };
  }

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingMs = Date.now() - start;
    return {
      status: 'healthy',
      readyState,
      healthy: true,
      pingMs
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      readyState,
      healthy: false,
      error: err.message
    };
  }
}

export default {
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth
};
