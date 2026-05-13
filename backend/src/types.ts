/**
 * Types for the Message Chat Backend
 * All data structures designed for RAM-only operation
 */

export interface GoogleIdentity {
  email: string;
  name: string;
  profileImage: string | null;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  gender: 'male' | 'female';
}

/**
 * Online user tracking - exists only in RAM
 * Maintains mapping of user email to active socket connections
 */
export interface OnlineUser {
  email: string;
  username: string;
  socketId: string;
  profile: PublicUserProfile;
  connectedAt: number;
}

/**
 * Message payload for real-time transmission
 * Messages are relayed only during active session
 * Never persisted to storage
 */
export interface Message {
  id: string;
  from: PublicUserProfile;
  to: string; // recipient username
  content: string;
  timestamp: number;
  delivered: boolean;
}

/**
 * Socket event payloads
 */
export interface AuthPayload {
  idToken: string;
  dateOfBirth: string;
  username?: string;
  gender?: 'male' | 'female';
}

export interface SendMessagePayload {
  recipientId: string;
  content: string;
}

export interface ReceiveMessagePayload {
  message: Message;
  senderId: string;
}
