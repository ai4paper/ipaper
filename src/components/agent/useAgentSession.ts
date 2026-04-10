import { createSignal, onCleanup } from "solid-js";

import type { BrowserEvent } from "~/lib/acp/types";
import type { ChatMessage, PlanEntryView, ToolCallView } from "~/components/agent/types";

interface SessionResponse {
  sessionId: string;
}

export function useAgentSession() {
  const [sessionId, setSessionId] = createSignal<string | null>(null);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = createSignal<ToolCallView[]>([]);
  const [plan, setPlan] = createSignal<PlanEntryView[]>([]);
  const [status, setStatus] = createSignal<"idle" | "connecting" | "ready" | "prompting" | "cancelling" | "closed">("idle");
  const [error, setError] = createSignal<string | null>(null);
  let source: EventSource | undefined;
  let currentAssistantMessageId: string | null = null;

  function ensureAssistantMessage() {
    if (currentAssistantMessageId) {
      return currentAssistantMessageId;
    }

    const id = crypto.randomUUID();
    currentAssistantMessageId = id;
    setMessages(prev => [...prev, { id, role: "assistant", text: "", status: "streaming" }]);
    return id;
  }

  function applyEvent(event: BrowserEvent) {
    switch (event.type) {
      case "status":
        setStatus(event.status);
        if (event.detail) {
          setError(event.detail);
        }
        break;
      case "message-delta": {
        if (event.role !== "assistant") {
          return;
        }

        const id = ensureAssistantMessage();
        setMessages(prev =>
          prev.map(message =>
            message.id === id ? { ...message, text: `${message.text}${event.text}`, status: "streaming" } : message,
          ),
        );
        break;
      }
      case "message-complete":
        if (currentAssistantMessageId) {
          setMessages(prev =>
            prev.map(message =>
              message.id === currentAssistantMessageId ? { ...message, status: "done" } : message,
            ),
          );
        }
        currentAssistantMessageId = null;
        break;
      case "tool-call":
        setToolCalls(prev => {
          const next = prev.filter(call => call.toolCallId !== event.toolCallId);
          next.unshift({
            toolCallId: event.toolCallId,
            title: event.title,
            kind: event.kind,
            status: event.status,
          });
          return next;
        });
        break;
      case "tool-call-update":
        setToolCalls(prev =>
          prev.map(call =>
            call.toolCallId === event.toolCallId
              ? { ...call, status: event.status, content: event.content ?? call.content }
              : call,
          ),
        );
        break;
      case "plan":
        setPlan(event.entries);
        break;
      case "error":
        setError(event.message);
        setStatus("ready");
        currentAssistantMessageId = null;
        break;
      case "turn-complete":
        setStatus(event.stopReason === "cancelled" ? "ready" : "ready");
        break;
    }
  }

  async function createSessionIfNeeded() {
    if (sessionId()) {
      return sessionId()!;
    }

    setStatus("connecting");
    const response = await fetch("/api/agent/session", { method: "POST" });
    const body = (await response.json()) as SessionResponse & { error?: string };
    if (!response.ok || !body.sessionId) {
      throw new Error(body.error ?? "Failed to create session");
    }

    setSessionId(body.sessionId);
    source = new EventSource(`/api/agent/events?sessionId=${encodeURIComponent(body.sessionId)}`);
    source.onmessage = message => {
      applyEvent(JSON.parse(message.data) as BrowserEvent);
    };
    source.onerror = () => {
      setError("Connection to the agent event stream was lost.");
      setStatus("closed");
    };

    return body.sessionId;
  }

  async function sendPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    try {
      setError(null);
      const activeSessionId = await createSessionIfNeeded();
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          text: trimmed,
          status: "done",
        },
      ]);
      currentAssistantMessageId = null;

      const response = await fetch("/api/agent/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: activeSessionId, text: trimmed }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Prompt failed");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Prompt failed");
      setStatus("ready");
    }
  }

  async function cancelPrompt() {
    if (!sessionId()) {
      return;
    }

    setStatus("cancelling");
    const response = await fetch("/api/agent/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId: sessionId() }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Cancel failed");
      setStatus("ready");
    }
  }

  onCleanup(() => {
    source?.close();
  });

  return {
    messages,
    toolCalls,
    plan,
    status,
    error,
    sendPrompt,
    cancelPrompt,
    canSend: () => status() === "idle" || status() === "ready" || status() === "closed",
    canCancel: () => status() === "prompting" || status() === "cancelling",
  };
}
