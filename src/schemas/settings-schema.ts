import z from "zod";

export const documentRequestSettingsFormSchema = z.object({
  gcashNumber: z
    .string()
    .min(10, "Enter a valid GCash number")
    .max(13, "Enter a valid GCash number"),
  clearancePurposeFees: z.object({
    "Clearance for Local Employment": z.number().nonnegative("Fee must be zero or greater"),
    "Bank / Loan Requirements": z.number().nonnegative("Fee must be zero or greater"),
    "Business Clearance": z.number().nonnegative("Fee must be zero or greater"),
  }),
});

export type DocumentRequestSettingsFormValues = z.infer<typeof documentRequestSettingsFormSchema>;

export const courtFeesFormSchema = z.object({
  courtDayRate: z.number().nonnegative("Rate must be zero or greater"),
  courtNightRate: z.number().nonnegative("Rate must be zero or greater"),
});

export type CourtFeesFormValues = z.infer<typeof courtFeesFormSchema>;

export const goalMissionVisionFormSchema = z.object({
  goal: z.string().trim().min(1, "Goal is required").max(2000, "Goal is too long"),
  mission: z.string().trim().min(1, "Mission is required").max(2000, "Mission is too long"),
  vision: z.string().trim().min(1, "Vision is required").max(2000, "Vision is too long"),
});

export type GoalMissionVisionFormValues = z.infer<typeof goalMissionVisionFormSchema>;

// Digits with optional spaces, dashes, parentheses and +, e.g. "(046) 412 4977".
const PHONE_NUMBER_PATTERN = /^[\d\s()+-]{7,20}$/;

export const contactInformationFormSchema = z.object({
  hotline1: z
    .string()
    .trim()
    .min(1, "Hotline 1 is required")
    .regex(PHONE_NUMBER_PATTERN, "Enter a valid phone number"),
  // Optional, for when the barangay has only one hotline.
  hotline2: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_NUMBER_PATTERN.test(value), "Enter a valid phone number"),
  email: z.email("Enter a valid email address").max(255, "Email is too long"),
  address: z.string().trim().min(1, "Address is required").max(255, "Address is too long"),
});

export type ContactInformationFormValues = z.infer<typeof contactInformationFormSchema>;
