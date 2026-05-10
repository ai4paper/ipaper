export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type AgentEvent =
  | {
      type: "user_message";
      messageId: string;
      content: string;
      timestamp: string;
    }
  | {
      type: "assistant_message";
      messageId: string;
      content: string;
      timestamp: string;
    }
  | {
      type: "tool_use";
      toolId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
    }
  | {
      type: "result";
      success: boolean;
      cost?: number;
      duration?: number;
    }
  | {
      type: "error";
      error: string;
    };
