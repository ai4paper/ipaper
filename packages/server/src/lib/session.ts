import { AgentSession, type AgentSessionOptions } from "./agent-session.js";
import { chatStore } from "./chat-store.js";
import type { AgentEvent } from "./types.js";

type Subscriber = (event: AgentEvent) => void;

const DEFAULT_IDLE_TIMEOUT_MS = (() => {
  const raw = process.env.IPAPER_AGENT_IDLE_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 60 * 1000;
})();

export class Session {
  readonly chatId: string;
  private opts: AgentSessionOptions;
  private agent: AgentSession | null = null;
  private subscribers = new Set<Subscriber>();
  private isListening = false;
  private knownSessionId: string | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimeoutMs: number;

  constructor(
    chatId: string,
    opts: AgentSessionOptions = {},
    idleTimeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS
  ) {
    this.chatId = chatId;
    this.opts = opts;
    this.idleTimeoutMs = idleTimeoutMs;
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  sendMessage(content: string) {
    this.clearIdleTimer();
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
    this.ensureAgent().sendMessage(content);
    if (!this.isListening) {
      void this.startListening();
    }
  }

  close() {
    this.clearIdleTimer();
    this.closeAgent();
    this.subscribers.clear();
  }

  private ensureAgent(): AgentSession {
    if (this.agent) return this.agent;
    const resumeSessionId = chatStore.getAgentSessionId(this.chatId);
    this.agent = new AgentSession({ ...this.opts, resumeSessionId });
    return this.agent;
  }

  private closeAgent() {
    if (this.agent) {
      this.agent.close();
      this.agent = null;
    }
  }

  private async startListening() {
    if (this.isListening) return;
    const agent = this.agent;
    if (!agent) return;
    this.isListening = true;
    try {
      for await (const message of agent.getOutputStream()) {
        this.handleSDKMessage(message);
      }
    } catch (err) {
      this.broadcast({
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.isListening = false;
    }
  }

  private handleSDKMessage(message: unknown) {
    const m = message as {
      type: string;
      session_id?: string;
      message?: { content?: unknown };
      subtype?: string;
      total_cost_usd?: number;
      duration_ms?: number;
    };

    if (m.session_id) {
      this.captureSessionId(m.session_id);
    }

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
      this.startIdleTimer();
    }
  }

  private captureSessionId(sessionId: string) {
    if (this.knownSessionId === sessionId) return;
    this.knownSessionId = sessionId;
    chatStore.setAgentSessionId(this.chatId, sessionId);
  }

  private startIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.closeAgent();
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
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
