import type { JSX } from "solid-js";
import { createSignal } from "solid-js";

import { formatStatusBadgeLabel } from "~/components/agent/agent-layout";
import type { SessionModelOptionView, SessionModeOptionView } from "~/components/agent/types";
import { Button } from "~/components/ui/button";

function SendIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M6 11l6-6 6 6" />
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

function TerminalIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="m8 9 3 3-3 3" />
      <path d="M13 15h3" />
    </svg>
  );
}

function CloseIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class={props.class} aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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
  onSend: (value: string) => Promise<boolean>;
  onCancel: () => Promise<void>;
  onModeChange: (modeId: string) => Promise<void>;
  onModelChange: (modelId: string) => Promise<void>;
}) {
  const [value, setValue] = createSignal("");

  const canSubmit = () => !!value().trim() && (props.canSend || props.canStartSession);

  async function submit() {
    const text = value().trim();
    if (!text || !canSubmit()) {
      return;
    }

    const sent = await props.onSend(text);
    if (sent) {
      setValue("");
    }
  }

  function handlePromptKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) {
      return;
    }

    event.preventDefault();
    void submit();
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    void submit();
  }

  const submitLabel = () => (props.canStartSession && !props.canSend ? "Start & send" : "Send");

  return (
    <div class="ipaper-dock-wrap sticky bottom-0 z-30 mt-auto border-t border-border/70 bg-[rgba(9,12,20,0.94)] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-xl sm:px-5 sm:pt-4 lg:px-6">
      <form class="mx-auto flex w-full max-w-[88rem] flex-col gap-3" onSubmit={handleSubmit as JSX.EventHandler<HTMLFormElement, SubmitEvent>}>
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span class="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 font-medium text-foreground">
            <span class="size-2 rounded-full bg-primary" aria-hidden="true" />
            {formatStatusBadgeLabel(props.status)}
          </span>

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
            class="h-9 min-w-40 flex-1 rounded-xl border border-border/70 bg-background/70 px-3 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
          />

          {/* Keep these inline: the current ACP option lists are short label-only sets. */}
          <label for="mode" class="sr-only">
            Mode
          </label>
          <select
            id="mode"
            name="mode"
            value={props.selectedModeId ?? ""}
            disabled={!props.canConfigure || props.modeOptions.length === 0}
            onChange={event => void props.onModeChange(event.currentTarget.value)}
            class="h-9 rounded-xl border border-input/70 bg-background/70 px-3 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

          <label for="model" class="sr-only">
            Model
          </label>
          <select
            id="model"
            name="model"
            value={props.selectedModelId ?? ""}
            disabled={!props.canConfigure || props.modelOptions.length === 0}
            onChange={event => void props.onModelChange(event.currentTarget.value)}
            class="h-9 rounded-xl border border-input/70 bg-background/70 px-3 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

          <div class="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              class="h-9 rounded-xl px-3 text-sm"
              disabled={!props.canStartSession}
              onClick={() => void props.onStartSession()}
            >
              <TerminalIcon class="size-4" />
              Start
            </Button>
            <Button
              type="button"
              variant="ghost"
              class="h-9 rounded-xl px-3 text-sm"
              disabled={!props.canCloseSession}
              onClick={() => void props.onCloseSession()}
            >
              <CloseIcon class="size-4" />
              Close
            </Button>
          </div>
        </div>

        <div class="border-t border-border/60 pt-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div class="min-w-0 flex-1">
              <label for="prompt" class="sr-only">
                Prompt
              </label>
              <textarea
                id="prompt"
                name="prompt"
                autocomplete="off"
                value={value()}
                onInput={event => setValue(event.currentTarget.value)}
                onKeyDown={handlePromptKeyDown as JSX.EventHandler<HTMLTextAreaElement, KeyboardEvent>}
                rows={3}
                placeholder="Ask anything..."
                class="max-h-40 min-h-24 w-full resize-none overflow-y-auto rounded-xl border border-border/70 bg-background/72 px-3 py-2 text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div class="flex items-center justify-end gap-2 sm:pb-1">
              <Button
                type="button"
                variant="outline"
                class="h-10 rounded-xl px-3 text-sm"
                disabled={!props.canCancel}
                onClick={() => void props.onCancel()}
              >
                <StopIcon class="size-3.5" />
                Cancel
              </Button>
              <Button type="submit" class="h-10 rounded-xl px-4 text-sm" disabled={!canSubmit()}>
                <SendIcon class="size-4" />
                {submitLabel()}
              </Button>
            </div>
          </div>

          <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1 pt-1 text-xs text-muted-foreground">
            <span>Ctrl/Cmd+Enter sends. Shift+Enter adds a new line.</span>
            <span>{props.canStartSession && !props.canSend ? "The first send starts the session." : ""}</span>
          </div>
        </div>
      </form>
    </div>
  );
}
