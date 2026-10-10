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

// Reservation times are stored as minutes after midnight. A reservation lasts a whole
// number of hours but can start at any minute, and must end by midnight of its date.
export const MINUTES_PER_DAY = 24 * 60;
export const COURT_DAY_START = 6 * 60;
export const COURT_DAY_END = 18 * 60;
export const COURT_DAY_HOURS = "6:00 AM - 6:00 PM";
export const COURT_NIGHT_HOURS = "6:00 PM - 6:00 AM";

// An hour that spans day and night is billed at the day rate when at least this many of its
// minutes fall within the day hours (e.g. 5:30 - 6:30 PM is day, 5:31 - 6:31 PM is night).
const MIN_DAY_MINUTES_FOR_DAY_RATE = 30;

export type CourtTimeRange = { start: number; end: number };

export function getReservationRange(reservation: {
  startTime: number;
  durationHours: number;
}): CourtTimeRange {
  return { start: reservation.startTime, end: reservation.startTime + reservation.durationHours * 60 };
}

export function rangesOverlap(a: CourtTimeRange, b: CourtTimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function maxDurationHours(startTime: number): number {
  return Math.floor((MINUTES_PER_DAY - startTime) / 60);
}

export type CourtHourCharge = CourtTimeRange & { isDayRate: boolean; rate: number };

// Bills each hour of the reservation separately, so a 12:10 PM - 3:10 PM booking is three
// day-rate hours while 5:00 PM - 7:00 PM is one day hour plus one night hour.
export function getCourtHourCharges(
  startTime: number,
  durationHours: number,
  dayRate: number,
  nightRate: number
): CourtHourCharge[] {
  return Array.from({ length: durationHours }, (_, i) => {
    const start = startTime + i * 60;
    const end = start + 60;
    const dayMinutes = Math.max(0, Math.min(end, COURT_DAY_END) - Math.max(start, COURT_DAY_START));
    const isDayRate = dayMinutes >= MIN_DAY_MINUTES_FOR_DAY_RATE;
    return { start, end, isDayRate, rate: isDayRate ? dayRate : nightRate };
  });
}

export function calculateCourtFee(
  startTime: number,
  durationHours: number,
  dayRate: number,
  nightRate: number
): number {
  return getCourtHourCharges(startTime, durationHours, dayRate, nightRate).reduce(
    (sum, charge) => sum + charge.rate,
    0
  );
}

// Formats minutes after midnight as e.g. "4:27 PM"; 1440 (end of day) reads as "12:00 AM".
export function formatCourtTime(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatTimeRange(range: CourtTimeRange): string {
  return `${formatCourtTime(range.start)} - ${formatCourtTime(range.end)}`;
}

export function formatReservationTime(reservation: { startTime: number; durationHours: number }): string {
  const hours = reservation.durationHours;
  return `${formatTimeRange(getReservationRange(reservation))} (${hours} ${hours === 1 ? "hr" : "hrs"})`;
}

// "HH:MM" (an <input type="time"> value) <-> minutes after midnight.
export function parseTimeInput(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function toTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// The open stretches of a day around the given (approved) reservation ranges.
export function getFreeRanges(taken: CourtTimeRange[]): CourtTimeRange[] {
  const free: CourtTimeRange[] = [];
  let cursor = 0;
  for (const range of [...taken].sort((a, b) => a.start - b.start)) {
    if (range.start > cursor) free.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < MINUTES_PER_DAY) free.push({ start: cursor, end: MINUTES_PER_DAY });
  return free;
}

// Hour-long windows used by the admin "Time" filter, which matches reservations overlapping it.
export const COURT_HOUR_WINDOWS = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  label: formatTimeRange({ start: hour * 60, end: (hour + 1) * 60 }),
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
