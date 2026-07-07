import type { MediaItem } from "@/components/file-uploader";
import z from "zod";

export const VALID_ID_TYPES = [
  "Philippine National ID (PhilSys)",
  "Passport",
  "Driver's License",
  "UMID",
  "Voter's ID",
  "PhilHealth ID",
  "SSS ID",
  "Postal ID",
] as const;

export const SEX_OPTIONS = ["Male", "Female"] as const;

export const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Separated",
  "Divorced",
] as const;

export const residentProfileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  birthdate: z.string().min(1, "Birthdate is required"),
  sex: z.enum(SEX_OPTIONS),
  civilStatus: z.enum(CIVIL_STATUS_OPTIONS),
  contactNumber: z
    .string()
    .min(10, "Enter a valid contact number")
    .max(13, "Enter a valid contact number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  validIdType: z.enum(VALID_ID_TYPES),
  validIdFront: z
    .array(z.custom<MediaItem>())
    .min(1, "Upload a photo of the front of your valid ID")
    .max(1, "Only one ID image is allowed"),
  validIdBack: z
    .array(z.custom<MediaItem>())
    .max(1, "Only one ID image is allowed")
    .optional(),
});

export type ResidentProfileFormValues = z.infer<typeof residentProfileFormSchema>;
