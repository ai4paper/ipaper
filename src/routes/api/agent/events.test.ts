import { beforeEach, describe, expect, it, vi } from "vitest";

const { attachListener, disposeBrowserSession, getBrowserSession } = vi.hoisted(() => ({
  attachListener: vi.fn(),
  disposeBrowserSession: vi.fn(async () => {}),
  getBrowserSession: vi.fn(),
}));

vi.mock("~/lib/acp/session-manager", () => ({
  sessionManager: {
    attachListener,
    disposeBrowserSession,
    getBrowserSession,
  },
}));

import { GET } from "~/routes/api/agent/events";

describe("GET /api/agent/events", () => {
  beforeEach(() => {
    attachListener.mockReset();
    disposeBrowserSession.mockReset();
    getBrowserSession.mockReset();
  });

  it("disposes the browser session when the SSE request aborts", async () => {
    const detach = vi.fn();
    const controller = new AbortController();
    getBrowserSession.mockReturnValue({ status: "ready" });
    attachListener.mockReturnValue(detach);

    const response = await GET({
      request: new Request("http://localhost/api/agent/events?sessionId=browser-session", {
        signal: controller.signal,
      }),
    } as never);

    expect(response.status).toBe(200);
    controller.abort();
    await Promise.resolve();

    expect(detach).toHaveBeenCalledTimes(1);
    expect(disposeBrowserSession).toHaveBeenCalledWith("browser-session");
  });
});
