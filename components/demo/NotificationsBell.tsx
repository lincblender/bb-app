"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, FileWarning, Info } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useWorkspaceData } from "@/lib/workspace/client";
import { useChat } from "@/lib/chat/ChatContext";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  action_data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { openOrCreateChatForOpportunity, setOpportunityContext } = useChat();

  useEffect(() => {
    // 1. Fetch initial notifications
    const supabase = createClient();
    
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // 2. Set up realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const handleAction = async (notif: Notification) => {
    await markAsRead(notif.id);
    setIsOpen(false);

    if (notif.action_data?.opportunity_id) {
       setOpportunityContext(notif.action_data.opportunity_id);
       const chatId = openOrCreateChatForOpportunity(notif.action_data.opportunity_id);
       
       if (notif.type === "addendum_alert") {
         window.dispatchEvent(
            new CustomEvent("bidblender:submit-prompt", {
              detail: { text: "Review the newly uploaded addendum findings.", chatId },
            })
          );
       }
       if (window.location.pathname !== "/dashboard") {
          router.push("/dashboard");
       }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative inline-block" ref={bellRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-bb-dark-elevatedanimate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 shadow-sm border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
            {unreadCount > 0 && (
               <span className="text-xs bg-zinc-800 text-zinc-400 py-0.5 px-2 rounded-full font-medium">
                 {unreadCount} New
               </span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 flex flex-col items-center">
                <Bell size={24} className="mb-2 opacity-20" />
                No unread notifications
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleAction(notif)}
                    className={clsx(
                      "w-full text-left p-3 transition-colors hover:bg-zinc-800/80 group",
                      notif.is_read ? "opacity-70 bg-transparent" : "bg-zinc-800/40"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={clsx(
                         "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                         notif.action_data?.is_material ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {notif.action_data?.is_material ? <FileWarning size={14} /> : <Info size={14} />}
                      </div>
                      <div className="min-w-0">
                         <p className={clsx("text-sm truncate pr-2", notif.is_read ? "text-zinc-300" : "text-zinc-100 font-medium")}>{notif.title}</p>
                         <p className="text-xs text-zinc-400 leading-snug mt-1 line-clamp-2">{notif.message}</p>
                         <p className="text-[10px] text-zinc-600 mt-2 font-medium">
                           {new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                         </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
