import type { BarangaySettingsValues } from "@/actions/settings";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/calculate-court-fee";
import { buildFindBusinessesTool } from "@/lib/ai-assistant/tools/find-businesses";
import { getUserLocationTool, type UserLocation } from "@/lib/ai-assistant/tools/get-user-location";
import { buildNavigateToPageTool } from "@/lib/ai-assistant/tools/navigate-to-page";
import { openBusinessDetailsTool } from "@/lib/ai-assistant/tools/open-business-details";
import { buildOpenFormDialogTool } from "@/lib/ai-assistant/tools/open-form-dialog";

// To add a tool: write a builder in its own file in this folder, like `buildNavigateToPageTool`,
// add it to `buildAssistantTools`, and describe when to use it in SYSTEM_PROMPT (../system-prompt.ts).
// navigateToPage, openFormDialog and openBusinessDetails don't act by themselves: each output is
// rendered as a button in the chat panel (components/ai-assistant/chat-panel.tsx) that the user
// clicks — navigateToPage's goes to a page, openFormDialog's goes to the form's page with
// `?dialog=<id>`, which opens it, and openBusinessDetails's open a business's details.
// getUserLocation is the one tool the browser runs (see its file).
export function buildAssistantTools(
  isAdmin: boolean,
  settings: BarangaySettingsValues,
  userLocation: UserLocation | null,
) {
  return {
    navigateToPage: buildNavigateToPageTool(isAdmin),
    openFormDialog: buildOpenFormDialogTool(isAdmin),
    calculateCourtFee: buildCalculateCourtFeeTool(settings),
    findBusinesses: buildFindBusinessesTool(userLocation),
    openBusinessDetails: openBusinessDetailsTool,
    getUserLocation: getUserLocationTool,
  };
}
