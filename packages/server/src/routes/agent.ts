import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { execSync } from "child_process";

const claudePath = (() => {
  try {
    return execSync("which claude", { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
})();

export const agentRouter = new Hono();

const promptSchema = z.object({
  prompt: z
    .string()
    .min(1, "prompt must be at least 1 character")
    .max(4000, "prompt must be at most 4000 characters"),
});

agentRouter.get("/stream", (c) => {
  const parsed = promptSchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.flatten().fieldErrors },
      400
    );
  }

  const { prompt: userPrompt } = parsed.data;

  return streamSSE(c, async (stream) => {
    try {
      for await (const msg of query({
        prompt: userPrompt,
        options: {
          maxTurns: 1,
          model: "sonnet",
          allowedTools: [],
          ...(claudePath && { pathToClaudeCodeExecutable: claudePath }),
        },
      })) {
        if (msg.type === "assistant") {
          const blocks = Array.isArray(msg.message.content)
            ? msg.message.content
            : [];
          for (const block of blocks) {
            if (block.type === "text") {
              await stream.writeSSE({
                event: "delta",
                data: JSON.stringify({ text: block.text }),
              });
            }
          }
        }
      }

      await stream.writeSSE({ event: "done", data: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message }),
      });
    }
  });
});
