import { For } from "solid-js";

import type { ChatMessage } from "~/components/agent/types";

export default function MessageList(props: { messages: ChatMessage[]; error: string | null }) {
  return (
    <section class="min-h-[28rem] rounded-3xl border border-white/10 bg-slate-950/55 shadow-xl shadow-slate-950/20 backdrop-blur">
      <div class="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Conversation</p>
          <h2 class="mt-0.5 text-base font-semibold text-white">Transcript</h2>
        </div>
        <div class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
          {props.messages.length} messages
        </div>
      </div>

      <div class="flex flex-col gap-3 p-4 sm:p-5">
        <For each={props.messages}>
          {message => (
            <article
              class={`max-w-[92%] rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-950/15 ${
                message.role === "user"
                  ? "ml-auto border-sky-400/30 bg-linear-to-br from-sky-500 to-violet-500 text-white"
                  : message.role === "system"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
                    : "border-white/10 bg-white/6 text-slate-100"
              }`}
            >
              <div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{message.role}</div>
              <p class="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-inherit">
                {message.text || (message.status === "streaming" ? "Thinking…" : "")}
              </p>
            </article>
          )}
        </For>

        {!props.messages.length && (
          <p class="rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-8 text-center text-sm leading-6 text-slate-400">
            Send the first prompt to start a local ACP-backed session.
          </p>
        )}
        {props.error && <p class="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">{props.error}</p>}
      </div>
    </section>
  );
}
