import MessageList from "~/components/agent/MessageList";
import PromptComposer from "~/components/agent/PromptComposer";
import { useAgentSession } from "~/components/agent/useAgentSession";

export default function AgentApp(props: { restoreLastCwd?: boolean }) {
  const session = useAgentSession({ restoreLastCwd: props.restoreLastCwd });

  return (
    <div class="flex flex-col gap-5 pb-[20rem] sm:pb-[18rem] lg:pb-[17rem]">
      <div class="min-h-[calc(100vh-18rem)]">
        <MessageList messages={session.messages()} toolCalls={session.toolCalls()} error={session.error()} />
      </div>

      <PromptComposer
        status={session.status()}
        cwd={session.cwd()}
        onCwdInput={session.setCwd}
        onStartSession={session.startSession}
        onCloseSession={session.closeSession}
        canStartSession={session.canStartSession()}
        canCloseSession={session.canCloseSession()}
        canSend={session.canSend()}
        canCancel={session.canCancel()}
        canConfigure={session.canConfigure()}
        modeOptions={session.modeOptions()}
        selectedModeId={session.selectedModeId()}
        modelOptions={session.modelOptions()}
        selectedModelId={session.selectedModelId()}
        plan={session.plan()}
        onSend={session.sendPrompt}
        onCancel={session.cancelPrompt}
        onModeChange={session.updateMode}
        onModelChange={session.updateModel}
      />
    </div>
  );
}
