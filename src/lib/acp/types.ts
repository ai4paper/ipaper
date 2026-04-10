import type {
  InitializeResponse,
  NewSessionResponse,
  PlanEntry,
  PromptResponse,
  SessionNotification,
  StopReason,
} from "@agentclientprotocol/sdk";

export type BrowserEvent =
  | {
      type: "status";
      timestamp: number;
      sessionId?: string;
      status: "connecting" | "ready" | "prompting" | "cancelling" | "closed";
      detail?: string;
    }
  | {
      type: "message-delta";
      timestamp: number;
      sessionId: string;
      role: "assistant" | "user" | "system";
      text: string;
    }
  | {
      type: "message-complete";
      timestamp: number;
      sessionId: string;
      role: "assistant" | "user" | "system";
    }
  | {
      type: "tool-call";
      timestamp: number;
      sessionId: string;
      toolCallId: string;
      title: string;
      kind: string;
      status: string;
    }
  | {
      type: "tool-call-update";
      timestamp: number;
      sessionId: string;
      toolCallId: string;
      status: string;
      content?: string;
    }
  | {
      type: "plan";
      timestamp: number;
      sessionId: string;
      entries: Pick<PlanEntry, "content" | "priority" | "status">[];
    }
  | {
      type: "error";
      timestamp: number;
      sessionId?: string;
      message: string;
    }
  | {
      type: "turn-complete";
      timestamp: number;
      sessionId: string;
      stopReason: StopReason;
    };

export type BrowserSessionStatus = "connecting" | "ready" | "prompting" | "cancelling" | "closed";

export interface ManagedAcpClient {
  initialize(): Promise<InitializeResponse>;
  createSession(cwd: string): Promise<NewSessionResponse>;
  prompt(sessionId: string, text: string): Promise<PromptResponse>;
  cancel(sessionId: string): Promise<void>;
  onUpdate(listener: (update: SessionNotification) => void): () => void;
  onClose(listener: (error?: Error) => void): () => void;
  dispose(): Promise<void>;
}

export interface BrowserSessionRecord {
  id: string;
  acpSessionId: string;
  cwd: string;
  status: BrowserSessionStatus;
  runningPrompt: boolean;
  createdAt: number;
  updatedAt: number;
  agent: ManagedAcpClient;
  capabilities?: InitializeResponse["agentCapabilities"];
  agentInfo?: InitializeResponse["agentInfo"];
}

export type BrowserEventListener = (event: BrowserEvent) => void;

export interface SessionCreateResult {
  session: BrowserSessionRecord;
  initialize: InitializeResponse;
}
