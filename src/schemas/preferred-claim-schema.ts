import z from "zod";
import { isPastClaimTime, PICKUP_DELIVERY_METHOD } from "@/lib/document-requests";

// Shared by every document request form via `.superRefine()`. `preferredClaimAt` is
// "YYYY-MM-DDTHH:MM" from an <input type="datetime-local">, which `new Date()` reads as local
// time. It's only checked for pickups, so a time left over from before switching to another
// delivery method can't block the submit while its field is hidden.
export function checkPreferredClaimAt(
  data: { receiveVia: string; preferredClaimAt: string },
  ctx: z.RefinementCtx
) {
  if (data.receiveVia !== PICKUP_DELIVERY_METHOD) return;

  if (!data.preferredClaimAt) {
    ctx.addIssue({
      code: "custom",
      path: ["preferredClaimAt"],
      message: "Please select your preferred claim date and time",
    });
  } else if (isPastClaimTime(new Date(data.preferredClaimAt))) {
    ctx.addIssue({
      code: "custom",
      path: ["preferredClaimAt"],
      message: "Preferred claim date and time can't be in the past",
    });
  }
}
