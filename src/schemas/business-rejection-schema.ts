import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const businessRejectionFormSchema = z.object({
  reason: z.string().min(1, "Enter a reason for rejecting this business"),
  attachments: z.array(z.custom<MediaItem>()),
});

export type BusinessRejectionFormValues = z.infer<typeof businessRejectionFormSchema>;
