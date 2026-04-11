import { createSignal } from "solid-js";

import type { SessionModelOptionView, SessionModeOptionView } from "~/components/agent/types";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/components/ui/field";
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
    <Card class="sticky bottom-3 border-border/70 bg-card/90 shadow-lg shadow-black/10">
      <CardHeader class="gap-3 p-4 pb-0 sm:p-5 sm:pb-0 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-col gap-1">
          <CardTitle>Session Controls</CardTitle>
          <CardDescription>Start a session, configure the workspace, then send the next instruction.</CardDescription>
        </div>
        <div class="inline-flex w-fit items-center rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
          {props.status}
        </div>
      </CardHeader>

      <CardContent class="p-4 pt-0 sm:p-5 sm:pt-0">
        <FieldGroup>
          <TextField>
            <TextFieldLabel>Working directory</TextFieldLabel>
            <TextFieldInput
              type="text"
              name="cwd"
              autocomplete="off"
              value={props.cwd}
              placeholder="/path/to/project"
              onInput={event => props.onCwdInput(event.currentTarget.value)}
            />
            <FieldDescription>The local workspace the agent can inspect and modify.</FieldDescription>
          </TextField>

          <div class="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel for="mode">Mode</FieldLabel>
              <select
                id="mode"
                name="mode"
                value={props.selectedModeId ?? ""}
                disabled={!props.canConfigure || props.modeOptions.length === 0}
                onChange={event => void props.onModeChange(event.currentTarget.value)}
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
            </Field>

            <Field>
              <FieldLabel for="model">Model</FieldLabel>
              <select
                id="model"
                name="model"
                value={props.selectedModelId ?? ""}
                disabled={!props.canConfigure || props.modelOptions.length === 0}
                onChange={event => void props.onModelChange(event.currentTarget.value)}
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
            </Field>
          </div>

          <TextField>
            <TextFieldLabel>Prompt</TextFieldLabel>
            <TextFieldTextArea
              name="prompt"
              autocomplete="off"
              value={value()}
              onInput={event => setValue(event.currentTarget.value)}
              rows="4"
              placeholder="Ask the local agent to inspect code, plan work, or execute a task..."
            />
          </TextField>
        </FieldGroup>

        <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
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
