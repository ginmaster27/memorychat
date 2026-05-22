import { useEffect } from 'react';
import { connectSocket } from '../services/socket';
import { clearSessionSnapshot, loadSessionSnapshot } from '../services/sessionSnapshot';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

export function useSessionRestore() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const setSessionChecked = useAuthStore((state) => state.setSessionChecked);
  const setOnlineUsers = useChatStore((state) => state.setOnlineUsers);
  const clearAllConversations = useChatStore((state) => state.clearAllConversations);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (isAuthenticated) {
        setSessionChecked(true);
        return;
      }

      const snapshot = loadSessionSnapshot();
      if (!snapshot) {
        setSessionChecked(true);
        return;
      }

      try {
        const { profile, onlineUsers } = await connectSocket(snapshot.payload);
        if (cancelled) return;
        setSession(profile, snapshot.payload.idToken);
        setOnlineUsers(onlineUsers.filter((user) => user.id !== profile.id));
      } catch {
        if (cancelled) return;
        clearSessionSnapshot();
        clearAllConversations();
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [clearAllConversations, isAuthenticated, setOnlineUsers, setSession, setSessionChecked]);
}
