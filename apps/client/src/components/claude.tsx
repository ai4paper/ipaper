import { For, Show, type JSX } from "solid-js";

import type { ChatMessage, ChatMessagePart } from "../lib/message-utils";

const SUGGESTIONS = [
  "Explain the difference between LangGraph and a basic agent loop in simple terms",
  "Compare vector databases for a medium-size RAG system and recommend one",
  "Draft a concise launch announcement for a new AI developer tool",
];

export type AttachmentItem = {
  id: string;
  name: string;
  previewUrl?: string;
};

export function Claude({
  attachments,
  error,
  input,
  isLoading,
  messages,
  onAddAttachment,
  onCancel,
  onFilesSelected,
  onInput,
  onRemoveAttachment,
  onSubmit,
  onSuggestionClick,
  setFileInputRef,
  setViewportRef,
}: {
  attachments: AttachmentItem[];
  error?: string;
  input: string;
  isLoading: boolean;
  messages: ChatMessage[];
  onAddAttachment: () => void;
  onCancel: () => void;
  onFilesSelected: JSX.EventHandlerUnion<HTMLInputElement, InputEvent>;
  onInput: (value: string) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (prompt: string) => void;
  setFileInputRef: (element: HTMLInputElement) => void;
  setViewportRef: (element: HTMLDivElement) => void;
}) {
  return (
    <div class="flex h-dvh flex-col bg-[#2b2a27]">
      <div class="flex h-full flex-col items-stretch bg-[#2b2a27] p-4 pt-10 font-serif text-[#eee]">
        <div class="flex grow flex-col overflow-y-auto" ref={setViewportRef}>
          <Show when={messages.length === 0}>
            <div class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-2 pb-12">
              <div class="text-center">
                <div class="text-xs uppercase tracking-[0.24em] text-[#9a9893]">
                  iPaper AI Assistant
                </div>
                <h1 class="mt-4 text-4xl text-[#f1efe8]">
                  What can I help with?
                </h1>
                <p class="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#b8b5a9]">
                  Powered by LangGraph with a SolidJS client. Ask anything or pick a
                  suggestion below.
                </p>
              </div>

              <div class="mt-8 grid gap-3">
                <For each={SUGGESTIONS}>
                  {(suggestion) => (
                  <button
                    class="rounded-2xl border border-[#6c6a6040] bg-[#1f1e1b] px-4 py-3 text-left text-sm text-[#f1efe8] transition hover:bg-[#252421]"
                    onClick={() => onSuggestionClick(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <For each={messages}>{(message) => <ChatMessageView message={message} />}</For>

          <Show when={isLoading}>
            <div class="mx-auto mt-4 flex w-full max-w-3xl items-center gap-3 px-2 text-sm text-[#b8b5a9]">
              <SparklesIcon class="h-4 w-4" />
              <span class="shimmer shimmer-invert shimmer-duration-1500 shimmer-repeat-delay-0">
                Thinking...
              </span>
            </div>
          </Show>

          <div aria-hidden="true" class="h-4" />
        </div>

        <Show when={error}>
          <div class="mx-auto mb-3 w-full max-w-3xl rounded-xl border border-[#d97c66]/30 bg-[#d97c66]/10 px-4 py-3 text-sm text-[#f3c3b7]">
            <div class="flex items-center gap-2">
              <AlertCircleIcon class="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        </Show>

        <div class="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-transparent bg-[#1f1e1b] p-0.5 shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.15)] transition-shadow duration-200 hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(108,106,96,0.3)] focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(108,106,96,0.3)]">
          <div class="m-3.5 flex flex-col gap-3.5">
            <div class="relative">
              <div class="max-h-96 w-full overflow-y-auto">
                <textarea
                  class="block min-h-6 w-full resize-none bg-transparent text-[#eee] outline-none placeholder:text-[#9a9893]"
                  onInput={(event) => onInput(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      onSubmit();
                    }
                  }}
                  placeholder="Ask anything..."
                  rows={1}
                  value={input}
                />
              </div>
            </div>

            <div class="flex w-full items-center gap-2">
              <div class="relative flex min-w-0 flex-1 shrink items-center gap-2">
                <input
                  class="hidden"
                  multiple
                  onInput={onFilesSelected}
                  ref={setFileInputRef}
                  type="file"
                />

                <button
                  aria-label="Add attachment"
                  class="flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-lg border border-[#6c6a6040] bg-transparent px-1.5 text-[#9a9893] transition-all hover:bg-[#393937] hover:text-[#eee] active:scale-[0.98]"
                  onClick={onAddAttachment}
                  type="button"
                >
                  <PlusIcon class="h-4 w-4" />
                </button>
              </div>

              <button
                class="flex h-8 min-w-16 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 pl-2.5 pr-2 text-xs text-[#eee] transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-[#393937] active:scale-[0.985]"
                type="button"
              >
                <span class="font-serif text-[14px]">
                  Solid iPaper
                </span>
                <ChevronDownIcon class="h-5 w-5 opacity-75" />
              </button>

              <Show
                fallback={
                  <button
                    class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ae5630] transition-colors hover:bg-[#c4633a] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                    onClick={onSubmit}
                    type="button"
                  >
                    <ArrowUpIcon class="h-4 w-4 text-white" />
                  </button>
                }
                when={isLoading}
              >
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5f5b53] transition-colors hover:bg-[#716c63] active:scale-95"
                  onClick={onCancel}
                  type="button"
                >
                  <StopIcon class="h-3.5 w-3.5 text-white" />
                </button>
              </Show>
            </div>
          </div>

          <Show when={attachments.length > 0}>
            <div class="overflow-hidden rounded-b-2xl">
              <div class="overflow-x-auto rounded-b-2xl border-t border-[#6c6a6040] bg-[#393937] p-3.5">
                <div class="flex flex-row gap-3">
                  <For each={attachments}>
                    {(attachment) => (
                      <div class="group/thumbnail relative">
                        <div
                          class="overflow-hidden rounded-lg border border-[#6c6a6040] shadow-sm hover:border-[#6c6a6080] hover:shadow-md"
                          style={{
                            height: "120px",
                            "min-height": "120px",
                            "min-width": "120px",
                            width: "120px",
                          }}
                        >
                          <div
                            class="flex h-full w-full items-center justify-center bg-[#2b2a27] p-3 text-center text-xs text-[#d8d5cb]"
                          >
                            <Show
                              fallback={<span>{attachment.name}</span>}
                              when={attachment.previewUrl}
                            >
                              <img
                                alt={attachment.name}
                                class="h-full w-full object-cover"
                                src={attachment.previewUrl}
                              />
                            </Show>
                          </div>
                        </div>

                        <button
                          aria-label="Remove attachment"
                          class="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#6c6a6040] bg-[#1f1e1b]/90 text-[#9a9893] opacity-0 backdrop-blur-sm transition-all hover:bg-[#1f1e1b] hover:text-[#eee] group-hover/thumbnail:opacity-100"
                          onClick={() => onRemoveAttachment(attachment.id)}
                          type="button"
                        >
                          <CrossIcon class="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}

function ChatMessageView(props: { message: ChatMessage }) {
  const hasText = () =>
    props.message.content.some(
      (part) => part.type === "text" && part.text.trim().length > 0,
    );
  const hasRenderableContent = () =>
    props.message.content.some((part) =>
      part.type === "text"
        ? part.text.trim().length > 0
        : part.type === "reasoning" ||
            part.type === "tool-call" ||
            part.type === "image",
    );

  return (
    <div class="group relative mx-auto my-1 block w-full max-w-3xl">
      <Show when={props.message.role === "user"}>
        <div class="group/user relative inline-flex max-w-[75ch] flex-col gap-2 rounded-xl bg-[#393937] py-2.5 pl-2.5 pr-6 text-[#eee]">
          <div class="relative flex flex-row gap-2">
            <div class="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-[#eee] text-[12px] font-bold text-[#2b2a27]">
              U
            </div>
            <div class="flex-1">
              <div class="relative grid grid-cols-1 gap-2 py-0.5">
                <div class="whitespace-pre-wrap">
                  <For each={props.message.content}>{renderMessagePart}</For>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={props.message.role === "assistant"}>
        <div class="relative mb-12 font-serif">
          <div class="relative leading-[1.65rem]">
            <div class="grid grid-cols-1 gap-2.5">
              <div class="whitespace-normal px-2 pr-8 font-serif text-[#eee]">
                <Show when={hasRenderableContent()}>
                  <For each={props.message.content}>{renderMessagePart}</For>
                </Show>
              </div>
            </div>
          </div>

          <Show when={hasText()}>
            <div class="pointer-events-none absolute inset-x-0 bottom-0">
              <div class="pointer-events-auto flex w-full translate-y-full flex-col items-end px-2 pt-2 transition">
                <div class="flex items-center text-[#9a9893]">
                  <button
                    class="flex h-8 w-8 items-center justify-center rounded-md transition duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] hover:bg-transparent active:scale-95"
                    onClick={() => copyMessageText(props.message)}
                    type="button"
                  >
                    <ClipboardIcon class="h-5 w-5" />
                  </button>
                </div>
                <p class="mt-2 w-full text-right text-[0.65rem] leading-[0.85rem] text-[#b8b5a9] opacity-90 sm:text-[0.75rem]">
                  iPaper AI - verify important details before relying on them.
                </p>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

function renderMessagePart(part: ChatMessagePart) {
  if (part.type === "text") {
    return <div class="whitespace-pre-wrap break-words">{part.text}</div>;
  }

  if (part.type === "reasoning") {
    return (
      <div class="mb-4 overflow-hidden rounded-2xl border border-[#6c6a6040] bg-[#242320]">
        <div class="flex items-center gap-2 border-b border-[#6c6a6030] px-4 py-3 text-sm text-[#b8b5a9]">
          <SparklesIcon class="h-4 w-4 shrink-0" />
          <span class="font-medium">Thinking</span>
        </div>
        <div class="whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-[#b8b5a9] italic">
          {part.text}
        </div>
      </div>
    );
  }

  if (part.type === "tool-call") {
    const statusLabel = part.isError
      ? "Error"
      : part.result !== undefined
        ? "Completed"
        : "Pending";

    return (
      <div class="mb-4 rounded-2xl border border-[#6c6a6040] bg-[#1f1e1b] shadow-sm">
        <div class="flex items-center justify-between gap-3 border-b border-[#6c6a6030] px-4 py-2.5">
          <div class="flex items-center gap-2 text-sm font-medium text-[#f1efe8]">
            <ToolIcon class="h-3.5 w-3.5" />
            <span>{part.toolName}</span>
          </div>
          <span class="text-[11px] uppercase tracking-[0.18em] text-[#9a9893]">
            {statusLabel}
          </span>
        </div>

        <div class="space-y-3 px-4 py-3">
          <div>
            <div class="mb-1 text-[11px] uppercase tracking-[0.18em] text-[#9a9893]">
              Arguments
            </div>
            <pre class="overflow-x-auto rounded-xl bg-[#2b2a27] p-3 text-xs leading-5 text-[#d8d5cb]">
              {part.argsText}
            </pre>
          </div>

          <Show when={part.result !== undefined}>
            <div>
              <div class="mb-1 text-[11px] uppercase tracking-[0.18em] text-[#9a9893]">
                Result
              </div>
              <pre class="overflow-x-auto rounded-xl bg-[#2b2a27] p-3 text-xs leading-5 text-[#d8d5cb]">
                {formatToolValue(part.result)}
              </pre>
            </div>
          </Show>
        </div>
      </div>
    );
  }

  return (
    <div class="mb-4 overflow-hidden rounded-2xl border border-[#6c6a6040] bg-[#242320]">
      <img alt="Assistant attachment" class="max-h-96 w-full object-cover" src={part.image} />
    </div>
  );
}

function formatToolValue(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function copyMessageText(message: ChatMessage) {
  const text = message.content
    .filter((part): part is Extract<ChatMessagePart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();

  if (!text) return;
  void navigator.clipboard.writeText(text);
}

function iconPath(props: { class?: string; path: string; viewBox?: string }) {
  return (
    <svg
      class={props.class}
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.8"
      viewBox={props.viewBox ?? "0 0 24 24"}
    >
      <path d={props.path} />
    </svg>
  );
}

function ArrowUpIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "M12 19V5m0 0-5 5m5-5 5 5" });
}

function ChevronDownIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "m6 9 6 6 6-6" });
}

function ClipboardIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a3 3 0 0 0 6 0M9 5a3 3 0 0 1 6 0" });
}

function CrossIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "M6 6l12 12M18 6 6 18" });
}

function PlusIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "M12 5v14M5 12h14" });
}

function SparklesIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15Z" });
}

function StopIcon(props: { class?: string }) {
  return <svg class={props.class} fill="currentColor" viewBox="0 0 24 24"><rect height="12" rx="2" width="12" x="6" y="6" /></svg>;
}

function ToolIcon(props: { class?: string }) {
  return iconPath({ class: props.class, path: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-3 3-2-2 3-4Z" });
}

function AlertCircleIcon(props: { class?: string }) {
  return (
    <svg class={props.class} fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
