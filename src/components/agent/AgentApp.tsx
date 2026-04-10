import MessageList from "~/components/agent/MessageList";
import PromptComposer from "~/components/agent/PromptComposer";
import ActivityPanel from "~/components/agent/ActivityPanel";
import { useAgentSession } from "~/components/agent/useAgentSession";

export default function AgentApp() {
  const session = useAgentSession();

  return (
    <div class="agent-shell">
      <header class="hero">
        <p class="eyebrow">SolidStart + ACP + backend orchestration</p>
        <h1>iPaper Web Agent</h1>
        <p class="hero-copy">
          The browser handles chat UX. The server owns the local <code>opencode acp</code> process and keeps room for
          backend-only integrations that ACP does not cover.
        </p>
      </header>

      <div class="workspace-grid">
        <MessageList messages={session.messages()} error={session.error()} />
        <ActivityPanel plan={session.plan()} toolCalls={session.toolCalls()} />
      </div>

      <PromptComposer
        status={session.status()}
        canSend={session.canSend()}
        canCancel={session.canCancel()}
        onSend={session.sendPrompt}
        onCancel={session.cancelPrompt}
      />
    </div>
  );
}
