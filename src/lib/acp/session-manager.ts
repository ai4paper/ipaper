import type {
  BrowserEvent,
  BrowserEventListener,
  BrowserSessionRecord,
  BrowserSessionStatus,
  ManagedAcpClient,
} from "~/lib/acp/types";

interface CreateBrowserSessionInput {
  acpSessionId: string;
  cwd: string;
  agent: ManagedAcpClient;
  capabilities?: BrowserSessionRecord["capabilities"];
  agentInfo?: BrowserSessionRecord["agentInfo"];
}

export function createSessionManager() {
  const sessions = new Map<string, BrowserSessionRecord>();
  const listeners = new Map<string, Set<BrowserEventListener>>();

  function touch(session: BrowserSessionRecord) {
    session.updatedAt = Date.now();
  }

  return {
    createBrowserSession(input: CreateBrowserSessionInput) {
      const timestamp = Date.now();
      const session: BrowserSessionRecord = {
        id: crypto.randomUUID(),
        acpSessionId: input.acpSessionId,
        cwd: input.cwd,
        status: "ready",
        runningPrompt: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        agent: input.agent,
        capabilities: input.capabilities,
        agentInfo: input.agentInfo,
      };

      sessions.set(session.id, session);
      listeners.set(session.id, new Set());

      return session;
    },

    getBrowserSession(id: string) {
      return sessions.get(id);
    },

    attachListener(id: string, listener: BrowserEventListener) {
      const sessionListeners = listeners.get(id);
      if (!sessionListeners) {
        return () => undefined;
      }

      sessionListeners.add(listener);

      return () => {
        sessionListeners.delete(listener);
      };
    },

    broadcast(id: string, event: BrowserEvent) {
      const session = sessions.get(id);
      if (session) {
        touch(session);
      }

      const sessionListeners = listeners.get(id);
      if (!sessionListeners) {
        return;
      }

      for (const listener of sessionListeners) {
        listener(event);
      }
    },

    updateStatus(id: string, status: BrowserSessionStatus) {
      const session = sessions.get(id);
      if (!session) {
        return;
      }

      session.status = status;
      touch(session);
    },

    markRunningPrompt(id: string, runningPrompt: boolean) {
      const session = sessions.get(id);
      if (!session) {
        return;
      }

      session.runningPrompt = runningPrompt;
      touch(session);
    },

    clearRunningPrompt(id: string) {
      const session = sessions.get(id);
      if (!session) {
        return;
      }

      session.runningPrompt = false;
      touch(session);
    },

    async disposeBrowserSession(id: string) {
      const session = sessions.get(id);
      sessions.delete(id);
      listeners.delete(id);

      if (session) {
        await session.agent.dispose();
      }
    },
  };
}

export const sessionManager = createSessionManager();
