export const ONBOARDING_PROGRESS_STORAGE_KEY = "bidblender-onboarding-progress";

export type OnboardingStepId = "crm" | "tender_boards" | "reach" | "capability";

export interface OnboardingChoice {
  id: string;
  label: string;
  status: "live" | "interest";
  href?: string;
  message: string;
}

export interface OnboardingStepDefinition {
  id: OnboardingStepId;
  title: string;
  intro: string;
  livePathLabel: string;
  choices: OnboardingChoice[];
}

export interface OnboardingProgress {
  selections: Partial<Record<OnboardingStepId, string>>;
}

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: "crm",
    title: "CRM history",
    intro:
      "Start with CRM history so BidBlender can ground qualification in recent sales memory. We only want a selective subset, not a CRM clone.",
    livePathLabel: "HubSpot is the live path today.",
    choices: [
      {
        id: "hubspot",
        label: "HubSpot",
        status: "live",
        href: "/console/connectors?action=connect-hubspot",
        message:
          "HubSpot is the live CRM path today. It will open the auth flow and then sync only essential recent deal, company, and contact context.",
      },
      {
        id: "salesforce",
        label: "Salesforce",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this CRM option next quarter.",
      },
      {
        id: "dynamics-crm",
        label: "Dynamics CRM",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this CRM option next quarter.",
      },
      {
        id: "zoho",
        label: "Zoho",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this CRM option next quarter.",
      },
    ],
  },
  {
    id: "tender_boards",
    title: "Tender board",
    intro:
      "Next choose the market source. We can offer a few choices, but only one is wired through as a real feed right now.",
    livePathLabel: "AusTender is the live path today.",
    choices: [
      {
        id: "austender",
        label: "AusTender",
        status: "live",
        href: "/console/connectors?action=sync-austender",
        message:
          "AusTender is the live opportunity source today. It will import a limited set of notices from the official RSS feed.",
      },
      {
        id: "tenderlink",
        label: "TenderLink",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this tender board option next quarter.",
      },
      {
        id: "nsw-etendering",
        label: "NSW eTendering",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this tender board option next quarter.",
      },
      {
        id: "vendorpanel",
        label: "VendorPanel",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this tender board option next quarter.",
      },
    ],
  },
  {
    id: "reach",
    title: "Reach source",
    intro:
      "Reach should come from a real user identity first so buyer access is not inferred from thin air.",
    livePathLabel: "LinkedIn is the live path today.",
    choices: [
      {
        id: "linkedin",
        label: "LinkedIn",
        status: "live",
        href: "/console/connectors?action=connect-linkedin",
        message:
          "LinkedIn is the live reach source today. It will connect the user profile and relationship layer first.",
      },
      {
        id: "github",
        label: "GitHub",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this reach option next quarter.",
      },
      {
        id: "apollo",
        label: "Apollo",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this reach option next quarter.",
      },
      {
        id: "sales-nav",
        label: "Sales Navigator",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this reach option next quarter.",
      },
    ],
  },
  {
    id: "capability",
    title: "Capability source",
    intro:
      "Capability is the internal evidence layer. The live path is still the organisation profile rather than another external system.",
    livePathLabel: "Organisation profile is the live path today.",
    choices: [
      {
        id: "organisation-profile",
        label: "Organisation profile",
        status: "live",
        href: "/console/organisation",
        message:
          "The organisation profile is the live capability path today. That is where BidBlender should curate capability evidence for matching and qualification.",
      },
      {
        id: "workday",
        label: "Workday",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this capability option next quarter.",
      },
      {
        id: "bamboohr",
        label: "BambooHR",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this capability option next quarter.",
      },
      {
        id: "cornerstone",
        label: "Cornerstone",
        status: "interest",
        message:
          "We've taken your selection as an expression of interest. We are targeting launching this capability option next quarter.",
      },
    ],
  },
];

export function loadOnboardingProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return { selections: {} };
  }

  try {
    const raw = localStorage.getItem(ONBOARDING_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return { selections: {} };
    }

    const parsed = JSON.parse(raw) as OnboardingProgress;
    return {
      selections:
        parsed && parsed.selections && typeof parsed.selections === "object"
          ? parsed.selections
          : {},
    };
  } catch {
    return { selections: {} };
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ONBOARDING_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
