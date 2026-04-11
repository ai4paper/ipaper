import { For, Show } from "solid-js";

import type { PlanEntryView, ToolCallView } from "~/components/agent/types";

export default function ActivityPanel(props: { plan: PlanEntryView[]; toolCalls: ToolCallView[] }) {
  return (
    <aside class="space-y-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-xl shadow-slate-950/20 backdrop-blur sm:p-5">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Activity</p>
          <h2 class="mt-0.5 text-base font-semibold text-white">Live Output</h2>
        </div>
        <div class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
          {props.toolCalls.length} tools
        </div>
      </div>

      <section class="space-y-2.5">
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Plan</h3>
        <Show when={props.plan.length} fallback={<p class="rounded-2xl border border-dashed border-white/10 bg-white/4 px-3 py-5 text-sm leading-6 text-slate-400">The agent plan will appear here when ACP reports one.</p>}>
          <ul class="space-y-2">
            <For each={props.plan}>
              {entry => (
                <li
                  class={`rounded-2xl border px-3 py-2.5 text-sm leading-6 ${
                    entry.status === "completed"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-50"
                      : entry.status === "in_progress"
                        ? "border-sky-400/25 bg-sky-400/10 text-sky-50"
                        : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  {entry.content}
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>

      <section class="space-y-2.5">
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tool Calls</h3>
        <Show when={props.toolCalls.length} fallback={<p class="rounded-2xl border border-dashed border-white/10 bg-white/4 px-3 py-5 text-sm leading-6 text-slate-400">Tool activity will stream here during prompt execution.</p>}>
          <div class="space-y-2.5">
            <For each={props.toolCalls}>
              {call => (
                <article class="rounded-2xl border border-white/10 bg-white/6 p-3 shadow-md shadow-slate-950/15">
                  <header class="flex items-start justify-between gap-4">
                    <strong class="min-w-0 break-words text-sm text-white">{call.title}</strong>
                    <span class="rounded-full border border-white/10 bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
                      {call.status}
                    </span>
                  </header>
                  <p class="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{call.kind}</p>
                  <Show when={call.content}>
                    <pre class="mt-2 overflow-x-auto rounded-xl border border-white/8 bg-slate-950/70 p-2.5 text-xs leading-5 whitespace-pre-wrap text-slate-300">
                      {call.content}
                    </pre>
                  </Show>
                </article>
              )}
            </For>
          </div>
        </Show>
      </section>
    </aside>
  );
}
