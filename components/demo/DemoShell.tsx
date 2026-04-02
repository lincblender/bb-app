"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, MessageSquare } from "lucide-react";
import { SettingsProvider } from "@/lib/settings/SettingsContext";
import { ChatProvider, useChat } from "@/lib/chat/ChatContext";
import { WorkspaceDataProvider } from "@/lib/workspace/client";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Pin } from "lucide-react";
import { BbLogo } from "@/components/ui/BbLogo";
import { ChatListSidebar } from "./ChatListSidebar";
import { UserProfile } from "./UserProfile";
import { PromptScreen } from "./PromptScreen";
import { OpportunityPanel, type SectionId } from "./OpportunityPanel";
import { ChatTopBar } from "./ChatTopBar";
import { blockNavigationForUnsavedChanges } from "@/lib/navigation/unsaved-changes";
import {
  DEFAULT_PINNED_SURFACE_IDS,
  ONBOARDING_SURFACE,
  ONBOARDING_SURFACE_ID,
  PINNABLE_SCREEN_SURFACES,
  PINNED_SIDEBAR_STORAGE_KEY,
  SIDEBAR_SURFACE_MAP,
} from "@/lib/chat/sidebar-surfaces";

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
    () => false
  );
}

function DemoShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinnedSurfaceIds, setPinnedSurfaceIds] = useState<string[]>(DEFAULT_PINNED_SURFACE_IDS);
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  const [contextPanelSectionToOpen, setContextPanelSectionToOpen] = useState<SectionId | null>(null);
  const [mobileDashboardView, setMobileDashboardView] = useState<"chat" | "context">("chat");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const pinnedSurfacesHydratedRef = useRef(false);

  // On mobile: sidebar collapsed by default. Toggle via hamburger.
  const sidebarExpanded = isMobile ? sidebarOpen : true;

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
      setMobileDashboardView("chat");
    }
  }, [isMobile]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = localStorage.getItem(PINNED_SIDEBAR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const validIds = parsed.filter(
            (value): value is string =>
              typeof value === "string" &&
              value !== ONBOARDING_SURFACE_ID &&
              SIDEBAR_SURFACE_MAP.has(value)
          );
          setPinnedSurfaceIds([ONBOARDING_SURFACE_ID, ...validIds]);
        }
      }
    } catch {
      setPinnedSurfaceIds(DEFAULT_PINNED_SURFACE_IDS);
    } finally {
      pinnedSurfacesHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!pinnedSurfacesHydratedRef.current || typeof window === "undefined") {
      return;
    }

    localStorage.setItem(PINNED_SIDEBAR_STORAGE_KEY, JSON.stringify(pinnedSurfaceIds));
  }, [pinnedSurfaceIds]);

  const {
    chats,
    currentChatId,
    currentPseudoChatId,
    currentOpportunityContext,
    opportunityIds,
    createChat,
    selectChat,
    selectPseudoChat,
    clearPseudoChat,
    setOpportunityContext,
    openOrCreateChatForOpportunity,
  } = useChat();

  const handleStartSwot = (opportunityId: string) => {
    const chatId = openOrCreateChatForOpportunity(opportunityId);
    window.dispatchEvent(
      new CustomEvent("bidblender:submit-prompt", {
        detail: { text: "Start SWOT", chatId, opportunityId },
      })
    );
  };

  const handleNewChat = () => {
    if (blockNavigationForUnsavedChanges("/dashboard")) {
      return;
    }
    createChat();
    if (!isDashboard) router.push("/dashboard");
  };

  const handleSelectChat = (id: string) => {
    if (blockNavigationForUnsavedChanges("/dashboard")) {
      return;
    }
    selectChat(id);
    if (!isDashboard) router.push("/dashboard");
  };

  const togglePinnedSurface = (surfaceId: string) => {
    if (surfaceId === ONBOARDING_SURFACE_ID) {
      return;
    }

    setPinnedSurfaceIds((current) =>
      current.includes(surfaceId)
        ? current.filter((id) => id !== surfaceId)
        : [...current, surfaceId]
    );
  };

  const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/";

  const pinnedSidebarItems = useMemo(() => {
    const pinnedScreens = pinnedSurfaceIds
      .filter((id) => id !== ONBOARDING_SURFACE_ID)
      .map((id) => SIDEBAR_SURFACE_MAP.get(id))
      .filter((surface): surface is NonNullable<typeof surface> => !!surface);

    return [
      {
        ...ONBOARDING_SURFACE,
        active: currentPseudoChatId === ONBOARDING_SURFACE_ID && isDashboard,
        removable: false,
      },
      ...pinnedScreens.map((surface) => ({
        ...surface,
        active:
          surface.kind === "screen" &&
          !!surface.href &&
          (pathname === surface.href || pathname.startsWith(`${surface.href}/`)),
        removable: true,
      })),
    ];
  }, [currentPseudoChatId, isDashboard, pathname, pinnedSurfaceIds]);

  const handleSelectPinnedItem = (surfaceId: string) => {
    if (surfaceId === ONBOARDING_SURFACE_ID) {
      if (blockNavigationForUnsavedChanges("/dashboard")) {
        return;
      }
      selectPseudoChat(ONBOARDING_SURFACE_ID);
      if (!isDashboard) {
        router.push("/dashboard");
      }
      if (isMobile) {
        setSidebarOpen(false);
      }
      return;
    }

    const surface = SIDEBAR_SURFACE_MAP.get(surfaceId);
    if (surface?.kind === "screen" && surface.href) {
      if (blockNavigationForUnsavedChanges(surface.href)) {
        return;
      }
      clearPseudoChat();
      router.push(surface.href);
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!contextPanelCollapsed && contextPanelSectionToOpen) {
      const t = setTimeout(() => setContextPanelSectionToOpen(null), 500);
      return () => clearTimeout(t);
    }
  }, [contextPanelCollapsed, contextPanelSectionToOpen]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.replace("/auth/signin");
        } else {
          setAuthenticated(true);
        }
      })
      .catch(() => router.replace("/auth/signin"));
  }, [router]);

  const handleLogout = async () => {
    if (blockNavigationForUnsavedChanges("/auth/signin")) {
      return;
    }
    await createClient().auth.signOut();
    router.replace("/auth/signin");
    router.refresh();
  };

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bb-dark">
        <p className="bb-text-muted-alt">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bb-bg-base">
      {/* Mobile overlay when sidebar open */}
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`bb-border-r-subtle fixed left-0 top-0 z-40 flex h-[100dvh] w-64 flex-col border-r bb-bg-sidebar transition-transform duration-200 ease-out md:translate-x-0 ${
          sidebarExpanded ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="bb-panel-border flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={(event) => {
              if (blockNavigationForUnsavedChanges("/dashboard")) {
                event.preventDefault();
                return;
              }
              if (isMobile) setSidebarOpen(false);
            }}
          >
            <BbLogo size={36} />
            <span className="font-semibold bb-text-primary">BidBlender</span>
          </Link>
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded p-2 text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${isMobile ? "pb-40" : ""}`}>
          <ChatListSidebar
            chats={chats}
            currentChatId={currentChatId}
            pinnedItems={pinnedSidebarItems}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onSelectPinnedItem={handleSelectPinnedItem}
            onUnpinPinnedItem={togglePinnedSurface}
          />
        </div>
        <div
          className={`bb-panel-border shrink-0 border-t p-2 ${
            isMobile
              ? "fixed bottom-0 left-0 z-50 w-64 bg-bb-dark-elevated pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
              : ""
          }`}
        >
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left bb-interactive-hover"
            >
              <UserProfile compact />
              <ChevronDown
                size={16}
                className={`shrink-0 text-gray-500 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {settingsOpen && (
              <div className="absolute bottom-full left-0 right-0 z-10 mb-1 min-w-64 rounded-lg border border-gray-700 bg-bb-dark-elevated py-1 shadow-lg">
                {PINNABLE_SCREEN_SURFACES.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith((item.href ?? "") + "/");
                  const isPinned = pinnedSurfaceIds.includes(item.id);
                  return (
                    <div
                      key={item.href}
                    >
                      <div className="flex items-center gap-2 px-2">
                        <Link
                          href={item.href ?? "/dashboard"}
                          onClick={(event) => {
                            const href = item.href ?? "/dashboard";
                            if (blockNavigationForUnsavedChanges(href)) {
                              event.preventDefault();
                              return;
                            }
                            clearPseudoChat();
                            setSettingsOpen(false);
                            if (isMobile) setSidebarOpen(false);
                          }}
                          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-sm ${
                            isActive ? "bb-nav-link-active" : "bb-interactive-hover"
                          }`}
                        >
                          <Icon size={18} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => togglePinnedSurface(item.id)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                            isPinned
                              ? "bg-bb-powder-blue/20 text-bb-powder-blue hover:bg-bb-powder-blue/30"
                              : "text-gray-500 hover:bg-gray-700/50 hover:text-gray-200"
                          }`}
                          title={isPinned ? "Unpin from chat list" : "Pin to chat list"}
                        >
                          <Pin size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="my-1 border-t border-gray-700" />
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm bb-interactive-hover text-left"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <main
        className={`flex flex-1 flex-col md:ml-64 ${
          isDashboard
            ? `h-[100dvh] overflow-hidden ${isMobile ? "p-0" : "p-8"}`
            : "min-h-[100dvh] p-4 md:p-8"
        }`}
      >
        {isMobile && isDashboard && (
          <div className="fixed left-4 top-4 z-30 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-lg border border-gray-600 bg-bb-dark-elevated p-2 text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            {mobileDashboardView === "context" && (
              <button
                type="button"
                onClick={() => {
                  setMobileDashboardView("chat");
                  setContextPanelCollapsed(true);
                }}
                className="flex items-center justify-center rounded-lg border border-gray-600 bg-bb-dark-elevated p-2 text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
                aria-label="Back to chat"
                title="Back to chat"
              >
                <MessageSquare size={20} />
              </button>
            )}
          </div>
        )}
        {isMobile && !isDashboard && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-4 z-30 flex items-center justify-center rounded-lg border border-gray-600 bg-bb-dark-elevated p-2 text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <div
          className={`flex flex-1 flex-col min-h-0 ${
            isMobile && !isDashboard ? "pt-14" : ""
          }`}
        >
        {isDashboard ? (
          <div
            className={`flex min-h-0 flex-1 overflow-hidden ${
              isMobile ? "" : "-m-8"
            }`}
          >
            {(!isMobile || mobileDashboardView === "chat") && (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <PromptScreen mobileTopPadding={isMobile} />
              </div>
            )}
            <OpportunityPanel
              opportunityId={currentOpportunityContext}
              opportunityIds={opportunityIds}
              onSwitchOpportunity={setOpportunityContext}
              chats={chats}
              currentChatId={currentChatId}
              onSelectRelatedChat={selectChat}
              onStartSwot={handleStartSwot}
              collapsed={isMobile ? mobileDashboardView === "chat" : contextPanelCollapsed}
              onCollapseToggle={() => {
                if (isMobile) {
                  if (mobileDashboardView === "chat") {
                    setMobileDashboardView("context");
                    setContextPanelCollapsed(false);
                  } else {
                    setMobileDashboardView("chat");
                    setContextPanelCollapsed(true);
                  }
                } else {
                  setContextPanelCollapsed((c) => {
                    if (!c) setContextPanelSectionToOpen(null);
                    return !c;
                  });
                }
              }}
              onExpandToSection={(sectionId) => {
                setContextPanelSectionToOpen(sectionId);
                if (isMobile) {
                  setMobileDashboardView("context");
                }
                setContextPanelCollapsed(false);
              }}
              sectionToOpen={contextPanelSectionToOpen}
              fullWidthOnMobile={isMobile && mobileDashboardView === "context"}
              mobileTopPadding={isMobile && mobileDashboardView === "context"}
            />
          </div>
        ) : (
          <>
            <ChatTopBar
              pathname={pathname}
              opportunityId={
                pathname.match(/^\/console\/opportunities\/([^/]+)$/)?.[1] ?? null
              }
            />
            {children}
          </>
        )}
        </div>
      </main>
    </div>
  );
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <WorkspaceDataProvider>
        <ChatProvider>
          <DemoShellInner>{children}</DemoShellInner>
        </ChatProvider>
      </WorkspaceDataProvider>
    </SettingsProvider>
  );
}
