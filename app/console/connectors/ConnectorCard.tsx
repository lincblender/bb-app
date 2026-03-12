"use client";

import { useState } from "react";
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
  const Icon = PILLAR_ICONS[pillar.id];
  const badge = getStatusBadge(pillar.status);

  return (
    <Card className="flex min-h-[320px] flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bb-powder-blue/15 text-bb-powder-blue">
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-700/50 hover:text-gray-300"
            aria-label="More information"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      <h2 className="mt-3 text-lg font-semibold text-gray-100">{config.title}</h2>

      <p className="mt-2 line-clamp-2 text-sm text-gray-400">{pillar.detail}</p>

      {infoOpen && (
        <div className="mt-2 rounded-lg border border-gray-700/60 bg-bb-dark px-3 py-2 text-xs text-gray-500">
          {config.info}
        </div>
      )}

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
