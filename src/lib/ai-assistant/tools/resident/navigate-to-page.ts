import z from "zod";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import { buttonTool, HOW_TO_STEPS_NOTE } from "@/lib/ai-assistant/tools/buttons";

// The pages residents can open, with what each is for. User Management and Barangay Settings are
// left out, so the description names them: left out unnamed, a request for an admin-only target
// got the closest one that was listed.
const RESIDENT_PAGES = {
  "document-request": "Request barangay documents such as clearances, certificates, or permits.",
  complaint: "File a complaint or report an issue to the barangay.",
  "court-reservation": "Reserve the barangay court for an event or activity.",
  "community-hub": "Browse community marketplace listings and services offered by residents.",
  news: "View barangay news and announcements.",
  transparency: "View barangay financial transparency reports.",
  "about-us": "Learn about the barangay's officials, goal, mission, and vision.",
  notifications:
    "View updates on the status of your document requests, community hub businesses, court reservations, and complaints.",
} as const satisfies Partial<Record<PortalNavigationTargetId, string>>;

type ResidentPageId = keyof typeof RESIDENT_PAGES;

const pageIds = Object.keys(RESIDENT_PAGES) as [ResidentPageId, ...ResidentPageId[]];

export const navigateToPageTool = buttonTool({
  description:
    "Navigate the user to a specific page of the portal so they can perform an action there. Pages:\n" +
    pageIds.map((id) => `- ${id}: ${PORTAL_NAVIGATION_TARGETS[id].label} — ${RESIDENT_PAGES[id]}`).join("\n") +
    "\nUser Management and Barangay Settings are only for barangay admins, so they aren't here. If the user asks " +
    "for one, don't call this tool: tell them in a sentence that only barangay admins can use it.",
  inputSchema: z.object({
    page: z.enum(pageIds).describe("The portal page to navigate to."),
    reason: z
      .string()
      .describe('A short, user-facing reason for the navigation, e.g. "to request a barangay clearance".'),
  }),
  execute: async ({ page }) => {
    const { label, href } = PORTAL_NAVIGATION_TARGETS[page];
    return {
      buttons: [{ key: `page-${page}`, kind: "page", page, label: `Go to ${label}`, href }],
      instruction: `A "Go to ${label}" button is shown below your reply. Point the user to it; don't write a link. ${HOW_TO_STEPS_NOTE}`,
    };
  },
});
