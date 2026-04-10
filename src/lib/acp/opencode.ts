import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export interface OpencodeProcessHandle {
  process: ChildProcessWithoutNullStreams;
  dispose(): Promise<void>;
  onExit(listener: (error?: Error) => void): () => void;
}

export function spawnOpencodeAgent(cwd: string): OpencodeProcessHandle {
  const child = spawn("opencode", ["acp", "--cwd", cwd], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const listeners = new Set<(error?: Error) => void>();
  let disposed = false;

  child.stderr.on("data", chunk => {
    const text = chunk.toString().trim();
    if (text) {
      console.error(`[opencode acp] ${text}`);
    }
  });

  child.once("error", error => {
    for (const listener of listeners) {
      listener(error);
    }
  });

  child.once("exit", code => {
    if (disposed) {
      return;
    }

    const error = code === 0 ? undefined : new Error(`opencode acp exited with code ${code ?? "unknown"}`);
    for (const listener of listeners) {
      listener(error);
    }
  });

  return {
    process: child,
    onExit(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      if (child.exitCode !== null || child.killed) {
        return;
      }

      child.kill("SIGTERM");
      await new Promise<void>(resolve => {
        child.once("exit", () => resolve());
        setTimeout(() => {
          if (child.exitCode === null && !child.killed) {
            child.kill("SIGKILL");
          }
          resolve();
        }, 2_000);
      });
    },
  };
}
