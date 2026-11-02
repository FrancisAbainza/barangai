import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { buildFindAuditLogsTool } from "@/lib/ai-assistant/tools/admin/find-audit-logs";
import { buildGetAnalyticsTool } from "@/lib/ai-assistant/tools/admin/get-analytics";
import { buildGetHandledSubmissionsTool } from "@/lib/ai-assistant/tools/admin/get-handled-submissions";
import { getSubmissionOverviewTool } from "@/lib/ai-assistant/tools/admin/get-submission-overview";
import { buildFindBusinessesTool } from "@/lib/ai-assistant/tools/community-hub/find-businesses";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import { buildCheckCourtAvailabilityTool } from "@/lib/ai-assistant/tools/court-reservation/check-court-availability";
import { buildGetFormLinkTool } from "@/lib/ai-assistant/tools/get-form-link";
import { getUserLocationTool } from "@/lib/ai-assistant/tools/get-user-location";
import { findNewsTool } from "@/lib/ai-assistant/tools/news/find-news";
import { findTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/find-transparency-projects";

// The admins' assistant's tools. Its system prompt is buildSystemPrompt's admin version
// (../../system-prompt.ts).
export function buildAdminTools(context: AssistantToolContext) {
  return {
    // The admins' forms: posts, projects, officials, and the court and business forms both roles have
    getFormLink: buildGetFormLinkTool("admin"),
    // Court Reservation
    calculateCourtFee: buildCalculateCourtFeeTool(context),
    checkCourtAvailability: buildCheckCourtAvailabilityTool(),
    // Community Hub
    findBusinesses: buildFindBusinessesTool(context),
    // The residents' requests and complaints the user is handling, and their own court reservations
    // and businesses
    getHandledSubmissions: buildGetHandledSubmissionsTool(context),
    // How many of the residents' submissions are in each status, and what needs attention
    getSubmissionOverview: getSubmissionOverviewTool,
    // Analytics: a month's counts and breakdowns, and the 12 months up to it
    getAnalytics: buildGetAnalyticsTool(),
    // News & Announcements
    findNews: findNewsTool,
    // Transparency
    findTransparencyProjects: findTransparencyProjectsTool,
    // Audit Logs: every admin's changes for super admins, and only their own for the others
    findAuditLogs: buildFindAuditLogsTool(context),
    // For findBusinesses
    getUserLocation: getUserLocationTool,
  };
}
