"use client";

import Link from "next/link";
import {
  ChevronRight,
  Eye,
  FileText,
  Megaphone,
  MessageSquareWarning,
  SportShoe,
  Store,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const quickActions: QuickAction[] = [
  {
    title: "Request a Document",
    description: "Apply for barangay certificates and clearances.",
    href: "/portal/document-request",
    icon: FileText,
  },
  {
    title: "File a Complaint",
    description: "Report and track community concerns.",
    href: "/portal/complaint",
    icon: MessageSquareWarning,
  },
  {
    title: "Reserve the Court",
    description: "Book the barangay sports court.",
    href: "/portal/court-reservation",
    icon: SportShoe,
  },
  {
    title: "Community Hub",
    description: "Discover and register local businesses.",
    href: "/portal/community-hub",
    icon: Store,
  },
  {
    title: "News & Announcements",
    description: "Catch up on barangay updates and events.",
    href: "/portal/news",
    icon: Megaphone,
  },
  {
    title: "Transparency",
    description: "View barangay projects and budget reports.",
    href: "/portal/transparency",
    icon: Eye,
  },
];

export default function QuickActionTiles() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {quickActions.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50"
          >
            <div className="flex w-full items-start justify-between">
              <Icon className="size-7 text-primary" />
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
            <p className="font-semibold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
