// Server-only — never import in Client Components.
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { auditLogsTable } from "@/db/schema";
import type { AuditAction, AuditChange, AuditEntityType } from "@/lib/audit-logs";

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
