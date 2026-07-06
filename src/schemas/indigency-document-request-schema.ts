import z from "zod";
import type { MediaItem } from "@/components/media-uploader";

export const INDIGENCY_REQUEST_PURPOSES = [
  "Medical Assistance",
  "Financial Assistance",
  "Educational Assistance / Scholarship",
  "Burial Assistance",
  "Government Subsidy Application",
  "Other",
] as const;

export const INDIGENCY_DELIVERY_METHODS = [
  "Pickup at Barangay Hall",
  "Online Soft Copy",
] as const;

export const indigencyDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(INDIGENCY_REQUEST_PURPOSES),
    otherPurpose: z.string().optional(),
    situationDescription: z
      .string()
      .trim()
      .min(1, "Please provide a brief description of your situation"),
    supportingDocuments: z
      .array(z.custom<MediaItem>())
      .min(1, "Upload at least one supporting document")
      .max(5, "Only up to 5 files are allowed"),
    receiveVia: z.enum(INDIGENCY_DELIVERY_METHODS),
  })
  .refine((data) => data.purpose !== "Other" || !!data.otherPurpose?.trim(), {
    message: "Please specify your purpose",
    path: ["otherPurpose"],
  });

export type IndigencyDocumentRequestFormValues = z.infer<
  typeof indigencyDocumentRequestFormSchema
>;
