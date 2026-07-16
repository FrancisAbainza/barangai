"use server";

import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db/config";
import { deletedUsersTable } from "@/db/schema";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";

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
