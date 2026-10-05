// Shared between the AI assistant's navigateToPage tool (src/lib/ai-assistant.ts,
// which needs it for the tool's input schema/description) and the navigation
// button the chat panel renders for its result (src/components/ai-assistant/chat-panel.tsx).
export const PORTAL_NAVIGATION_TARGETS = {
  "document-request": {
    label: "Document Request",
    href: "/portal/document-request",
    description: "Request barangay documents such as clearances, certificates, or permits.",
    adminOnly: false,
  },
  complaint: {
    label: "Complaint",
    href: "/portal/complaint",
    description: "File a complaint or report an issue to the barangay.",
    adminOnly: false,
  },
  "court-reservation": {
    label: "Court Reservation",
    href: "/portal/court-reservation",
    description: "Reserve the barangay court for an event or activity.",
    adminOnly: false,
  },
  "community-hub": {
    label: "Community Hub",
    href: "/portal/community-hub",
    description: "Browse community marketplace listings and services offered by residents.",
    adminOnly: false,
  },
  news: {
    label: "News & Announcements",
    href: "/portal/news",
    description: "View barangay news and announcements.",
    adminOnly: false,
  },
  transparency: {
    label: "Transparency",
    href: "/portal/transparency",
    description: "View barangay financial transparency reports.",
    adminOnly: false,
  },
  "about-us": {
    label: "About Us",
    href: "/portal/about-us",
    description: "Learn about the barangay's officials, mission, and vision.",
    adminOnly: false,
  },
  "user-management": {
    label: "User Management",
    href: "/portal/user-management",
    description: "Manage resident and admin accounts.",
    adminOnly: true,
  },
} as const satisfies Record<
  string,
  { label: string; href: string; description: string; adminOnly: boolean }
>;

export type PortalNavigationTargetId = keyof typeof PORTAL_NAVIGATION_TARGETS;
