import z from "zod";
import {
  getPortalDialogHref,
  isPortalDialogAvailable,
  PORTAL_DIALOG_TARGETS,
  type PortalDialogTargetId,
} from "@/lib/ai-assistant/portal-dialogs";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";
import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { AUDIENCE_NOTES } from "@/lib/ai-assistant/tools/audience";
import { buttonTool } from "@/lib/ai-assistant/tools/buttons";

// The fields a form's `prefill` schema accepts, for the tool description,
// e.g. `name, category (one of: ["Food & Beverage","Retail"])`.
function describePrefillFields(id: PortalDialogTargetId): string {
  const fields: Record<string, z.ZodType> = PORTAL_DIALOG_TARGETS[id].prefill.shape;
  return Object.entries(fields)
    .map(([field, schema]) => {
      if (schema instanceof z.ZodEnum) return `${field} (one of: ${JSON.stringify(schema.options)})`;
      return schema.description ? `${field} (${schema.description})` : field;
    })
    .join(", ");
}

export function buildOpenFormDialogTool({ isAdmin }: AssistantToolContext) {
  const dialogIds = Object.keys(PORTAL_DIALOG_TARGETS) as [PortalDialogTargetId, ...PortalDialogTargetId[]];

  return buttonTool({
    description:
      "Open a specific form so the user can fill it out right away. Prefer this over navigateToPage whenever " +
      "the user's intent matches one of these forms. A form marked residents only or admins only may not be " +
      "available to this user: still pick the form that matches, never a different one, and the result says " +
      "whether they can use it. Forms, with the fields you can prefill:\n" +
      dialogIds
        .map((id) => {
          const { label, description, audience } = PORTAL_DIALOG_TARGETS[id];
          const line = `- ${id}: ${label}${AUDIENCE_NOTES[audience]} — ${description}`;
          return isPortalDialogAvailable(id, isAdmin) ? `${line} Prefill fields: ${describePrefillFields(id)}.` : line;
        })
        .join("\n"),
    inputSchema: z.object({
      dialog: z.enum(dialogIds).describe("The form to open."),
      reason: z
        .string()
        .describe('A short, user-facing reason for opening the form, e.g. "to file your complaint".'),
      // A list rather than an object keyed by field: the AI SDK sends every object to OpenAI
      // with `additionalProperties: false`, which would tell the model a record can't have keys.
      prefill: z
        .array(
          z.object({
            field: z.string().describe("One of the chosen form's prefill fields."),
            value: z.union([z.string(), z.number()]),
          }),
        )
        .optional()
        .describe(
          "Details the user has already stated in this conversation, in their own words without translating. " +
            "Include a field only when the user gave its value. For a field with options, include it only when what " +
            "they said clearly fits one option. Never guess, fill in defaults or send empty values.",
        ),
    }),
    execute: async ({ dialog, prefill = [] }) => {
      const { label, page } = PORTAL_DIALOG_TARGETS[dialog];
      if (!isPortalDialogAvailable(dialog, isAdmin)) {
        const pageLabel = PORTAL_NAVIGATION_TARGETS[page].label;
        return {
          buttons: [],
          instruction: isAdmin
            ? `This form is only for residents, so no button was shown. In a sentence or two, tell the user that residents submit this from their own accounts, so admin accounts can't, and that they can review residents' submissions on the ${pageLabel} page. Don't call another tool.`
            : "This form is only for barangay admins, so no button was shown. Tell the user in a sentence that only barangay admins can do this. Don't call another tool.",
        };
      }
      const values = Object.fromEntries(
        prefill.filter(({ value }) => value !== "").map(({ field, value }) => [field, value]),
      );
      // With several forms, the model said "I've opened the forms" despite the system prompt, and
      // it claimed fields were filled in when it had sent none, so the result spells out both.
      const filledIn = Object.entries(values).map(([field, value]) => `${field}: ${value}`);
      const instruction =
        `A "${label}" button is shown below your reply. Point the user to it. ` +
        "The form isn't open until they tap it, so don't say you've opened it. " +
        (filledIn.length > 0
          ? `It opens with these filled in for them to review: ${filledIn.join(", ")}.`
          : "Nothing will be filled in, so don't say it will be.");
      return {
        buttons: [{ key: `form-${dialog}`, kind: "form", page, label, href: getPortalDialogHref(dialog, values) }],
        instruction,
      };
    },
  });
}
