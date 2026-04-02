"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useSubmitPrompt } from "@/lib/chat/useSubmitPrompt";
import {
  getScreenContext,
  getTopBarPlaceholder,
  type ScreenContext,
} from "@/lib/chat/chat-context";

interface ChatTopBarProps {
  pathname: string;
  opportunityId?: string | null;
}

export function ChatTopBar({ pathname, opportunityId }: ChatTopBarProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const submitPrompt = useSubmitPrompt();

  const screenContext: ScreenContext | null = getScreenContext(pathname, opportunityId ?? undefined);
  const placeholder = getTopBarPlaceholder(screenContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    try {
      await submitPrompt(text, {
        screenContext,
        currentChatId: undefined,
      });

      // Brief animation before navigating
      setIsAnimating(true);
      await new Promise((r) => setTimeout(r, 300));
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
      setIsAnimating(false);
    }
  };

  return (
    <div
      className={`sticky top-0 z-10 -mx-8 -mt-8 mb-6 border-b border-gray-700/50 bg-bb-dark-elevated/95 px-8 py-4 backdrop-blur-sm transition-all duration-300 ${
        isAnimating ? "opacity-80 scale-[0.98]" : ""
      }`}
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="flex gap-2 rounded-xl border border-gray-600 bg-bb-dark shadow-sm focus-within:border-bb-coral focus-within:ring-1 focus-within:ring-bb-coral">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-transparent px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex min-w-[2.5rem] items-center justify-center rounded-r-xl bg-bb-coral px-4 py-3 text-white transition-colors hover:bg-bb-coral/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex gap-1">
                <span className="bb-loading-dot bb-loading-dot-1" />
                <span className="bb-loading-dot bb-loading-dot-2" />
                <span className="bb-loading-dot bb-loading-dot-3" />
              </span>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {screenContext?.mode === "system"
            ? "Intelligence Sources — ask me to connect LinkedIn, HubSpot, or AusTender, or to explain the four pillars."
            : screenContext
              ? `${screenContext.screenLabel} — ask about what you're viewing.`
              : "Ask anything — I'll use what you're viewing."}
        </p>
      </form>
    </div>
  );
}
