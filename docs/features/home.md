# Home pages

`/portal` is the first page after sign-in. `src/app/portal/page.tsx` renders `ResidentHome` or `AdminHome` by role. The data comes from `src/actions/home.ts`.

## Resident home

| Section | Component | Data |
|---|---|---|
| Welcome banner | `WelcomeBanner` | The user's first name from Clerk |
| Quick actions | `QuickActionTiles` | Links to Document Request, Complaint, Court Reservation, Community Hub, News and Transparency |
| My activity | `MyActivityStrip` | `getMyActivitySummary()`: the resident's total and active document requests, complaints and court reservations |
| Latest news | `LatestNewsSection` | The first posts of `getNews({ page: 0 })`, pinned first |
| Credentials banner | `ResidentCredentialsBanner` | Shown when the resident has no Resident Credentials yet |

"Active" means the record still needs the barangay's attention:

| Kind | Active statuses |
|---|---|
| Document requests | Pending, Processing |
| Complaints | Pending, In Progress (filed by the resident, not followed) |
| Court reservations | Pending |

## Admin home

| Section | Component | Data |
|---|---|---|
| Welcome banner | `WelcomeBanner` | |
| Management shortcuts | `ManagementShortcuts` | Links to User Management, Document Requests, Complaints, Court Reservations, Community Hub and News |
| Pending requests | `PendingRequestsSummary` | `getAdminPendingCounts()`: how many document requests, businesses, court reservations and complaints are in the Pending status. Each card links to its page |
| Needs Attention | `NeedsAttentionQueue` | `getNeedsAttentionQueue()` |

### The Needs Attention queue

A short list of the submissions that have waited longest, so staff know what to pick up next.

1. It takes the 5 oldest open items of each kind:
   - document requests that are Pending or Processing
   - complaints that are Pending or In Progress
   - court reservations that are Pending
   - businesses that are Pending or Processing
2. It puts Urgent complaints first, then sorts everything else by how long it has waited, oldest first.
3. It keeps the top 8.

Each item shows a title (document type, complaint subject, reservation purpose or business name), who submitted it, a badge (the complaint's priority, or the status) and when it was submitted, and links to its page with `?view=<id>`, which opens its Submission Info.

The AI assistant's `getSubmissionOverview` returns the same queue, so "what should I work on?" in the chat matches this card.

Because Processing items count as open here, the queue can list items that `PendingRequestsSummary` (Pending only) doesn't count.

## Files

| File | What it does |
|---|---|
| `src/app/portal/page.tsx` | Picks the view |
| `src/actions/home.ts` | `getMyActivitySummary`, `getNeedsAttentionQueue`, `getAdminPendingCounts` |
| `src/components/home/` | Every section above |
| `src/components/shortcut-tile.tsx`, `src/components/stat-card.tsx` | Shared tile and stat card |
