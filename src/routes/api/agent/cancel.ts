import type { APIEvent } from "@solidjs/start/server";

import { cancelAgentSession } from "~/lib/backend/orchestrator";

export async function POST(event: APIEvent) {
  try {
    const body = (await event.request.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    await cancelAgentSession(body.sessionId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel prompt";
    const status = message === "Unknown session" ? 404 : 500;

    return Response.json({ error: message }, { status });
  }
}
