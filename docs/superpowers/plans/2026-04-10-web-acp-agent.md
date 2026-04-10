# Web ACP Agent Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable web version of the AI agent in SolidStart, with a SolidJS chat UI and a server-side orchestration layer that can both manage a local `opencode acp` agent and retain room for app-owned backend integrations outside ACP.

**Architecture:** Keep the browser thin and keep orchestration on the server. The SolidStart frontend will render a chat-style interface and subscribe to streamed agent updates, while the server owns both the ACP connection lifecycle and any app-specific backend integrations. The server will launch `opencode acp` as a subprocess, initialize the ACP session, send prompts, handle cancellation, translate ACP updates into a UI-friendly event stream, and remain free to call local services, databases, external APIs, and custom business logic when ACP is not the right tool.

**Tech Stack:** SolidStart 2 alpha, SolidJS, Bun, `@agentclientprotocol/sdk`, Node child processes, server routes / server functions, SSE for browser streaming, backend service modules for app-owned integrations, Vitest for focused unit coverage.

---

## Current Repo Facts

- The repo is still the default SolidStart scaffold.
- There is no existing server API layer, agent integration, state model, or test setup.
- `bun.lock` exists, so use `bun add` / `bun add -d` for dependency changes.
- `opencode` is installed locally and exposes `opencode acp`.
- ACP docs confirm the required lifecycle is `initialize` -> `session/new` -> `session/prompt` / `session/cancel`, with updates streamed via `session/update`.

## File Structure

### Files to Modify

- `package.json`
  Add ACP SDK and test scripts.
- `src/routes/index.tsx`
  Replace the demo content with the first web-agent screen.
- `src/app.tsx`
  Remove scaffold navigation and set app-level metadata for the agent UI.
- `src/app.css`
  Replace starter styles with the web-agent layout and conversation styling.

### Files to Create

- `src/lib/acp/types.ts`
  Shared server-side types for ACP sessions, prompt requests, and UI event payloads.
- `src/lib/backend/types.ts`
  Shared types for backend-owned capabilities that are not modeled as ACP traffic.
- `src/lib/acp/opencode.ts`
  Spawn and supervise the local `opencode acp` subprocess.
- `src/lib/acp/client.ts`
  Wrap `ClientSideConnection` from `@agentclientprotocol/sdk` and expose `initialize`, `createSession`, `prompt`, `cancel`, and teardown helpers.
- `src/lib/backend/services.ts`
  App-owned integration layer for non-ACP capabilities such as persistence, external APIs, internal business logic, and future workflow helpers.
- `src/lib/backend/orchestrator.ts`
  Coordinates ACP agent actions with backend-owned services so the app is not limited by ACP-only behavior.
- `src/lib/acp/session-manager.ts`
  In-memory registry of active browser sessions mapped to ACP connections and event listeners.
- `src/lib/acp/event-stream.ts`
  Convert ACP `session/update` notifications into normalized UI events for SSE delivery.
- `src/routes/api/agent/events.ts`
  SSE endpoint for streaming session updates to the browser.
- `src/routes/api/agent/session.ts`
  Create a new ACP session and return the browser-facing session id and capability snapshot.
- `src/routes/api/agent/prompt.ts`
  Accept a user prompt and forward it to ACP.
- `src/routes/api/agent/cancel.ts`
  Cancel the active prompt turn for a session.
- `src/components/agent/AgentApp.tsx`
  Top-level client UI state and browser networking logic.
- `src/components/agent/MessageList.tsx`
  Render user and agent messages.
- `src/components/agent/PromptComposer.tsx`
  Textarea, submit, and cancel controls.
- `src/components/agent/ActivityPanel.tsx`
  Render tool-call and plan updates separately from chat text.
- `src/components/agent/types.ts`
  Browser-side view-model types.
- `src/components/agent/useAgentSession.ts`
  Solid-side session orchestration, fetch calls, and SSE subscription.
- `src/lib/acp/session-manager.test.ts`
  Unit tests for session lifecycle bookkeeping.
- `src/lib/acp/event-stream.test.ts`
  Unit tests for ACP-update to UI-event mapping.
- `vitest.config.ts`
  Minimal Vitest config for Node-side tests.
- `tsconfig.vitest.json`
  Optional isolated config if the default TS config causes test-environment issues.

## Non-Goals For This First Slice

- No persistent database-backed chat history.
- No multi-user auth.
- No reconnect-across-server-restarts guarantee.
- No file upload or rich prompt content yet.
- No MCP server management UI yet.
- No attempt to expose every ACP capability up front.
- No attempt in the first slice to fully automate hybrid routing between ACP and every backend service.

## Design Decisions

1. Use one managed `opencode acp` subprocess per active browser session for the first slice.
2. Keep session state in server memory first; persistence can come later after the transport works reliably.
3. Use SSE from browser to server for incremental updates because it is simpler than WebSockets for one-way streaming.
4. Treat the browser as a web client of our backend, not a direct ACP participant; browser code should never talk to `opencode` directly.
5. Normalize ACP protocol updates into a smaller UI event model so the frontend is not tightly coupled to raw protocol payloads.
6. Keep backend-owned integrations as first-class modules behind a server orchestrator so the product is not constrained by ACP feature gaps.

## Backend Integration Principle

ACP is only one execution path, not the whole backend architecture.

The backend must keep the ability to:

- call internal app services directly without routing through ACP
- persist chat/session/application state in app-owned storage
- enforce auth, rate limits, and product permissions
- enrich prompts with server-side context before sending them to ACP
- post-process agent output before returning it to the browser
- run workflows that combine ACP steps with normal backend logic

Recommended boundary:

- `src/lib/acp/*` is transport and agent-connection code only
- `src/lib/backend/*` is app-owned business logic and integrations
- route handlers call a backend orchestrator, not ACP primitives directly

This keeps ACP replaceable and avoids coupling the product to one agent protocol.

## Open Questions To Resolve During Implementation

1. Confirm the exact stdio transport helper exported by `@agentclientprotocol/sdk` and its preferred Bun/Node runtime usage.
2. Confirm the exact SolidStart route-handler signatures in `2.0.0-alpha.2` before writing API files.
3. Verify whether `opencode acp` defaults to stdio mode with no extra flags, or whether a specific flag is needed for the SDK transport.
4. Decide whether the browser should eagerly create a session on first page load or lazily create one on first prompt. The recommended default is lazy creation on first prompt.
5. Decide the first backend-owned capability to preserve in the architecture even if it is stubbed initially. Recommended: a simple `backendContext` service interface used to enrich prompts.

## Chunk 1: Foundation And ACP Backend

### Task 1: Add dependencies and scripts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tsconfig.vitest.json`

- [ ] Add runtime dependency: `@agentclientprotocol/sdk`
- [ ] Add dev dependencies: `vitest`, `@types/node`
- [ ] Add scripts: `test`, `test:watch`
- [ ] Create minimal Vitest config for Node-based unit tests
- [ ] Run: `bun install`
- [ ] Run: `bun test`
- [ ] Expected: test runner starts successfully even if there are zero passing tests yet

### Task 2: Prove the local ACP handshake against `opencode`

**Files:**
- Create: `src/lib/acp/opencode.ts`
- Create: `src/lib/acp/client.ts`
- Create: `src/lib/acp/types.ts`

- [ ] Implement a tiny `spawnOpencodeAgent()` helper that launches `opencode acp --cwd /absolute/path`
- [ ] Capture `stdin`, `stdout`, `stderr`, exit code, and a `dispose()` method
- [ ] Implement an ACP client wrapper using `ClientSideConnection`
- [ ] Implement `initialize()` and capture returned `agentInfo` and `agentCapabilities`
- [ ] Implement `createSession({ cwd })` and return the ACP `sessionId`
- [ ] Add defensive timeouts around startup and initialization failures
- [ ] Add structured server-side logging for spawn failure, init failure, and unexpected process exit
- [ ] Verify manually by running a focused script or test against the real local `opencode` binary
- [ ] Expected: the wrapper can successfully initialize and create a session without browser code involved

Implementation sketch:

```ts
export interface ManagedAcpClient {
  initialize(): Promise<InitializeResult>
  createSession(cwd: string): Promise<string>
  prompt(sessionId: string, text: string): Promise<PromptResult>
  cancel(sessionId: string): Promise<void>
  onUpdate(listener: (update: AcpSessionUpdate) => void): () => void
  dispose(): Promise<void>
}
```

### Task 3: Build the in-memory session manager

**Files:**
- Create: `src/lib/acp/session-manager.ts`
- Test: `src/lib/acp/session-manager.test.ts`

- [ ] Define a browser-facing session record with fields for browser session id, ACP session id, process handle, connection handle, status, and timestamps
- [ ] Implement `createBrowserSession()`
- [ ] Implement `getBrowserSession()`
- [ ] Implement `attachListener()` / `broadcast()` for streamed UI events
- [ ] Implement `markRunningPrompt()` and `clearRunningPrompt()`
- [ ] Implement `disposeBrowserSession()` for cleanup on fatal errors or idle expiry
- [ ] Write unit tests for creation, lookup, listener fan-out, and cleanup
- [ ] Run: `bun test src/lib/acp/session-manager.test.ts`
- [ ] Expected: session bookkeeping works without ACP attached

### Task 4: Add the backend orchestration seam

**Files:**
- Create: `src/lib/backend/types.ts`
- Create: `src/lib/backend/services.ts`
- Create: `src/lib/backend/orchestrator.ts`

- [ ] Define backend-owned interfaces that are independent of ACP
- [ ] Add a minimal `backendContext` service contract for future prompt enrichment
- [ ] Add an orchestrator entry point that receives browser requests and decides whether to call ACP, backend services, or both
- [ ] Keep the first implementation simple: prompt goes to ACP, but via the orchestrator rather than directly from route handlers
- [ ] Document where persistence, auth, external APIs, and custom workflows will plug in later
- [ ] Expected: ACP is integrated behind a stable backend seam instead of being the whole server design

### Task 5: Normalize ACP updates into UI events

**Files:**
- Create: `src/lib/acp/event-stream.ts`
- Test: `src/lib/acp/event-stream.test.ts`

- [ ] Define a narrow UI event union: `status`, `message-delta`, `message-complete`, `tool-call`, `tool-call-update`, `plan`, `error`, `turn-complete`
- [ ] Map raw `session/update` payloads into that union
- [ ] Ensure chunks can be appended incrementally on the client without needing the full ACP schema in the browser
- [ ] Preserve enough ids so the UI can update tool-call cards in place
- [ ] Write tests for text chunk, plan update, tool-call pending/in-progress/completed, and turn completion mapping
- [ ] Run: `bun test src/lib/acp/event-stream.test.ts`
- [ ] Expected: ACP protocol noise is hidden behind a stable browser event model

### Task 6: Expose the backend through SolidStart API routes

**Files:**
- Create: `src/routes/api/agent/session.ts`
- Create: `src/routes/api/agent/prompt.ts`
- Create: `src/routes/api/agent/cancel.ts`
- Create: `src/routes/api/agent/events.ts`

- [ ] Implement `POST /api/agent/session` to allocate a browser session, spawn `opencode acp`, initialize ACP, create an ACP session, and return JSON metadata
- [ ] Implement `POST /api/agent/prompt` to accept `{ sessionId, text }` and send the request through the backend orchestrator
- [ ] Implement `POST /api/agent/cancel` to forward `session/cancel`
- [ ] Implement `GET /api/agent/events?sessionId=...` as an SSE stream backed by the session manager listener registry
- [ ] Broadcast `status` events for startup, ready, prompting, cancelling, and fatal error states
- [ ] Ensure all API routes validate missing or unknown session ids and return non-200 responses with small JSON errors
- [ ] Manually verify with `curl` or a small fetch script before wiring the UI
- [ ] Expected: one session can be created, prompted, streamed, cancelled, and cleaned up entirely through HTTP + SSE

Manual verification sequence:

```bash
bun run dev
curl -X POST http://localhost:3000/api/agent/session
curl -N "http://localhost:3000/api/agent/events?sessionId=<browser-session-id>"
curl -X POST http://localhost:3000/api/agent/prompt \
  -H "content-type: application/json" \
  -d '{"sessionId":"<browser-session-id>","text":"say hello"}'
```

## Chunk 2: Solid UI And End-To-End Flow

### Task 7: Replace the starter UI with the web-agent shell

**Files:**
- Modify: `src/routes/index.tsx`
- Modify: `src/app.tsx`
- Modify: `src/app.css`
- Create: `src/components/agent/AgentApp.tsx`
- Create: `src/components/agent/MessageList.tsx`
- Create: `src/components/agent/PromptComposer.tsx`
- Create: `src/components/agent/ActivityPanel.tsx`
- Create: `src/components/agent/types.ts`

- [ ] Remove the default counter and starter copy from the homepage
- [ ] Build a two-pane or stacked responsive layout:
- [ ] Main transcript pane for user / agent chat messages
- [ ] Secondary activity pane for plan and tool-call progress
- [ ] Add empty, connecting, ready, running, and error UI states
- [ ] Add mobile-friendly spacing and a sticky composer footer
- [ ] Keep styling custom but minimal; do not import a UI framework for this first slice
- [ ] Set `<Title>` and app metadata to match the web-agent experience

### Task 8: Implement browser-side session orchestration

**Files:**
- Create: `src/components/agent/useAgentSession.ts`
- Create: `src/components/agent/AgentApp.tsx`
- Modify: `src/components/agent/MessageList.tsx`
- Modify: `src/components/agent/PromptComposer.tsx`
- Modify: `src/components/agent/ActivityPanel.tsx`

- [ ] On first prompt submission, call `POST /api/agent/session` if no session exists yet
- [ ] Open an `EventSource` to `/api/agent/events`
- [ ] Append user messages locally immediately for responsive UX
- [ ] Stream agent text chunks into an in-progress assistant message
- [ ] Update activity cards as `plan` and `tool-call` events arrive
- [ ] Disable duplicate sends while a turn is active
- [ ] Wire the cancel button to `POST /api/agent/cancel`
- [ ] Surface backend errors inline in the conversation UI
- [ ] Dispose the SSE connection on component cleanup

Minimal browser view model:

```ts
type ChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  text: string
  status?: "streaming" | "done" | "error"
}
```

### Task 9: End-to-end verification and hardening

**Files:**
- Modify: any of the files above as needed

- [ ] Run: `bun run build`
- [ ] Run: `bun test`
- [ ] Run the app locally and verify a full prompt cycle from the browser
- [ ] Verify page reload behavior: either show a clear "session expired" state or re-create a new session cleanly
- [ ] Verify server cleanup on browser disconnect and on cancelled prompts
- [ ] Verify stderr noise from `opencode` never leaks into ACP stdout parsing
- [ ] Verify error handling for these cases:
- [ ] `opencode` missing from PATH
- [ ] ACP initialize failure
- [ ] session creation failure
- [ ] prompt cancellation
- [ ] unexpected subprocess exit mid-turn

## Acceptance Criteria

- Visiting `/` shows a functional chat-oriented agent UI instead of the starter page.
- The first prompt causes the backend to launch `opencode acp`, initialize ACP, and create a session.
- Prompting produces streamed updates in the browser via SSE.
- Tool-call and plan updates are visible separately from plain chat text.
- Cancel stops an in-flight prompt turn without crashing the server.
- Backend state is isolated per browser session.
- Route handlers depend on backend orchestration seams rather than ACP transport details.
- `bun test` and `bun run build` pass.

## Recommended Commit Boundaries

1. `chore: add ACP sdk and test setup`
2. `feat: add opencode ACP client and session manager`
3. `feat: add backend orchestrator for hybrid agent flows`
4. `feat: expose ACP session routes and event stream`
5. `feat: replace starter page with web agent UI`
6. `test: cover session manager and ACP event mapping`

## Risks And Mitigations

1. ACP SDK transport APIs may differ from the docs summary.
Mitigation: validate the smallest possible real handshake with `opencode acp` before writing any UI.

2. SolidStart alpha server route APIs may have small runtime-specific quirks.
Mitigation: implement and verify one minimal JSON endpoint before building the full set.

3. One subprocess per browser session may become expensive.
Mitigation: accept this for the first slice; add pooling or persistence only after end-to-end correctness is proven.

4. Browser reload can orphan server processes.
Mitigation: add idle timeout cleanup in the session manager as part of hardening if it becomes visible during testing.

5. ACP feature gaps may tempt us to push unrelated backend logic into protocol adapters.
Mitigation: keep app-owned integrations in `src/lib/backend/*` and let the orchestrator compose ACP with normal backend code.

## Implementation Notes For The Next Worker

- Start with the backend handshake spike, not the UI.
- Do not let raw ACP payload shapes leak into Solid components.
- Do not let route handlers or app business logic depend directly on ACP transport details.
- Prefer lazy session creation on first send to avoid spawning `opencode` for passive page visits.
- Keep the first UI deliberately narrow: text prompts only, one active turn per session.
- If `opencode acp` turns out not to use plain stdio by default, adjust only the transport layer and keep the rest of the plan intact.
