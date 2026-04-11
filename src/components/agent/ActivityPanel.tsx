import { For, Show } from "solid-js";

import type { PlanEntryView, ToolCallView } from "~/components/agent/types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export default function ActivityPanel(props: { plan: PlanEntryView[]; toolCalls: ToolCallView[] }) {
  return (
    <Card class="overflow-hidden border-border/80 bg-card/92 xl:sticky xl:top-5">
      <CardHeader class="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle class="mt-0.5 text-lg">Live Output</CardTitle>
          <p class="mt-1 text-sm text-muted-foreground">A secondary rail for plans and tool activity while the transcript stays primary.</p>
        </div>
        <Badge variant="secondary" class="w-fit rounded-full border border-border/70 bg-background/80 px-3 py-1 capitalize">
          {props.toolCalls.length} tools
        </Badge>
      </CardHeader>

      <CardContent class="flex max-h-[calc(100vh-14rem)] flex-col gap-5 overflow-y-auto p-4 pt-0 sm:p-5 sm:pt-0">
        <section class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted-foreground">Plan</h3>
          <Show when={props.plan.length} fallback={<p class="rounded-2xl border border-dashed border-border/80 bg-muted/35 px-4 py-5 text-sm leading-6 text-muted-foreground">The agent plan will appear here when ACP reports one.</p>}>
            <ul class="flex flex-col gap-2">
              <For each={props.plan}>
                {entry => (
                  <li
                    class={`rounded-2xl border px-3.5 py-3 text-sm leading-6 ${
                      entry.status === "completed"
                        ? "border-border/80 bg-secondary/80 text-secondary-foreground"
                        : entry.status === "in_progress"
                          ? "border-primary/20 bg-primary text-primary-foreground"
                          : "border-border/80 bg-background/80 text-foreground"
                    }`}
                  >
                    {entry.content}
                  </li>
                )}
              </For>
            </ul>
           </Show>
        </section>

        <Separator />

        <section class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted-foreground">Tool Calls</h3>
          <Show when={props.toolCalls.length} fallback={<p class="rounded-2xl border border-dashed border-border/80 bg-muted/35 px-4 py-5 text-sm leading-6 text-muted-foreground">Tool activity will stream here during prompt execution.</p>}>
            <div class="flex flex-col gap-3">
              <For each={props.toolCalls}>
                {call => (
                  <article class="rounded-2xl border border-border/80 bg-background/88 p-3.5 shadow-sm shadow-black/10">
                    <header class="flex items-start justify-between gap-4">
                      <strong class="min-w-0 break-words text-sm text-foreground">{call.title}</strong>
                      <span class="rounded-full border border-border/80 bg-muted/55 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {call.status}
                      </span>
                    </header>
                    <p class="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{call.kind}</p>
                    <Show when={call.content}>
                      <pre class="mt-2 overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-3 text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
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
