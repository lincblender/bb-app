"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, ChevronLeft } from "lucide-react";
import { useChat } from "@/lib/chat/ChatContext";

interface OpportunityDetailHeaderProps {
  opportunityId: string;
}

export function OpportunityDetailHeader({ opportunityId }: OpportunityDetailHeaderProps) {
  const router = useRouter();
  const { openOrCreateChatForOpportunity } = useChat();

  const handleChatClick = () => {
    openOrCreateChatForOpportunity(opportunityId);
    router.push("/console/dashboard");
  };

  return (
    <div className="flex items-center justify-between">
      <Link
        href="/console/opportunities"
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-bb-dark-elevated px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
      >
        <ChevronLeft size={16} />
        Back to Opps
      </Link>
      <button
        type="button"
        onClick={handleChatClick}
        className="flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium bg-bb-powder-blue text-black hover:bg-bb-powder-blue-light"
        title="Chat about this opportunity"
      >
        <MessageSquare size={14} />
      </button>
    </div>
  );
}
