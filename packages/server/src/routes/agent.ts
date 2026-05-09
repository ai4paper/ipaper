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

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
});

function buildPrompt(messages: z.infer<typeof bodySchema>["messages"]) {
  if (messages.length === 1 && messages[0].role === "user") {
    return messages[0].content;
  }
  const transcript = messages
    .map((m) => {
      const label = m.role === "user" ? "User" : "Assistant";
      return `${label}: ${m.content}`;
    })
    .join("\n\n");
  return `The following is an ongoing conversation. Reply directly to the latest user message, taking the prior turns into account. Do not prefix your reply with "Assistant:".\n\n${transcript}`;
}

agentRouter.post("/stream", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const userPrompt = buildPrompt(parsed.data.messages);

  return streamSSE(c, async (stream) => {
    try {
      for await (const msg of query({
        prompt: userPrompt,
        options: {
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
