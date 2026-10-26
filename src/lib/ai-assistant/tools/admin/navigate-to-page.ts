import z from "zod";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import { buttonTool, HOW_TO_STEPS_NOTE } from "@/lib/ai-assistant/tools/buttons";

// The pages admins can open, with what each is for in the admin view. With the residents'
// descriptions ("File a complaint..."), an admin asking to "view my complaints" was told to tap the
// button "to view your complaints". Notifications is residents only, so the description names it.
const ADMIN_PAGES = {
  "document-request":
    "Review and process residents' document requests. Its filters can show only the ones the user is handling.",
  complaint: "Review and resolve residents' complaints. Its filters can show only the ones the user is handling.",
  "court-reservation":
    "Review residents' court reservations, or reserve the court. Its filters can show only the ones the user is handling.",
  "community-hub":
    "Verify the businesses residents submit to the directory, or submit one. Its filters can show only the ones the user is handling, or their own.",
  news: "View and post barangay news and announcements.",
  transparency: "View and add the barangay's transparency projects.",
  "about-us": "Learn about the barangay's officials, goal, mission, and vision.",
  "user-management": "Manage resident and admin accounts.",
  "barangay-settings":
    "Manage document request pricing (GCash number and clearance fees), court reservation fees, the barangay goal, mission and vision, and the barangay and SK officials.",
} as const satisfies Partial<Record<PortalNavigationTargetId, string>>;

type AdminPageId = keyof typeof ADMIN_PAGES;

const pageIds = Object.keys(ADMIN_PAGES) as [AdminPageId, ...AdminPageId[]];

export const navigateToPageTool = buttonTool({
  description:
    "Navigate the user to a specific page of the portal so they can perform an action there. Pages:\n" +
    pageIds.map((id) => `- ${id}: ${PORTAL_NAVIGATION_TARGETS[id].label} — ${ADMIN_PAGES[id]}`).join("\n") +
    "\nNotifications is only for residents, so admin accounts don't have it and it isn't here. If the user asks " +
    "for it, don't call this tool: tell them that in a sentence.",
  inputSchema: z.object({
    page: z.enum(pageIds).describe("The portal page to navigate to."),
    reason: z
      .string()
      .describe('A short, user-facing reason for the navigation, e.g. "to review the pending complaints".'),
  }),
  execute: async ({ page }) => {
    const { label, href } = PORTAL_NAVIGATION_TARGETS[page];
    return {
      buttons: [{ key: `page-${page}`, kind: "page", page, label: `Go to ${label}`, href }],
      // With only the button, the reply still said "to view your complaints".
      instruction: `A "Go to ${label}" button is shown below your reply. Point the user to it; don't write a link. The page is for this, so describe it that way: ${ADMIN_PAGES[page]} ${HOW_TO_STEPS_NOTE}`,
    };
  },
});
