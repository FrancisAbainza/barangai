"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { getAuthRole } from "@/lib/auth";
import { DELETED_USER_DISPLAY_INFO, getUserDisplayInfoMap } from "@/lib/clerk-users";
import { db } from "@/db/config";
import { auditLogsTable, userSnapshotsTable, type AuditLog } from "@/db/schema";
import type { AuditAction, AuditEntityType } from "@/lib/audit-logs";

const AUDIT_LOGS_PAGE_SIZE = 20;

export type AuditLogWithActor = AuditLog & {
  actorName: string;
  actorEmail: string;
};

export type AuditLogsPage = {
  items: AuditLogWithActor[];
  nextOffset: number | null;
};

export async function getAuditLogs({
  offset = 0,
  search,
  entityType,
  entityId,
  actorId,
  action,
  dateFrom,
  dateTo,
}: {
  offset?: number;
  search?: string;
  entityType?: AuditEntityType | "all";
  // Narrows the list to one record of `entityType`, for the Audit Logs in its actions menu.
  entityId?: string | number;
  // Narrows the list to one admin's actions, for the Audit Logs on their profile.
  actorId?: string;
  action?: AuditAction | "all";
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<AuditLogsPage> {
  // Admins can read their own entries, on their profile. Everything else is for super admins.
  const { userId, isAdmin, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");
  if (!isSuperAdmin && !(isAdmin && actorId === userId)) throw new Error("Forbidden");

  const conditions = [];

  if (actorId) {
    conditions.push(eq(auditLogsTable.actorId, actorId));
  }
  if (entityType && entityType !== "all") {
    conditions.push(eq(auditLogsTable.entityType, entityType));
  }
  if (entityId !== undefined) {
    conditions.push(eq(auditLogsTable.entityId, String(entityId)));
  }
  if (action && action !== "all") {
    conditions.push(eq(auditLogsTable.action, action));
  }
  if (dateFrom) {
    conditions.push(gte(auditLogsTable.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogsTable.createdAt, end));
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    // The summary holds reference numbers, titles and the affected user's name. Admins' names live
    // in Clerk, so they're matched there and filtered down to the matched actor IDs.
    const client = await clerkClient();
    const { data: matchedUsers } = await client.users.getUserList({ query: trimmedSearch, limit: 100 });

    conditions.push(
      or(
        ilike(auditLogsTable.summary, `%${trimmedSearch}%`),
        matchedUsers.length > 0
          ? inArray(
              auditLogsTable.actorId,
              matchedUsers.map((user) => user.id)
            )
          : undefined
      )
    );
  }

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogsTable.createdAt), desc(auditLogsTable.id))
    .limit(AUDIT_LOGS_PAGE_SIZE)
    .offset(offset);

  if (logs.length === 0) return { items: [], nextOffset: null };

  // Actor display info lives in Clerk. An admin deleted since then falls back to their last
  // snapshot (see the Clerk webhook), so their past actions still show who did them.
  const actorIds = [...new Set(logs.map((log) => log.actorId))];
  const displayMap = await getUserDisplayInfoMap(actorIds);
  const deletedActorIds = actorIds.filter((id) => !displayMap.has(id));
  const snapshots =
    deletedActorIds.length > 0
      ? await db
          .select()
          .from(userSnapshotsTable)
          .where(inArray(userSnapshotsTable.userId, deletedActorIds))
      : [];
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.userId, snapshot]));

  return {
    items: logs.map((log) => {
      const info = displayMap.get(log.actorId);
      const snapshot = snapshotMap.get(log.actorId);
      return {
        ...log,
        actorName:
          info?.fullName ??
          (snapshot ? `${snapshot.fullName} (deleted)` : DELETED_USER_DISPLAY_INFO.fullName),
        actorEmail: info?.email ?? snapshot?.email ?? DELETED_USER_DISPLAY_INFO.email,
      };
    }),
    nextOffset: logs.length < AUDIT_LOGS_PAGE_SIZE ? null : offset + logs.length,
  };
}
