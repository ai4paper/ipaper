import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Chat, ChatMessage } from "./types.js";

const DB_PATH = resolve(
  process.env.IPAPER_DB_PATH ?? "./data/ipaper.db"
);
mkdirSync(dirname(DB_PATH), { recursive: true });

class ChatStore {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        agent_session_id TEXT
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id_timestamp
        ON messages(chat_id, timestamp);
    `);
  }

  createChat(title?: string): Chat {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const chat: Chat = {
      id,
      title: title?.trim() || "New Chat",
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        "INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)"
      )
      .run(chat.id, chat.title, chat.createdAt, chat.updatedAt);
    return chat;
  }

  getChat(id: string): Chat | undefined {
    const row = this.db
      .prepare(
        "SELECT id, title, created_at as createdAt, updated_at as updatedAt FROM chats WHERE id = ?"
      )
      .get(id) as Chat | null;
    return row ?? undefined;
  }

  getAllChats(): Chat[] {
    return this.db
      .prepare(
        "SELECT id, title, created_at as createdAt, updated_at as updatedAt FROM chats ORDER BY updated_at DESC"
      )
      .all() as Chat[];
  }

  deleteChat(id: string): boolean {
    const info = this.db.prepare("DELETE FROM chats WHERE id = ?").run(id);
    return info.changes > 0;
  }

  addMessage(
    chatId: string,
    message: Omit<ChatMessage, "id" | "chatId" | "timestamp">
  ): ChatMessage {
    const chat = this.getChat(chatId);
    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chatId,
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
    };
    this.db
      .prepare(
        "INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        newMessage.id,
        newMessage.chatId,
        newMessage.role,
        newMessage.content,
        newMessage.timestamp
      );

    let nextTitle = chat.title;
    if (chat.title === "New Chat" && message.role === "user") {
      const trimmed = message.content.trim();
      nextTitle =
        trimmed.slice(0, 50) + (trimmed.length > 50 ? "…" : "") || "New Chat";
    }
    this.db
      .prepare("UPDATE chats SET updated_at = ?, title = ? WHERE id = ?")
      .run(newMessage.timestamp, nextTitle, chatId);

    return newMessage;
  }

  getMessages(chatId: string): ChatMessage[] {
    return this.db
      .prepare(
        "SELECT id, chat_id as chatId, role, content, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp ASC"
      )
      .all(chatId) as ChatMessage[];
  }

  getAgentSessionId(chatId: string): string | undefined {
    const row = this.db
      .prepare("SELECT agent_session_id as sid FROM chats WHERE id = ?")
      .get(chatId) as { sid: string | null } | null;
    return row?.sid ?? undefined;
  }

  setAgentSessionId(chatId: string, sessionId: string): void {
    this.db
      .prepare("UPDATE chats SET agent_session_id = ? WHERE id = ?")
      .run(sessionId, chatId);
  }
}

export const chatStore = new ChatStore(DB_PATH);
