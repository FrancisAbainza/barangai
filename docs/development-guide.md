# Development guide

Conventions for working on the codebase, step-by-step recipes for the common changes, and the gotchas that have bitten before.

## Principles

- **Prefer the plain version.** Build the simplest thing that meets the stated need. Avoid edge-case machinery that spreads one feature across many files, and when an edge case seems worth handling, raise it rather than building it in. For example, the preferred claim time is a generic `DateTimePicker` with its constraints as props, not time zone math repeated in the picker, the schema and the action.
- **Assume Philippine time in the browser.** Residents and staff are in the barangay, so client code uses plain local `Date` methods. Server code that needs "now" uses `getPhilippineTime()` (see [Architecture](architecture.md#time-zones)).
- **Write plain TypeScript.** Helpers return plain values (`boolean`, not a type predicate), and a cast at the call site is fine.
- **Authorize on the server.** Every server action checks the caller itself, whatever the UI shows (see [Authentication and roles](authentication-and-roles.md#adding-a-role-check-to-new-code)).
- **Don't make staff type more.** Reference numbers are plain `DR-12`, not zero-padded.

## Code style

- Files are kebab-case. Components are default exports, and helpers, actions and hooks are named exports.
- Client components start with `"use client"`, server action files with `"use server"`. Server-only modules start with `// Server-only — never import in Client Components.`
- Comments explain why, especially a behavior that was chosen after something else failed. Keep them next to the code they explain.
- Each domain keeps its pieces in the same places: `src/actions/<domain>.ts`, `src/lib/<domain>.ts`, `src/schemas/<domain>-schema.ts`, `src/components/<domain>/` (see [Architecture](architecture.md#shared-building-blocks-per-domain)).
- Match the surrounding code's naming and idioms. When one domain already solves the problem, copy its shape.

## Checking a change

There's no test suite. Before calling a change done:

1. `npm run lint`
2. `npm run build`, which is the type check. It also catches server/client import mistakes.
3. Run `npm run dev` and try the change as each role it affects. Use a private window for a second account: a resident (with and without Resident Credentials), an admin and a super admin. Changing your own role in User Management, or the public metadata in the Clerk Dashboard, is the quickest way to switch.
4. If you changed the schema, push it to a development database first (below).
5. For long prose in JSX (the legal pages), check the rendered text for missing spaces (see [Gotchas](#gotchas)).

### Testing the AI assistant

The assistant's behavior varies between runs, so check a prompt or tool change over several runs of the same questions. A throwaway `tsx` script under `scripts/` can call `generateText` with the same model, temperature, `stopWhen` and `parallelToolCalls` as `src/app/api/chat/route.ts`, the system prompt from `buildSystemPrompt` (with real knowledge base context from `getRelevantContext` for how-to questions) and the tools from `buildResidentTools` or `buildAdminTools`, then print each step's tool calls and the reply. Check every link in the reply: it should be a portal page the role can open, point to a record that exists and the user may see, and its prefill should survive `parseDialogPrefill`.

Scripts need `import "dotenv/config"` at the top. Tools that call server actions which check the session (`getSubmissionOverview` calls `getNeedsAttentionQueue`) fail outside a Next request, so the model reports it can't get the data. That's a script artifact, not a bug. Don't insert test rows into `audit_logs`, which is a real record.

## Recipes

### Add a column to an existing table

1. Add it to the table in `src/db/schema.ts`. A new column on a table with rows needs a default or must be nullable.
2. Run `npx drizzle-kit push` against the database **before or together with** deploying the code. Drizzle's `select()` names every schema column, so code with the new column fails on a database without it. The production database is the owner's call.
3. Write it in the `create*`/`update*` action, and add it to the row's TypeScript input type.
4. If admins can edit it and it's a plain value, add it to the domain's `*_AUDIT_LABELS`.
5. If it's a file column, follow [Add an upload location](#add-an-upload-location).

### Add a status

1. Add the value to the status list in `src/schemas/<domain>-schema.ts` (or the `pgEnum` in `schema.ts` for document requests) and push. Adding an enum value isn't destructive. Renaming or removing one needs the rows that use it updated first.
2. Give it a badge variant in `statusBadgeVariant` and a handler label in `handlerLabel` (`src/lib/<domain>.ts`).
3. If it carries a message or attachments, add the columns and extend `set*Status`: set them when entering the status, clear them when leaving it. Delete its attachments in the actions menu when leaving it.
4. Decide whether it counts as "open" in `getNeedsAttentionQueue`, `getMyActivitySummary`, `getAdminPendingCounts`, `findSimilarComplaints` and the AI assistant's tools (`src/lib/ai-assistant/tools/submissions.ts` and the admin overview).
5. The status menu, the admin filter, Analytics' split bars and the notification message read the enum, so they pick it up on their own.

### Add an upload location

See [File storage](file-storage.md#adding-an-upload-location). In short: add the prefix to `PUBLIC_UPLOAD_PREFIXES` or `PRIVATE_UPLOAD_PREFIXES`, add a `MediaItem[]` JSON column, upload in the dialog before calling the action, and delete the files wherever the record or field can go away, including `deleteAllUserData`.

### Add a portal page

1. Create `src/app/portal/<page>/page.tsx`. For a page with separate admin and resident views, make it a client component that renders `<PageHeader>` and picks `Admin<Page>` or `Resident<Page>` with `isAdminRole(useUser().user?.publicMetadata?.role)`.
2. If only some roles may open it, add its path to the right matcher in `src/proxy.ts` (`isAdminRoute`, `isSuperAdminRoute` or `isResidentOnlyRoute`).
3. Add it to `menuGroups` in `src/components/portal-sidebar.tsx`, with an `audience` if it's role-specific.
4. Add it to `PORTAL_NAVIGATION_TARGETS` (`src/lib/ai-assistant/portal-navigation.ts`) with what it's for in each role's view, so the assistant can link to it (see [AI assistant](ai-assistant.md#adding-a-page-the-assistant-can-link-to)).
5. If signed-out visitors should see a version of it, add the public page and its path to `isPublicOnlyRoute` so signed-in users are redirected to the portal version.

### Add a submission domain

A new kind of resident submission touches most of the system. Copy the closest existing domain and work through:

1. **Schema.** A table with `id`, the owner's user id, the fields, `status` (enum, default Pending), `handlerId`, a reply message and attachments per closing status, `createdAt`, `updatedAt`. Push it.
2. **Form schema** in `src/schemas/<domain>-schema.ts`, with the status and category lists exported for the enums.
3. **Lib** `src/lib/<domain>.ts`: `statusBadgeVariant`, `handlerLabel`, and `createReferenceNumbers("<XX>")` with a new two-letter prefix.
4. **Actions** `src/actions/<domain>.ts`: `create*`, `getMy*`, `get*ByUser`, `get*ById` (owner or admin, for `?view=`), `get*` (admin list with filters), `get*Stats`, `set*Status` (with `notifyStatusChange` and `logAudit`), `delete*` (owner while Pending or admin, with `notifyDeletion`, and `logAudit` when an admin deletes).
5. **Upload prefixes** for its files.
6. **Components** `src/components/<domain>/`: resident and admin views, the create dialog and form, the Submission Info dialog, reply dialogs, the delete dialog (which deletes the files), and the actions menu (with Audit Logs for super admins).
7. **Page, proxy and sidebar** as in [Add a portal page](#add-a-portal-page). Gate the form behind Resident Credentials if it needs them.
8. **Notifications**: a `notification_type` value and a `NOTIFICATION_TYPE_CONFIG` entry (see [Notifications](features/notifications.md#adding-a-notification-type)).
9. **Audit logs**: an `AUDIT_ENTITY_LABELS` entry and a `getAuditLogHref` case.
10. **Home**: add it to `getNeedsAttentionQueue`, `getAdminPendingCounts` and `getMyActivitySummary` if it should appear there.
11. **Analytics**: a query and counts in `getMonthlyAnalytics`, a tile and a breakdown card.
12. **User data**: add its rows and files to `deleteAllUserData`, and a tab to `ProfileTabs`.
13. **AI assistant**: register its create form in `portal-dialogs.ts`, add it to `tools/submissions.ts` so `getMySubmissions` and `getHandledSubmissions` include it, and to `getSubmissionOverview`.
14. **Legal pages**: update the Privacy Policy if it collects new personal data.

### Add a document request type

1. Add the type to `documentRequestTypeEnum` in `schema.ts` and push.
2. Create `src/schemas/<type>-document-request-schema.ts` with its purposes, delivery methods and `.superRefine(checkPreferredClaimAt)`.
3. Create its form and dialog in `src/components/document-request/`, following the closest existing type (copy Indigency for one with supporting documents, Residency for one without).
4. Add a tile to `documentTypes` in `resident-document-request.tsx` and mount the dialog with `useDialogParam("<id>-request")`, gated on `hasResidentProfile`.
5. Register the dialog in `portal-dialogs.ts` with `audience: "resident"` and a `prefill` schema.

### Add a barangay setting

1. Add the column to `barangaySettingsTable` with a default from `src/lib/data.ts`, and push.
2. Add it to `BarangaySettingsValues`, `DEFAULT_SETTINGS` and the mapping in `getBarangaySettings` (`src/actions/settings.ts`), and a label to `SETTINGS_AUDIT_LABELS`.
3. Add it to a settings card's form and schema (`src/schemas/settings-schema.ts`), and to the object that card is keyed on in `barangay-settings.tsx`.
4. Read it where it's needed with `getBarangaySettings()`. Server-rendered pages refresh through the existing `revalidatePath("/", "layout")`.
5. If residents might ask the assistant about it, add a line to `formatBarangaySettings` and mention it in the prompt's sentence listing what the settings cover.

### Log a new audit action

See [Audit logs](features/audit-logs.md#logging-a-new-kind-of-action).

### Make a form openable by the AI assistant

See [AI assistant](ai-assistant.md#adding-a-form-the-assistant-can-open). In short: register it in `PORTAL_DIALOG_TARGETS`, replace the dialog's `useState(false)` with `useDialogParam(id)`, and pass `useDialogPrefill(id)` into the form's `defaultValues`.

### Add a shadcn component

`npx shadcn add <name>`, then change its `import { cn } from "cn"` to `import { cn } from "@/lib/utils"` and `npm uninstall cn`.

## Gotchas

- **Never re-export an imported type from a `"use server"` file.** `export type { Foo }` in `src/actions/*` crashes every page that loads the actions bundle with `ReferenceError: Foo is not defined`, because Next's actions loader treats the specifier as a runtime binding. Declared types (`export type Foo = {…}`) are fine. Import shared types from their `lib` module instead.
- **Multi-line JSX text with an HTML entity loses its leading space** when it follows a closing tag or `{expression}`: `<strong>Other users</strong> can see … it&apos;s verified` spread over several lines rendered as "Other userscan see". It only happens when the text spans several source lines and contains `&apos;`, `&quot;` or `&amp;`. ESLint and `tsc` don't catch it. Put an explicit `{" "}` after the tag or expression.
- **Thrown server action errors lose their message in production.** Return `{ error }` for messages the user should read (see `createCourtReservation`).
- **A column in the schema but not in the database breaks every query on the table.** Push first.
- **Don't run `drizzle-kit generate`.** It would emit a migration recreating every table.
- **`new Date("YYYY-MM-DD")` is UTC midnight**, 8 AM in the Philippines. Use `parseDateValue` on the client and `+08:00` on the server.
- **Numeric columns come back as strings** (`totalAmount`, `budget`).
- **`useSearchParams` needs a Suspense boundary.** The portal layout has one. A page outside `/portal` that uses `useDialogParam` or `useViewParam` needs its own.
- **Server-only modules** (`src/lib/auth.ts`, `clerk-users.ts`, `notify.ts`, `push.ts`, `audit.ts`, `r2.ts`, `src/db/config.ts`, the assistant's prompt, search and tools) must not be imported into client components. `import type` is fine.
- **R2 files aren't deleted with their rows.** Every delete path has to remove them itself (see [File storage](file-storage.md#deleting)).
- **Role changes made in the Clerk Dashboard skip the app's side effects** (clearing Resident Credentials, the audit log).
- **Recharts doesn't draw zero-value bars** or their labels, and sorts legends by name unless given `itemSorter`.
- **The `useUser()` role is only for the UI.** It comes from the client and can be stale for up to a minute after a change.
