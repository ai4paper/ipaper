import type { APIEvent } from "@solidjs/start/server";

import { setAgentSessionMode } from "~/lib/backend/orchestrator";

export async function POST(event: APIEvent) {
  try {
    const body = (await event.request.json()) as { sessionId?: string; modeId?: string };
    if (!body.sessionId || !body.modeId) {
      return Response.json({ error: "sessionId and modeId are required" }, { status: 400 });
    }

    const modes = await setAgentSessionMode({
      browserSessionId: body.sessionId,
      modeId: body.modeId,
    });

    return Response.json({ ok: true, modes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session mode";
    const status = message === "Unknown session" ? 404 : 500;

    return Response.json({ error: message }, { status });
  }
}
