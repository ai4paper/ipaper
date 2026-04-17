import { createMemo } from "solid-js";

import { formatStatusBadgeLabel } from "~/components/agent/agent-layout";
import ActivityPanel from "~/components/agent/ActivityPanel";
import MessageList from "~/components/agent/MessageList";
import PromptComposer from "~/components/agent/PromptComposer";
import { useAgentSession } from "~/components/agent/useAgentSession";

export default function AgentApp(props: { restoreLastCwd?: boolean }) {
  const session = useAgentSession({ restoreLastCwd: props.restoreLastCwd });
  const plan = () => session.plan();
  const toolCalls = () => session.toolCalls();
  const messages = () => session.messages();
  const cwdLabel = createMemo(() => session.cwd() || "Not set");
  const selectedModeName = createMemo(() => session.modeOptions().find(mode => mode.id === session.selectedModeId())?.name ?? session.selectedModeId() ?? "Mode");
  const selectedModelName = createMemo(() => session.modelOptions().find(model => model.id === session.selectedModelId())?.name ?? session.selectedModelId() ?? "Model");

  return (
    <div class="flex min-h-0 flex-1 flex-col gap-3">
      <section class="overflow-hidden rounded-xl border border-border/80 bg-card/75 px-3 py-2 shadow-sm sm:px-4">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div class="flex min-w-0 items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cwd</span>
            <span class="truncate text-foreground">{cwdLabel()}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session</span>
            <span class="text-foreground">{formatStatusBadgeLabel(session.status())}</span>
          </div>
          <div class="flex min-w-0 items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mode</span>
            <span class="truncate text-foreground">{selectedModeName()}</span>
          </div>
          <div class="flex min-w-0 items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Model</span>
            <span class="truncate text-foreground">{selectedModelName()}</span>
          </div>
        </div>
      </section>

      <div class="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_22rem] xl:items-start">
        <div class="order-1 min-h-0">
          <MessageList messages={messages()} toolCalls={toolCalls()} error={session.error()} />
        </div>
        <div class="order-2 xl:min-h-0">
          <ActivityPanel plan={plan()} toolCalls={toolCalls()} />
        </div>
      </div>

      <PromptComposer
        status={session.status()}
        cwd={session.cwd()}
        onCwdInput={session.setCwd}
        canStartSession={session.canStartSession()}
        canCloseSession={session.canCloseSession()}
        canSend={session.canSend()}
        canCancel={session.canCancel()}
        canConfigure={session.canConfigure()}
        onStartSession={session.startSession}
        onCloseSession={session.closeSession}
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
