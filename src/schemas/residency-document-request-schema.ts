import z from "zod";

export const RESIDENCY_REQUEST_PURPOSES = [
  "Employment Requirement",
  "School Requirement",
  "Loan or Bank Transaction",
  "Government Transaction",
  "Travel Requirement",
  "Medical or Financial Assistance",
  "Other",
] as const;

export const RESIDENCY_DELIVERY_METHODS = [
  "Pickup at Barangay Hall",
  "Online Soft Copy",
] as const;

export const residencyDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(RESIDENCY_REQUEST_PURPOSES),
    otherPurpose: z.string().optional(),
    receiveVia: z.enum(RESIDENCY_DELIVERY_METHODS),
  })
  .refine((data) => data.purpose !== "Other" || !!data.otherPurpose?.trim(), {
    message: "Please specify your purpose",
    path: ["otherPurpose"],
  });

export type ResidencyDocumentRequestFormValues = z.infer<
  typeof residencyDocumentRequestFormSchema
>;
