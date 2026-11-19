import z from "zod";
import type { MediaItem } from "@/components/file-uploader";
import { ONLINE_SOFT_COPY_DELIVERY_METHOD } from "@/lib/document-requests";
import { checkPreferredClaimAt } from "@/schemas/preferred-claim-schema";

export const ADDITIONAL_TRANSACTION_PURPOSES = [
  "Tel Net Tower",
  "Fiber Optic Cable",
] as const;

export const ADDITIONAL_TRANSACTIONS_DELIVERY_METHODS = [
  "Pickup at Barangay Hall",
  "Online Soft Copy",
] as const;

export type AdditionalTransactionsPurposeFees = Record<
  (typeof ADDITIONAL_TRANSACTION_PURPOSES)[number],
  number
>;

export const additionalTransactionsDocumentRequestFormSchema = z
  .object({
    purpose: z.enum(ADDITIONAL_TRANSACTION_PURPOSES),
    paymentReceipt: z.array(z.custom<MediaItem>()).max(1, "Only one receipt image is allowed"),
    eligibleForFreeCertification: z.boolean(),
    supportingDocuments: z.array(z.custom<MediaItem>()).max(5, "Only up to 5 files are allowed"),
    receiveVia: z.enum(ADDITIONAL_TRANSACTIONS_DELIVERY_METHODS),
    preferredClaimAt: z.string(),
  })
  .superRefine((data, ctx) => {
    if (
      !data.eligibleForFreeCertification &&
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

export type AdditionalTransactionsDocumentRequestFormValues = z.infer<
  typeof additionalTransactionsDocumentRequestFormSchema
>;
