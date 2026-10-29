import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  json,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import type { MediaItem } from "@/components/file-uploader";
import type { LocationValue } from "@/components/map-picker";
import { CIVIL_STATUS_OPTIONS, SEX_OPTIONS, VALID_ID_TYPES } from "@/schemas/resident-profile-schema";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  type ComplaintAiInsight,
} from "@/schemas/complaint-schema";
import { TRANSPARENCY_CATEGORIES } from "@/schemas/transparency-schema";
import { BUSINESS_CATEGORIES, BUSINESS_STATUSES, type OperatingHours } from "@/schemas/business-schema";
import { COURT_RESERVATION_STATUSES } from "@/schemas/court-reservation-schema";
import {
  barangayAddress,
  barangayEmail,
  barangayGoal,
  barangayHotline1,
  barangayHotline2,
  barangayMission,
  barangayVision,
  type ClearancePurposeFees,
} from "@/lib/data";
import { KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS } from "@/lib/ai-assistant/knowledge-base";
import type { AuditAction, AuditChange, AuditEntityType } from "@/lib/audit-logs";

export const newsCategoryEnum = pgEnum("news_category", ["Announcement", "Event", "Emergency"]);
export const newsReactionTypeEnum = pgEnum("news_reaction_type", ["like", "dislike"]);

export const newsTable = pgTable("news", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  category: newsCategoryEnum().notNull(),
  content: text().notNull(),
  media: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  attachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
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

export const officialSectionEnum = pgEnum("official_section", ["barangay", "sk"]);

export const officialsTable = pgTable("officials", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  section: officialSectionEnum().notNull(),
  name: varchar({ length: 255 }).notNull(),
  position: varchar({ length: 255 }).notNull(),
  photo: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  // Display order within the section, set by dragging in Barangay Settings.
  sortOrder: integer().notNull().default(0),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Official = typeof officialsTable.$inferSelect;

export const documentRequestTypeEnum = pgEnum("document_request_type", [
  "Barangay Clearance",
  "Certificate of Residency",
  "Certificate of No Objection",
  "Certificate of Indigency",
  "Solo Parent Certification",
  "Medical / Lab Assistance",
]);

export const documentRequestStatusEnum = pgEnum("document_request_status", [
  "Pending",
  "Processing",
  "Ready for Pickup",
  "Claimed",
  "Rejected",
]);

export const documentRequestsTable = pgTable("document_requests", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  documentType: documentRequestTypeEnum().notNull(),
  requesterId: varchar({ length: 255 }).notNull(),
  purpose: varchar({ length: 255 }).notNull(),
  otherPurpose: varchar({ length: 255 }),
  situationDescription: text(),
  paymentReceipt: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  supportingDocuments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  receiveVia: varchar({ length: 255 }).notNull(),
  // Only set for "Pickup at Barangay Hall".
  preferredClaimAt: timestamp(),
  status: documentRequestStatusEnum().notNull().default("Pending"),
  handlerId: varchar({ length: 255 }),
  pickupMessage: text(),
  pickupAttachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  rejectionReason: text(),
  rejectionAttachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  // Only set while the status is "Claimed".
  claimedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type DocumentRequest =typeof documentRequestsTable.$inferSelect;

export const complaintCategoryEnum = pgEnum("complaint_category", COMPLAINT_CATEGORIES);
export const complaintPriorityEnum = pgEnum("complaint_priority", COMPLAINT_PRIORITIES);
export const complaintStatusEnum = pgEnum("complaint_status", COMPLAINT_STATUSES);

export const complaintsTable = pgTable("complaints", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  complainantId: varchar({ length: 255 }).notNull(),
  subject: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  location: json().$type<LocationValue>().notNull(),
  evidence: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  category: complaintCategoryEnum().notNull(),
  priority: complaintPriorityEnum().notNull(),
  status: complaintStatusEnum().notNull().default("Pending"),
  handlerId: varchar({ length: 255 }),
  resolutionMessage: text(),
  resolutionAttachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  dismissalReason: text(),
  dismissalAttachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  aiInsight: json().$type<ComplaintAiInsight | null>(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Complaint = typeof complaintsTable.$inferSelect;

// Residents who confirmed, while filing, that an existing complaint is the same issue. The
// complaint shows up in their My Complaints (read-only, without the complainant's details) and
// they're notified of its status changes alongside the complainant.
export const complaintFollowersTable = pgTable(
  "complaint_followers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    complaintId: integer()
      .notNull()
      .references(() => complaintsTable.id, { onDelete: "cascade" }),
    userId: varchar({ length: 255 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("complaint_followers_complaint_id_user_id_idx").on(table.complaintId, table.userId),
  ]
);

export const transparencyCategoryEnum = pgEnum("transparency_category", TRANSPARENCY_CATEGORIES);

export const transparencyProjectsTable = pgTable("transparency_projects", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  category: transparencyCategoryEnum().notNull(),
  description: text().notNull(),
  budget: numeric({ precision: 12, scale: 2 }),
  location: json().$type<LocationValue | null>(),
  media: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  attachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  authorId: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type TransparencyProject = typeof transparencyProjectsTable.$inferSelect;

export const transparencyReactionTypeEnum = pgEnum("transparency_reaction_type", ["like", "dislike"]);

export const transparencyProjectReactionsTable = pgTable(
  "transparency_project_reactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer()
      .notNull()
      .references(() => transparencyProjectsTable.id, { onDelete: "cascade" }),
    userId: varchar({ length: 255 }).notNull(),
    type: transparencyReactionTypeEnum().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("transparency_project_reactions_project_id_user_id_idx").on(
      table.projectId,
      table.userId
    ),
  ]
);

export type TransparencyProjectReaction = typeof transparencyProjectReactionsTable.$inferSelect;

export const transparencyProjectCommentsTable = pgTable("transparency_project_comments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer()
    .notNull()
    .references(() => transparencyProjectsTable.id, { onDelete: "cascade" }),
  parentId: integer().references(
    (): AnyPgColumn => transparencyProjectCommentsTable.id,
    { onDelete: "cascade" }
  ),
  userId: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type TransparencyProjectComment = typeof transparencyProjectCommentsTable.$inferSelect;

export const businessCategoryEnum = pgEnum("business_category", BUSINESS_CATEGORIES);
export const businessStatusEnum = pgEnum("business_status", BUSINESS_STATUSES);

export const businessesTable = pgTable("businesses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  category: businessCategoryEnum().notNull(),
  contactNumber: varchar({ length: 20 }).notNull(),
  socialMediaLink: varchar({ length: 255 }),
  operatingHours: json().$type<OperatingHours>().notNull(),
  photos: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  permit: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  location: json().$type<LocationValue | null>(),
  ownerId: varchar({ length: 255 }).notNull(),
  status: businessStatusEnum().notNull().default("Pending"),
  handlerId: varchar({ length: 255 }),
  rejectionReason: text(),
  rejectionAttachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Business = typeof businessesTable.$inferSelect;

export const courtReservationStatusEnum = pgEnum("court_reservation_status", COURT_RESERVATION_STATUSES);

export const courtReservationsTable = pgTable("court_reservations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  requesterId: varchar({ length: 255 }).notNull(),
  date: date().notNull(),
  // Minutes after midnight (0-1439); the reservation runs for `durationHours` whole hours
  // from there and must end by midnight (see src/lib/court-reservations.ts).
  startTime: integer().notNull(),
  durationHours: integer().notNull(),
  purpose: varchar({ length: 255 }).notNull(),
  totalAmount: numeric({ precision: 10, scale: 2 }).notNull(),
  gcashPayment: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  status: courtReservationStatusEnum().notNull().default("Pending"),
  handlerId: varchar({ length: 255 }),
  rejectionReason: text(),
  rejectionAttachments: json().$type<Omit<MediaItem, "file">[]>().notNull().default([]),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type CourtReservation = typeof courtReservationsTable.$inferSelect;

export const notificationTypeEnum = pgEnum("notification_type", [
  "document-request",
  "community-hub",
  "court-reservation",
  "complaint",
]);

// Sent to a resident when an admin changes the status of one of their submissions or deletes
// it (see notifyStatusChange and notifyDeletion in src/lib/notify.ts). `referenceId` is the id
// of the row in the table matching `type`; it has no FK since it points at one of several
// tables, and a deleted submission's notifications are kept. `message` and `status` are
// snapshots taken when the notification was sent (`status` is "Deleted" for a deletion).
export const notificationsTable = pgTable(
  "notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar({ length: 255 }).notNull(),
    type: notificationTypeEnum().notNull(),
    referenceId: integer().notNull(),
    status: varchar({ length: 64 }).notNull(),
    message: text().notNull(),
    readAt: timestamp(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index("notifications_user_id_created_at_idx").on(table.userId, table.createdAt)]
);

export type Notification = typeof notificationsTable.$inferSelect;

// Mirror of Clerk users, kept in sync via the `user.created`/`user.updated` webhooks
// so a last-known snapshot is available when `user.deleted` fires (Clerk's delete
// webhook payload only contains the user id, nothing else). `deletedAt` is the
// status: null for live users, set when the user is deleted from Clerk.
export const userSnapshotsTable = pgTable("user_snapshots", {
  userId: varchar({ length: 255 }).primaryKey(),
  fullName: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  role: varchar({ length: 32 }),
  joinedAt: timestamp().notNull(),
  updatedAt: timestamp().notNull().defaultNow(),
  deletedAt: timestamp(),
});

export type UserSnapshot = typeof userSnapshotsTable.$inferSelect;

// The AI assistant's RAG knowledge base. Only one document is active at a time — admins
// replace it wholesale rather than managing a library, so `replaceKnowledgeBaseDocument`
// (src/actions/knowledge-base.ts) deletes the previous row (cascading its chunks) on upload.
export const knowledgeBaseDocumentsTable = pgTable("knowledge_base_documents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  fileName: varchar({ length: 255 }).notNull(),
  fileKey: varchar({ length: 512 }).notNull(),
  chunkCount: integer().notNull().default(0),
  uploadedBy: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type KnowledgeBaseDocument = typeof knowledgeBaseDocumentsTable.$inferSelect;

// Chunked text + pgvector embedding per document. Similarity is ranked in Postgres via
// drizzle-orm's cosineDistance() (see src/app/api/chat/route.ts) rather than in memory.
export const knowledgeBaseChunksTable = pgTable("knowledge_base_chunks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  documentId: integer()
    .notNull()
    .references(() => knowledgeBaseDocumentsTable.id, { onDelete: "cascade" }),
  chunkIndex: integer().notNull(),
  content: text().notNull(),
  embedding: vector({ dimensions: KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type KnowledgeBaseChunk = typeof knowledgeBaseChunksTable.$inferSelect;

// Singleton row (id is always 1) holding admin-editable barangay-wide config, e.g. the
// GCash number and per-purpose clearance fees shown on resident-facing request forms.
export const barangaySettingsTable = pgTable("barangay_settings", {
  id: integer().primaryKey().default(1),
  gcashNumber: varchar({ length: 20 }).notNull(),
  clearancePurposeFees: json().$type<ClearancePurposeFees>().notNull(),
  courtDayRate: integer().notNull(),
  courtNightRate: integer().notNull(),
  goal: text().notNull().default(barangayGoal),
  mission: text().notNull().default(barangayMission),
  vision: text().notNull().default(barangayVision),
  hotline1: varchar({ length: 20 }).notNull().default(barangayHotline1),
  // Empty when the barangay has only one hotline.
  hotline2: varchar({ length: 20 }).notNull().default(barangayHotline2),
  email: varchar({ length: 255 }).notNull().default(barangayEmail),
  address: text().notNull().default(barangayAddress),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type BarangaySettings = typeof barangaySettingsTable.$inferSelect;

export const themePreferenceEnum = pgEnum("theme_preference", ["light", "dark"]);

// Per-user portal settings keyed by Clerk userId. The theme is also kept in localStorage
// by next-themes; this row lets it follow the user across devices (see ThemePreferenceSync).
export const userPreferencesTable = pgTable("user_preferences", {
  userId: varchar({ length: 255 }).primaryKey(),
  theme: themePreferenceEnum().notNull().default("light"),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type ThemePreference = UserPreferences["theme"];

// Who changed what, written by logAudit (src/lib/audit.ts) after an admin's action and shown on
// the super admins' Audit Logs page. Entries are never edited or deleted, not with their record
// and not by deleteAllUserData, so `entityId` has no FK. `summary` and `changes` are snapshots
// taken when the action happened. `action` and `entityType` are plain varchar rather than enums
// so that logging a new kind of action doesn't need a DB change.
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    actorId: varchar({ length: 255 }).notNull(),
    // The actor's role at the time of the action.
    actorRole: varchar({ length: 32 }),
    action: varchar({ length: 32 }).$type<AuditAction>().notNull(),
    entityType: varchar({ length: 32 }).$type<AuditEntityType>().notNull(),
    // The record's id, or the Clerk userId for "user".
    entityId: varchar({ length: 255 }).notNull(),
    summary: text().notNull(),
    changes: json().$type<AuditChange[]>().notNull().default([]),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index("audit_logs_created_at_idx").on(table.createdAt)]
);

export type AuditLog = typeof auditLogsTable.$inferSelect;
