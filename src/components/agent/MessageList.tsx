import { For } from "solid-js";

import type { ChatMessage } from "~/components/agent/types";

export default function MessageList(props: { messages: ChatMessage[]; error: string | null }) {
  return (
    <section class="panel transcript-panel">
      <div class="panel-header">
        <h2>Conversation</h2>
      </div>
      <div class="transcript-list">
        <For each={props.messages}>
          {message => (
            <article class={`message message-${message.role}`}>
              <div class="message-role">{message.role}</div>
              <p>{message.text || (message.status === "streaming" ? "Thinking..." : "")}</p>
            </article>
          )}
        </For>
        {!props.messages.length && <p class="empty-state">Send the first prompt to start a local ACP-backed session.</p>}
        {props.error && <p class="error-banner">{props.error}</p>}
      </div>
    </section>
  );
}
