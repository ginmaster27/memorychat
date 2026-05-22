/**
 * Vibly Backend Server
 * Privacy-first, memory-only messaging application
 * 
 * ARCHITECTURE:
 * - Express.js HTTP server
 * - Socket.io for real-time communication
 * - Google OAuth for authentication
 * - RAM-only data storage (no database)
 * - Immediate message cleanup after delivery
 * - No persistence, no backups, no recovery
 */

import express, { Express } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSocketEvents, getOnlineUsersCount, getAllOnlineUsers, clearOnlineUsers } from './socket';
import { createMediaRouter } from './media/routes';
import { MEDIA_CONFIG } from './media/config';
import { temporaryMediaStorage } from './media/storage';

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const corsOrigin = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()).filter(Boolean)
  : true;

// Configure Socket.io with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use('/api/media', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MEDIA_CONFIG.maxUploadBytes }), createMediaRouter(process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`));
app.use(express.json());

// Initialize Socket.io events
initializeSocketEvents(io);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    onlineUsers: getOnlineUsersCount()
  });
});

/**
 * Monitoring endpoint - returns current online users (for admin)
 * In production, this should be protected
 */
app.get('/api/monitoring/online-users', (req, res) => {
  // In production, add authentication check here
  res.json({
    count: getOnlineUsersCount(),
    users: getAllOnlineUsers(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Vibly Backend',
    description: 'Privacy-first, memory-only messaging application',
    version: '1.0.0',
    architecture: 'RAM-only, no persistence'
  });
});

/**
 * Error handling middleware
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 4000;
const activeServer = httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     Vibly Backend Server                   ║
║     Privacy-First Architecture             ║
║     Socket.io Real-Time Messaging          ║
╠════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}
║  WebSocket ready for connections          ║
║  Storage: RAM only (no persistence)       ║
║  Messages auto-destroyed after relay      ║
╚════════════════════════════════════════════╝
  `);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Expo app / web dev server'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

let isShuttingDown = false;

function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\nShutting down server...');
  clearOnlineUsers();
  void temporaryMediaStorage.clear();
  io.close();
  activeServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

// Graceful shutdown
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

export { app, io };
