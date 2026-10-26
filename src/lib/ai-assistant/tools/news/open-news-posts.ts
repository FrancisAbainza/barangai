import { inArray } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { newsTable } from "@/db/schema";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";
import { buttonTool, MAX_RECORD_BUTTONS } from "@/lib/ai-assistant/tools/buttons";

// Like openBusinessDetails, one button per post, each going to the post's page in the portal
// (/portal/news/<id>), with its full text, photos and attachments. The ids come from findNews.
// They're checked here, so a made-up id gets no button, and the button's label is the title from
// the database rather than the model.
export const openNewsPostsTool = buttonTool({
  description:
    "Show the user a button for each news post that opens the full post: its complete text, photos and " +
    "attachments. Use the ids findNews returned.",
  inputSchema: z.object({
    postIds: z.array(z.number()).describe(`The posts' ids from findNews, at most ${MAX_RECORD_BUTTONS}.`),
  }),
  execute: async ({ postIds }) => {
    const ids = postIds.slice(0, MAX_RECORD_BUTTONS);
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({ id: newsTable.id, title: newsTable.title })
            .from(newsTable)
            .where(inArray(newsTable.id, ids));

    if (rows.length === 0) {
      return {
        buttons: [],
        instruction: "None of these ids belongs to a news post, so no button was shown. Don't mention one.",
      };
    }

    // In the order the model gave them, which follows its answer.
    rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return {
      buttons: rows.map(({ id, title }) => ({
        key: `news-post-${id}`,
        kind: "news-post",
        page: "news",
        label: `View ${title}`,
        href: `${PORTAL_NAVIGATION_TARGETS.news.href}/${id}`,
      })),
      instruction: `A button that opens the full post is shown below your reply for: ${rows.map(({ title }) => title).join(", ")}. Point the user to it; don't write a link.`,
    };
  },
});
