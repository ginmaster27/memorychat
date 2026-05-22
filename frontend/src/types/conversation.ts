import { Message } from './message';
import { UserProfile } from './user';

export interface Conversation {
  id: string;
  participantId: string;
  participantProfile: UserProfile;
  createdAt: number;
  lastMessageAt: number | null;
  unreadCount: number;
  isParticipantOnline: boolean;
  isParticipantTyping: boolean;
}

export type MessagesByConversationId = Record<string, Message[]>;

export interface ModerationMetadata {
  warningCount: number;
  lastModerationCategories: string[];
  lastModerationScore: number;
}

export type ModerationByConversationId = Record<string, ModerationMetadata>;
