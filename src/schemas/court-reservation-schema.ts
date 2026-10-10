import z from "zod";
import type { MediaItem } from "@/components/file-uploader";
import { MINUTES_PER_DAY, parseTimeInput } from "@/lib/court-reservations";

export const COURT_RESERVATION_STATUSES = ["Pending", "Approved", "Rejected"] as const;

export function getCourtReservationFormSchema(isAdmin: boolean) {
  return z
    .object({
      date: z.string().min(1, "Please select a date"),
      purpose: z.string().trim().min(1, "Please provide the purpose of your reservation"),
      // "HH:MM" from an <input type="time">; converted to minutes after midnight on submit.
      startTime: z
        .string()
        .min(1, "Please select a start time")
        .refine((value) => parseTimeInput(value) !== null, "Please enter a valid time"),
      durationHours: z.number().int().min(1, "Reserve at least 1 hour"),
      gcashPayment: isAdmin
        ? z.array(z.custom<MediaItem>()).max(1, "Only 1 file is allowed")
        : z
            .array(z.custom<MediaItem>())
            .min(1, "Upload your GCash payment screenshot")
            .max(1, "Only 1 file is allowed"),
    })
    .refine(
      ({ startTime, durationHours }) => {
        const start = parseTimeInput(startTime);
        return start === null || start + durationHours * 60 <= MINUTES_PER_DAY;
      },
      { path: ["durationHours"], message: "Reservations must end by 12:00 AM (midnight)" }
    );
}

export type CourtReservationFormValues = z.infer<ReturnType<typeof getCourtReservationFormSchema>>;
