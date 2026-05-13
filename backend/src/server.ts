/**
 * Memory Chat Backend Server
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

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);

// Configure Socket.io with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
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
    message: 'Memory Chat Backend',
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
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     Memory Chat Backend Server             ║
║     Privacy-First Architecture             ║
║     Socket.io Real-Time Messaging          ║
╠════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}
║  WebSocket ready for connections          ║
║  Storage: RAM only (no persistence)       ║
║  Messages auto-destroyed after relay      ║
╚════════════════════════════════════════════╝
  `);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  clearOnlineUsers();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, io };
