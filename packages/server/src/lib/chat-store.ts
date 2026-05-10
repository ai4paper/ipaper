import type { Chat, ChatMessage } from "./types.js";

class ChatStore {
  private chats = new Map<string, Chat>();
  private messages = new Map<string, ChatMessage[]>();

  createChat(title?: string): Chat {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const chat: Chat = {
      id,
      title: title?.trim() || "New Chat",
      createdAt: now,
      updatedAt: now,
    };
    this.chats.set(id, chat);
    this.messages.set(id, []);
    return chat;
  }

  getChat(id: string): Chat | undefined {
    return this.chats.get(id);
  }

  getAllChats(): Chat[] {
    return Array.from(this.chats.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  deleteChat(id: string): boolean {
    this.messages.delete(id);
    return this.chats.delete(id);
  }

  addMessage(
    chatId: string,
    message: Omit<ChatMessage, "id" | "chatId" | "timestamp">
  ): ChatMessage {
    const list = this.messages.get(chatId);
    if (!list) {
      throw new Error(`Chat ${chatId} not found`);
    }
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      chatId,
      timestamp: new Date().toISOString(),
      ...message,
    };
    list.push(newMessage);

    const chat = this.chats.get(chatId);
    if (chat) {
      chat.updatedAt = newMessage.timestamp;
      if (chat.title === "New Chat" && message.role === "user") {
        const trimmed = message.content.trim();
        chat.title =
          trimmed.slice(0, 50) + (trimmed.length > 50 ? "…" : "") ||
          "New Chat";
      }
    }
    return newMessage;
  }

  getMessages(chatId: string): ChatMessage[] {
    return this.messages.get(chatId) ?? [];
  }
}

export const chatStore = new ChatStore();
