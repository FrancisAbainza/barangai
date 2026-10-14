"use client";

import Link from "next/link";
import { ShortcutTileContent, shortcutTileClassName } from "@/components/shortcut-tile";
import {
  FileText,
  Megaphone,
  MessageSquareWarning,
  SportShoe,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

interface ManagementShortcut {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const managementShortcuts: ManagementShortcut[] = [
  {
    title: "User Management",
    description: "Manage residents, roles, and permissions.",
    href: "/portal/user-management",
    icon: Users,
  },
  {
    title: "Document Requests",
    description: "Review and process certificate requests.",
    href: "/portal/document-request",
    icon: FileText,
  },
  {
    title: "Complaints",
    description: "Triage and resolve resident complaints.",
    href: "/portal/complaint",
    icon: MessageSquareWarning,
  },
  {
    title: "Court Reservations",
    description: "Approve or reject court bookings.",
    href: "/portal/court-reservation",
    icon: SportShoe,
  },
  {
    title: "Community Hub",
    description: "Verify local business submissions.",
    href: "/portal/community-hub",
    icon: Store,
  },
  {
    title: "News & Announcements",
    description: "Publish updates for residents.",
    href: "/portal/news",
    icon: Megaphone,
  },
];

export default function ManagementShortcuts() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Management Shortcuts</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {managementShortcuts.map(({ title, description, href, icon }) => (
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
