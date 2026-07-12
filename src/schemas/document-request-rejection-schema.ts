import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const documentRequestRejectionFormSchema = z.object({
  reason: z.string().min(1, "Enter a reason for rejecting this request"),
  attachments: z.array(z.custom<MediaItem>()),
});

export type DocumentRequestRejectionFormValues = z.infer<typeof documentRequestRejectionFormSchema>;
