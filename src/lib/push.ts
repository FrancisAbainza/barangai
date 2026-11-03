// Server-only — never import in Client Components.
import { inArray } from "drizzle-orm";
import { sendNotification, WebPushError } from "web-push";
import { db } from "@/db/config";
import { pushSubscriptionsTable } from "@/db/schema";
import { barangayEmail, barangayName } from "@/lib/data";

export type PushMessage = {
  userId: string;
  body: string;
  url: string;
};

// Sends each message to every browser its user turned phone notifications on in (shown by
// public/sw.js). Called by notify() after the notifications are saved. Without the VAPID keys
// it does nothing, so a deployment that hasn't set them still has the in-app notifications.
export async function sendPushNotifications(messages: PushMessage[]) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey || messages.length === 0) return;

  const messageByUserId = new Map(messages.map((message) => [message.userId, message]));
  const subscriptions = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.userId, [...messageByUserId.keys()]));

  const goneEndpoints: string[] = [];
  await Promise.all(
    subscriptions.map(async ({ userId, endpoint, p256dh, auth }) => {
      const { body, url } = messageByUserId.get(userId)!;
      try {
        await sendNotification(
          { endpoint, keys: { p256dh, auth } },
          JSON.stringify({ title: barangayName, body, url }),
          { vapidDetails: { subject: `mailto:${barangayEmail}`, publicKey, privateKey } }
        );
      } catch (error) {
        // 404/410: the browser unsubscribed, or the subscription expired.
        if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          goneEndpoints.push(endpoint);
        } else {
          console.error("Failed to send push notification:", error);
        }
      }
    })
  );

  if (goneEndpoints.length > 0) {
    await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.endpoint, goneEndpoints));
  }
}
