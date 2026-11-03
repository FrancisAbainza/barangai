# Audit logs

The portal records what admins change, who changed it and what the values were before and after. Super admins read the full log on `/portal/audit-logs`. Each admin can read their own entries on their profile.

## Writing an entry

Server actions call `logAudit` (`src/lib/audit.ts`, server-only) after their change is saved:

```ts
await logAudit({
  action: "status-changed",
  entityType: "document-request",
  entityId: id,
  summary: `Changed ${formatReferenceNumber(id)} (${existing.documentType}) from ${existing.status} to ${status}`,
  changes: details ? [{ label: "Message", from: null, to: details.message }] : [],
});
```

`logAudit` fills in the actor from the session: their user id and their role at that moment (`actorRole`). Everything else is given by the caller:

| Field | What it holds |
|---|---|
| `action` | What was done. One of `AUDIT_ACTION_LABELS` in `src/lib/audit-logs.ts` |
| `entityType` | What kind of record. One of `AUDIT_ENTITY_LABELS`, shown as the entry's Category |
| `entityId` | The record's id, the Clerk user id for `user`, or the section name for a reorder |
| `summary` | One line of English with the details someone would search for: the reference number, title, names and statuses |
| `changes` | `{ label, from, to }[]`, each field's value before and after as display text |

Both the summary and the changes are snapshots, so an entry still reads correctly after the record changes again or is deleted.

### Building `changes`

`getAuditChanges(before, after, labels)` compares only the fields named in `labels` and returns the ones that differ, formatted as text (booleans become Yes/No, empty values null):

```ts
const NEWS_AUDIT_LABELS = { title: "Title", category: "Category", content: "Content", pinned: "Pinned" };

getAuditChanges({}, data, NEWS_AUDIT_LABELS)        // created: every field's "to"
getAuditChanges(existing, data, NEWS_AUDIT_LABELS)  // updated: only the fields that changed
getAuditChanges(existing, {}, NEWS_AUDIT_LABELS)    // deleted: keeps the old values as "from"
```

Only label plain values (text, numbers, booleans). Media, locations and bookkeeping columns are left out on purpose. If a column's stored format differs from the form's (the transparency budget is `"1500.00"` in the database and `1500` in the form), convert the form value first so an unchanged field doesn't show as changed.

## What's logged

| Category | Actions |
|---|---|
| Document Request | `status-changed`, `deleted` (by an admin) |
| Complaint | `status-changed`, `deleted` (by an admin) |
| Court Reservation | `status-changed`, `deleted` (by an admin) |
| Community Hub | `status-changed`, `updated` and `deleted` (by an admin) |
| News & Announcements | `created`, `updated`, `deleted` |
| Transparency | `created`, `updated`, `deleted` |
| Officials | `created`, `updated`, `deleted`, `reordered` |
| Barangay Settings | `updated` (only when a value changed) |
| AI Knowledge Base | `created`, `deleted` |
| User | `role-changed`, `banned`, `unbanned`, `deleted` (the account), `data-deleted` |

Actions that residents can also call (deleting a submission, editing or deleting a business) log only when the caller is an admin.

Not logged:

- court reservations and businesses an admin creates (they start Approved or Verified)
- generating a complaint's AI insight
- a soft copy marked Claimed when the resident opens it
- comments, reactions, Resident Credentials and theme changes
- changes made outside the app, such as a role set in the Clerk Dashboard

## The `audit_logs` table

Entries are never edited or deleted: not when their record is deleted, and not by `deleteAllUserData`. `entityId` has no foreign key for that reason. `action` and `entityType` are varchar rather than Postgres enums, so a new kind of action needs no database change. The table is indexed on `createdAt`.

## Reading entries

`getAuditLogs(filters)` (`src/actions/audit-logs.ts`) returns 20 entries per page, newest first:

- Super admins can read every entry.
- Other admins can read only their own: the call must pass `actorId` equal to their user id.
- Residents can read none.

The filters (`getAuditLogsWhere` in `src/lib/audit.ts`, shared with the AI assistant's `findAuditLogs`):

| Filter | Matches |
|---|---|
| `search` | The summary (case-insensitive), or an admin whose Clerk name or email matches |
| `entityType` | One category |
| `entityId` | One record, together with `entityType` |
| `actorId` | One admin |
| `action` | One action |
| `dateFrom`, `dateTo` | Philippine calendar days (`"YYYY-MM-DD"` read as `+08:00`) |

Who did each entry comes from Clerk (`getAuditActors`). An admin who has since been deleted falls back to their `user_snapshots` row and shows as "Name (deleted)".

## Where entries appear

| Place | Who | What |
|---|---|---|
| `/portal/audit-logs` | Super admins | Every entry, with search, category, action and date filters (`AuditLogsTable`) |
| An admin's profile, Audit Logs tab | The admin themselves, and super admins | That admin's entries (`AuditLogsTable actorId`) |
| **Audit Logs** in a record's actions menu | Super admins | That record's history (`RecordAuditLogsDialog`, filtered by `entityType` and `entityId`) |
| The AI assistant's `findAuditLogs` | Admins | Super admins search everyone, other admins only themselves |

Each entry opens `ViewAuditLogDialog` with the full summary, the actor and their role, and the table of changes. `getAuditLogHref` links to the record: a submission's page with `?view=<id>`, a post's page, Barangay Settings for officials, settings and the knowledge base, or a user's profile. Entries whose action deleted the record have no link.

## Logging a new kind of action

1. If it's a new kind of record, add it to `AUDIT_ENTITY_LABELS` and give it a link in `getAuditLogHref`. If it's a new verb, add it to `AUDIT_ACTION_LABELS` (and to `auditActionBadgeVariant` if it should look destructive).
2. Call `logAudit` in the server action after the write succeeds. For edits, define a `*_AUDIT_LABELS` object and use `getAuditChanges`.
3. Write a summary that includes what an admin would search for: the reference number or title and the people involved.

The Audit Logs page's Category and Action filters are built from the label objects, so they pick the new values up on their own.

## Files

| File | What it does |
|---|---|
| `src/lib/audit.ts` | Server-only: `logAudit`, `getAuditChanges`, `getAuditLogsWhere`, `getAuditActors`, `withAuditActors` |
| `src/lib/audit-logs.ts` | Labels, types, `auditActionBadgeVariant`, `getAuditLogHref` (safe for the client) |
| `src/actions/audit-logs.ts` | `getAuditLogs` |
| `src/components/audit-logs/` | `AuditLogsTable`, `ViewAuditLogDialog`, `RecordAuditLogsDialog` |
| `src/app/portal/audit-logs/page.tsx` | The super admins' page |
