import { createDeepAgent, LocalShellBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";

// ---------------------------------------------------------------------------
// Backend — LocalShellBackend gives the agent built-in:
//   ls, read_file, write_file, edit_file, glob, grep  (filesystem tools)
//   execute                                            (shell command tool)
// ---------------------------------------------------------------------------

const backend = new LocalShellBackend({ rootDir: process.cwd() });

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? "gpt-4o",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const agent = createDeepAgent({
  model,
  backend,
  checkpointer: new MemorySaver(),
  systemPrompt: `You are a capable AI assistant for the iPaper project.

Working directory: ${process.cwd()}

Guidelines:
- Always verify a file exists (read_file or ls) before assuming its contents.
- Prefer targeted commands over reading large directories blindly.
- When writing or modifying files, confirm the change with a brief summary.
- For shell commands (execute), prefer non-interactive, non-destructive invocations unless the user explicitly asks otherwise.
- Use write_todos to plan multi-step tasks before starting them.
- Be concise. Show relevant output; trim noise.`,
});
