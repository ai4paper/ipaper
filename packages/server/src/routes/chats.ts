import { Hono } from "hono";
import { z } from "zod";
import { chatStore } from "../lib/chat-store.js";
import { sessionManager } from "../lib/session-manager.js";

export const chatsRouter = new Hono();

const createSchema = z.object({ title: z.string().max(120).optional() });

chatsRouter.get("/", (c) => c.json(chatStore.getAllChats()));

chatsRouter.post("/", async (c) => {
  let body: unknown = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const chat = chatStore.createChat(parsed.data.title);
  return c.json(chat, 201);
});

chatsRouter.get("/:id", (c) => {
  const chat = chatStore.getChat(c.req.param("id"));
  if (!chat) return c.json({ error: "chat not found" }, 404);
  return c.json(chat);
});

chatsRouter.delete("/:id", (c) => {
  const id = c.req.param("id");
  const ok = chatStore.deleteChat(id);
  if (!ok) return c.json({ error: "chat not found" }, 404);
  sessionManager.delete(id);
  return c.json({ success: true });
});

chatsRouter.get("/:id/messages", (c) => {
  const chat = chatStore.getChat(c.req.param("id"));
  if (!chat) return c.json({ error: "chat not found" }, 404);
  return c.json(chatStore.getMessages(c.req.param("id")));
});
