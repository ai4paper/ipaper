import { Outlet } from "@tanstack/react-router";
import { ChatList } from "@/components/chat/chat-list";

export function RootComponent() {
  return (
    <div className="dark flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border/60">
        <div className="flex h-14 items-center px-4 text-sm font-medium text-foreground">
          IPaper
        </div>
        <div className="flex-1 overflow-hidden border-t border-border/60">
          <ChatList />
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
