import type { Business } from "@/db/schema";
import type { OperatingHours } from "@/schemas/business-schema";
import { createReferenceNumbers } from "@/lib/reference-numbers";

export function statusBadgeVariant(status: Business["status"]) {
  if (status === "Verified") return "default";
  if (status === "Rejected") return "destructive";
  if (status === "Processing") return "secondary";
  return "outline";
}

export function handlerLabel(status: Business["status"]) {
  if (status === "Verified") return "Verified by";
  if (status === "Rejected") return "Rejected by";
  return "Being processed by";
}

// `?business=<id>` on the Community Hub opens that business's details, the dialog its card opens
// (LinkedBusinessDialog). The AI assistant's business buttons link to it.
export const BUSINESS_SEARCH_PARAM = "business";

// For Community Hub submissions, e.g. 123 → "CH-123"
export const { formatReferenceNumber, referenceNumberSearchPattern } = createReferenceNumbers("CH");

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  if (Number.isNaN(hours)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutesStr} ${period}`;
}

export function formatOperatingHours(hours: OperatingHours): string {
  const days = hours.days.join(", ");
  return `${days} · ${formatTime(hours.opens)} – ${formatTime(hours.closes)}`;
}
