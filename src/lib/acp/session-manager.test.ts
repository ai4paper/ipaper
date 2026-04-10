import { describe, expect, it, vi } from "vitest";

import { createSessionManager } from "~/lib/acp/session-manager";
import type { BrowserEvent } from "~/lib/acp/types";

function createEvent(type: BrowserEvent["type"]): BrowserEvent {
  return { type, timestamp: Date.now() } as BrowserEvent;
}

describe("createSessionManager", () => {
  it("creates and looks up browser sessions", () => {
    const manager = createSessionManager();

    const session = manager.createBrowserSession({
      acpSessionId: "acp-1",
      cwd: "/tmp/project",
      agent: { dispose: vi.fn(async () => {}) },
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
      agent: { dispose: vi.fn(async () => {}) },
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
      agent: { dispose },
    });

    manager.markRunningPrompt(session.id, true);
    expect(manager.getBrowserSession(session.id)?.runningPrompt).toBe(true);

    manager.clearRunningPrompt(session.id);
    expect(manager.getBrowserSession(session.id)?.runningPrompt).toBe(false);

    await manager.disposeBrowserSession(session.id);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(manager.getBrowserSession(session.id)).toBeUndefined();
  });
});
