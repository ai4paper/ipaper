import type { APIEvent } from "@solidjs/start/server";

import { closeAgentSession, createAgentSession } from "~/lib/backend/orchestrator";

export async function POST(event: APIEvent) {
  try {
    const body = (await event.request.json()) as { cwd?: string };
    const cwd = body.cwd?.trim();
    if (!cwd) {
      return Response.json({ error: "cwd is required" }, { status: 400 });
    }

    const result = await createAgentSession(cwd);

    return Response.json({
      sessionId: result.session.id,
      status: result.session.status,
      capabilities: result.initialize.agentCapabilities,
      agentInfo: result.initialize.agentInfo,
      modes: result.session.modes ?? null,
      models: result.session.models ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 500 },
    );
  }
}

export async function DELETE(event: APIEvent) {
  try {
    const body = (await event.request.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    await closeAgentSession(body.sessionId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to close session";
    const status = message === "Unknown session" ? 404 : 500;

    return Response.json({ error: message }, { status });
  }
}
