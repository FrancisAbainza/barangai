import type { AuditLog } from "@/db/schema";
import { getSubmissionDialogHref } from "@/lib/ai-assistant/portal-dialogs";

// What an audit log entry is about (see logAudit in src/lib/audit.ts), with its Category label.
export const AUDIT_ENTITY_LABELS = {
  "document-request": "Document Request",
  complaint: "Complaint",
  "court-reservation": "Court Reservation",
  business: "Community Hub",
  news: "News & Announcements",
  "transparency-project": "Transparency",
  official: "Officials",
  "barangay-settings": "Barangay Settings",
  "knowledge-base": "AI Knowledge Base",
  user: "User",
} as const;

export const AUDIT_ACTION_LABELS = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  "status-changed": "Status Changed",
  reordered: "Reordered",
  replaced: "Replaced",
  "role-changed": "Role Changed",
  banned: "Banned",
  unbanned: "Unbanned",
  "data-deleted": "Data Deleted",
} as const;

export type AuditEntityType = keyof typeof AUDIT_ENTITY_LABELS;
export type AuditAction = keyof typeof AUDIT_ACTION_LABELS;

// A field's value before and after the action, as display text. `from` is null for a created
// record, and `to` for a deleted one.
export type AuditChange = {
  label: string;
  from: string | null;
  to: string | null;
};

export function auditActionBadgeVariant(action: AuditAction) {
  if (action === "deleted" || action === "data-deleted" || action === "banned") return "destructive";
  if (action === "created") return "default";
  return "secondary";
}

// The page showing the entry's record, or null when it has none (or was deleted by this action).
export function getAuditLogHref({ action, entityType, entityId }: Pick<AuditLog, "action" | "entityType" | "entityId">) {
  if (action === "deleted" || action === "data-deleted") return null;

  switch (entityType) {
    case "document-request":
      return getSubmissionDialogHref("document-request", Number(entityId));
    case "complaint":
      return getSubmissionDialogHref("complaint", Number(entityId));
    case "court-reservation":
      return getSubmissionDialogHref("court-reservation", Number(entityId));
    case "business":
      return getSubmissionDialogHref("community-hub", Number(entityId));
    case "news":
      return `/portal/news/${entityId}`;
    case "transparency-project":
      return `/portal/transparency/${entityId}`;
    case "official":
    case "barangay-settings":
      return "/portal/barangay-settings";
    case "user":
      return `/portal/profile/${entityId}`;
    default:
      return null;
  }
}
