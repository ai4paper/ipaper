import { describe, expect, it } from "vitest";

import { mapPromptResultToEvent, mapSessionUpdateToEvents } from "~/lib/acp/event-stream";

describe("mapSessionUpdateToEvents", () => {
  it("maps text chunks into browser message events", () => {
    const events = mapSessionUpdateToEvents({
      sessionId: "acp-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: "Hello from ACP",
        },
      },
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: "message-delta",
        sessionId: "acp-1",
        role: "assistant",
        text: "Hello from ACP",
      }),
    ]);
  });

  it("maps plan entries into a plan event", () => {
    const events = mapSessionUpdateToEvents({
      sessionId: "acp-1",
      update: {
        sessionUpdate: "plan",
        entries: [
          { content: "Inspect files", priority: "high", status: "pending" },
          { content: "Answer user", priority: "medium", status: "pending" },
        ],
      },
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: "plan",
        entries: [
          { content: "Inspect files", priority: "high", status: "pending" },
          { content: "Answer user", priority: "medium", status: "pending" },
        ],
      }),
    ]);
  });

  it("maps tool calls and updates into browser events", () => {
    const pendingEvents = mapSessionUpdateToEvents({
      sessionId: "acp-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Read file",
        kind: "read",
        status: "pending",
      },
    });
    const completedEvents = mapSessionUpdateToEvents({
      sessionId: "acp-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        status: "completed",
      },
    });

    expect(pendingEvents[0]).toEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "tool-1",
        title: "Read file",
        status: "pending",
      }),
    );
    expect(completedEvents[0]).toEqual(
      expect.objectContaining({
        type: "tool-call-update",
        toolCallId: "tool-1",
        status: "completed",
      }),
    );
  });
});

describe("mapPromptResultToEvent", () => {
  it("maps the ACP prompt result into a turn completion event", () => {
    const event = mapPromptResultToEvent("acp-1", { stopReason: "end_turn" });

    expect(event).toEqual(
      expect.objectContaining({
        type: "turn-complete",
        sessionId: "acp-1",
        stopReason: "end_turn",
      }),
    );
  });
});
