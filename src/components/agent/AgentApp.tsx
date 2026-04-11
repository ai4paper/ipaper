import MessageList from "~/components/agent/MessageList";
import PromptComposer from "~/components/agent/PromptComposer";
import ActivityPanel from "~/components/agent/ActivityPanel";
import { Badge } from "~/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { useAgentSession } from "~/components/agent/useAgentSession";

export default function AgentApp(props: { restoreLastCwd?: boolean }) {
  const session = useAgentSession({ restoreLastCwd: props.restoreLastCwd });

  return (
    <div class="flex flex-col gap-4">
      <Card class="overflow-hidden border-border/70 bg-card/90">
        <CardHeader class="gap-4 sm:gap-5">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div class="min-w-0">
              <Badge variant="outline" class="mb-3 w-fit">iPaper Web Agent</Badge>
              <CardTitle class="text-balance text-xl sm:text-2xl">Compact Local Agent Workspace</CardTitle>
              <CardDescription class="mt-1 max-w-2xl text-sm leading-6">
                Conversation, planning, and tool execution are surfaced together so you can drive the local ACP session from a single view.
              </CardDescription>
            </div>

            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
              <div class="rounded-lg border border-border bg-background/80 px-3 py-2.5">
                <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p class="mt-1 text-sm font-semibold capitalize text-foreground">{session.status()}</p>
              </div>
              <div class="rounded-lg border border-border bg-background/80 px-3 py-2.5">
                <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Messages</p>
                <p class="mt-1 text-sm font-semibold text-foreground">{session.messages().length}</p>
              </div>
              <div class="rounded-lg border border-border bg-background/80 px-3 py-2.5">
                <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tools</p>
                <p class="mt-1 text-sm font-semibold text-foreground">{session.toolCalls().length}</p>
              </div>
            </div>
          </div>
          <Separator />
          <div class="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Local workspace</Badge>
            <Badge variant="secondary">ACP session</Badge>
            <Badge variant="secondary">Tool streaming</Badge>
          </div>
        </CardHeader>
      </Card>

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
