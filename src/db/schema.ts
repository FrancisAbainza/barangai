import { boolean, integer, json, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import type { MediaItem } from "@/components/media-uploader";
import type { AttachmentItem } from "@/components/attachment-picker";

export const newsCategoryEnum = pgEnum("news_category", ["Announcement", "Event", "Emergency"]);

export const newsTable = pgTable("news", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  category: newsCategoryEnum().notNull(),
  content: text().notNull(),
  media: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  attachments: json().$type<Omit<AttachmentItem, "file">[]>().notNull().default([]),
  pinned: boolean().notNull().default(false),
  authorId: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type News = typeof newsTable.$inferSelect;
