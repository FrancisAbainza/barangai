import z from "zod";
import type { MediaItem } from "@/components/file-uploader";
import { CLEARANCE_PURPOSES } from "@/lib/data";

export { CLEARANCE_PURPOSES };

export const CLEARANCE_DELIVERY_METHODS = ["Pickup at Barangay Hall", "Online Soft Copy"] as const;

export const clearanceDocumentRequestFormSchema = z.object({
  purpose: z.enum(CLEARANCE_PURPOSES),
  paymentReceipt: z
    .array(z.custom<MediaItem>())
    .min(1, "Upload your GCash payment receipt")
    .max(1, "Only one receipt image is allowed"),
  receiveVia: z.enum(CLEARANCE_DELIVERY_METHODS),
});

export type ClearanceDocumentRequestFormValues = z.infer<
  typeof clearanceDocumentRequestFormSchema
>;
