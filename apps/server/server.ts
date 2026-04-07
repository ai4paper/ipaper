import { Readable } from "node:stream";

import Fastify from "fastify";

import { agentManager } from "./agent";

type InvokeBody = {
  messages?: unknown;
  threadId?: unknown;
  config?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

const DEFAULT_AGENT_ID = "ipaper-supervisor";
const port = Number(process.env.PORT ?? 2024);

function getConfig(threadId: string, config?: Record<string, unknown>) {
  return {
    ...config,
    configurable: {
      ...(typeof config?.configurable === "object" && config.configurable !== null
        ? (config.configurable as Record<string, unknown>)
        : {}),
      thread_id: threadId,
    },
  };
}

function readBody(body: InvokeBody) {
  return {
    messages: Array.isArray(body.messages) ? body.messages : [],
    threadId:
      typeof body.threadId === "string" && body.threadId.length > 0
        ? body.threadId
        : crypto.randomUUID(),
    config: body.config,
    context: body.context,
  };
}

function notFound(message: string) {
  return { error: message };
}

async function invokeAgent(body: InvokeBody, agentId: string) {
  if (!agentManager.hasAgent(agentId)) {
    throw Object.assign(new Error(`Unknown agent '${agentId}'.`), { statusCode: 404 });
  }

  const parsedBody = readBody(body);
  if (parsedBody.messages.length === 0) {
    throw Object.assign(new Error("Request body must include a non-empty messages array."), {
      statusCode: 400,
    });
  }

  const { agent, metadata } = agentManager.getAgent(agentId);
  const config = getConfig(parsedBody.threadId, parsedBody.config);
  const result = await agent.invoke(
    {
      messages: parsedBody.messages,
      ...(parsedBody.context ? { context: parsedBody.context } : {}),
    },
    config,
  );

  return {
    agent: metadata,
    threadId: parsedBody.threadId,
    result,
  };
}

function toNodeStream(stream: unknown) {
  if (stream instanceof Readable) {
    return stream;
  }

  if (stream instanceof ReadableStream) {
    return Readable.fromWeb(stream);
  }

  return Readable.from(stream as AsyncIterable<Uint8Array>);
}

async function streamAgent(body: InvokeBody, agentId: string) {
  if (!agentManager.hasAgent(agentId)) {
    throw Object.assign(new Error(`Unknown agent '${agentId}'.`), { statusCode: 404 });
  }

  const parsedBody = readBody(body);
  if (parsedBody.messages.length === 0) {
    throw Object.assign(new Error("Request body must include a non-empty messages array."), {
      statusCode: 400,
    });
  }

  const { agent } = agentManager.getAgent(agentId);
  const config = getConfig(parsedBody.threadId, parsedBody.config);
  const stream = agent.streamEvents(
    {
      messages: parsedBody.messages,
      ...(parsedBody.context ? { context: parsedBody.context } : {}),
    },
    {
      ...config,
      version: "v2",
      encoding: "text/event-stream",
    },
  );

  return {
    stream: toNodeStream(stream),
    threadId: parsedBody.threadId,
  };
}
const app = Fastify({
  logger: true,
});

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : "Internal server error.";
  const statusCode =
    typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? ((error as { statusCode: number }).statusCode ?? 500)
      : 500;

  reply.status(statusCode).send({ error: message });
});

app.get("/health", async () => ({ ok: true, agents: agentManager.listAgents() }));

app.get("/agents", async () => ({ agents: agentManager.listAgents() }));

app.post<{ Body: InvokeBody }>("/invoke", async (request) => {
  return invokeAgent(request.body, DEFAULT_AGENT_ID);
});

app.post<{ Params: { agentId: string }; Body: InvokeBody }>(
  "/agents/:agentId/invoke",
  async (request) => {
    return invokeAgent(request.body, request.params.agentId);
  },
);

app.post<{ Params: { agentId: string }; Body: InvokeBody }>(
  "/agents/:agentId/stream",
  async (request, reply) => {
    const { stream, threadId } = await streamAgent(request.body, request.params.agentId);

    reply.raw.setHeader("cache-control", "no-cache");
    reply.raw.setHeader("connection", "keep-alive");
    reply.raw.setHeader("content-type", "text/event-stream");
    reply.raw.setHeader("x-thread-id", threadId);
    reply.hijack();
    stream.pipe(reply.raw);
  },
);

app.get<{ Params: { agentId: string }; Querystring: { threadId?: string } }>(
  "/agents/:agentId/state",
  async (request) => {
    const { agentId } = request.params;
    if (!agentManager.hasAgent(agentId)) {
      throw Object.assign(new Error(`Unknown agent '${agentId}'.`), { statusCode: 404 });
    }

    const threadId = request.query.threadId;
    if (!threadId) {
      throw Object.assign(new Error("Query parameter 'threadId' is required."), {
        statusCode: 400,
      });
    }

    const { agent, metadata } = agentManager.getAgent(agentId);
    const state = await agent.getState({ configurable: { thread_id: threadId } });

    return {
      agent: metadata,
      threadId,
      state,
    };
  },
);

app.setNotFoundHandler((_request, reply) => {
  reply.status(404).send(notFound("Route not found."));
});

await app.listen({ port, host: "0.0.0.0" });
