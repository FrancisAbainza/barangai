import type { BarangaySettingsValues } from "@/actions/settings";
import { buildFindBusinessesTool } from "@/lib/ai-assistant/tools/community-hub/find-businesses";
import { openBusinessDetailsTool } from "@/lib/ai-assistant/tools/community-hub/open-business-details";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import { buildCheckCourtAvailabilityTool } from "@/lib/ai-assistant/tools/court-reservation/check-court-availability";
import { buildGetMySubmissionsTool } from "@/lib/ai-assistant/tools/get-my-submissions";
import { getUserLocationTool, type UserLocation } from "@/lib/ai-assistant/tools/get-user-location";
import { buildNavigateToPageTool } from "@/lib/ai-assistant/tools/navigate-to-page";
import { findNewsTool } from "@/lib/ai-assistant/tools/news/find-news";
import { openNewsPostsTool } from "@/lib/ai-assistant/tools/news/open-news-posts";
import { buildOpenFormDialogTool } from "@/lib/ai-assistant/tools/open-form-dialog";
import { buildOpenSubmissionDetailsTool } from "@/lib/ai-assistant/tools/open-submission-details";
import { findTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/find-transparency-projects";
import { openTransparencyProjectsTool } from "@/lib/ai-assistant/tools/transparency/open-transparency-projects";

// What the tools know about the request. The route gets it from the session, the settings and the
// chat history, never from the model. A tool that needs any of it is a `buildXTool(context)`, and
// one that doesn't is exported as the tool itself.
export type AssistantToolContext = {
  userId: string;
  isAdmin: boolean;
  settings: BarangaySettingsValues;
  userLocation: UserLocation | null;
};

// There are three kinds of tools:
// - Lookup tools (find*, getMySubmissions, calculateCourtFee, checkCourtAvailability) return data the
//   model answers from, with an `instruction` for the reply and `buttonShown: false`, without which
//   the reply sometimes pointed to a button that wasn't there.
// - Button tools (navigateToPage, openFormDialog, open*) don't act by themselves. They're built with
//   `buttonTool` (./buttons.ts) and return the buttons the chat panel shows under the reply.
// - getUserLocation, which the browser answers (see its file).
// A tool about one portal page goes in that page's folder, named like the page's route and
// `src/components/<page>/`, usually a lookup tool and the button tool the model calls after it
// (findNews, then openNewsPosts). Tools that span pages stay at the top.
// To add a tool, add it here and describe when to use it in SYSTEM_PROMPT (../system-prompt.ts).
export function buildAssistantTools(context: AssistantToolContext) {
  return {
    // Any page
    navigateToPage: buildNavigateToPageTool(context),
    openFormDialog: buildOpenFormDialogTool(context),
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
