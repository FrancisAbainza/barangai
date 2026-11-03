// Browser-side Web Push helpers for PushNotificationToggle and PushSubscriptionSync. Sending is
// server-only, in src/lib/push.ts.

// Unset means phone notifications aren't set up, and the toggle doesn't show.
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// This browser's subscription, or null when phone notifications are off here.
export async function getPushSubscription() {
  if (!VAPID_PUBLIC_KEY || !isPushSupported() || Notification.permission !== "granted") return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

// pushManager.subscribe() takes the base64url VAPID key as bytes.
export function urlBase64ToUint8Array(base64Url: string) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
