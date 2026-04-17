import { For, Show } from "solid-js";

import { formatStatusBadgeLabel, formatUpdatedAtLabel, hasPlanEntries, summarizePlan } from "~/components/agent/agent-layout";
import type { PlanEntryView, ToolCallView } from "~/components/agent/types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export default function ActivityPanel(props: { plan: PlanEntryView[]; toolCalls: ToolCallView[] }) {
  const planSummary = () => summarizePlan(props.plan);
  const latestPlanUpdate = () => formatUpdatedAtLabel(Math.max(0, ...props.plan.map(entry => entry.updatedAt)));

  return (
    <Card class="overflow-hidden rounded-xl border-border/80 bg-card/75 shadow-sm xl:sticky xl:top-5">
      <CardHeader class="gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Activity</p>
            <CardTitle class="mt-1 text-base">Plan and tools</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">Compact progress for the current session.</p>
          </div>
          <Badge variant="secondary" class="w-fit rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
            {props.toolCalls.length} tools
          </Badge>
        </div>
      </CardHeader>

      <CardContent class="flex flex-col gap-5 p-4 sm:max-h-[calc(100vh-14rem)] sm:overflow-y-auto sm:p-5">
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Plan progress</h3>
            <Show when={!planSummary().isEmpty}>
              <span class="text-xs text-muted-foreground">
                {planSummary().completed}/{planSummary().total}
              </span>
            </Show>
          </div>
          <Show when={hasPlanEntries(props.plan)} fallback={<p class="rounded-lg border border-dashed border-border/80 bg-muted/25 px-4 py-5 text-sm leading-6 text-muted-foreground">Waiting for the agent to publish a plan.</p>}>
            <div class="rounded-lg border border-border/70 bg-background/70 px-3.5 py-2.5 text-xs text-muted-foreground">
              <span>{planSummary().completed} complete</span>
              <span class="mx-2 text-muted-foreground/60">/</span>
              <span>{planSummary().remaining} remaining</span>
              <Show when={latestPlanUpdate()}>{time => <span class="ml-2">updated {time()}</span>}</Show>
            </div>
            <ul class="rounded-lg border border-border/70 bg-background/70 px-4">
              <For each={props.plan}>
                {entry => (
                  <li
                    class={`border-b border-border/70 py-3 text-sm leading-6 last:border-none ${
                      entry.status === "completed"
                        ? "text-muted-foreground"
                        : entry.status === "in_progress"
                          ? "text-foreground"
                          : "text-foreground"
                    }`}
                  >
                    <div class="flex items-start justify-between gap-3">
                      <span class="min-w-0 flex-1 break-words">{entry.content}</span>
                      <span class={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${entry.status === "in_progress" ? "border-primary/30 text-primary" : "border-border/70 text-muted-foreground"}`}>
                        {formatStatusBadgeLabel(entry.status)}
                      </span>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>

        <Separator />

        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tool history</h3>
            <Show when={props.toolCalls.length > 0}>
              <span class="text-xs text-muted-foreground">{props.toolCalls.length} entries</span>
            </Show>
          </div>
          <Show when={props.toolCalls.length} fallback={<p class="rounded-lg border border-dashed border-border/80 bg-muted/25 px-4 py-5 text-sm leading-6 text-muted-foreground">Waiting for tool activity from the current run.</p>}>
            <div class="rounded-lg border border-border/70 bg-background/70 px-4">
              <For each={props.toolCalls}>
                {call => (
                  <article class="border-b border-border/70 py-3 last:border-none">
                    <header class="flex items-start justify-between gap-4">
                      <strong class="min-w-0 break-words text-sm text-foreground">{call.title}</strong>
                      <span class="rounded-md border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {formatStatusBadgeLabel(call.status)}
                      </span>
                    </header>
                    <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span class="font-medium uppercase tracking-[0.16em]">{call.kind}</span>
                      <Show when={formatUpdatedAtLabel(call.updatedAt)}>{time => <span>{time()}</span>}</Show>
                    </div>
                    <Show when={call.content}>
                      <pre class="mt-2 max-h-[18rem] overflow-auto rounded-md border border-border/70 bg-muted/35 p-3 text-xs leading-5 whitespace-pre-wrap break-words text-muted-foreground">
                        {call.content}
                      </pre>
                    </Show>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </section>
      </CardContent>
    </Card>
  );
}
