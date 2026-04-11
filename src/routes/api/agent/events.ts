import type { APIEvent } from "@solidjs/start/server";

import { sessionManager } from "~/lib/acp/session-manager";

const encoder = new TextEncoder();

function toSseChunk(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(event: APIEvent) {
  const sessionId = event.request.headers.get("x-session-id") ?? new URL(event.request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = sessionManager.getBrowserSession(sessionId);
  if (!session) {
    return Response.json({ error: "Unknown session" }, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        toSseChunk({
          type: "status",
          timestamp: Date.now(),
          sessionId,
          status: session.status,
        }),
      );

      const detach = sessionManager.attachListener(sessionId, update => {
        controller.enqueue(toSseChunk(update));
      });

      event.request.signal.addEventListener(
        "abort",
        () => {
          detach();
          controller.close();
          void sessionManager.disposeBrowserSession(sessionId).catch(() => undefined);
        },
        { once: true },
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
