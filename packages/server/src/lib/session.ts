import { AgentSession, type AgentSessionOptions } from "./agent-session.js";
import { chatStore } from "./chat-store.js";
import type { AgentEvent } from "./types.js";

type Subscriber = (event: AgentEvent) => void;

export class Session {
  readonly chatId: string;
  private agent: AgentSession;
  private subscribers = new Set<Subscriber>();
  private isListening = false;

  constructor(chatId: string, opts: AgentSessionOptions = {}) {
    this.chatId = chatId;
    this.agent = new AgentSession(opts);
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  sendMessage(content: string) {
    const stored = chatStore.addMessage(this.chatId, {
      role: "user",
      content,
    });
    this.broadcast({
      type: "user_message",
      messageId: stored.id,
      content: stored.content,
      timestamp: stored.timestamp,
    });
    this.agent.sendMessage(content);
    if (!this.isListening) {
      void this.startListening();
    }
  }

  close() {
    this.agent.close();
    this.subscribers.clear();
  }

  private async startListening() {
    if (this.isListening) return;
    this.isListening = true;
    try {
      for await (const message of this.agent.getOutputStream()) {
        this.handleSDKMessage(message);
      }
    } catch (err) {
      this.broadcast({
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private handleSDKMessage(message: unknown) {
    const m = message as {
      type: string;
      message?: { content?: unknown };
      subtype?: string;
      total_cost_usd?: number;
      duration_ms?: number;
    };

    if (m.type === "assistant") {
      const content = m.message?.content;
      const blocks = Array.isArray(content) ? content : [];
      for (const block of blocks as Array<{
        type: string;
        text?: string;
        name?: string;
        id?: string;
        input?: Record<string, unknown>;
      }>) {
        if (block.type === "text" && block.text) {
          const stored = chatStore.addMessage(this.chatId, {
            role: "assistant",
            content: block.text,
          });
          this.broadcast({
            type: "assistant_message",
            messageId: stored.id,
            content: stored.content,
            timestamp: stored.timestamp,
          });
        } else if (block.type === "tool_use") {
          this.broadcast({
            type: "tool_use",
            toolId: block.id ?? crypto.randomUUID(),
            toolName: block.name ?? "Unknown",
            toolInput: block.input ?? {},
          });
        }
      }
    } else if (m.type === "result") {
      this.broadcast({
        type: "result",
        success: m.subtype === "success",
        cost: m.total_cost_usd,
        duration: m.duration_ms,
      });
    }
  }

  private broadcast(event: AgentEvent) {
    for (const fn of this.subscribers) {
      try {
        fn(event);
      } catch (err) {
        console.error("subscriber error", err);
      }
    }
  }
}
