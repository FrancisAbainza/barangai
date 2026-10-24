import { tool } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { businessesTable } from "@/db/schema";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";
import { BUSINESS_SEARCH_PARAM } from "@/lib/business";

const MAX_BUSINESSES = 3;

// Like openFormDialog, this only shows buttons: one per business, each going to the Community Hub
// with `?business=<id>`, which opens that business's details (photos, contact links, map). The ids
// come from findBusinesses. They're checked here, so a made-up id gets no button, and the button's
// label is the name from the database rather than the model.
export const openBusinessDetailsTool = tool({
  description:
    "Show the user a button for each business that opens its full details in the Community Hub: photos, " +
    "description, hours, contact details and its location on a map. Use the ids findBusinesses returned.",
  inputSchema: z.object({
    businessIds: z.array(z.number()).describe(`The businesses' ids from findBusinesses, at most ${MAX_BUSINESSES}.`),
  }),
  execute: async ({ businessIds }) => {
    const ids = businessIds.slice(0, MAX_BUSINESSES);
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({ id: businessesTable.id, name: businessesTable.name })
            .from(businessesTable)
            .where(and(inArray(businessesTable.id, ids), eq(businessesTable.status, "Verified")));

    if (rows.length === 0) {
      return {
        buttonShown: false,
        instruction: "None of these ids belongs to a business in the Community Hub, so no button was shown. Don't mention one.",
      };
    }

    // In the order the model gave them, which follows its answer.
    rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const href = PORTAL_NAVIGATION_TARGETS["community-hub"].href;
    return {
      businesses: rows.map(({ id, name }) => ({ id, name, href: `${href}?${BUSINESS_SEARCH_PARAM}=${id}` })),
      buttonShown: true,
      instruction: `A button that opens the details is shown below your reply for: ${rows.map(({ name }) => name).join(", ")}. Point the user to it; don't write a link.`,
    };
  },
  // The model only gets the instruction. The chat panel needs the hrefs, but given them, the
  // model pasted them as links ("[View Details](#)") instead of pointing to the buttons.
  toModelOutput: ({ output }) => ({ type: "text", value: output.instruction }),
});
