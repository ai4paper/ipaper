export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  status?: "streaming" | "done" | "error";
  createdAt: number;
  updatedAt: number;
}

export interface ToolCallView {
  toolCallId: string;
  title: string;
  kind: string;
  status: string;
  content?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlanEntryView {
  id: string;
  content: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
  updatedAt: number;
}

export interface SessionModeOptionView {
  id: string;
  name: string;
  description?: string | null;
}

export interface SessionModelOptionView {
  id: string;
  name: string;
  description?: string | null;
}
