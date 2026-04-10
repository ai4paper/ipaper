import { For, Show } from "solid-js";

import type { PlanEntryView, ToolCallView } from "~/components/agent/types";

export default function ActivityPanel(props: { plan: PlanEntryView[]; toolCalls: ToolCallView[] }) {
  return (
    <aside class="panel activity-panel">
      <div class="panel-header">
        <h2>Activity</h2>
      </div>

      <section class="activity-section">
        <h3>Plan</h3>
        <Show when={props.plan.length} fallback={<p class="empty-state">The agent plan will appear here when ACP reports one.</p>}>
          <ul class="plan-list">
            <For each={props.plan}>{entry => <li class={`plan-entry ${entry.status}`}>{entry.content}</li>}</For>
          </ul>
        </Show>
      </section>

      <section class="activity-section">
        <h3>Tool Calls</h3>
        <Show when={props.toolCalls.length} fallback={<p class="empty-state">Tool activity will stream here during prompt execution.</p>}>
          <div class="tool-call-list">
            <For each={props.toolCalls}>
              {call => (
                <article class="tool-call-card">
                  <header>
                    <strong>{call.title}</strong>
                    <span>{call.status}</span>
                  </header>
                  <p>{call.kind}</p>
                  <Show when={call.content}>
                    <pre>{call.content}</pre>
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
