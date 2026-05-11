import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Square } from "lucide-react";
import { ToolUseBlock } from "./tool-use-block";
import { Markdown } from "./markdown";
import { useChatMessagesQuery, chatKeys } from "@/lib/api";
import { useChatWebSocket } from "@/lib/use-chat-ws";
import type {
  AgentEvent,
  ChatMessage,
  DisplayMessage,
} from "@/lib/types";

interface ChatWindowProps {
  chatId: string;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const qc = useQueryClient();
  const { data: persisted = [], isLoading } = useChatMessagesQuery(chatId);

  const [liveEvents, setLiveEvents] = useState<AgentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [prompt, setPrompt] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      if (event.type === "result") {
        setIsStreaming(false);
        setLiveEvents([]);
        void qc.invalidateQueries({
          queryKey: chatKeys.messages(chatId),
        });
        void qc.invalidateQueries({ queryKey: chatKeys.list() });
        return;
      }
      if (event.type === "error") {
        setError(event.error);
        setIsStreaming(false);
        return;
      }
      setLiveEvents((prev) => [...prev, event]);
    },
    [chatId, qc]
  );

  const { connected, send } = useChatWebSocket(chatId, handleEvent);

  useEffect(() => {
    setLiveEvents([]);
    setError(null);
    setIsStreaming(false);
    setPrompt("");
  }, [chatId]);

  const messages = useMemo(
    () => mergeMessages(persisted, liveEvents),
    [persisted, liveEvents]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [prompt]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming || !connected) return;
    setPrompt("");
    setError(null);
    setIsStreaming(true);
    send(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center justify-end px-6 text-xs">
        {connected ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Connecting…
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          {isLoading && messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) =>
                m.kind === "tool" ? (
                  <ToolUseBlock key={m.id} tool={m.tool} />
                ) : (
                  <MessageBubble key={m.id} message={m} />
                )
              )}
              {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-foreground/50" />
                  Thinking…
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl rounded-2xl border border-border/70 bg-card/40 shadow-2xl shadow-black/20 backdrop-blur-md focus-within:border-border"
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connected
                ? "Ask anything — Read/Grep/WebSearch tools available"
                : "Connecting to the agent…"
            }
            disabled={!connected}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
          />
          <div className="flex items-center justify-end gap-2 px-3 pb-3 text-xs">
            <span className="mr-auto text-muted-foreground">
              Claude Sonnet 4.6
            </span>
            {isStreaming ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-muted-foreground"
              >
                <Square className="size-3 fill-current" />
                Streaming
              </button>
            ) : (
              <button
                type="submit"
                disabled={prompt.trim() === "" || !connected}
                aria-label="Send"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: Extract<DisplayMessage, { kind: "text" }>;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-medium text-foreground/80">
        AI
      </div>
      <div className="min-w-0 flex-1">
        <Markdown content={message.content} />
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Start the conversation
        </h1>
        <p className="text-sm text-muted-foreground">
          The agent will stream tool use and replies in real time.
        </p>
      </div>
    </div>
  );
}

function mergeMessages(
  persisted: ChatMessage[],
  live: AgentEvent[]
): DisplayMessage[] {
  const persistedIds = new Set(persisted.map((m) => m.id));
  const out: DisplayMessage[] = persisted.map((m) => ({
    kind: "text",
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));

  for (const event of live) {
    if (event.type === "user_message" || event.type === "assistant_message") {
      if (persistedIds.has(event.messageId)) continue;
      out.push({
        kind: "text",
        id: event.messageId,
        role: event.type === "user_message" ? "user" : "assistant",
        content: event.content,
        timestamp: event.timestamp,
      });
    } else if (event.type === "tool_use") {
      out.push({
        kind: "tool",
        id: event.toolId,
        timestamp: new Date().toISOString(),
        tool: {
          toolId: event.toolId,
          toolName: event.toolName,
          toolInput: event.toolInput,
        },
      });
    }
  }
  return out;
}
