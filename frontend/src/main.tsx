import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {
  authenticateSocket,
  disconnectSocket,
  getOnlineUsers,
  initializeSocket,
  logoutSocket,
  emitTyping,
  onOnlineUsersUpdated,
  onReceiveMessage,
  onTypingUpdated,
  sendSocketMessage,
} from './services/socket';
import { AuthState, ConversationSession, Message, PendingGoogleAuth, UserProfile } from './types';
import './styles.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SESSION_KEY = 'memory-chat-tab-session';
const USERNAME_WORDS = [
  'river',
  'cedar',
  'ember',
  'atlas',
  'nova',
  'harbor',
  'meadow',
  'summit',
  'willow',
  'orbit',
  'maple',
  'lumen',
  'prairie',
  'cobalt',
  'saffron',
  'quartz',
  'aurora',
  'haven',
  'solace',
  'marble',
];

const BLOCKED_USERNAME_WORDS = [
  'admin',
  'administrator',
  'moderator',
  'support',
  'system',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'retard',
];

type Gender = UserProfile['gender'];

interface StoredSession {
  auth: AuthState;
  dateOfBirth: string;
  conversations: ConversationSession[];
  selectedConversationId: string | null;
}

function makeEphemeralId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLatestAdultDob() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return formatDateInput(date);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function makeDefaultUsername() {
  const word = USERNAME_WORDS[Math.floor(Math.random() * USERNAME_WORDS.length)];
  return `${word}_${Math.floor(1000 + Math.random() * 9000)}`;
}

function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return 'Username must be 3-20 characters using letters, numbers, or underscores.';
  }

  if (BLOCKED_USERNAME_WORDS.some((word) => username.includes(word))) {
    return 'Choose a different username.';
  }

  return null;
}

function validateAdultDateOfBirth(dateOfBirth: string) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (!dateOfBirth || Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
    return 'Enter a valid date of birth.';
  }

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();
  const dayDelta = today.getUTCDate() - birthDate.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age >= 18 ? null : 'You must be at least 18 years old to use Memory Chat.';
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function hydrateConversations(conversations: ConversationSession[]) {
  return conversations.map((conversation) => ({
    ...conversation,
    unreadCount: conversation.unreadCount || 0,
    isParticipantOnline: Boolean(conversation.isParticipantOnline),
    isParticipantTyping: false,
  }));
}

function App() {
  const storedSession = useMemo(() => readStoredSession(), []);
  const latestAdultDob = useMemo(() => getLatestAdultDob(), []);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [auth, setAuth] = useState<AuthState>(
    storedSession?.auth.isAuthenticated
      ? {
          isAuthenticated: false,
          user: null,
          idToken: storedSession.auth.idToken,
          isLoading: true,
          error: null,
        }
      : {
      isAuthenticated: false,
      user: null,
      idToken: null,
      isLoading: false,
      error: null,
        },
  );
  const [dateOfBirth, setDateOfBirth] = useState(storedSession?.dateOfBirth || latestAdultDob);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<PendingGoogleAuth | null>(null);
  const [username, setUsername] = useState(storedSession?.auth.user?.username || makeDefaultUsername());
  const [gender, setGender] = useState<Gender>(storedSession?.auth.user?.gender || 'male');
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<ConversationSession[]>(
    hydrateConversations(storedSession?.conversations || []),
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    storedSession?.selectedConversationId || null,
  );
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const restoreAttempted = useRef(false);
  const typingTimeout = useRef<number | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const publicUserId = auth.user?.id;

  const clearSessionState = useCallback(() => {
    setConversations([]);
    setSelectedConversationId(null);
    setOnlineUsers([]);
    setDraft('');
    setSendError(null);
    window.sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const persistSession = useCallback(() => {
    if (!auth.isAuthenticated || !auth.user || !auth.idToken) return;

    const snapshot: StoredSession = {
      auth,
      dateOfBirth,
      conversations,
      selectedConversationId,
    };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  }, [auth, conversations, dateOfBirth, selectedConversationId]);

  useEffect(() => {
    persistSession();
  }, [persistSession]);

  useEffect(() => {
    if (!selectedConversationId) return;
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === selectedConversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  }, [selectedConversationId]);

  const authenticate = useCallback(
    async (idToken: string, dob: string, requestedUsername: string, restore = false) => {
      setAuth((previous) => ({ ...previous, isLoading: true, error: null }));
      setOnboardingError(null);

      try {
        await initializeSocket(BACKEND_URL);
        const { profile, onlineUsers: initialOnlineUsers } = await authenticateSocket(
          idToken,
          dob,
          normalizeUsername(requestedUsername),
          gender,
        );

        setAuth({
          isAuthenticated: true,
          user: profile,
          idToken,
          isLoading: false,
          error: null,
        });
        setUsername(profile.username);
        setGender(profile.gender);
        setDateOfBirth(dob);
        setPendingGoogleAuth(null);
        const filteredUsers = initialOnlineUsers.filter((user) => user.id !== profile.id);
        setOnlineUsers(filteredUsers);
        setConversations((previous) => syncConversationPresence(previous, filteredUsers));
      } catch (error) {
        disconnectSocket();
        const message = error instanceof Error ? error.message : 'Authentication failed';
        if (restore) {
          clearSessionState();
          setAuth({ isAuthenticated: false, user: null, idToken: null, isLoading: false, error: message });
        } else {
          setAuth((previous) => ({ ...previous, isLoading: false }));
          setOnboardingError(message);
        }
      }
    },
    [clearSessionState, gender],
  );

  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;

    if (storedSession?.auth.isAuthenticated && storedSession.auth.idToken && storedSession.auth.user) {
      void authenticate(storedSession.auth.idToken, storedSession.dateOfBirth, storedSession.auth.user.username, true);
    }
  }, [authenticate, storedSession]);

  const logout = useCallback(() => {
    logoutSocket();
    clearSessionState();
    setDateOfBirth('');
    setPendingGoogleAuth(null);
    setUsername(makeDefaultUsername());
    setGender('male');
    setAuth({
      isAuthenticated: false,
      user: null,
      idToken: null,
      isLoading: false,
      error: null,
    });
  }, [clearSessionState]);

  useEffect(() => {
    if (!auth.user) return;

    const stopMessages = onReceiveMessage((message, senderId) => {
      setConversations((previous) => {
        const existing = previous.find((conversation) => conversation.participantId === senderId);
        const isSelected = existing?.id === selectedConversationId;

        if (existing) {
          return previous.map((conversation) =>
            conversation.id === existing.id
              ? {
                  ...conversation,
                  messages: [...conversation.messages, { ...message, status: 'delivered' }],
                  lastMessageAt: Date.now(),
                  unreadCount: isSelected ? 0 : conversation.unreadCount + 1,
                  isParticipantTyping: false,
                }
              : conversation,
          );
        }

        return [
          ...previous,
          {
            id: makeEphemeralId('conversation'),
            participantId: senderId,
            participantProfile: message.from,
            messages: [{ ...message, status: 'delivered' }],
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
            unreadCount: 1,
            isParticipantOnline: true,
            isParticipantTyping: false,
          },
        ];
      });
    });

    const stopOnlineUsers = onOnlineUsersUpdated((users) => {
      const filteredUsers = users.filter((user) => user.id !== publicUserId);
      setOnlineUsers(filteredUsers);
      setConversations((previous) => syncConversationPresence(previous, filteredUsers));
    });

    const stopTyping = onTypingUpdated((senderId, isTyping) => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.participantId === senderId
            ? { ...conversation, isParticipantTyping: isTyping }
            : conversation,
        ),
      );
    });

    getOnlineUsers()
      .then((users) => {
        const filteredUsers = users.filter((user) => user.id !== publicUserId);
        setOnlineUsers(filteredUsers);
        setConversations((previous) => syncConversationPresence(previous, filteredUsers));
      })
      .catch(() => undefined);

    return () => {
      stopMessages();
      stopOnlineUsers();
      stopTyping();
    };
  }, [auth.user, publicUserId, selectedConversationId]);

  useEffect(() => {
    const disconnectOnExit = () => disconnectSocket();
    window.addEventListener('beforeunload', disconnectOnExit);
    return () => {
      window.removeEventListener('beforeunload', disconnectOnExit);
      disconnectOnExit();
    };
  }, []);

  const startConversation = (participant: UserProfile) => {
    setConversations((previous) => {
      const existing = previous.find((conversation) => conversation.participantId === participant.id);

      if (existing) {
        setSelectedConversationId(existing.id);
        return previous;
      }

      const conversation: ConversationSession = {
        id: makeEphemeralId('conversation'),
        participantId: participant.id,
        participantProfile: participant,
        messages: [],
        createdAt: Date.now(),
        lastMessageAt: null,
        unreadCount: 0,
        isParticipantOnline: onlineUsers.some((user) => user.id === participant.id),
        isParticipantTyping: false,
      };

      setSelectedConversationId(conversation.id);
      setIsMenuOpen(false);
      return [...previous, conversation];
    });
  };

  const selectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsMenuOpen(false);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  };

  const closeConversation = (conversationId: string) => {
    setConversations((previous) => previous.filter((conversation) => conversation.id !== conversationId));
    setSelectedConversationId((previous) => (previous === conversationId ? null : previous));
  };

  const updateDraft = (value: string) => {
    setDraft(value);
    if (!selectedConversation) return;

    emitTyping(selectedConversation.participantId, value.trim().length > 0);
    if (typingTimeout.current) {
      window.clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = window.setTimeout(() => {
      emitTyping(selectedConversation.participantId, false);
    }, 1200);
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !selectedConversation || !auth.user) return;

    const messageId = makeEphemeralId('message');
    const localMessage: Message = {
      id: messageId,
      from: auth.user,
      to: selectedConversation.participantId,
      content,
      timestamp: Date.now(),
      delivered: false,
      status: 'sending',
    };

    setDraft('');
    emitTyping(selectedConversation.participantId, false);
    setSendError(null);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              messages: [...conversation.messages, localMessage],
              lastMessageAt: Date.now(),
            }
          : conversation,
      ),
    );

    try {
      const { delivered } = await sendSocketMessage(selectedConversation.participantId, content);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId
                    ? { ...message, delivered, status: delivered ? 'delivered' : 'sent' }
                    : message,
                ),
              }
            : conversation,
        ),
      );
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Message failed');
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId ? { ...message, status: 'failed' } : message,
                ),
              }
            : conversation,
        ),
      );
    }
  };

  const submitOnboarding = (event: React.FormEvent) => {
    event.preventDefault();
    const dobError = validateAdultDateOfBirth(dateOfBirth);
    const usernameError = validateUsername(username);
    const idToken = pendingGoogleAuth?.idToken || auth.idToken;

    if (dobError || usernameError) {
      setOnboardingError(dobError || usernameError);
      return;
    }

    if (!idToken) {
      setOnboardingError('Google login is required first.');
      return;
    }

    void authenticate(idToken, dateOfBirth, username);
  };

  if (showInstallGuide) {
    return (
      <Shell>
        <InstallGuide onBack={() => setShowInstallGuide(false)} />
      </Shell>
    );
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <Shell>
        <section className="login-panel">
          <h1>Memory Chat</h1>
          <p>Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> to enable Google login.</p>
          <button className="secondary-button" onClick={() => setShowInstallGuide(true)} type="button">
            View install guide
          </button>
        </section>
      </Shell>
    );
  }

  if (!auth.isAuthenticated && !pendingGoogleAuth) {
    if (auth.isLoading) {
      return (
        <Shell>
          <section className="login-panel">
            <h1>Memory Chat</h1>
            <p className="lede">Restoring your active session...</p>
          </section>
        </Shell>
      );
    }

    return (
      <Shell>
        <section className="login-panel">
          <div>
            <p className="eyebrow">Privacy-first web chat</p>
            <h1>Memory Chat</h1>
            <p className="lede">A live private room, not a message archive.</p>
          </div>
          <PrivacyBanner />
          <button className="guide-link" onClick={() => setShowInstallGuide(true)} type="button">
            Install and environment guide
          </button>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                setPendingGoogleAuth({ idToken: credentialResponse.credential });
                setUsername(makeDefaultUsername());
                setOnboardingError(null);
              }
            }}
            onError={() => {
              setAuth((previous) => ({ ...previous, error: 'Google login failed' }));
            }}
            useOneTap={false}
          />
          {auth.error ? <p className="error">{auth.error}</p> : null}
        </section>
      </Shell>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Shell>
        <section className="login-panel">
          <div>
            <p className="eyebrow">One last private setup step</p>
            <h1>Choose your public identity</h1>
            <p className="lede">Other users will only see your username.</p>
          </div>
          <form className="onboarding-form" onSubmit={submitOnboarding}>
            <label>
              Legal date of birth
              <input
                type="date"
                value={dateOfBirth}
                max={latestAdultDob}
                onChange={(event) => setDateOfBirth(event.target.value)}
                required
              />
            </label>
            <label>
              Username
              <input
                value={username}
                maxLength={20}
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                placeholder="river_1234"
                required
              />
            </label>
            <fieldset className="radio-group">
              <legend>Gender</legend>
              <label>
                <input
                  checked={gender === 'male'}
                  name="gender"
                  onChange={() => setGender('male')}
                  type="radio"
                  value="male"
                />
                Male
              </label>
              <label>
                <input
                  checked={gender === 'female'}
                  name="gender"
                  onChange={() => setGender('female')}
                  type="radio"
                  value="female"
                />
                Female
              </label>
            </fieldset>
            <button disabled={auth.isLoading} type="submit">
              {auth.isLoading ? 'Validating...' : 'Enter chat'}
            </button>
          </form>
          {onboardingError ? <p className="error">{onboardingError}</p> : null}
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mobile-topbar">
        <strong>Memory Chat</strong>
        <button
          aria-label="Open chat menu"
          className="hamburger-button"
          onClick={() => setIsMenuOpen(true)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </header>
      <main className="app-grid">
        {isMenuOpen ? <button className="drawer-backdrop" onClick={() => setIsMenuOpen(false)} type="button" /> : null}
        <aside className={isMenuOpen ? 'sidebar open' : 'sidebar'}>
          <button className="drawer-close" onClick={() => setIsMenuOpen(false)} type="button">Close</button>
          <div className="profile">
            <Avatar user={auth.user!} />
            <div>
              <UsernameWithGender user={auth.user!} />
              <span>Public username</span>
            </div>
          </div>
          <button className="secondary-button" onClick={logout}>Logout</button>
          <PrivacyBanner />
          <section>
            <h2>Active chats</h2>
            <div className="conversation-list">
              {conversations.length === 0 ? <p className="muted">No active chats.</p> : null}
              {conversations.map((conversation) => (
                <button
                  className={conversation.id === selectedConversationId ? 'conversation active' : 'conversation'}
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                >
                  <Avatar user={conversation.participantProfile} />
                  <span>
                    <UsernameWithGender user={conversation.participantProfile} />
                    <small>
                      {conversation.isParticipantTyping
                        ? 'typing...'
                        : conversation.messages[conversation.messages.length - 1]?.content || 'Blank chat'}
                    </small>
                  </span>
                  <PresenceDot isOnline={conversation.isParticipantOnline} />
                  {conversation.unreadCount > 0 ? <b className="unread-badge">{conversation.unreadCount}</b> : null}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>Online users</h2>
            <div className="online-list">
              {onlineUsers.length === 0 ? <p className="muted">No one else is online.</p> : null}
              {onlineUsers.map((user) => (
                <button className="online-user" key={user.id} onClick={() => startConversation(user)}>
                  <Avatar user={user} />
                  <span>
                    <UsernameWithGender user={user} />
                    <small>Online now</small>
                  </span>
                  <PresenceDot isOnline />
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="chat-panel">
          {selectedConversation ? (
            <>
              <header className="chat-header">
                <div className="profile">
                  <Avatar user={selectedConversation.participantProfile} />
                  <div>
                    <UsernameWithGender user={selectedConversation.participantProfile} />
                    <span>
                      {selectedConversation.isParticipantTyping
                        ? 'typing...'
                        : selectedConversation.isParticipantOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <PresenceDot isOnline={selectedConversation.isParticipantOnline} />
                <button className="danger-button" onClick={() => closeConversation(selectedConversation.id)}>
                  Close Chat
                </button>
              </header>

              <div className="messages">
                {selectedConversation.messages.length === 0 ? (
                  <div className="empty-state">
                    <h2>Blank conversation</h2>
                    <p>Nothing exists here until a live message is sent.</p>
                  </div>
                ) : null}
                {selectedConversation.messages.map((message) => {
                  const mine = message.from.id === auth.user?.id;
                  return (
                    <div className={mine ? 'message-row mine' : 'message-row'} key={message.id}>
                      <div className="bubble">
                        <p>{message.content}</p>
                        {mine ? <small>{message.status}</small> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {sendError ? <p className="error">{sendError}</p> : null}

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <textarea
                  value={draft}
                  onChange={(event) => updateDraft(event.target.value)}
                  placeholder="Message"
                  rows={2}
                />
                <button disabled={!draft.trim()} type="submit">Send</button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <h2>No chat selected</h2>
              <p>Pick an active conversation or start one from the online users list.</p>
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="shell">{children}</div>;
}

function PrivacyBanner() {
  return (
    <div className="privacy-banner">
      Chats survive refresh in this browser tab. Messages are deleted when a chat is closed, logout is used, or the tab session ends.
    </div>
  );
}

function InstallGuide({ onBack }: { onBack: () => void }) {
  return (
    <main className="guide-page">
      <header className="guide-header">
        <div>
          <p className="eyebrow">Initial setup</p>
          <h1>Install Memory Chat</h1>
          <p className="lede">Configure the app once, then run the backend and web client together.</p>
        </div>
        <button className="secondary-button" onClick={onBack} type="button">
          Back
        </button>
      </header>

      <section className="guide-section">
        <h2>1. Install dependencies</h2>
        <CodeBlock value={'npm install\nnpm run install:all'} />
      </section>

      <section className="guide-section">
        <h2>2. Create environment files</h2>
        <CodeBlock value={'cp backend/.env.example backend/.env\ncp frontend/.env.example frontend/.env'} />
      </section>

      <section className="guide-section">
        <h2>3. Configure Google OAuth</h2>
        <p>
          Create a Google Cloud OAuth web client, add <code>http://localhost:3000</code> as an authorized JavaScript
          origin, then use that same client ID in both environment files.
        </p>
      </section>

      <section className="guide-grid">
        <EnvCard
          title="backend/.env"
          rows={[
            ['NODE_ENV', 'development', 'Enables development behavior.'],
            ['PORT', '4000', 'Backend HTTP and Socket.io port.'],
            ['FRONTEND_URL', 'http://localhost:3000', 'Allowed browser app origin.'],
            ['GOOGLE_CLIENT_ID', 'your Google OAuth web client ID', 'Used when verifying Google tokens.'],
          ]}
        />
        <EnvCard
          title="frontend/.env"
          rows={[
            ['VITE_BACKEND_URL', 'http://localhost:4000', 'Socket.io backend URL.'],
            ['VITE_GOOGLE_CLIENT_ID', 'your Google OAuth web client ID', 'Used by Google Sign-In.'],
          ]}
        />
      </section>

      <section className="guide-section">
        <h2>4. Start the app</h2>
        <CodeBlock value={'npm start'} />
        <p>
          Open <code>http://localhost:3000</code>. The backend runs on <code>http://localhost:4000</code>.
        </p>
      </section>
    </main>
  );
}

function EnvCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[name: string, example: string, purpose: string]>;
}) {
  return (
    <section className="env-card">
      <h2>{title}</h2>
      <dl>
        {rows.map(([name, example, purpose]) => (
          <div key={name}>
            <dt><code>{name}</code></dt>
            <dd>
              <span>{example}</span>
              <small>{purpose}</small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CodeBlock({ value }: { value: string }) {
  return <pre className="code-block"><code>{value}</code></pre>;
}

function UsernameWithGender({ user }: { user: UserProfile }) {
  return (
    <strong className="username-with-gender">
      @{user.username}
      <span
        aria-label={user.gender === 'female' ? 'Female user' : 'Male user'}
        className={`gender-icon ${user.gender}`}
        title={user.gender === 'female' ? 'Female' : 'Male'}
      >
        {user.gender === 'female' ? 'F' : 'M'}
      </span>
    </strong>
  );
}

function Avatar({ user }: { user: UserProfile }) {
  const initials = user.username.slice(0, 2).toUpperCase();
  return <div className="avatar fallback">{initials}</div>;
}

function PresenceDot({ isOnline }: { isOnline: boolean }) {
  return <i className={isOnline ? 'presence-dot online' : 'presence-dot offline'} />;
}

function syncConversationPresence(conversations: ConversationSession[], onlineUsers: UserProfile[]) {
  const onlineIds = new Set(onlineUsers.map((user) => user.id));
  return conversations.map((conversation) => ({
    ...conversation,
    isParticipantOnline: onlineIds.has(conversation.participantId),
    isParticipantTyping: onlineIds.has(conversation.participantId) ? conversation.isParticipantTyping : false,
  }));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
