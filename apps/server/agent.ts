import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createDeepAgent, LocalShellBackend, type DeepAgent } from "deepagents";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = resolve(appDir, "../..");

type AgentId = "ipaper-supervisor" | "ipaper-researcher" | "ipaper-implementer";

type AgentMetadata = {
  id: AgentId;
  description: string;
};

type ManagedAgent = {
  agent: DeepAgent;
  metadata: AgentMetadata;
};

const agentCatalog: ReadonlyArray<AgentMetadata> = [
  {
    id: "ipaper-supervisor",
    description:
      "Main orchestration agent that can delegate research and implementation subtasks.",
  },
  {
    id: "ipaper-researcher",
    description:
      "Focused research agent for architecture analysis, repo discovery, and technical comparisons.",
  },
  {
    id: "ipaper-implementer",
    description:
      "Focused implementation agent for code changes, validation, and delivery inside the workspace.",
  },
];

let envLoaded = false;

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = line.slice(equalsIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
    process.env[key] = value;
  }
}

function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  loadEnvFile(resolve(workspaceRoot, ".env"));
  loadEnvFile(resolve(appDir, ".env"));
  envLoaded = true;
}

function createModel() {
  ensureEnvLoaded();

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });
}

function createBackend() {
  return new LocalShellBackend({ rootDir: workspaceRoot });
}

function createBasePrompt(role: string) {
  return `You are a capable AI assistant for the iPaper project acting as the ${role}.

Workspace root: ${workspaceRoot}

Execution rules:
- Verify files before making assumptions.
- Prefer narrow reads and focused shell commands.
- Use write_todos for non-trivial tasks.
- Keep outputs concise and actionable.
- Avoid destructive commands unless explicitly requested.`;
}

function createSupervisorAgent() {
  return createDeepAgent({
    name: "ipaper-supervisor",
    model: createModel(),
    backend: createBackend(),
    checkpointer: new MemorySaver(),
    systemPrompt: `${createBasePrompt("supervisor")}

Delegate independent research or implementation work to subagents when that keeps the main thread cleaner or faster.`,
    subagents: [
      {
        name: "researcher",
        description: "Investigate architecture, repository structure, and technical tradeoffs.",
        systemPrompt: `${createBasePrompt("research specialist")}

Focus on inspection, comparisons, and concise technical conclusions.`,
      },
      {
        name: "implementer",
        description: "Make code changes carefully and verify them in the workspace.",
        systemPrompt: `${createBasePrompt("implementation specialist")}

Focus on minimal code changes, verification, and clear summaries of what changed.`,
      },
    ],
  });
}

function createResearcherAgent() {
  return createDeepAgent({
    name: "ipaper-researcher",
    model: createModel(),
    backend: createBackend(),
    checkpointer: new MemorySaver(),
    systemPrompt: `${createBasePrompt("research specialist")}

Prioritize architecture analysis, codebase discovery, and comparison work before proposing changes.`,
  });
}

function createImplementerAgent() {
  return createDeepAgent({
    name: "ipaper-implementer",
    model: createModel(),
    backend: createBackend(),
    checkpointer: new MemorySaver(),
    systemPrompt: `${createBasePrompt("implementation specialist")}

Prioritize small correct edits, verification, and implementation details over abstract discussion.`,
  });
}

const factories: Record<AgentId, () => DeepAgent> = {
  "ipaper-supervisor": createSupervisorAgent,
  "ipaper-researcher": createResearcherAgent,
  "ipaper-implementer": createImplementerAgent,
};

export class AgentManager {
  private readonly cache = new Map<AgentId, ManagedAgent>();

  listAgents(): ReadonlyArray<AgentMetadata> {
    return agentCatalog;
  }

  hasAgent(agentId: string): agentId is AgentId {
    return agentCatalog.some((agent) => agent.id === agentId);
  }

  getAgent(agentId: AgentId): ManagedAgent {
    const cached = this.cache.get(agentId);
    if (cached) {
      return cached;
    }

    const metadata = agentCatalog.find((agent) => agent.id === agentId);
    if (!metadata) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    const managedAgent = {
      agent: factories[agentId](),
      metadata,
    };

    this.cache.set(agentId, managedAgent);
    return managedAgent;
  }
}

export const agentManager = new AgentManager();
export { workspaceRoot };
