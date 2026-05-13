export interface UserProfile {
  id: string;
  username: string;
  gender: 'male' | 'female';
}

export interface Message {
  id: string;
  from: UserProfile;
  to: string;
  content: string;
  timestamp: number;
  delivered: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
}

export interface ConversationSession {
  id: string;
  participantId: string;
  participantProfile: UserProfile;
  messages: Message[];
  createdAt: number;
  lastMessageAt: number | null;
  unreadCount: number;
  isParticipantOnline: boolean;
  isParticipantTyping: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  idToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface PendingGoogleAuth {
  idToken: string;
}
