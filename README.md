# Vibly

Vibly is a privacy-first Expo React Native app backed by an Express and Socket.io relay. It runs on iOS, Android, and browser through Expo Web.

Tagline: Chat. Feel. Fade.

## Privacy Architecture

- No database is used for messages.
- No chat history endpoint exists.
- No message content is written to logs.
- No localStorage, AsyncStorage, SecureStore, IndexedDB, SQLite, filesystem chat backup, or message persistence is used.
- On Expo Web, `sessionStorage` keeps only the active auth/session snapshot so browser reload can reconnect. It never stores messages or conversations.
- The backend tracks only active socket identity maps in RAM.
- The frontend keeps auth and chat state in in-memory Zustand stores only, without `persist` middleware.
- Closing a chat deletes that conversation's message array.
- Logout clears auth state, socket connection, active conversations, selected chat, online users, and message arrays.
- Abuse reports and temporary IP bans are handled in backend RAM only and never include message content. A user is blocked after reports from at least three distinct users who were active when they reported.
- Outgoing message moderation runs before delivery. It stores only temporary in-memory moderation metadata such as warning count, categories, and score.
- App restart starts blank.

## Safety Moderation

Vibly checks outgoing messages before they are added to local chat state or sent over Socket.io.

- Allowed messages send normally.
- Adult sexual or other risky messages show a safety reminder with options to edit or send anyway.
- Underage-related, abusive, coercive, drugs, weapons, and other illegal messages are blocked and not sent.
- Chat-level reminders appear after repeated warning events in the same session.
- Full message text is not persisted for moderation.

## Ephemeral Images

Vibly supports temporary image messages using a short-lived object storage flow:

```text
Client pick -> resize/compress to WebP -> temporary upload -> signed URL -> recipient lazy fetch -> auto expiry
```

- Images are not stored in chat state or database.
- Local development stores temporary media objects in a swappable temp storage provider.
- Temporary local media objects are encrypted at rest with AES-256-GCM before being written to the temp provider.
- Uploaded images expire after 5 minutes and are cleaned up even if they are never opened.
- Chat state stores only `{ id, thumbnail, expiresAt, mediaUrl }`.
- Free limits: 2 MB max upload, WebP quality 70, longest side 1440px, 10 images per chat.
- The frontend clears temporary media cache when chats close, on logout, and after the app remains backgrounded.
- Recipients may still save, screenshot, record, photograph, or otherwise preserve content outside Vibly.

Backend media environment variables:

```bash
PUBLIC_BACKEND_URL=http://localhost:4000
MEDIA_TEMP_DIR=
MEDIA_TTL_MS=300000
MEDIA_MAX_UPLOAD_BYTES=2097152
MEDIA_MAX_LONGEST_SIDE=1440
MEDIA_MAX_IMAGES_PER_CHAT=10
MEDIA_UPLOAD_RATE_WINDOW_MS=60000
MEDIA_UPLOAD_RATE_LIMIT=12
MEDIA_ENCRYPTION_KEY=replace-with-long-random-secret
```

## Project Structure

```text
frontend/
  app/
    _layout.tsx
    index.tsx
    login.tsx
    conversations.tsx
    chat/[conversationId].tsx
  src/
    components/
    hooks/
    services/
    store/
    theme/
    types/
backend/
  src/server.ts
  src/socket.ts
  src/auth.ts
```

## Install

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Google OAuth

Create Google OAuth clients for the platforms you plan to test:

- Web client for Expo Web.
- iOS client for iOS builds.
- Android client for Android builds.

Set:

```bash
# backend/.env
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

# frontend/.env
EXPO_PUBLIC_BACKEND_URL=http://localhost:4000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
```

Expo reads `EXPO_PUBLIC_*` values when Metro starts. After changing `frontend/.env`, stop the current Expo process and run `npm run web` or `npm run start` again.

For Expo Web, add your local Expo web origin to your Google OAuth web client.

Authorized JavaScript origins commonly include:

```text
http://localhost:8081
http://localhost:19006
http://localhost:3000
```

Authorized redirect URIs must exactly match the browser origin where Expo Web is running. For local Expo Web, it is usually one of these with no trailing slash:

```text
http://localhost:8081
http://localhost:19006
http://localhost:3000
```

Do not add `/login`, `/redirect`, or a trailing `/` unless the app shows that exact value. Google matches redirect URIs exactly.

## Run

From the repo root:

```bash
npm run start
npm run ios
npm run android
npm run web
```

Each command starts the backend and the matching Expo frontend command.

## Manual Commands

```bash
npm run backend
npm run expo
```

Frontend-only:

```bash
cd frontend
npm run start
npm run ios
npm run android
npm run web
```

## Socket Events

- `authenticate`: verifies Google ID token and registers a username-only public profile.
- `online-users-updated`: broadcasts currently online username profiles.
- `send-message`: relays a live message and forgets it.
- `receive-message`: delivers a live message to an online recipient.
- `typing`: relays ephemeral typing state.
- `report-user`: reports illicit, illegal, or abusive behavior without storing message content.
- `logout`: removes active socket identity and disconnects.

## Verification

```bash
npm run check
```

Messages remain memory-only. Do not add persistence middleware, storage APIs, chat history APIs, message tables, or message content logging.
