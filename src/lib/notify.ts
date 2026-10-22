// Server-only — never import in Client Components.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/config";
import { notificationsTable, type Notification } from "@/db/schema";

// Called by the domain `set*Status` actions after an admin changes a submission's status.
// `subject` completes "Your <subject> is now <status>.", e.g. `Barangay Clearance request`.
// `followerIds` (complaint followers) get "A <subject> you're following is now <status>." instead.
// Skipped when the status didn't actually change, and never sent to the admin making the change
// (admins can submit court reservations and businesses too).
export async function notifyStatusChange({
  userId,
  followerIds = [],
  actorId,
  type,
  referenceId,
  subject,
  previousStatus,
  status,
}: {
  userId: string;
  followerIds?: string[];
  actorId: string;
  type: Notification["type"];
  referenceId: number;
  subject: string;
  previousStatus: string;
  status: string;
}) {
  if (previousStatus === status) return;

  const recipients = [
    { userId, message: `Your ${subject} is now ${status}.` },
    ...followerIds.map((followerId) => ({
      userId: followerId,
      message: `A ${subject} you're following is now ${status}.`,
    })),
  ].filter((recipient) => recipient.userId !== actorId);
  if (recipients.length === 0) return;

  await db
    .insert(notificationsTable)
    .values(recipients.map((recipient) => ({ ...recipient, type, referenceId, status })));
}

// Called by the domain delete actions, since `referenceId` has no FK to cascade from. Pass
// `userId` to only delete that user's (e.g. when they unfollow a complaint).
export async function deleteNotificationsFor(type: Notification["type"], referenceId: number, userId?: string) {
  await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.type, type),
        eq(notificationsTable.referenceId, referenceId),
        userId ? eq(notificationsTable.userId, userId) : undefined
      )
    );
}
