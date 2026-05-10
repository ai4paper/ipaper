import type { ServerWebSocket } from "bun";
import { chatStore } from "../lib/chat-store.js";
import { sessionManager } from "../lib/session-manager.js";

interface ConnectionState {
  unsubscribers: Map<string, () => void>;
}

const states = new WeakMap<ServerWebSocket<unknown>, ConnectionState>();

function stateOf(ws: ServerWebSocket<unknown>): ConnectionState {
  let s = states.get(ws);
  if (!s) {
    s = { unsubscribers: new Map() };
    states.set(ws, s);
  }
  return s;
}

function safeSend(ws: ServerWebSocket<unknown>, message: unknown) {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    // socket closed
  }
}

function subscribeChat(ws: ServerWebSocket<unknown>, chatId: string) {
  const state = stateOf(ws);
  if (state.unsubscribers.has(chatId)) return;
  if (!chatStore.getChat(chatId)) {
    safeSend(ws, { type: "error", error: "chat not found", chatId });
    return;
  }
  const session = sessionManager.getOrCreate(chatId);
  const unsub = session.subscribe((event) => {
    safeSend(ws, { ...event, chatId });
  });
  state.unsubscribers.set(chatId, unsub);
}

function unsubscribeChat(ws: ServerWebSocket<unknown>, chatId: string) {
  const state = states.get(ws);
  if (!state) return;
  const unsub = state.unsubscribers.get(chatId);
  if (unsub) {
    unsub();
    state.unsubscribers.delete(chatId);
  }
}

export function handleWSOpen(ws: ServerWebSocket<unknown>) {
  safeSend(ws, { type: "connected" });
}

export function handleWSMessage(
  ws: ServerWebSocket<unknown>,
  data: string | Buffer
) {
  let parsed: unknown;
  try {
    const text = typeof data === "string" ? data : data.toString();
    parsed = JSON.parse(text);
  } catch {
    safeSend(ws, { type: "error", error: "invalid JSON" });
    return;
  }

  const msg = parsed as {
    type?: string;
    chatId?: string;
    content?: string;
  };

  if (msg.type === "subscribe" && typeof msg.chatId === "string") {
    subscribeChat(ws, msg.chatId);
  } else if (msg.type === "unsubscribe" && typeof msg.chatId === "string") {
    unsubscribeChat(ws, msg.chatId);
  } else if (
    msg.type === "chat" &&
    typeof msg.chatId === "string" &&
    typeof msg.content === "string" &&
    msg.content.trim().length > 0
  ) {
    if (!chatStore.getChat(msg.chatId)) {
      safeSend(ws, { type: "error", error: "chat not found", chatId: msg.chatId });
      return;
    }
    subscribeChat(ws, msg.chatId);
    sessionManager.getOrCreate(msg.chatId).sendMessage(msg.content);
  } else {
    safeSend(ws, { type: "error", error: "unknown message" });
  }
}

export function handleWSClose(ws: ServerWebSocket<unknown>) {
  const state = states.get(ws);
  if (!state) return;
  for (const unsub of state.unsubscribers.values()) {
    unsub();
  }
  states.delete(ws);
}
