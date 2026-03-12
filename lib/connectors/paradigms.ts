/**
 * Four data paradigms for BidBlender connections.
 * Each category explains the "why" — what data we need and how it powers intelligence.
 */

export type ConnectorParadigm = "history" | "capability" | "reach" | "opportunity";

export interface ParadigmDefinition {
  id: ConnectorParadigm;
  title: string;
  why: string;
  note?: string;
}

export const CONNECTOR_PARADIGMS: ParadigmDefinition[] = [
  {
    id: "history",
    title: "History",
    why: "Past deals, contacts, and win/loss data from your CRM. Powers technical fit scoring, past-bid comparison, and buyer relationship context.",
    note: "e.g. HubSpot, Salesforce — your deal history and contact records.",
  },
  {
    id: "capability",
    title: "Capability",
    why: "Skills, certifications, and training from your HCM or LMS. Powers capability matching and resource allocation for bid teams.",
    note: "e.g. Workday, BambooHR, Cornerstone — who can do what.",
  },
  {
    id: "reach",
    title: "Reach",
    why: "Relationship intelligence — who knows whom, decision-maker proximity, network strength. Powers the Network section and SWOT analysis.",
    note: "e.g. LinkedIn, Apollo, ZoomInfo — your relationship graph.",
  },
  {
    id: "opportunity",
    title: "Opportunity",
    why: "Active tenders and RFPs from boards and panels. Powers opportunity discovery, due-date tracking, and the opportunity explorer.",
    note: "e.g. TenderLink, AusTender — what’s in market.",
  },
];
