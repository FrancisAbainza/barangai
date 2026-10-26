import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { buildFindBusinessesTool } from "@/lib/ai-assistant/tools/community-hub/find-businesses";
import { openBusinessDetailsTool } from "@/lib/ai-assistant/tools/community-hub/open-business-details";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import { buildCheckCourtAvailabilityTool } from "@/lib/ai-assistant/tools/court-reservation/check-court-availability";
import { getUserLocationTool } from "@/lib/ai-assistant/tools/get-user-location";
import { findNewsTool } from "@/lib/ai-assistant/tools/news/find-news";
import { openNewsPostsTool } from "@/lib/ai-assistant/tools/news/open-news-posts";
import { buildGetMySubmissionsTool } from "@/lib/ai-assistant/tools/resident/get-my-submissions";
import { navigateToPageTool } from "@/lib/ai-assistant/tools/resident/navigate-to-page";
import { openFormDialogTool } from "@/lib/ai-assistant/tools/resident/open-form-dialog";
import { buildOpenSubmissionDetailsTool } from "@/lib/ai-assistant/tools/resident/open-submission-details";
import { findTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/find-transparency-projects";
import { openTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/open-transparency-projects";

// The residents' assistant's tools. Its system prompt is RESIDENT_PROMPT (../../system-prompt.ts).
export function buildResidentTools(context: AssistantToolContext) {
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
    // The user's own submissions, on the four pages residents submit from
    getMySubmissions: buildGetMySubmissionsTool(context),
    openSubmissionDetails: buildOpenSubmissionDetailsTool(context),
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
