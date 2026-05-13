# Memory Chat

Memory Chat is a privacy-first React web messaging app backed by an Express and Socket.io relay. Messages are kept only in active application memory during a live session.

## Privacy Architecture

- No database is used for messages.
- No message content is written to logs.
- No localStorage, IndexedDB, filesystem chat backup, or history API is implemented.
- The browser uses `sessionStorage` only to survive refreshes in the current tab; closing the tab/session removes that snapshot.
- The backend stores only online user socket mappings in RAM.
- The frontend stores active conversations in React state plus the current tab's `sessionStorage` refresh snapshot.
- Closing a chat deletes that chat's message array from memory and the refresh snapshot.
- Logging out clears conversations, selected chat state, online users, auth state, and disconnects the socket.
- Refreshing the same browser tab keeps the active session and active chats.
- Other users only see usernames. Real Google names and emails are used for private authentication/routing only and are not emitted to clients.

## Project Structure

```text
backend/
  src/server.ts
  src/socket.ts
  src/auth.ts
  Dockerfile
frontend/
  index.html
  vite.config.ts
  src/main.tsx
  src/services/
  src/types/
```

## Install Guide

Memory Chat needs Node.js, npm, and one Google OAuth web client ID. The same OAuth client ID is used by both the backend and frontend.

1. Install dependencies from the repo root:

```bash
npm install
npm run install:all
```

2. Create local environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Create a Google Cloud OAuth web client and add `http://localhost:3000` as an authorized JavaScript origin.

4. Put the OAuth web client ID in both environment files:

```bash
# backend/.env
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com

# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
```

5. Start both apps:

```bash
npm start
```

Open `http://localhost:3000`.

## Environment Variables

Backend:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Enables development error details. |
| `PORT` | `4000` | Backend HTTP and Socket.io port. |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin allowed by Express and Socket.io. |
| `GOOGLE_CLIENT_ID` | none | Google OAuth web client ID used to verify sign-in tokens. |

Frontend:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_BACKEND_URL` | `http://localhost:4000` | Backend URL used by the Socket.io client. |
| `VITE_GOOGLE_CLIENT_ID` | none | Google OAuth web client ID used by Google Sign-In. |

## Backend Setup

From the repo root, install everything:

```bash
npm install
npm run install:all
```

Start the backend and web app:

```bash
npm start
```

Open:

```bash
http://localhost:3000
```

You can also run each side manually:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Set `GOOGLE_CLIENT_ID` in `backend/.env` to your Google OAuth web client ID. Keep `FRONTEND_URL=http://localhost:3000` for local development. The server runs on `http://localhost:4000` by default.

Docker:

```bash
cd backend
docker compose up --build
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Configure Google Sign-In with `VITE_GOOGLE_CLIENT_ID`. The frontend uses `VITE_BACKEND_URL=http://localhost:4000` by default.

## Google OAuth Notes

1. Create a Google Cloud OAuth web client.
2. Add `http://localhost:3000` to the authorized JavaScript origins.
3. Put the same web client ID in `backend/.env` and `frontend/.env`.

## Socket Events

- `authenticate`: verifies the Google ID token and registers the user online in RAM.
- `online-users-updated`: broadcasts the current online profiles.
- `send-message`: relays a message directly to the recipient socket room and then forgets it.
- `receive-message`: delivers a live message to an online recipient.
- `logout`: removes the user from RAM and disconnects the socket.

There is intentionally no chat history endpoint.
