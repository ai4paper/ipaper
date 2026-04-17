import type { SessionModelState, SessionModeState } from "@agentclientprotocol/sdk";
import { createSignal, onCleanup } from "solid-js";

import type { BrowserEvent } from "~/lib/acp/types";
import { createAgentBrowserPreferences } from "~/components/agent/browserPreferences";
import type {
  ChatMessage,
  PlanEntryView,
  SessionModelOptionView,
  SessionModeOptionView,
  ToolCallView,
} from "~/components/agent/types";

interface SessionResponse {
  sessionId: string;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
  error?: string;
}

interface UseAgentSessionOptions {
  restoreLastCwd?: boolean;
}

export function useAgentSession(options: UseAgentSessionOptions = {}) {
  const preferences = createAgentBrowserPreferences();
  const restoreLastCwd = options.restoreLastCwd ?? true;
  if (!restoreLastCwd) {
    preferences.clearLastCwd();
  }

  const [sessionId, setSessionId] = createSignal<string | null>(null);
  const [cwd, setCwd] = createSignal(restoreLastCwd ? preferences.lastCwd() : "");
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [toolCalls, setToolCalls] = createSignal<ToolCallView[]>([]);
  const [plan, setPlan] = createSignal<PlanEntryView[]>([]);
  const [status, setStatus] = createSignal<"idle" | "connecting" | "ready" | "prompting" | "cancelling" | "closed">("idle");
  const [error, setError] = createSignal<string | null>(null);
  const [modeOptions, setModeOptions] = createSignal<SessionModeOptionView[]>([]);
  const [selectedModeId, setSelectedModeId] = createSignal<string | null>(null);
  const [modelOptions, setModelOptions] = createSignal<SessionModelOptionView[]>([]);
  const [selectedModelId, setSelectedModelId] = createSignal<string | null>(null);
  const [isUpdatingConfig, setIsUpdatingConfig] = createSignal(false);
  let source: EventSource | undefined;
  let currentStreamingMessageIds: Partial<Record<ChatMessage["role"], string | null>> = {};
  let sessionPromise: Promise<string> | null = null;

  function clearSession(clearHistory: boolean, nextError: string | null = null) {
    source?.close();
    source = undefined;
    currentStreamingMessageIds = {};
    sessionPromise = null;
    setSessionId(null);
    setModeOptions([]);
    setSelectedModeId(null);
    setModelOptions([]);
    setSelectedModelId(null);
    setStatus("idle");

    if (clearHistory) {
      setMessages([]);
      setToolCalls([]);
      setPlan([]);
    }

    setError(nextError);
  }

  function disconnectSession(nextError: string) {
    source?.close();
    source = undefined;
    currentStreamingMessageIds = {};
    sessionPromise = null;
    setSessionId(null);
    setStatus("closed");
    setError(nextError);
  }

  function applyModeState(modes?: SessionModeState | null) {
    setModeOptions(
      modes?.availableModes.map(mode => ({
        id: mode.id,
        name: mode.name,
        description: mode.description,
      })) ?? [],
    );
    setSelectedModeId(modes?.currentModeId ?? null);
    preferences.rememberMode(cwd(), modes?.currentModeId ?? null);
  }

  function applyModelState(models?: SessionModelState | null) {
    setModelOptions(
      models?.availableModels.map(model => ({
        id: model.modelId,
        name: model.name,
        description: model.description,
      })) ?? [],
    );
    setSelectedModelId(models?.currentModelId ?? null);
    preferences.rememberModel(cwd(), models?.currentModelId ?? null);
  }

  function updateCwd(value: string) {
    setCwd(value);
    preferences.rememberCwd(value);
  }

  async function restoreStoredConfig(activeSessionId: string, saved?: { modeId?: string; modelId?: string }) {

    if (saved?.modeId && saved.modeId !== selectedModeId()) {
      const response = await fetch("/api/agent/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: activeSessionId, modeId: saved.modeId }),
      });
      const body = (await response.json()) as { error?: string; modes?: SessionModeState | null };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update mode");
      }

      applyModeState(body.modes);
    }

    if (saved?.modelId && saved.modelId !== selectedModelId()) {
      const response = await fetch("/api/agent/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: activeSessionId, modelId: saved.modelId }),
      });
      const body = (await response.json()) as { error?: string; models?: SessionModelState | null };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update model");
      }

      applyModelState(body.models);
    }
  }

  function ensureStreamingMessage(role: ChatMessage["role"], timestamp: number) {
    const existingId = currentStreamingMessageIds[role];
    if (existingId) {
      return existingId;
    }

    const id = crypto.randomUUID();
    currentStreamingMessageIds[role] = id;
    setMessages(prev => [...prev, { id, role, text: "", status: "streaming", createdAt: timestamp, updatedAt: timestamp }]);
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
        const id = ensureStreamingMessage(event.role, event.timestamp);
        setMessages(prev =>
          prev.map(message =>
            message.id === id ? { ...message, text: `${message.text}${event.text}`, status: "streaming", updatedAt: event.timestamp } : message,
          ),
        );
        break;
      }
      case "message-complete": {
        const id = currentStreamingMessageIds[event.role];
        if (id) {
          setMessages(prev =>
            prev.map(message =>
              message.id === id ? { ...message, status: "done", updatedAt: event.timestamp } : message,
            ),
          );
        }
        currentStreamingMessageIds[event.role] = null;
        break;
      }
      case "mode-update":
        setSelectedModeId(event.currentModeId);
        break;
      case "tool-call":
        setToolCalls(prev => {
          const next = prev.filter(call => call.toolCallId !== event.toolCallId);
          next.unshift({
            toolCallId: event.toolCallId,
            title: event.title,
            kind: event.kind,
            status: event.status,
            createdAt: event.timestamp,
            updatedAt: event.timestamp,
          });
          return next;
        });
        break;
      case "tool-call-update":
        setToolCalls(prev =>
          prev.map(call =>
            call.toolCallId === event.toolCallId
              ? { ...call, status: event.status, content: event.content ?? call.content, updatedAt: event.timestamp }
              : call,
          ),
        );
        break;
      case "plan":
        setPlan(
          event.entries.map(entry => ({
            id: crypto.randomUUID(),
            content: entry.content,
            priority: entry.priority,
            status: entry.status,
            updatedAt: event.timestamp,
          })),
        );
        break;
      case "error":
        setMessages(prev =>
          prev.map(message =>
            message.status === "streaming" ? { ...message, status: "error", updatedAt: event.timestamp } : message,
          ),
        );
        setError(event.message);
        setStatus("ready");
        currentStreamingMessageIds = {};
        break;
      case "turn-complete":
        setStatus(event.stopReason === "cancelled" ? "ready" : "ready");
        break;
    }
  }

  async function createSessionIfNeeded(requestedCwd?: string) {
    if (sessionId()) {
      return sessionId()!;
    }
    if (sessionPromise) {
      return sessionPromise;
    }

    const sessionCwd = requestedCwd?.trim() ?? cwd().trim();
    if (!sessionCwd) {
      throw new Error("Working directory is required");
    }

    sessionPromise = (async () => {
      setStatus("connecting");
      const response = await fetch("/api/agent/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cwd: sessionCwd }),
      });
      const body = (await response.json()) as SessionResponse;
      if (!response.ok || !body.sessionId) {
        throw new Error(body.error ?? "Failed to create session");
      }

      const savedConfig = preferences.getConfig(sessionCwd);
      const restoredConfig = savedConfig ? { ...savedConfig } : undefined;
      updateCwd(sessionCwd);
      try {
        setSessionId(body.sessionId);
        applyModeState(body.modes);
        applyModelState(body.models);
        await restoreStoredConfig(body.sessionId, restoredConfig);
        source = new EventSource(`/api/agent/events?sessionId=${encodeURIComponent(body.sessionId)}`);
        source.onmessage = message => {
          applyEvent(JSON.parse(message.data) as BrowserEvent);
        };
        source.onerror = () => {
          disconnectSession("Connection to the agent event stream was lost.");
        };
      } catch (error) {
        clearSession(false);
        throw error;
      }

      return body.sessionId;
    })();

    try {
      return await sessionPromise;
    } finally {
      sessionPromise = null;
    }
  }

  async function startSession() {
    try {
      setError(null);
      await createSessionIfNeeded(cwd());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create session");
      setStatus("closed");
    }
  }

  async function closeSession() {
    const activeSessionId = sessionId();
    if (!activeSessionId) {
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/agent/session", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to close session");
      }

      clearSession(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to close session");
    }
  }

  async function sendPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return false;
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
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
      currentStreamingMessageIds = {};

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

      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Prompt failed");
      setStatus(sessionId() ? "ready" : "closed");
      return false;
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

  async function updateMode(modeId: string) {
    const activeSessionId = await createSessionIfNeeded();
    if (!modeId || modeId === selectedModeId()) {
      return;
    }

    setIsUpdatingConfig(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: activeSessionId, modeId }),
      });
      const body = (await response.json()) as { error?: string; modes?: SessionModeState | null };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update mode");
      }

      applyModeState(body.modes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update mode");
    } finally {
      setIsUpdatingConfig(false);
    }
  }

  async function updateModel(modelId: string) {
    const activeSessionId = await createSessionIfNeeded();
    if (!modelId || modelId === selectedModelId()) {
      return;
    }

    setIsUpdatingConfig(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: activeSessionId, modelId }),
      });
      const body = (await response.json()) as { error?: string; models?: SessionModelState | null };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to update model");
      }

      applyModelState(body.models);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update model");
    } finally {
      setIsUpdatingConfig(false);
    }
  }

  onCleanup(() => {
    source?.close();
  });

  const hasCwd = () => !!cwd().trim();
  const hasActiveSession = () => !!sessionId();
  const isCreatingSession = () => !!sessionPromise;
  const isPromptBusy = () => status() === "prompting" || status() === "cancelling";

  return {
    cwd,
    messages,
    toolCalls,
    plan,
    status,
    error,
    modeOptions,
    selectedModeId,
    modelOptions,
    selectedModelId,
    setCwd: updateCwd,
    startSession,
    closeSession,
    sendPrompt,
    cancelPrompt,
    updateMode,
    updateModel,
    canStartSession: () => !hasActiveSession() && !isCreatingSession() && hasCwd() && !isPromptBusy(),
    canCloseSession: () => hasActiveSession() && !isCreatingSession() && !isPromptBusy(),
    canSend: () => {
      if (isCreatingSession() || isUpdatingConfig() || !hasCwd() || isPromptBusy()) {
        return false;
      }

      if (!hasActiveSession()) {
        return true;
      }

      return status() === "ready";
    },
    canCancel: () => status() === "prompting" || status() === "cancelling",
    canConfigure: () => hasActiveSession() && !isCreatingSession() && !isUpdatingConfig() && status() === "ready",
  };
}
