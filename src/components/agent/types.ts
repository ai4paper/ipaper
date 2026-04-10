export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  status?: "streaming" | "done" | "error";
}

export interface ToolCallView {
  toolCallId: string;
  title: string;
  kind: string;
  status: string;
  content?: string;
}

export interface PlanEntryView {
  content: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
}
