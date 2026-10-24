import z from "zod";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import { BUSINESS_CATEGORIES } from "@/schemas/business-schema";
import { CLEARANCE_DELIVERY_METHODS, CLEARANCE_PURPOSES } from "@/schemas/clearance-document-request-schema";
import { INDIGENCY_DELIVERY_METHODS, INDIGENCY_REQUEST_PURPOSES } from "@/schemas/indigency-document-request-schema";
import {
  MEDICAL_ASSISTANCE_DELIVERY_METHODS,
  MEDICAL_ASSISTANCE_REQUEST_PURPOSES,
} from "@/schemas/medical-assistance-document-request-schema";
import { newsFormSchema } from "@/schemas/news-schema";
import {
  NO_OBJECTION_DELIVERY_METHODS,
  NO_OBJECTION_REQUEST_PURPOSES,
} from "@/schemas/no-objection-document-request-schema";
import { RESIDENCY_DELIVERY_METHODS, RESIDENCY_REQUEST_PURPOSES } from "@/schemas/residency-document-request-schema";
import {
  SOLO_PARENT_DELIVERY_METHODS,
  SOLO_PARENT_REQUEST_PURPOSES,
} from "@/schemas/solo-parent-document-request-schema";
import { TRANSPARENCY_CATEGORIES } from "@/schemas/transparency-schema";

// Form dialogs the AI assistant can open. Shared between the openFormDialog tool
// (tools/open-form-dialog.ts, for its input schema/description), the button the chat
// panel renders for its result (src/components/ai-assistant/chat-panel.tsx), and the
// components hosting each dialog, whose open state lives in the URL (`?dialog=<id>`,
// via useDialogParam in src/hooks/use-dialog-param.ts).
//
// Only "create" forms belong here: dialogs that act on an existing record (edit,
// delete, reject...) need a specific row and can't be opened from the chat.
//
// `page` is the portal page the dialog lives on. `audience` is who that page renders
// the dialog for — e.g. document request forms only exist in the resident view.
// `prefill` lists the form fields the assistant can fill in from what the user said
// (`?prefill=`, read with useDialogPrefill). Free text is a plain string so a value too
// short for the form still gets filled in and the form's own validation flags it.
export const PORTAL_DIALOG_TARGETS = {
  "report-complaint": {
    label: "File a Complaint",
    page: "complaint",
    description: "Report a non-emergency community concern or incident to the barangay.",
    audience: "resident",
    prefill: z.object({
      subject: z.string(),
      description: z.string(),
    }),
  },
  "court-reservation": {
    label: "Reserve the Court",
    page: "court-reservation",
    description: "Book the barangay court for a date and time.",
    audience: "all",
    prefill: z.object({
      purpose: z.string(),
      startTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .describe('24-hour "HH:MM"'),
      durationHours: z.coerce.number().int().min(1).describe("whole hours"),
    }),
  },
  "clearance-request": {
    label: "Request Barangay Clearance",
    page: "document-request",
    description: "General clearance for employment, business, or legal transactions.",
    audience: "resident",
    prefill: z.object({
      purpose: z.enum(CLEARANCE_PURPOSES),
      receiveVia: z.enum(CLEARANCE_DELIVERY_METHODS),
    }),
  },
  "residency-request": {
    label: "Request Certificate of Residency",
    page: "document-request",
    description: "Confirms that the resident currently lives within the barangay.",
    audience: "resident",
    prefill: z.object({
      purpose: z.enum(RESIDENCY_REQUEST_PURPOSES),
      otherPurpose: z.string().describe('only when purpose is "Other"'),
      receiveVia: z.enum(RESIDENCY_DELIVERY_METHODS),
    }),
  },
  "no-objection-request": {
    label: "Request Certificate of No Objection",
    page: "document-request",
    description: "States that the barangay has no objection to a specific request or activity.",
    audience: "resident",
    prefill: z.object({
      purpose: z.enum(NO_OBJECTION_REQUEST_PURPOSES),
      otherPurpose: z.string().describe('only when purpose is "Other"'),
      receiveVia: z.enum(NO_OBJECTION_DELIVERY_METHODS),
    }),
  },
  "indigency-request": {
    label: "Request Certificate of Indigency",
    page: "document-request",
    description: "Proof of low-income status for financial, medical, or scholarship assistance.",
    audience: "resident",
    prefill: z.object({
      purpose: z.enum(INDIGENCY_REQUEST_PURPOSES),
      otherPurpose: z.string().describe('only when purpose is "Other"'),
      situationDescription: z.string(),
      receiveVia: z.enum(INDIGENCY_DELIVERY_METHODS),
    }),
  },
  "solo-parent-request": {
    label: "Request Solo Parent Certification",
    page: "document-request",
    description: "Certifies solo parent status for benefits under the Solo Parents' Welfare Act.",
    audience: "resident",
    prefill: z.object({
      purpose: z.enum(SOLO_PARENT_REQUEST_PURPOSES),
      otherPurpose: z.string().describe('only when purpose is "Other"'),
      situationDescription: z.string(),
      receiveVia: z.enum(SOLO_PARENT_DELIVERY_METHODS),
    }),
  },
  "medical-assistance-request": {
    label: "Request Medical / Lab Assistance",
    page: "document-request",
    description: "Request medical or laboratory financial assistance.",
    audience: "resident",
    prefill: z.object({
      purpose: z.enum(MEDICAL_ASSISTANCE_REQUEST_PURPOSES),
      otherPurpose: z.string().describe('only when purpose is "Other"'),
      situationDescription: z.string(),
      receiveVia: z.enum(MEDICAL_ASSISTANCE_DELIVERY_METHODS),
    }),
  },
  "submit-business": {
    label: "Submit a Business",
    page: "community-hub",
    description: "Submit a local business to the community hub directory for approval.",
    audience: "all",
    prefill: z.object({
      name: z.string(),
      description: z.string(),
      category: z.enum(BUSINESS_CATEGORIES),
      contactNumber: z.string(),
      socialMediaLink: z.string(),
    }),
  },
  "create-news": {
    label: "Create a News Post",
    page: "news",
    description: "Publish a news post or announcement.",
    audience: "admin",
    prefill: z.object({
      title: z.string(),
      category: newsFormSchema.shape.category,
      content: z.string(),
    }),
  },
  "create-transparency-project": {
    label: "Add a Transparency Project",
    page: "transparency",
    description: "Add a barangay project to the transparency board.",
    audience: "admin",
    prefill: z.object({
      title: z.string(),
      category: z.enum(TRANSPARENCY_CATEGORIES),
      description: z.string(),
      budget: z.coerce.number().nonnegative().describe("in pesos"),
    }),
  },
  "add-barangay-official": {
    label: "Add a Barangay Official",
    page: "barangay-settings",
    description: "Add an official to the Barangay Officials list.",
    audience: "admin",
    prefill: z.object({
      name: z.string(),
      position: z.string(),
    }),
  },
  "add-sk-official": {
    label: "Add an SK Official",
    page: "barangay-settings",
    description: "Add an official to the Sangguniang Kabataan list.",
    audience: "admin",
    prefill: z.object({
      name: z.string(),
      position: z.string(),
    }),
  },
} as const satisfies Record<
  string,
  {
    label: string;
    page: PortalNavigationTargetId;
    description: string;
    audience: "resident" | "admin" | "all";
    prefill: z.ZodObject;
  }
>;

export type PortalDialogTargetId = keyof typeof PORTAL_DIALOG_TARGETS;

export const DIALOG_SEARCH_PARAM = "dialog";
export const PREFILL_SEARCH_PARAM = "prefill";

// The dialog's page with `?dialog=<id>`, which makes the page open that dialog on arrival,
// plus `&prefill=<json>` when the assistant has values to fill in.
export function getPortalDialogHref(id: PortalDialogTargetId, prefill?: Record<string, unknown>): string {
  const { href } = PORTAL_NAVIGATION_TARGETS[PORTAL_DIALOG_TARGETS[id].page];
  const params = new URLSearchParams({ [DIALOG_SEARCH_PARAM]: id });
  if (prefill && Object.keys(prefill).length > 0) {
    params.set(PREFILL_SEARCH_PARAM, JSON.stringify(prefill));
  }
  return `${href}?${params}`;
}

// The `?prefill=` JSON as form values, keeping only the fields the dialog's `prefill`
// schema accepts. Anything else (a made-up category, a broken link) is dropped.
export function parseDialogPrefill(id: PortalDialogTargetId, json: string | null): Record<string, unknown> {
  let values: Record<string, unknown> = {};
  try {
    values = JSON.parse(json ?? "{}") ?? {};
  } catch {
    return {};
  }

  const fields: Record<string, z.ZodType> = PORTAL_DIALOG_TARGETS[id].prefill.shape;
  const prefill: Record<string, unknown> = {};
  for (const [field, schema] of Object.entries(fields)) {
    const result = schema.safeParse(values[field]);
    if (result.success) prefill[field] = result.data;
  }
  return prefill;
}

export function isPortalDialogAvailable(id: PortalDialogTargetId, isAdmin: boolean): boolean {
  const { audience } = PORTAL_DIALOG_TARGETS[id];
  return audience === "all" || audience === (isAdmin ? "admin" : "resident");
}
