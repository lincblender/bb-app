"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Search, Filter, List, LayoutList, ArrowUp, ArrowDown, Archive, ArchiveRestore, PinOff, type LucideIcon } from "lucide-react";
import { useWorkspaceData } from "@/lib/workspace/client";
import { format } from "date-fns";
import type { AgentResponseBlock, Chat, ChatTag } from "@/lib/chat/types";

const TAG_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "strategy-only": { bg: "bg-purple-500/30", border: "border-purple-400", text: "text-purple-300" },
  "research-only": { bg: "bg-amber-500/30", border: "border-amber-400", text: "text-amber-300" },
  opportunity: { bg: "bg-bb-powder-blue/30", border: "border-bb-powder-blue", text: "text-bb-powder-blue" },
};

function getTagLabel(tag: ChatTag, getOpportunityById: (id: string) => { title: string } | undefined): string {
  if (tag.type === "strategy-only") return "Strategy";
  if (tag.type === "research-only") return "Research";
  if (tag.type === "opportunity" && tag.opportunityId) {
    const opp = getOpportunityById(tag.opportunityId);
    const title = opp?.title ?? tag.opportunityId;
    return title.length > 20 ? title.slice(0, 20) + "…" : title;
  }
  return tag.type;
}

/** Unique filter key for a tag (type + opportunityId for opportunities) */
function getTagFilterKey(tag: ChatTag): string {
  if (tag.type === "opportunity" && tag.opportunityId) {
    return `opp:${tag.opportunityId}`;
  }
  return tag.type;
}

function chatMatchesTag(chat: Chat, filterKey: string): boolean {
  if (filterKey === "strategy-only") return chat.tags.some((t) => t.type === "strategy-only");
  if (filterKey === "research-only") return chat.tags.some((t) => t.type === "research-only");
  if (filterKey.startsWith("opp:")) {
    const oppId = filterKey.slice(4);
    return chat.tags.some((t) => t.type === "opportunity" && t.opportunityId === oppId);
  }
  return false;
}

function getChatIndicatorColor(chat: Chat): string {
  const decisionState = getLatestDecisionState(chat);
  if (decisionState === "Green") return "border-l-bb-green";
  if (decisionState === "Amber") return "border-l-bb-orange";
  if (decisionState === "Red") return "border-l-bb-red";
  const hasStrategy = chat.tags.some((t) => t.type === "strategy-only");
  const hasResearch = chat.tags.some((t) => t.type === "research-only");
  const hasOpp = chat.tags.some((t) => t.type === "opportunity");
  if (hasOpp && !hasStrategy && !hasResearch) return "border-l-bb-powder-blue";
  if (hasStrategy) return "border-l-purple-500";
  if (hasResearch) return "border-l-amber-500";
  return "border-l-gray-600";
}

function getLatestDecisionState(chat: Chat): "Green" | "Amber" | "Red" | null {
  for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
    const decision = chat.messages[i].blocks?.find(
      (block): block is AgentResponseBlock & {
        type: "decision_signal";
        decisionState: "Green" | "Amber" | "Red";
      } => block.type === "decision_signal" && !!block.decisionState
    );
    if (decision?.decisionState) return decision.decisionState;
  }
  return null;
}

interface ChatListSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  pinnedItems: {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    active: boolean;
    removable?: boolean;
  }[];
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onSelectPinnedItem: (id: string) => void;
  onUnpinPinnedItem: (id: string) => void;
}

type ViewMode = "minimal" | "maximal";
type SortOrder = "interaction-newest" | "interaction-oldest" | "created-newest" | "created-oldest";

export function ChatListSidebar({
  chats,
  currentChatId,
  pinnedItems,
  onSelectChat,
  onNewChat,
  onSelectPinnedItem,
  onUnpinPinnedItem,
}: ChatListSidebarProps) {
  const { opportunities } = useWorkspaceData();
  const getOpportunityById = (id: string) => opportunities.find((o) => o.id === id);
  const [viewMode, setViewMode] = useState<ViewMode>("minimal");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>("interaction-newest");
  const [showArchived, setShowArchived] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const chatsToShow = useMemo(
    () => chats.filter((c) => (showArchived ? c.archived : !c.archived)),
    [chats, showArchived]
  );

  const availableTagFilters = useMemo(() => {
    const seen = new Map<string, { label: string; key: string }>();
    for (const chat of chatsToShow) {
      for (const tag of chat.tags) {
        const key = getTagFilterKey(tag);
        if (!seen.has(key)) {
          seen.set(key, { key, label: getTagLabel(tag, getOpportunityById) });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [chatsToShow]);

  const filteredAndSortedChats = useMemo(() => {
    let result = [...chatsToShow];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.title || "New chat").toLowerCase().includes(q) ||
          c.tags.some((t) => getTagLabel(t, getOpportunityById).toLowerCase().includes(q))
      );
    }

    if (tagFilters.size > 0) {
      result = result.filter((c) =>
        Array.from(tagFilters).some((key) => chatMatchesTag(c, key))
      );
    }

    const useCreated = sortOrder.startsWith("created");
    const desc = sortOrder.endsWith("newest");
    result.sort((a, b) => {
      const aTime = new Date(useCreated ? a.createdAt : a.updatedAt).getTime();
      const bTime = new Date(useCreated ? b.createdAt : b.updatedAt).getTime();
      return desc ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [chatsToShow, searchQuery, tagFilters, sortOrder]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  const toggleTagFilter = (key: string) => {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isMinimal = viewMode === "minimal";
  const hasListItems = pinnedItems.length > 0 || filteredAndSortedChats.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="bb-panel-border shrink-0 space-y-1.5 border-b p-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-bb-coral px-3 py-2 text-sm font-medium text-white hover:bg-bb-coral/90"
        >
          <Plus size={16} />
          New
        </button>
        <div className="flex items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full rounded border border-gray-600 bg-bb-dark pl-7 pr-2 text-xs text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral"
            />
          </div>
          <div className="relative flex shrink-0" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex h-7 items-center justify-center gap-0.5 rounded border border-gray-600 bg-bb-dark px-2 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              title="Filter & sort"
            >
              <Filter size={12} />
              {(tagFilters.size > 0) && (
                <span className="rounded-full bg-bb-coral px-1 text-[9px] text-white">
                  {tagFilters.size}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 max-h-64 w-52 overflow-y-auto rounded-lg border border-gray-600 bg-bb-dark-elevated py-1 shadow-lg">
                <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  View
                </p>
                <button
                  onClick={() => {
                    setViewMode(isMinimal ? "maximal" : "minimal");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-700/50"
                >
                  {isMinimal ? <LayoutList size={14} /> : <List size={14} />}
                  <span className={isMinimal ? "text-gray-400" : "bb-text-primary"}>
                    {isMinimal ? "Expand view" : "Collapse view"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowArchived(!showArchived);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-700/50 ${
                    showArchived ? "bb-text-primary" : "text-gray-400"
                  }`}
                >
                  {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  {showArchived ? "Show active only" : "Show archived"}
                </button>
                <p className="mt-1 border-t border-gray-700/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  Sort
                </p>
                <div
                  className={`mx-2 flex items-center justify-between rounded-md px-2 py-1.5 ${
                    sortOrder.startsWith("interaction") ? "bg-bb-powder-blue/30" : "bg-gray-700/20"
                  }`}
                >
                  <button
                    onClick={() =>
                      setSortOrder(sortOrder.startsWith("interaction") ? sortOrder : "interaction-newest")
                    }
                    className={`text-left text-xs ${sortOrder.startsWith("interaction") ? "text-bb-powder-blue" : "text-gray-500"}`}
                  >
                    Last active
                  </button>
                  <button
                    onClick={() =>
                      setSortOrder(
                        sortOrder.startsWith("interaction")
                          ? sortOrder === "interaction-newest"
                            ? "interaction-oldest"
                            : "interaction-newest"
                          : "interaction-newest"
                      )
                    }
                    className={`rounded p-1 ${sortOrder.startsWith("interaction") ? "text-bb-powder-blue hover:bg-bb-powder-blue/20" : "text-gray-500 hover:bg-gray-600/30"}`}
                    title={sortOrder.startsWith("interaction") && sortOrder.endsWith("newest") ? "Newest first (click for oldest)" : "Oldest first (click for newest)"}
                  >
                    {(sortOrder.startsWith("interaction") && sortOrder.endsWith("newest")) || !sortOrder.startsWith("interaction") ? (
                      <ArrowDown size={14} />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                  </button>
                </div>
                <div
                  className={`mx-2 flex items-center justify-between rounded-md px-2 py-1.5 ${
                    sortOrder.startsWith("created") ? "bg-bb-powder-blue/30" : "bg-gray-700/20"
                  }`}
                >
                  <button
                    onClick={() =>
                      setSortOrder(sortOrder.startsWith("created") ? sortOrder : "created-newest")
                    }
                    className={`text-left text-xs ${sortOrder.startsWith("created") ? "text-bb-powder-blue" : "text-gray-500"}`}
                  >
                    Created
                  </button>
                  <button
                    onClick={() =>
                      setSortOrder(
                        sortOrder.startsWith("created")
                          ? sortOrder === "created-newest"
                            ? "created-oldest"
                            : "created-newest"
                          : "created-newest"
                      )
                    }
                    className={`rounded p-1 ${sortOrder.startsWith("created") ? "text-bb-powder-blue hover:bg-bb-powder-blue/20" : "text-gray-500 hover:bg-gray-600/30"}`}
                    title={sortOrder.startsWith("created") && sortOrder.endsWith("newest") ? "Newest first (click for oldest)" : "Oldest first (click for newest)"}
                  >
                    {(sortOrder.startsWith("created") && sortOrder.endsWith("newest")) || !sortOrder.startsWith("created") ? (
                      <ArrowDown size={14} />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                  </button>
                </div>
                <p className="mt-1 border-t border-gray-700/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  Filter by tag
                </p>
                {availableTagFilters.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">No tags in chats</p>
                ) : (
                  availableTagFilters.map(({ key, label }) => {
                    const colors = key.startsWith("opp:")
                      ? TAG_COLORS.opportunity
                      : TAG_COLORS[key as keyof typeof TAG_COLORS] ?? TAG_COLORS.opportunity;
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTagFilter(key)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-700/50 ${
                          tagFilters.has(key) ? "bg-gray-700/50" : ""
                        }`}
                      >
                        <span className={`rounded px-1.5 py-0.5 ${colors.bg} ${colors.text}`}>
                          {label}
                        </span>
                        {tagFilters.has(key) && <span className="text-bb-coral">✓</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {hasListItems ? (
          <div className="space-y-1">
            {pinnedItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`group relative rounded-lg border-l-4 border-l-gray-600 ${
                    item.active ? "bg-bb-mustard/20" : "hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectPinnedItem(item.id)}
                      className={`flex min-w-0 flex-1 items-start gap-2 text-left ${
                        isMinimal ? "px-3 py-2" : "px-3 py-2.5"
                      }`}
                    >
                      <Icon
                        size={15}
                        className={`mt-0.5 shrink-0 ${
                          item.active ? "text-bb-mustard" : "text-gray-400"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <p className="min-w-0 truncate text-sm font-medium bb-text-primary">
                          {item.label}
                        </p>
                      </span>
                    </button>
                    {item.removable && (
                      <button
                        type="button"
                        onClick={() => onUnpinPinnedItem(item.id)}
                        className="mr-1 flex h-7 w-7 items-center justify-center rounded text-gray-500 opacity-0 transition-opacity hover:bg-gray-700/70 hover:text-gray-200 group-hover:opacity-100"
                        title="Unpin"
                      >
                        <PinOff size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredAndSortedChats.map((chat) => {
              const isActive = chat.id === currentChatId;
              const indicatorColor = getChatIndicatorColor(chat);
              const decisionState = getLatestDecisionState(chat);
              return (
                <div
                  key={chat.id}
                  className={`group relative rounded-lg border-l-4 ${indicatorColor} ${
                    isActive ? "bg-bb-mustard/20" : "hover:bg-gray-700/50"
                  }`}
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className={`flex w-full items-start gap-2 text-left ${isMinimal ? "px-3 py-2" : "px-3 py-2.5"}`}
                  >
                    {(chat.unreadCount ?? 0) > 0 && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-bb-coral"
                        title={`${chat.unreadCount} unread`}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium bb-text-primary">
                        {chat.title || "New chat"}
                      </p>
                      {decisionState && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            decisionState === "Green"
                              ? "bg-bb-green/20 text-bb-green"
                              : decisionState === "Amber"
                                ? "bg-bb-orange/20 text-bb-orange"
                                : "bg-bb-red/20 text-bb-red"
                          }`}
                        >
                          {decisionState}
                        </span>
                      )}
                    </div>
                    {!isMinimal && (
                      <>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {format(new Date(chat.updatedAt), "dd MMM yyyy")}
                        </p>
                        {chat.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {chat.tags.map((tag, i) => {
                              const colors =
                                TAG_COLORS[tag.type] ?? TAG_COLORS.opportunity;
                              return (
                                <span
                                  key={i}
                                  className={`rounded px-1.5 py-0.5 text-xs ${colors.bg} ${colors.text}`}
                                >
                                  {getTagLabel(tag, getOpportunityById)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {chatsToShow.length === 0 && chats.length > 0
              ? showArchived
                ? "No archived chats."
                : "No active chats. Use Show archived to view archived chats."
              : chats.length === 0
                ? "No chats yet. Start a new one."
                : "No chats match your search or filters."}
          </div>
        )}
      </div>
    </div>
  );
}
