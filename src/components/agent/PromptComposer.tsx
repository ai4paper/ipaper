import { createSignal } from "solid-js";

export default function PromptComposer(props: {
  canSend: boolean;
  canCancel: boolean;
  status: string;
  onSend: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
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
