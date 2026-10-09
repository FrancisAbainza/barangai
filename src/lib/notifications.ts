import type { Notification } from "@/db/schema";
import { VIEW_SEARCH_PARAM } from "@/hooks/use-view-param";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";

export const NOTIFICATION_TYPE_CONFIG = {
  "document-request": { label: "Document Request", page: "document-request" },
  "community-hub": { label: "Community Hub", page: "community-hub" },
  "court-reservation": { label: "Court Reservation", page: "court-reservation" },
  complaint: { label: "Complaint", page: "complaint" },
} as const satisfies Record<Notification["type"], { label: string; page: PortalNavigationTargetId }>;

export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_CONFIG) as Notification["type"][];

// The submission's page with `?view=<id>`, which opens its Submission Info dialog on arrival.
export function getNotificationHref({ type, referenceId }: Pick<Notification, "type" | "referenceId">) {
  const { href } = PORTAL_NAVIGATION_TARGETS[NOTIFICATION_TYPE_CONFIG[type].page];
  return `${href}?${VIEW_SEARCH_PARAM}=${referenceId}`;
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
