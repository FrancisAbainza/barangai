import { tool } from "ai";
import z from "zod";
import {
  isPortalNavigationTargetAvailable,
  PORTAL_NAVIGATION_TARGETS,
  type PortalNavigationTargetId,
} from "@/lib/ai-assistant/portal-navigation";
import { AUDIENCE_NOTES } from "@/lib/ai-assistant/tools/audience";

export function buildNavigateToPageTool(isAdmin: boolean) {
  const pageIds = Object.keys(PORTAL_NAVIGATION_TARGETS) as [PortalNavigationTargetId, ...PortalNavigationTargetId[]];

  return tool({
    description:
      "Navigate the user to a specific page of the portal so they can perform an action there. Pages:\n" +
      pageIds
        .map((id) => {
          const { label, description, audience } = PORTAL_NAVIGATION_TARGETS[id];
          return `- ${id}: ${label}${AUDIENCE_NOTES[audience]} — ${description}`;
        })
        .join("\n"),
    inputSchema: z.object({
      page: z.enum(pageIds).describe("The portal page to navigate to."),
      reason: z
        .string()
        .describe('A short, user-facing reason for the navigation, e.g. "to request a barangay clearance".'),
    }),
    execute: async ({ page }) => {
      if (!isPortalNavigationTargetAvailable(page, isAdmin)) {
        return {
          page,
          buttonShown: false,
          instruction: isAdmin
            ? "This page is only for residents, so admin accounts don't have it and no button was shown. Tell the user that in a sentence. Don't call another tool."
            : "This page is only for barangay admins, so no button was shown. Tell the user in a sentence that only barangay admins can use it. Don't call another tool.",
        };
      }
      return { page, href: PORTAL_NAVIGATION_TARGETS[page].href, buttonShown: true };
    },
  });
}
