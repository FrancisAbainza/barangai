import z from "zod";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
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
  "audit-logs":
    "See the changes every admin made in the portal: who did what and when, with each field's value before and after. Its filters narrow them down by category, action, or date.",
} as const satisfies Partial<Record<PortalNavigationTargetId, string>>;

type AdminPageId = keyof typeof ADMIN_PAGES;

const pageIds = Object.keys(ADMIN_PAGES) as [AdminPageId, ...AdminPageId[]];

// Audit Logs is super admins only (src/proxy.ts). Left out of the other admins' list, even when the
// description named it as one they can't open, "go to the audit logs page" got a "Go to About Us"
// button. So it's in their list too, and gets no button.
const AUDIT_LOGS_FOR_OTHER_ADMINS =
  "Only super admins can open it, so calling it shows no button. The user's own changes are on the Audit Logs tab on their profile.";

export function buildNavigateToPageTool({ isSuperAdmin }: AssistantToolContext) {
  const describePage = (id: AdminPageId) =>
    id === "audit-logs" && !isSuperAdmin ? AUDIT_LOGS_FOR_OTHER_ADMINS : ADMIN_PAGES[id];

  return buttonTool({
    description:
      "Navigate the user to a specific page of the portal so they can perform an action there. Pages:\n" +
      pageIds.map((id) => `- ${id}: ${PORTAL_NAVIGATION_TARGETS[id].label} — ${describePage(id)}`).join("\n") +
      "\nNotifications is only for residents, so admin accounts don't have it and it isn't here. If the user asks " +
      "for it, don't call this tool: tell them that in a sentence.",
    inputSchema: z.object({
      page: z.enum(pageIds).describe("The portal page to navigate to."),
      reason: z
        .string()
        .describe('A short, user-facing reason for the navigation, e.g. "to review the pending complaints".'),
    }),
    execute: async ({ page }) => {
      if (page === "audit-logs" && !isSuperAdmin) {
        return {
          buttons: [],
          instruction:
            "Only super admins can open the Audit Logs page, so no button was shown: don't mention one or call another tool for it. Tell the user that, and that their own changes are on the Audit Logs tab on their profile.",
        };
      }
      const { label, href } = PORTAL_NAVIGATION_TARGETS[page];
      return {
        buttons: [{ key: `page-${page}`, kind: "page", page, label: `Go to ${label}`, href }],
        // With only the button, the reply still said "to view your complaints".
        instruction: `A "Go to ${label}" button is shown below your reply. Point the user to it; don't write a link. The page is for this, so describe it that way: ${ADMIN_PAGES[page]} ${HOW_TO_STEPS_NOTE}`,
      };
    },
  });
}
