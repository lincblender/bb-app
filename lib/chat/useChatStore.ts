"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Chat, ChatMessage, ChatTag } from "./types";
import { CHAT_STORAGE_KEY, LEGACY_CHAT_STORAGE_KEY } from "./types";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentTenantId } from "@/lib/workspace/client-tenant";
import { ONBOARDING_SURFACE_ID } from "./sidebar-surfaces";

function loadChatsFromLocalStorage(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(CHAT_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY);
}

function mapRemoteChats(
  chatRows: Record<string, unknown>[],
  messageRows: Record<string, unknown>[]
): Chat[] {
  const messagesByChat = messageRows.reduce(
    (acc: Record<string, ChatMessage[]>, row) => {
      const chatId = row.chat_id as string;
      if (!acc[chatId]) acc[chatId] = [];
      acc[chatId].push({
        id: row.id as string,
        role: row.role as ChatMessage["role"],
        content: row.content as string,
        blocks: ((row.blocks as ChatMessage["blocks"]) ?? []) as ChatMessage["blocks"],
        attachments: ((row.attachments as ChatMessage["attachments"]) ?? []) as ChatMessage["attachments"],
        timestamp: new Date(row.created_at as string),
      });
      return acc;
    },
    {}
  );

  return chatRows
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      tags: ((row.tags as ChatTag[]) ?? []) as ChatTag[],
      messages: (messagesByChat[row.id as string] ?? []).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      archived: false,
      unreadCount: 0,
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

async function loadChatsFromSupabase() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { mode: "local" as const, chats: loadChatsFromLocalStorage() };
  }
  const [{ data: chatsData, error: chatsError }, { data: messagesData, error: messagesError }] =
    await Promise.all([
      supabase.from("chats").select("*").order("updated_at", { ascending: false }),
      supabase.from("chat_messages").select("*").order("created_at", { ascending: true }),
    ]);

  if (chatsError || messagesError) {
    console.error("Failed to load chats from Supabase", { chatsError, messagesError });
    return {
      mode: "local" as const,
      chats: loadChatsFromLocalStorage(),
    };
  }

  const remoteChats = mapRemoteChats(
    (chatsData ?? []) as Record<string, unknown>[],
    (messagesData ?? []) as Record<string, unknown>[]
  );

  if (remoteChats.length > 0) {
    return { mode: "supabase" as const, chats: remoteChats };
  }

  return { mode: "supabase" as const, chats: [] };
}

async function syncChatsToSupabase(chats: Chat[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await fetchCurrentTenantId();
  if (!tenantId) return;

  if (chats.length === 0) return;

  const chatRows = chats.map((chat) => ({
    id: chat.id,
    tenant_id: tenantId,
    title: chat.title,
    tags: chat.tags,
    created_at: chat.createdAt,
    updated_at: chat.updatedAt,
  }));

  const messageRows = chats.flatMap((chat) =>
    chat.messages.map((message) => ({
      id: message.id,
      chat_id: chat.id,
      role: message.role,
      content: message.content,
      blocks: message.blocks ?? [],
      attachments: message.attachments ?? [],
      created_at: message.timestamp.toISOString(),
    }))
  );

  const { error: chatsUpsertError } = await supabase.from("chats").upsert(chatRows, { onConflict: "id" });
  if (chatsUpsertError) {
    console.error("Failed to sync chats", chatsUpsertError);
    return;
  }
  if (messageRows.length > 0) {
    const { error: messagesUpsertError } = await supabase
      .from("chat_messages")
      .upsert(messageRows, { onConflict: "id" });
    if (messagesUpsertError) {
      console.error("Failed to sync chat messages", messagesUpsertError);
    }
  }
}

export function useChatStore() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentPseudoChatId, setCurrentPseudoChatId] = useState<string | null>(null);
  const [currentOpportunityContext, setCurrentOpportunityContext] = useState<string | null>(null);
  const storageModeRef = useRef<"local" | "supabase">("local");
  const hydratedRef = useRef(false);

  useEffect(() => {
    void loadChatsFromSupabase().then(({ mode, chats: loadedChats }) => {
      storageModeRef.current = mode;
      setChats(loadedChats);
      if (loadedChats.length === 0) {
        setCurrentPseudoChatId(ONBOARDING_SURFACE_ID);
      }
      hydratedRef.current = true;
    });

    const supabase = createClient();
    const channel = supabase
      .channel('chat-messages-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, any>;
            const chatId = row.chat_id;
            
            // Reconstruct the message
            const incomingMsg: ChatMessage = {
               id: row.id,
               role: row.role as ChatMessage['role'],
               content: row.content,
               blocks: row.blocks ?? [],
               attachments: row.attachments ?? [],
               timestamp: new Date(row.created_at)
            };

            setChats((prevChats) => {
              const targetChat = prevChats.find(c => c.id === chatId);
              if (!targetChat) return prevChats; // Not related to our active chats

              const exists = targetChat.messages.findIndex(m => m.id === incomingMsg.id);
              if (exists > -1) {
                 // Ignore if our local message is identical (or newer optimistically)
                 // Or update if we want to stream partial blocks from a foreign client
                 const newMessages = [...targetChat.messages];
                 newMessages[exists] = incomingMsg;
                 return prevChats.map(c => c.id === chatId ? { ...c, messages: newMessages } : c);
              } else {
                 // Append the foreign message
                 return prevChats.map(c => c.id === chatId ? { ...c, messages: [...c.messages, incomingMsg] } : c);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveChats(chats);
    if (storageModeRef.current === "supabase") {
      void syncChatsToSupabase(chats);
    }
  }, [chats]);

  const currentChat = chats.find((c) => c.id === currentChatId) ?? null;

  const opportunityIds = currentChat?.tags
    .filter((t) => t.type === "opportunity" && t.opportunityId)
    .map((t) => t.opportunityId!) ?? [];

  const createChat = useCallback((tags: ChatTag[] = []): string => {
    const id = `chat-${Date.now()}`;
    const now = new Date().toISOString();
    const chat: Chat = {
      id,
      title: "New chat",
      tags,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setChats((c) => [chat, ...c]);
    setCurrentChatId(id);
    setCurrentPseudoChatId(null);
    setCurrentOpportunityContext(tags.find((t) => t.opportunityId)?.opportunityId ?? null);
    return id;
  }, []);

  const selectChat = useCallback((id: string) => {
    setCurrentChatId(id);
    setCurrentPseudoChatId(null);
    setChats((c) =>
      c.map((ch) => (ch.id === id ? { ...ch, unreadCount: 0 } : ch))
    );
    const chat = chats.find((c) => c.id === id);
    const firstOpp = chat?.tags.find((t) => t.opportunityId)?.opportunityId;
    setCurrentOpportunityContext(firstOpp ?? null);
  }, [chats]);

  const selectPseudoChat = useCallback((id: string) => {
    setCurrentPseudoChatId(id);
    setCurrentChatId(null);
    setCurrentOpportunityContext(null);
  }, []);

  const clearPseudoChat = useCallback(() => {
    setCurrentPseudoChatId(null);
  }, []);

  const forkChat = useCallback((id: string, selectedTag?: ChatTag | null) => {
    const source = chats.find((c) => c.id === id);
    if (!source) return;
    const newId = `chat-${Date.now()}`;
    const now = new Date().toISOString();
    const tags = selectedTag ? [selectedTag] : [...source.tags];
    const forked: Chat = {
      id: newId,
      title: `${source.title} (fork)`,
      tags,
      messages: source.messages.map((m, i) => ({ ...m, id: `${m.id}-fork-${Date.now()}-${i}` })),
      createdAt: now,
      updatedAt: now,
    };
    setChats((c) => [forked, ...c]);
    setCurrentChatId(newId);
    setCurrentPseudoChatId(null);
    const firstOpp = tags.find((t) => t.opportunityId)?.opportunityId;
    setCurrentOpportunityContext(firstOpp ?? null);
  }, [chats]);

  const addMessage = useCallback((msg: ChatMessage, targetChatId?: string) => {
    const id = targetChatId ?? currentChatId;
    if (!id) return;
    setCurrentPseudoChatId(null);
    const isAssistant = msg.role === "assistant";
    const isCurrentChat = id === currentChatId;
    setChats((c) => {
      const existing = c.find((ch) => ch.id === id);
      if (existing) {
        return c.map((ch) => {
          if (ch.id !== id) return ch;
          const unreadCount =
            isAssistant && !isCurrentChat
              ? (ch.unreadCount ?? 0) + 1
              : ch.unreadCount ?? 0;
          return {
            ...ch,
            messages: [...ch.messages, msg],
            updatedAt: new Date().toISOString(),
            unreadCount,
            title:
              ch.title === "New chat" && ch.messages.length === 0
                ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "…" : "")
                : ch.title,
          };
        });
      }
      const now = new Date().toISOString();
      const newChat: Chat = {
        id,
        title: msg.role === "user" ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "…" : "") : "New chat",
        tags: [],
        messages: [msg],
        createdAt: now,
        updatedAt: now,
      };
      return [newChat, ...c];
    });
  }, [currentChatId]);

  const updateChatTags = useCallback((chatId: string, tags: ChatTag[]) => {
    setChats((c) =>
      c.map((ch) => (ch.id === chatId ? { ...ch, tags, updatedAt: new Date().toISOString() } : ch))
    );
    if (chatId === currentChatId) {
      const firstOpp = tags.find((t) => t.opportunityId)?.opportunityId;
      setCurrentOpportunityContext(firstOpp ?? null);
    }
  }, [currentChatId]);

  const setOpportunityContext = useCallback((oppId: string | null) => {
    setCurrentOpportunityContext(oppId);
  }, []);

  const addOpportunityToChat = useCallback((oppId: string) => {
    if (!currentChatId) return;
    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) return;
    const exists = chat.tags.some((t) => t.type === "opportunity" && t.opportunityId === oppId);
    if (exists) return;
    updateChatTags(currentChatId, [
      ...chat.tags,
      { type: "opportunity" as const, opportunityId: oppId },
    ]);
    setCurrentOpportunityContext(oppId);
  }, [chats, currentChatId, updateChatTags]);

  const createChatForOpportunity = useCallback(
    (oppId: string): string => {
      return createChat([{ type: "opportunity", opportunityId: oppId }]);
    },
    [createChat]
  );

  const openOrCreateChatForOpportunity = useCallback(
    (oppId: string): string => {
      const existing = chats.find(
        (c) =>
          !c.archived &&
          c.tags.some((t) => t.type === "opportunity" && t.opportunityId === oppId)
      );
      if (existing) {
        selectChat(existing.id);
        return existing.id;
      }
      return createChat([{ type: "opportunity", opportunityId: oppId }]);
    },
    [chats, selectChat, createChat]
  );

  const archiveChat = useCallback((chatId: string) => {
    setChats((c) =>
      c.map((ch) =>
        ch.id === chatId ? { ...ch, archived: true, updatedAt: new Date().toISOString() } : ch
      )
    );
    if (chatId === currentChatId) {
      setCurrentChatId(null);
      setCurrentOpportunityContext(null);
    }
  }, [currentChatId]);

  const unarchiveChat = useCallback((chatId: string) => {
    setChats((c) =>
      c.map((ch) =>
        ch.id === chatId ? { ...ch, archived: false, updatedAt: new Date().toISOString() } : ch
      )
    );
  }, []);

  const breakApartChat = useCallback(
    async (chatId: string, onEachOpp: (oppId: string) => void | Promise<void>) => {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;
      const oppTags = chat.tags.filter((t) => t.type === "opportunity" && t.opportunityId);
      if (oppTags.length < 2) return;
      for (const tag of oppTags) {
        const oppId = tag.opportunityId!;
        await onEachOpp(oppId);
      }
    },
    [chats]
  );

  const inferAndApplyTags = useCallback(
    (opportunityIds: string[], isStrategy: boolean, isResearch: boolean, targetChatId?: string) => {
      const chatId = targetChatId ?? currentChatId;
      if (!chatId) return;
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return;
      const newTags: ChatTag[] = [];
      if (isStrategy) newTags.push({ type: "strategy-only" });
      if (isResearch) newTags.push({ type: "research-only" });
      opportunityIds.forEach((id) => newTags.push({ type: "opportunity", opportunityId: id }));
      const merged = [...chat.tags];
      for (const t of newTags) {
        if (t.type === "opportunity" && t.opportunityId) {
          if (!merged.some((m) => m.type === "opportunity" && m.opportunityId === t.opportunityId)) {
            merged.push(t);
          }
        } else if (t.type === "strategy-only" && !merged.some((m) => m.type === "strategy-only")) {
          merged.push(t);
        } else if (t.type === "research-only" && !merged.some((m) => m.type === "research-only")) {
          merged.push(t);
        }
      }
      updateChatTags(chatId, merged);
      if (opportunityIds.length > 0 && !currentOpportunityContext) {
        setCurrentOpportunityContext(opportunityIds[0]);
      }
    },
    [chats, currentChatId, currentOpportunityContext, updateChatTags]
  );
  
  const compressChatMessages = useCallback((chatId: string, compressedMessages: ChatMessage[]) => {
    setChats((c) =>
      c.map((ch) =>
        ch.id === chatId
          ? { ...ch, messages: compressedMessages, updatedAt: new Date().toISOString() }
          : ch
      )
    );
  }, []);

  return {
    chats,
    currentChat,
    currentChatId,
    currentPseudoChatId,
    currentOpportunityContext,
    opportunityIds,
    createChat,
    selectChat,
    selectPseudoChat,
    clearPseudoChat,
    forkChat,
    addMessage,
    updateChatTags,
    setOpportunityContext,
    addOpportunityToChat,
    createChatForOpportunity,
    openOrCreateChatForOpportunity,
    archiveChat,
    unarchiveChat,
    breakApartChat,
    inferAndApplyTags,
    compressChatMessages,
  };
}
