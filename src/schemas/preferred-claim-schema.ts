import z from "zod";
import { PICKUP_DELIVERY_METHOD } from "@/lib/document-requests";

// Shared by every document request form via `.superRefine()`. `PreferredClaimField` only offers
// valid claim days and times, so this just makes pickups pick one. Other delivery methods skip it,
// so a time left over from before switching can't block the submit while its field is hidden.
export function checkPreferredClaimAt(
  data: { receiveVia: string; preferredClaimAt: string },
  ctx: z.RefinementCtx
) {
  if (data.receiveVia === PICKUP_DELIVERY_METHOD && !data.preferredClaimAt) {
    ctx.addIssue({
      code: "custom",
      path: ["preferredClaimAt"],
      message: "Please select your preferred claim date and time",
    });
  }
}
