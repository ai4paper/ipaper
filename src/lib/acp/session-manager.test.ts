import { describe, expect, it, vi } from "vitest";

import { createSessionManager } from "~/lib/acp/session-manager";
import type { BrowserEvent, ManagedAcpClient } from "~/lib/acp/types";

function createEvent(type: BrowserEvent["type"]): BrowserEvent {
  return { type, timestamp: Date.now() } as BrowserEvent;
}

function createAgent(overrides: Partial<ManagedAcpClient> = {}): ManagedAcpClient {
  return {
    initialize: vi.fn(async () => ({ protocolVersion: "1", agentCapabilities: {}, agentInfo: { name: "test", version: "1" } })),
    createSession: vi.fn(async () => ({ sessionId: "acp-session" })),
    setSessionMode: vi.fn(async () => {}),
    setSessionModel: vi.fn(async () => {}),
    prompt: vi.fn(async () => ({ stopReason: "end_turn" })),
    cancel: vi.fn(async () => {}),
    onUpdate: vi.fn(() => () => undefined),
    onClose: vi.fn(() => () => undefined),
    dispose: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("createSessionManager", () => {
  it("creates and looks up browser sessions", () => {
    const manager = createSessionManager();

    const session = manager.createBrowserSession({
      acpSessionId: "acp-1",
      cwd: "/tmp/project",
      agent: createAgent(),
    });

    expect(session.id).toBeTruthy();
    expect(manager.getBrowserSession(session.id)?.acpSessionId).toBe("acp-1");
    expect(manager.getBrowserSession("missing")).toBeUndefined();
  });

  it("broadcasts events to attached listeners", () => {
    const manager = createSessionManager();
    const session = manager.createBrowserSession({
      acpSessionId: "acp-2",
      cwd: "/tmp/project",
      agent: createAgent(),
    });
    const first = vi.fn();
    const second = vi.fn();

    const detachFirst = manager.attachListener(session.id, first);
    manager.attachListener(session.id, second);
    const event = createEvent("status");

    manager.broadcast(session.id, event);

    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);

    detachFirst();
    manager.broadcast(session.id, createEvent("turn-complete"));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it("tracks running prompt state and disposes sessions", async () => {
    const dispose = vi.fn(async () => {});
    const manager = createSessionManager();
    const session = manager.createBrowserSession({
      acpSessionId: "acp-3",
      cwd: "/tmp/project",
      agent: createAgent({ dispose }),
    });

    manager.markRunningPrompt(session.id, true);
    expect(manager.getBrowserSession(session.id)?.runningPrompt).toBe(true);

    manager.clearRunningPrompt(session.id);
    expect(manager.getBrowserSession(session.id)?.runningPrompt).toBe(false);

    await manager.disposeBrowserSession(session.id);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(manager.getBrowserSession(session.id)).toBeUndefined();
  });

  it("updates stored mode and model selections", () => {
    const manager = createSessionManager();
    const session = manager.createBrowserSession({
      acpSessionId: "acp-4",
      cwd: "/tmp/project",
      agent: createAgent(),
      modes: {
        currentModeId: "ask",
        availableModes: [{ id: "ask", name: "Ask" }, { id: "code", name: "Code" }],
      },
      models: {
        currentModelId: "gpt-5",
        availableModels: [{ modelId: "gpt-5", name: "GPT-5" }, { modelId: "gpt-4.1", name: "GPT-4.1" }],
      },
    });

    manager.updateMode(session.id, "code");
    manager.updateModel(session.id, "gpt-4.1");

    expect(manager.getBrowserSession(session.id)?.modes?.currentModeId).toBe("code");
    expect(manager.getBrowserSession(session.id)?.models?.currentModelId).toBe("gpt-4.1");
  });
});
