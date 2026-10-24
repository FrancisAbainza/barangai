import type { BarangaySettingsValues } from "@/actions/settings";
import { buildCalculateCourtFeeTool } from "@/lib/ai-assistant/tools/calculate-court-fee";
import { buildNavigateToPageTool } from "@/lib/ai-assistant/tools/navigate-to-page";
import { buildOpenFormDialogTool } from "@/lib/ai-assistant/tools/open-form-dialog";

// To add a tool: write a builder in its own file in this folder, like `buildNavigateToPageTool`,
// add it to `buildAssistantTools`, and describe when to use it in SYSTEM_PROMPT (../system-prompt.ts).
// navigateToPage and openFormDialog don't act by themselves: each output is rendered as a button in
// the chat panel (components/ai-assistant/chat-panel.tsx) that the user clicks — navigateToPage's goes
// to a page, openFormDialog's goes to the form's page with `?dialog=<id>`, which opens it.
export function buildAssistantTools(isAdmin: boolean, settings: BarangaySettingsValues) {
  return {
    navigateToPage: buildNavigateToPageTool(isAdmin),
    openFormDialog: buildOpenFormDialogTool(isAdmin),
    calculateCourtFee: buildCalculateCourtFeeTool(settings),
  };
}
