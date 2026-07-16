"use server";

import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/config";
import {
  businessesTable,
  complaintsTable,
  courtReservationsTable,
  deletedUsersTable,
  documentRequestsTable,
  newsCommentsTable,
  newsReactionsTable,
  newsTable,
  residentProfilesTable,
  transparencyProjectCommentsTable,
  transparencyProjectReactionsTable,
  transparencyProjectsTable,
  userSnapshotsTable,
} from "@/db/schema";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { bucket, r2 } from "@/lib/r2";
import type { MediaItem } from "@/components/file-uploader";

const USERS_PAGE_SIZE = 20;
// Role isn't a queryable Clerk field, so filtering by role scans raw batches of this
// size (in `createdAt` order) until a full page of matches is collected.
const ROLE_SCAN_BATCH_SIZE = 50;

export type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  imageUrl: string;
  role: string;
  banned: boolean;
  createdAt: number;
};

export type UsersPage = {
  items: ManagedUser[];
  nextOffset: number | null;
};

function toManagedUser(user: User): ManagedUser {
  return {
    id: user.id,
    fullName:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Unknown",
    email:
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "—",
    imageUrl: user.imageUrl,
    role: (user.publicMetadata?.role as string | undefined) ?? "resident",
    banned: user.banned,
    createdAt: user.createdAt,
  };
}

export async function getUsers({
  offset = 0,
  search,
  role,
}: {
  offset?: number;
  search?: string;
  role?: string;
} = {}): Promise<UsersPage> {
  const client = await clerkClient();
  const query = search?.trim() || undefined;

  if (!role || role === "all") {
    const { data: users, totalCount } = await client.users.getUserList({
      limit: USERS_PAGE_SIZE,
      offset,
      orderBy: "-created_at",
      query,
    });

    return {
      items: users.map(toManagedUser),
      nextOffset: offset + users.length < totalCount ? offset + users.length : null,
    };
  }

  // Scan raw pages (Clerk still applies `query` server-side) and filter by role in
  // memory, since Clerk can't filter on publicMetadata directly.
  const items: ManagedUser[] = [];
  let cursor = offset;

  while (items.length < USERS_PAGE_SIZE) {
    const { data: users, totalCount } = await client.users.getUserList({
      limit: ROLE_SCAN_BATCH_SIZE,
      offset: cursor,
      orderBy: "-created_at",
      query,
    });

    cursor += users.length;
    for (const user of users) {
      const userRole = (user.publicMetadata?.role as string | undefined) ?? "resident";
      if (userRole === role) items.push(toManagedUser(user));
    }

    if (users.length === 0 || cursor >= totalCount) {
      return { items, nextOffset: null };
    }
  }

  return { items, nextOffset: cursor };
}

// Clerk's Backend API caps list requests at 500 per page, so counting by role
// (not a queryable field) means scanning every user in batches of this size.
const STATS_SCAN_BATCH_SIZE = 500;

export type UserStats = {
  residents: number;
  admins: number;
};

export async function getUserStats(): Promise<UserStats> {
  await requireAdmin();

  const client = await clerkClient();
  let residents = 0;
  let admins = 0;
  let cursor = 0;

  while (true) {
    const { data: users, totalCount } = await client.users.getUserList({
      limit: STATS_SCAN_BATCH_SIZE,
      offset: cursor,
    });

    for (const user of users) {
      const role = (user.publicMetadata?.role as string | undefined) ?? "resident";
      if (role === "admin" || role === "superadmin") {
        admins++;
      } else {
        residents++;
      }
    }

    cursor += users.length;
    if (users.length === 0 || cursor >= totalCount) break;
  }

  return { residents, admins };
}

export async function updateUserRole(userId: string, role: "admin" | "superadmin" | null) {
  await requireSuperAdmin();

  const client = await clerkClient();
  // Residents have no `role` key at all, so passing `null` removes it from
  // publicMetadata rather than writing a literal "resident" string.
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });
}

export async function setUserBanned(userId: string, banned: boolean) {
  const authUserId = await requireAdmin();
  if (authUserId === userId) throw new Error("You cannot ban your own account.");

  const client = await clerkClient();
  if (banned) {
    await client.users.banUser(userId);
  } else {
    await client.users.unbanUser(userId);
  }
}

export async function deleteUser(userId: string) {
  const authUserId = await requireSuperAdmin();
  if (authUserId === userId) throw new Error("You cannot delete your own account.");

  const client = await clerkClient();
  await client.users.deleteUser(userId);
}

const DELETED_USERS_PAGE_SIZE = 20;

export type DeletedManagedUser = {
  id: number;
  userId: string;
  fullName: string;
  email: string;
  role: string | null;
  joinedAt: number;
  deletedAt: number;
};

export type DeletedUsersPage = {
  items: DeletedManagedUser[];
  nextOffset: number | null;
};

export async function getDeletedUsers({
  offset = 0,
  search,
}: {
  offset?: number;
  search?: string;
} = {}): Promise<DeletedUsersPage> {
  await requireAdmin();

  const query = search?.trim();
  const whereClause = query
    ? or(ilike(deletedUsersTable.fullName, `%${query}%`), ilike(deletedUsersTable.email, `%${query}%`))
    : undefined;

  const rows = await db
    .select()
    .from(deletedUsersTable)
    .where(whereClause)
    .orderBy(desc(deletedUsersTable.deletedAt))
    .limit(DELETED_USERS_PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = rows.length > DELETED_USERS_PAGE_SIZE;
  const items = rows.slice(0, DELETED_USERS_PAGE_SIZE).map((row) => ({
    id: row.id,
    userId: row.userId,
    fullName: row.fullName,
    email: row.email,
    role: row.role,
    joinedAt: row.joinedAt.getTime(),
    deletedAt: row.deletedAt.getTime(),
  }));

  return { items, nextOffset: hasMore ? offset + DELETED_USERS_PAGE_SIZE : null };
}

type MediaGroup = Omit<MediaItem, "file">[] | null | undefined;

function extractR2Keys(groups: MediaGroup[]): string[] {
  const keys: string[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      if (item.key) keys.push(item.key);
    }
  }
  return keys;
}

export async function deleteAllUserData(userId: string) {
  await requireSuperAdmin();

  const [news, documentRequests, complaints, transparencyProjects, businesses, courtReservations, residentProfile] =
    await Promise.all([
      db
        .select({ media: newsTable.media, attachments: newsTable.attachments })
        .from(newsTable)
        .where(eq(newsTable.authorId, userId)),
      db
        .select({
          paymentReceipt: documentRequestsTable.paymentReceipt,
          supportingDocuments: documentRequestsTable.supportingDocuments,
          pickupAttachments: documentRequestsTable.pickupAttachments,
          rejectionAttachments: documentRequestsTable.rejectionAttachments,
        })
        .from(documentRequestsTable)
        .where(eq(documentRequestsTable.requesterId, userId)),
      db
        .select({
          evidence: complaintsTable.evidence,
          resolutionAttachments: complaintsTable.resolutionAttachments,
          dismissalAttachments: complaintsTable.dismissalAttachments,
        })
        .from(complaintsTable)
        .where(eq(complaintsTable.complainantId, userId)),
      db
        .select({ media: transparencyProjectsTable.media, attachments: transparencyProjectsTable.attachments })
        .from(transparencyProjectsTable)
        .where(eq(transparencyProjectsTable.authorId, userId)),
      db
        .select({
          photos: businessesTable.photos,
          permit: businessesTable.permit,
          rejectionAttachments: businessesTable.rejectionAttachments,
        })
        .from(businessesTable)
        .where(eq(businessesTable.ownerId, userId)),
      db
        .select({
          gcashPayment: courtReservationsTable.gcashPayment,
          rejectionAttachments: courtReservationsTable.rejectionAttachments,
        })
        .from(courtReservationsTable)
        .where(eq(courtReservationsTable.requesterId, userId)),
      db
        .select({ validIdFront: residentProfilesTable.validIdFront, validIdBack: residentProfilesTable.validIdBack })
        .from(residentProfilesTable)
        .where(eq(residentProfilesTable.userId, userId)),
    ]);

  const keys = extractR2Keys([
    ...news.flatMap((row) => [row.media, row.attachments]),
    ...documentRequests.flatMap((row) => [
      row.paymentReceipt,
      row.supportingDocuments,
      row.pickupAttachments,
      row.rejectionAttachments,
    ]),
    ...complaints.flatMap((row) => [row.evidence, row.resolutionAttachments, row.dismissalAttachments]),
    ...transparencyProjects.flatMap((row) => [row.media, row.attachments]),
    ...businesses.flatMap((row) => [row.photos, row.permit, row.rejectionAttachments]),
    ...courtReservations.flatMap((row) => [row.gcashPayment, row.rejectionAttachments]),
    ...residentProfile.flatMap((row) => [row.validIdFront, row.validIdBack]),
  ]);

  await Promise.all([
    db.delete(newsTable).where(eq(newsTable.authorId, userId)),
    db.delete(newsReactionsTable).where(eq(newsReactionsTable.userId, userId)),
    db.delete(newsCommentsTable).where(eq(newsCommentsTable.userId, userId)),
    db.delete(residentProfilesTable).where(eq(residentProfilesTable.userId, userId)),
    db.delete(documentRequestsTable).where(eq(documentRequestsTable.requesterId, userId)),
    db.delete(complaintsTable).where(eq(complaintsTable.complainantId, userId)),
    db.delete(transparencyProjectsTable).where(eq(transparencyProjectsTable.authorId, userId)),
    db.delete(transparencyProjectReactionsTable).where(eq(transparencyProjectReactionsTable.userId, userId)),
    db.delete(transparencyProjectCommentsTable).where(eq(transparencyProjectCommentsTable.userId, userId)),
    db.delete(businessesTable).where(eq(businessesTable.ownerId, userId)),
    db.delete(courtReservationsTable).where(eq(courtReservationsTable.requesterId, userId)),
    db.delete(userSnapshotsTable).where(eq(userSnapshotsTable.userId, userId)),
    db.delete(deletedUsersTable).where(eq(deletedUsersTable.userId, userId)),
  ]);

  // R2 has no cascading delete, so orphaned objects are cleaned up last, after the
  // rows referencing them are gone; a failure here just leaves unreferenced objects
  // in the bucket rather than dangling DB references.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    );
  }
}
