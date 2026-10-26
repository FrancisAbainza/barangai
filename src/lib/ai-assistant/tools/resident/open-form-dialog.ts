import z from "zod";
import { PORTAL_DIALOG_TARGETS, type PortalDialogTargetId } from "@/lib/ai-assistant/portal-dialogs";
import { buttonTool } from "@/lib/ai-assistant/tools/buttons";
import { describeForm, FORM_IDS, getFormButton, prefillInputSchema } from "@/lib/ai-assistant/tools/form-dialogs";

// The forms residents can open. The admins' forms are left out, so the description names them:
// left out unnamed, a request for a form the user's role can't open got the closest one that was
// listed (an admin asking for a Certificate of Indigency got "Submit a Business").
const formIds = FORM_IDS.filter((id) => PORTAL_DIALOG_TARGETS[id].audience !== "admin") as [
  PortalDialogTargetId,
  ...PortalDialogTargetId[],
];
const adminForms = FORM_IDS.filter((id) => PORTAL_DIALOG_TARGETS[id].audience === "admin")
  .map((id) => PORTAL_DIALOG_TARGETS[id].label)
  .join(", ");

export const openFormDialogTool = buttonTool({
  description:
    "Open a specific form so the user can fill it out right away. Prefer this over navigateToPage whenever " +
    "the user's intent matches one of these forms. Forms, with the fields you can prefill:\n" +
    formIds.map(describeForm).join("\n") +
    `\nThese forms are only for barangay admins, so they aren't here: ${adminForms}. If the user asks for one, ` +
    "don't call this tool or pick a different form: tell them in a sentence that only barangay admins can do this.",
  inputSchema: z.object({
    dialog: z.enum(formIds).describe("The form to open."),
    reason: z
      .string()
      .describe('A short, user-facing reason for opening the form, e.g. "to file your complaint".'),
    prefill: prefillInputSchema,
  }),
  execute: async ({ dialog, prefill = [] }) => getFormButton(dialog, prefill),
});
