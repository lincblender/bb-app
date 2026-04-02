"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  Calendar,
  Building2,
  Activity,
  ListChecks,
  MessageSquare,
  Network,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { useWorkspaceData } from "@/lib/workspace/client";
import { Badge } from "@/components/ui/Badge";
import { getRelatedChats } from "@/lib/chat/related-chats";
import type { AgentResponseBlock, Chat } from "@/lib/chat/types";
import { DocumentUploader } from "./DocumentUploader";

const SECTION_IDS = ["key-info", "docs", "network", "status", "decisions", "related-chats"] as const;

interface OpportunitySearchPanelProps {
  opportunities: { id: string; title: string; issuingOrganisationId: string; category: string; dueDate: string }[];
  buyerOrganisations: { id: string; name: string }[];
  onSelect: (id: string) => void;
  onCollapseToggle?: () => void;
  panelWidthClass: string;
  formatDate: (dateStr: string) => string;
}

function OpportunitySearchPanel({
  opportunities,
  buyerOrganisations,
  onSelect,
  onCollapseToggle,
  panelWidthClass,
  formatDate,
}: OpportunitySearchPanelProps) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const getBuyerById = (id: string) => buyerOrganisations.find((b) => b.id === id);
  const matches = q
    ? opportunities.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (getBuyerById(o.issuingOrganisationId)?.name ?? "").toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q)
      )
    : opportunities.slice(0, 8);

  return (
    <div className={`flex h-full flex-col overflow-hidden border-l border-gray-700/50 bg-bb-dark-elevated ${panelWidthClass}`}>
      <div className="flex items-center justify-between border-b border-gray-700/50 px-3 py-2">
        <span className="text-sm font-medium text-gray-500">Details</span>
        {onCollapseToggle && (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="rounded p-1 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            title="Hide details"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Search opportunities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-bb-dark py-2 pl-9 pr-3 text-sm text-gray-100 placeholder-gray-500 focus:border-bb-powder-blue focus:outline-none focus:ring-1 focus:ring-bb-powder-blue"
          />
        </div>
        <p className="mb-2 text-xs text-gray-500">
          {q ? `Found ${matches.length} match${matches.length !== 1 ? "es" : ""}` : "Recent opportunities"}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="text-sm text-gray-500">No opportunities match your search.</p>
          ) : (
            <ul className="space-y-1">
              {matches.map((o) => {
                const buyer = getBuyerById(o.issuingOrganisationId);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(o.id)}
                      className="w-full rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-left text-sm transition-colors hover:border-bb-powder-blue/50 hover:bg-bb-powder-blue/10"
                    >
                      <p className="truncate font-medium text-gray-200">{o.title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {buyer?.name ?? "Unknown"} · {formatDate(o.dueDate)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Or ask about an opportunity in chat to see details here.
        </p>
        <Link
          href="/opportunities"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-gray-600 bg-bb-dark px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-bb-powder-blue/50 hover:bg-bb-powder-blue/10 hover:text-gray-100"
        >
          Browse all opportunities
        </Link>
      </div>
    </div>
  );
}

export type SectionId = (typeof SECTION_IDS)[number];

interface CollapsibleSectionProps {
  id: SectionId;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  id,
  title,
  icon,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  useEffect(() => {
    if (isControlled && controlledOpen) setInternalOpen(true);
  }, [isControlled, controlledOpen]);

  const setOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  return (
    <div id={`section-${id}`} className="border-b border-gray-700/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-100 hover:bg-gray-700/50"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          {icon}
          {title}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function OpportunitySelect<T extends string>({
  value,
  options,
  getLabel,
  onChange,
}: {
  value: T;
  options: T[];
  getLabel: (id: T) => string;
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded border-0 border-b border-gray-700/40 bg-transparent py-1.5 text-left text-sm text-gray-300 hover:border-gray-600/50 focus:border-bb-powder-blue/60 focus:outline-none focus:ring-0"
      >
        <span className="truncate">{getLabel(value)}</span>
        <ChevronDown size={14} className="shrink-0 text-gray-500" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-600 bg-bb-dark-elevated py-1 shadow-lg">
          {options.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={`flex w-full px-3 py-2 text-left text-sm ${
                id === value
                  ? "bg-bb-powder-blue/20 text-bb-powder-blue"
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-gray-100"
              }`}
            >
              {getLabel(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const PERCEIVED_COMPETITORS = ["TechCorp", "DataCom"] as const;

const SWOT_CREDITS = 2;

function getLatestDecisionSignal(
  opportunityId: string,
  chats: Chat[],
  currentChatId: string | null
): (AgentResponseBlock & {
  type: "decision_signal";
  decisionState?: "Green" | "Amber" | "Red";
  recommendation?: "Bid" | "Research" | "No Bid";
}) | null {
  const relevantChats = [...chats]
    .filter((chat) =>
      chat.tags.some((tag) => tag.type === "opportunity" && tag.opportunityId === opportunityId)
    )
    .sort((a, b) => {
      if (a.id === currentChatId) return -1;
      if (b.id === currentChatId) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  for (const chat of relevantChats) {
    for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
      const block = chat.messages[i].blocks?.find(
        (
          candidate
        ): candidate is AgentResponseBlock & {
          type: "decision_signal";
          decisionState?: "Green" | "Amber" | "Red";
          recommendation?: "Bid" | "Research" | "No Bid";
        } => candidate.type === "decision_signal"
      );
      if (block) return block;
    }
  }

  return null;
}

function NetworkSection({
  buyerId,
  opportunityId,
  onStartSwot,
  relationshipSignals,
}: {
  buyerId: string;
  opportunityId: string;
  onStartSwot?: (oppId: string) => void;
  relationshipSignals: { buyerOrganisationId: string; connectionCount: number; adjacencyToDecisionMakers: string; sharedEmployers: number }[];
}) {
  const signals = relationshipSignals.filter((s) => s.buyerOrganisationId === buyerId);
  const totalConnections = signals.reduce((sum, s) => sum + s.connectionCount, 0);
  const hasDirect = signals.some((s) => s.adjacencyToDecisionMakers === "direct");
  const hasGaps = signals.some((s) => s.adjacencyToDecisionMakers === "none") || (signals.length === 1 && signals[0].connectionCount < 10);
  const base = totalConnections || 12;
  const usConnections = Math.round(base * 10) || 120;
  const usFollows = Math.round(base * 15) || 181;
  const competitorConnections = [Math.round(base * 12) || 142, Math.round(base * 10) || 118];
  const competitorFollows = [Math.round(base * 9.5) || 116, Math.round(base * 8) || 92];
  const networkOptimism = Math.min(95, 70 + Math.round(base * 1.2)) || 84;
  const usLeadsConnections = usConnections > Math.max(...competitorConnections);
  const usLeadsFollows = usFollows > Math.max(...competitorFollows);

  return (
    <div className="space-y-2 text-xs">
      {onStartSwot && (
        <button
          type="button"
          onClick={() => onStartSwot(opportunityId)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-600 bg-bb-dark-elevated px-3 py-2 text-left text-sm font-medium text-gray-200 transition-colors hover:border-bb-powder-blue/50 hover:bg-bb-powder-blue/10"
        >
          <span>Start SWOT</span>
          <span className="shrink-0 rounded bg-bb-mustard/20 px-1.5 py-0.5 text-[10px] font-medium text-bb-mustard">
            {SWOT_CREDITS} credits
          </span>
        </button>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700/50">
            <th className="py-1 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">Metric</th>
            <th className="py-1 text-right text-[10px] font-medium text-bb-powder-blue">Us</th>
            {PERCEIVED_COMPETITORS.map((c, i) => (
              <th key={c} className="py-1 text-right text-[10px] font-medium text-gray-500">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-200">
          <tr>
            <td className="py-0.5 text-gray-500">Connections</td>
            <td className={`py-0.5 text-right ${usLeadsConnections ? "font-medium text-bb-green" : ""}`}>{usConnections}</td>
            {competitorConnections.map((n, i) => (
              <td key={i} className="py-0.5 text-right">{n}</td>
            ))}
          </tr>
          <tr>
            <td className="py-0.5 text-gray-500">Issuer follows</td>
            <td className={`py-0.5 text-right ${usLeadsFollows ? "font-medium text-bb-green" : ""}`}>{usFollows}</td>
            {competitorFollows.map((n, i) => (
              <td key={i} className="py-0.5 text-right">{n}</td>
            ))}
          </tr>
          <tr>
            <td className="py-0.5 text-gray-500">Optimism</td>
            <td colSpan={1 + PERCEIVED_COMPETITORS.length} className="py-0.5 text-right font-medium text-bb-powder-blue">{networkOptimism}%</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-gray-500">
        LinkedIn scan (assumed) · RFT attendees (+ add manual)
      </p>
      <div className="space-y-1.5 border-t border-gray-700/50 pt-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Strengths</p>
        <ul className="space-y-0.5 text-gray-300">
          {hasDirect && <li className="flex items-center gap-1.5"><span className="text-bb-green">+</span>Direct exec access</li>}
          {usLeadsFollows && <li className="flex items-center gap-1.5"><span className="text-bb-green">+</span>Issuer followership leads competitors</li>}
          {usLeadsConnections && <li className="flex items-center gap-1.5"><span className="text-bb-green">+</span>Connection count leads TechCorp, DataCom</li>}
          <li className="flex items-center gap-1.5"><span className="text-bb-green">+</span>Procurement & IT coverage</li>
        </ul>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">Weaknesses</p>
        <ul className="space-y-0.5 text-gray-300">
          {!usLeadsFollows && <li className="flex items-center gap-1.5"><span className="text-bb-coral">−</span>TechCorp has stronger incumbent followership</li>}
          {hasGaps && <li className="flex items-center gap-1.5"><span className="text-bb-coral">−</span>No direct access in 2 depts</li>}
          <li className="flex items-center gap-1.5"><span className="text-bb-coral">−</span>Subsidiary contacts: limited</li>
        </ul>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">Opportunities</p>
        <ul className="space-y-0.5 text-gray-300">
          <li className="flex items-center gap-1.5"><span className="text-bb-mustard">○</span>RFT briefing attendees — add manually to enrich</li>
          {signals.length > 0 && Math.max(...signals.map((s) => s.sharedEmployers)) > 0 && (
            <li className="flex items-center gap-1.5"><span className="text-bb-mustard">○</span>{Math.max(...signals.map((s) => s.sharedEmployers))} shared employers with issuer staff</li>
          )}
          <li className="flex items-center gap-1.5"><span className="text-bb-mustard">○</span>Finance dept under-connected</li>
        </ul>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">Threats</p>
        <ul className="space-y-0.5 text-gray-300">
          <li className="flex items-center gap-1.5"><span className="text-bb-coral">!</span>TechCorp incumbent on related contract</li>
          <li className="flex items-center gap-1.5"><span className="text-bb-coral">!</span>TechCorp–CloudServe acquisition rumoured</li>
        </ul>
      </div>
    </div>
  );
}

const SECTION_CONFIG: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "key-info", label: "Key info", icon: <Calendar size={16} /> },
  { id: "docs", label: "Docs", icon: <FileText size={16} /> },
  { id: "network", label: "Network", icon: <Network size={16} /> },
  { id: "status", label: "Status", icon: <Activity size={16} /> },
  { id: "decisions", label: "Decisions", icon: <ListChecks size={16} /> },
  { id: "related-chats", label: "Related chats", icon: <MessageSquare size={16} /> },
];

interface OpportunityPanelProps {
  opportunityId: string | null;
  opportunityIds: string[];
  onSwitchOpportunity: (id: string) => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectRelatedChat?: (chatId: string) => void;
  onStartSwot?: (opportunityId: string) => void;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onExpandToSection?: (sectionId: SectionId) => void;
  sectionToOpen?: SectionId | null;
  fullWidthOnMobile?: boolean;
  mobileTopPadding?: boolean;
}

export function OpportunityPanel({
  opportunityId,
  opportunityIds,
  onSwitchOpportunity,
  chats,
  currentChatId,
  onSelectRelatedChat,
  onStartSwot,
  collapsed = false,
  onCollapseToggle,
  onExpandToSection,
  sectionToOpen,
  fullWidthOnMobile = false,
  mobileTopPadding = false,
}: OpportunityPanelProps) {
  const { opportunities, buyerOrganisations, relationshipSignals } = useWorkspaceData();
  const getOpportunityById = (id: string) => opportunities.find((o) => o.id === id);
  const getBuyerById = (id: string) => buyerOrganisations.find((b) => b.id === id);

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-shrink-0 flex-col items-center gap-1 border-l border-gray-700/50 bg-bb-dark-elevated pt-2 pb-4">
        <button
          type="button"
          onClick={() => onCollapseToggle?.()}
          className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
          title="View opportunity details"
        >
          <ChevronRight size={20} />
        </button>
        {SECTION_CONFIG.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              onExpandToSection?.(id);
            }}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
            title={`${label} – view details`}
          >
            {icon}
          </button>
        ))}
      </div>
    );
  }

  const panelWidthClass = fullWidthOnMobile ? "w-full min-w-0 flex-1" : "w-80 flex-shrink-0";

  if (!opportunityId) {
    return (
      <OpportunitySearchPanel
        opportunities={opportunities}
        buyerOrganisations={buyerOrganisations}
        onSelect={onSwitchOpportunity}
        onCollapseToggle={onCollapseToggle}
        panelWidthClass={panelWidthClass}
        formatDate={formatDate}
      />
    );
  }

  const opp = getOpportunityById(opportunityId);
  if (!opp) return null;

  const buyer = getBuyerById(opp.issuingOrganisationId);
  const related = getRelatedChats(
    opportunityId,
    chats,
    currentChatId,
    opportunities,
    (id) => getBuyerById(id)?.name ?? "Unknown"
  );
  const latestDecision = getLatestDecisionSignal(opportunityId, chats, currentChatId);

  useEffect(() => {
    if (sectionToOpen) {
      const el = document.getElementById(`section-${sectionToOpen}`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [sectionToOpen]);

  return (
    <div className={`flex h-full flex-col overflow-hidden border-l border-gray-700/50 bg-bb-dark-elevated ${panelWidthClass}`}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/50 p-3">
        <div className="min-w-0 flex-1">
        {opportunityIds.length > 1 ? (
          <OpportunitySelect
            value={opportunityId}
            options={opportunityIds}
            getLabel={(id) => getOpportunityById(id)?.title ?? id}
            onChange={onSwitchOpportunity}
          />
        ) : (
          <h3 className="truncate text-sm font-semibold text-gray-100">{opp.title}</h3>
        )}
        </div>
        {onCollapseToggle && (
          <button
            type="button"
            onClick={onCollapseToggle}
            className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            title="Hide details"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${mobileTopPadding ? "pt-28" : ""}`}>
        <CollapsibleSection
          id="key-info"
          title="Key info"
          icon={<Calendar size={14} />}
          open={sectionToOpen === "key-info" ? true : undefined}
        >
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Due date</dt>
              <dd className="font-medium text-gray-200">{formatDate(opp.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Issuer</dt>
              <dd className="font-medium text-gray-200">{buyer?.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Category</dt>
              <dd className="text-gray-200">{opp.category}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Stakeholders</dt>
              <dd className="text-xs text-gray-400">
                Procurement, IT, Finance (from relationship map)
              </dd>
            </div>
          </dl>
        </CollapsibleSection>

        <CollapsibleSection
          id="docs"
          title="Docs"
          icon={<FileText size={14} />}
          defaultOpen={false}
          open={sectionToOpen === "docs" ? true : undefined}
        >
          <div className="space-y-4 text-sm">
            <DocumentUploader opportunityId={opp.id} onUploadComplete={() => {}} />

            {opp.sourceId ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Source</p>
                <a
                  href={opp.sourceId}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-bb-powder-blue hover:text-bb-powder-blue-light"
                >
                  {opp.sourceId}
                </a>
              </div>
            ) : (
              <p className="text-gray-500">No source link recorded yet.</p>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Summary</p>
              <p className="text-gray-300">
                {opp.summary || "Opportunity context will populate here as analysis runs."}
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="network"
          title="Network"
          icon={<Network size={14} />}
          defaultOpen={true}
          open={sectionToOpen === "network" ? true : undefined}
        >
          <NetworkSection
            relationshipSignals={relationshipSignals}
            buyerId={opp.issuingOrganisationId}
            opportunityId={opp.id}
            onStartSwot={onStartSwot}
          />
        </CollapsibleSection>

        <CollapsibleSection
          id="status"
          title="Status"
          icon={<Activity size={14} />}
          open={sectionToOpen === "status" ? true : undefined}
        >
          <div className="space-y-2">
            <Badge variant={opp.status === "pursuing" ? "high" : "medium"}>{opp.status}</Badge>
            {latestDecision?.decisionState && (
              <Badge
                variant={
                  latestDecision.decisionState === "Green"
                    ? "positive"
                    : latestDecision.decisionState === "Amber"
                      ? "warning"
                      : "negative"
                }
              >
                {latestDecision.decisionState}
              </Badge>
            )}
            <div className="text-xs text-gray-400">
              TF {opp.assessment.technicalFit}% · NS {opp.assessment.networkStrength}% ·{" "}
              {opp.assessment.recommendation.replace("-", " ")}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="decisions"
          title="Decisions"
          icon={<ListChecks size={14} />}
          defaultOpen={false}
          open={sectionToOpen === "decisions" ? true : undefined}
        >
          {latestDecision?.decisionState ? (
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    latestDecision.decisionState === "Green"
                      ? "positive"
                      : latestDecision.decisionState === "Amber"
                        ? "warning"
                        : "negative"
                  }
                >
                  {latestDecision.decisionState}
                </Badge>
                {latestDecision.recommendation && <span>{latestDecision.recommendation}</span>}
              </div>
              {latestDecision.decisionSummary && (
                <p className="text-xs text-gray-400">{latestDecision.decisionSummary}</p>
              )}
            </div>
          ) : (
            <ul className="space-y-1 text-sm text-gray-400">
              <li>• No bid/no-bid decision recorded yet</li>
              <li className="text-gray-500">Run analysis in chat to populate this section</li>
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          id="related-chats"
          title="Related chats"
          icon={<MessageSquare size={14} />}
          defaultOpen={related.length > 0}
          open={sectionToOpen === "related-chats" ? true : undefined}
        >
          {related.length === 0 ? (
            <p className="text-xs text-gray-500">No related chats yet.</p>
          ) : (
            <ul className="space-y-2">
              {related.map(({ chat, relation, reason }) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRelatedChat?.(chat.id)}
                    className="w-full rounded-lg border border-gray-600 bg-bb-dark p-2 text-left text-xs hover:bg-gray-700/50"
                  >
                    <span className="font-medium text-gray-200">{chat.title}</span>
                    <span
                      className={`ml-1 rounded px-1 ${
                        relation === "primary"
                          ? "bg-bb-powder-blue/30 text-bb-powder-blue"
                          : relation === "secondary"
                          ? "bg-amber-500/30 text-amber-300"
                          : "bg-gray-600 text-gray-400"
                      }`}
                    >
                      {relation}
                    </span>
                    <p className="mt-1 text-gray-500">{reason}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
