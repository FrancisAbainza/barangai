import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { buildFindBusinessesTool } from "@/lib/ai-assistant/tools/community-hub/find-businesses";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import { buildCheckCourtAvailabilityTool } from "@/lib/ai-assistant/tools/court-reservation/check-court-availability";
import { buildGetFormLinkTool } from "@/lib/ai-assistant/tools/get-form-link";
import { getUserLocationTool } from "@/lib/ai-assistant/tools/get-user-location";
import { findNewsTool } from "@/lib/ai-assistant/tools/news/find-news";
import { buildGetMySubmissionsTool } from "@/lib/ai-assistant/tools/resident/get-my-submissions";
import { findTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/find-transparency-projects";

// The residents' assistant's tools. Its system prompt is buildSystemPrompt's resident version
// (../../system-prompt.ts).
export function buildResidentTools(context: AssistantToolContext) {
  return {
    // The residents' forms
    getFormLink: buildGetFormLinkTool("resident"),
    // Court Reservation
    calculateCourtFee: buildCalculateCourtFeeTool(context),
    checkCourtAvailability: buildCheckCourtAvailabilityTool(),
    // Community Hub
    findBusinesses: buildFindBusinessesTool(context),
    // The user's own submissions, on the four pages residents submit from
    getMySubmissions: buildGetMySubmissionsTool(context),
    // News & Announcements
    findNews: findNewsTool,
    // Transparency
    findTransparencyProjects: findTransparencyProjectsTool,
    // For findBusinesses
    getUserLocation: getUserLocationTool,
  };
}
