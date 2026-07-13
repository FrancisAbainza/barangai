"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityListItem from "@/components/home/activity-list-item";
import { getNeedsAttentionQueue } from "@/actions/home";
import { formatDateTime } from "@/lib/utils";

const BADGE_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  Urgent: "destructive",
  High: "default",
  Medium: "outline",
  Low: "outline",
  Pending: "outline",
  Processing: "secondary",
  "In Progress": "secondary",
};

export default function NeedsAttentionQueue() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-needs-attention"],
    queryFn: getNeedsAttentionQueue,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Needs Attention</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <CircleCheck className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">All caught up</p>
          <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
        </div>
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
              badge={{ label: item.badge, variant: BADGE_VARIANT[item.badge] ?? "outline" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
