import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const courtReservationRejectionFormSchema = z.object({
  reason: z.string().min(1, "Enter a reason for rejecting this reservation"),
  attachments: z.array(z.custom<MediaItem>()),
});

export type CourtReservationRejectionFormValues = z.infer<typeof courtReservationRejectionFormSchema>;
