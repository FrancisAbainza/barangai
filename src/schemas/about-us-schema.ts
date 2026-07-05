import type { MediaItem } from "@/components/media-uploader";
import z from "zod";

export const officialFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  position: z.string().min(2, "Position is required"),
  photo: z.array(z.custom<MediaItem>()).min(1, "Photo is required"),
  isLeader: z.boolean(),
});

export type OfficialFormValues = z.infer<typeof officialFormSchema>;
