import { io, Socket } from 'socket.io-client';
import { Message, UserProfile } from '../types';

let socket: Socket | null = null;

export function initializeSocket(backendUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket = io(backendUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
}

export function authenticateSocket(
  idToken: string,
  dateOfBirth: string,
  username?: string,
  gender?: UserProfile['gender'],
): Promise<{
  profile: UserProfile;
  onlineUsers: UserProfile[];
}> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('authenticate', { idToken, dateOfBirth, username, gender }, (response: any) => {
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
}

export function sendSocketMessage(
  recipientId: string,
  content: string,
): Promise<{ messageId: string; delivered: boolean }> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('send-message', { recipientId, content });
    socket.once('message-sent', resolve);
    socket.once('message-failed', (response) => {
      reject(new Error(response.reason || 'Message was not delivered'));
    });
    socket.once('message-error', (response) => {
      reject(new Error(response.error || 'Failed to send message'));
    });
  });
}

export function onReceiveMessage(
  callback: (message: Message, senderId: string) => void,
): () => void {
  if (!socket) return () => {};

  const listener = (response: any) => {
    callback(response.message, response.senderId);
  };

  socket.on('receive-message', listener);
  return () => socket?.off('receive-message', listener);
}

export function onOnlineUsersUpdated(callback: (users: UserProfile[]) => void): () => void {
  if (!socket) return () => {};

  const listener = (response: any) => callback(response.users);
  socket.on('online-users-updated', listener);
  return () => socket?.off('online-users-updated', listener);
}

export function emitTyping(recipientId: string, isTyping: boolean): void {
  socket?.emit('typing', { recipientId, isTyping });
}

export function onTypingUpdated(
  callback: (senderId: string, isTyping: boolean) => void,
): () => void {
  if (!socket) return () => {};

  const listener = (response: any) => callback(response.senderId, response.isTyping);
  socket.on('typing-updated', listener);
  return () => socket?.off('typing-updated', listener);
}

export function getOnlineUsers(): Promise<UserProfile[]> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('get-online-users', (response: any) => {
      if (response.success) {
        resolve(response.users);
      } else {
        reject(new Error(response.error || 'Failed to fetch online users'));
      }
    });
  });
}

export function logoutSocket(): void {
  if (socket) {
    socket.emit('logout');
    socket.disconnect();
    socket = null;
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
