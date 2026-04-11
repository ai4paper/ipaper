import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAgentSession } from "~/components/agent/useAgentSession";

class MemoryStorage implements Storage {
  #values = new Map<string, string>();

  get length() {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("useAgentSession", () => {
  const originalEventSource = globalThis.EventSource;
  let eventSourceInstances: Array<{ onmessage: ((event: MessageEvent<string>) => void) | null; onerror: (() => void) | null; close: () => void }>;

  beforeEach(() => {
    vi.restoreAllMocks();
    eventSourceInstances = [];
    vi.stubGlobal(
      "EventSource",
      class {
        onmessage: ((event: MessageEvent<string>) => void) | null = null;
        onerror: (() => void) | null = null;

        constructor(_url: string) {
          eventSourceInstances.push(this);
        }

        close() {}
      },
    );
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    if (originalEventSource) {
      vi.stubGlobal("EventSource", originalEventSource);
    } else {
      vi.unstubAllGlobals();
    }
  });

  it("loads the last chosen working directory from browser storage", () => {
    localStorage.setItem(
      "agent-session-preferences",
      JSON.stringify({ lastCwd: "/tmp/remembered", byCwd: {} }),
    );

    createRoot(dispose => {
      const session = useAgentSession();

      expect(session.cwd()).toBe("/tmp/remembered");

      dispose();
    });
  });

  it("starts with an empty working directory when restoreLastCwd is disabled", () => {
    localStorage.setItem(
      "agent-session-preferences",
      JSON.stringify({ lastCwd: "/tmp/remembered", byCwd: {} }),
    );

    createRoot(dispose => {
      const session = useAgentSession({ restoreLastCwd: false });

      expect(session.cwd()).toBe("");
      expect(localStorage.getItem("agent-session-preferences")).toContain('"lastCwd":""');

      dispose();
    });
  });

  it("restores saved mode and model for the same working directory", async () => {
    localStorage.setItem(
      "agent-session-preferences",
      JSON.stringify({
        lastCwd: "/tmp/project",
        byCwd: {
          "/tmp/project": {
            modeId: "code",
            modelId: "gpt-4.1",
          },
        },
      }),
    );

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          sessionId: "browser-session",
          modes: {
            currentModeId: "ask",
            availableModes: [
              { id: "ask", name: "Ask" },
              { id: "code", name: "Code" },
            ],
          },
          models: {
            currentModelId: "gpt-5",
            availableModels: [
              { modelId: "gpt-5", name: "GPT-5" },
              { modelId: "gpt-4.1", name: "GPT-4.1" },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          modes: {
            currentModeId: "code",
            availableModes: [
              { id: "ask", name: "Ask" },
              { id: "code", name: "Code" },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          models: {
            currentModelId: "gpt-4.1",
            availableModels: [
              { modelId: "gpt-5", name: "GPT-5" },
              { modelId: "gpt-4.1", name: "GPT-4.1" },
            ],
          },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();

        void session.startSession().then(() => {
          try {
            expect(fetchMock).toHaveBeenNthCalledWith(
              1,
              "/api/agent/session",
              expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ cwd: "/tmp/project" }),
              }),
            );
            expect(fetchMock).toHaveBeenNthCalledWith(
              2,
              "/api/agent/mode",
              expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ sessionId: "browser-session", modeId: "code" }),
              }),
            );
            expect(fetchMock).toHaveBeenNthCalledWith(
              3,
              "/api/agent/model",
              expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ sessionId: "browser-session", modelId: "gpt-4.1" }),
              }),
            );
            expect(session.selectedModeId()).toBe("code");
            expect(session.selectedModelId()).toBe("gpt-4.1");
            dispose();
            resolve();
          } catch (error) {
            dispose();
            reject(error);
          }
        }, reject);
      });
    });
  });

  it("closes the active session and resets client state", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          sessionId: "browser-session",
          modes: null,
          models: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    vi.stubGlobal("fetch", fetchMock);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session
          .startSession()
          .then(() => session.closeSession())
          .then(() => {
            try {
              expect(fetchMock).toHaveBeenNthCalledWith(
                2,
                "/api/agent/session",
                expect.objectContaining({
                  method: "DELETE",
                  body: JSON.stringify({ sessionId: "browser-session" }),
                }),
              );
              expect(session.status()).toBe("idle");
              expect(session.canStartSession()).toBe(true);
              expect(session.canSend()).toBe(false);
              dispose();
              resolve();
            } catch (error) {
              dispose();
              reject(error);
            }
          }, reject);
      });
    });
  });

  it("enables starting a new session after the event stream disconnects", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessionId: "browser-session",
        modes: null,
        models: null,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.startSession().then(() => {
          try {
            expect(session.canCloseSession()).toBe(true);
            eventSourceInstances[0]?.onerror?.();
            expect(session.canStartSession()).toBe(true);
            expect(session.canCloseSession()).toBe(false);
            expect(session.status()).toBe("idle");
            expect(session.error()).toBe("Connection to the agent event stream was lost.");
            dispose();
            resolve();
          } catch (error) {
            dispose();
            reject(error);
          }
        }, reject);
      });
    });
  });

  it("enables starting a session after typing a working directory", () => {
    createRoot(dispose => {
      const session = useAgentSession();

      expect(session.canStartSession()).toBe(false);
      session.setCwd("  /tmp/project  ");
      expect(session.canStartSession()).toBe(true);

      dispose();
    });
  });
});
