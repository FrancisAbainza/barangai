"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { newsTable } from "@/db/schema";
import type { NewsFormValues } from "@/schemas/news-schema";
import type { MediaItem } from "@/components/media-uploader";
import type { AttachmentItem } from "@/components/attachment-picker";

type CreateNewsInput = Omit<NewsFormValues, "media" | "attachments"> & {
  media: Omit<MediaItem, "file">[];
  attachments: Omit<AttachmentItem, "file">[];
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
