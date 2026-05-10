import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatsQuery, useCreateChat, useDeleteChat } from "@/lib/api";

export function ChatList() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { chatId?: string };
  const selectedId = params.chatId;
  const { data: chats = [], isLoading } = useChatsQuery();
  const createChat = useCreateChat();
  const deleteChat = useDeleteChat();

  const handleNew = async () => {
    const chat = await createChat.mutateAsync(undefined);
    void navigate({ to: "/chats/$chatId", params: { chatId: chat.id } });
  };

  const handleDelete = (id: string) => {
    deleteChat.mutate(id);
    if (selectedId === id) void navigate({ to: "/" });
  };

  return (
    <div className="flex h-full flex-col bg-card/30">
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={handleNew}
          disabled={createChat.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-foreground transition-colors hover:border-border hover:bg-muted disabled:opacity-50"
        >
          <Plus className="size-4" />
          <span>New chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : chats.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No chats yet.
            <br />
            Click “New chat” to start.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {chats.map((chat) => {
              const active = chat.id === selectedId;
              return (
                <li key={chat.id}>
                  <Link
                    to="/chats/$chatId"
                    params={{ chatId: chat.id }}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">{chat.title}</span>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(chat.id);
                      }}
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
