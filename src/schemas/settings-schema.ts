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

export const courtSettingsFormSchema = z.object({
  gcashNumber: z
    .string()
    .min(10, "Enter a valid GCash number")
    .max(13, "Enter a valid GCash number"),
  courtDayRate: z.number().nonnegative("Rate must be zero or greater"),
  courtNightRate: z.number().nonnegative("Rate must be zero or greater"),
});

export type CourtSettingsFormValues = z.infer<typeof courtSettingsFormSchema>;
