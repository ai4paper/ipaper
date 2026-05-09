# IPaper

A full-stack AI agent application for intelligent paper writing and editing, powered by the [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents). Run multi-step AI agents in your browser — desktop, tablet, and mobile PWA ready.

This repository is the IPaper monorepo. The published CLI and web package lives in `packages/web` as [`@ai4paper/ipaper`](https://www.npmjs.com/package/@ai4paper/ipaper).

## Monorepo Structure

```
ipaper/
├── packages/
│   ├── web/        # React + Vite frontend (published as @ai4paper/ipaper)
│   ├── server/     # Bun HTTP API server + Claude agent runtime
│   └── ui/         # Shared shadcn/ui component library
├── package.json    # Bun workspace root
└── bun.lockb
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
| Agent streaming | `EventSource` (SSE) |

### Backend — `packages/server`

| Concern | Technology |
|---------|-----------|
| Runtime | [Bun](https://bun.sh) |
| HTTP framework | [Hono](https://hono.dev) (`hono/streaming` for SSE) |
| Language | TypeScript (strict) |
| Agent runtime | `@anthropic-ai/sdk` — Claude Agent SDK |
| Streaming | Server-Sent Events (`streamSSE` from Hono) |
| Validation | [Zod](https://zod.dev) |

### Shared — `packages/ui`

| Concern | Technology |
|---------|-----------|
| Component library | [shadcn/ui](https://ui.shadcn.com) (copy-owned) |
| Styling | Tailwind CSS v4 |

## Agent Streaming Architecture

The frontend opens an `EventSource` connection to the Bun server, which runs the Claude agent loop and streams tokens back in real time via SSE:

```
Browser EventSource
  → GET /api/agent/stream?prompt=...
  → Bun server: anthropic.messages.stream()
  → SSE chunks → browser renders tokens as they arrive
```

No authentication is required — the Anthropic API key lives in `packages/server/.env`.

In development, Vite proxies `/api/*` to the Bun server.

## License

MIT
