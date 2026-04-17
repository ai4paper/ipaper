import { buildTranscriptTimeline, formatStatusBadgeLabel, hasPlanEntries, hasTranscriptActivity, summarizePlan } from "~/components/agent/agent-layout";
import type { ChatMessage, PlanEntryView, ToolCallView } from "~/components/agent/types";

describe("agent-layout", () => {
  it("orders messages and tool calls into one transcript timeline", () => {
    const messages: ChatMessage[] = [
      {
        id: "message-1",
        role: "user",
        text: "first",
        status: "done",
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "message-2",
        role: "assistant",
        text: "second",
        status: "done",
        createdAt: 300,
        updatedAt: 320,
      },
    ];
    const toolCalls: ToolCallView[] = [
      {
        toolCallId: "tool-1",
        title: "List files",
        kind: "bash",
        status: "completed",
        createdAt: 150,
        updatedAt: 160,
      },
      {
        toolCallId: "tool-2",
        title: "Search source",
        kind: "grep",
        status: "in_progress",
        createdAt: 310,
        updatedAt: 315,
      },
    ];

    expect(buildTranscriptTimeline(messages, toolCalls)).toMatchObject([
      { id: "message-1", type: "message", timestamp: 100 },
      { id: "tool-1", type: "tool", timestamp: 160 },
      { id: "message-2", type: "message", timestamp: 320 },
      { id: "tool-2", type: "tool", timestamp: 315 },
    ]);
  });

  it("keeps stable ordering when timestamps match across message and tool items", () => {
    const messages: ChatMessage[] = [
      {
        id: "message-1",
        role: "assistant",
        text: "result",
        status: "done",
        createdAt: 200,
        updatedAt: 400,
      },
    ];
    const toolCalls: ToolCallView[] = [
      {
        toolCallId: "tool-1",
        title: "Run command",
        kind: "bash",
        status: "completed",
        createdAt: 150,
        updatedAt: 400,
      },
      {
        toolCallId: "tool-2",
        title: "Run again",
        kind: "bash",
        status: "completed",
        createdAt: 220,
        updatedAt: 400,
      },
    ];

    expect(buildTranscriptTimeline(messages, toolCalls).map(item => item.id)).toEqual(["tool-1", "message-1", "tool-2"]);
    expect(buildTranscriptTimeline(messages, toolCalls).filter(item => item.type === "tool")).toMatchObject([{ count: 2 }, { count: 2 }]);
  });

  it("keeps feed ordering stable when streaming updates change updatedAt", () => {
    const messages: ChatMessage[] = [
      {
        id: "message-1",
        role: "user",
        text: "prompt",
        status: "done",
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "message-2",
        role: "assistant",
        text: "streaming response",
        status: "streaming",
        createdAt: 120,
        updatedAt: 900,
      },
    ];
    const toolCalls: ToolCallView[] = [
      {
        toolCallId: "tool-1",
        title: "Read file",
        kind: "read",
        status: "completed",
        createdAt: 140,
        updatedAt: 160,
      },
    ];

    expect(buildTranscriptTimeline(messages, toolCalls).map(item => item.id)).toEqual(["message-1", "message-2", "tool-1"]);
    expect(buildTranscriptTimeline(messages, toolCalls)).toMatchObject([
      { id: "message-1", timestamp: 100 },
      { id: "message-2", timestamp: 900 },
      { id: "tool-1", timestamp: 160 },
    ]);
  });

  it("summarizes plan completion counts", () => {
    const plan: PlanEntryView[] = [
      { id: "1", content: "A", priority: "high", status: "completed", updatedAt: 10 },
      { id: "2", content: "B", priority: "medium", status: "in_progress", updatedAt: 11 },
      { id: "3", content: "C", priority: "low", status: "pending", updatedAt: 12 },
    ];

    expect(summarizePlan(plan)).toEqual({
      total: 3,
      completed: 1,
      inProgress: 1,
      pending: 1,
      remaining: 2,
      isEmpty: false,
    });
  });

  it("covers empty-state helpers", () => {
    expect(summarizePlan([])).toEqual({
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      remaining: 0,
      isEmpty: true,
    });
    expect(hasPlanEntries([])).toBe(false);
    expect(hasTranscriptActivity([], [])).toBe(false);
    expect(formatStatusBadgeLabel("in_progress")).toBe("In Progress");
    expect(formatStatusBadgeLabel(undefined, "Idle")).toBe("Idle");
  });
});
