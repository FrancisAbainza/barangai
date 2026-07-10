"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import {
  transparencyProjectCommentsTable,
  transparencyProjectReactionsTable,
  transparencyProjectsTable,
  type TransparencyProject,
  type TransparencyProjectComment,
} from "@/db/schema";
import type { TransparencyProjectFormValues } from "@/schemas/transparency-schema";
import type { MediaItem } from "@/components/file-uploader";

type CreateTransparencyProjectInput = Omit<TransparencyProjectFormValues, "media" | "attachments"> & {
  media: Omit<MediaItem, "file">[];
  attachments: Omit<MediaItem, "file">[];
};

export type TransparencyProjectWithAuthor = TransparencyProject & {
  authorName: string;
  authorImageUrl: string;
  authorRole: string;
  likeCount: number;
  dislikeCount: number;
  userReaction: "like" | "dislike" | null;
  commentCount: number;
};

export type TransparencyProjectCommentWithAuthor = TransparencyProjectComment & {
  authorName: string;
  authorImageUrl: string;
};

export async function createTransparencyProject(data: CreateTransparencyProjectInput) {
  const authorId = await requireAdmin();

  await db.insert(transparencyProjectsTable).values({
    title: data.title,
    category: data.category,
    description: data.description,
    budget: data.budget !== undefined ? data.budget.toString() : null,
    location: data.location || null,
    media: data.media,
    attachments: data.attachments,
    authorId,
  });
}

export async function updateTransparencyProject(id: number, data: CreateTransparencyProjectInput) {
  const { userId, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(transparencyProjectsTable)
    .where(eq(transparencyProjectsTable.id, id));
  if (!existing) throw new Error("Project not found");
  if (existing.authorId !== userId && !isSuperAdmin) throw new Error("Forbidden");

  await db
    .update(transparencyProjectsTable)
    .set({
      title: data.title,
      category: data.category,
      description: data.description,
      budget: data.budget !== undefined ? data.budget.toString() : null,
      location: data.location || null,
      media: data.media,
      attachments: data.attachments,
      updatedAt: new Date(),
    })
    .where(eq(transparencyProjectsTable.id, id));
}

export async function deleteTransparencyProject(id: number) {
  const { userId, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(transparencyProjectsTable)
    .where(eq(transparencyProjectsTable.id, id));
  if (!existing) throw new Error("Project not found");
  if (existing.authorId !== userId && !isSuperAdmin) throw new Error("Forbidden");

  await db.delete(transparencyProjectsTable).where(eq(transparencyProjectsTable.id, id));
}

const TRANSPARENCY_PAGE_SIZE = 10;

export type TransparencyProjectPage = {
  items: TransparencyProjectWithAuthor[];
  nextPage: number | null;
};

export async function getTransparencyProjects({
  page = 0,
  search,
  category,
}: {
  page?: number;
  search?: string;
  category?: TransparencyProject["category"] | "all";
} = {}): Promise<TransparencyProjectPage> {
  const conditions = [];

  if (category && category !== "all") {
    conditions.push(eq(transparencyProjectsTable.category, category));
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    conditions.push(
      or(
        ilike(transparencyProjectsTable.title, `%${trimmedSearch}%`),
        ilike(transparencyProjectsTable.description, `%${trimmedSearch}%`)
      )!
    );
  }

  const projects = await db
    .select()
    .from(transparencyProjectsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transparencyProjectsTable.createdAt), desc(transparencyProjectsTable.id))
    .limit(TRANSPARENCY_PAGE_SIZE)
    .offset(page * TRANSPARENCY_PAGE_SIZE);

  if (projects.length === 0) return { items: [], nextPage: null };

  // Author info lives in Clerk, not the DB, so fetch it separately and join in memory.
  const uniqueAuthorIds = [...new Set(projects.map((p) => p.authorId))];
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
      projectId: transparencyProjectReactionsTable.projectId,
      type: transparencyProjectReactionsTable.type,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transparencyProjectReactionsTable)
    .groupBy(transparencyProjectReactionsTable.projectId, transparencyProjectReactionsTable.type);

  const countsMap = new Map<number, { likeCount: number; dislikeCount: number }>();
  for (const row of reactionCounts) {
    const entry = countsMap.get(row.projectId) ?? { likeCount: 0, dislikeCount: 0 };
    if (row.type === "like") entry.likeCount = row.count;
    else entry.dislikeCount = row.count;
    countsMap.set(row.projectId, entry);
  }

  const commentCounts = await db
    .select({
      projectId: transparencyProjectCommentsTable.projectId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transparencyProjectCommentsTable)
    .groupBy(transparencyProjectCommentsTable.projectId);

  const commentCountMap = new Map(commentCounts.map((row) => [row.projectId, row.count]));

  // Only look up the viewer's own reactions when signed in (guests have none to show).
  const { userId } = await auth();
  const userReactionMap = new Map<number, "like" | "dislike">();
  if (userId) {
    const userReactions = await db
      .select({ projectId: transparencyProjectReactionsTable.projectId, type: transparencyProjectReactionsTable.type })
      .from(transparencyProjectReactionsTable)
      .where(eq(transparencyProjectReactionsTable.userId, userId));
    for (const reaction of userReactions) {
      userReactionMap.set(reaction.projectId, reaction.type);
    }
  }

  return {
    items: projects.map((item) => ({
      ...item,
      ...(userMap.get(item.authorId) ?? { authorName: "Unknown", authorImageUrl: "", authorRole: "resident" }),
      likeCount: countsMap.get(item.id)?.likeCount ?? 0,
      dislikeCount: countsMap.get(item.id)?.dislikeCount ?? 0,
      userReaction: userReactionMap.get(item.id) ?? null,
      commentCount: commentCountMap.get(item.id) ?? 0,
    })),
    nextPage: projects.length < TRANSPARENCY_PAGE_SIZE ? null : page + 1,
  };
}

export async function setTransparencyProjectReaction(projectId: number, type: "like" | "dislike") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(transparencyProjectReactionsTable)
    .where(
      and(
        eq(transparencyProjectReactionsTable.projectId, projectId),
        eq(transparencyProjectReactionsTable.userId, userId)
      )
    );

  if (existing && existing.type === type) {
    await db.delete(transparencyProjectReactionsTable).where(eq(transparencyProjectReactionsTable.id, existing.id));
    return;
  }

  if (existing) {
    await db
      .update(transparencyProjectReactionsTable)
      .set({ type })
      .where(eq(transparencyProjectReactionsTable.id, existing.id));
    return;
  }

  await db.insert(transparencyProjectReactionsTable).values({ projectId, userId, type });
}

export async function getTransparencyProjectComments(
  projectId: number
): Promise<TransparencyProjectCommentWithAuthor[]> {
  const comments = await db
    .select()
    .from(transparencyProjectCommentsTable)
    .where(eq(transparencyProjectCommentsTable.projectId, projectId))
    .orderBy(transparencyProjectCommentsTable.createdAt);

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

export async function addTransparencyProjectComment(
  projectId: number,
  content: string,
  parentId?: number
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Comment cannot be empty");

  if (parentId !== undefined) {
    const [parent] = await db
      .select()
      .from(transparencyProjectCommentsTable)
      .where(eq(transparencyProjectCommentsTable.id, parentId));
    if (!parent || parent.projectId !== projectId) throw new Error("Comment not found");
    if (parent.parentId !== null) throw new Error("Replies cannot be replied to");
  }

  await db
    .insert(transparencyProjectCommentsTable)
    .values({ projectId, userId, content: trimmed, parentId: parentId ?? null });
}

export async function deleteTransparencyProjectComment(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(transparencyProjectCommentsTable)
    .where(eq(transparencyProjectCommentsTable.id, id));
  if (!existing) throw new Error("Comment not found");
  if (existing.userId !== userId) throw new Error("Forbidden");

  await db.delete(transparencyProjectCommentsTable).where(eq(transparencyProjectCommentsTable.id, id));
}
