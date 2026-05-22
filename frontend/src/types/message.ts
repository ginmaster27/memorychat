import { UserProfile } from './user';

export interface Message {
  id: string;
  from: UserProfile;
  to: string;
  content: string;
  kind?: 'text' | 'image';
  media?: {
    id: string;
    thumbnail: string;
    expiresAt: number;
    mediaUrl: string;
  };
  timestamp: number;
  delivered: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
}
