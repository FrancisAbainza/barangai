import { tool } from "ai";
import { desc } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { newsTable } from "@/db/schema";
import { formatPhilippineDate } from "@/lib/utils";

// The last few weeks of posts for most barangays, without filling the model's context.
const MAX_POSTS = 20;
// Long enough to reach the date, time and area most announcements give.
const MAX_CONTENT_LENGTH = 500;

// Like findBusinesses, this shows no button; the model answers from its result and then calls
// openNewsPosts. It lists the latest posts and leaves the matching to the model, which can tell that
// a "scheduled power interruption" post answers "may brownout ba?". A keyword search can't.
export const findNewsTool = tool({
  description:
    "List the latest posts on the barangay's News & Announcements page, pinned posts first: each one's title, " +
    "category (Announcement, Event or Emergency), whether it's pinned, when it was posted and the start of its content. " +
    "Use it for questions about announcements, events, emergencies and service interruptions such as brownouts or " +
    "water interruptions. Match the user's question to the posts yourself.",
  inputSchema: z.object({}),
  execute: async () => {
    const posts = await db
      .select({
        id: newsTable.id,
        title: newsTable.title,
        category: newsTable.category,
        content: newsTable.content,
        pinned: newsTable.pinned,
        createdAt: newsTable.createdAt,
      })
      .from(newsTable)
      // The News & Announcements page's order.
      .orderBy(desc(newsTable.pinned), desc(newsTable.createdAt), desc(newsTable.id))
      .limit(MAX_POSTS);

    const instructions = [
      "Answer only from these posts, and mention only the ones that fit what the user asked. Leave the others out entirely. If none fit, say there's no recent post about it on the News & Announcements page, without listing other posts instead.",
      "When the user asks about emergencies, events or announcements, go by each post's category.",
      "posted is when a post was published, not when its event or interruption happens. When the user asks when something happens, give the date and time from its content, or say the post doesn't give one. Compare those dates with today to tell whether something is upcoming, this week or already over.",
      `A content that ends with "…" was cut off at ${MAX_CONTENT_LENGTH} characters, so the full post may have more details. Any other content is the whole post.`,
      posts.length === MAX_POSTS &&
        `Only the ${MAX_POSTS} latest posts are listed. If the answer may be in an older one, mention that the News & Announcements page lists them all.`,
      "This result shows no button, so don't mention one unless you call openNewsPosts. If your answer is about specific posts (up to 3), call openNewsPosts with their ids next, so the user gets a button to open each full post.",
    ];

    return {
      today: new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", dateStyle: "full" }),
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        category: post.category,
        pinned: post.pinned,
        posted: formatPhilippineDate(post.createdAt),
        content:
          post.content.length > MAX_CONTENT_LENGTH ? `${post.content.slice(0, MAX_CONTENT_LENGTH)}…` : post.content,
      })),
      buttonShown: false,
      instruction: instructions.filter(Boolean).join(" "),
    };
  },
});
