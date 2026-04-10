import type { PromptResponse, SessionNotification, SessionUpdate } from "@agentclientprotocol/sdk";

import type { BrowserEvent } from "~/lib/acp/types";

function now() {
  return Date.now();
}

function contentToText(content: unknown): string | undefined {
  if (!content || typeof content !== "object") {
    return undefined;
  }

  if ("type" in content && content.type === "text" && "text" in content && typeof content.text === "string") {
    return content.text;
  }

  return undefined;
}

export function mapSessionUpdateToEvents(notification: SessionNotification): BrowserEvent[] {
  const sessionId = notification.sessionId;
  const update: SessionUpdate = notification.update;

  switch (update.sessionUpdate) {
    case "agent_message_chunk": {
      const text = contentToText(update.content);
      return text
        ? [
            {
              type: "message-delta",
              timestamp: now(),
              sessionId,
              role: "assistant",
              text,
            },
          ]
        : [];
    }
    case "user_message_chunk": {
      const text = contentToText(update.content);
      return text
        ? [
            {
              type: "message-delta",
              timestamp: now(),
              sessionId,
              role: "user",
              text,
            },
          ]
        : [];
    }
    case "agent_thought_chunk": {
      const text = contentToText(update.content);
      return text
        ? [
            {
              type: "message-delta",
              timestamp: now(),
              sessionId,
              role: "system",
              text,
            },
          ]
        : [];
    }
    case "plan":
      return [
        {
          type: "plan",
          timestamp: now(),
          sessionId,
          entries: update.entries.map(entry => ({
            content: entry.content,
            priority: entry.priority,
            status: entry.status,
          })),
        },
      ];
    case "tool_call":
      return [
        {
          type: "tool-call",
          timestamp: now(),
          sessionId,
          toolCallId: update.toolCallId,
          title: update.title,
          kind: update.kind,
          status: update.status,
        },
      ];
    case "tool_call_update":
      return [
        {
          type: "tool-call-update",
          timestamp: now(),
          sessionId,
          toolCallId: update.toolCallId,
          status: update.status,
          content: update.content
            ?.map(item => (item.type === "content" ? contentToText(item.content) : undefined))
            .filter((item): item is string => Boolean(item))
            .join("\n"),
        },
      ];
    default:
      return [];
  }
}

export function mapPromptResultToEvent(sessionId: string, result: PromptResponse): BrowserEvent {
  return {
    type: "turn-complete",
    timestamp: now(),
    sessionId,
    stopReason: result.stopReason,
  };
}
