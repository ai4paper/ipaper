# IPaper

A full-stack AI agent application for intelligent paper writing and editing, powered by the [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents). Run multi-step AI agents in your browser — desktop, tablet, and mobile PWA ready.

This repository is the IPaper monorepo. The published web package lives in `packages/web` as [`@ai4paper/ipaper`](https://www.npmjs.com/package/@ai4paper/ipaper).

## Monorepo Structure

```
ipaper/
├── packages/
│   ├── web/        # React + Vite frontend (published as @ai4paper/ipaper)
│   └── server/     # Bun HTTP + WebSocket server + Claude agent runtime
├── package.json    # Bun workspace root
└── bun.lock
```

## Tech Stack

### Frontend — `packages/web`

| Concern | Technology |
|---------|-----------|
| Runtime & tooling | [Bun](https://bun.sh) |
| Language | TypeScript (strict) |
| Framework | React 19 + Vite |
| UI components | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4 |
| Routing | [TanStack Router](https://tanstack.com/router) |
| Server state | [TanStack Query](https://tanstack.com/query) |
| Agent streaming | Native `WebSocket` (auto-reconnecting singleton) |

### Backend — `packages/server`

| Concern | Technology |
|---------|-----------|
| Runtime | [Bun](https://bun.sh) (`Bun.serve` upgrades to WebSocket) |
| HTTP framework | [Hono](https://hono.dev) for REST routes |
| Language | TypeScript (strict) |
| Agent runtime | `@anthropic-ai/claude-agent-sdk` |
| Streaming | WebSocket frames (one connection per browser session) |
| Validation | [Zod](https://zod.dev) |

## Agent Streaming Architecture

Each chat has a long-lived `Session` on the server that owns one Claude `query()` call. Subsequent user prompts are pushed onto the agent's input queue, so context, prompt cache, and tool state survive across turns. Events fan out to one or more browser WebSocket subscribers.

```
Browser WebSocket  ⇄  /ws  ⇄  Bun.serve
                              │
   {type:"subscribe",chatId}  ▶ SessionManager.getOrCreate(chatId)
                              │      └── AgentSession (long-lived query())
   {type:"chat",chatId,...}   ▶ session.sendMessage(content)
                              ◀ {type:"user_message", ...}
                              ◀ {type:"tool_use", toolName, toolInput}
                              ◀ {type:"assistant_message", ...}
                              ◀ {type:"result", success, cost, duration}
```

Persistent state — chats and message history — is served via REST:

- `GET    /api/chats`              — list chats
- `POST   /api/chats`              — create a chat
- `GET    /api/chats/:id`          — chat metadata
- `DELETE /api/chats/:id`          — delete chat & close its agent session
- `GET    /api/chats/:id/messages` — message history

No authentication is required — the Anthropic API key lives in `packages/server/.env`.

In development, Vite proxies `/api/*` and `/ws` to the Bun server.

## License

MIT
