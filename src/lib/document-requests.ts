import type { DocumentRequest } from "@/db/schema";
import { createReferenceNumbers } from "@/lib/reference-numbers";
import type { ClearancePurposeFees } from "@/schemas/clearance-document-request-schema";

export const DEFAULT_CLEARANCE_PURPOSE_FEES: ClearancePurposeFees = {
  "Clearance for Local Employment": 60,
  "Bank / Loan Requirements": 80,
  "Business Clearance - Small Business": 280,
  "Business Clearance - Medium Business": 530,
  "Business Clearance - Large Business": 1030,
};

export function statusBadgeVariant(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "default";
  if (status === "Claimed") return "secondary";
  if (status === "Rejected" || status === "Expired") return "destructive";
  return "outline";
}

export function handlerLabel(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "Prepared by";
  if (status === "Claimed") return "Released by";
  if (status === "Rejected") return "Rejected by";
  return "Being processed by";
}

// e.g. 123 → "DR-123"
export const { formatReferenceNumber, referenceNumberSearchPattern } = createReferenceNumbers("DR");

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
