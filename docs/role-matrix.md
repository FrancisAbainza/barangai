# Role matrix

What each role can open and do: every page, server action, file rule and AI assistant tool. Each row describes what the server enforces (the middleware in `src/proxy.ts`, the server actions and the API routes), and the "Enforced in" column names the function that checks it. The UI hides the same things, but a check in a component only hides a button. For how roles are stored and checked, see [Authentication and roles](authentication-and-roles.md).

## Roles

| Role | Who | Stored as |
|---|---|---|
| Visitor | Anyone not signed in | |
| Resident | Any signed-in user without a role | no `role` key in Clerk `publicMetadata` |
| Admin | Barangay staff | `publicMetadata.role = "admin"` |
| Super admin | Staff who manage the other accounts | `publicMetadata.role = "superadmin"` |

How to read the tables:

- **Own** means records the user created: the record's `requesterId`, `complainantId`, `ownerId` or `authorId`, or a comment's `userId`.
- **With credentials** means a resident needs saved [Resident Credentials](authentication-and-roles.md#resident-credentials). Without them the page shows a "Complete your Resident Credentials" banner instead of the form, and `requireSubmitter()` rejects the action. Admins have no credentials and are let through.
- **Same as admin** means a super admin has exactly the admin's access for that row.

## Pages

### Public pages

| Page | Visitor | Signed in (any role) |
|---|---|---|
| `/`, `/news`, `/news/:id`, `/transparency`, `/transparency/:id`, `/about-us` | Yes | Redirected to the `/portal` version (`/` → `/portal`, `/news/14` → `/portal/news/14`) |
| `/privacy`, `/terms` | Yes | Yes |

### Portal pages

A visitor who opens any `/portal` page gets Clerk's sign-in, which returns to the page afterwards.

| Page | Resident | Admin | Super admin |
|---|---|---|---|
| `/portal` (Home) | Their activity summary | The Needs Attention queue | Same as admin |
| `/portal/document-request` | Own requests and the request forms (with credentials) | Every request, no request form | Same as admin |
| `/portal/complaint` | Own and followed complaints, and the report form (with credentials) | Every complaint, no report form | Same as admin |
| `/portal/court-reservation` | Own reservations and the reservation form (with credentials) | Every reservation, and a form whose reservations are approved automatically | Same as admin |
| `/portal/community-hub` | Verified businesses and their own, and the submit form | Every business in any status, and the submit form | Same as admin |
| `/portal/news`, `/portal/news/:id` | Read, react and comment | Also post, and edit or delete own posts | Also edit or delete any post |
| `/portal/transparency`, `/portal/transparency/:id` | Read, react and comment | Also add projects, and edit or delete own projects | Also edit or delete any project |
| `/portal/about-us` | Yes | Yes | Yes |
| `/portal/profile/:userId` | Own only (others redirect to `/portal`) | Anyone's | Anyone's, with other admins' Audit Logs tab |
| `/portal/notifications` | Yes | Redirected to `/portal` | Redirected to `/portal` |
| `/portal/analytics` | Redirected to `/portal` | Yes | Yes |
| `/portal/user-management` | Redirected to `/portal` | Yes | Yes |
| `/portal/barangay-settings` | Redirected to `/portal` | Yes | Yes |
| `/portal/audit-logs` | Redirected to `/portal` | Redirected to `/portal` | Yes |

The redirects come from `src/proxy.ts`, except the profile page's, which the page does itself. The sidebar (`src/components/portal-sidebar.tsx`) hides the items a role can't open.

## Services

### Document requests

| Action | Resident | Admin | Super admin | Enforced in |
|---|---|---|---|---|
| Request a document | Yes, with credentials | No form in the admin view | Same as admin | `createDocumentRequest` |
| See requests | Own | All | All | `getMyDocumentRequests`, `getDocumentRequests`, `getDocumentRequestById` |
| Change a request's status | No | Yes | Yes | `setDocumentRequestStatus` |
| Receive a soft copy (opening it marks the request Claimed) | Own, when Ready for Pickup | No | No | `claimSoftCopyDocumentRequest` |
| Delete a request | Own, while Pending | Any | Any | `deleteDocumentRequest` |

### Complaints

| Action | Resident | Admin | Super admin | Enforced in |
|---|---|---|---|---|
| File a complaint | Yes, with credentials | No form in the admin view | Same as admin | `createComplaint` |
| Follow or unfollow a similar complaint | Yes, from the duplicate check when filing | No form in the admin view | Same as admin | `followComplaint`, `unfollowComplaint` |
| See complaints | Own, and followed ones with the complainant hidden | All | All | `getMyComplaints`, `getComplaints`, `getComplaintById` |
| Change a complaint's status | No | Yes | Yes | `setComplaintStatus` |
| Generate a complaint's AI insight | No | Yes | Yes | `generateComplaintInsight` |
| Delete a complaint | Own, while Pending and with no followers | Any | Any | `deleteComplaint` |

### Court reservations

| Action | Resident | Admin | Super admin | Enforced in |
|---|---|---|---|---|
| See which times are taken | Yes | Yes | Yes | `getTakenTimeRanges` |
| Reserve the court | Yes, with credentials. Pays by GCash and starts Pending | Yes, no payment, starts Approved | Same as admin | `createCourtReservation` |
| See reservations | Own | All | All | `getMyCourtReservations`, `getCourtReservations`, `getCourtReservationById` |
| Approve or reject a reservation | No | Yes | Yes | `setCourtReservationStatus` |
| Delete a reservation | Own, while Pending | Any | Any | `deleteCourtReservation` |

### Community Hub

| Action | Resident | Admin | Super admin | Enforced in |
|---|---|---|---|---|
| Browse businesses | Verified ones and their own | All, in any status | All, in any status | `getVerifiedBusinesses`, `getBusinesses` |
| Submit a business | Yes, starts Pending (no credentials needed) | Yes, starts Verified | Same as admin | `createBusiness` |
| Edit a business | Own, which sends it back to Pending | Own in the UI, any through the action. Status unchanged | Same as admin | `updateBusiness` |
| Verify or reject a business | No | Yes | Yes | `setBusinessStatus` |
| Delete a business | Own, in any status | Any | Any | `deleteBusiness` |

## Content

| Action | Resident | Admin | Super admin | Enforced in |
|---|---|---|---|---|
| Read news, projects, officials and goal/mission/vision | Yes (visitors too) | Yes | Yes | `getNews`, `getTransparencyProjects`, `getOfficials`, `getBarangaySettings` (no check) |
| React and comment | Yes | Yes | Yes | `setNewsReaction`, `addNewsComment`, `setTransparencyProjectReaction`, `addTransparencyProjectComment` |
| Delete a comment | Own | Own | Own | `deleteNewsComment`, `deleteTransparencyProjectComment` |
| Post news | No | Yes | Yes | `createNews` |
| Edit or delete a news post | No | Own | Any | `updateNews`, `deleteNews` |
| Add a transparency project | No | Yes | Yes | `createTransparencyProject` |
| Edit or delete a transparency project | No | Own | Any | `updateTransparencyProject`, `deleteTransparencyProject` |
| Manage officials (add, edit, delete, reorder) | No | Yes | Yes | `createOfficial`, `updateOfficial`, `deleteOfficial`, `reorderOfficials` |
| Edit barangay settings (fees, rates, GCash number, contact details, goal/mission/vision) | No | Yes | Yes | `updateBarangaySettings` |
| Manage the AI knowledge base | No | Yes | Yes | `addKnowledgeBaseDocument`, `deleteKnowledgeBaseDocument` |

## People and oversight

| Action | Resident | Admin | Super admin | Enforced in |
|---|---|---|---|---|
| Edit Resident Credentials | Own | Has none | Has none | `saveResidentProfile` |
| See another user's profile, credentials and submissions | No | Yes | Yes | Profile page, `getResidentProfile`, `get*ByUser` |
| See User Management (users, stats, deleted users) | No | Yes | Yes | `getUsers`, `getUserStats`, `getDeletedUsers` |
| Ban or unban | No | Residents only, never themselves | Anyone but themselves | `setUserBanned` |
| Change a role | No | No | Anyone, their own included | `updateUserRole` |
| Delete an account | No | No | Anyone but themselves | `deleteUser` |
| Delete all of a deleted user's data | No | No | Yes | `deleteAllUserData` |
| See Analytics | No | Yes | Yes | `getMonthlyAnalytics` |
| See the Needs Attention queue | No | Yes | Yes | `getNeedsAttentionQueue`, `getAdminPendingCounts` |
| Read audit logs | No | Own entries, on their profile | Everyone's: Audit Logs, any admin's profile, and each record's "Audit Logs" menu item | `getAuditLogs` |
| Receive notifications | Yes | No | No | `notify` in `src/lib/notify.ts` skips admins |

Making someone an admin or super admin deletes their Resident Credentials and valid ID photos. Admins' changes to submissions, posts, settings, officials, the knowledge base and accounts are written to the audit logs, and actions residents can also call (deleting a submission, editing a business) are logged only when an admin calls them. See [Audit logs](features/audit-logs.md).

## Files

Every rule here is in `src/app/api/r2/route.ts`. Public prefixes are `officials`, `news/*` and `transparency/*` (`PUBLIC_UPLOAD_PREFIXES` in `src/lib/storage.ts`). Every other prefix is private.

| Action | Visitor | Resident | Admin | Super admin |
|---|---|---|---|---|
| View a file under a public prefix | Yes | Yes | Yes | Yes |
| View a file under a private prefix | No | Yes, given its key | Yes | Yes |
| Upload under a public prefix | No | No | Yes | Yes |
| Upload under a private prefix | No | Yes | Yes | Yes |
| Delete a file | No | Own uploads (their `userId` in the key) | Any | Any |

A private file needs only a signed-in user, not its owner. Keys include a random UUID, and a user only learns the keys of records they may see.

## AI assistant

`/api/chat` needs a signed-in user. Residents and admins get different system prompts and tools (`buildResidentTools` / `buildAdminTools` in `src/lib/ai-assistant/tools/`). The session's `userId` is passed to the tools by the route, never by the model. Voice input (`transcribeVoiceInput`) works for any signed-in user.

| Tool | Resident | Admin | Super admin |
|---|---|---|---|
| `getFormLink` | The document request, complaint, court reservation and business forms | The news post, transparency project, officials, court reservation and business forms | Same as admin |
| `calculateCourtFee`, `checkCourtAvailability` | Yes | Yes | Yes |
| `findBusinesses`, `getUserLocation` | Yes | Yes | Yes |
| `findNews`, `findTransparencyProjects` | Yes | Yes | Yes |
| `getMySubmissions` | Own submissions | No | No |
| `getHandledSubmissions` | No | Yes | Yes |
| `getSubmissionOverview` | No | Yes | Yes |
| `getAnalytics` | No | Yes | Yes |
| `findAuditLogs` | No | Own entries | Everyone's |

A link the assistant gives to a record the user may not see opens nothing, because each page's by-id action checks again. See [AI assistant](ai-assistant.md).

## Keeping this up to date

When you add or change a page, server action, upload prefix or assistant tool, update its row here. A new server action needs its own check at the top even if only admin pages call it, because server actions are public HTTP endpoints. See [Adding a role check to new code](authentication-and-roles.md#adding-a-role-check-to-new-code).
