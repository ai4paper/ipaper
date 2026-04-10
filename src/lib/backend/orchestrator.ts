import { createManagedAcpClient } from "~/lib/acp/client";
import { mapPromptResultToEvent, mapSessionUpdateToEvents } from "~/lib/acp/event-stream";
import { sessionManager } from "~/lib/acp/session-manager";
import type { BrowserEvent, SessionCreateResult } from "~/lib/acp/types";
import { backendContextService } from "~/lib/backend/services";
import type { AgentPromptInput } from "~/lib/backend/types";

const DEFAULT_CWD = process.cwd();

function broadcastStatus(sessionId: string, status: BrowserEvent["status"], detail?: string) {
  sessionManager.updateStatus(sessionId, status);
  sessionManager.broadcast(sessionId, {
    type: "status",
    timestamp: Date.now(),
    sessionId,
    status,
    detail,
  });
}

export async function createAgentSession(cwd = DEFAULT_CWD): Promise<SessionCreateResult> {
  const agent = await createManagedAcpClient(cwd);
  const initialize = await agent.initialize();
  const newSession = await agent.createSession(cwd);
  const session = sessionManager.createBrowserSession({
    acpSessionId: newSession.sessionId,
    cwd,
    agent,
    capabilities: initialize.agentCapabilities,
    agentInfo: initialize.agentInfo,
  });

  agent.onUpdate(notification => {
    for (const event of mapSessionUpdateToEvents(notification)) {
      sessionManager.broadcast(session.id, event);
    }
  });

  agent.onClose(error => {
    broadcastStatus(session.id, "closed", error?.message);
    if (error) {
      sessionManager.broadcast(session.id, {
        type: "error",
        timestamp: Date.now(),
        sessionId: session.id,
        message: error.message,
      });
    }
  });

  broadcastStatus(session.id, "ready");

  return { session, initialize };
}

export async function promptAgentSession(input: AgentPromptInput): Promise<void> {
  const session = sessionManager.getBrowserSession(input.browserSessionId);
  if (!session) {
    throw new Error("Unknown session");
  }
  if (session.runningPrompt) {
    throw new Error("A prompt is already running for this session");
  }

  sessionManager.markRunningPrompt(session.id, true);
  broadcastStatus(session.id, "prompting");

  try {
    const backendContext = await backendContextService.buildPromptContext({
      cwd: session.cwd,
      text: input.text,
    });
    const finalPrompt = backendContext ? `${backendContext}\n\n${input.text}` : input.text;
    const result = await session.agent.prompt(session.acpSessionId, finalPrompt);
    sessionManager.broadcast(session.id, mapPromptResultToEvent(session.id, result));
    sessionManager.broadcast(session.id, {
      type: "message-complete",
      timestamp: Date.now(),
      sessionId: session.id,
      role: "assistant",
    });
    broadcastStatus(session.id, "ready");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt failed";
    sessionManager.broadcast(session.id, {
      type: "error",
      timestamp: Date.now(),
      sessionId: session.id,
      message,
    });
    broadcastStatus(session.id, "ready", message);
    throw error;
  } finally {
    sessionManager.clearRunningPrompt(session.id);
  }
}

export async function cancelAgentSession(browserSessionId: string): Promise<void> {
  const session = sessionManager.getBrowserSession(browserSessionId);
  if (!session) {
    throw new Error("Unknown session");
  }

  broadcastStatus(session.id, "cancelling");
  await session.agent.cancel(session.acpSessionId);
}
