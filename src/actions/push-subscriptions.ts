"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { pushSubscriptionsTable } from "@/db/schema";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// A browser's PushSubscription.toJSON(). The server posts to `endpoint`, so only https is accepted.
const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

// Called when a resident turns on phone notifications, and on every portal load by
// PushSubscriptionSync. Saving an endpoint another user had moves it to the caller.
export async function savePushSubscription(subscription: PushSubscriptionJSON) {
  const userId = await requireUserId();
  const { endpoint, keys } = pushSubscriptionSchema.parse(subscription);

  await db
    .insert(pushSubscriptionsTable)
    .values({ userId, endpoint, ...keys })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { userId, ...keys },
    });
}

export async function deletePushSubscription(endpoint: string) {
  const userId = await requireUserId();

  await db
    .delete(pushSubscriptionsTable)
    .where(and(eq(pushSubscriptionsTable.endpoint, endpoint), eq(pushSubscriptionsTable.userId, userId)));
}
