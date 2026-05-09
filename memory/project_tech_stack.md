---
name: IPaper tech stack decisions
description: Finalized monorepo structure and technology choices for the ipaper project
type: project
---

Monorepo with Bun workspaces, three packages: web (React+Vite+shadcn), server (Bun HTTP+Anthropic SDK), ui (shared shadcn components).

**Why:** User explicitly chose this layout — separate concerns, Vite proxies /api/* to Bun server in dev.

**How to apply:** Always scaffold new features with this three-package split. Do not merge web and server into one package.

Key choices:
- Frontend: React 19 + Vite, shadcn/ui + Tailwind CSS v4, TanStack Router, TanStack Query, EventSource SSE
- Backend: Bun runtime + Hono framework (hono/streaming for SSE), @anthropic-ai/sdk (latest ~0.95), Zod validation
- Auth: None — single-user local tool, API key in packages/server/.env
- Agent streaming: SSE via Hono streamSSE, not WebSocket
