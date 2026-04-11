import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAgentSession } = vi.hoisted(() => ({
  createAgentSession: vi.fn(),
}));

vi.mock("~/lib/backend/orchestrator", () => ({
  createAgentSession,
}));

import { POST } from "~/routes/api/agent/session";

describe("POST /api/agent/session", () => {
  beforeEach(() => {
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
});
