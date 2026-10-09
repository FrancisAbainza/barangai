"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText, MessageSquareWarning, SportShoe, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { markNotificationRead } from "@/actions/notifications";
import { formatRelativeTime, getNotificationHref, NOTIFICATION_TYPE_CONFIG } from "@/lib/notifications";
import { statusBadgeVariant as documentRequestBadgeVariant } from "@/lib/document-requests";
import { statusBadgeVariant as businessBadgeVariant } from "@/lib/business";
import { statusBadgeVariant as courtReservationBadgeVariant } from "@/lib/court-reservations";
import { statusBadgeVariant as complaintBadgeVariant } from "@/lib/complaints";
import { cn } from "@/lib/utils";
import type { Business, Complaint, CourtReservation, DocumentRequest, Notification } from "@/db/schema";

const TYPE_ICONS = {
  "document-request": FileText,
  "community-hub": Store,
  "court-reservation": SportShoe,
  complaint: MessageSquareWarning,
} as const satisfies Record<Notification["type"], unknown>;

// `status` is stored as text, but it always holds a value of the matching domain's status enum.
function statusBadgeVariant({ type, status }: Notification) {
  switch (type) {
    case "document-request":
      return documentRequestBadgeVariant(status as DocumentRequest["status"]);
    case "community-hub":
      return businessBadgeVariant(status as Business["status"]);
    case "court-reservation":
      return courtReservationBadgeVariant(status as CourtReservation["status"]);
    case "complaint":
      return complaintBadgeVariant(status as Complaint["status"]);
  }
}

export default function NotificationListItem({ notification }: { notification: Notification }) {
  const queryClient = useQueryClient();
  const Icon = TYPE_ICONS[notification.type];
  const isUnread = notification.readAt === null;

  const { mutate: markRead } = useMutation({
    mutationFn: () => markNotificationRead(notification.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Link
      href={getNotificationHref(notification)}
      onClick={() => isUnread && markRead()}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/50",
        isUnread && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-sm", isUnread ? "font-semibold" : "font-medium")}>
            {NOTIFICATION_TYPE_CONFIG[notification.type].label}
          </p>
          <Badge variant={statusBadgeVariant(notification)} className="shrink-0">
            {notification.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
      </div>
      {isUnread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
