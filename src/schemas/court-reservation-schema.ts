import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const COURT_RESERVATION_STATUSES = ["Pending", "Approved", "Rejected"] as const;

export const courtReservationFormSchema = z.object({
  date: z.string().min(1, "Please select a date"),
  purpose: z.string().trim().min(1, "Please provide the purpose of your reservation"),
  timeSlots: z
    .array(z.number().int().min(0).max(23))
    .min(1, "Select at least one time slot"),
  gcashPayment: z
    .array(z.custom<MediaItem>())
    .min(1, "Upload your GCash payment screenshot")
    .max(1, "Only 1 file is allowed"),
});

export type CourtReservationFormValues = z.infer<typeof courtReservationFormSchema>;
