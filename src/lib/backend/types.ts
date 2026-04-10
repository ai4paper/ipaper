export interface BackendContextService {
  buildPromptContext(input: { cwd: string; text: string }): Promise<string | null>;
}

export interface AgentPromptInput {
  browserSessionId: string;
  text: string;
}
