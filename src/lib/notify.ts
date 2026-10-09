// Server-only — never import in Client Components.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/config";
import { notificationsTable, type Notification } from "@/db/schema";

// Called by the domain `set*Status` actions after an admin changes a submission's status.
// `subject` completes "Your <subject> is now <status>.", e.g. `Barangay Clearance request`.
// Skipped when the status didn't actually change, or when the admin is acting on their own
// submission (admins can submit court reservations and businesses too).
export async function notifyStatusChange({
  userId,
  actorId,
  type,
  referenceId,
  subject,
  previousStatus,
  status,
}: {
  userId: string;
  actorId: string;
  type: Notification["type"];
  referenceId: number;
  subject: string;
  previousStatus: string;
  status: string;
}) {
  if (previousStatus === status || userId === actorId) return;

  await db.insert(notificationsTable).values({
    userId,
    type,
    referenceId,
    status,
    message: `Your ${subject} is now ${status}.`,
  });
}

// Called by the domain delete actions, since `referenceId` has no FK to cascade from.
export async function deleteNotificationsFor(type: Notification["type"], referenceId: number) {
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.type, type), eq(notificationsTable.referenceId, referenceId)));
}
