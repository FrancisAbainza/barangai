import type { CourtReservation } from "@/db/schema";

export function statusBadgeVariant(status: CourtReservation["status"]) {
  if (status === "Approved") return "default";
  if (status === "Rejected") return "destructive";
  return "outline";
}

export function handlerLabel(status: CourtReservation["status"]) {
  if (status === "Approved") return "Approved by";
  if (status === "Rejected") return "Rejected by";
  return "Being processed by";
}

const courtHourFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true });

// hour is the slot's starting hour (0-23); Date handles the day rollover for the label.
export function formatCourtHour(hour: number): string {
  return courtHourFormat.format(new Date(2000, 0, 1, hour));
}

export function formatTimeSlots(hours: number[]): string {
  return [...hours]
    .sort((a, b) => a - b)
    .map((hour) => `${formatCourtHour(hour)} - ${formatCourtHour(hour + 1)}`)
    .join(", ");
}

// Shared rendering data (hour + label) for every 1-hour slot in a day; reused by the
// reservation picker form and the admin time slot filter.
export const COURT_TIME_SLOTS = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  label: `${formatCourtHour(hour)} - ${formatCourtHour(hour + 1)}`,
}));

export function formatFee(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// `date` is a plain "YYYY-MM-DD" string; anchoring to local midnight avoids a UTC-parse day shift.
export function formatReservationDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSubmissionDate(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
