// Who can open a page, as the AI assistant sees it. Super admins can also open every admin page.
export type PortalAudience = "resident" | "admin" | "superAdmin";

// Every portal page the AI assistant links to. `for` says what the page is for in each role's view,
// and leaves out the roles that can't open it (src/proxy.ts keeps them out). The system prompt
// lists the pages the user's role can open, and names the others so the model doesn't link the
// closest one instead (lib/ai-assistant/system-prompt.ts). The chat panel shows a link to any of
// them as a button (components/ai-assistant/chat-panel.tsx).
export const PORTAL_NAVIGATION_TARGETS = {
  "document-request": {
    label: "Document Request",
    href: "/portal/document-request",
    for: {
      resident: "Request barangay documents such as clearances, certificates, or permits.",
      admin: "Review and process residents' document requests. Its filters can show only the ones the user is handling.",
    },
  },
  complaint: {
    label: "Complaint",
    href: "/portal/complaint",
    for: {
      resident: "File a complaint or report an issue to the barangay.",
      admin: "Review and resolve residents' complaints. Its filters can show only the ones the user is handling.",
    },
  },
  "court-reservation": {
    label: "Court Reservation",
    href: "/portal/court-reservation",
    for: {
      resident: "Reserve the barangay court for an event or activity.",
      admin:
        "Review residents' court reservations, or reserve the court. Its filters can show only the ones the user is handling.",
    },
  },
  "community-hub": {
    label: "Community Hub",
    href: "/portal/community-hub",
    for: {
      resident: "Browse community marketplace listings and services offered by residents.",
      admin:
        "Verify the businesses residents submit to the directory, or submit one. Its filters can show only the ones the user is handling, or their own.",
    },
  },
  news: {
    label: "News & Announcements",
    href: "/portal/news",
    for: {
      resident: "View barangay news and announcements.",
      admin: "View and post barangay news and announcements.",
    },
  },
  transparency: {
    label: "Transparency",
    href: "/portal/transparency",
    for: {
      resident: "View barangay financial transparency reports.",
      admin: "View and add the barangay's transparency projects.",
    },
  },
  "about-us": {
    label: "About Us",
    href: "/portal/about-us",
    for: {
      resident: "Learn about the barangay's officials, goal, mission, and vision.",
      admin: "Learn about the barangay's officials, goal, mission, and vision.",
    },
  },
  notifications: {
    label: "Notifications",
    href: "/portal/notifications",
    for: {
      resident:
        "View updates on the status of your document requests, community hub businesses, court reservations, and complaints.",
    },
  },
  analytics: {
    label: "Analytics",
    href: "/portal/analytics",
    for: {
      admin:
        "See a month's report with charts: how many document requests, complaints, court reservations, Community Hub businesses, news posts and new users there were, compared with the month before and over the last 12 months, broken down by status, type, category and priority, with the court's booked hours and fees.",
    },
  },
  "user-management": {
    label: "User Management",
    href: "/portal/user-management",
    for: {
      admin: "Manage resident and admin accounts.",
    },
  },
  "barangay-settings": {
    label: "Barangay Settings",
    href: "/portal/barangay-settings",
    for: {
      admin:
        "Manage document request pricing (GCash number and clearance fees), court reservation fees, the barangay goal, mission and vision, the barangay and SK officials, and the PDFs the AI assistant uses as its knowledge base.",
    },
  },
  "audit-logs": {
    label: "Audit Logs",
    href: "/portal/audit-logs",
    for: {
      superAdmin:
        "See the changes every admin made in the portal: who did what and when, with each field's value before and after. Its filters narrow them down by category, action, or date.",
    },
  },
} as const satisfies Record<string, { label: string; href: string; for: Partial<Record<PortalAudience, string>> }>;

export type PortalNavigationTargetId = keyof typeof PORTAL_NAVIGATION_TARGETS;

// What the page is for in the role's view, or undefined if the role can't open it.
export function describePortalPage(id: PortalNavigationTargetId, role: PortalAudience): string | undefined {
  const descriptions: Partial<Record<PortalAudience, string>> = PORTAL_NAVIGATION_TARGETS[id].for;
  return role === "superAdmin" ? (descriptions.superAdmin ?? descriptions.admin) : descriptions[role];
}

// True for a link to one of the pages above: the page itself, a record on it ("/portal/news/14")
// or with a dialog open ("?view=12", "?dialog=report-complaint").
export function isPortalHref(href: string): boolean {
  return Object.values(PORTAL_NAVIGATION_TARGETS).some(
    (target) => href === target.href || href.startsWith(`${target.href}/`) || href.startsWith(`${target.href}?`),
  );
}
