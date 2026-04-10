export interface BackendContextService {
  buildPromptContext(input: { cwd: string; text: string }): Promise<string | null>;
}

export interface AgentPromptInput {
  browserSessionId: string;
  text: string;
}

export interface AgentSessionModeInput {
  browserSessionId: string;
  modeId: string;
}

export interface AgentSessionModelInput {
  browserSessionId: string;
  modelId: string;
}
