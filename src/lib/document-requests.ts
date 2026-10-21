import type { DocumentRequest } from "@/db/schema";

export function statusBadgeVariant(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "default";
  if (status === "Claimed") return "secondary";
  if (status === "Rejected") return "destructive";
  return "outline";
}

export function handlerLabel(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "Prepared by";
  if (status === "Claimed") return "Released by";
  if (status === "Rejected") return "Rejected by";
  return "Being processed by";
}

// The reference number is derived from the id (e.g. 123 → "DR-123"), so it isn't stored.
const REFERENCE_NUMBER_PREFIX = "DR-";

export function formatReferenceNumber(id: number) {
  return `${REFERENCE_NUMBER_PREFIX}${id}`;
}

// Matches a search term against reference numbers as text: "DR-12" finds the ones starting with
// it, and bare digits ("12") the ones containing them. Returns a LIKE pattern for the id's digits,
// or null if the term isn't part of a reference number.
export function referenceNumberSearchPattern(search: string) {
  const match = search.trim().match(/^(DR-?)?(\d+)$/i);
  if (!match) return null;
  const [, prefix, digits] = match;
  return prefix ? `${digits}%` : `%${digits}%`;
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Only pickups have a preferred claim date and time.
export const PICKUP_DELIVERY_METHOD = "Pickup at Barangay Hall";
// A Barangay Clearance's GCash payment receipt is required for online soft copies and optional
// for pickups.
export const ONLINE_SOFT_COPY_DELIVERY_METHOD = "Online Soft Copy";
