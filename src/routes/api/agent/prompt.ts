import type { APIEvent } from "@solidjs/start/server";

import { promptAgentSession } from "~/lib/backend/orchestrator";

export async function POST(event: APIEvent) {
  try {
    const body = (await event.request.json()) as { sessionId?: string; text?: string };
    if (!body.sessionId || !body.text?.trim()) {
      return Response.json({ error: "sessionId and text are required" }, { status: 400 });
    }

    void promptAgentSession({
      browserSessionId: body.sessionId,
      text: body.text,
    }).catch(error => {
      console.error(error);
    });

    return Response.json({ ok: true }, { status: 202 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to submit prompt" },
      { status: 500 },
    );
  }
}
