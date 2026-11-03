# Phone notifications, line by line

This traces the code behind [phone notifications](../features/notifications.md#phone-notifications) in the order it runs, jumping between files when the code does. It covers two flows: a resident turning them on, and an admin's status change being pushed to the resident's phone.

Line numbers are as of November 4, 2026. If they've shifted, search for the quoted code.

## Turning them on

The resident is on `/portal/notifications`, the card says "Get an alert on this device…", and they click **Turn on**.

### In the browser

**1.** [push-notification-toggle.tsx:103](../../src/components/notifications/push-notification-toggle.tsx#L103)

```tsx
<Button variant={isOn ? "outline" : "default"} onClick={toggle} disabled={isPending} className="sm:shrink-0">
```

The click calls `toggle()`. The button only shows when the state is `"on"` or `"off"` (line 102).

**2.** [push-notification-toggle.tsx:80](../../src/components/notifications/push-notification-toggle.tsx#L80)

```tsx
setIsPending(true);
```

Disables the button (`disabled={isPending}`), so a second click can't start another run.

**3.** [push-notification-toggle.tsx:82](../../src/components/notifications/push-notification-toggle.tsx#L82)

```tsx
setState(isOn ? await turnOff() : await turnOn());
```

`isOn` is false, so this calls `turnOn()`. `setState` runs only once `turnOn()` returns (step 15).

**4.** [push-notification-toggle.tsx:43](../../src/components/notifications/push-notification-toggle.tsx#L43)

```tsx
const permission = await Notification.requestPermission();
```

The browser asks "Allow notifications?" and the code waits for the answer. This is deliberately the first `await` after the tap, because iOS allows the prompt only straight from a tap (the comment at line 41).

**5.** [push-notification-toggle.tsx:44](../../src/components/notifications/push-notification-toggle.tsx#L44)

```tsx
if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
```

**Allow** gives `"granted"`, so the code continues. **Block** returns `"blocked"`, and closing the prompt returns `"off"`. Both skip to step 15.

**6.** [push-notification-toggle.tsx:46](../../src/components/notifications/push-notification-toggle.tsx#L46)

```tsx
await navigator.serviceWorker.register("/sw.js");
```

Downloads and installs [public/sw.js](../../public/sw.js). Installing runs the file once, which only attaches its two listeners, `push` ([sw.js:4](../../public/sw.js#L4)) and `notificationclick` ([sw.js:15](../../public/sw.js#L15)), for later. Nothing is shown yet.

**7.** [push-notification-toggle.tsx:47](../../src/components/notifications/push-notification-toggle.tsx#L47)

```tsx
const registration = await navigator.serviceWorker.ready;
```

Waits until the service worker is active. A push subscription needs an active worker.

**8.** [push-notification-toggle.tsx:50](../../src/components/notifications/push-notification-toggle.tsx#L50)

```tsx
applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
```

`VAPID_PUBLIC_KEY` is `NEXT_PUBLIC_VAPID_PUBLIC_KEY` from `.env`, read at [push-subscription.ts:5](../../src/lib/push-subscription.ts#L5) and built into the browser bundle. `urlBase64ToUint8Array` then runs:

[push-subscription.ts:20](../../src/lib/push-subscription.ts#L20)

```ts
const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
```

The key is base64url text. This adds the `=` padding and turns `-` and `_` into `+` and `/`, so `atob` can read it.

[push-subscription.ts:21](../../src/lib/push-subscription.ts#L21)

```ts
return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
```

Decodes it into the key's 65 bytes, the form `subscribe()` takes.

**9.** [push-notification-toggle.tsx:48-51](../../src/components/notifications/push-notification-toggle.tsx#L48-L51)

```tsx
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
});
```

The browser asks its push service (Google's FCM for Chrome, Apple's for Safari, Mozilla's for Firefox) for a new subscription, tied to the public key. Only a server holding the matching private key can push to it. `userVisibleOnly: true` promises that every push shows a notification, which Chrome and Safari require.

**10.** [push-notification-toggle.tsx:52](../../src/components/notifications/push-notification-toggle.tsx#L52)

```tsx
await savePushSubscription(subscription.toJSON());
```

`toJSON()` gives `{ endpoint, keys: { p256dh, auth } }`: the push service's URL for this browser, and the keys pushes to it are encrypted with. `savePushSubscription` is a server action, so this sends a request to the server and waits for it.

### On the server

**11.** [push-subscriptions.ts:24](../../src/actions/push-subscriptions.ts#L24)

```ts
const userId = await requireUserId();
```

Runs `requireUserId()`:

- [push-subscriptions.ts:10](../../src/actions/push-subscriptions.ts#L10) `const { userId } = await auth();` reads the Clerk session from the request's cookies.
- [push-subscriptions.ts:11](../../src/actions/push-subscriptions.ts#L11) `if (!userId) throw new Error("Unauthorized");` stops signed-out requests.
- [push-subscriptions.ts:12](../../src/actions/push-subscriptions.ts#L12) `return userId;`

The user id comes from the session, never from what the browser sent.

**12.** [push-subscriptions.ts:25](../../src/actions/push-subscriptions.ts#L25)

```ts
const { endpoint, keys } = pushSubscriptionSchema.parse(subscription);
```

Checks the data against the schema at [lines 16-19](../../src/actions/push-subscriptions.ts#L16-L19). The endpoint must be an `https` URL, because the server posts to it later and this keeps it from being pointed at an internal address. Both keys must be non-empty. Anything else throws.

**13.** [push-subscriptions.ts:27-33](../../src/actions/push-subscriptions.ts#L27-L33)

```ts
await db
  .insert(pushSubscriptionsTable)
  .values({ userId, endpoint, ...keys })
  .onConflictDoUpdate({
    target: pushSubscriptionsTable.endpoint,
    set: { userId, ...keys },
  });
```

Saves one `push_subscriptions` row for this browser. If the endpoint is already saved (this browser was turned on before, possibly by another resident), the existing row is updated and moved to this user instead. The action returns, and the response goes back to the browser.

### Back in the browser

**14.** [push-notification-toggle.tsx:53](../../src/components/notifications/push-notification-toggle.tsx#L53)

```tsx
return "on";
```

`turnOn()` finishes.

**15.** [push-notification-toggle.tsx:82](../../src/components/notifications/push-notification-toggle.tsx#L82)

```tsx
setState(isOn ? await turnOff() : await turnOn());
```

`setState("on")`, with the value `turnOn()` returned.

**16.** [push-notification-toggle.tsx:87](../../src/components/notifications/push-notification-toggle.tsx#L87)

```tsx
setIsPending(false);
```

In `finally`, so it runs whether `turnOn()` succeeded or threw. The button is enabled again.

**17.** React re-renders the card:

- [push-notification-toggle.tsx:77](../../src/components/notifications/push-notification-toggle.tsx#L77) `const isOn = state === "on";` is now true.
- [push-notification-toggle.tsx:99](../../src/components/notifications/push-notification-toggle.tsx#L99) `{DESCRIPTIONS[state]}` shows "On for this device…" ([line 19](../../src/components/notifications/push-notification-toggle.tsx#L19)).
- [push-notification-toggle.tsx:103-104](../../src/components/notifications/push-notification-toggle.tsx#L103-L104) make the button an outline **Turn off**.

### When something fails

If anything in steps 6-13 throws (no service worker, the push service unreachable, `Unauthorized`, a rejected subscription, a database error), the code jumps from that line to the `catch`:

[push-notification-toggle.tsx:83-85](../../src/components/notifications/push-notification-toggle.tsx#L83-L85)

```tsx
} catch (error) {
  console.error(error);
  toast.error(`Failed to turn ${isOn ? "off" : "on"} phone notifications. Please try again.`);
```

The toast says "Failed to turn on phone notifications. Please try again.", the state stays `"off"`, and step 16 still runs. If only the save in steps 10-13 failed, the browser is already subscribed: the card shows On after a reload, and `PushSubscriptionSync` saves the subscription on the next portal load.

## Sending a status change

An admin changes complaint #12, "Clogged drainage", from In Progress to Resolved. The resident turned phone notifications on earlier, so they have a `push_subscriptions` row.

### On the server, during the admin's request

**1.** [complaints.ts:436](../../src/actions/complaints.ts#L436)

```ts
const handlerId = await requireAdmin();
```

Throws unless the caller is an admin, and returns the admin's id.

**2.** [complaints.ts:438-439](../../src/actions/complaints.ts#L438-L439)

```ts
const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
if (!existing) throw new Error("Complaint not found");
```

Loads complaint #12 as it is before the change, so the old status (In Progress) and the complainant are known.

**3.** [complaints.ts:441-458](../../src/actions/complaints.ts#L441-L458)

```ts
await db
  .update(complaintsTable)
  .set({
    status,
    handlerId: status === "Pending" ? null : handlerId,
    // …the resolution and dismissal fields
  })
  .where(eq(complaintsTable.id, id));
```

Saves the new status, Resolved.

**4.** [complaints.ts:460-463](../../src/actions/complaints.ts#L460-L463)

```ts
const followers = await db
  .select({ userId: complaintFollowersTable.userId })
  .from(complaintFollowersTable)
  .where(eq(complaintFollowersTable.complaintId, id));
```

Loads the residents following the complaint, who are notified too.

**5.** [complaints.ts:465-474](../../src/actions/complaints.ts#L465-L474)

```ts
await notifyStatusChange({
  userId: existing.complainantId,
  followerIds: followers.map((follower) => follower.userId),
  actorId: handlerId,
  type: "complaint",
  referenceId: id,
  subject: `complaint "${existing.subject}"`,
  previousStatus: existing.status,
  status,
});
```

Jumps to `notify.ts`.

**6.** [notify.ts:56-60](../../src/lib/notify.ts#L56-L60)

```ts
export async function notifyStatusChange({
  previousStatus,
  status,
  ...target
}: NotificationTarget & { previousStatus: string; status: string }) {
```

Takes out `previousStatus` ("In Progress") and `status` ("Resolved"). Everything else is `target`.

**7.** [notify.ts:61](../../src/lib/notify.ts#L61)

```ts
if (previousStatus === status) return;
```

The statuses differ, so it continues. Setting Resolved on a complaint that's already Resolved would stop here.

**8.** [notify.ts:62](../../src/lib/notify.ts#L62)

```ts
await notify(target, status, `is now ${status}`);
```

Calls `notify` with the change "is now Resolved".

**9.** [notify.ts:30-35](../../src/lib/notify.ts#L30-L35)

```ts
const candidates = [
  { userId, message: `Your ${subject} ${change}.` },
  ...followerIds.map((followerId) => ({
    userId: followerId,
    message: `A ${subject} you're following ${change}.`,
  })),
```

Builds a message per person: `Your complaint "Clogged drainage" is now Resolved.` for the complainant, and `A complaint "Clogged drainage" you're following is now Resolved.` for each follower.

**10.** [notify.ts:36](../../src/lib/notify.ts#L36)

```ts
].filter((recipient) => recipient.userId !== actorId);
```

Removes the admin making the change, in case it's their own submission.

**11.** [notify.ts:37](../../src/lib/notify.ts#L37)

```ts
if (candidates.length === 0) return;
```

The list isn't empty, so it continues.

**12.** [notify.ts:39](../../src/lib/notify.ts#L39)

```ts
const users = await getUserDisplayInfoMap(candidates.map((recipient) => recipient.userId));
```

Looks up everyone's role in Clerk, in one batch.

**13.** [notify.ts:40](../../src/lib/notify.ts#L40)

```ts
const recipients = candidates.filter((recipient) => !isAdminRole(users.get(recipient.userId)?.role));
```

Removes admins, who can't open the Notifications page. The complainant is a resident, so they stay.

**14.** [notify.ts:41](../../src/lib/notify.ts#L41)

```ts
if (recipients.length === 0) return;
```

Still not empty, so it continues.

**15.** [notify.ts:43-45](../../src/lib/notify.ts#L43-L45)

```ts
await db
  .insert(notificationsTable)
  .values(recipients.map((recipient) => ({ ...recipient, type, referenceId, status })));
```

Saves a `notifications` row per recipient. **This is the in-app notification.** From here the resident's Notifications page and unread badge show it, whatever happens to the push.

**16.** [notify.ts:48](../../src/lib/notify.ts#L48)

```ts
const url = getNotificationHref({ type, referenceId, status });
```

Builds the link the push opens, the same one as the in-app notification:

- [notifications.ts:28](../../src/lib/notifications.ts#L28) `const { page } = NOTIFICATION_TYPE_CONFIG[type];` gives `page = "complaint"`.
- [notifications.ts:29-31](../../src/lib/notifications.ts#L29-L31) The status isn't `"Deleted"`, so it calls `getSubmissionDialogHref(page, referenceId)`.
- [portal-dialogs.ts:227](../../src/lib/ai-assistant/portal-dialogs.ts#L227) returns `` `${PORTAL_NAVIGATION_TARGETS[page].href}?${VIEW_SEARCH_PARAM}=${id}` ``, which is `/portal/complaint?view=12`.

**17.** [notify.ts:49-51](../../src/lib/notify.ts#L49-L51)

```ts
after(() =>
  sendPushNotifications(recipients.map(({ userId, message }) => ({ userId, body: message, url })))
);
```

`after` (from `next/server`, imported at [line 2](../../src/lib/notify.ts#L2)) only **schedules** the function inside it, to run once the response has been sent. Nothing is pushed yet, and the code moves straight on (see [Why `after()`](#why-after)).

**18.** [notify.ts:52](../../src/lib/notify.ts#L52), then [notify.ts:62](../../src/lib/notify.ts#L62), then [complaints.ts:476-482](../../src/actions/complaints.ts#L476-L482)

```ts
await logAudit({
  action: "status-changed",
  entityType: "complaint",
  // …
});
```

`notify` ends, `notifyStatusChange` ends, and `setComplaintStatus` records the change in the audit log.

**19.** [complaints.ts:483](../../src/actions/complaints.ts#L483)

The action ends. Next sends the response, and the admin sees the complaint as Resolved. No push has been sent yet.

### Why `after()`

At step 17, `after()` keeps two things out of the admin's action:

- **Waiting on push services.** Each push is an HTTPS request to a push service, one for every device of every recipient. With `await sendPushNotifications(...)` in its place, the admin's click would wait for all of them.
- **Push failures.** An error in the callback happens after the response has gone out, so it only reaches the server log and the admin still sees success. The in-app notification was saved at step 15 either way.

Calling `sendPushNotifications(...)` without `await` and without `after()` isn't safe on Vercel: the function can be frozen as soon as the response is sent, cutting off pushes still in flight. `after()` keeps it running until the callback finishes (Vercel's `waitUntil`). The callback still counts toward the request's `maxDuration`, 60 seconds for portal pages ([layout.tsx:11](../../src/app/portal/layout.tsx#L11)), which a few pushes come nowhere near.

### On the server, after the response

**20.** [notify.ts:50](../../src/lib/notify.ts#L50)

```ts
sendPushNotifications(recipients.map(({ userId, message }) => ({ userId, body: message, url })))
```

Next now runs the scheduled function. `recipients` and `url` still hold the values from steps 13 and 16. This builds `[{ userId, body: 'Your complaint "Clogged drainage" is now Resolved.', url: "/portal/complaint?view=12" }]` and jumps to `push.ts`.

**21.** [push.ts:18-19](../../src/lib/push.ts#L18-L19)

```ts
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
```

Reads the VAPID key pair from the environment.

**22.** [push.ts:20](../../src/lib/push.ts#L20)

```ts
if (!publicKey || !privateKey || messages.length === 0) return;
```

Both keys are set and there's a message, so it continues. A deployment without the keys stops here, with only the in-app notifications.

**23.** [push.ts:22](../../src/lib/push.ts#L22)

```ts
const messageByUserId = new Map(messages.map((message) => [message.userId, message]));
```

Indexes the messages by user, for step 27.

**24.** [push.ts:23-26](../../src/lib/push.ts#L23-L26)

```ts
const subscriptions = await db
  .select()
  .from(pushSubscriptionsTable)
  .where(inArray(pushSubscriptionsTable.userId, [...messageByUserId.keys()]));
```

Loads every recipient's subscriptions, one row per device they turned on. A recipient who never turned them on has no rows, and if nobody has any, the loop below does nothing.

**25.** [push.ts:28](../../src/lib/push.ts#L28)

```ts
const goneEndpoints: string[] = [];
```

Collects the subscriptions found dead in step 29.

**26.** [push.ts:29-30](../../src/lib/push.ts#L29-L30)

```ts
await Promise.all(
  subscriptions.map(async ({ userId, endpoint, p256dh, auth }) => {
```

Sends to every device at the same time, and waits until all of them are done. Steps 27-29 run once per row.

**27.** [push.ts:31](../../src/lib/push.ts#L31)

```ts
const { body, url } = messageByUserId.get(userId)!;
```

Picks the message for this row's user.

**28.** [push.ts:33-37](../../src/lib/push.ts#L33-L37)

```ts
await sendNotification(
  { endpoint, keys: { p256dh, auth } },
  JSON.stringify({ title: barangayName, body, url }),
  { vapidDetails: { subject: `mailto:${barangayEmail}`, publicKey, privateKey } }
);
```

The `web-push` package:

1. encrypts `{"title":"Barangay Maduya","body":"…","url":"…"}` with the row's `p256dh` and `auth` keys, so only that browser can read it
2. signs a token with the VAPID private key, proving the push comes from the server whose public key the browser subscribed with (step 9 of [Turning them on](#turning-them-on))
3. posts both to the row's `endpoint`

The push service answers 201 and holds the message until the device is online.

**29.** [push.ts:38-45](../../src/lib/push.ts#L38-L45)

```ts
} catch (error) {
  // 404/410: the browser unsubscribed, or the subscription expired.
  if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
    goneEndpoints.push(endpoint);
  } else {
    console.error("Failed to send push notification:", error);
  }
}
```

Runs only if step 28 threw. A 404 or 410 means the subscription no longer exists, so the endpoint is saved for deletion. Any other error is logged. Each device catches its own error, so one failed device doesn't stop the others.

**30.** [push.ts:49-51](../../src/lib/push.ts#L49-L51)

```ts
if (goneEndpoints.length > 0) {
  await db.delete(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.endpoint, goneEndpoints));
}
```

Deletes the dead subscriptions, so they aren't tried again.

### On the resident's device

**31.** [sw.js:4](../../public/sw.js#L4)

```js
self.addEventListener("push", (event) => {
```

The push service delivers the message. The browser starts `sw.js`, even with the site closed, and runs the `push` listener attached in step 6 of [Turning them on](#turning-them-on).

**32.** [sw.js:5](../../public/sw.js#L5)

```js
const { title, body, url } = event.data.json();
```

Reads the message, which the browser has already decrypted.

**33.** [sw.js:6-12](../../public/sw.js#L6-L12)

```js
event.waitUntil(
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    data: { url },
  })
);
```

Shows the notification in the phone's notification tray, or the computer's notification center: "Barangay Maduya", the message, and the logo. `data: { url }` stores the link on the notification for step 36. `waitUntil` keeps the service worker running until it's shown.

### When the resident taps it

**34.** [sw.js:15](../../public/sw.js#L15)

```js
self.addEventListener("notificationclick", (event) => {
```

The browser runs the click listener.

**35.** [sw.js:16](../../public/sw.js#L16)

```js
event.notification.close();
```

Removes the notification from the tray.

**36.** [sw.js:17](../../public/sw.js#L17)

```js
event.waitUntil(self.clients.openWindow(event.notification.data.url));
```

Opens `/portal/complaint?view=12`, in the browser or the Home Screen app. The complaint page reads `?view=12` with `useViewParam` and opens complaint #12's Submission Info dialog. Tapping doesn't mark the in-app notification read.

## Deletions

A deleted submission takes the same path from step 6 on, through `notifyDeletion` ([notify.ts:67-68](../../src/lib/notify.ts#L67-L68)) instead of `notifyStatusChange`. It skips the no-op check in step 7, the message says "was deleted", and at step 16 `getNotificationHref` returns just the page (`/portal/complaint`), since there's no record left to open.
