import { boolean, integer, json, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import type { MediaItem } from "@/components/media-uploader";
import type { AttachmentItem } from "@/components/attachment-picker";

export const newsCategoryEnum = pgEnum("news_category", ["Announcement", "Event", "Emergency"]);
export const newsReactionTypeEnum = pgEnum("news_reaction_type", ["like", "dislike"]);

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

export const newsReactionsTable = pgTable(
  "news_reactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    newsId: integer()
      .notNull()
      .references(() => newsTable.id, { onDelete: "cascade" }),
    userId: varchar({ length: 255 }).notNull(),
    type: newsReactionTypeEnum().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [uniqueIndex("news_reactions_news_id_user_id_idx").on(table.newsId, table.userId)]
);

export type NewsReaction = typeof newsReactionsTable.$inferSelect;
