import type { BaseMessage, ContentBlock } from "@langchain/core/messages";

export type ComposerTextPart = {
  text: string;
  type: "text";
};

export type ComposerImagePart = {
  image: string;
  type: "image";
};

export type ComposerFilePart = {
  data?: string;
  filename: string;
  mimeType?: string;
  type: "file";
};

export type ComposerPart =
  | ComposerFilePart
  | ComposerImagePart
  | ComposerTextPart;

export type ChatTextPart = {
  text: string;
  type: "text";
};

export type ChatReasoningPart = {
  text: string;
  type: "reasoning";
};

export type ChatImagePart = {
  image: string;
  type: "image";
};

export type ChatToolCallPart = {
  args: Record<string, unknown>;
  argsText: string;
  isError?: boolean;
  result?: unknown;
  toolCallId: string;
  toolName: string;
  type: "tool-call";
};

export type ChatMessagePart =
  | ChatImagePart
  | ChatReasoningPart
  | ChatTextPart
  | ChatToolCallPart;

export type ChatMessage = {
  content: ChatMessagePart[];
  id: string;
  role: "assistant" | "user";
};

function isComposerTextPart(part: unknown): part is ComposerTextPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "text" &&
    "text" in part &&
    typeof part.text === "string"
  );
}

function isComposerImagePart(part: unknown): part is ComposerImagePart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "image" &&
    "image" in part &&
    typeof part.image === "string"
  );
}

function isComposerFilePart(part: unknown): part is ComposerFilePart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "file"
  );
}

export function getTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (part): part is ContentBlock.Text =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
}

function getImageCount(content: unknown): number {
  if (!Array.isArray(content)) return 0;

  return content.filter(
    (part): part is ContentBlock.Multimodal.Image =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "image_url" &&
      "image_url" in part,
  ).length;
}

function getImageUrl(part: ContentBlock[]): string[] {
  return part.flatMap((block) => {
    if (typeof block !== "object" || block === null || !("type" in block)) {
      return [];
    }

    if (block.type === "image_url" && "image_url" in block) {
      const image = block.image_url;
      if (typeof image === "string") return [image];
      if (
        typeof image === "object" &&
        image !== null &&
        "url" in image &&
        typeof image.url === "string"
      ) {
        return [image.url];
      }
      return [];
    }

    if (block.type === "image") {
      if ("url" in block && typeof block.url === "string") return [block.url];
      if ("data" in block && typeof block.data === "string")
        return [block.data];
    }

    return [];
  });
}

function toUserThreadContent(
  content: string | ContentBlock[],
): ChatTextPart[] {
  const text = getTextFromContent(content).trim();
  const imageCount = getImageCount(content);
  const parts: ChatTextPart[] = [];

  if (text.length > 0) {
    parts.push({ text, type: "text" });
  }

  if (imageCount > 0) {
    parts.push({
      text:
        imageCount === 1
          ? "[Image attached]"
          : `[${imageCount} images attached]`,
      type: "text",
    });
  }

  if (parts.length === 0) {
    parts.push({ text: "", type: "text" });
  }

  return parts;
}

type LangChainToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
};

type LangChainToolMessage = BaseMessage & {
  type: "tool";
  artifact?: unknown;
  status?: "success" | "error";
  tool_call_id: string;
};

function isLangChainToolCall(value: unknown): value is LangChainToolCall {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "args" in value &&
    typeof value.args === "object" &&
    value.args !== null
  );
}

function isLangChainToolMessage(
  message: BaseMessage,
): message is LangChainToolMessage {
  return message.type === "tool" && "tool_call_id" in message;
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function toReadonlyJsonObject(value: unknown): ChatToolCallPart["args"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as ChatToolCallPart["args"];
  } catch {
    return {};
  }
}

function toToolResult(message: LangChainToolMessage): unknown {
  if (message.artifact !== undefined) return message.artifact;

  const text = getTextFromContent(message.content).trim();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toAssistantThreadContent(
  message: BaseMessage,
): ChatMessagePart[] {
  const parts: ChatMessagePart[] = [];
  // message.content may be a string or an array of content blocks (plain objects from LangGraph)
  const rawContent = message.content;
  const contentArray: unknown[] =
    typeof rawContent === "string"
      ? rawContent.trim().length > 0
        ? [{ type: "text", text: rawContent }]
        : []
      : Array.isArray(rawContent)
        ? rawContent
        : [];

  for (const part of contentArray) {
    if (typeof part !== "object" || part === null || !("type" in part))
      continue;

    const p = part as Record<string, unknown>;

    if (p.type === "text" && typeof p.text === "string") {
      if ((p.text as string).trim().length > 0) {
        parts.push({ text: p.text as string, type: "text" });
      }
      continue;
    }

    if (
      p.type === "reasoning" &&
      typeof p.reasoning === "string" &&
      (p.reasoning as string).trim().length > 0
    ) {
      const reasoningPart: ChatReasoningPart = {
        text: p.reasoning as string,
        type: "reasoning",
      };
      parts.push(reasoningPart);
      continue;
    }

    // tool_use is the Anthropic format; tool_call is the generic LangChain format
    if (
      (p.type === "tool_use" || p.type === "tool_call") &&
      typeof p.name === "string"
    ) {
      const toolCallPart: ChatToolCallPart = {
        args: toReadonlyJsonObject(p.input ?? p.args ?? {}),
        argsText: safeJsonStringify(p.input ?? p.args ?? {}),
        toolCallId:
          typeof p.id === "string"
            ? p.id
            : `${message.id ?? "ai"}-${parts.length}`,
        toolName: p.name,
        type: "tool-call",
      };
      parts.push(toolCallPart);
      continue;
    }

    if (p.type === "image" || p.type === "image_url") {
      for (const image of getImageUrl([part as ContentBlock])) {
        parts.push({ image, type: "image" });
      }
    }
  }

  const toolCalls = "tool_calls" in message ? message.tool_calls : undefined;
  if (Array.isArray(toolCalls)) {
    const existingIds = new Set(
      parts
        .filter(
          (part): part is ChatToolCallPart => part.type === "tool-call",
        )
        .map((part) => part.toolCallId),
    );

    toolCalls.filter(isLangChainToolCall).forEach((toolCall, index) => {
      const toolCallId = toolCall.id ?? `${message.id ?? "ai"}-tool-${index}`;
      if (existingIds.has(toolCallId)) return;

      parts.push({
        args: toReadonlyJsonObject(toolCall.args),
        argsText: safeJsonStringify(toolCall.args),
        toolCallId,
        toolName: toolCall.name,
        type: "tool-call",
      });
    });
  }

  return parts;
}

function attachToolResult(
  threadMessages: ChatMessage[],
  toolMessage: LangChainToolMessage,
) {
  for (let index = threadMessages.length - 1; index >= 0; index -= 1) {
    const message = threadMessages[index];
    if (
      !message ||
      message.role !== "assistant" ||
      !Array.isArray(message.content)
    )
      continue;

    const updatedContent = message.content.map((part): typeof part => {
      if (
        part.type !== "tool-call" ||
        part.toolCallId !== toolMessage.tool_call_id
      ) {
        return part;
      }

      return {
        ...part,
        isError: toolMessage.status === "error",
        result: toToolResult(toolMessage),
      };
    });

    threadMessages[index] = { ...message, content: updatedContent };
    return;
  }
}

export function toThreadMessages(
  messages: readonly BaseMessage[],
): ChatMessage[] {
  const threadMessages: ChatMessage[] = [];

  for (const [index, message] of messages.entries()) {
    const fallbackId = `${message.type}-${index}`;
    const messageId = message.id ?? fallbackId;

    if (message.type === "human") {
      threadMessages.push({
        content: toUserThreadContent(message.content),
        id: messageId,
        role: "user",
      });
      continue;
    }

    if (isLangChainToolMessage(message)) {
      attachToolResult(threadMessages, message);
      continue;
    }

    if (message.type !== "ai") {
      continue;
    }

    const content = toAssistantThreadContent(message);
    if (content.length === 0) continue;

    threadMessages.push({
      content,
      id: messageId,
      role: "assistant",
    });
  }

  return threadMessages;
}

export function toLangGraphMessageContent(parts: readonly ContentBlock[]) {
  const content: Array<
    { text: string; type: "text" } | { image_url: string; type: "image_url" }
  > = [];

  for (const part of parts) {
    if (isComposerTextPart(part) && part.text.trim()) {
      content.push({ text: part.text, type: "text" });
      continue;
    }

    if (isComposerImagePart(part) && part.image) {
      content.push({ image_url: part.image, type: "image_url" });
      continue;
    }

    if (
      isComposerFilePart(part) &&
      part.data &&
      part.mimeType?.startsWith("image/")
    ) {
      content.push({ image_url: part.data, type: "image_url" });
      continue;
    }

    if (isComposerFilePart(part) && part.filename) {
      content.push({
        text: `[Attached file: ${part.filename}]`,
        type: "text",
      });
    }
  }

  if (content.length === 0) return null;
  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text;
  }

  return content;
}

export function getAssistantText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .flatMap((part) => {
      if (typeof part === "string") return [part];
      if (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return [part.text];
      }

      return [];
    })
    .join("");
}

export function createUserMessage(id: string, text: string, imageCount = 0): ChatMessage {
  const content: ChatMessagePart[] = [];

  if (text.trim()) {
    content.push({ text, type: "text" });
  }

  if (imageCount > 0) {
    content.push({
      text: imageCount === 1 ? "[Image attached]" : `[${imageCount} images attached]`,
      type: "text",
    });
  }

  if (content.length === 0) {
    content.push({ text: "", type: "text" });
  }

  return {
    content,
    id,
    role: "user",
  };
}
