import type { Notification } from "@/db/schema";
import { getSubmissionDialogHref } from "@/lib/ai-assistant/portal-dialogs";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";

export const NOTIFICATION_TYPE_CONFIG = {
  "document-request": { label: "Document Request", page: "document-request" },
  "community-hub": { label: "Community Hub", page: "community-hub" },
  "court-reservation": { label: "Court Reservation", page: "court-reservation" },
  complaint: { label: "Complaint", page: "complaint" },
} as const satisfies Record<Notification["type"], { label: string; page: PortalNavigationTargetId }>;

export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_CONFIG) as Notification["type"][];

// Read notifications are deleted this many days after being read (see getMyNotifications).
export const READ_NOTIFICATION_RETENTION_DAYS = 30;

// The `status` of the notification sent when a submission is deleted (see notifyDeletion in
// src/lib/notify.ts). Every other notification holds one of its domain's statuses.
export const DELETED_NOTIFICATION_STATUS = "Deleted";

// The submission's page with `?view=<id>`, which opens its Submission Info dialog on arrival,
// or just the page once the submission is deleted.
export function getNotificationHref({
  type,
  referenceId,
  status,
}: Pick<Notification, "type" | "referenceId" | "status">) {
  const { page } = NOTIFICATION_TYPE_CONFIG[type];
  return status === DELETED_NOTIFICATION_STATUS
    ? PORTAL_NAVIGATION_TARGETS[page].href
    : getSubmissionDialogHref(page, referenceId);
}

export function formatRelativeTime(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  if (Math.abs(seconds) >= 7 * 86400) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds) return formatter.format(Math.round(seconds / unitSeconds), unit);
  }
  return "just now";
}
