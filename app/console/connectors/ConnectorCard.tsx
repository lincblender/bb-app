"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Linkedin, History, Building2, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { SetupPillarStatus } from "@/lib/connectors/setup-status";
import type { PillarDisplayConfig } from "./pillar-config";
import { getStatusBadge } from "./utils";

const PILLAR_ICONS = {
  reach: Linkedin,
  history: History,
  capability: Building2,
  opportunity: Briefcase,
} as const;

interface ConnectorCardProps {
  pillar: SetupPillarStatus;
  config: PillarDisplayConfig;
  content?: React.ReactNode;
  actions: React.ReactNode;
}

export function ConnectorCard({ pillar, config, content, actions }: ConnectorCardProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [infoOpen]);

  const Icon = PILLAR_ICONS[pillar.id];
  const badge = getStatusBadge(pillar.status);

  return (
    <Card className="flex min-h-[320px] flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bb-powder-blue/15 text-bb-powder-blue">
          <Icon size={18} />
        </div>
        <div className="relative flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-700/50 hover:text-gray-300"
            aria-label="More information"
            aria-expanded={infoOpen}
          >
            <Info size={14} />
          </button>
          {infoOpen && (
            <div
              ref={popoverRef}
              role="tooltip"
              className="absolute right-0 top-full z-50 mt-1.5 max-w-[260px] rounded-lg border border-gray-600 bg-bb-dark-elevated px-3 py-2.5 text-xs text-gray-300 shadow-xl"
              style={{ bottom: "auto" }}
            >
              {config.info}
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-3 text-lg font-semibold text-gray-100">{config.title}</h2>

      <p className="mt-2 line-clamp-2 text-sm text-gray-400">{pillar.detail}</p>

      <ul className="mt-3 space-y-1 text-sm text-gray-300">
        {config.bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-gray-500">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 min-h-[48px] flex-1">{content}</div>

      <div className="mt-4 flex flex-col gap-2 border-t border-gray-700/50 pt-4">
        {actions}
      </div>
    </Card>
  );
}
