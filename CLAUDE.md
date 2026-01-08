# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A **Spring Boot + React WebRTC/SSE conference chat application** - a full-stack 1:1 video calling platform with real-time messaging. Uses WebRTC for P2P media streaming and SSE (Server-Sent Events) for signaling.

## Development Commands

### Backend (Spring Boot - port 9088)

```bash
cd backend

# Development mode (requires secret.yml in project root)
./gradlew bootRun --args="--spring.config.additional-location=file:../secret.yml"

# Background mode (Linux)
nohup ./gradlew bootRun --args="--spring.config.additional-location=file:../secret.yml" > /dev/null 2>&1 &
```

### Frontend (Vite - port 9087)

```bash
cd frontend

npm install           # Install dependencies
npm run dev           # Development server (uses .env.development)
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

## Architecture Overview

### Tech Stack

- **Backend**: Java 17, Spring Boot 3.4.1, Spring Security (JWT), PostgreSQL, Flyway, SseEmitter
- **Frontend**: React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 3, WebRTC (native), SSE (native EventSource)

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Communication Flow                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Authentication                                               │
│     POST /auth/login  →  JWT token                              │
│     POST /auth/register  →  JWT token (requires invite code)    │
│                                                                  │
│  2. Real-time Events (SSE)                                      │
│     GET /sse/subscribe?token={token}                            │
│     Events: connect, user_list, signal                          │
│                                                                  │
│  3. Signaling                                                    │
│     POST /sse/signal  →  WebRTC offer/answer/ICE candidates     │
│                                                                  │
│  4. Media Streaming (WebRTC P2P)                                │
│     Direct peer-to-peer via RTCPeerConnection                   │
│     STUN: stun:stun.l.google.com:19302                         │
└─────────────────────────────────────────────────────────────────┘
```

### Signal Protocol

All WebRTC and chat messages use a JSON wrapper:

```typescript
{
  sender: string,
  target: string,
  type: 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'CHAT' | 'HANGUP' | 'REJECT',
  data: string  // JSON-stringified payload
}
```

### Call State Machine

```
TRYING → CONNECTED → ENDED
      ↘ REJECTED
      ↘ CANCELLED
      ↘ BUSY
```

### Key Backend Components

- `SseService`: Core signaling logic (SSE emitter management, signal routing)
- `SseController`: SSE endpoints (/sse/subscribe, /sse/signal)
- `AuthController`: Authentication endpoints (/auth/login, /auth/register)
- `JwtTokenProvider`: JWT token generation/validation
- `SecurityConfig`: CORS (allows all origins), stateless session

### Key Frontend Components

- `useAuth`: Authentication state (sessionStorage-based)
- `useSSE`: Server-Sent Events connection lifecycle
- `useWebRTC`: RTCPeerConnection and media stream management
- `useChat`: In-memory chat message storage
- `App.tsx`: Root state orchestrator (initializes all hooks, routes)

See `frontend/CLAUDE.md` for detailed frontend architecture.

## Database

PostgreSQL with Flyway migrations. Schema: `conference_chat`

**Tables:**
- `users`: id, email, username, password, created_at
- `call_session`: session_id, caller_id, callee_id, status, created_at, connected_at, ended_at

## Configuration

### Required: secret.yml (git-ignored)

Create `secret.yml` in project root:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://<HOST>:<PORT>/<DB_NAME>?currentSchema=conference_chat
    username: <DB_USER>
    password: <DB_PASSWORD>

jwt:
  secret: <YOUR_JWT_SECRET_KEY_AT_LEAST_32_CHARS>

app:
  security:
    ticker: <YOUR_SECURITY_TICKER>  # Used for invite code generation
```

### Environment Files (Frontend)

- `.env.development`: `VITE_API_URL=http://localhost:9088`
- `.env.production`: `VITE_API_URL=/conference-api`

## Critical Implementation Details

### Backend

- **SSE Emitter Map**: In-memory ConcurrentHashMap for active connections (not clusterable as-is)
- **Stateless Security**: SessionCreationPolicy.STATELESS with JWT authentication
- **JPA DDL Mode**: `validate` - relies on Flyway migrations for schema changes

### Frontend

- **Hard Navigation**: Uses `window.location.href` for auth flows (intentionally clears router state)
- **SessionStorage Persistence**: Auth token + call state survive page refresh
- **ICE Candidate Buffering**: Candidates queued until remote description is set
- **Screen Share**: Uses `replaceTrack()` pattern on existing sender
