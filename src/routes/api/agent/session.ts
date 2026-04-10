import type { APIEvent } from "@solidjs/start/server";

import { createAgentSession } from "~/lib/backend/orchestrator";

export async function POST(_event: APIEvent) {
  try {
    const result = await createAgentSession();

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
