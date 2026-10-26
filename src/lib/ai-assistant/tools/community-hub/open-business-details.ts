import { and, eq, inArray } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { businessesTable } from "@/db/schema";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";
import { buttonTool, MAX_RECORD_BUTTONS } from "@/lib/ai-assistant/tools/buttons";
import { BUSINESS_SEARCH_PARAM } from "@/lib/business";

// One button per business, each going to the Community Hub with `?business=<id>`, which opens that
// business's details (photos, contact links, map). The ids come from findBusinesses. They're checked
// here, so a made-up id gets no button, and the button's label is the name from the database rather
// than the model.
export const openBusinessDetailsTool = buttonTool({
  description:
    "Show the user a button for each business that opens its full details in the Community Hub: photos, " +
    "description, hours, contact details and its location on a map. Use the ids findBusinesses returned.",
  inputSchema: z.object({
    businessIds: z.array(z.number()).describe(`The businesses' ids from findBusinesses, at most ${MAX_RECORD_BUTTONS}.`),
  }),
  execute: async ({ businessIds }) => {
    const ids = businessIds.slice(0, MAX_RECORD_BUTTONS);
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({ id: businessesTable.id, name: businessesTable.name })
            .from(businessesTable)
            .where(and(inArray(businessesTable.id, ids), eq(businessesTable.status, "Verified")));

    if (rows.length === 0) {
      return {
        buttons: [],
        instruction: "None of these ids belongs to a business in the Community Hub, so no button was shown. Don't mention one.",
      };
    }

    // In the order the model gave them, which follows its answer.
    rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const { href } = PORTAL_NAVIGATION_TARGETS["community-hub"];
    return {
      buttons: rows.map(({ id, name }) => ({
        key: `business-${id}`,
        kind: "business",
        page: "community-hub",
        label: `View ${name}`,
        href: `${href}?${BUSINESS_SEARCH_PARAM}=${id}`,
      })),
      instruction: `A button that opens the details is shown below your reply for: ${rows.map(({ name }) => name).join(", ")}. Point the user to it; don't write a link.`,
    };
  },
});
