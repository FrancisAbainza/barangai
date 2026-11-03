# User management

`/portal/user-management` (admins only) lists every account, lets admins ban residents, and lets super admins change roles and delete accounts. A second tab lists deleted accounts, whose data a super admin can then wipe.

Users live in Clerk, so this page reads and writes Clerk through its Backend API (`clerkClient()`). The database only mirrors them in `user_snapshots`.

## Active Users tab

`ActiveUsersTable`, backed by `getUsers` (`src/actions/user-management.ts`):

- Columns: user (avatar, name, email), role, status (Active or Banned), joined, last sign-in, actions.
- Search goes to Clerk's `query` (name, email, username).
- The role filter (All Roles, Resident, Admin, Super Admin) can't be done by Clerk, since the role is in `publicMetadata`. `getUsers` scans Clerk in batches of 50 (newest first) and filters in memory until it fills a page of 20.
- The stat cards (`getUserStats`) count residents and admins by scanning every Clerk user in batches of 500.

Both scans get slower as the user count grows. They're fine for a barangay's few thousand accounts.

### Actions

`UserActionsMenu` (also in the header of a user's profile):

| Item | Who sees it | Action |
|---|---|---|
| View Profile | Admins | Opens `/portal/profile/<id>` |
| Role → Set as Admin / Super Admin / Resident | Super admins | `updateUserRole` |
| Ban User / Unban User | Admins for residents; super admins for anyone; never yourself | `setUserBanned` |
| Delete User | Super admins, never yourself | `deleteUser` |

**`updateUserRole(userId, role)`** (super admin) writes `publicMetadata.role` (`null` for a resident, which removes the key). When the new role is admin or super admin, it also deletes the user's Resident Credentials row and their valid ID photos from R2, since admins have none. It logs `role-changed`, noting when credentials were cleared. The change reaches the user's session within about a minute.

**`setUserBanned(userId, banned)`** (admin) calls Clerk's `banUser` / `unbanUser`. It refuses to ban yourself, and refuses an admin target unless the caller is a super admin. Banned users are signed out and can't sign in. It logs `banned` or `unbanned`.

**`deleteUser(userId)`** (super admin) deletes the Clerk account. Their records stay in the database and show as "Deleted User". It logs `deleted`. The Clerk webhook then marks their snapshot deleted, which moves them to the Deleted Users tab.

## Deleted Users tab

`DeletedUsersTable`, backed by `getDeletedUsers` (admins): every `user_snapshots` row with a `deletedAt`, newest deletion first, 20 per page, searchable by name or email. Columns: user, role at deletion, joined, deleted.

This catches deletions made anywhere: from this page, from the user's own Clerk account settings, or from the Clerk Dashboard.

Each row's menu has **View Profile** (the `DeletedProfileView`: their Resident Credentials, if any, and their records) and, for super admins only, **Delete All User Data**.

### Delete All User Data

`deleteAllUserData(userId)` (super admin) erases what the user left behind:

1. Reads every file key in their rows.
2. Deletes, in parallel, their news posts, transparency projects, reactions and comments on both, Resident Credentials, document requests, complaints, complaint follows, businesses, court reservations, the notifications addressed to them, their `user_preferences` row, and their `user_snapshots` row (which takes them off the Deleted Users list).
3. Logs `data-deleted` with their name and email, read from the snapshot first.
4. Deletes their files from R2, 1000 keys per request.

Rows that cascade from deleted posts and complaints (other users' reactions, comments and follows on them) go too.

It keeps:

- every audit log entry, including the ones they made as an admin
- knowledge base documents they uploaded and officials they added

## The Clerk webhook and `user_snapshots`

`src/app/api/webhooks/clerk/route.ts` verifies each request with `verifyWebhook` (using `CLERK_WEBHOOK_SIGNING_SECRET`) and handles three events:

| Event | What it does |
|---|---|
| `user.created`, `user.updated` | Upserts the snapshot: full name (first and last, or username, or "Unknown"), primary email, role, `joinedAt` (Clerk's `created_at`) |
| `user.deleted` | Sets `deletedAt` on the snapshot. Clerk's payload has only the id, which is why the snapshot is kept up to date beforehand. If there's no snapshot (a user from before the webhook who was never backfilled), it inserts one with placeholder values. A redelivered event keeps the original deletion time (`setWhere: isNull(deletedAt)`) |

An invalid signature gets a 400. Every other event is acknowledged with 200 and ignored.

The snapshots serve three things:

- the Deleted Users tab
- Analytics' new-user counts (`joinedAt`)
- names for deleted admins in the audit logs ("Name (deleted)")

`scripts/backfill-user-snapshots.ts` (`npm run backfill:user-snapshots`) pages through every Clerk user, 500 at a time, and upserts their snapshot. Run it once after setting up the webhook. Running it again is safe.

## Files

| File | What it does |
|---|---|
| `src/actions/user-management.ts` | `getUsers`, `getUserStats`, `updateUserRole`, `setUserBanned`, `deleteUser`, `getDeletedUsers`, `deleteAllUserData` |
| `src/app/api/webhooks/clerk/route.ts` | The webhook |
| `scripts/backfill-user-snapshots.ts` | The backfill |
| `src/components/user-management/` | The tabs, tables, both actions menus, the ban and delete dialogs |
| `src/lib/clerk-users.ts` | `getUserDisplayInfoMap`, `getUserDisplayInfo`, `DELETED_USER_DISPLAY_INFO` |
