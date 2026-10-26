import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { buildGetHandledSubmissionsTool } from "@/lib/ai-assistant/tools/admin/get-handled-submissions";
import { getSubmissionOverviewTool } from "@/lib/ai-assistant/tools/admin/get-submission-overview";
import { navigateToPageTool } from "@/lib/ai-assistant/tools/admin/navigate-to-page";
import { openFormDialogTool } from "@/lib/ai-assistant/tools/admin/open-form-dialog";
import { openSubmissionDetailsTool } from "@/lib/ai-assistant/tools/admin/open-submission-details";
import { buildFindBusinessesTool } from "@/lib/ai-assistant/tools/community-hub/find-businesses";
import { openBusinessDetailsTool } from "@/lib/ai-assistant/tools/community-hub/open-business-details";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import { buildCheckCourtAvailabilityTool } from "@/lib/ai-assistant/tools/court-reservation/check-court-availability";
import { getUserLocationTool } from "@/lib/ai-assistant/tools/get-user-location";
import { findNewsTool } from "@/lib/ai-assistant/tools/news/find-news";
import { openNewsPostsTool } from "@/lib/ai-assistant/tools/news/open-news-posts";
import { findTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/find-transparency-projects";
import { openTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/open-transparency-projects";

// The admins' assistant's tools. Its system prompt is ADMIN_PROMPT (../../system-prompt.ts).
export function buildAdminTools(context: AssistantToolContext) {
  return {
    // Any page
    navigateToPage: navigateToPageTool,
    openFormDialog: openFormDialogTool,
    // Court Reservation
    calculateCourtFee: buildCalculateCourtFeeTool(context),
    checkCourtAvailability: buildCheckCourtAvailabilityTool(),
    // Community Hub
    findBusinesses: buildFindBusinessesTool(context),
    openBusinessDetails: openBusinessDetailsTool,
    // The residents' requests and complaints the user is handling, and their own court reservations
    // and businesses
    getHandledSubmissions: buildGetHandledSubmissionsTool(context),
    // How many of the residents' submissions are in each status, and what needs attention
    getSubmissionOverview: getSubmissionOverviewTool,
    openSubmissionDetails: openSubmissionDetailsTool,
    // News & Announcements
    findNews: findNewsTool,
    openNewsPosts: openNewsPostsTool,
    // Transparency
    findTransparencyProjects: findTransparencyProjectsTool,
    openTransparencyProjects: openTransparencyProjectsTool,
    // For findBusinesses
    getUserLocation: getUserLocationTool,
  };
}
