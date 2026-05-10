import { useEffect, useRef, useState } from "react";
import { wsClient } from "./ws";
import type { AgentEvent } from "./types";

type ChatEvent = AgentEvent & { chatId?: string };

export interface UseChatWS {
  connected: boolean;
  send: (content: string) => void;
}

export function useChatWebSocket(
  chatId: string | null,
  onEvent: (event: AgentEvent) => void
): UseChatWS {
  const [connected, setConnected] = useState(wsClient.isConnected());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    return wsClient.subscribeStatus(setConnected);
  }, []);

  useEffect(() => {
    if (!chatId) return;
    wsClient.send({ type: "subscribe", chatId });
    const unsubscribe = wsClient.subscribe((raw) => {
      const msg = raw as ChatEvent;
      if (msg.chatId !== chatId) return;
      onEventRef.current(msg);
    });
    return () => {
      unsubscribe();
      wsClient.send({ type: "unsubscribe", chatId });
    };
  }, [chatId]);

  return {
    connected,
    send(content: string) {
      if (!chatId) return;
      wsClient.send({ type: "chat", chatId, content });
    },
  };
}
