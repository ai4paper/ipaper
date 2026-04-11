import { createStore } from "solid-js/store";

interface StoredAgentPreferences {
  lastCwd: string;
  byCwd: Record<string, { modeId?: string; modelId?: string }>;
}

const STORAGE_KEY = "agent-session-preferences";

function loadStoredPreferences(): StoredAgentPreferences {
  if (typeof localStorage === "undefined") {
    return { lastCwd: "", byCwd: {} };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lastCwd: "", byCwd: {} };
    }

    const parsed = JSON.parse(raw) as Partial<StoredAgentPreferences>;
    return {
      lastCwd: typeof parsed.lastCwd === "string" ? parsed.lastCwd : "",
      byCwd: typeof parsed.byCwd === "object" && parsed.byCwd ? parsed.byCwd : {},
    };
  } catch {
    return { lastCwd: "", byCwd: {} };
  }
}

export function createAgentBrowserPreferences() {
  const [state, setState] = createStore<StoredAgentPreferences>(loadStoredPreferences());

  function save() {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeCwd(cwd: string) {
    return cwd.trim();
  }

  return {
    lastCwd: () => state.lastCwd,
    getConfig: (cwd: string) => state.byCwd[normalizeCwd(cwd)],
    clearLastCwd: () => {
      setState("lastCwd", "");
      save();
    },
    rememberCwd: (cwd: string) => {
      setState("lastCwd", normalizeCwd(cwd));
      save();
    },
    rememberMode: (cwd: string, modeId: string | null) => {
      const key = normalizeCwd(cwd);
      if (!key || !modeId) {
        return;
      }

      setState("byCwd", key, previous => ({ ...previous, modeId }));
      save();
    },
    rememberModel: (cwd: string, modelId: string | null) => {
      const key = normalizeCwd(cwd);
      if (!key || !modelId) {
        return;
      }

      setState("byCwd", key, previous => ({ ...previous, modelId }));
      save();
    },
  };
}
