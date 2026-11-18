import z from "zod";
import type { MediaItem } from "@/components/file-uploader";
import {
  isPastCourtReservationStartTime,
  isFridayCourtReservationDate,
  COURT_CLOSE,
  COURT_LAST_START,
  COURT_OPEN_START,
  parseTimeInput,
} from "@/lib/court-reservations";

export const COURT_RESERVATION_STATUSES = ["Pending", "Approved", "Rejected"] as const;

export function getCourtReservationFormSchema(isAdmin: boolean) {
  return z
    .object({
      date: z.string().min(1, "Please select a date"),
      purpose: z.string().trim().min(1, "Please provide the purpose of your reservation"),
      // "HH:MM" from a `TimePicker`; converted to minutes after midnight on submit.
      startTime: z
        .string()
        .min(1, "Please select a start time")
        .refine((value) => parseTimeInput(value) !== null, "Please enter a valid time"),
      durationHours: z.number().int().min(1, "Reserve at least 1 hour"),
      // Admins don't pay, so the form hides the upload and leaves this empty.
      gcashPayment: isAdmin
        ? z.array(z.custom<MediaItem>())
        : z
            .array(z.custom<MediaItem>())
            .min(1, "Upload your GCash payment screenshot")
            .max(1, "Only 1 file is allowed"),
    })
    .refine(
      ({ date }) => !isFridayCourtReservationDate(date),
      { path: ["date"], message: "Court reservations are not available on Fridays." }
    )
    .refine(
      ({ date, startTime }) => {
        const start = parseTimeInput(startTime);
        return start === null || !isPastCourtReservationStartTime(date, start);
      },
      { path: ["startTime"], message: "Start time must be in the future." }
    )
    .refine(
      ({ startTime }) => {
        const start = parseTimeInput(startTime);
        return start === null || (start >= COURT_OPEN_START && start <= COURT_LAST_START);
      },
      { path: ["startTime"], message: "Reservations may start from 8:00 AM to 9:00 PM" }
    )
    .refine(
      ({ startTime, durationHours }) => {
        const start = parseTimeInput(startTime);
        return start === null || start + durationHours * 60 <= COURT_CLOSE;
      },
      { path: ["durationHours"], message: "Reservations must end by 10:00 PM" }
    );
}

export type CourtReservationFormValues = z.infer<ReturnType<typeof getCourtReservationFormSchema>>;
