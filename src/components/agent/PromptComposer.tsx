import { createSignal } from "solid-js";

import type { PlanEntryView, SessionModelOptionView, SessionModeOptionView } from "~/components/agent/types";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

function PlusIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SendIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

function TerminalIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="m8 9 3 3-3 3" />
      <path d="M13 15h3" />
    </svg>
  );
}

function StopIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class={props.class} aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function ChatIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M7 18 3 21V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7Z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

export default function PromptComposer(props: {
  cwd: string;
  canStartSession: boolean;
  canCloseSession: boolean;
  canSend: boolean;
  canCancel: boolean;
  canConfigure: boolean;
  status: string;
  onCwdInput: (value: string) => void;
  onStartSession: () => Promise<void>;
  onCloseSession: () => Promise<void>;
  modeOptions: SessionModeOptionView[];
  selectedModeId: string | null;
  modelOptions: SessionModelOptionView[];
  selectedModelId: string | null;
  plan: PlanEntryView[];
  onSend: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
  onModeChange: (modeId: string) => Promise<void>;
  onModelChange: (modelId: string) => Promise<void>;
}) {
  const [value, setValue] = createSignal("");
  const completedPlanCount = () => props.plan.filter(entry => entry.status === "completed").length;

  async function submit() {
    const text = value().trim();
    if (!text || !props.canSend) {
      return;
    }

    setValue("");
    await props.onSend(text);
  }

  return (
    <div class="ipaper-dock-wrap fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6">
      <Card class="mx-auto w-full max-w-[88rem] border-border/80 bg-[rgba(10,14,23,0.88)] shadow-[0_20px_70px_-24px_rgba(2,6,23,0.9)] backdrop-blur-xl">
        <CardHeader class="sr-only">
          <CardTitle>Session Controls</CardTitle>
          <CardDescription>Bottom dock for session controls and prompt entry.</CardDescription>
        </CardHeader>

        <CardContent class="space-y-3 p-3 sm:p-4">
          <details class="overflow-hidden rounded-[1.7rem] border border-border/80 bg-background/56 open:bg-background/62">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground marker:hidden">
              <span>
                {completedPlanCount()} of {props.plan.length} todos completed
              </span>
              <span class="text-xs text-muted-foreground">{props.plan.length ? "Expand plan" : "Waiting for plan"}</span>
            </summary>
            <div class="border-t border-border/70 px-4 py-3">
              {props.plan.length ? (
                <ul class="flex flex-col gap-2">
                  {props.plan.map(entry => (
                    <li class="flex items-start gap-3 rounded-2xl px-1 py-1 text-sm text-foreground">
                      <span
                        class={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold ${
                          entry.status === "completed"
                            ? "border-primary/25 bg-primary/12 text-primary"
                            : entry.status === "in_progress"
                              ? "border-border/80 bg-secondary/80 text-secondary-foreground"
                              : "border-border/80 bg-background/70 text-muted-foreground"
                        }`}
                      >
                        {entry.status === "completed" ? "✓" : entry.status === "in_progress" ? "•" : ""}
                      </span>
                      <span class={`leading-7 ${entry.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{entry.content}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="text-sm leading-6 text-muted-foreground">The active plan will appear here when the agent reports todo progress.</p>
              )}
            </div>
          </details>

          <div class="rounded-[1.7rem] border border-border/80 bg-background/56 p-2 sm:p-3">
            <div class="flex items-end gap-2">
              <div class="flex-1">
                <label for="prompt" class="sr-only">
                  Prompt
                </label>
                <textarea
                  id="prompt"
                  name="prompt"
                  autocomplete="off"
                  value={value()}
                  onInput={event => setValue(event.currentTarget.value)}
                  rows={3}
                  placeholder="Ask anything..."
                  class="min-h-24 w-full resize-none border-0 bg-transparent px-3 py-3 text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>

              <div class="flex items-center gap-2 pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="rounded-2xl border border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/80"
                  aria-label="Add attachment"
                  title="Add attachment"
                >
                  <PlusIcon class="size-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  class="size-12 rounded-2xl bg-primary text-primary-foreground"
                  disabled={!props.canSend || !value().trim()}
                  onClick={() => void submit()}
                  aria-label="Send prompt"
                  title="Send prompt"
                >
                  <SendIcon class="size-5" />
                </Button>
              </div>
            </div>

            <div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-1 pt-2">
              <div class="flex flex-wrap items-center gap-2">
                <div>
                  <label for="cwd" class="sr-only">
                    Working directory
                  </label>
                  <input
                    type="text"
                    name="cwd"
                    id="cwd"
                    autocomplete="off"
                    value={props.cwd}
                    placeholder="/workspace"
                    onInput={event => props.onCwdInput(event.currentTarget.value)}
                    class="h-9 min-w-36 rounded-xl border border-border/70 bg-background/70 px-3 text-xs text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:min-w-52"
                  />
                </div>

                <div>
                  <label for="mode" class="sr-only">
                    Mode
                  </label>
                  <select
                    id="mode"
                    name="mode"
                    value={props.selectedModeId ?? ""}
                    disabled={!props.canConfigure || props.modeOptions.length === 0}
                    onChange={event => void props.onModeChange(event.currentTarget.value)}
                    class="flex h-9 rounded-xl border border-input/70 bg-background/70 px-3 py-2 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    title="Mode"
                  >
                    <option value="" disabled>
                      Mode
                    </option>
                    {props.modeOptions.map(mode => (
                      <option value={mode.id} title={mode.description ?? undefined}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label for="model" class="sr-only">
                    Model
                  </label>
                  <select
                    id="model"
                    name="model"
                    value={props.selectedModelId ?? ""}
                    disabled={!props.canConfigure || props.modelOptions.length === 0}
                    onChange={event => void props.onModelChange(event.currentTarget.value)}
                    class="flex h-9 rounded-xl border border-input/70 bg-background/70 px-3 py-2 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    title="Model"
                  >
                    <option value="" disabled>
                      Model
                    </option>
                    {props.modelOptions.map(model => (
                      <option value={model.id} title={model.description ?? undefined}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <div class="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                  {props.status}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/80"
                  disabled={!props.canStartSession}
                  onClick={() => void props.onStartSession()}
                  aria-label="Start session"
                  title="Start session"
                >
                  <TerminalIcon class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/80"
                  disabled={!props.canCancel}
                  onClick={() => void props.onCancel()}
                  aria-label="Cancel run"
                  title="Cancel run"
                >
                  <StopIcon class="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="rounded-xl border border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/80"
                  disabled={!props.canCloseSession}
                  onClick={() => void props.onCloseSession()}
                  aria-label="Close session"
                  title="Close session"
                >
                  <ChatIcon class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
