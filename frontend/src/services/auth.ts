import * as WebBrowser from 'expo-web-browser';
import { disconnectSocket } from './socket';
import { clearSessionSnapshot } from './sessionSnapshot';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

WebBrowser.maybeCompleteAuthSession();

export function logout() {
  clearSessionSnapshot();
  disconnectSocket();
  useChatStore.getState().clearAllConversations();
  useAuthStore.getState().clearAuth();
}
