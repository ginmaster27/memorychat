import { create } from 'zustand';
import { clearMediaCache } from '../services/cache/mediaCache';
import { Conversation, MessagesByConversationId, ModerationByConversationId } from '../types/conversation';
import { Message } from '../types/message';
import { UserProfile } from '../types/user';

function makeConversationId(participantId: string) {
  return `conversation:${participantId}`;
}

interface ChatState {
  activeConversations: Conversation[];
  selectedConversationId: string | null;
  messagesByConversationId: MessagesByConversationId;
  moderationByConversationId: ModerationByConversationId;
  onlineUsers: UserProfile[];
  startConversation: (user: UserProfile) => string;
  selectConversation: (conversationId: string) => void;
  closeConversation: (conversationId: string) => void;
  addMessage: (conversationId: string, message: Message, isRead?: boolean) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<Message>) => void;
  clearConversation: (conversationId: string) => void;
  clearAllConversations: () => void;
  setOnlineUsers: (users: UserProfile[]) => void;
  setParticipantTyping: (participantId: string, isTyping: boolean) => void;
  markConversationRead: (conversationId: string) => void;
  recordModerationWarning: (conversationId: string, categories: string[], score: number) => void;
  recordModerationBlock: (conversationId: string, categories: string[], score: number) => void;
  getConversationByParticipant: (participantId: string) => Conversation | undefined;
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversations: [],
  selectedConversationId: null,
  messagesByConversationId: {},
  moderationByConversationId: {},
  onlineUsers: [],
  startConversation: (user) => {
    const existing = get().activeConversations.find((item) => item.participantId === user.id);
    if (existing) {
      set({ selectedConversationId: existing.id });
      return existing.id;
    }

    const id = makeConversationId(user.id);
    const onlineIds = new Set(get().onlineUsers.map((onlineUser) => onlineUser.id));
    const conversation: Conversation = {
      id,
      participantId: user.id,
      participantProfile: user,
      createdAt: Date.now(),
      lastMessageAt: null,
      unreadCount: 0,
      isParticipantOnline: onlineIds.has(user.id),
      isParticipantTyping: false,
    };

    set((state) => ({
      activeConversations: [...state.activeConversations, conversation],
      selectedConversationId: id,
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [id]: state.messagesByConversationId[id] || [],
      },
      moderationByConversationId: {
        ...state.moderationByConversationId,
        [id]: state.moderationByConversationId[id] || {
          warningCount: 0,
          lastModerationCategories: [],
          lastModerationScore: 0,
        },
      },
    }));

    return id;
  },
  selectConversation: (conversationId) =>
    set((state) => ({
      selectedConversationId: conversationId,
      activeConversations: state.activeConversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    })),
  closeConversation: (conversationId) =>
    set((state) => {
      clearMediaCache();
      const nextMessages = { ...state.messagesByConversationId };
      const nextModeration = { ...state.moderationByConversationId };
      delete nextMessages[conversationId];
      delete nextModeration[conversationId];
      return {
        activeConversations: state.activeConversations.filter((conversation) => conversation.id !== conversationId),
        selectedConversationId:
          state.selectedConversationId === conversationId ? null : state.selectedConversationId,
        messagesByConversationId: nextMessages,
        moderationByConversationId: nextModeration,
      };
    }),
  addMessage: (conversationId, message, isRead = false) =>
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: [...(state.messagesByConversationId[conversationId] || []), message],
      },
      activeConversations: state.activeConversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastMessageAt: Date.now(),
              unreadCount: isRead ? conversation.unreadCount : conversation.unreadCount + 1,
              isParticipantTyping: false,
            }
          : conversation,
      ),
    })),
  updateMessage: (conversationId, messageId, patch) =>
    set((state) => ({
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: (state.messagesByConversationId[conversationId] || []).map((message) =>
          message.id === messageId ? { ...message, ...patch } : message,
        ),
      },
    })),
  clearConversation: (conversationId) => get().closeConversation(conversationId),
  clearAllConversations: () =>
    {
      clearMediaCache();
      set({
      activeConversations: [],
      selectedConversationId: null,
      messagesByConversationId: {},
      moderationByConversationId: {},
      onlineUsers: [],
      });
    },
  setOnlineUsers: (users) =>
    set((state) => {
      const onlineIds = new Set(users.map((user) => user.id));
      return {
        onlineUsers: users,
        activeConversations: state.activeConversations.map((conversation) => ({
          ...conversation,
          isParticipantOnline: onlineIds.has(conversation.participantId),
          isParticipantTyping: onlineIds.has(conversation.participantId)
            ? conversation.isParticipantTyping
            : false,
        })),
      };
    }),
  setParticipantTyping: (participantId, isTyping) =>
    set((state) => ({
      activeConversations: state.activeConversations.map((conversation) =>
        conversation.participantId === participantId ? { ...conversation, isParticipantTyping: isTyping } : conversation,
      ),
    })),
  markConversationRead: (conversationId) =>
    set((state) => {
      const conversation = state.activeConversations.find((item) => item.id === conversationId);
      if (!conversation || conversation.unreadCount === 0) return state;

      return {
        activeConversations: state.activeConversations.map((item) =>
          item.id === conversationId ? { ...item, unreadCount: 0 } : item,
        ),
      };
    }),
  recordModerationWarning: (conversationId, categories, score) =>
    set((state) => {
      const current = state.moderationByConversationId[conversationId] || {
        warningCount: 0,
        lastModerationCategories: [],
        lastModerationScore: 0,
      };

      return {
        moderationByConversationId: {
          ...state.moderationByConversationId,
          [conversationId]: {
            warningCount: current.warningCount + 1,
            lastModerationCategories: categories,
            lastModerationScore: score,
          },
        },
      };
    }),
  recordModerationBlock: (conversationId, categories, score) =>
    set((state) => {
      const current = state.moderationByConversationId[conversationId] || {
        warningCount: 0,
        lastModerationCategories: [],
        lastModerationScore: 0,
      };

      return {
        moderationByConversationId: {
          ...state.moderationByConversationId,
          [conversationId]: {
            warningCount: current.warningCount,
            lastModerationCategories: categories,
            lastModerationScore: score,
          },
        },
      };
    }),
  getConversationByParticipant: (participantId) =>
    get().activeConversations.find((conversation) => conversation.participantId === participantId),
}));
