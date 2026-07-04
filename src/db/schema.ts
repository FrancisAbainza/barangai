import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { MediaItem } from "@/components/media-uploader";
import type { AttachmentItem } from "@/components/attachment-picker";
import { CIVIL_STATUS_OPTIONS, SEX_OPTIONS, VALID_ID_TYPES } from "@/schemas/resident-profile-schema";

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

export const newsCommentsTable = pgTable("news_comments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  newsId: integer()
    .notNull()
    .references(() => newsTable.id, { onDelete: "cascade" }),
  parentId: integer().references((): AnyPgColumn => newsCommentsTable.id, { onDelete: "cascade" }),
  userId: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type NewsComment = typeof newsCommentsTable.$inferSelect;

export const residentSexEnum = pgEnum("resident_sex", SEX_OPTIONS);
export const residentCivilStatusEnum = pgEnum("resident_civil_status", CIVIL_STATUS_OPTIONS);
export const residentValidIdTypeEnum = pgEnum("resident_valid_id_type", VALID_ID_TYPES);

export const residentProfilesTable = pgTable("resident_profiles", {
  userId: varchar({ length: 255 }).primaryKey(),
  firstName: varchar({ length: 255 }).notNull(),
  middleName: varchar({ length: 255 }),
  lastName: varchar({ length: 255 }).notNull(),
  birthdate: date().notNull(),
  sex: residentSexEnum().notNull(),
  civilStatus: residentCivilStatusEnum().notNull(),
  contactNumber: varchar({ length: 20 }).notNull(),
  address: text().notNull(),
  validIdType: residentValidIdTypeEnum().notNull(),
  validIdFront: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  validIdBack: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type ResidentProfile = typeof residentProfilesTable.$inferSelect;
