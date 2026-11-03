# Notifications

Residents are notified when the barangay acts on one of their submissions. There's no email or push: notifications are rows in the `notifications` table, shown on `/portal/notifications` with an unread count in the sidebar. Admins don't have the page (the middleware redirects them to `/portal`).

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
| `src/components/notifications/` | The page and the list item |
