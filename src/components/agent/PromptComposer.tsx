import { createSignal } from "solid-js";

import type { SessionModelOptionView, SessionModeOptionView } from "~/components/agent/types";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TextField, TextFieldInput, TextFieldLabel, TextFieldTextArea } from "~/components/ui/text-field";

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
  onSend: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
  onModeChange: (modeId: string) => Promise<void>;
  onModelChange: (modelId: string) => Promise<void>;
}) {
  const [value, setValue] = createSignal("");

  async function submit() {
    const text = value().trim();
    if (!text || !props.canSend) {
      return;
    }

    setValue("");
    await props.onSend(text);
  }

  return (
    <Card class="sticky bottom-3 bg-slate-950/72">
      <CardHeader class="mb-4 flex flex-col gap-2.5 p-4 pb-0 sm:p-5 sm:pb-0 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Compose</p>
          <CardTitle class="mt-0.5">Session Controls</CardTitle>
        </div>
        <span class="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium capitalize tracking-[0.1em] text-slate-200">
          {props.status}
        </span>
      </CardHeader>

      <CardContent class="p-4 pt-0 sm:p-5 sm:pt-0">
        <div class="grid gap-3 md:grid-cols-2">
          <TextField class="md:col-span-2">
            <TextFieldLabel>Working directory</TextFieldLabel>
            <TextFieldInput
              type="text"
              name="cwd"
              autocomplete="off"
              value={props.cwd}
              placeholder="/path/to/project"
              onInput={event => props.onCwdInput(event.currentTarget.value)}
            />
          </TextField>

          <label>
            <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Mode</span>
            <select
              name="mode"
              value={props.selectedModeId ?? ""}
              disabled={!props.canConfigure || props.modeOptions.length === 0}
              onChange={event => void props.onModeChange(event.currentTarget.value)}
              class="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                Select a mode
              </option>
              {props.modeOptions.map(mode => (
                <option value={mode.id} title={mode.description ?? undefined}>
                  {mode.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Model</span>
            <select
              name="model"
              value={props.selectedModelId ?? ""}
              disabled={!props.canConfigure || props.modelOptions.length === 0}
              onChange={event => void props.onModelChange(event.currentTarget.value)}
              class="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                Select a model
              </option>
              {props.modelOptions.map(model => (
                <option value={model.id} title={model.description ?? undefined}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <TextField class="mt-3">
          <TextFieldTextArea
            name="prompt"
            autocomplete="off"
            value={value()}
            onInput={event => setValue(event.currentTarget.value)}
            rows="3"
            placeholder="Ask the local agent to inspect code, plan work, or execute a task..."
          />
        </TextField>

        <div class="mt-3 flex flex-wrap items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" disabled={!props.canStartSession} onClick={() => void props.onStartSession()}>
            Start Session
          </Button>
          <Button type="button" variant="secondary" disabled={!props.canCloseSession} onClick={() => void props.onCloseSession()}>
            Close Session
          </Button>
          <Button type="button" variant="outline" disabled={!props.canCancel} onClick={() => void props.onCancel()}>
            Cancel
          </Button>
          <Button type="button" disabled={!props.canSend || !value().trim()} onClick={() => void submit()}>
            Send Prompt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
