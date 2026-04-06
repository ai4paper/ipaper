import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { agent } from "./agent.ts";

// ---------------------------------------------------------------------------
// Hono server implementing the LangGraph Platform API subset
// needed by @langchain/react's useStream hook.
//
// Endpoints:
//   POST   /threads                          → create thread
//   POST   /threads/:threadId/runs/stream    → stream a run (SSE)
//   POST   /threads/:threadId/runs           → create a run (enqueue)
//   GET    /threads/:threadId/state          → get thread state
//   GET    /threads/:threadId/history        → get thread history
//   POST   /threads/:threadId/runs/:runId/cancel → cancel a run
//   GET    /threads/:threadId/runs/:runId/join    → join a stream
// ---------------------------------------------------------------------------

const app = new Hono();

app.use("/*", cors());

// In-memory thread store for tracking thread metadata
const threadStore = new Map<
  string,
  { thread_id: string; created_at: string; metadata: Record<string, unknown> }
>();

// In-memory run tracker
const activeRuns = new Map<string, AbortController>();

// Helper: generate a UUID
function genId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// POST /threads — Create a new thread
// ---------------------------------------------------------------------------
app.post("/threads", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const threadId = (body.thread_id as string) ?? genId();
  const thread = {
    thread_id: threadId,
    created_at: new Date().toISOString(),
    metadata: (body.metadata as Record<string, unknown>) ?? {},
  };
  threadStore.set(threadId, thread);
  return c.json(thread);
});

// ---------------------------------------------------------------------------
// GET/POST /threads/:threadId/state — Get the current thread state
// ---------------------------------------------------------------------------
const handleGetState = async (c: any) => {
  const threadId = c.req.param("threadId");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = await (agent as any).getState({
      configurable: { thread_id: threadId },
    });
    return c.json({
      values: state.values ?? {},
      next: state.next ?? [],
      tasks: state.tasks ?? [],
      checkpoint: state.config?.configurable ?? {},
      metadata: state.metadata ?? {},
      created_at: new Date().toISOString(),
      parent_config: state.parentConfig ?? null,
    });
  } catch {
    return c.json({
      values: {},
      next: [],
      tasks: [],
      checkpoint: null,
      metadata: {},
      created_at: new Date().toISOString(),
      parent_config: null,
    });
  }
};
app.get("/threads/:threadId/state", handleGetState);
app.post("/threads/:threadId/state", handleGetState);


// ---------------------------------------------------------------------------
// GET/POST /threads/:threadId/history — Get thread state history
// ---------------------------------------------------------------------------
const handleGetHistory = async (c: any) => {
  const threadId = c.req.param("threadId");
  // POST body may contain { limit }, query param as fallback
  let limit = 10;
  try {
    const body = await c.req.json().catch(() => ({}));
    if (body?.limit != null) limit = body.limit;
  } catch {
    const q = c.req.query("limit");
    if (q) limit = parseInt(q, 10);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history = (agent as any).getStateHistory({
      configurable: { thread_id: threadId },
    });
    const states: unknown[] = [];
    let count = 0;
    for await (const state of history) {
      if (count >= limit) break;
      states.push({
        values: state.values ?? {},
        next: state.next ?? [],
        tasks: state.tasks ?? [],
        checkpoint: state.config?.configurable ?? {},
        metadata: state.metadata ?? {},
        created_at: new Date().toISOString(),
        parent_config: state.parentConfig ?? null,
      });
      count++;
    }
    return c.json(states);
  } catch {
    return c.json([]);
  }
};
app.get("/threads/:threadId/history", handleGetHistory);
app.post("/threads/:threadId/history", handleGetHistory);

// ---------------------------------------------------------------------------
// POST /threads/:threadId/runs/stream — Stream a run (SSE)
// ---------------------------------------------------------------------------
app.post("/threads/:threadId/runs/stream", async (c) => {
  const threadId = c.req.param("threadId");
  const body = (await c.req.json()) as Record<string, unknown>;
  const {
    input,
    config,
    command,
    stream_mode,
    checkpoint,
  } = body;

  // Ensure thread exists
  if (!threadStore.has(threadId)) {
    threadStore.set(threadId, {
      thread_id: threadId,
      created_at: new Date().toISOString(),
      metadata: {},
    });
  }

  const runId = genId();
  const abortController = new AbortController();
  activeRuns.set(runId, abortController);

  // Build the config for the graph
  const cfgObj = (config ?? {}) as Record<string, unknown>;
  const graphConfig = {
    configurable: {
      thread_id: threadId,
      ...((checkpoint as Record<string, unknown>) ?? {}),
      ...((cfgObj.configurable as Record<string, unknown>) ?? {}),
    },
    recursionLimit: (cfgObj.recursion_limit as number) ?? 25,
    signal: abortController.signal,
  };

  // Determine stream modes
  const requestedModes: string[] = Array.isArray(stream_mode)
    ? (stream_mode as string[])
    : typeof stream_mode === "string"
      ? [stream_mode]
      : ["values"];

  const streamModes = [...new Set([...requestedModes])];

  return streamSSE(c, async (sseStream) => {
    try {
      // Send metadata event
      await sseStream.writeSSE({
        event: "metadata",
        data: JSON.stringify({ run_id: runId, thread_id: threadId }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph = agent as any;

      // Map "messages-tuple" to "messages" for graph.stream()
      const graphStreamModes = streamModes.map((m) =>
        m === "messages-tuple" ? "messages" : m,
      );

      // Ensure we always stream "values" so we can send final state
      if (!graphStreamModes.includes("values")) {
        graphStreamModes.push("values");
      }

      // Determine if we're doing a command resume or a fresh input
      const streamInput = command ? undefined : input;

      // Stream the graph
      const eventStream = await graph.stream(streamInput, {
        ...graphConfig,
        streamMode: graphStreamModes,
        ...(command ? { command } : {}),
      });

      for await (const chunk of eventStream) {
        if (abortController.signal.aborted) break;

        // When multiple stream modes, the stream yields [mode, data] tuples
        let mode: string;
        let data: unknown;

        if (Array.isArray(chunk) && chunk.length === 2 && typeof chunk[0] === "string") {
          [mode, data] = chunk;
        } else {
          // Single stream mode
          mode = graphStreamModes[0] ?? "values";
          data = chunk;
        }

        // Map graph stream modes to SSE event names
        switch (mode) {
          case "values":
            if (streamModes.includes("values")) {
              await sseStream.writeSSE({
                event: "values",
                data: JSON.stringify(data),
              });
            }
            break;

          case "updates":
            if (streamModes.includes("updates")) {
              await sseStream.writeSSE({
                event: "updates",
                data: JSON.stringify(data),
              });
            }
            break;

          case "messages": {
            // Messages mode produces [message, metadata] tuples
            const [msg, msgMeta] = data as [unknown, unknown];
            if (streamModes.includes("messages-tuple")) {
              // Check if this is a partial (chunk) or complete message
              const msgAny = msg as Record<string, unknown>;
              if (msgAny?.type === "AIMessageChunk") {
                await sseStream.writeSSE({
                  event: "messages/partial",
                  data: JSON.stringify([msg, msgMeta]),
                });
              } else {
                await sseStream.writeSSE({
                  event: "messages/complete",
                  data: JSON.stringify([msg, msgMeta]),
                });
              }
            }
            break;
          }

          case "custom":
            if (streamModes.includes("custom")) {
              await sseStream.writeSSE({
                event: "custom",
                data: JSON.stringify(data),
              });
            }
            break;

          case "debug":
            if (streamModes.includes("debug")) {
              await sseStream.writeSSE({
                event: "debug",
                data: JSON.stringify(data),
              });
            }
            break;

          default:
            // Forward unknown modes as-is
            await sseStream.writeSSE({
              event: mode,
              data: JSON.stringify(data),
            });
            break;
        }
      }

      // Send end event
      await sseStream.writeSSE({
        event: "end",
        data: "null",
      });
    } catch (error: unknown) {
      if ((error as Error).name !== "AbortError") {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Stream error:", errorMessage);

        // Send error as a proper SSE event the client can parse
        try {
          await sseStream.writeSSE({
            event: "error",
            data: JSON.stringify({
              message: errorMessage,
              code: "INTERNAL_ERROR",
            }),
          });
          await sseStream.writeSSE({
            event: "end",
            data: "null",
          });
        } catch {
          // SSE stream already closed
        }
      }
    } finally {
      activeRuns.delete(runId);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /threads/:threadId/runs — Create a run (for enqueue)
// ---------------------------------------------------------------------------
app.post("/threads/:threadId/runs", async (c) => {
  const _body = await c.req.json();
  const threadId = c.req.param("threadId");
  const runId = genId();

  return c.json({
    run_id: runId,
    thread_id: threadId,
    status: "pending",
    created_at: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /threads/:threadId/runs/:runId/cancel — Cancel a run
// ---------------------------------------------------------------------------
app.post("/threads/:threadId/runs/:runId/cancel", async (c) => {
  const runId = c.req.param("runId");
  const controller = activeRuns.get(runId);
  if (controller) {
    controller.abort();
    activeRuns.delete(runId);
  }
  return c.json({ status: "cancelled" });
});

// ---------------------------------------------------------------------------
// GET /threads/:threadId/runs/:runId/join — Join an existing stream
// ---------------------------------------------------------------------------
app.get("/threads/:threadId/runs/:runId/join", async (c) => {
  const runId = c.req.param("runId");
  if (!activeRuns.has(runId)) {
    return c.json({ error: "Run not found or already completed" }, 404);
  }
  return c.json({ status: "active" });
});

// ---------------------------------------------------------------------------
// POST /assistants/search — Return available assistants
// ---------------------------------------------------------------------------
app.post("/assistants/search", async (_c) => {
  return _c.json([
    {
      assistant_id: "ipaper-agent",
      graph_id: "ipaper-agent",
      name: "iPaper Agent",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {},
      metadata: {},
    },
  ]);
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/ok", (c) => c.json({ ok: true }));

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
const port = parseInt(process.env.PORT ?? "2024", 10);
console.log(`🚀 iPaper server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
