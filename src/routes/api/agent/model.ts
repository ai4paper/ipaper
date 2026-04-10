import type { APIEvent } from "@solidjs/start/server";

import { setAgentSessionModel } from "~/lib/backend/orchestrator";

export async function POST(event: APIEvent) {
  try {
    const body = (await event.request.json()) as { sessionId?: string; modelId?: string };
    if (!body.sessionId || !body.modelId) {
      return Response.json({ error: "sessionId and modelId are required" }, { status: 400 });
    }

    const models = await setAgentSessionModel({
      browserSessionId: body.sessionId,
      modelId: body.modelId,
    });

    return Response.json({ ok: true, models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session model";
    const status = message === "Unknown session" ? 404 : 500;

    return Response.json({ error: message }, { status });
  }
}
