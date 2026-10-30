"use server";

import { desc } from "drizzle-orm";
import { getAuthRole } from "@/lib/auth";
import { getAuditLogsWhere, withAuditActors, type AuditLogFilters, type AuditLogWithActor } from "@/lib/audit";
import { db } from "@/db/config";
import { auditLogsTable } from "@/db/schema";

const AUDIT_LOGS_PAGE_SIZE = 20;

export type AuditLogsPage = {
  items: AuditLogWithActor[];
  nextOffset: number | null;
};

export async function getAuditLogs({
  offset = 0,
  ...filters
}: AuditLogFilters & { offset?: number } = {}): Promise<AuditLogsPage> {
  // Admins can read their own entries, on their profile. Everything else is for super admins.
  const { userId, isAdmin, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");
  if (!isSuperAdmin && !(isAdmin && filters.actorId === userId)) throw new Error("Forbidden");

  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(await getAuditLogsWhere(filters))
    .orderBy(desc(auditLogsTable.createdAt), desc(auditLogsTable.id))
    .limit(AUDIT_LOGS_PAGE_SIZE)
    .offset(offset);

  if (logs.length === 0) return { items: [], nextOffset: null };

  return {
    items: await withAuditActors(logs),
    nextOffset: logs.length < AUDIT_LOGS_PAGE_SIZE ? null : offset + logs.length,
  };
}
