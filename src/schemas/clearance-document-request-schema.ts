import z from "zod";
import { checkPreferredClaimAt } from "@/schemas/preferred-claim-schema";
import type { MediaItem } from "@/components/file-uploader";
import { CLEARANCE_PURPOSES, isFreeClearancePurpose } from "@/lib/data";
import { ONLINE_SOFT_COPY_DELIVERY_METHOD } from "@/lib/document-requests";

export { CLEARANCE_PURPOSES };

export const CLEARANCE_DELIVERY_METHODS = ["Pickup at Barangay Hall", "Online Soft Copy"] as const;

export const clearanceDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(CLEARANCE_PURPOSES),
    paymentReceipt: z.array(z.custom<MediaItem>()).max(1, "Only one receipt image is allowed"),
    receiveVia: z.enum(CLEARANCE_DELIVERY_METHODS),
    preferredClaimAt: z.string(),
  })
  .refine(
    (data) =>
      isFreeClearancePurpose(data.purpose) ||
      data.receiveVia !== ONLINE_SOFT_COPY_DELIVERY_METHOD ||
      data.paymentReceipt.length > 0,
    { message: "Upload your GCash payment receipt", path: ["paymentReceipt"] }
  )
  .superRefine(checkPreferredClaimAt);

export type ClearanceDocumentRequestFormValues = z.infer<
  typeof clearanceDocumentRequestFormSchema
>;
