/**
 * Socket.io Event Handler
 * Manages real-time messaging and online user tracking
 * 
 * PRIVACY ARCHITECTURE:
 * - All data exists only in RAM (Map structures)
 * - Messages are relayed immediately and forgotten
 * - No message persistence
 * - No chat history
 * - User tracking only during active session
 */

import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { verifyGoogleToken } from './auth';
import {
  PublicUserProfile,
  OnlineUser,
  Message,
  SendMessagePayload,
  AuthPayload
} from './types';

const RESERVED_OR_OFFENSIVE_WORDS = [
  'admin',
  'administrator',
  'moderator',
  'support',
  'system',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard'
];

const USERNAME_WORDS = [
  'river',
  'cedar',
  'ember',
  'atlas',
  'nova',
  'harbor',
  'meadow',
  'summit',
  'willow',
  'orbit',
  'maple',
  'lumen',
  'prairie',
  'cobalt',
  'saffron',
  'quartz',
  'aurora',
  'haven',
  'solace',
  'marble'
];

/**
 * In-memory online users map
 * Structure: email -> OnlineUser
 * WIPED on disconnect
 */
const onlineUsers = new Map<string, OnlineUser>();

/**
 * In-memory active private identity map
 * Structure: Google email -> socketId
 * Used only server-side to prevent the same Google account from being active twice.
 */
const emailToSocket = new Map<string, string>();

/**
 * In-memory username lookup
 * Structure: username -> email
 * WIPED on disconnect/logout
 */
const usernameToEmail = new Map<string, string>();

/**
 * In-memory socket to email mapping
 * Used for quick lookup when socket disconnects
 * Structure: socketId -> email
 */
const socketToEmail = new Map<string, string>();

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function validateDateOfBirth(dateOfBirth: string): void {
  const parsed = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (!dateOfBirth || Number.isNaN(parsed.getTime()) || parsed > new Date()) {
    throw new Error('Enter a valid date of birth');
  }

  const today = new Date();
  let age = today.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - parsed.getUTCMonth();
  const dayDelta = today.getUTCDate() - parsed.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  if (age < 18) {
    throw new Error('You must be at least 18 years old to use Memory Chat');
  }
}

function validateUsername(username: string): void {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error('Username must be 3-20 characters using letters, numbers, or underscores');
  }

  if (RESERVED_OR_OFFENSIVE_WORDS.some(word => username.includes(word))) {
    throw new Error('Choose a different username');
  }

  if (usernameToEmail.has(username)) {
    throw new Error('That username is already active');
  }
}

function validateGender(gender: unknown): asserts gender is PublicUserProfile['gender'] {
  if (gender !== 'male' && gender !== 'female') {
    throw new Error('Select male or female');
  }
}

function generateUsername(): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const word = USERNAME_WORDS[Math.floor(Math.random() * USERNAME_WORDS.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${word}_${suffix}`;
    if (!usernameToEmail.has(candidate) && !RESERVED_OR_OFFENSIVE_WORDS.some(word => candidate.includes(word))) {
      return candidate;
    }
  }

  return `nova_${Date.now().toString(36).slice(-8)}`;
}

/**
 * Initialize Socket.io event handlers
 */
export function initializeSocketEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`New socket connection: ${socket.id}`);

    /**
     * AUTHENTICATE
     * Verifies Google token and registers user as online
     */
    socket.on('authenticate', async (data: AuthPayload, callback) => {
      try {
        validateDateOfBirth(data.dateOfBirth || '');
        validateGender(data.gender);
        const identity = await verifyGoogleToken(data.idToken);
        const currentEmailForSocket = socketToEmail.get(socket.id);

        const existingSocketIdForEmail = emailToSocket.get(identity.email);
        if (
          existingSocketIdForEmail &&
          existingSocketIdForEmail !== socket.id &&
          io.sockets.sockets.has(existingSocketIdForEmail)
        ) {
          throw new Error('This Google account is already active in another session');
        }

        if (currentEmailForSocket) {
          const previous = onlineUsers.get(currentEmailForSocket);
          if (previous) {
            usernameToEmail.delete(previous.username);
          }
          onlineUsers.delete(currentEmailForSocket);
          emailToSocket.delete(currentEmailForSocket);
          socketToEmail.delete(socket.id);
        }

        const existingForEmail = onlineUsers.get(identity.email);
        if (
          existingForEmail &&
          existingForEmail.socketId !== socket.id &&
          io.sockets.sockets.has(existingForEmail.socketId)
        ) {
          throw new Error('This Google account is already active in another session');
        }

        if (existingForEmail) {
          usernameToEmail.delete(existingForEmail.username);
          onlineUsers.delete(identity.email);
          emailToSocket.delete(identity.email);
        }

        const requestedUsername = data.username ? normalizeUsername(data.username) : '';
        const username = requestedUsername || generateUsername();
        const currentOwner = usernameToEmail.get(username);
        if (currentOwner && currentOwner === identity.email) {
          usernameToEmail.delete(username);
        }
        validateUsername(username);

        const publicProfile: PublicUserProfile = {
          id: username,
          username,
          gender: data.gender
        };

        // Register user as online (RAM only)
        const onlineUser: OnlineUser = {
          email: identity.email,
          username,
          socketId: socket.id,
          profile: publicProfile,
          connectedAt: Date.now()
        };

        onlineUsers.set(identity.email, onlineUser);
        emailToSocket.set(identity.email, socket.id);
        usernameToEmail.set(username, identity.email);
        socketToEmail.set(socket.id, identity.email);

        // Join user to personal room for direct messages
        socket.join(`user:${username}`);

        console.log(`Authenticated username: ${username}`);

        // Acknowledge authentication
        callback({
          success: true,
          profile: publicProfile,
          onlineUsers: Array.from(onlineUsers.values()).map(u => u.profile)
        });

        // Broadcast updated online users to all clients
        io.emit('online-users-updated', {
          users: Array.from(onlineUsers.values()).map(u => u.profile)
        });
      } catch (error) {
        console.error('Authentication failed:', error instanceof Error ? error.message : String(error));
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed'
        });
      }
    });

    /**
     * SEND MESSAGE
     * Relay message to recipient immediately
     * Message is NOT stored - only transmitted
     */
    socket.on('send-message', (payload: SendMessagePayload) => {
      try {
        const senderEmail = socketToEmail.get(socket.id);
        if (!senderEmail) {
          console.error('Send message: sender not authenticated');
          return;
        }

        const sender = onlineUsers.get(senderEmail);
        if (!sender) {
          console.error('Send message: sender profile not found');
          return;
        }

        // Create message object (exists only during transmission)
        const message: Message = {
          id: randomUUID(),
          from: sender.profile,
          to: payload.recipientId,
          content: payload.content,
          timestamp: Date.now(),
          delivered: false
        };

        // Get recipient socket
        const recipientEmail = usernameToEmail.get(payload.recipientId);
        const recipient = recipientEmail ? onlineUsers.get(recipientEmail) : null;

        if (recipient) {
          // Recipient is online - deliver immediately
          message.delivered = true;
          io.to(`user:${payload.recipientId}`).emit('receive-message', {
            message,
            senderId: sender.username
          });
          console.log(`Message relayed: ${sender.username} -> ${payload.recipientId}`);
        } else {
          // Recipient is offline - message is discarded
          console.log(`Message dropped: recipient ${payload.recipientId} offline`);
          socket.emit('message-failed', {
            recipientId: payload.recipientId,
            reason: 'Recipient is offline'
          });
        }

        // Acknowledge sender (message sent, not necessarily delivered)
        socket.emit('message-sent', {
          messageId: message.id,
          delivered: message.delivered
        });

        // IMPORTANT: Message object goes out of scope and is garbage collected
        // No persistence occurs
      } catch (error) {
        console.error('Send message error:', error instanceof Error ? error.message : String(error));
        socket.emit('message-error', {
          error: 'Failed to send message'
        });
      }
    });

    /**
     * TYPING
     * Ephemeral typing signal. It is relayed only to the live recipient.
     */
    socket.on('typing', (payload: { recipientId: string; isTyping: boolean }) => {
      const senderEmail = socketToEmail.get(socket.id);
      if (!senderEmail) return;

      const sender = onlineUsers.get(senderEmail);
      const recipientEmail = usernameToEmail.get(payload.recipientId);
      const recipient = recipientEmail ? onlineUsers.get(recipientEmail) : null;
      if (!sender || !recipient) return;

      io.to(`user:${payload.recipientId}`).emit('typing-updated', {
        senderId: sender.username,
        isTyping: payload.isTyping
      });
    });

    /**
     * DISCONNECT
     * Clean up user data from memory
     * All user data is immediately wiped
     */
    socket.on('disconnect', () => {
      const email = socketToEmail.get(socket.id);

      if (email) {
        const user = onlineUsers.get(email);
        if (user && user.socketId === socket.id) {
          usernameToEmail.delete(user.username);
          onlineUsers.delete(email);
          emailToSocket.delete(email);
        }
        socketToEmail.delete(socket.id);
        console.log(`User disconnected`);

        // Broadcast updated online users to all remaining clients
        io.emit('online-users-updated', {
          users: Array.from(onlineUsers.values()).map(u => u.profile)
        });
      }
    });

    /**
     * GET ONLINE USERS
     * Returns currently online users
     */
    socket.on('get-online-users', (callback) => {
      try {
        const users = Array.from(onlineUsers.values()).map(u => u.profile);
        callback({
          success: true,
          users
        });
      } catch (error) {
        callback({
          success: false,
          error: 'Failed to fetch online users'
        });
      }
    });

    /**
     * LOGOUT
     * Explicit logout - removes user and broadcasts update
     */
    socket.on('logout', () => {
      const email = socketToEmail.get(socket.id);
      if (email) {
        const user = onlineUsers.get(email);
        if (user && user.socketId === socket.id) {
          usernameToEmail.delete(user.username);
          onlineUsers.delete(email);
          emailToSocket.delete(email);
        }
        socketToEmail.delete(socket.id);
        console.log(`User logged out`);

        // Broadcast updated online users
        io.emit('online-users-updated', {
          users: Array.from(onlineUsers.values()).map(u => u.profile)
        });
      }

      socket.disconnect(true);
    });
  });
}

/**
 * Get online users count (for monitoring)
 */
export function getOnlineUsersCount(): number {
  return onlineUsers.size;
}

/**
 * Get all online users (for monitoring)
 */
export function getAllOnlineUsers(): PublicUserProfile[] {
  return Array.from(onlineUsers.values()).map(u => u.profile);
}

/**
 * Clear all RAM-only socket identity maps.
 * Called during process shutdown so active session state is explicitly wiped.
 */
export function clearOnlineUsers(): void {
  onlineUsers.clear();
  emailToSocket.clear();
  usernameToEmail.clear();
  socketToEmail.clear();
}
