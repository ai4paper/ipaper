import { For, Show } from "solid-js";

import type { PlanEntryView, ToolCallView } from "~/components/agent/types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export default function ActivityPanel(props: { plan: PlanEntryView[]; toolCalls: ToolCallView[] }) {
  return (
    <Card>
      <CardHeader class="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <div>
          <CardTitle class="mt-0.5">Live Output</CardTitle>
        </div>
        <Badge variant="secondary" class="capitalize">
          {props.toolCalls.length} tools
        </Badge>
      </CardHeader>

      <CardContent class="flex flex-col gap-5 p-4 pt-0 sm:p-5 sm:pt-0">
        <section class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted-foreground">Plan</h3>
          <Show when={props.plan.length} fallback={<p class="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-5 text-sm leading-6 text-muted-foreground">The agent plan will appear here when ACP reports one.</p>}>
            <ul class="flex flex-col gap-2">
              <For each={props.plan}>
                {entry => (
                  <li
                    class={`rounded-2xl border px-3 py-2.5 text-sm leading-6 ${
                      entry.status === "completed"
                        ? "border-border bg-secondary text-secondary-foreground"
                        : entry.status === "in_progress"
                          ? "border-border bg-primary text-primary-foreground"
                          : "border-border bg-muted/50 text-foreground"
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
          <Show when={props.toolCalls.length} fallback={<p class="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-5 text-sm leading-6 text-muted-foreground">Tool activity will stream here during prompt execution.</p>}>
            <div class="flex flex-col gap-3">
              <For each={props.toolCalls}>
                {call => (
                  <article class="rounded-xl border border-border bg-background/70 p-3 shadow-sm">
                    <header class="flex items-start justify-between gap-4">
                      <strong class="min-w-0 break-words text-sm text-foreground">{call.title}</strong>
                      <span class="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {call.status}
                      </span>
                    </header>
                    <p class="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{call.kind}</p>
                    <Show when={call.content}>
                      <pre class="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-2.5 text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
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
