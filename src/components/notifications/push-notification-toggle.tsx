"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePushSubscription, savePushSubscription } from "@/actions/push-subscriptions";
import {
  getPushSubscription,
  isPushSupported,
  urlBase64ToUint8Array,
  VAPID_PUBLIC_KEY,
} from "@/lib/push-subscription";

type PushState = "on" | "off" | "blocked" | "needs-home-screen" | "unsupported";

const DESCRIPTIONS: Record<PushState, string> = {
  off: "Get an alert on this device when the status of your submissions changes.",
  on: "On for this device. You'll get an alert when the status of your submissions changes.",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload this page.",
  "needs-home-screen":
    "On iPhone and iPad, add this site to your Home Screen first: tap Share, then Add to Home Screen. Open the portal from there and turn them on.",
  unsupported: "This browser can't receive notifications. Try Chrome on Android, or Safari on iPhone.",
};

// iPhones and iPads get Web Push only in a site added to the Home Screen. iPad Safari presents
// itself as a Mac, so it's told apart by its touch screen.
function isIosBrowser() {
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return isIos && !window.matchMedia("(display-mode: standalone)").matches;
}

async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return isIosBrowser() ? "needs-home-screen" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return (await getPushSubscription()) ? "on" : "off";
}

// requestPermission() comes before any other await, since iOS only allows it straight from a tap.
async function turnOn(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";

  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
  });
  await savePushSubscription(subscription.toJSON());
  return "on";
}

async function turnOff(): Promise<PushState> {
  const subscription = await getPushSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
  return "off";
}

// Turns phone notifications (Web Push) on or off for this browser. Each device is turned on
// separately, and the notifications themselves are sent by notify() in src/lib/notify.ts.
export default function PushNotificationToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  if (!VAPID_PUBLIC_KEY || state === null) return null;

  const isOn = state === "on";

  async function toggle() {
    setIsPending(true);
    try {
      setState(isOn ? await turnOff() : await turnOn());
    } catch (error) {
      console.error(error);
      toast.error(`Failed to turn ${isOn ? "off" : "on"} phone notifications. Please try again.`);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BellRing className="size-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">Phone notifications</p>
          <p className="text-sm text-muted-foreground">{DESCRIPTIONS[state]}</p>
        </div>
      </div>
      {(state === "on" || state === "off") && (
        <Button variant={isOn ? "outline" : "default"} onClick={toggle} disabled={isPending} className="sm:shrink-0">
          {isOn ? "Turn off" : "Turn on"}
        </Button>
      )}
    </div>
  );
}
