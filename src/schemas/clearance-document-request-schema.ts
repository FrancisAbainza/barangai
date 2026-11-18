import z from "zod";
import { checkPreferredClaimAt } from "@/schemas/preferred-claim-schema";
import type { MediaItem } from "@/components/file-uploader";
import { ONLINE_SOFT_COPY_DELIVERY_METHOD } from "@/lib/document-requests";

// Paid purposes have admin-editable fees in barangay_settings; free purposes are always ₱0.
export const PAID_CLEARANCE_PURPOSES = [
  "Clearance for Local Employment",
  "Bank / Loan Requirements",
  "Business Clearance - Small Business",
  "Business Clearance - Medium Business",
  "Business Clearance - Large Business",
] as const;

export const FREE_CLEARANCE_PURPOSES = [
  "Scholarship",
  "Financial Support",
  "Hospital Support",
  "PAO (Public Attorney's Office)",
] as const;

export const CLEARANCE_PURPOSES = [...PAID_CLEARANCE_PURPOSES, ...FREE_CLEARANCE_PURPOSES] as const;

export type ClearancePurposeFees = Record<(typeof PAID_CLEARANCE_PURPOSES)[number], number>;

export function isFreeClearancePurpose(purpose: string): boolean {
  return (FREE_CLEARANCE_PURPOSES as readonly string[]).includes(purpose);
}

export const CLEARANCE_DELIVERY_METHODS = ["Pickup at Barangay Hall", "Online Soft Copy"] as const;

export const clearanceDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(CLEARANCE_PURPOSES),
    paymentReceipt: z.array(z.custom<MediaItem>()).max(1, "Only one receipt image is allowed"),
    eligibleForFreeCertification: z.boolean(),
    supportingDocuments: z.array(z.custom<MediaItem>()).max(5, "Only up to 5 files are allowed"),
    receiveVia: z.enum(CLEARANCE_DELIVERY_METHODS),
    preferredClaimAt: z.string(),
  })
  .superRefine((data, ctx) => {
    const feeIsWaived = isFreeClearancePurpose(data.purpose) || data.eligibleForFreeCertification;

    if (
      !feeIsWaived &&
      data.receiveVia === ONLINE_SOFT_COPY_DELIVERY_METHOD &&
      data.paymentReceipt.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Upload your GCash payment receipt",
        path: ["paymentReceipt"],
      });
    }

    if (data.eligibleForFreeCertification && data.supportingDocuments.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Upload at least one supporting document",
        path: ["supportingDocuments"],
      });
    }
  })
  .superRefine(checkPreferredClaimAt);

export type ClearanceDocumentRequestFormValues = z.infer<
  typeof clearanceDocumentRequestFormSchema
>;
