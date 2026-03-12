"use client";

import { createContext, useContext, ReactNode } from "react";
import { useChatStore } from "./useChatStore";

const ChatContext = createContext<ReturnType<typeof useChatStore> | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const store = useChatStore();
  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
