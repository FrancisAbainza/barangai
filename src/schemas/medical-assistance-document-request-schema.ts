import z from "zod";
import type { MediaItem } from "@/components/media-uploader";

export const MEDICAL_ASSISTANCE_REQUEST_PURPOSES = [
  "Hospitalization Assistance",
  "Laboratory / Diagnostic Test Assistance",
  "Medicine Assistance",
  "Surgery Assistance",
  "Other",
] as const;

export const MEDICAL_ASSISTANCE_DELIVERY_METHODS = [
  "Pickup at Barangay Hall",
  "Online Soft Copy",
] as const;

export const medicalAssistanceDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(MEDICAL_ASSISTANCE_REQUEST_PURPOSES),
    otherPurpose: z.string().optional(),
    situationDescription: z
      .string()
      .trim()
      .min(1, "Please provide a brief description of your situation"),
    supportingDocuments: z
      .array(z.custom<MediaItem>())
      .min(1, "Upload at least one supporting document")
      .max(5, "Only up to 5 files are allowed"),
    receiveVia: z.enum(MEDICAL_ASSISTANCE_DELIVERY_METHODS),
  })
  .refine((data) => data.purpose !== "Other" || !!data.otherPurpose?.trim(), {
    message: "Please specify your purpose",
    path: ["otherPurpose"],
  });

export type MedicalAssistanceDocumentRequestFormValues = z.infer<
  typeof medicalAssistanceDocumentRequestFormSchema
>;
