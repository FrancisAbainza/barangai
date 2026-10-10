import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";

// Form dialogs the AI assistant can open. Shared between the openFormDialog tool
// (src/lib/ai-assistant.ts, for its input schema/description), the button the chat
// panel renders for its result (src/components/ai-assistant/chat-panel.tsx), and the
// components hosting each dialog, whose open state lives in the URL (`?dialog=<id>`,
// via useDialogParam in src/hooks/use-dialog-param.ts).
//
// Only "create" forms belong here: dialogs that act on an existing record (edit,
// delete, reject...) need a specific row and can't be opened from the chat.
//
// `page` is the portal page the dialog lives on. `audience` is who that page renders
// the dialog for — e.g. document request forms only exist in the resident view.
export const PORTAL_DIALOG_TARGETS = {
  "report-complaint": {
    label: "File a Complaint",
    page: "complaint",
    description: "Report a non-emergency community concern or incident to the barangay.",
    audience: "resident",
  },
  "court-reservation": {
    label: "Reserve the Court",
    page: "court-reservation",
    description: "Book the barangay court for a date and time.",
    audience: "all",
  },
  "clearance-request": {
    label: "Request Barangay Clearance",
    page: "document-request",
    description: "General clearance for employment, business, or legal transactions.",
    audience: "resident",
  },
  "residency-request": {
    label: "Request Certificate of Residency",
    page: "document-request",
    description: "Confirms that the resident currently lives within the barangay.",
    audience: "resident",
  },
  "no-objection-request": {
    label: "Request Certificate of No Objection",
    page: "document-request",
    description: "States that the barangay has no objection to a specific request or activity.",
    audience: "resident",
  },
  "indigency-request": {
    label: "Request Certificate of Indigency",
    page: "document-request",
    description: "Proof of low-income status for financial, medical, or scholarship assistance.",
    audience: "resident",
  },
  "solo-parent-request": {
    label: "Request Solo Parent Certification",
    page: "document-request",
    description: "Certifies solo parent status for benefits under the Solo Parents' Welfare Act.",
    audience: "resident",
  },
  "medical-assistance-request": {
    label: "Request Medical / Lab Assistance",
    page: "document-request",
    description: "Request medical or laboratory financial assistance.",
    audience: "resident",
  },
  "submit-business": {
    label: "Submit a Business",
    page: "community-hub",
    description: "Submit a local business to the community hub directory for approval.",
    audience: "all",
  },
  "create-news": {
    label: "Create a News Post",
    page: "news",
    description: "Publish a news post or announcement.",
    audience: "admin",
  },
  "create-transparency-project": {
    label: "Add a Transparency Project",
    page: "transparency",
    description: "Add a barangay project to the transparency board.",
    audience: "admin",
  },
  "add-barangay-official": {
    label: "Add a Barangay Official",
    page: "barangay-settings",
    description: "Add an official to the Barangay Officials list.",
    audience: "admin",
  },
  "add-sk-official": {
    label: "Add an SK Official",
    page: "barangay-settings",
    description: "Add an official to the Sangguniang Kabataan list.",
    audience: "admin",
  },
} as const satisfies Record<
  string,
  {
    label: string;
    page: PortalNavigationTargetId;
    description: string;
    audience: "resident" | "admin" | "all";
  }
>;

export type PortalDialogTargetId = keyof typeof PORTAL_DIALOG_TARGETS;

export const DIALOG_SEARCH_PARAM = "dialog";

// The dialog's page with `?dialog=<id>`, which makes the page open that dialog on arrival.
export function getPortalDialogHref(id: PortalDialogTargetId): string {
  const { href } = PORTAL_NAVIGATION_TARGETS[PORTAL_DIALOG_TARGETS[id].page];
  return `${href}?${DIALOG_SEARCH_PARAM}=${id}`;
}

export function isPortalDialogAvailable(id: PortalDialogTargetId, isAdmin: boolean): boolean {
  const { audience } = PORTAL_DIALOG_TARGETS[id];
  return audience === "all" || audience === (isAdmin ? "admin" : "resident");
}
