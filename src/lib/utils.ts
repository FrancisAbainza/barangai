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
