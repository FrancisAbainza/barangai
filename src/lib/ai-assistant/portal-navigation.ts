// Every portal page the AI assistant's buttons go to. Shared between the residents' and the
// admins' navigateToPage tools (tools/resident/navigate-to-page.ts and tools/admin/navigate-to-page.ts),
// which each list the pages their role can open (src/proxy.ts keeps the user out of the others)
// and what each is for, and the navigation button the chat panel renders for their result
// (src/components/ai-assistant/chat-panel.tsx).
export const PORTAL_NAVIGATION_TARGETS = {
  "document-request": {
    label: "Document Request",
    href: "/portal/document-request",
  },
  complaint: {
    label: "Complaint",
    href: "/portal/complaint",
  },
  "court-reservation": {
    label: "Court Reservation",
    href: "/portal/court-reservation",
  },
  "community-hub": {
    label: "Community Hub",
    href: "/portal/community-hub",
  },
  news: {
    label: "News & Announcements",
    href: "/portal/news",
  },
  transparency: {
    label: "Transparency",
    href: "/portal/transparency",
  },
  "about-us": {
    label: "About Us",
    href: "/portal/about-us",
  },
  notifications: {
    label: "Notifications",
    href: "/portal/notifications",
  },
  "user-management": {
    label: "User Management",
    href: "/portal/user-management",
  },
  "barangay-settings": {
    label: "Barangay Settings",
    href: "/portal/barangay-settings",
  },
  "audit-logs": {
    label: "Audit Logs",
    href: "/portal/audit-logs",
  },
} as const satisfies Record<string, { label: string; href: string }>;

export type PortalNavigationTargetId = keyof typeof PORTAL_NAVIGATION_TARGETS;
