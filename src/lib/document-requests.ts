import type { DocumentRequest } from "@/db/schema";

export function statusBadgeVariant(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "default";
  if (status === "Rejected") return "destructive";
  return "outline";
}

export function handlerLabel(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "Prepared by";
  if (status === "Rejected") return "Rejected by";
  return "Being processed by";
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
