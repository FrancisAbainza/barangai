// Server-only — never import in Client Components.
import { and, eq } from "drizzle-orm";
import { db } from "@/db/config";
import { notificationsTable, type Notification } from "@/db/schema";
import { DELETED_NOTIFICATION_STATUS } from "@/lib/notifications";

type NotificationTarget = {
  userId: string;
  followerIds?: string[];
  actorId: string;
  type: Notification["type"];
  referenceId: number;
  subject: string;
};

// `subject` completes "Your <subject> <change>.", e.g. `Barangay Clearance request`.
// `followerIds` (complaint followers) get "A <subject> you're following <change>." instead.
// Never sent to the user making the change (admins can submit court reservations and businesses
// too, and residents can delete their own submissions).
async function notify(
  { userId, followerIds = [], actorId, type, referenceId, subject }: NotificationTarget,
  status: string,
  change: string
) {
  const recipients = [
    { userId, message: `Your ${subject} ${change}.` },
    ...followerIds.map((followerId) => ({
      userId: followerId,
      message: `A ${subject} you're following ${change}.`,
    })),
  ].filter((recipient) => recipient.userId !== actorId);
  if (recipients.length === 0) return;

  await db
    .insert(notificationsTable)
    .values(recipients.map((recipient) => ({ ...recipient, type, referenceId, status })));
}

// Called by the domain `set*Status` actions after an admin changes a submission's status.
// Skipped when the status didn't actually change.
export async function notifyStatusChange({
  previousStatus,
  status,
  ...target
}: NotificationTarget & { previousStatus: string; status: string }) {
  if (previousStatus === status) return;
  await notify(target, status, `is now ${status}`);
}

// Called by the domain delete actions. The submission's earlier notifications are kept, so the
// resident still sees its history (their `?view=<id>` links now open the page without a dialog).
export async function notifyDeletion(target: NotificationTarget) {
  await notify(target, DELETED_NOTIFICATION_STATUS, "was deleted");
}

// Called when a resident unfollows a complaint, which takes it out of their My Complaints.
export async function deleteNotificationsFor(type: Notification["type"], referenceId: number, userId: string) {
  await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.type, type),
        eq(notificationsTable.referenceId, referenceId),
        eq(notificationsTable.userId, userId)
      )
    );
}
