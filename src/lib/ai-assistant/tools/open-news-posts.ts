import { tool } from "ai";
import { inArray } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { newsTable } from "@/db/schema";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";

const MAX_POSTS = 3;

// Like openBusinessDetails, this only shows buttons: one per post, each going to the post's page in
// the portal (/portal/news/<id>), with its full text, photos and attachments. The ids come from
// findNews. They're checked here, so a made-up id gets no button, and the button's label is the
// title from the database rather than the model.
export const openNewsPostsTool = tool({
  description:
    "Show the user a button for each news post that opens the full post: its complete text, photos and " +
    "attachments. Use the ids findNews returned.",
  inputSchema: z.object({
    postIds: z.array(z.number()).describe(`The posts' ids from findNews, at most ${MAX_POSTS}.`),
  }),
  execute: async ({ postIds }) => {
    const ids = postIds.slice(0, MAX_POSTS);
    const rows =
      ids.length === 0
        ? []
        : await db
            .select({ id: newsTable.id, title: newsTable.title })
            .from(newsTable)
            .where(inArray(newsTable.id, ids));

    if (rows.length === 0) {
      return {
        buttonShown: false,
        instruction: "None of these ids belongs to a news post, so no button was shown. Don't mention one.",
      };
    }

    // In the order the model gave them, which follows its answer.
    rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return {
      posts: rows.map(({ id, title }) => ({ id, title, href: `${PORTAL_NAVIGATION_TARGETS.news.href}/${id}` })),
      buttonShown: true,
      instruction: `A button that opens the full post is shown below your reply for: ${rows.map(({ title }) => title).join(", ")}. Point the user to it; don't write a link.`,
    };
  },
  // The model only gets the instruction, for the same reason as openBusinessDetails: given the
  // hrefs, it pastes them as links instead of pointing to the buttons.
  toModelOutput: ({ output }) => ({ type: "text", value: output.instruction }),
});
