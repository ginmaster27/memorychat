import { useEffect } from 'react';
import { router } from 'expo-router';
import { disconnectSocket, subscribeToAccountBanned, subscribeToMessages, subscribeToOnlineUsers, subscribeToTyping } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

/**
 * Keeps live Socket.io subscriptions attached while the authenticated Expo app is mounted.
 * Messages still only enter Zustand memory and are wiped by logout, close chat, or app restart.
 */
export function useSocketRuntime() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const addMessage = useChatStore((state) => state.addMessage);
  const clearAllConversations = useChatStore((state) => state.clearAllConversations);
  const startConversation = useChatStore((state) => state.startConversation);
  const setOnlineUsers = useChatStore((state) => state.setOnlineUsers);
  const setParticipantTyping = useChatStore((state) => state.setParticipantTyping);
  const getConversationByParticipant = useChatStore((state) => state.getConversationByParticipant);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const stopUsers = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users.filter((item) => item.id !== currentUserId));
    });

    const stopMessages = subscribeToMessages((message, senderId) => {
      const existing = getConversationByParticipant(senderId);
      const conversationId = existing?.id || startConversation(message.from);
      addMessage(conversationId, { ...message, status: 'delivered' }, false);
    });

    const stopTyping = subscribeToTyping(setParticipantTyping);
    const stopBanned = subscribeToAccountBanned(() => {
      disconnectSocket();
      clearAllConversations();
      clearAuth();
      router.replace('/login');
    });

    return () => {
      stopUsers();
      stopMessages();
      stopTyping();
      stopBanned();
    };
  }, [
    addMessage,
    clearAllConversations,
    clearAuth,
    currentUserId,
    getConversationByParticipant,
    isAuthenticated,
    setOnlineUsers,
    setParticipantTyping,
    startConversation,
  ]);
}
