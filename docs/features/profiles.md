# Profiles and Resident Credentials

Every user has a profile page at `/portal/profile/[userId]`, reached from **My Profile** in the sidebar's account menu (Clerk's `UserButton`). For residents it's also where they fill in their Resident Credentials, which the main services require.

## Who can open which profile

`src/app/portal/profile/[userId]/page.tsx` is a server component:

1. A user who isn't an admin and isn't viewing their own profile is redirected to `/portal`.
2. It looks the user up with `getUserList({ userId: [id] })` rather than `getUser`, which throws for a deleted user, and loads the Resident Credentials with `getResidentProfile`.
3. It renders one of three views:

| View | When | Shows |
|---|---|---|
| `OwnProfileView` | Your own profile | Header, the Resident Credentials form (residents only), your submission tabs, and for admins your own Audit Logs tab |
| `OtherProfileView` | An admin viewing someone else | Header with the user actions menu (role, ban, delete), their Resident Credentials read-only (or a "missing" notice), their submission tabs, and an Audit Logs tab if the viewer is a super admin and the profile is an admin's |
| `DeletedProfileView` | The Clerk user no longer exists | A "Deleted User" header, their Resident Credentials if still stored, and their records |

The header (`ProfileHeader`) shows the avatar, name, email, a role badge and a Banned badge.

## Tabs

`ProfileTabs` lists the user's records with tables that page through the `get*ByUser` actions (10 at a time, 20 for businesses), which allow the user themselves and admins. A deleted user's profile always gets the resident tabs.

| Tab | Residents' profiles | Admins' profiles |
|---|---|---|
| Document Request | Yes | |
| Community Hub | Yes | Yes |
| Court Reservation | Yes | Yes |
| Complaint | Yes | |
| News | | Their posts |
| Transparency | | Their projects |
| Audit Logs | | Their own entries, for themselves and super admins |

Tab labels are hidden below the `lg` breakpoint, where the portal sidebar leaves too little room, and a heading above each table names it instead.

## Resident Credentials

The form (`ResidentProfileForm`, `residentProfileFormSchema`):

| Field | Rules |
|---|---|
| First name, last name | Required |
| Middle name | Optional |
| Birthdate | Required (`DatePicker`) |
| Sex | Male or Female |
| Civil status | Single, Married, Live-in, Widowed, Annulled, Separated |
| Contact number | Exactly 11 digits |
| Address | At least 5 characters |
| Valid ID type | National ID, TIN, Pag-IBIG, Police Clearance, NBI Clearance |
| Valid ID front | 1 image, required |
| Valid ID back | 1 image, optional |

Saving (`ResidentProfileSection`):

1. uploads new ID photos to `profile/valid-id`
2. calls `saveResidentProfile(userId, data)`, which only lets users save their own profile, writes the first and last name to Clerk (so the name shown everywhere matches), and upserts the `resident_profiles` row
3. deletes the ID photos that were replaced or removed

The same form edits existing credentials, prefilled with the stored values.

### What they unlock

A resident without credentials sees a banner (`ResidentCredentialsBanner`) linking to their profile instead of the forms on Document Request, Complaint and Court Reservation, and on their home page. Submitting a business, reacting, commenting and using the AI assistant don't need them. The check is in the UI only (see [Known issues](../known-issues.md)).

### Who sees them

`getResidentProfile` returns credentials to their owner and to admins. Admins see them in the Requester Info tab of each submission's Submission Info dialog (including the ID photos) and on the user's profile.

### Admins have none

Making a user an admin or super admin from User Management deletes their `resident_profiles` row and ID photos (`updateUserRole`). Admin profiles don't show the credentials section. A role set directly in the Clerk Dashboard skips the cleanup.

## Files

| File | What it does |
|---|---|
| `src/app/portal/profile/[userId]/page.tsx` | Access check and view selection |
| `src/actions/resident-profile.ts` | `getResidentProfile`, `saveResidentProfile` |
| `src/schemas/resident-profile-schema.ts` | The form schema and the option lists the enums use |
| `src/components/profile/` | The three views, header, tabs, credentials form and read-only view, the per-domain tables |
| `src/components/resident-credentials-banner.tsx` | The banner the service pages show |
