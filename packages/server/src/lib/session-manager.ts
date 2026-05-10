import { execSync } from "node:child_process";
import { Session } from "./session.js";

const claudePath = (() => {
  try {
    return execSync("which claude", { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
})();

class SessionManager {
  private sessions = new Map<string, Session>();

  getOrCreate(chatId: string): Session {
    let session = this.sessions.get(chatId);
    if (!session) {
      session = new Session(chatId, { claudePath });
      this.sessions.set(chatId, session);
    }
    return session;
  }

  get(chatId: string): Session | undefined {
    return this.sessions.get(chatId);
  }

  delete(chatId: string) {
    const session = this.sessions.get(chatId);
    if (session) {
      session.close();
      this.sessions.delete(chatId);
    }
  }
}

export const sessionManager = new SessionManager();
