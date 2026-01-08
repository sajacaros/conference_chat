# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **frontend** of a Spring Boot + React WebRTC/SSE conference chat application. It's a **React 19 + Vite 7** application implementing 1:1 video calling with text chat using **WebRTC** for peer-to-peer media streaming and **SSE (Server-Sent Events)** for real-time signaling.

**Key Technologies**: React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS 3, WebRTC (native), SSE (native EventSource)

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (uses .env.development)
npm run dev
# → Runs at http://localhost:9087

# Build for production (uses .env.production)
npm run build

# Preview production build (must run build first)
npm run preview

# Run linter
npm run lint
```

## Environment Configuration

Environment variables are configured in `.env.development` and `.env.production`:

- `VITE_API_URL`: Backend API URL (e.g., `http://localhost:9088`)
- Access in code via `import.meta.env.VITE_API_URL`

## Architecture Overview

### State Management Pattern

**No Redux/Context** - Uses custom React hooks for all state management:

- **useAuth** (`/hooks/useAuth.ts`): Authentication state, sessionStorage-based persistence
- **useSSE** (`/hooks/useSSE.ts`): Server-Sent Events connection lifecycle and event handling
- **useWebRTC** (`/hooks/useWebRTC.ts`): RTCPeerConnection and media stream management
- **useChat** (`/hooks/useChat.ts`): In-memory chat message storage (clears on page refresh)

**State orchestration** happens in `App.tsx`, which initializes all hooks and passes state down to pages via props.

### Navigation Pattern

Uses **hard navigation** (`window.location.href`, `window.location.replace()`) for login and call flows instead of React Router navigation. This intentionally clears router state and forces full page re-initialization with sessionStorage restoration.

### Session Persistence

- **Authentication**: Token + email stored in `sessionStorage` (survives page refresh, not browser close)
- **Call state**: Target user, initiator role, and offer data stored in `sessionStorage` before navigating to `/call` page
- On page refresh, `CallPage` restores state from `sessionStorage` if props are missing

## API Communication

### REST + SSE Hybrid

1. **REST API** (synchronous operations):
   - Login: `POST /auth/login`
   - Register: `POST /auth/register` (requires invite code)
   - Signal transmission: `POST /sse/signal`
   - Logout: `DELETE /sse/logout`

2. **SSE** (asynchronous push notifications):
   - Connection: `GET /sse/subscribe?token={token}`
   - Events: `connect`, `user_list`, `signal`

### Signal Protocol

All WebRTC and chat messages use a JSON wrapper sent via SSE/REST:

```typescript
{
  sender: string,
  target: string,
  type: 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'CHAT' | 'HANGUP' | 'REJECT',
  data: string  // JSON-stringified payload
}
```

### Authorization

All authenticated requests use Bearer token in `Authorization` header.

## WebRTC Implementation

**Location**: `/src/hooks/useWebRTC.ts`

### Key Components

1. **RTCPeerConnection**: Single active connection per call
2. **STUN server**: Uses Google public STUN (`stun:stun.l.google.com:19302`)
3. **Media streams**:
   - Local: `getUserMedia({ video: true, audio: true })`
   - Remote: Captured from `ontrack` event
4. **Screen sharing**: Uses `getDisplayMedia()` with `replaceTrack()` pattern

### Signal Flow

- **Initiator** (caller): Creates OFFER → sends via SSE → waits for ANSWER
- **Receiver** (callee): Receives OFFER → creates ANSWER → sends via SSE
- **ICE candidates**: Sent as `CANDIDATE` signals, buffered in pending queue until remote description is set
- **Hangup**: Sent as `HANGUP` signal, triggers cleanup

### Important Patterns

- **Pending candidates queue**: ICE candidates are buffered until `setRemoteDescription()` completes to prevent race conditions
- **Screen share track replacement**: Uses `replaceTrack()` on existing sender rather than add/remove tracks (less disruptive)
- **Auto-restore camera**: Screen share track's `onended` event restores camera when user stops sharing

## Routing Structure

| Route | Component | Auth | Purpose |
|-------|-----------|------|---------|
| `/login` | LoginPage | No | User authentication |
| `/register` | RegisterPage | No | User registration (invite code required) |
| `/` | UserListPage | Yes | Contact list, incoming call notifications |
| `/call` | CallPage | Yes | Active video call with chat |

**Route protection**: Unauthenticated users are redirected to `/login` using `window.location.replace()`.

## Directory Structure

```
/src
├── /components
│   ├── /ui/          # Reusable primitives (Button, Card, Input, Modal, Toast, Header)
│   └── /chat/        # Chat components (ChatWindow, ChatMessage)
├── /pages/           # Page-level components (LoginPage, RegisterPage, UserListPage, CallPage)
├── /hooks/           # Custom hooks for business logic (useAuth, useSSE, useWebRTC, useChat)
├── /lib/
│   └── utils.ts      # Utilities (cn - className merger using clsx + tailwind-merge)
├── App.tsx           # Root routing & state orchestration
└── main.tsx          # React DOM entrypoint
```

## Component Patterns

### UI Components (`/components/ui/`)

- **Button**: Variants (`default`, `outline`, `ghost`, `danger`, `link`), sizes (`default`, `sm`, `lg`, `icon`)
- **Card**: Compound component pattern (Card, CardHeader, CardTitle, CardContent, CardFooter)
- **Input**: Dark theme styled input with focus states
- **Modal**: Centered dialog with backdrop blur, optional close button
- **Header**: Top bar with email display and logout button

All use `React.forwardRef` for flexibility and dark theme styling (gray-800/900).

### Chat Components (`/components/chat/`)

- **ChatWindow**: Dual mode (floating draggable / docked sidebar), auto-scroll to bottom
- **ChatMessage**: Sender name, text, timestamp; styled differently for own messages vs others

## TypeScript Configuration

- **Strict mode** enabled (`strict: true`)
- **Path alias**: `@/*` maps to `./src/*`
- **Compiler target**: ES2020
- **Module resolution**: bundler mode
- **Unused code detection**: `noUnusedLocals`, `noUnusedParameters` enabled

## Styling

- **Tailwind CSS 3** with PostCSS
- **Dark theme** default (gray-800/900 backgrounds)
- **Utility function**: `cn()` in `/lib/utils.ts` merges className strings using `clsx` + `tailwind-merge`

## Critical Code Patterns

1. **Callback refs in useSSE**: Uses callback refs to maintain stable connect/disconnect functions while allowing handler updates
2. **isCallSetup flag in CallPage**: Prevents double-initialization when navigating to `/call`
3. **SSE event routing**: All SSE signals are received in `useSSE` and routed to appropriate handlers based on signal type
4. **SessionStorage restoration**: Call state is saved before navigation and restored in `useEffect` hooks

## Known Limitations

- **No test suite**: No test commands available
- **No chat persistence**: Chat messages are in-memory only (lost on page refresh)
- **Single active call**: Only supports one concurrent call per user
- **No error recovery UI**: Network errors may require manual page refresh
