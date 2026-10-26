import z from "zod";
import { getPortalDialogHref, PORTAL_DIALOG_TARGETS, type PortalDialogTargetId } from "@/lib/ai-assistant/portal-dialogs";
import { HOW_TO_STEPS_NOTE, type ButtonToolOutput } from "@/lib/ai-assistant/tools/buttons";

// What the residents' and the admins' openFormDialog tools (resident/open-form-dialog.ts and
// admin/open-form-dialog.ts) have in common. Each lists only the forms its role can open, but a
// form is described, prefilled and opened the same way for both.

export const FORM_IDS = Object.keys(PORTAL_DIALOG_TARGETS) as PortalDialogTargetId[];

// A form's line in the tool description, with the fields its `prefill` schema accepts,
// e.g. `name, category (one of: ["Food & Beverage","Retail"])`.
export function describeForm(id: PortalDialogTargetId): string {
  const { label, description, prefill } = PORTAL_DIALOG_TARGETS[id];
  const fields: Record<string, z.ZodType> = prefill.shape;
  const prefillFields = Object.entries(fields)
    .map(([field, schema]) => {
      if (schema instanceof z.ZodEnum) return `${field} (one of: ${JSON.stringify(schema.options)})`;
      return schema.description ? `${field} (${schema.description})` : field;
    })
    .join(", ");
  return `- ${id}: ${label} — ${description} Prefill fields: ${prefillFields}.`;
}

// A list rather than an object keyed by field: the AI SDK sends every object to OpenAI
// with `additionalProperties: false`, which would tell the model a record can't have keys.
export const prefillInputSchema = z
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
  );

export function getFormButton(
  dialog: PortalDialogTargetId,
  prefill: { field: string; value: string | number }[],
): ButtonToolOutput {
  const { label, page } = PORTAL_DIALOG_TARGETS[dialog];
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
      : "Nothing will be filled in, so don't say it will be.") +
    ` ${HOW_TO_STEPS_NOTE}`;
  return {
    buttons: [{ key: `form-${dialog}`, kind: "form", page, label, href: getPortalDialogHref(dialog, values) }],
    instruction,
  };
}
