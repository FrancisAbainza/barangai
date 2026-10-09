"use server";

import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/config";
import { notificationsTable, type Notification } from "@/db/schema";

const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationsPage = {
  items: Notification[];
  nextOffset: number | null;
};

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export async function getMyNotifications({
  offset = 0,
  type = "all",
}: {
  offset?: number;
  type?: Notification["type"] | "all";
} = {}): Promise<NotificationsPage> {
  const userId = await requireUserId();

  const conditions = [eq(notificationsTable.userId, userId)];
  if (type !== "all") conditions.push(eq(notificationsTable.type, type));

  const items = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt), desc(notificationsTable.id))
    .limit(NOTIFICATIONS_PAGE_SIZE)
    .offset(offset);

  return {
    items,
    nextOffset: items.length < NOTIFICATIONS_PAGE_SIZE ? null : offset + items.length,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const userId = await requireUserId();

  const [result] = await db
    .select({ count: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));

  return result?.count ?? 0;
}

export async function markNotificationRead(id: number) {
  const userId = await requireUserId();

  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.userId, userId),
        isNull(notificationsTable.readAt)
      )
    );
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();

  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
}
