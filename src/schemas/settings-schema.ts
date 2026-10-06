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

export const missionVisionFormSchema = z.object({
  mission: z.string().trim().min(1, "Mission is required").max(2000, "Mission is too long"),
  vision: z.string().trim().min(1, "Vision is required").max(2000, "Vision is too long"),
});

export type MissionVisionFormValues = z.infer<typeof missionVisionFormSchema>;
