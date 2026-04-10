import { Readable, Writable } from "node:stream";

import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  RequestError,
  ndJsonStream,
  type Client,
  type InitializeResponse,
  type NewSessionResponse,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
} from "@agentclientprotocol/sdk";

import { spawnOpencodeAgent } from "~/lib/acp/opencode";
import type { ManagedAcpClient } from "~/lib/acp/types";

function pickPermissionResponse(params: RequestPermissionRequest): RequestPermissionResponse {
  const preferred =
    params.options.find(option => option.kind === "allow_once") ??
    params.options.find(option => option.kind === "allow_always");

  if (!preferred) {
    return {
      outcome: {
        outcome: "cancelled",
      },
    };
  }

  return {
    outcome: {
      outcome: "selected",
      optionId: preferred.optionId,
    },
  };
}

export async function createManagedAcpClient(cwd: string): Promise<ManagedAcpClient> {
  const handle = spawnOpencodeAgent(cwd);
  const updateListeners = new Set<(update: SessionNotification) => void>();
  const closeListeners = new Set<(error?: Error) => void>();

  const clientImpl: Client = {
    async requestPermission(params) {
      return pickPermissionResponse(params);
    },
    async sessionUpdate(params) {
      for (const listener of updateListeners) {
        listener(params);
      }
    },
    async extMethod(method) {
      throw RequestError.methodNotFound(method);
    },
  };

  const stream = ndJsonStream(
    Writable.toWeb(handle.process.stdin),
    Readable.toWeb(handle.process.stdout),
  );
  const connection = new ClientSideConnection(() => clientImpl, stream);

  handle.onExit(error => {
    for (const listener of closeListeners) {
      listener(error);
    }
  });

  return {
    initialize(): Promise<InitializeResponse> {
      return connection.initialize({
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
        clientInfo: {
          name: "ipaper-web",
          title: "iPaper Web",
          version: "0.1.0",
        },
      });
    },

    createSession(targetCwd: string): Promise<NewSessionResponse> {
      return connection.newSession({
        cwd: targetCwd,
        mcpServers: [],
      });
    },

    prompt(sessionId: string, text: string): Promise<PromptResponse> {
      return connection.prompt({
        sessionId,
        prompt: [
          {
            type: "text",
            text,
          },
        ],
      });
    },

    cancel(sessionId: string): Promise<void> {
      return connection.cancel({ sessionId });
    },

    onUpdate(listener) {
      updateListeners.add(listener);
      return () => updateListeners.delete(listener);
    },

    onClose(listener) {
      closeListeners.add(listener);
      return () => closeListeners.delete(listener);
    },

    async dispose() {
      await handle.dispose();
    },
  };
}
