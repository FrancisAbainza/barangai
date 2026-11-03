# Authentication and roles

Clerk handles sign-in, sign-up, sessions and bans. The portal adds three roles on top and checks them in three places: the middleware decides which pages a user can open, the server actions decide what they can read and change, and the UI decides what to show.

## Roles

| Role | Stored as | Label |
|---|---|---|
| Resident | no `role` key at all | "Resident" |
| Admin | `publicMetadata.role = "admin"` | "Admin" |
| Super admin | `publicMetadata.role = "superadmin"` | "Super Admin" |

Only `admin` and `superadmin` are ever stored. A user with no role is a resident, and the literal string `"resident"` is never written. `updateUserRole(userId, null)` removes the key. Some display code falls back to `"resident"` when the key is missing (`toDisplayInfo` in `src/lib/clerk-users.ts`, `toManagedUser` in `src/actions/user-management.ts`), but that value never reaches Clerk.

Super admins can do everything admins can, plus change roles, delete accounts and data, ban other admins, and read every admin's audit logs.

### Where the role comes from

The Clerk session token carries the user's public metadata as a custom claim (set up in [Getting started](getting-started.md#4-clerk)):

```json
{ "metadata": "{{user.public_metadata}}" }
```

`types/globals.d.ts` types it as `CustomJwtSessionClaims.metadata.role`. Server code reads `sessionClaims.metadata.role`. Client code reads `useUser().user.publicMetadata.role`.

Session tokens refresh about once a minute, so a role change reaches the middleware and server actions within a minute, or right away after signing out and in.

### Helpers

| Function | File | Side | Returns |
|---|---|---|---|
| `isAdminRole(role)` | `src/lib/roles.ts` | both | true for `admin` and `superadmin` |
| `isSuperAdminRole(role)` | `src/lib/roles.ts` | both | true for `superadmin` |
| `roleLabel(role)` | `src/lib/roles.ts` | both | "Super Admin", "Admin" or "Resident" |
| `getAuthRole()` | `src/lib/auth.ts` | server | `{ userId, isAdmin, isSuperAdmin }` |
| `requireAdmin()` | `src/lib/auth.ts` | server | the user's id, or throws `Unauthorized` / `Forbidden` |
| `requireSuperAdmin()` | `src/lib/auth.ts` | server | the user's id, or throws `Unauthorized` / `Forbidden` |
| `requireSubmitter()` | `src/lib/auth.ts` | server | `{ userId, isAdmin }`, or throws `Unauthorized`, or `Resident Credentials required` for a resident without them |

## Route guards

`src/proxy.ts` is the Clerk middleware (Next 16 calls middleware "proxy"). It runs on every page and API request except static files.

| Route | Who can open it | Otherwise |
|---|---|---|
| `/`, `/news`, `/news/:id`, `/transparency`, `/transparency/:id`, `/about-us` | Signed-out visitors | Signed-in users are redirected to the `/portal` version (`/` → `/portal`, `/news/14` → `/portal/news/14`) |
| `/privacy`, `/terms` | Everyone | |
| `/portal/*` | Signed-in users | Clerk's sign-in, which returns to the page afterwards |
| `/portal/analytics`, `/portal/user-management`, `/portal/barangay-settings` | Admins and super admins | Redirect to `/` (and from there to `/portal`) |
| `/portal/audit-logs` | Super admins | Redirect to `/` |
| `/portal/notifications` | Residents | Redirect to `/portal` |
| `/portal/profile/[userId]` | The user themselves, or any admin | The page itself redirects to `/portal` |

The share-link redirect means a signed-in user who opens a Facebook link to `/news/14` stays inside the portal, with the sidebar and the AI assistant.

The sidebar (`src/components/portal-sidebar.tsx`) hides the items a role can't open with the same rules (`audience: "resident" | "admin" | "superadmin"` on each menu item), and drops a group left empty.

## Permission matrix

What each role can open and do, for every page, server action, file rule and AI assistant tool, is in the [Role matrix](role-matrix.md), with the function that enforces each row.

## Resident Credentials

A resident's Resident Credentials are their row in `resident_profiles`: name, birthdate, sex, civil status, contact number, address and a valid ID (type, front photo, optional back photo). They're filled in on the user's own profile page. See [Profiles](features/profiles.md).

- **What they unlock.** A resident without credentials sees a "Complete your Resident Credentials" banner instead of the forms on Document Request, Complaint and Court Reservation, and on the home page. Each form's `open` is also tied to the profile (`open={isDialogOpen && hasResidentProfile}`), so a link with `?dialog=` doesn't open it either. `createDocumentRequest`, `createComplaint` and `createCourtReservation` check again with `requireSubmitter()`, which lets admins through.
- **Who can read them.** `getResidentProfile(userId)` returns a profile to its owner and to admins. Admins see them in the Requester Info tab of each submission and on the user's profile.
- **Admins have none.** Admins don't request documents or file complaints, and they submit businesses and reserve the court without credentials. When `updateUserRole` makes someone an admin or super admin, it deletes their `resident_profiles` row and their valid ID photos in R2. A role set in the Clerk Dashboard skips this.

## Bans and deletions

- **Banning** calls Clerk's `banUser`. A banned user's sessions end and they can't sign in again until unbanned. Their records stay as they are.
- **Deleting an account** calls Clerk's `deleteUser`. Their records stay, shown as "Deleted User", and the Clerk webhook marks their `user_snapshots` row as deleted so they appear under User Management's Deleted Users tab. A super admin can then delete all of their data. See [User management](features/user-management.md).

## Adding a role check to new code

- A new admin-only page needs its path in `isAdminRoute` (or `isSuperAdminRoute`) in `src/proxy.ts` and an `audience` on its sidebar item.
- A new server action needs its own check at the top, even if only admin pages call it. Server actions are public HTTP endpoints: anyone who can load the app can call any exported action.
- A role check in a component only hides UI.

See [Known issues](known-issues.md) for actions that currently miss a check.
