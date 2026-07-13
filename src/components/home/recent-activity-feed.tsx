"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityListItem from "@/components/home/activity-list-item";
import { getRecentActivityFeed } from "@/actions/home";
import { formatDateTime } from "@/lib/utils";

export default function RecentActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: getRecentActivityFeed,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No recent activity yet.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((item) => (
            <ActivityListItem
              key={item.id}
              kind={item.kind}
              title={item.title}
              subtitle={item.subtitle}
              href={item.href}
              meta={formatDateTime(new Date(item.createdAt))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
