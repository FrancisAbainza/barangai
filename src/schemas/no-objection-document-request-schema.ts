import z from "zod";
import { checkPreferredClaimAt } from "@/schemas/preferred-claim-schema";

export const NO_OBJECTION_REQUEST_PURPOSES = [
  "Business Permit Application",
  "Construction or Renovation",
  "Tricycle / Vehicle Operation",
  "Special Event or Gathering",
  "Use of Public Space or Road",
  "Other",
] as const;

export const NO_OBJECTION_DELIVERY_METHODS = [
  "Pickup at Barangay Hall",
  "Online Soft Copy",
] as const;

export const noObjectionDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(NO_OBJECTION_REQUEST_PURPOSES),
    otherPurpose: z.string().optional(),
    receiveVia: z.enum(NO_OBJECTION_DELIVERY_METHODS),
    preferredClaimAt: z.string(),
  })
  .refine((data) => data.purpose !== "Other" || !!data.otherPurpose?.trim(), {
    message: "Please specify your purpose",
    path: ["otherPurpose"],
  })
  .superRefine(checkPreferredClaimAt);

export type NoObjectionDocumentRequestFormValues = z.infer<
  typeof noObjectionDocumentRequestFormSchema
>;
