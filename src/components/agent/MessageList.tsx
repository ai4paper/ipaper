import { For } from "solid-js";

import type { ChatMessage } from "~/components/agent/types";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function MessageList(props: { messages: ChatMessage[]; error: string | null }) {
  return (
    <Card class="min-h-[28rem]">
      <CardHeader class="flex flex-row items-center justify-between border-b border-border/60 px-4 py-4 sm:px-5">
        <div>
          <CardTitle class="mt-0.5">Transcript</CardTitle>
        </div>
        <Badge variant="secondary">
          {props.messages.length} messages
        </Badge>
      </CardHeader>

      <CardContent class="flex flex-col gap-3 p-4 sm:p-5">
        <For each={props.messages}>
          {message => (
            <article
              class={`max-w-[92%] rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-950/15 ${
                message.role === "user"
                  ? "ml-auto border-primary/10 bg-primary text-primary-foreground"
                  : message.role === "system"
                    ? "border-border bg-secondary text-secondary-foreground"
                    : "border-border bg-muted/50 text-foreground"
              }`}
            >
              <div class="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">{message.role}</div>
              <p class="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-inherit">
                {message.text || (message.status === "streaming" ? "Thinking…" : "")}
              </p>
            </article>
          )}
        </For>

        {!props.messages.length && (
          <p class="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm leading-6 text-muted-foreground">
            Send the first prompt to start a local ACP-backed session.
          </p>
        )}
        {props.error && <p class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{props.error}</p>}
      </CardContent>
    </Card>
  );
}
