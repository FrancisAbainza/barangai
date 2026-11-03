"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/actions/push-subscriptions";
import { getPushSubscription } from "@/lib/push-subscription";

// Saves this browser's phone notification subscription for the signed-in user once on load. A
// phone shared by several accounts then gets only the notifications of whoever used the portal
// last, and a subscription the browser renewed, or that failed to save, is saved again.
export function PushSubscriptionSync() {
  useEffect(() => {
    getPushSubscription()
      .then((subscription) => subscription && savePushSubscription(subscription.toJSON()))
      .catch((error) => console.error("Failed to sync the push subscription:", error));
  }, []);

  return null;
}
