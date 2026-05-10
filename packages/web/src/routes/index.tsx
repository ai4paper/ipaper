import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCreateChat } from "@/lib/api";

export function IndexComponent() {
  const navigate = useNavigate();
  const createChat = useCreateChat();

  async function handleNew() {
    const chat = await createChat.mutateAsync(undefined);
    void navigate({ to: "/chats/$chatId", params: { chatId: chat.id } });
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            What can I help you with?
          </h1>
          <p className="text-sm text-muted-foreground">
            Start a chat with the IPaper research agent.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={createChat.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-4 py-2 text-sm text-foreground transition-colors hover:border-border hover:bg-muted disabled:opacity-50"
        >
          <Plus className="size-4" />
          {createChat.isPending ? "Creating…" : "New chat"}
        </button>
      </div>
    </div>
  );
}
