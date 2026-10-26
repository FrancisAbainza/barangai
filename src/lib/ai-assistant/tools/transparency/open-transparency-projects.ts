import { inArray } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { transparencyProjectsTable } from "@/db/schema";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";
import { buttonTool, MAX_RECORD_BUTTONS } from "@/lib/ai-assistant/tools/buttons";

// Like openNewsPosts, one button per project, each going to the project's page in the portal
// (/portal/transparency/<id>), with its full description, budget, photos, attachments and location.
// The ids come from findTransparencyProjects and are checked here.
export const openTransparencyProjectsTool = buttonTool({
  description:
    "Show the user a button for each transparency project that opens its full details: description, budget, " +
    "photos, attachments and location. Use the ids findTransparencyProjects returned.",
  inputSchema: z.object({
    projectIds: z
      .array(z.number())
      .describe(`The projects' ids from findTransparencyProjects, at most ${MAX_RECORD_BUTTONS}.`),
  }),
  execute: async ({ projectIds }) => {
    const ids = projectIds.slice(0, MAX_RECORD_BUTTONS);
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({ id: transparencyProjectsTable.id, title: transparencyProjectsTable.title })
            .from(transparencyProjectsTable)
            .where(inArray(transparencyProjectsTable.id, ids));

    if (rows.length === 0) {
      return {
        buttons: [],
        instruction: "None of these ids belongs to a transparency project, so no button was shown. Don't mention one.",
      };
    }

    // In the order the model gave them, which follows its answer.
    rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return {
      buttons: rows.map(({ id, title }) => ({
        key: `project-${id}`,
        kind: "project",
        page: "transparency",
        label: `View ${title}`,
        href: `${PORTAL_NAVIGATION_TARGETS.transparency.href}/${id}`,
      })),
      instruction: `A button that opens the details is shown below your reply for: ${rows.map(({ title }) => title).join(", ")}. Point the user to it; don't write a link.`,
    };
  },
});
