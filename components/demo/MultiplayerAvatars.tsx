"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserProfile } from "@/lib/auth/useCurrentUserProfile";
import { UserAvatar } from "./Avatar";

export function MultiplayerAvatars({ roomId }: { roomId: string | null }) {
  const [presence, setPresence] = useState<Record<string, any>[]>([]);
  const currentUser = useCurrentUserProfile();

  useEffect(() => {
    if (!roomId || !currentUser) {
      setPresence([]);
      return;
    }

    const supabase = createClient();
    
    // Subscribe to presence on a specific channel based on roomId
    const channel = supabase.channel(`room_${roomId}`, {
      config: {
        presence: { key: currentUser.email || 'anonymous' },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const currentPresences = Object.values(state).map((p) => p[0]);
        setPresence(currentPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence
          await channel.track({
            user_id: currentUser.email || 'anonymous',
            name: currentUser.fullName || 'User',
            avatar_url: currentUser.avatarUrl,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUser]);

  // Filter out ourselves so we only show "others"
  const otherUsers = presence.filter(p => p.user_id !== (currentUser?.email || 'anonymous'));

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex -space-x-2 overflow-hidden items-center ml-4 px-3 py-1 bg-bb-dark-elevated border border-zinc-800 rounded-full">
       <span className="text-xs text-zinc-400 mr-3 font-medium">Viewing:</span>
      {otherUsers.map((user) => (
         <div key={user.user_id} className="relative ring-2 ring-bb-dark rounded-full cursor-help group" title={`${user.name} is viewing this.`}>
           <UserAvatar
             profile={{ avatarUrl: user.avatar_url, fullName: user.name, email: user.user_id }}
             size={24}
           />
         </div>
      ))}
    </div>
  );
}
