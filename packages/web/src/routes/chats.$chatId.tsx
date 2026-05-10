import { useParams } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat/chat-window";

export function ChatComponent() {
  const { chatId } = useParams({ from: "/chats/$chatId" });
  return <ChatWindow key={chatId} chatId={chatId} />;
}
