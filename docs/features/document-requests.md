# Document requests

Residents request barangay documents online, and admins prepare them and release them at the hall or as a downloadable soft copy. Page: `/portal/document-request`.

## Document types

Each type has its own form, dialog and Zod schema (`src/schemas/<type>-document-request-schema.ts`). All of them create a row in `document_requests` through `createDocumentRequest`.

| Type | Dialog id (`?dialog=`) | Purposes | Extra fields |
|---|---|---|---|
| Barangay Clearance | `clearance-request` | Paid: Clearance for Local Employment, Bank / Loan Requirements, Business Clearance. Free: Scholarship, Financial Support, Hospital Support, PAO (Public Attorney's Office) | GCash payment receipt (1 image) |
| Certificate of Residency | `residency-request` | Employment, School, Loan or Bank Transaction, Government Transaction, Travel, Medical or Financial Assistance, Other | |
| Certificate of No Objection | `no-objection-request` | Business Permit Application, Construction or Renovation, Tricycle / Vehicle Operation, Special Event or Gathering, Use of Public Space or Road, Other | |
| Certificate of Indigency | `indigency-request` | Medical, Financial, Educational Assistance / Scholarship, Burial, Government Subsidy Application, Other | Situation description, 1–5 supporting documents |
| Solo Parent Certification | `solo-parent-request` | Solo Parent ID Application, Educational Assistance for Children, Medical, Livelihood, Other | Situation description, 1–5 supporting documents |
| Medical / Lab Assistance | `medical-assistance-request` | Hospitalization, Laboratory / Diagnostic Test, Medicine, Surgery, Other | Situation description, 1–5 supporting documents |

Choosing "Other" requires typing the purpose, which is stored in `otherPurpose`.

### Clearance fees and payment

The clearance's paid purposes have admin-editable fees in Barangay Settings (`clearancePurposeFees`, defaults ₱60, ₱80 and ₱1,000 in `src/lib/data.ts`). Free purposes are always ₱0 (`isFreeClearancePurpose`). The form shows each purpose with its fee and the GCash number to pay.

The receipt is required for a paid purpose delivered as an Online Soft Copy, and optional for a pickup, where the resident can pay at the hall. The other document types are free and have no payment field.

### Delivery

Every form asks how the resident wants to receive the document:

- **Pickup at Barangay Hall** (`PICKUP_DELIVERY_METHOD`). The resident picks a preferred claim date and time with `PreferredClaimField`: today onward, Tuesday to Friday, 9:00 AM to 5:00 PM, in 30-minute steps. The browser turns the local `"YYYY-MM-DDTHH:MM"` into a `Date` before sending it, and the action stores it in `preferredClaimAt`. The shared `checkPreferredClaimAt` refinement makes the field required only for pickups.
- **Online Soft Copy** (`ONLINE_SOFT_COPY_DELIVERY_METHOD`). The admin attaches the finished document when marking the request Ready for Pickup, and the resident downloads it from the request's Submission Info.

## Statuses

```
Pending ──► Processing ──► Ready for Pickup ──► Claimed
   └──────────────┴──────────► Rejected
```

That's the intended flow, but an admin can set any status from any other with the actions menu's **Set status**. Setting a status:

| Status | What happens |
|---|---|
| Pending | Clears `handlerId`. Clears any pickup and rejection details |
| Processing | Sets `handlerId` to the admin |
| Ready for Pickup | Opens the **Pickup Details** dialog: a message for the requester (required) and up to 5 attachments (`document-requests/pickup-attachments`). For a soft copy, the attachment is the document. Coming back from Claimed skips the dialog and keeps the details |
| Claimed | Only offered for pickups. Sets `claimedAt` and keeps the pickup details |
| Rejected | Opens the rejection dialog: a reason (required) and up to 5 attachments |

Moving away from Ready for Pickup/Claimed or Rejected clears that status's message and deletes its attachments from R2 (the actions menu does this before calling `setDocumentRequestStatus`).

**Soft copies are claimed automatically.** When the requester opens the Submission Info of their own Ready for Pickup soft copy, the dialog calls `claimSoftCopyDocumentRequest`, which marks it Claimed. Opening it is how they receive it. The action only updates a row that's the caller's own, Ready for Pickup and a soft copy, so calling it on anything else does nothing. This change isn't audit logged and sends no notification.

## Resident view

`ResidentDocumentRequest`:

- Without Resident Credentials, a banner links to the profile instead of the document tiles.
- Six tiles open the six forms. Each dialog's open state is `useDialogParam(<id>)` and its `defaultValues` come from `useDialogPrefill(<id>)`, so the AI assistant can link to a form with fields filled in.
- **My Requests** lists the resident's requests (10 per page, `getMyDocumentRequests`) with the reference number, type, status and date. Clicking a row opens Submission Info and sets `?view=<id>`.
- A resident can delete a request only while it's Pending.

## Admin view

`AdminDocumentRequest`:

- Stat cards with the total and the Pending count (`getDocumentRequestStats`).
- A table of every request (20 per page, `getDocumentRequests`) with filters: search (requester name or email, or reference number), document type, status, delivery method, date range, newest/oldest, and "Only show requests I'm handling".
- The actions menu: **Submission Info**, **Set status**, **Delete request** (any status), and for super admins **Audit Logs** for this record.

**Submission Info** (`ViewDocumentRequestDialog`) has two tabs: Request Info (reference number, status, who's handling it, purpose, description, payment receipt, supporting documents, delivery method, preferred claim time, and the pickup or rejection details) and Requester Info (the requester's Resident Credentials, including the valid ID photos).

## Side effects

| Event | Notification to the requester | Audit log |
|---|---|---|
| Status changed by an admin | "Your Barangay Clearance request is now Ready for Pickup." | `status-changed`, with the message as a change |
| Deleted by an admin | "Your … request was deleted." | `deleted` |
| Deleted by the requester | none | none |
| Soft copy auto-claimed | none | none |

## AI assistant

- The six forms are registered in `src/lib/ai-assistant/portal-dialogs.ts` with `audience: "resident"`, so the resident assistant's `getFormLink` can open them prefilled with a purpose or delivery method.
- `getMySubmissions` returns the resident's 10 most recent requests with their status and the barangay's reply. Admins get `getHandledSubmissions` and `getSubmissionOverview`.

## Files

| File | What it does |
|---|---|
| `src/actions/document-requests.ts` | All the server actions |
| `src/lib/document-requests.ts` | `statusBadgeVariant`, `handlerLabel`, `formatReferenceNumber` (`DR-<id>`), the delivery method constants |
| `src/schemas/*-document-request-schema.ts` | One form schema per type, with its purpose list |
| `src/schemas/preferred-claim-schema.ts` | `checkPreferredClaimAt` |
| `src/schemas/document-request-pickup-schema.ts`, `…-rejection-schema.ts` | The admin's pickup and rejection forms |
| `src/components/document-request/` | Views, dialogs, forms, `PreferredClaimField` and the actions menu |
