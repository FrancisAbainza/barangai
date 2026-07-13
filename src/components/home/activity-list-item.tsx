"use client";

import Link from "next/link";
import { ChevronRight, FileText, Megaphone, MessageSquareWarning, SportShoe, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ACTIVITY_KIND_CONFIG = {
  "document-request": { icon: FileText, label: "Document Request" },
  complaint: { icon: MessageSquareWarning, label: "Complaint" },
  "court-reservation": { icon: SportShoe, label: "Court Reservation" },
  business: { icon: Store, label: "Business" },
  news: { icon: Megaphone, label: "News" },
} as const;

export type ActivityKind = keyof typeof ACTIVITY_KIND_CONFIG;

interface ActivityListItemProps {
  kind: ActivityKind;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  badge?: { label: string; variant: "default" | "destructive" | "outline" | "secondary" };
}

export default function ActivityListItem({ kind, title, subtitle, meta, href, badge }: ActivityListItemProps) {
  const { icon: Icon, label } = ACTIVITY_KIND_CONFIG[kind];

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          {badge && (
            <Badge variant={badge.variant} className="shrink-0">
              {badge.label}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {label} &middot; {subtitle} &middot; {meta}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
