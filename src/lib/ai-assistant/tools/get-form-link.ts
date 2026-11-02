import { tool } from "ai";
import z from "zod";
import { getPortalDialogHref, PORTAL_DIALOG_TARGETS, type PortalDialogTargetId } from "@/lib/ai-assistant/portal-dialogs";
import { markdownLink } from "@/lib/ai-assistant/tools/links";

const FORM_IDS = Object.keys(PORTAL_DIALOG_TARGETS) as PortalDialogTargetId[];

// A form's line in the tool description, with the fields its `prefill` schema accepts,
// e.g. `name, category (one of: ["Food & Beverage","Retail"])`.
function describeForm(id: PortalDialogTargetId): string {
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

// Each role gets the forms its view of the page has (PORTAL_DIALOG_TARGETS' `audience`). The other
// role's forms are named in the description: left out unnamed, a request for one got the closest
// form that was listed (an admin asking for a Certificate of Indigency got "Submit a Business").
const ROLES = {
  resident: {
    otherRole: "admin",
    otherForms: (forms: string) =>
      `These forms are only for barangay admins: ${forms}. If the user asks for one, don't call this tool or pick ` +
      "a different form: tell them in a sentence that only barangay admins can do this.",
    prefillExample: '"I need a clearance for my new job" gives the purpose "Clearance for Local Employment"',
  },
  admin: {
    otherRole: "resident",
    otherForms: (forms: string) =>
      `These forms are only for residents: ${forms}. If the user asks for one, don't call this tool or pick a ` +
      "different form: in a sentence or two, tell them that residents submit it from their own accounts, so admin " +
      "accounts can't, and that they review residents' ones on its page.",
    prefillExample: '"add Juan dela Cruz as a kagawad" gives the name "Juan dela Cruz" and the position "Kagawad"',
  },
} as const;

// The link opens the form's page with the form open (`?dialog=<id>`), and with what the user already
// said filled in (`&prefill=<json>`, which the page checks against the form's `prefill` schema).
export function buildGetFormLinkTool(role: keyof typeof ROLES) {
  const { otherRole, otherForms, prefillExample } = ROLES[role];
  const formIds = FORM_IDS.filter((id) => PORTAL_DIALOG_TARGETS[id].audience !== otherRole) as [
    PortalDialogTargetId,
    ...PortalDialogTargetId[],
  ];
  const otherFormLabels = FORM_IDS.filter((id) => PORTAL_DIALOG_TARGETS[id].audience === otherRole)
    .map((id) => PORTAL_DIALOG_TARGETS[id].label)
    .join(", ");

  return tool({
    description:
      "Get the link that opens one of these forms, so the user can fill it in right away. Call it when the user wants " +
      "to fill in one of them now, or asks how to, even when they haven't given any details, and once for each form " +
      "when they ask for several. Only for a form that matches what they asked for, never the closest one. Never ask " +
      "for a form's details in the chat: they fill them in on the form, which also has fields you can't fill (uploads, " +
      "map locations, most dates). Forms, with the fields you can prefill:\n" +
      formIds.map(describeForm).join("\n") +
      `\n${otherForms(otherFormLabels)}`,
    inputSchema: z.object({
      form: z.enum(formIds),
      // A list rather than an object keyed by field: the AI SDK sends every object to OpenAI with
      // `additionalProperties: false`, which would tell the model a record can't have keys.
      prefill: z
        .array(
          z.object({
            field: z.string().describe("One of the chosen form's prefill fields."),
            value: z.union([z.string(), z.number()]),
          }),
        )
        .optional()
        .describe(
          "Details the user has already stated in this conversation, in their own words without translating. Most " +
            "requests only name the form: send none then, and don't choose any option for them. Include a field only " +
            `when the user's own words give its value, e.g. ${prefillExample}. For a field with options, only when ` +
            "what they said clearly fits one. Never guess, fill in defaults or send empty values.",
        ),
    }),
    execute: async ({ form, prefill = [] }) => {
      const { label } = PORTAL_DIALOG_TARGETS[form];
      const values = Object.fromEntries(
        prefill.filter(({ value }) => value !== "").map(({ field, value }) => [field, value]),
      );
      // The model said it had opened the form, and claimed fields were filled in when it had sent
      // none, so the instruction spells out both.
      const filledIn = Object.entries(values).map(([field, value]) => `${field}: ${value}`);
      return {
        link: markdownLink(label, getPortalDialogHref(form, values)),
        instruction:
          "Put this link in your reply exactly as it is. The form opens when the user taps it, so don't say you've opened it. " +
          (filledIn.length > 0
            ? `It opens with these filled in for them to review: ${filledIn.join(", ")}.`
            : "Nothing will be filled in, so don't say it will be."),
      };
    },
  });
}
