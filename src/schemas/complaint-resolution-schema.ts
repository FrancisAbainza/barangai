import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const complaintResolutionFormSchema = z.object({
  message: z.string().min(1, "Enter a message for the complainant"),
  attachments: z.array(z.custom<MediaItem>()),
});

export type ComplaintResolutionFormValues = z.infer<typeof complaintResolutionFormSchema>;
