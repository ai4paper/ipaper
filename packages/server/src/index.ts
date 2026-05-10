import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ServerWebSocket } from "bun";
import { chatsRouter } from "./routes/chats.js";
import {
  handleWSClose,
  handleWSMessage,
  handleWSOpen,
} from "./routes/agent-ws.js";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.route("/api/chats", chatsRouter);

app.get("/healthz", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 3001);

export default {
  port,
  fetch(req: Request, server: import("bun").Server<undefined>) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return undefined;
      return new Response("Upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws: ServerWebSocket<unknown>) {
      handleWSOpen(ws);
    },
    message(ws: ServerWebSocket<unknown>, data: string | Buffer) {
      handleWSMessage(ws, data);
    },
    close(ws: ServerWebSocket<unknown>) {
      handleWSClose(ws);
    },
  },
};

export type AppType = typeof app;
