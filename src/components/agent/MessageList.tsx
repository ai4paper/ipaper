import { For, Show } from "solid-js";

import type { ChatMessage, ToolCallView } from "~/components/agent/types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type TimelineItem =
  | { id: string; type: "message"; timestamp: number; message: ChatMessage }
  | { id: string; type: "tool"; timestamp: number; count: number; call: ToolCallView };

function formatToolKind(kind: string) {
  return kind
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildTimeline(messages: ChatMessage[], toolCalls: ToolCallView[]): TimelineItem[] {
  const toolCallCounts = toolCalls.reduce<Record<string, number>>((counts, call) => {
    counts[call.kind] = (counts[call.kind] ?? 0) + 1;
    return counts;
  }, {});

  const items: TimelineItem[] = messages.map(message => ({
    id: message.id,
    type: "message",
    timestamp: message.updatedAt,
    message,
  }));

  for (const call of toolCalls) {
    items.push({
      id: call.toolCallId,
      type: "tool",
      timestamp: call.updatedAt,
      count: toolCallCounts[call.kind] ?? 1,
      call,
    });
  }

  return items.sort((left, right) => left.timestamp - right.timestamp);
}

export default function MessageList(props: { messages: ChatMessage[]; toolCalls: ToolCallView[]; error: string | null }) {
  const timeline = () => buildTimeline(props.messages, props.toolCalls);

  return (
    <Card class="min-h-[36rem] overflow-hidden border-border/80 bg-card/92 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
      <CardHeader class="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <CardTitle class="mt-0.5 text-lg">Transcript</CardTitle>
          <p class="mt-1 text-sm text-muted-foreground">Messages and tool activity stream together in one ordered feed.</p>
        </div>
        <Badge variant="secondary" class="w-fit rounded-full border border-border/70 bg-background/80 px-3 py-1">
          {timeline().length} entries
        </Badge>
      </CardHeader>

      <CardContent class="flex flex-col gap-3 p-4 sm:p-5">
        <For each={timeline()}>
          {item =>
            item.type === "message" ? (
              (() => {
                const message = item.message;
                return (
                  <div class={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <article
                      class={`max-w-[95%] rounded-[1.35rem] border px-4 py-3 shadow-sm sm:max-w-[88%] ${
                        message.role === "user"
                          ? "border-primary/20 bg-primary/95 text-primary-foreground shadow-[0_16px_40px_-24px_rgba(96,165,250,0.7)]"
                          : message.role === "system"
                            ? "border-border/80 bg-secondary/80 text-secondary-foreground"
                            : "border-border/80 bg-[rgba(17,24,39,0.92)] text-foreground"
                      }`}
                    >
                      <div class="flex items-center gap-2">
                        <span class="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-inherit opacity-75">
                          {message.role}
                        </span>
                        <span class="text-[11px] text-inherit opacity-55">{message.status}</span>
                      </div>
                      <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-inherit sm:text-[15px]">
                        {message.text || (message.status === "streaming" ? "Thinking..." : "")}
                      </p>
                    </article>
                  </div>
                );
              })()
            ) : (
                <article class="rounded-[1.35rem] border border-border/80 bg-[rgba(17,24,39,0.92)] px-4 py-3 shadow-sm">
                  <div class="flex items-center gap-2">
                    <span class="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground opacity-75">
                      {formatToolKind(item.call.kind)}
                    </span>
                    <span class="text-[11px] text-muted-foreground">
                      {item.count} call{item.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p class="mt-2 text-sm font-medium leading-6 text-foreground">{item.call.title}</p>
                  <p class="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.call.status}</p>
                  <Show when={item.call.content}>
                    <pre class="mt-3 overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-3 text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
                      {item.call.content}
                    </pre>
                  </Show>
                </article>
              )
          }
        </For>

        {!timeline().length && (
          <div class="rounded-[1.5rem] border border-dashed border-border/80 bg-muted/30 px-5 py-10 text-center">
            <p class="text-sm font-medium text-foreground">Your agent activity will appear here.</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">Use the dock at the bottom to start a session, configure the model, and send the first prompt.</p>
          </div>
        )}
        {props.error && <p class="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm leading-6 text-destructive">{props.error}</p>}
      </CardContent>
    </Card>
  );
}
