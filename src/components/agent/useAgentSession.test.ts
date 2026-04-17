import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAgentSession } from "~/components/agent/useAgentSession";
import type { BrowserEvent } from "~/lib/acp/types";

let eventSourceInstances: Array<{ onmessage: ((event: MessageEvent<string>) => void) | null; onerror: (() => void) | null; close: () => void }>;

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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function emitBrowserEvent(index: number, event: BrowserEvent) {
  eventSourceInstances[index]?.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
}

describe("useAgentSession", () => {
  const originalEventSource = globalThis.EventSource;
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;

  function setGlobal<K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]) {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    eventSourceInstances = [];
    setGlobal(
      "EventSource",
      class {
        onmessage: ((event: MessageEvent<string>) => void) | null = null;
        onerror: (() => void) | null = null;

        constructor(_url: string) {
          eventSourceInstances.push(this);
        }

        close() {}
      } as typeof EventSource,
    );
    setGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    if (originalEventSource) {
      setGlobal("EventSource", originalEventSource);
    } else {
      Reflect.deleteProperty(globalThis, "EventSource");
    }

    if (originalFetch) {
      setGlobal("fetch", originalFetch);
    }

    if (originalLocalStorage) {
      setGlobal("localStorage", originalLocalStorage);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
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

    setGlobal("fetch", fetchMock as typeof fetch);

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

  it("clears partial session state when restoring stored config fails during initial startup", async () => {
    localStorage.setItem(
      "agent-session-preferences",
      JSON.stringify({
        lastCwd: "/tmp/project",
        byCwd: {
          "/tmp/project": {
            modeId: "code",
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
          models: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "Failed to update mode" }, { status: 500 }));

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();

        void session.startSession().then(() => {
          try {
            expect(session.status()).toBe("closed");
            expect(session.error()).toBe("Failed to update mode");
            expect(session.canStartSession()).toBe(true);
            expect(session.canCloseSession()).toBe(false);
            expect(session.selectedModeId()).toBe(null);
            expect(session.modeOptions()).toEqual([]);
            expect(eventSourceInstances).toHaveLength(0);
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

  it("creates a session explicitly and waits for the stream to become ready before enabling send", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessionId: "browser-session",
        modes: null,
        models: null,
      }),
    );

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.startSession().then(() => {
          try {
            expect(fetchMock).toHaveBeenCalledWith(
              "/api/agent/session",
              expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ cwd: "/tmp/project" }),
              }),
            );
            expect(session.status()).toBe("connecting");
            expect(session.canStartSession()).toBe(false);
            expect(session.canSend()).toBe(false);
            expect(session.canCloseSession()).toBe(true);

            emitBrowserEvent(0, {
              type: "status",
              timestamp: Date.now(),
              sessionId: "browser-session",
              status: "ready",
            });

            expect(session.status()).toBe("ready");
            expect(session.canSend()).toBe(true);
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

    setGlobal("fetch", fetchMock as typeof fetch);

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
              expect(session.canSend()).toBe(true);
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

  it("lazy-starts on first send and appends the user prompt", async () => {
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

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        expect(session.canStartSession()).toBe(true);
        expect(session.canSend()).toBe(true);

        void session.sendPrompt("Ship it").then(sent => {
          try {
            expect(sent).toBe(true);
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
              "/api/agent/prompt",
              expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ sessionId: "browser-session", text: "Ship it" }),
              }),
            );
            expect(session.messages()).toHaveLength(1);
            expect(session.messages()[0]?.role).toBe("user");
            expect(session.messages()[0]?.text).toBe("Ship it");
            expect(session.canStartSession()).toBe(false);
            expect(session.canCloseSession()).toBe(true);
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

  it("preserves the transcript and exposes a recoverable state after the event stream disconnects", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessionId: "browser-session",
        modes: null,
        models: null,
      }),
    );

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.startSession().then(() => {
          try {
            emitBrowserEvent(0, {
              type: "status",
              timestamp: Date.now(),
              sessionId: "browser-session",
              status: "ready",
            });
            emitBrowserEvent(0, {
              type: "message-delta",
              timestamp: Date.now(),
              sessionId: "browser-session",
              role: "assistant",
              text: "Still here",
            });
            emitBrowserEvent(0, {
              type: "message-complete",
              timestamp: Date.now(),
              sessionId: "browser-session",
              role: "assistant",
            });

            expect(session.canCloseSession()).toBe(true);
            eventSourceInstances[0]?.onerror?.();
            expect(session.canStartSession()).toBe(true);
            expect(session.canSend()).toBe(true);
            expect(session.canCloseSession()).toBe(false);
            expect(session.status()).toBe("closed");
            expect(session.error()).toBe("Connection to the agent event stream was lost.");
            expect(session.messages()).toHaveLength(1);
            expect(session.messages()[0]?.text).toBe("Still here");
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

  it("accumulates supported system message deltas instead of dropping them", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessionId: "browser-session",
        modes: null,
        models: null,
      }),
    );

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.startSession().then(() => {
          try {
            emitBrowserEvent(0, {
              type: "status",
              timestamp: Date.now(),
              sessionId: "browser-session",
              status: "ready",
            });
            emitBrowserEvent(0, {
              type: "message-delta",
              timestamp: Date.now(),
              sessionId: "browser-session",
              role: "system",
              text: "System ",
            });
            emitBrowserEvent(0, {
              type: "message-delta",
              timestamp: Date.now() + 1,
              sessionId: "browser-session",
              role: "system",
              text: "notice",
            });
            emitBrowserEvent(0, {
              type: "message-complete",
              timestamp: Date.now() + 2,
              sessionId: "browser-session",
              role: "system",
            });

            expect(session.messages()).toHaveLength(1);
            expect(session.messages()[0]).toMatchObject({
              role: "system",
              text: "System notice",
              status: "done",
            });
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

  it("marks an in-progress streamed message as errored when an error event arrives", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        sessionId: "browser-session",
        modes: null,
        models: null,
      }),
    );

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.startSession().then(() => {
          try {
            emitBrowserEvent(0, {
              type: "status",
              timestamp: Date.now(),
              sessionId: "browser-session",
              status: "ready",
            });
            emitBrowserEvent(0, {
              type: "message-delta",
              timestamp: Date.now() + 1,
              sessionId: "browser-session",
              role: "assistant",
              text: "Partial",
            });
            emitBrowserEvent(0, {
              type: "message-delta",
              timestamp: Date.now() + 2,
              sessionId: "browser-session",
              role: "assistant",
              text: " output",
            });
            emitBrowserEvent(0, {
              type: "error",
              timestamp: Date.now() + 3,
              sessionId: "browser-session",
              message: "Stream failed",
            });

            expect(session.messages()).toHaveLength(1);
            expect(session.messages()[0]).toMatchObject({
              role: "assistant",
              text: "Partial output",
              status: "error",
            });
            expect(session.error()).toBe("Stream failed");
            expect(session.status()).toBe("ready");
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

  it("returns false when sending a prompt fails and keeps the session active", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          sessionId: "browser-session",
          modes: null,
          models: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "Prompt failed" }, { status: 500 }));

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.sendPrompt("Keep this draft").then(sent => {
          try {
            expect(sent).toBe(false);
            expect(session.error()).toBe("Prompt failed");
            expect(session.messages()).toHaveLength(1);
            expect(session.messages()[0]?.text).toBe("Keep this draft");
            expect(session.canCloseSession()).toBe(true);
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

  it("disables configuration while a mode update is in flight and re-enables it after mode/model responses", async () => {
    const modeUpdate = createDeferred<Response>();
    const modelUpdate = createDeferred<Response>();
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
      .mockImplementationOnce(() => modeUpdate.promise)
      .mockImplementationOnce(() => modelUpdate.promise);

    setGlobal("fetch", fetchMock as typeof fetch);

    await new Promise<void>((resolve, reject) => {
      createRoot(dispose => {
        const session = useAgentSession();
        session.setCwd("/tmp/project");

        void session.startSession().then(async () => {
          try {
            emitBrowserEvent(0, {
              type: "status",
              timestamp: Date.now(),
              sessionId: "browser-session",
              status: "ready",
            });

            expect(session.canConfigure()).toBe(true);
            const modePromise = session.updateMode("code");
            await Promise.resolve();
            expect(session.canConfigure()).toBe(false);
            expect(session.canSend()).toBe(false);

            modeUpdate.resolve(
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
            );
            await modePromise;

            expect(session.selectedModeId()).toBe("code");
            expect(session.canConfigure()).toBe(true);
            expect(session.canSend()).toBe(true);

            const modelPromise = session.updateModel("gpt-4.1");
            await Promise.resolve();
            expect(session.canConfigure()).toBe(false);

            modelUpdate.resolve(
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
            await modelPromise;

            expect(session.selectedModelId()).toBe("gpt-4.1");
            expect(session.canConfigure()).toBe(true);
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
});
