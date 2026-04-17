import type { ChatMessage, PlanEntryView, ToolCallView } from "~/components/agent/types";

export type TranscriptTimelineItem =
  | { id: string; type: "message"; timestamp: number; message: ChatMessage }
  | { id: string; type: "tool"; timestamp: number; count: number; call: ToolCallView };

export interface PlanSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  isEmpty: boolean;
}

export function buildTranscriptTimeline(messages: ChatMessage[], toolCalls: ToolCallView[]): TranscriptTimelineItem[] {
  const toolCallCounts = toolCalls.reduce<Record<string, number>>((counts, call) => {
    counts[call.kind] = (counts[call.kind] ?? 0) + 1;
    return counts;
  }, {});

  return [
    ...messages.map((message, sourceOrder) => ({
      item: {
        id: message.id,
        type: "message" as const,
        timestamp: message.updatedAt,
        message,
      },
      sortAt: message.createdAt,
      createdAt: message.createdAt,
      sourceOrder,
    })),
    ...toolCalls.map((call, sourceOrder) => ({
      item: {
        id: call.toolCallId,
        type: "tool" as const,
        timestamp: call.updatedAt,
        count: toolCallCounts[call.kind] ?? 1,
        call,
      },
      sortAt: call.createdAt,
      createdAt: call.createdAt,
      sourceOrder,
    })),
  ]
    .sort((left, right) => {
      if (left.sortAt !== right.sortAt) {
        return left.sortAt - right.sortAt;
      }
      if (left.createdAt !== right.createdAt) {
        return left.createdAt - right.createdAt;
      }
      if (left.item.type !== right.item.type) {
        return left.item.type === "message" ? -1 : 1;
      }
      return left.sourceOrder - right.sourceOrder;
    })
    .map(entry => entry.item);
}

export function summarizePlan(plan: PlanEntryView[]): PlanSummary {
  const summary = plan.reduce(
    (counts, entry) => {
      counts.total += 1;
      if (entry.status === "completed") {
        counts.completed += 1;
      } else if (entry.status === "in_progress") {
        counts.inProgress += 1;
      } else {
        counts.pending += 1;
      }
      return counts;
    },
    {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
    },
  );

  return {
    ...summary,
    remaining: summary.total - summary.completed,
    isEmpty: summary.total === 0,
  };
}

export function hasTranscriptActivity(messages: ChatMessage[], toolCalls: ToolCallView[]) {
  return messages.length > 0 || toolCalls.length > 0;
}

export function hasPlanEntries(plan: PlanEntryView[]) {
  return plan.length > 0;
}

export function formatStatusBadgeLabel(status: string | null | undefined, fallback = "Unknown") {
  if (!status) {
    return fallback;
  }

  return status
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatUpdatedAtLabel(timestamp: number | null | undefined) {
  if (!timestamp || Number.isNaN(timestamp)) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
