"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { newsReactionsTable, newsTable, type News } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NewsFormValues } from "@/schemas/news-schema";
import type { MediaItem } from "@/components/media-uploader";
import type { AttachmentItem } from "@/components/attachment-picker";

type CreateNewsInput = Omit<NewsFormValues, "media" | "attachments"> & {
  media: Omit<MediaItem, "file">[];
  attachments: Omit<AttachmentItem, "file">[];
};

export type NewsWithAuthor = News & {
  authorName: string;
  authorImageUrl: string;
  authorRole: string;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
};

export async function createNews(data: CreateNewsInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(newsTable).values({
    title: data.title,
    category: data.category,
    content: data.content,
    media: data.media,
    attachments: data.attachments,
    pinned: data.pinned,
    authorId: userId,
  });
}

export async function updateNews(id: number, data: CreateNewsInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!existing) throw new Error("News post not found");
  if (existing.authorId !== userId) throw new Error("Forbidden");

  await db
    .update(newsTable)
    .set({
      title: data.title,
      category: data.category,
      content: data.content,
      media: data.media,
      attachments: data.attachments,
      pinned: data.pinned,
      updatedAt: new Date(),
    })
    .where(eq(newsTable.id, id));
}

export async function getNews(): Promise<NewsWithAuthor[]> {
  const news = await db.select().from(newsTable).orderBy(desc(newsTable.createdAt));

  if (news.length === 0) return [];

  // Author info lives in Clerk, not the DB, so fetch it separately and join in memory.
  // Deduped IDs keep this to one batched request instead of one per news item.
  const uniqueAuthorIds = [...new Set(news.map((n) => n.authorId))];
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ userId: uniqueAuthorIds, limit: 100 });

  const userMap = new Map(
    users.map((u) => [
      u.id,
      {
        authorName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Unknown",
        authorImageUrl: u.imageUrl,
        authorRole: (u.publicMetadata?.role as string | undefined) ?? "resident",
      },
    ])
  );

  // One grouped query for all items' reaction totals, split into like/dislike counts below.
  const reactionCounts = await db
    .select({
      newsId: newsReactionsTable.newsId,
      type: newsReactionsTable.type,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(newsReactionsTable)
    .groupBy(newsReactionsTable.newsId, newsReactionsTable.type);

  const countsMap = new Map<number, { likeCount: number; dislikeCount: number }>();
  for (const row of reactionCounts) {
    const entry = countsMap.get(row.newsId) ?? { likeCount: 0, dislikeCount: 0 };
    if (row.type === "like") entry.likeCount = row.count;
    else entry.dislikeCount = row.count;
    countsMap.set(row.newsId, entry);
  }

  // Only look up the viewer's own reactions when signed in (guests have none to show).
  const { userId } = await auth();
  const userReactionMap = new Map<number, "like" | "dislike">();
  if (userId) {
    const userReactions = await db
      .select({ newsId: newsReactionsTable.newsId, type: newsReactionsTable.type })
      .from(newsReactionsTable)
      .where(eq(newsReactionsTable.userId, userId));
    for (const reaction of userReactions) {
      userReactionMap.set(reaction.newsId, reaction.type);
    }
  }

  return news.map((item) => ({
    ...item,
    ...(userMap.get(item.authorId) ?? { authorName: "Unknown", authorImageUrl: "", authorRole: "resident" }),
    likeCount: countsMap.get(item.id)?.likeCount ?? 0,
    dislikeCount: countsMap.get(item.id)?.dislikeCount ?? 0,
    userReaction: userReactionMap.get(item.id) ?? null,
  }));
}

export async function setNewsReaction(newsId: number, type: "like" | "dislike") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(newsReactionsTable)
    .where(and(eq(newsReactionsTable.newsId, newsId), eq(newsReactionsTable.userId, userId)));

  if (existing && existing.type === type) {
    await db.delete(newsReactionsTable).where(eq(newsReactionsTable.id, existing.id));
    return;
  }

  if (existing) {
    await db.update(newsReactionsTable).set({ type }).where(eq(newsReactionsTable.id, existing.id));
    return;
  }

  await db.insert(newsReactionsTable).values({ newsId, userId, type });
}

export async function deleteNews(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!existing) throw new Error("News post not found");
  if (existing.authorId !== userId) throw new Error("Forbidden");

  await db.delete(newsTable).where(eq(newsTable.id, id));
}
