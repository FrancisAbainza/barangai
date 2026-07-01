"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { newsTable, type News } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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

  return news.map((item) => ({
    ...item,
    ...(userMap.get(item.authorId) ?? { authorName: "Unknown", authorImageUrl: "", authorRole: "resident" }),
  }));
}

export async function deleteNews(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(newsTable).where(eq(newsTable.id, id));
  if (!existing) throw new Error("News post not found");
  if (existing.authorId !== userId) throw new Error("Forbidden");

  await db.delete(newsTable).where(eq(newsTable.id, id));
}
