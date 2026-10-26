import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A local calendar day as "YYYY-MM-DD", the value format of `DatePicker` and the date filters.
// Unlike `toISOString()`, this doesn't shift to the UTC day.
export function toDateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "YYYY-MM-DD" → local midnight of that day. `new Date("YYYY-MM-DD")` would read it as UTC.
export function parseDateValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// "(046) 412 4977" → "tel:0464124977", keeping only the characters a dialer reads.
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function truncateName(name: string, max = 20): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

export function formatDateTime(date: Date): string {
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
}

// The date ("YYYY-MM-DD"), day (0 = Monday, the order of DAYS_OF_WEEK) and minutes after midnight in
// the Philippines. The server runs in UTC, and the Philippines is UTC+8 all year, so this reads a
// date 8 hours ahead in UTC.
export function getPhilippineTime() {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    day: (shifted.getUTCDay() + 6) % 7,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

// For dates formatted on the server, which runs in UTC: shows them in Philippine time explicitly.
export function formatPhilippineDate(date: Date, withTime = false) {
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
  });
}
