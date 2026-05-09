import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function IndexComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [prompt]);

  async function startStream(userPrompt: string) {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userPrompt,
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    streamingIdRef.current = assistantMsg.id;

    const history = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let event = "";
      let data = "";

      const dispatch = () => {
        if (event === "delta" && data) {
          try {
            const { text } = JSON.parse(data) as { text: string };
            const id = streamingIdRef.current;
            if (id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, content: m.content + text } : m
                )
              );
            }
          } catch {}
        } else if (event === "error" && data) {
          try {
            const { message } = JSON.parse(data) as { message: string };
            setError(message);
          } catch {
            setError("Stream error.");
          }
        }
        event = "";
        data = "";
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);

          if (line === "") {
            dispatch();
          } else if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const chunk = line.slice(5).trimStart();
            data = data ? data + "\n" + chunk : chunk;
          }
        }
      }
      dispatch();
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError("Stream error — check that the server is running.");
      }
    } finally {
      abortRef.current = null;
      streamingIdRef.current = null;
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming) return;
    setPrompt("");
    void startStream(trimmed);
  }

  function handleAbort() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    streamingIdRef.current = null;
    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          {messages.length === 0 ? (
            <EmptyState onPick={(p) => setPrompt(p)} />
          ) : (
            <div className="flex flex-col gap-8">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={
                    isStreaming && streamingIdRef.current === m.id
                  }
                />
              ))}
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
            placeholder="@ for files/agents; / for commands; ! for shell"
            rows={1}
            className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          />

          <div className="flex items-center justify-between gap-2 px-3 pb-3">
            <div className="flex items-center gap-1">
              <ToolbarButton label="Attach">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </ToolbarButton>
              <ToolbarButton label="Expand">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3l-7 7" />
                  <path d="M3 21l7-7" />
                </svg>
              </ToolbarButton>
              <ToolbarButton label="Permissions">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </ToolbarButton>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a9 9 0 0 0 0 18" />
                </svg>
                Default
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <span className="text-foreground/80">A</span>
                Claude Sonnet 4.6
              </button>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleAbort}
                  className="inline-flex items-center gap-1.5 rounded-md bg-destructive/15 px-2.5 py-1 text-destructive hover:bg-destructive/25"
                >
                  <span className="size-2 rounded-sm bg-current" />
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={prompt.trim() === ""}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-emerald-400 transition-opacity hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Send
                </button>
              )}
              <button
                type="submit"
                disabled={prompt.trim() === "" || isStreaming}
                aria-label="Send"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
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
        <article className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-foreground/90">
          {message.content}
          {isStreaming && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-[1.05em] w-[2px] -translate-y-[2px] animate-pulse bg-foreground align-middle"
            />
          )}
        </article>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const suggestions = [
    "Summarize the latest research on retrieval-augmented generation.",
    "Explain how attention works in transformer models.",
    "Compare diffusion and autoregressive image generators.",
    "Outline a literature review on graph neural networks.",
  ];
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-foreground/5 text-foreground/70">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          What can I help you with?
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask anything. The agent will stream a response in real time.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
