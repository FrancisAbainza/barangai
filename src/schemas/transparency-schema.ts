import type { MediaItem } from "@/components/file-uploader";
import type { LocationValue } from "@/components/map-picker";
import z from "zod";

export const TRANSPARENCY_CATEGORIES = [
  "Infrastructure",
  "Health",
  "Education",
  "Livelihood",
  "Social Welfare",
  "Peace and Order",
  "Environment",
  "Others",
] as const;

export const transparencyProjectFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.enum(TRANSPARENCY_CATEGORIES),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.number().nonnegative("Budget must be zero or greater").optional(),
  location: z.custom<LocationValue>().optional(),
  media: z.array(z.custom<MediaItem>()).optional(),
  attachments: z.array(z.custom<MediaItem>()).optional(),
});

export type TransparencyProjectFormValues = z.infer<typeof transparencyProjectFormSchema>;
