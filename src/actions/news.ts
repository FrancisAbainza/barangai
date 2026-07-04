"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAuthRole } from "@/lib/auth";
import { db } from "@/db/config";
import { newsCommentsTable, newsReactionsTable, newsTable, type News, type NewsComment } from "@/db/schema";
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
  commentCount: number;
};

export type NewsCommentWithAuthor = NewsComment & {
  authorName: string;
  authorImageUrl: string;
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
  const { userId, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!existing) throw new Error("News post not found");
  if (existing.authorId !== userId && !isSuperAdmin) throw new Error("Forbidden");

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

const NEWS_PAGE_SIZE = 10;

export type NewsPage = {
  items: NewsWithAuthor[];
  nextPage: number | null;
};

export async function getNews({ page = 0 }: { page?: number } = {}): Promise<NewsPage> {
  const news = await db
    .select()
    .from(newsTable)
    // Pinned items float to the top; id tiebreaks createdAt so offset pagination stays stable across pages.
    .orderBy(desc(newsTable.pinned), desc(newsTable.createdAt), desc(newsTable.id))
    .limit(NEWS_PAGE_SIZE)
    .offset(page * NEWS_PAGE_SIZE);

  if (news.length === 0) return { items: [], nextPage: null };

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

  const commentCounts = await db
    .select({
      newsId: newsCommentsTable.newsId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(newsCommentsTable)
    .groupBy(newsCommentsTable.newsId);

  const commentCountMap = new Map(commentCounts.map((row) => [row.newsId, row.count]));

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

  return {
    items: news.map((item) => ({
      ...item,
      ...(userMap.get(item.authorId) ?? { authorName: "Unknown", authorImageUrl: "", authorRole: "resident" }),
      likeCount: countsMap.get(item.id)?.likeCount ?? 0,
      dislikeCount: countsMap.get(item.id)?.dislikeCount ?? 0,
      userReaction: userReactionMap.get(item.id) ?? null,
      commentCount: commentCountMap.get(item.id) ?? 0,
    })),
    nextPage: news.length < NEWS_PAGE_SIZE ? null : page + 1,
  };
}

export async function getNewsById(id: number): Promise<NewsWithAuthor | null> {
  const [item] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!item) return null;

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ userId: [item.authorId], limit: 1 });
  const author = users[0];

  const reactionCounts = await db
    .select({ type: newsReactionsTable.type, count: sql<number>`count(*)`.mapWith(Number) })
    .from(newsReactionsTable)
    .where(eq(newsReactionsTable.newsId, id))
    .groupBy(newsReactionsTable.type);

  let likeCount = 0;
  let dislikeCount = 0;
  for (const row of reactionCounts) {
    if (row.type === "like") likeCount = row.count;
    else dislikeCount = row.count;
  }

  const [commentRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(newsCommentsTable)
    .where(eq(newsCommentsTable.newsId, id));

  const { userId } = await auth();
  let userReaction: "like" | "dislike" | null = null;
  if (userId) {
    const [reaction] = await db
      .select({ type: newsReactionsTable.type })
      .from(newsReactionsTable)
      .where(and(eq(newsReactionsTable.newsId, id), eq(newsReactionsTable.userId, userId)));
    userReaction = reaction?.type ?? null;
  }

  return {
    ...item,
    authorName: author
      ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.username || "Unknown"
      : "Unknown",
    authorImageUrl: author?.imageUrl ?? "",
    authorRole: (author?.publicMetadata?.role as string | undefined) ?? "resident",
    likeCount,
    dislikeCount,
    userReaction,
    commentCount: commentRow?.count ?? 0,
  };
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
  const { userId, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!existing) throw new Error("News post not found");
  if (existing.authorId !== userId && !isSuperAdmin) throw new Error("Forbidden");

  await db.delete(newsTable).where(eq(newsTable.id, id));
}

export async function getNewsComments(newsId: number): Promise<NewsCommentWithAuthor[]> {
  const comments = await db
    .select()
    .from(newsCommentsTable)
    .where(eq(newsCommentsTable.newsId, newsId))
    .orderBy(newsCommentsTable.createdAt);

  if (comments.length === 0) return [];

  const uniqueAuthorIds = [...new Set(comments.map((c) => c.userId))];
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ userId: uniqueAuthorIds, limit: 100 });

  const userMap = new Map(
    users.map((u) => [
      u.id,
      {
        authorName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Unknown",
        authorImageUrl: u.imageUrl,
      },
    ])
  );

  return comments.map((comment) => ({
    ...comment,
    ...(userMap.get(comment.userId) ?? { authorName: "Unknown", authorImageUrl: "" }),
  }));
}

export async function addNewsComment(newsId: number, content: string, parentId?: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");

  if (parentId !== undefined) {
    const [parent] = await db.select().from(newsCommentsTable).where(eq(newsCommentsTable.id, parentId));
    if (!parent || parent.newsId !== newsId) throw new Error("Comment not found");
    if (parent.parentId !== null) throw new Error("Replies cannot be replied to");
  }

  await db.insert(newsCommentsTable).values({ newsId, userId, content: trimmed, parentId: parentId ?? null });
}

export async function deleteNewsComment(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(newsCommentsTable).where(eq(newsCommentsTable.id, id));
  if (!existing) throw new Error("Comment not found");
  if (existing.userId !== userId) throw new Error("Forbidden");

  await db.delete(newsCommentsTable).where(eq(newsCommentsTable.id, id));
}
