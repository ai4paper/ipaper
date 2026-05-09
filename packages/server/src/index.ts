import { Hono } from "hono";
import { cors } from "hono/cors";
import { agentRouter } from "./routes/agent.js";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.route("/api/agent", agentRouter);

app.get("/healthz", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 3001);

export default {
  port,
  fetch: app.fetch,
};

export type AppType = typeof app;
