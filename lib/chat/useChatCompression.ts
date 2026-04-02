"use client";

import { useCallback, useState } from "react";
import { useChat } from "./ChatContext";
import { createClient } from "@/lib/supabase/client";

export function useChatCompression(maxMessages: number = 12) {
  const [isCompressing, setIsCompressing] = useState(false);
  const { currentChatId, currentChat, compressChatMessages } = useChat();

  const checkAndCompress = useCallback(async () => {
    if (!currentChatId || !currentChat || isCompressing) return;

    // Filter to real user/assistant messages to gauge length
    const messageCount = currentChat.messages.length;

    // If we exceed threshold, chop off everything EXCEPT the 4 most recent messages
    if (messageCount > maxMessages) {
      setIsCompressing(true);
      try {
        const keepCount = 4;
        const messagesToCompress = currentChat.messages.slice(0, messageCount - keepCount);
        const keptMessages = currentChat.messages.slice(messageCount - keepCount);

        const supabase = createClient();
        
        // Ensure prompt history format is strictly compatible with our edge function
        const compressionPayload = messagesToCompress.map(m => ({
          role: m.role,
          content: m.content,
          blocks: m.blocks
        }));

        const { data, error } = await supabase.functions.invoke("summarise-chat", {
          body: { messages: compressionPayload },
        });

        if (error) {
          console.error("Compression invocation error:", error);
          throw error;
        }

        if (data?.summaryText) {
          const summaryMessage = {
            id: `compressed-${Date.now()}`,
            role: "assistant" as const,
            content: `/// CONTEXT COMPRESSION CHUNK ///\n\n${data.summaryText}`,
            timestamp: new Date(),
            blocks: [],
            attachments: []
          };

          // Re-assemble the chat array
          const newHistory = [summaryMessage, ...keptMessages];
          
          compressChatMessages(currentChatId, newHistory);
        }

      } catch (err) {
        console.error("Failed to compress chat history:", err);
      } finally {
        setIsCompressing(false);
      }
    }
  }, [currentChat, currentChatId, maxMessages, isCompressing, compressChatMessages]);

  return { checkAndCompress, isCompressing };
}
