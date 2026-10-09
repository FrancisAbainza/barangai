"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationListItem from "@/components/notifications/notification-list-item";
import { getMyNotifications, getUnreadNotificationCount, markAllNotificationsRead } from "@/actions/notifications";
import { NOTIFICATION_TYPE_CONFIG, NOTIFICATION_TYPES } from "@/lib/notifications";
import type { Notification } from "@/db/schema";

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  ...NOTIFICATION_TYPES.map((type) => ({ value: type, label: NOTIFICATION_TYPE_CONFIG[type].label })),
];

export default function ResidentNotifications() {
  const [type, setType] = useState<Notification["type"] | "all">("all");
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["notifications", "list", { type }],
    queryFn: ({ pageParam }) => getMyNotifications({ offset: pageParam, type }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const notifications = data?.pages.flatMap((page) => page.items) ?? [];

  // Shared with the sidebar's unread badge, and counts across every type and page.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => getUnreadNotificationCount(),
  });

  const { mutate: markAllRead, isPending: isMarkingAllRead } = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("Failed to mark notifications as read. Please try again."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => markAllRead()} disabled={unreadCount === 0 || isMarkingAllRead}>
          <CheckCheck />
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-18 w-full rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <Bell className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be notified here when the status of your requests changes.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationListItem key={notification.id} notification={notification} />
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
