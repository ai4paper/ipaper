import MessageList from "~/components/agent/MessageList";
import PromptComposer from "~/components/agent/PromptComposer";
import ActivityPanel from "~/components/agent/ActivityPanel";
import { useAgentSession } from "~/components/agent/useAgentSession";

export default function AgentApp() {
  const session = useAgentSession();

  return (
    <div class="agent-shell">
      <div class="workspace-grid">
        <MessageList messages={session.messages()} error={session.error()} />
        <ActivityPanel plan={session.plan()} toolCalls={session.toolCalls()} />
      </div>

      <PromptComposer
        status={session.status()}
        cwd={session.cwd()}
        onCwdInput={session.setCwd}
        onStartSession={session.startSession}
        canStartSession={session.canStartSession()}
        canSend={session.canSend()}
        canCancel={session.canCancel()}
        canConfigure={session.canConfigure()}
        modeOptions={session.modeOptions()}
        selectedModeId={session.selectedModeId()}
        modelOptions={session.modelOptions()}
        selectedModelId={session.selectedModelId()}
        onSend={session.sendPrompt}
        onCancel={session.cancelPrompt}
        onModeChange={session.updateMode}
        onModelChange={session.updateModel}
      />
    </div>
  );
}
