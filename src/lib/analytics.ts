import { getPhilippineTime } from "@/lib/utils";

// Months are "YYYY-MM" strings in Philippine time, the Analytics page's month picker values.

export function getCurrentMonth(): string {
  return getPhilippineTime().date.slice(0, 7);
}

// The month a timestamp falls in, in Philippine time. The server runs in UTC, so like
// getPhilippineTime this reads the date 8 hours ahead.
export function toPhilippineMonth(date: Date): string {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

// When the month starts in Philippine time.
export function getMonthStart(month: string): Date {
  return new Date(`${month}-01T00:00:00+08:00`);
}

// "2026-10" moved by `offset` months: shiftMonth("2026-01", -1) is "2025-12".
export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

// "October 2026", or "Oct" when short.
export function formatMonth(month: string, short = false): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleString(
    "en-US",
    short ? { month: "short" } : { month: "long", year: "numeric" }
  );
}
