import type { MediaItem } from "@/components/file-uploader";
import z from "zod";

export const newsFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.enum(["Announcement", "Event", "Emergency"]),
  content: z.string().min(10, "Content must be at least 10 characters"),
  media: z.array(z.custom<MediaItem>()).optional(),
  attachments: z.array(z.custom<MediaItem>()).optional(),
  pinned: z.boolean(),
});

export type NewsFormValues = z.infer<typeof newsFormSchema>;
