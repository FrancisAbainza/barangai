import type { Business } from "@/db/schema";
import type { OperatingHours } from "@/schemas/business-schema";

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
