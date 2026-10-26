import z from "zod";
import { PORTAL_DIALOG_TARGETS, type PortalDialogTargetId } from "@/lib/ai-assistant/portal-dialogs";
import { buttonTool } from "@/lib/ai-assistant/tools/buttons";
import { describeForm, FORM_IDS, getFormButton, prefillInputSchema } from "@/lib/ai-assistant/tools/form-dialogs";

// The forms admins can open. The residents' forms are left out, so the description names them:
// left out unnamed, a request for a form the user's role can't open got the closest one that was
// listed (an admin asking for a Certificate of Indigency got "Submit a Business").
const formIds = FORM_IDS.filter((id) => PORTAL_DIALOG_TARGETS[id].audience !== "resident") as [
  PortalDialogTargetId,
  ...PortalDialogTargetId[],
];
const residentForms = FORM_IDS.filter((id) => PORTAL_DIALOG_TARGETS[id].audience === "resident")
  .map((id) => PORTAL_DIALOG_TARGETS[id].label)
  .join(", ");

export const openFormDialogTool = buttonTool({
  description:
    "Open a specific form so the user can fill it out right away. Prefer this over navigateToPage whenever " +
    "the user's intent matches one of these forms. Forms, with the fields you can prefill:\n" +
    formIds.map(describeForm).join("\n") +
    `\nThese forms are only for residents, so they aren't here: ${residentForms}. If the user asks for one, don't ` +
    "call this tool or pick a different form: in a sentence or two, tell them that residents submit it from their " +
    "own accounts, so admin accounts can't, and that they can review residents' submissions on the Document " +
    "Request page, or the Complaint page for complaints.",
  inputSchema: z.object({
    dialog: z.enum(formIds).describe("The form to open."),
    reason: z
      .string()
      .describe('A short, user-facing reason for opening the form, e.g. "to post your announcement".'),
    prefill: prefillInputSchema,
  }),
  execute: async ({ dialog, prefill = [] }) => getFormButton(dialog, prefill),
});
