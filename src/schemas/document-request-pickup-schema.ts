import z from "zod";
import type { MediaItem } from "@/components/file-uploader";

export const documentRequestPickupFormSchema = z.object({
  message: z.string().min(1, "Enter a message for the requester"),
  attachments: z.array(z.custom<MediaItem>()),
});

export type DocumentRequestPickupFormValues = z.infer<typeof documentRequestPickupFormSchema>;
