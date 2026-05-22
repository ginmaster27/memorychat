import { io, Socket } from 'socket.io-client';
import { Message } from '../types/message';
import { AuthPayload, UserProfile } from '../types/user';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function connectSocket(payload: AuthPayload): Promise<{
  profile: UserProfile;
  onlineUsers: UserProfile[];
}> {
  return new Promise((resolve, reject) => {
    socket?.disconnect();
    socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.once('connect', () => {
      socket?.emit('authenticate', payload, (response: any) => {
        if (response.success) {
          resolve({
            profile: response.profile,
            onlineUsers: response.onlineUsers,
          });
        } else {
          reject(new Error(response.error || 'Authentication failed'));
        }
      });
    });

    socket.once('connect_error', reject);
  });
}

export function disconnectSocket() {
  socket?.emit('logout');
  socket?.disconnect();
  socket = null;
}

export function sendMessage(payload: { recipientId: string; content: string }): Promise<{
  messageId: string;
  delivered: boolean;
}> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('send-message', payload);
    socket.once('message-sent', resolve);
    socket.once('message-failed', (response) => reject(new Error(response.reason || 'Message failed')));
    socket.once('message-error', (response) => reject(new Error(response.error || 'Message failed')));
  });
}

export function sendMediaMessage(payload: {
  recipientId: string;
  media: {
    id: string;
    thumbnail: string;
    expiresAt: number;
    mediaUrl: string;
  };
}): Promise<{
  messageId: string;
  delivered: boolean;
}> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('send-media-message', payload);
    socket.once('message-sent', resolve);
    socket.once('message-failed', (response) => reject(new Error(response.reason || 'Media failed')));
    socket.once('message-error', (response) => reject(new Error(response.error || 'Media failed')));
  });
}

export function emitTyping(recipientId: string, isTyping: boolean) {
  socket?.emit('typing', { recipientId, isTyping });
}

export function reportUser(payload: {
  reportedUserId: string;
  reason: 'illegal_content' | 'harassment_or_abuse' | 'spam_or_scam' | 'other_abuse';
}): Promise<{ actionTaken: boolean }> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('report-user', payload, (response: any) => {
      if (response.success) {
        resolve({ actionTaken: Boolean(response.actionTaken) });
      } else {
        reject(new Error(response.error || 'Failed to submit report'));
      }
    });
  });
}

export function subscribeToMessages(callback: (message: Message, senderId: string) => void) {
  if (!socket) return () => {};
  const listener = (response: any) => callback(response.message, response.senderId);
  socket.on('receive-message', listener);
  return () => socket?.off('receive-message', listener);
}

export function subscribeToOnlineUsers(callback: (users: UserProfile[]) => void) {
  if (!socket) return () => {};
  const listener = (response: any) => callback(response.users);
  socket.on('online-users-updated', listener);
  socket.emit('get-online-users', (response: any) => {
    if (response.success) callback(response.users);
  });
  return () => socket?.off('online-users-updated', listener);
}

export function subscribeToTyping(callback: (senderId: string, isTyping: boolean) => void) {
  if (!socket) return () => {};
  const listener = (response: any) => callback(response.senderId, response.isTyping);
  socket.on('typing-updated', listener);
  return () => socket?.off('typing-updated', listener);
}

export function subscribeToAccountBanned(callback: (reason: string) => void) {
  if (!socket) return () => {};
  const listener = (response: any) => callback(response.reason || 'Access to Vibly is unavailable.');
  socket.on('account-banned', listener);
  return () => socket?.off('account-banned', listener);
}
