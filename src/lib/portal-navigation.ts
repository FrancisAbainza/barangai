// Shared between the AI assistant's navigateToPage tool (src/lib/ai-assistant.ts,
// which needs it for the tool's input schema/description) and the navigation
// button the chat panel renders for its result (src/components/ai-assistant/chat-panel.tsx).
//
// `audience` is who can open the page (enforced in src/proxy.ts by `isAdminRoute` and
// `isResidentOnlyRoute`), so the assistant is only offered pages the user can reach.
export const PORTAL_NAVIGATION_TARGETS = {
  "document-request": {
    label: "Document Request",
    href: "/portal/document-request",
    description: "Request barangay documents such as clearances, certificates, or permits.",
    audience: "all",
  },
  complaint: {
    label: "Complaint",
    href: "/portal/complaint",
    description: "File a complaint or report an issue to the barangay.",
    audience: "all",
  },
  "court-reservation": {
    label: "Court Reservation",
    href: "/portal/court-reservation",
    description: "Reserve the barangay court for an event or activity.",
    audience: "all",
  },
  "community-hub": {
    label: "Community Hub",
    href: "/portal/community-hub",
    description: "Browse community marketplace listings and services offered by residents.",
    audience: "all",
  },
  news: {
    label: "News & Announcements",
    href: "/portal/news",
    description: "View barangay news and announcements.",
    audience: "all",
  },
  transparency: {
    label: "Transparency",
    href: "/portal/transparency",
    description: "View barangay financial transparency reports.",
    audience: "all",
  },
  "about-us": {
    label: "About Us",
    href: "/portal/about-us",
    description: "Learn about the barangay's officials, mission, and vision.",
    audience: "all",
  },
  notifications: {
    label: "Notifications",
    href: "/portal/notifications",
    description:
      "View updates on the status of your document requests, community hub businesses, court reservations, and complaints.",
    audience: "resident",
  },
  "user-management": {
    label: "User Management",
    href: "/portal/user-management",
    description: "Manage resident and admin accounts.",
    audience: "admin",
  },
  "barangay-settings": {
    label: "Barangay Settings",
    href: "/portal/barangay-settings",
    description:
      "Manage document request pricing (GCash number and clearance fees), court reservation fees, the barangay mission and vision, and the barangay and SK officials.",
    audience: "admin",
  },
} as const satisfies Record<
  string,
  { label: string; href: string; description: string; audience: "resident" | "admin" | "all" }
>;

export type PortalNavigationTargetId = keyof typeof PORTAL_NAVIGATION_TARGETS;

export function isPortalNavigationTargetAvailable(id: PortalNavigationTargetId, isAdmin: boolean): boolean {
  const { audience } = PORTAL_NAVIGATION_TARGETS[id];
  return audience === "all" || audience === (isAdmin ? "admin" : "resident");
}
