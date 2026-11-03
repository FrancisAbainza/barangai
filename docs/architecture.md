# Architecture

The portal is one Next.js 16 App Router app that serves the public site, the signed-in portal and three API routes. Almost all reads and writes go through server actions that pages call directly. Clerk holds the users, Neon Postgres holds everything else, and Cloudflare R2 holds the files.

```
Browser ──► src/proxy.ts (Clerk middleware: sign-in and role checks per route)
   │
   ├─► Pages (src/app/**)        thin client components that pick the admin or resident view
   │      └─► React Query ──► server actions (src/actions/*.ts) ──► Drizzle ──► Neon Postgres
   │                                   ├─► Clerk Backend API (names, emails, roles)
   │                                   ├─► src/lib/notify.ts, src/lib/audit.ts (side effects)
   │                                   └─► OpenAI (complaint triage, insights, embeddings, voice)
   │
   ├─► /api/r2                 presigned R2 upload, download and delete URLs
   ├─► /api/chat               the AI assistant's streaming endpoint
   └─► /api/webhooks/clerk     mirrors Clerk users into user_snapshots
```

## Stack

| Area | Tools |
|---|---|
| Framework | Next.js 16 (App Router, server actions), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (`radix-vega` style), lucide-react, Recharts 3, sonner, motion |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | Neon Postgres with pgvector, Drizzle ORM over the Neon HTTP driver |
| Client data | TanStack React Query 5 |
| Forms | React Hook Form with Zod 4 schemas through `@hookform/resolvers` |
| Files | Cloudflare R2 through the AWS S3 SDK, presigned URLs |
| Maps | `@vis.gl/react-google-maps` (Maps JavaScript API, Geocoder, Routes library) |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`), LangChain text splitter, unpdf, streamdown |

## Folder layout

```
src/
├── app/
│   ├── layout.tsx                 Root: ClerkProvider, ThemeProvider, TooltipProvider, QueryProvider, Toaster
│   ├── page.tsx                   Public landing page (server component)
│   ├── news/, transparency/, about-us/, privacy/, terms/   Public pages
│   ├── portal/
│   │   ├── layout.tsx             Sidebar, mobile header, <Suspense>, AI assistant widget, theme sync
│   │   ├── page.tsx               Home (AdminHome or ResidentHome)
│   │   └── <page>/page.tsx        One folder per portal page
│   └── api/
│       ├── r2/route.ts            File storage
│       ├── chat/route.ts          AI assistant
│       └── webhooks/clerk/route.ts
├── actions/<domain>.ts            "use server" files: queries, auth checks, Clerk lookups, side effects
├── components/
│   ├── <domain>/                  admin-<domain>.tsx, resident-<domain>.tsx, dialogs/, forms/, tables, map views
│   ├── ui/                        shadcn/ui components (owned by the shadcn CLI)
│   ├── ai-assistant/, ai-elements/   The chat widget's UI
│   └── *.tsx                      Shared components (file uploader, pickers, maps, page header, …)
├── db/
│   ├── schema.ts                  Every table, enum and row type
│   └── config.ts                  The Drizzle client
├── hooks/                         use-dialog-param, use-view-param, use-directions, use-mobile
├── lib/
│   ├── <domain>.ts                Pure helpers per domain: badges, labels, reference numbers, formatting
│   ├── auth.ts, clerk-users.ts, notify.ts, push.ts, audit.ts, r2.ts   Server-only
│   ├── storage.ts                 Client upload/fetch/delete wrappers and the upload prefixes
│   ├── data.ts                    Barangay name, logo, city, default fees and contact details
│   └── ai-assistant/              The assistant's prompt, knowledge base search, tools and link registries
├── schemas/<name>-schema.ts       Zod form schemas, plus the enum value lists the DB enums are built from
└── proxy.ts                       Clerk middleware ("proxy" is Next 16's name for middleware)
scripts/backfill-user-snapshots.ts
types/globals.d.ts                 Clerk session claim types
```

The path alias `@/*` maps to `src/*`.

## Layouts

```
src/app/layout.tsx              ClerkProvider, ThemeProvider, TooltipProvider, QueryProvider, Toaster
│                               renders LandingHotlineBar + LandingPageHeader when signed out
└── src/app/portal/layout.tsx  SidebarProvider, PortalSidebar (md and up), PortalHeader (mobile),
                                <Suspense> around the page, AiAssistantWidget, ThemePreferenceSync
    └── page content
```

`<Show when="signed-out">` in the root layout is a server component, so the hotline bar's settings query only runs for signed-out visitors. The portal layout exports `maxDuration = 60`, which every server action called from a portal page inherits. The knowledge base upload needs it (see [AI features](ai-features.md#knowledge-base-ingestion)).

## How a portal page works

Each portal page is a thin client component that reads the role from Clerk and renders one of two views:

```tsx
// src/app/portal/complaint/page.tsx
export default function ComplaintPage() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader icon={MessageSquareWarning} title="Complaint Reporting" description="…" />
      {isAdmin ? <AdminComplaint /> : <ResidentComplaint />}
    </div>
  );
}
```

The view components (`components/<domain>/admin-<domain>.tsx` and `resident-<domain>.tsx`) fetch with React Query and call server actions for writes. The role check here only picks the UI: every server action checks authorization again.

A few pages are server components instead: the public pages, `/portal/news` and `/portal/transparency` (which check `getAuthRole()` to show the create button), `/portal/news/[id]` and `/portal/transparency/[id]` (which fetch the post on the server), and `/portal/profile/[userId]` (which looks the user up in Clerk and redirects non-admins away from other people's profiles).

## Server actions

Every file in `src/actions/` starts with `"use server"` and covers one domain. Components import and call the functions directly, and React Query wraps the calls.

### Conventions

- **Authorize first.** Each action starts with one of:
  - `auth()` from Clerk when any signed-in user may call it, throwing `"Unauthorized"` without a `userId`
  - `getAuthRole()` (`src/lib/auth.ts`) when the rule depends on the role, e.g. "the owner or an admin"
  - `requireAdmin()` or `requireSuperAdmin()`, which throw `"Unauthorized"` or `"Forbidden"` and return the user's id
  - `requireSubmitter()` in the actions that submit a request (document request, complaint, court reservation), which also requires a resident to have Resident Credentials

  Public reads used by signed-out pages (`getNews`, `getNewsById`, `getTransparencyProjects`, `getOfficials`, `getBarangaySettings`, and the comment lists) have no check.
- **Ownership checks happen on the row.** Delete and update actions load the row, then compare `requesterId`, `complainantId`, `ownerId` or `authorId` with the caller.
- **Join Clerk data in memory.** Names, emails, avatars and roles live in Clerk, not the database. List actions collect the user ids on a page, call `getUserDisplayInfoMap(ids)` (`src/lib/clerk-users.ts`) once, and merge the results. An id with no Clerk user resolves to `DELETED_USER_DISPLAY_INFO` ("Deleted User").
- **Search by name in Clerk.** Admin lists that search by requester name or email call `clerkClient().users.getUserList({ query })` and filter the DB query with `inArray(…, matchedIds)`. A search that looks like a reference number (`DR-12`, or bare digits) also matches the id as text (`referenceNumberSearchPattern`, `src/lib/reference-numbers.ts`).
- **Paginate with offsets.** Lists return `{ items, nextOffset }`, with `nextOffset` null on the last page. News and Transparency return `{ items, nextPage }` with page numbers. Results are ordered by `createdAt` and then `id`, so pages stay stable when timestamps tie. Page sizes are 10 for a user's own lists, news and projects, and 20 for admin lists, notifications and audit logs.
- **Side effects come after the write.** A status change updates the row, then calls `notifyStatusChange` (`src/lib/notify.ts`), then `logAudit` (`src/lib/audit.ts`). Both helpers are server-only.
- **User-facing errors are returned, not thrown,** when the message matters. Production builds replace a thrown server action error's message with a generic one, so `createCourtReservation` and `setCourtReservationStatus` return `{ error: "…" }` for overlaps. Other actions throw, and the UI shows a toast.
- **Types.** Export declared types (`export type Foo = {…}`) freely, but never re-export an imported type (`export type { Foo }`) from a `"use server"` file: Next's actions loader treats it as a runtime binding and every page that loads the actions bundle fails with `ReferenceError: Foo is not defined`. Import shared types from their `lib` module instead.

### Files and actions

Server actions never receive files. The client uploads each new file to R2 first (`uploadFile` in `src/lib/storage.ts`), then passes the resulting `{ key, name, type, size, contentType }` objects to the action, which stores them in a JSON column. On delete, most dialogs call the delete action and then remove the files from R2 themselves. See [File storage](file-storage.md).

## Client data with React Query

`src/components/query-provider.tsx` sets the defaults: `staleTime` 1 minute, `gcTime` 5 minutes, one retry for queries, none for mutations, and no refetch on window focus.

Query keys start with the domain, so a mutation can refresh everything about a domain by invalidating the prefix:

| Prefix | Examples |
|---|---|
| `["document-requests"]` | `["document-requests"]` (resident list), `["document-requests", "admin", {...filters}]`, `["document-requests", "admin", "stats"]`, `["document-requests", "view", id]` |
| `["complaints"]` | same shape |
| `["court-reservations"]` | same shape, plus `["court-reservation-taken-ranges", date]` |
| `["businesses"]` | `["businesses", "verified", {...}]`, `["businesses", "admin", {...}]` |
| `["news"]`, `["transparency-projects"]` | lists and single posts |
| `["notifications"]` | `["notifications", "list", { type }]`, `["notifications", "unread-count"]` |
| `["resident-profile", userId]` | a user's Resident Credentials |
| `["barangay-settings"]`, `["officials", section]`, `["knowledge-base-documents"]` | Barangay Settings and About Us |
| `["my-activity-summary"]`, `["admin-pending-counts"]`, `["admin-needs-attention"]` | the home pages |
| `["audit-logs", {...}]`, `["analytics", "monthly", month]`, `["users", ...]`, `["deletedUsers", ...]` | admin pages |

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["complaints"] });
  toast.success("Complaint submitted successfully.");
}
```

Long lists use `useInfiniteQuery` with `getNextPageParam: (lastPage) => lastPage.nextOffset`. Tables end with a `LoadMoreTrigger` row (`src/components/load-more-trigger.tsx`), whose `IntersectionObserver` fetches the next page when the row comes within 200px of the viewport.

`revalidatePath` is only needed where a server component renders the data. `updateBarangaySettings` calls `revalidatePath("/", "layout")` because the landing page, About Us and the public hotline bar render settings on the server.

## URL-driven dialogs

Dialog state that other pages need to link to lives in the URL:

| Param | Hook | Opens | Linked from |
|---|---|---|---|
| `?view=<id>` | `useViewParam()` (`src/hooks/use-view-param.ts`) | A submission's Submission Info dialog | Notifications, the admin home's Needs Attention queue, audit log entries, the AI assistant |
| `?business=<id>` | `useViewParam(BUSINESS_SEARCH_PARAM)` | A business's public details on the Community Hub (`LinkedBusinessDialog`) | The AI assistant |
| `?dialog=<id>` | `useDialogParam(id)` (`src/hooks/use-dialog-param.ts`) | A "create" form dialog | The AI assistant, and the page's own buttons |
| `?prefill=<json>` | `useDialogPrefill(id)` | Fills that form's `defaultValues` | The AI assistant |

Both hooks behave like `useState` and write with `window.history.replaceState`, which Next keeps in sync with `useSearchParams`, so opening and closing a dialog causes no server round trip. A page with `?view=<id>` fetches that record by id (e.g. `getComplaintById`), since it may not be in the loaded page of the list, and each by-id action checks that the caller may see it. `useSearchParams` needs a Suspense boundary, which the portal layout provides. A host outside `/portal` needs its own. The dialog ids are registered in `src/lib/ai-assistant/portal-dialogs.ts` (see [AI assistant](ai-assistant.md#how-a-form-gets-opened)).

## Routing and middleware

`src/proxy.ts` is the Clerk middleware. It runs on every page and API request and:

- sends signed-out visitors on `/portal/*` to sign in (`auth.protect()`)
- redirects non-admins away from `/portal/analytics`, `/portal/user-management` and `/portal/barangay-settings`, and non-super-admins away from `/portal/audit-logs`, to `/`
- redirects admins away from `/portal/notifications` to `/portal`
- redirects signed-in users on a public page to its portal twin (`/` → `/portal`, `/news/14` → `/portal/news/14`)

See [Authentication and roles](authentication-and-roles.md#route-guards).

## API routes

| Route | Methods | What it does |
|---|---|---|
| `/api/r2` | `POST`, `GET`, `DELETE` | Presigned upload URL, redirect to a presigned download URL, delete. See [File storage](file-storage.md) |
| `/api/chat` | `POST` | The AI assistant. Streams `gpt-4o-mini` with tools. See [AI assistant](ai-assistant.md) |
| `/api/webhooks/clerk` | `POST` | Verified Clerk webhook that upserts `user_snapshots`. See [User management](features/user-management.md#the-clerk-webhook-and-user_snapshots) |

Everything else goes through server actions.

## Shared building blocks per domain

The four submission domains (document requests, complaints, court reservations, businesses) follow the same shape, so learning one teaches the rest:

| Piece | Where |
|---|---|
| Table with `status`, `handlerId`, a reply message and attachments per closing status, `createdAt`, `updatedAt` | `src/db/schema.ts` |
| Form schemas and the status/category value lists | `src/schemas/<domain>-schema.ts` |
| `statusBadgeVariant`, `handlerLabel`, `formatReferenceNumber` | `src/lib/<domain>.ts` |
| `create*`, `getMy*`, `get*ByUser`, `get*ById`, `get*` (admin list), `get*Stats`, `set*Status`, `delete*` | `src/actions/<domain>.ts` |
| Resident and admin views, an actions menu, dialogs, forms, a table and sometimes a map view | `src/components/<domain>/` |

`handlerId` is the admin who last changed the status. It's cleared when the status goes back to Pending, and each admin list has an "Only show … I'm handling" filter on it.

### Reference numbers

A record's reference number is its id behind a prefix, built by `createReferenceNumbers(prefix)`. It isn't stored.

| Prefix | Record | Example |
|---|---|---|
| `DR` | Document request | `DR-12` |
| `CP` | Complaint | `CP-3` |
| `CR` | Court reservation | `CR-7` |
| `CH` | Community Hub business | `CH-5` |

## Time zones

The server runs in UTC and the barangay is in the Philippines (UTC+8, no daylight saving time). The code handles the difference in a few deliberate places:

- `getPhilippineTime()` (`src/lib/utils.ts`) returns today's Philippine date, weekday and minutes after midnight. It's used where the server needs "now": business `openNow`, court availability and the assistant's calendars.
- `toPhilippineMonth`, `getMonthStart` (`src/lib/analytics.ts`) put records in Philippine calendar months for Analytics.
- `getAuditLogsWhere` and the admin lists' date filters (`getDocumentRequests`, `getComplaints`, `getBusinesses`) read dates as Philippine days (`T00:00:00+08:00`).
- Server-formatted dates for the assistant use `timeZone: "Asia/Manila"` (`formatPhilippineDate`).
- Plain `"YYYY-MM-DD"` values (court reservation dates, `DatePicker` values) are calendar days with no time zone. Parse them with `parseDateValue` or `` `${date}T00:00:00` ``, never `new Date("YYYY-MM-DD")`, which reads UTC midnight.

The browser is assumed to be on Philippine time, so client code uses plain local `Date` methods. Forms convert a local `"YYYY-MM-DDTHH:MM"` to a `Date` in the browser before sending it (e.g. a document request's preferred claim time).

## Server-only modules

These import secrets or the database and must never be imported into a client component. Importing their types with `import type` is fine.

- `src/lib/r2.ts`, `src/lib/auth.ts`, `src/lib/clerk-users.ts`, `src/lib/notify.ts`, `src/lib/push.ts`, `src/lib/audit.ts`
- `src/lib/ai-assistant/knowledge-base-search.ts`, `src/lib/ai-assistant/system-prompt.ts`, `src/lib/ai-assistant/tools/`
- `src/db/config.ts`

`src/lib/ai-assistant/portal-navigation.ts`, `portal-dialogs.ts` and `knowledge-base.ts` are safe for both sides.

## Build and quality checks

There is no test suite. `npm run build` is the type check, and `npm run lint` runs ESLint. See the [Development guide](development-guide.md#checking-a-change) for how changes are verified.
