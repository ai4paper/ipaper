import { For, Show } from "solid-js";

import { buildTranscriptTimeline, formatStatusBadgeLabel, formatUpdatedAtLabel, hasTranscriptActivity } from "~/components/agent/agent-layout";
import type { ChatMessage, ToolCallView } from "~/components/agent/types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

function formatToolKind(kind: string) {
  return kind
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function MessageList(props: { messages: ChatMessage[]; toolCalls: ToolCallView[]; error: string | null }) {
  const timeline = () => buildTranscriptTimeline(props.messages, props.toolCalls);
  const assistantMessageCount = () => props.messages.filter(message => message.role === "assistant").length;

  return (
    <Card class="flex min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-xl border-border/80 bg-card/75 shadow-sm">
      <CardHeader class="gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session transcript</p>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <CardTitle class="text-base">Transcript</CardTitle>
              <span class="text-xs text-muted-foreground">{assistantMessageCount()} assistant replies</span>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">Conversation and tool activity appear here in a single ordered feed.</p>
          </div>
          <Badge variant="secondary" class="w-fit rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
            {timeline().length} entries
          </Badge>
        </div>
      </CardHeader>

      <CardContent class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
        <For each={timeline()}>
          {item =>
            item.type === "message" ? (
              (() => {
                const message = item.message;
                const updatedAt = () => formatUpdatedAtLabel(message.updatedAt);
                return (
                  <div class={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <article
                      class={`min-w-0 max-w-[98%] rounded-lg border px-3.5 py-3 sm:max-w-[88%] ${
                        message.role === "user"
                          ? "border-primary/20 bg-primary/10 text-foreground"
                          : message.role === "system"
                            ? "border-border/80 bg-secondary/55 text-secondary-foreground"
                            : "border-border/80 bg-background/80 text-foreground"
                      }`}
                    >
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span class="rounded-md border border-current/10 bg-background/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-inherit opacity-80">
                          {message.role}
                        </span>
                        <span class="text-[11px] text-inherit opacity-60">{formatStatusBadgeLabel(message.status, "Pending")}</span>
                        <Show when={updatedAt()}>{time => <span class="text-[11px] text-inherit opacity-50">{time()}</span>}</Show>
                      </div>
                      <pre class="mt-2 min-w-0 overflow-x-auto whitespace-pre-wrap break-words bg-transparent text-sm leading-6 font-sans text-inherit">
                        {message.text || (message.status === "streaming" ? "Thinking..." : "")}
                      </pre>
                    </article>
                  </div>
                );
              })()
            ) : (
                <article class="min-w-0 rounded-lg border border-border/80 bg-background/70 px-3.5 py-3">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span class="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-semibold uppercase tracking-[0.16em] text-foreground">
                      {formatToolKind(item.call.kind)}
                    </span>
                    <span>{formatStatusBadgeLabel(item.call.status)}</span>
                    <span>{item.count} call{item.count === 1 ? "" : "s"}</span>
                    <Show when={formatUpdatedAtLabel(item.call.updatedAt)}>{time => <span>{time()}</span>}</Show>
                  </div>
                  <p class="mt-2 break-words text-sm font-medium leading-6 text-foreground">{item.call.title}</p>
                  <Show when={item.call.content}>
                    <pre class="mt-2 max-h-[22rem] overflow-auto rounded-md border border-border/70 bg-muted/35 p-3 text-xs leading-5 whitespace-pre-wrap break-words text-muted-foreground">
                      {item.call.content}
                    </pre>
                  </Show>
                </article>
              )
          }
        </For>

        {!hasTranscriptActivity(props.messages, props.toolCalls) && (
          <div class="rounded-lg border border-dashed border-border/80 bg-muted/25 px-5 py-10 text-center text-sm text-muted-foreground">
            Send a prompt below to start the single-agent session and stream its work here.
          </div>
        )}
        {props.error && <p class="rounded-lg border border-destructive/20 bg-destructive/8 px-3.5 py-3 text-sm leading-6 text-destructive">{props.error}</p>}
      </CardContent>
    </Card>
  );
}
