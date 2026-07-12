import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const complaintDismissalFormSchema = z.object({
  reason: z.string().min(1, "Enter a reason for dismissing this complaint"),
  attachments: z.array(z.custom<MediaItem>()),
});

export type ComplaintDismissalFormValues = z.infer<typeof complaintDismissalFormSchema>;
