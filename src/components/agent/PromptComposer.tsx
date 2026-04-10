import { createSignal } from "solid-js";

import type { SessionModelOptionView, SessionModeOptionView } from "~/components/agent/types";

export default function PromptComposer(props: {
  canSend: boolean;
  canCancel: boolean;
  canConfigure: boolean;
  status: string;
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
    <div class="composer">
      <div class="composer-config-grid">
        <label class="composer-config-field">
          <span>Mode</span>
          <select
            value={props.selectedModeId ?? ""}
            disabled={!props.canConfigure || props.modeOptions.length === 0}
            onChange={event => void props.onModeChange(event.currentTarget.value)}
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

        <label class="composer-config-field">
          <span>Model</span>
          <select
            value={props.selectedModelId ?? ""}
            disabled={!props.canConfigure || props.modelOptions.length === 0}
            onChange={event => void props.onModelChange(event.currentTarget.value)}
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

      <textarea
        value={value()}
        onInput={event => setValue(event.currentTarget.value)}
        rows="4"
        placeholder="Ask the local agent to inspect code, plan work, or execute a task."
      />
      <div class="composer-actions">
        <span class="status-pill">{props.status}</span>
        <button type="button" class="secondary-button" disabled={!props.canCancel} onClick={() => void props.onCancel()}>
          Cancel
        </button>
        <button type="button" class="primary-button" disabled={!props.canSend || !value().trim()} onClick={() => void submit()}>
          Send
        </button>
      </div>
    </div>
  );
}
