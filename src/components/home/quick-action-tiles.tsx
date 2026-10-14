"use client";

import Link from "next/link";
import { ShortcutTileContent, shortcutTileClassName } from "@/components/shortcut-tile";
import {
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
        {quickActions.map(({ title, description, href, icon }) => (
          <Link
            key={href}
            href={href}
            className={shortcutTileClassName}
          >
            <ShortcutTileContent icon={icon} title={title} description={description} />
          </Link>
        ))}
      </div>
    </div>
  );
}
