import MessageList from "~/components/agent/MessageList";
import PromptComposer from "~/components/agent/PromptComposer";
import ActivityPanel from "~/components/agent/ActivityPanel";
import { useAgentSession } from "~/components/agent/useAgentSession";

export default function AgentApp(props: { restoreLastCwd?: boolean }) {
  const session = useAgentSession({ restoreLastCwd: props.restoreLastCwd });

  return (
    <div class="space-y-4">
      <section class="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-xl shadow-slate-950/20 backdrop-blur sm:px-5">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">iPaper Web Agent</p>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
              <h1 class="text-balance text-base font-semibold text-white sm:text-lg">Compact Local Agent Workspace</h1>
              <span class="hidden text-slate-500 sm:inline">/</span>
              <span class="min-w-0 break-words">Conversation, plan, and tools in one view</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 lg:min-w-[20rem]">
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p class="mt-1 text-sm font-semibold capitalize text-white">{session.status()}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Messages</p>
              <p class="mt-1 text-sm font-semibold text-white">{session.messages().length}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2.5">
              <p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Tools</p>
              <p class="mt-1 text-sm font-semibold text-white">{session.toolCalls().length}</p>
            </div>
          </div>
        </div>
      </section>

      <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <MessageList messages={session.messages()} error={session.error()} />
        <ActivityPanel plan={session.plan()} toolCalls={session.toolCalls()} />
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
        onSend={session.sendPrompt}
        onCancel={session.cancelPrompt}
        onModeChange={session.updateMode}
        onModelChange={session.updateModel}
      />
    </div>
  );
}
