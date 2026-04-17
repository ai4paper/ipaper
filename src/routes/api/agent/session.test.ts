import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/backend/orchestrator", () => ({
  closeAgentSession: vi.fn(),
  createAgentSession: vi.fn(),
}));

import { closeAgentSession, createAgentSession } from "~/lib/backend/orchestrator";
import { DELETE, POST } from "~/routes/api/agent/session";

describe("POST /api/agent/session", () => {
  beforeEach(() => {
    closeAgentSession.mockReset();
    createAgentSession.mockReset();
  });

  it("rejects requests without a cwd", async () => {
    const response = await POST({
      request: new Request("http://localhost/api/agent/session", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "cwd is required" });
    expect(createAgentSession).not.toHaveBeenCalled();
  });

  it("creates a session with the chosen cwd", async () => {
    createAgentSession.mockResolvedValue({
      session: { id: "browser-session", status: "ready", modes: null, models: null },
      initialize: { agentCapabilities: { prompt: true }, agentInfo: { name: "agent", version: "1.0.0" } },
    });

    const response = await POST({
      request: new Request("http://localhost/api/agent/session", {
        method: "POST",
        body: JSON.stringify({ cwd: "  /tmp/project  " }),
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    expect(createAgentSession).toHaveBeenCalledWith("/tmp/project");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ sessionId: "browser-session" });
  });

  it("closes an existing browser session", async () => {
    const response = await DELETE({
      request: new Request("http://localhost/api/agent/session", {
        method: "DELETE",
        body: JSON.stringify({ sessionId: "browser-session" }),
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    expect(closeAgentSession).toHaveBeenCalledWith("browser-session");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects close requests without a session id", async () => {
    const response = await DELETE({
      request: new Request("http://localhost/api/agent/session", {
        method: "DELETE",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "sessionId is required" });
    expect(closeAgentSession).not.toHaveBeenCalled();
  });
});
