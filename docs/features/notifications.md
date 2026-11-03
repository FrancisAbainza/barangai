# Notifications

Residents are notified when the barangay acts on one of their submissions. Notifications are rows in the `notifications` table, shown on `/portal/notifications` with an unread count in the sidebar. Residents who turn on [phone notifications](#phone-notifications) also get each one as a Web Push on that device. There's no email or SMS. Admins don't have the page (the middleware redirects them to `/portal`).

## When a notification is sent

Only two helpers in `src/lib/notify.ts` (server-only) create notifications, and only the submission actions call them:

| Helper | Called by | Message |
|---|---|---|
| `notifyStatusChange` | `setDocumentRequestStatus`, `setComplaintStatus`, `setCourtReservationStatus`, `setBusinessStatus` | `Your <subject> is now <status>.` |
| `notifyDeletion` | `deleteDocumentRequest`, `deleteComplaint`, `deleteCourtReservation`, `deleteBusiness` | `Your <subject> was deleted.` |

`<subject>` names the submission, e.g. `Barangay Clearance request`, `complaint "Clogged drainage"`, `court reservation for Nov 8, 2026` or `business "Aling Nena's"`.

Both skip:

- **no-op changes:** setting a status to the one it already has
- **the user making the change:** an admin acting on their own business or reservation, or a resident deleting their own submission
- **admins:** one admin acting on another admin's business or reservation. Admins can't open the Notifications page, so `notify` looks up the recipients' roles in Clerk and leaves admins out.

Complaint followers get every notification the complainant gets, worded `A complaint "…" you're following is now Resolved.` (see [Complaints](complaints.md#duplicates-and-followers)).

Nothing else notifies: creating a submission, an auto-claimed soft copy, news posts, comments and replies don't.

## What's stored

Each row is a snapshot taken when it was sent:

| Column | Content |
|---|---|
| `userId` | The recipient |
| `type` | `document-request`, `complaint`, `court-reservation` or `community-hub` |
| `referenceId` | The submission's id (no foreign key, since it points to one of four tables) |
| `status` | The new status, or `"Deleted"` (`DELETED_NOTIFICATION_STATUS`) |
| `message` | The text above |
| `readAt` | When it was opened, or null |

A submission's notifications are kept when it's deleted, so the resident still sees its history.

## Links

`getNotificationHref` (`src/lib/notifications.ts`) builds each notification's link:

- normally the submission's page with `?view=<id>` (`getSubmissionDialogHref`), which opens its Submission Info dialog
- for a `Deleted` notification, just the page, since there's nothing left to open

Older notifications about a deleted submission still link with `?view=`. The page's by-id fetch then finds nothing and no dialog opens.

## The page

`ResidentNotifications`:

- a type filter (All, Document Request, Community Hub, Court Reservation, Complaint)
- an infinite list, 20 per page (`getMyNotifications`), newest first, with the time as "2 hours ago" for the past week and a date after that (`formatRelativeTime`)
- **Mark all as read** (`markAllNotificationsRead`)
- clicking a notification marks it read (`markNotificationRead`) and follows its link

The sidebar's badge shows `getUnreadNotificationCount()`, refetched every 60 seconds (`refetchInterval`) and only for residents.

## Phone notifications

Web Push sends each notification to the resident's phone or computer too, even with the site closed. No native app or paid service is involved: the browser's own push service (Google's FCM for Chrome, Apple's for Safari, Mozilla's for Firefox) delivers it.

For the code that runs when a resident turns them on and when a status change is pushed, in order and line by line, see [Phone notifications, line by line](../walkthroughs/phone-notifications.md).

### Turning them on

The Notifications page has a **Phone notifications** card (`PushNotificationToggle`) at the top. Each device is turned on separately. The card shows one of:

| State | When | What it offers |
|---|---|---|
| Off | Supported and not turned on here | **Turn on**: asks for notification permission, registers `public/sw.js`, subscribes with the VAPID public key and saves the subscription (`savePushSubscription`) |
| On | This browser has a subscription | **Turn off**: deletes the row (`deletePushSubscription`), then unsubscribes the browser |
| Blocked | Permission was denied | How to allow it in the site settings |
| Needs Home Screen | iPhone or iPad, in the browser | How to add the site to the Home Screen |
| Unsupported | No Web Push (e.g. an in-app browser like Messenger's) | Try Chrome or Safari |

The card doesn't show when `NEXT_PUBLIC_VAPID_PUBLIC_KEY` isn't set.

**iPhone and iPad** get Web Push only on iOS 16.4 or later, and only from a site added to the Home Screen (Share → Add to Home Screen), so the browser shows the "Needs Home Screen" hint. `src/app/manifest.ts` makes the site installable for that (`display: standalone`), with the icons in `public/icons/` and `src/app/apple-icon.png`. The Home Screen app keeps its own sign-in, separate from Safari's, so the resident signs in again there. Android Chrome works in the browser, no install needed.

### Sending

After saving the notifications, `notify()` hands them to `sendPushNotifications` (`src/lib/push.ts`, server-only) inside Next's `after()`, so pushes go out after the admin's action has responded (see [Why `after()`](../walkthroughs/phone-notifications.md#why-after)). It sends `{ title, body, url }` to every subscription of each recipient: the barangay name, the notification's message, and its link (`getNotificationHref`). A failed push is only logged and never fails the action. The skips above apply to pushes too, since only saved notifications are pushed.

`public/sw.js` shows the push with the barangay logo and opens the link when it's tapped. Tapping a push doesn't mark the notification read.

### Subscriptions

`push_subscriptions` holds one row per browser: the push service `endpoint` (unique) and the `p256dh`/`auth` keys the payload is encrypted with. `savePushSubscription` accepts only `https` endpoints, since the server posts to them.

- **Shared phones.** `PushSubscriptionSync`, mounted in the portal layout, re-saves this browser's subscription for the signed-in user on every portal load. If two residents use the same phone, it gets the notifications of whoever used the portal last. The re-save also covers a subscription the browser renewed, or one that failed to save.
- **Dead subscriptions.** When the push service answers 404 or 410 (the browser unsubscribed, or the subscription expired), `sendPushNotifications` deletes the row.
- **Deleted users.** The Clerk webhook deletes a user's subscriptions on `user.deleted`, and `deleteAllUserData` deletes them with the rest of their data.

### Keys

Web Push needs a VAPID key pair: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the browser subscribes with it) and `VAPID_PRIVATE_KEY` (the server signs pushes with it). Generate a pair once with:

```bash
npx web-push generate-vapid-keys
```

Keep the same pair once residents have subscribed. A new pair invalidates every subscription, and residents have to turn phone notifications on again. Without the keys, `sendPushNotifications` does nothing and only the in-app notifications are sent.

## Retention

Read notifications are deleted 30 days after they were read (`READ_NOTIFICATION_RETENTION_DAYS`). There's no scheduled job: `getMyNotifications` deletes the caller's expired ones when it loads the first page, and not on later pages, so loading more doesn't shift the offsets. Unread notifications are kept until read.

`unfollowComplaint` deletes the follower's notifications about that complaint (`deleteNotificationsFor`), since it's no longer in their list.

## Adding a notification type

1. Add the value to `notificationTypeEnum` in `src/db/schema.ts` and push it to the database.
2. Add it to `NOTIFICATION_TYPE_CONFIG` in `src/lib/notifications.ts` with a label and the page it links to (a `PortalNavigationTargetId`).
3. Make sure that page opens its Submission Info from `?view=<id>` with `useViewParam`, backed by a by-id action that checks the caller may see the record.
4. Call `notifyStatusChange` / `notifyDeletion` from the domain's actions, after the database write.

## Files

| File | What it does |
|---|---|
| `src/lib/notify.ts` | Server-only senders: `notifyStatusChange`, `notifyDeletion`, `deleteNotificationsFor` |
| `src/lib/notifications.ts` | Types and labels, retention, `getNotificationHref`, `formatRelativeTime` |
| `src/actions/notifications.ts` | `getMyNotifications`, `getUnreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead` |
| `src/components/notifications/` | The page, the list item and `PushNotificationToggle` |
| `src/lib/push.ts` | Server-only: `sendPushNotifications` |
| `src/lib/push-subscription.ts` | Browser helpers: `isPushSupported`, `getPushSubscription`, the VAPID public key |
| `src/actions/push-subscriptions.ts` | `savePushSubscription`, `deletePushSubscription` |
| `src/components/push-subscription-sync.tsx` | Re-saves the browser's subscription for the signed-in user on portal load |
| `public/sw.js` | The service worker: shows a push and opens its link |
| `src/app/manifest.ts` | The web app manifest, for adding the site to the Home Screen |
