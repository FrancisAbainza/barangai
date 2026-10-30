// Server-only — never import in Client Components.
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { DELETED_USER_DISPLAY_INFO, getUserDisplayInfoMap } from "@/lib/clerk-users";
import { db } from "@/db/config";
import { auditLogsTable, userSnapshotsTable, type AuditLog } from "@/db/schema";
import type { AuditAction, AuditChange, AuditEntityType } from "@/lib/audit-logs";

export type AuditLogWithActor = AuditLog & {
  actorName: string;
  actorEmail: string;
};

export type AuditLogFilters = {
  search?: string;
  entityType?: AuditEntityType | "all";
  // Narrows the list to one record of `entityType`, for the Audit Logs in its actions menu.
  entityId?: string | number;
  // Narrows the list to one admin's actions, for the Audit Logs on their profile.
  actorId?: string;
  action?: AuditAction | "all";
  // Philippine calendar days, as "YYYY-MM-DD".
  dateFrom?: string;
  dateTo?: string;
};

// The WHERE clause for the entries matching `filters`, shared by getAuditLogs (the Audit Logs page)
// and the AI assistant's findAuditLogs, so both find the same entries.
export async function getAuditLogsWhere({
  search,
  entityType,
  entityId,
  actorId,
  action,
  dateFrom,
  dateTo,
}: AuditLogFilters) {
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
  // Philippine days whatever the server's time zone. `new Date("YYYY-MM-DD")` reads the date as UTC
  // midnight, 8 hours into the Philippine day, so "From" left out that day's early-morning entries.
  if (dateFrom) {
    conditions.push(gte(auditLogsTable.createdAt, new Date(`${dateFrom}T00:00:00+08:00`)));
  }
  if (dateTo) {
    conditions.push(lte(auditLogsTable.createdAt, new Date(`${dateTo}T23:59:59.999+08:00`)));
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

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// Who did each action. Actor display info lives in Clerk. An admin deleted since then falls back to
// their last snapshot (see the Clerk webhook), so their past actions still show who did them. Has
// every ID in `actorIds`.
export async function getAuditActors(actorIds: string[]) {
  const uniqueIds = [...new Set(actorIds)];
  const displayMap = await getUserDisplayInfoMap(uniqueIds);
  const deletedActorIds = uniqueIds.filter((id) => !displayMap.has(id));
  const snapshots =
    deletedActorIds.length > 0
      ? await db
          .select()
          .from(userSnapshotsTable)
          .where(inArray(userSnapshotsTable.userId, deletedActorIds))
      : [];
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.userId, snapshot]));

  return new Map(
    uniqueIds.map((id) => {
      const info = displayMap.get(id);
      const snapshot = snapshotMap.get(id);
      return [
        id,
        {
          actorName:
            info?.fullName ??
            (snapshot ? `${snapshot.fullName} (deleted)` : DELETED_USER_DISPLAY_INFO.fullName),
          actorEmail: info?.email ?? snapshot?.email ?? DELETED_USER_DISPLAY_INFO.email,
        },
      ];
    })
  );
}

export async function withAuditActors(logs: AuditLog[]): Promise<AuditLogWithActor[]> {
  const actors = await getAuditActors(logs.map((log) => log.actorId));
  return logs.map((log) => ({ ...log, ...actors.get(log.actorId)! }));
}

// Records an admin's action on the Audit Logs page, with the signed-in user as the actor. Called
// by the server actions after their change is saved. `summary` is the entry's one-line
// description, e.g. `Changed DR-12 (Barangay Clearance) from Pending to Rejected`.
export async function logAudit({
  action,
  entityType,
  entityId,
  summary,
  changes = [],
}: {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | number;
  summary: string;
  changes?: AuditChange[];
}) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return;

  await db.insert(auditLogsTable).values({
    actorId: userId,
    actorRole: sessionClaims?.metadata?.role ?? null,
    action,
    entityType,
    entityId: String(entityId),
    summary,
    changes,
  });
}

function toAuditValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

// The fields in `labels` whose values differ between `before` and `after`, as changes for logAudit.
// Pass `{}` as `after` to keep a deleted record's values. Only the labeled fields are compared,
// which leaves out media and bookkeeping columns, so label plain values (text, numbers, booleans).
export function getAuditChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>
): AuditChange[] {
  return Object.entries(labels)
    .map(([field, label]) => ({ label, from: toAuditValue(before[field]), to: toAuditValue(after[field]) }))
    .filter((change) => change.from !== change.to);
}
