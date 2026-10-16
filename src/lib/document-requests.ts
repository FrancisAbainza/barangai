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

// The form value to send to `createDocumentRequest`. A time picked before switching to another
// delivery method stays in the form state, so it's dropped here.
export function toPreferredClaimAt(data: { receiveVia: string; preferredClaimAt: string }) {
  return data.receiveVia === PICKUP_DELIVERY_METHOD ? new Date(data.preferredClaimAt) : undefined;
}

// Local "YYYY-MM-DDTHH:MM", the value format of an <input type="datetime-local">.
export function toDateTimeLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The datetime-local input only has minute precision, so the current minute hasn't passed yet.
export function isPastClaimTime(date: Date): boolean {
  const startOfMinute = new Date();
  startOfMinute.setSeconds(0, 0);
  return date < startOfMinute;
}
