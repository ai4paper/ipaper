# Agent Lifecycle

This app starts the local `opencode acp` process from the server side.

## Init Flow

```mermaid
flowchart TD
  A[User enters cwd<br/>in composer UI] --> B[Click Start session]
  B --> C[POST /api/agent/session<br/>with cwd in request body]
  C --> D[createAgentSession in orchestrator]
  D --> E[createManagedAcpClient]
  E --> F[spawnOpencodeAgent]
  F --> G[opencode acp started<br/>with selected cwd]
  D --> H[agent.initialize]
  H --> I[agent.createSession]
  I --> J[Store browser session<br/>in sessionManager]
  J --> K[Open SSE stream<br/>at /api/agent/events]
```

## When ACP Starts

`opencode acp` starts only after the user chooses a working directory and starts a session.

It is triggered by:

- `src/components/agent/PromptComposer.tsx`
- `src/components/agent/useAgentSession.ts`
- `startSession()` -> `createSessionIfNeeded(cwd)`
- `POST /api/agent/session` with `{ cwd }`

It does **not** start on page mount.

It does **not** wait for the first prompt either; session startup happens as soon as the user clicks `Start session`.

The backend now rejects session creation requests without a non-empty `cwd`.

## How It Is Managed

- `src/lib/acp/opencode.ts`: spawns and stops the child process
- `src/lib/acp/client.ts`: wraps ACP over stdin/stdout
- `src/lib/acp/session-manager.ts`: stores browser sessions in memory
- `src/lib/backend/orchestrator.ts`: creates sessions, sends prompts, handles mode/model/cancel
- `src/routes/api/agent/events.ts`: streams session events to the browser with SSE

## Current Cleanup Behavior

```mermaid
flowchart TD
  A[Browser tab closes<br/>or EventSource disconnects] --> B[SSE request aborts]
  B --> C[events route detaches listener]
  C --> D[disposeBrowserSession(sessionId)]
  D --> E[agent.dispose() stops<br/>opencode acp]
```

There is a disposal path:

- `sessionManager.disposeBrowserSession(id)`

That method calls `agent.dispose()`, which stops the `opencode acp` process.

It is now wired to an explicit close-session flow:

- `DELETE /api/agent/session` with `{ sessionId }`
- `closeAgentSession(sessionId)` in the orchestrator
- `sessionManager.disposeBrowserSession(id)` to stop the ACP process
- `useAgentSession.closeSession()` from the browser UI

Closing the session from the UI disposes the matching ACP process and resets the browser-side session state so a new session can be started cleanly.

When the SSE connection aborts, the backend also disposes the same browser session automatically. On the frontend, an event-stream error releases the local session state so the user can start a fresh session again with the chosen working directory.

## Suggested Management Options

1. Keep explicit session start, or move startup to first prompt if that UX is preferred.
2. Add an idle timeout using `updatedAt`.
3. Dispose sessions when the owning browser connection is gone.
