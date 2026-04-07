import { Client } from "@langchain/langgraph-sdk";
import type { BaseMessage, ContentBlock } from "@langchain/core/messages";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { Claude } from "./claude";
import {
  createUserMessage,
  getAssistantText,
  toThreadMessages,
} from "../lib/message-utils";
import { getThreadIdParam, setThreadIdParam } from "../lib/thread-id";

type PendingAttachment = {
  file: File;
  id: string;
  previewUrl?: string;
};

const apiUrl =
  import.meta.env.VITE_LANGGRAPH_API_URL ??
  `${window.location.origin}/api/langgraph`;
const assistantId = import.meta.env.VITE_LANGGRAPH_ASSISTANT_ID ?? "ipaper-agent";
const client = new Client({ apiUrl });

export function MyAssistant() {
  let fileInputRef: HTMLInputElement | undefined;
  let viewportRef: HTMLDivElement | undefined;

  const [attachments, setAttachments] = createSignal<PendingAttachment[]>([]);
  const [error, setError] = createSignal<string>();
  const [input, setInput] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [messages, setMessages] = createSignal<BaseMessage[]>([]);
  const [pendingAssistantText, setPendingAssistantText] = createSignal("");
  const [pendingUserMessage, setPendingUserMessage] = createSignal<ReturnType<typeof createUserMessage>>();
  const [threadId, setThreadId] = createSignal<string | undefined>(getThreadIdParam());
  const [abortController, setAbortController] = createSignal<AbortController>();

  const displayMessages = createMemo(() => {
    const nextMessages = [...toThreadMessages(messages())];
    const optimisticUser = pendingUserMessage();
    if (optimisticUser) nextMessages.push(optimisticUser);

    const optimisticAssistant = pendingAssistantText().trim();
    if (optimisticAssistant) {
      nextMessages.push({
        content: [{ text: optimisticAssistant, type: "text" }],
        id: "pending-assistant",
        role: "assistant",
      });
    }

    return nextMessages;
  });

  createEffect(() => {
    displayMessages();
    isLoading();
    queueMicrotask(() => {
      viewportRef?.scrollTo({
        behavior: "smooth",
        top: viewportRef.scrollHeight,
      });
    });
  });

  onMount(async () => {
    const currentThreadId = threadId();
    if (currentThreadId) {
      await refreshMessages(currentThreadId);
    }
  });

  onCleanup(() => {
    abortController()?.abort();
    clearAttachments(attachments());
  });

  return (
    <Claude
      attachments={attachments().map((attachment) => ({
        id: attachment.id,
        name: attachment.file.name,
        previewUrl: attachment.previewUrl,
      }))}
      error={error()}
      input={input()}
      isLoading={isLoading()}
      messages={displayMessages()}
      onAddAttachment={() => {
        fileInputRef?.click();
      }}
      onCancel={() => {
        abortController()?.abort();
        setAbortController(undefined);
        setIsLoading(false);
      }}
      onFilesSelected={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        if (files.length === 0) return;

        setAttachments((current) => [
          ...current,
          ...files.map((file) => ({
            file,
            id: crypto.randomUUID(),
            previewUrl: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : undefined,
          })),
        ]);

        event.currentTarget.value = "";
      }}
      onInput={setInput}
      onRemoveAttachment={(id) => {
        setAttachments((current) => {
          const attachment = current.find((item) => item.id === id);
          if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
          return current.filter((item) => item.id !== id);
        });
      }}
      onSubmit={() => {
        void submitPrompt();
      }}
      onSuggestionClick={(prompt) => {
        void submitPrompt(prompt);
      }}
      setFileInputRef={(element) => {
        fileInputRef = element;
      }}
      setViewportRef={(element) => {
        viewportRef = element;
      }}
    />
  );

  async function ensureThread() {
    const currentThreadId = threadId();
    if (currentThreadId) return currentThreadId;

    const nextThread = await client.threads.create();
    setThreadId(nextThread.thread_id);
    setThreadIdParam(nextThread.thread_id);
    return nextThread.thread_id;
  }

  async function refreshMessages(currentThreadId: string) {
    const history = await client.threads.getHistory<{ messages?: BaseMessage[] }>(
      currentThreadId,
      { limit: 1 },
    );
    const latestState = history[0];
    setMessages(Array.isArray(latestState?.values?.messages) ? latestState.values.messages : []);
  }

  async function submitPrompt(promptOverride?: string) {
    if (isLoading()) return;

    const text = (promptOverride ?? input()).trim();
    const currentAttachments = attachments();
    if (!text && currentAttachments.length === 0) return;

    setError(undefined);
    setIsLoading(true);
    setPendingAssistantText("");

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const content = await buildMessageContent(text, currentAttachments);
      if (!content) return;

      const imageCount = currentAttachments.filter((attachment) =>
        attachment.file.type.startsWith("image/"),
      ).length;
      setPendingUserMessage(createUserMessage("pending-user", text, imageCount));
      setInput("");
      setAttachments((current) => {
        clearAttachments(current);
        return [];
      });

      const currentThreadId = await ensureThread();
      const stream = (client.runs.stream as (...args: unknown[]) => AsyncIterable<{ data: unknown; event: string }>)(
        currentThreadId,
        assistantId,
        {
          config: {
            recursion_limit: 50,
          },
          input: {
            messages: [{ content, type: "human" }],
          },
          signal: controller.signal,
          streamMode: ["messages-tuple"],
        },
      );

      for await (const chunk of stream) {
        if (chunk.event !== "messages") continue;

        const [messageChunk] = chunk.data as [BaseMessage, unknown];
        const textChunk = getAssistantText(messageChunk?.content);
        if (!textChunk) continue;

        setPendingAssistantText((current) => current + textChunk);
      }

      await refreshMessages(currentThreadId);
    } catch (cause) {
      if (controller.signal.aborted) {
        const currentThreadId = threadId();
        if (currentThreadId) {
          await refreshMessages(currentThreadId);
        }
      } else {
        setError(cause instanceof Error ? cause.message : "An unexpected error occurred.");
      }
    } finally {
      setAbortController(undefined);
      setIsLoading(false);
      setPendingAssistantText("");
      setPendingUserMessage(undefined);
    }
  }
}

async function buildMessageContent(
  text: string,
  attachments: PendingAttachment[],
): Promise<string | ContentBlock[] | null> {
  const content: ContentBlock[] = [];

  if (text) {
    content.push({ text, type: "text" });
  }

  for (const attachment of attachments) {
    if (attachment.file.type.startsWith("image/")) {
      content.push({
        image_url: await readFileAsDataUrl(attachment.file),
        type: "image_url",
      });
      continue;
    }

    content.push({
      text: `[Attached file: ${attachment.file.name}]`,
      type: "text",
    });
  }

  if (content.length === 0) return null;
  const firstPart = content[0];
  if (
    content.length === 1 &&
    firstPart?.type === "text" &&
    "text" in firstPart &&
    typeof firstPart.text === "string"
  ) {
    return firstPart.text;
  }

  return content;
}

function clearAttachments(attachments: PendingAttachment[]) {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error(`Failed to read ${file.name}.`));
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Failed to read ${file.name}.`));
        return;
      }

      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
