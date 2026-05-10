import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Chat, ChatMessage } from "./types";

async function jsonFetch<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const chatKeys = {
  all: ["chats"] as const,
  list: () => ["chats", "list"] as const,
  detail: (id: string) => ["chats", "detail", id] as const,
  messages: (id: string) => ["chats", id, "messages"] as const,
};

export function useChatsQuery() {
  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: () => jsonFetch<Chat[]>("/api/chats"),
  });
}

export function useChatMessagesQuery(chatId: string | null | undefined) {
  return useQuery({
    queryKey: chatId ? chatKeys.messages(chatId) : ["chats", "none"],
    queryFn: () =>
      jsonFetch<ChatMessage[]>(`/api/chats/${chatId}/messages`),
    enabled: !!chatId,
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) =>
      jsonFetch<Chat>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: (chat) => {
      qc.setQueryData<Chat[]>(chatKeys.list(), (prev) =>
        prev ? [chat, ...prev.filter((c) => c.id !== chat.id)] : [chat]
      );
    },
  });
}

export function useDeleteChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jsonFetch<{ success: boolean }>(`/api/chats/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      qc.setQueryData<Chat[]>(chatKeys.list(), (prev) =>
        prev ? prev.filter((c) => c.id !== id) : prev
      );
      qc.removeQueries({ queryKey: chatKeys.messages(id) });
    },
  });
}

export function refreshChatList(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: chatKeys.list() });
}
