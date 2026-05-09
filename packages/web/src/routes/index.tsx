import { useRef, useState } from "react";

export function IndexComponent() {
  const [prompt, setPrompt] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Close any existing stream before starting a new one
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setStreamedText("");
    setError(null);
    setIsStreaming(true);

    const es = new EventSource(
      "/api/agent/stream?prompt=" + encodeURIComponent(prompt)
    );
    esRef.current = es;

    es.addEventListener("delta", (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { text: string };
      setStreamedText((prev) => prev + data.text);
    });

    es.addEventListener("done", () => {
      es.close();
      esRef.current = null;
      setIsStreaming(false);
    });

    es.addEventListener("error", () => {
      es.close();
      esRef.current = null;
      setIsStreaming(false);
      setError("Stream error — check that the server is running.");
    });
  }

  function handleAbort() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsStreaming(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">IPaper</h1>
        <p className="text-sm text-neutral-500">
          Describe your paper and let the AI draft it for you.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="min-h-[120px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          placeholder="e.g. Write a short paper on the role of transformers in modern NLP research…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isStreaming}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isStreaming || prompt.trim() === ""}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStreaming ? "Generating…" : "Generate"}
          </button>

          {isStreaming && (
            <button
              type="button"
              onClick={handleAbort}
              className="rounded-lg border border-neutral-200 px-5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              Stop
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {streamedText && (
        <section className="rounded-lg border border-neutral-200 bg-white px-6 py-5 shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800">
            {streamedText}
          </pre>
        </section>
      )}
    </main>
  );
}
