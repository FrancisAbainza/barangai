# Document requests, line by line

This traces the code behind [document requests](../features/document-requests.md) in the order it runs, jumping between files when the code does. It follows one Barangay Clearance from the resident's form to the soft copy they download: the resident submitting it, an admin marking it Processing and then Ready for Pickup with the soft copy attached, and the resident opening it, which marks it Claimed.

The other five document types follow the same path with their own dialog and form. They have no payment receipt, and three of them upload supporting documents the same way the receipt is uploaded here.

Line numbers are as of November 4, 2026. If they've shifted, search for the quoted code.

## Submitting a request

The resident has saved their Resident Credentials. On `/portal/document-request`, they tap the **Barangay Clearance** tile, pick "Clearance for Local Employment", choose **Online Soft Copy**, upload a screenshot of their GCash payment and submit.

### In the browser

**1.** [resident-document-request.tsx:155-156](../../src/components/document-request/resident-document-request.tsx#L155-L156)

```tsx
onClick={() => {
  if (name === CLEARANCE_DOCUMENT_NAME) setIsClearanceDialogOpen(true);
```

`setIsClearanceDialogOpen` comes from `useDialogParam("clearance-request")` (line 97), so it adds `?dialog=clearance-request` to the URL ([use-dialog-param.ts:26-35](../../src/hooks/use-dialog-param.ts#L26-L35)), and the dialog reads its open state from there. That's also how the AI assistant's form links open it.

A resident without Resident Credentials never sees the tiles: lines 144-148 show a banner linking to their profile instead.

**2.** [resident-document-request.tsx:249-253](../../src/components/document-request/resident-document-request.tsx#L249-L253)

```tsx
<ClearanceDocumentRequestDialog
  documentName={CLEARANCE_DOCUMENT_NAME}
  open={isClearanceDialogOpen && hasResidentProfile}
  onOpenChange={setIsClearanceDialogOpen}
/>
```

The dialog opens. `&& hasResidentProfile` keeps it shut for a resident without credentials who arrives on a `?dialog=` link.

**3.** [clearance-document-request-form.tsx:60-63](../../src/components/document-request/forms/clearance-document-request-form.tsx#L60-L63)

```tsx
} = useForm<ClearanceDocumentRequestFormValues>({
  resolver: zodResolver(clearanceDocumentRequestFormSchema),
  defaultValues: { ...baseDefaults, ...defaultValues },
});
```

The form starts with the first purpose and **Pickup at Barangay Hall** (`baseDefaults`, lines 43-48). `defaultValues` is what the AI assistant filled in, from `useDialogPrefill` ([clearance-document-request-dialog.tsx:24](../../src/components/document-request/dialogs/clearance-document-request-dialog.tsx#L24)), and is empty when the tile opened it.

**4.** [clearance-document-request-form.tsx:69-74](../../src/components/document-request/forms/clearance-document-request-form.tsx#L69-L74)

```tsx
const { data: settings } = useQuery({
  queryKey: ["barangay-settings"],
  queryFn: () => getBarangaySettings(),
});
const gcashNumber = settings?.gcashNumber ?? DEFAULT_GCASH_NUMBER;
const purposeFees = settings?.clearancePurposeFees ?? DEFAULT_CLEARANCE_PURPOSE_FEES;
```

Loads the fees and the GCash number admins set in Barangay Settings, falling back to the defaults until they arrive. `feeLabel` (lines 76-79) puts each purpose's fee in the dropdown, or "Free" for a free purpose, and line 108 shows the amount due for the one picked.

**5.** [clearance-document-request-form.tsx:65-67](../../src/components/document-request/forms/clearance-document-request-form.tsx#L65-L67)

```tsx
const purpose = watch("purpose");
const isFree = isFreeClearancePurpose(purpose);
const isPickup = watch("receiveVia") === PICKUP_DELIVERY_METHOD;
```

These re-run whenever the resident changes the purpose or delivery method. With "Clearance for Local Employment" and Online Soft Copy, `isFree` and `isPickup` are both false:

- Line 137 shows the receipt field, since the purpose isn't free. Line 145 leaves out "(optional)", since it isn't a pickup.
- Line 164 hides the preferred claim time, which only pickups need.

**6.** [file-uploader.tsx:166-175](../../src/components/file-uploader.tsx#L166-L175)

```tsx
const toAdd: MediaItem[] = acceptedFiles
  .slice(0, remaining)
  .map((file) => ({
    file,
    name: file.name,
    type: classifyFile(file),
    size: file.size,
    contentType: file.type || undefined,
  }));
onFilesChange([...files, ...toAdd]);
```

The resident drops their screenshot on the uploader. It becomes a `MediaItem` holding the `File` itself, and the form field (`paymentReceipt`) holds the list. Nothing is uploaded yet. Files are uploaded only on submit, so a form the resident abandons leaves nothing in storage.

**7.** [clearance-document-request-form.tsx:84-87](../../src/components/document-request/forms/clearance-document-request-form.tsx#L84-L87)

```tsx
onSubmit={handleSubmit((data) =>
  // Drop a receipt uploaded before switching to a free purpose.
  onSubmit(isFree ? { ...data, paymentReceipt: [] } : data)
)}
```

**Submit Request** runs `handleSubmit`, which checks the values against `clearanceDocumentRequestFormSchema` first:

- [clearance-document-request-schema.ts:18-24](../../src/schemas/clearance-document-request-schema.ts#L18-L24) A paid purpose delivered as a soft copy needs a receipt. Without one, the field shows "Upload your GCash payment receipt" and nothing is sent.
- [clearance-document-request-schema.ts:25](../../src/schemas/clearance-document-request-schema.ts#L25) runs `checkPreferredClaimAt` ([preferred-claim-schema.ts:11](../../src/schemas/preferred-claim-schema.ts#L11)), which needs a claim time only for pickups.

The values pass, so `onSubmit` runs. Line 89's `fieldset disabled={isSubmitting}` locks the form until it finishes.

**8.** [clearance-document-request-dialog.tsx:28-34](../../src/components/document-request/dialogs/clearance-document-request-dialog.tsx#L28-L34)

```tsx
const paymentReceipt = await Promise.all(
  data.paymentReceipt.map(async (item) => {
    if (!item.file) return item;
    const key = await uploadFile(item.file, "document-requests/payment-receipts");
    return { ...item, key, file: undefined };
  })
);
```

`onSubmit` is the dialog's `submitRequest` mutation (lines 26-27). It uploads each file still in the browser and swaps the `File` for the key it was stored under. `uploadFile` runs:

- [storage.ts:31-35](../../src/lib/storage.ts#L31-L35) POSTs `{ prefix, name, type }` to `/api/r2`, asking where to put the file.
- [r2/route.ts:25-26](../../src/app/api/r2/route.ts#L25-L26) On the server: a signed-out request gets 401.
- [r2/route.ts:29-31](../../src/app/api/r2/route.ts#L29-L31) The prefix must be one listed in `storage.ts` (lines 3-26), or it gets 400.
- [r2/route.ts:35](../../src/app/api/r2/route.ts#L35) The server makes the key: `document-requests/payment-receipts/<userId>/<random id>-<file name>`. The browser doesn't choose it, so an upload can't overwrite another file, and the user id in it shows whose file it is.
- [r2/route.ts:36](../../src/app/api/r2/route.ts#L36) Only admins may upload under the public prefixes. This one is private.
- [r2/route.ts:38-50](../../src/app/api/r2/route.ts#L38-L50) signs a URL that lets its holder `PUT` that one key in R2 for 60 seconds, and returns it with the key.
- [storage.ts:38-39](../../src/lib/storage.ts#L38-L39) Back in the browser, it `PUT`s the file straight to R2 with that URL, so the file never passes through the app's server. The `PUT`'s response isn't checked, so if R2 refused it, the request is still saved with a key that points to nothing.
- [storage.ts:40](../../src/lib/storage.ts#L40) returns the key.

**9.** [clearance-document-request-dialog.tsx:36-42](../../src/components/document-request/dialogs/clearance-document-request-dialog.tsx#L36-L42)

```tsx
await createDocumentRequest({
  documentType: "Barangay Clearance",
  purpose: data.purpose,
  paymentReceipt,
  receiveVia: data.receiveVia,
  preferredClaimAt: new Date(data.preferredClaimAt),
});
```

`createDocumentRequest` is a server action, so this sends a request to the server and waits for it. The claim time is turned into a `Date` here in the browser, since the server runs in UTC. A soft copy has no claim time, and the empty string arrives as `null` (the comment at [document-requests.ts:27-28](../../src/actions/document-requests.ts#L27-L28)).

### On the server

**10.** [document-requests.ts:33](../../src/actions/document-requests.ts#L33)

```ts
const { userId } = await requireSubmitter();
```

Runs `requireSubmitter()`:

- [auth.ts:31-32](../../src/lib/auth.ts#L31-L32) reads the Clerk session, and stops a signed-out request.
- [auth.ts:33-39](../../src/lib/auth.ts#L33-L39) A resident must have a `resident_profiles` row, or it throws "Resident Credentials required". The page already checked this, but anyone can call a server action directly.
- [auth.ts:40](../../src/lib/auth.ts#L40) returns the user id.

**11.** [document-requests.ts:35-46](../../src/actions/document-requests.ts#L35-L46)

```ts
const isPickup = data.receiveVia === PICKUP_DELIVERY_METHOD;
await db.insert(documentRequestsTable).values({
  documentType: data.documentType,
  requesterId: userId,
  // …
  receiveVia: data.receiveVia,
  preferredClaimAt: isPickup ? data.preferredClaimAt : null,
});
```

Saves the request. The requester is the session's user, not anything the browser sent. `status` defaults to Pending ([schema.ts:157](../../src/db/schema.ts#L157)), with no handler. The fee isn't stored: the admin checks the receipt against the purpose. Submitting sends no notification and isn't audit logged.

### Back in the browser

**12.** [clearance-document-request-dialog.tsx:44-47](../../src/components/document-request/dialogs/clearance-document-request-dialog.tsx#L44-L47)

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["document-requests"] });
  toast.success("Request submitted successfully.");
  onOpenChange(false);
},
```

Marks every `["document-requests"]` query stale, so **My Requests** fetches again (`getMyDocumentRequests`, [resident-document-request.tsx:120-125](../../src/components/document-request/resident-document-request.tsx#L120-L125)) and the new request shows at the top as Pending. `onOpenChange(false)` removes `?dialog=` from the URL, which closes the dialog.

If anything in steps 8-11 threw, lines 49-51 show "Failed to submit request. Please try again." and the dialog stays open with the resident's entries. A receipt already uploaded in step 8 stays in R2 with nothing pointing to it, which is harmless (see [File storage](../file-storage.md)).

## Marking it Processing

An admin opens `/portal/document-request`, finds the request (DR-12) in the table, and picks **Set status → Processing** from its actions menu ([admin-document-request.tsx:382](../../src/components/document-request/admin-document-request.tsx#L382)).

### In the browser

**13.** [document-request-actions-menu.tsx:119-125](../../src/components/document-request/document-request-actions-menu.tsx#L119-L125)

```tsx
{documentRequestStatusEnum.enumValues
  .filter((status) => status !== "Claimed" || request.receiveVia === PICKUP_DELIVERY_METHOD)
  .map((status) => (
    <DropdownMenuItem
      key={status}
      disabled={status === request.status || isChangingStatus}
      onSelect={() => handleStatusSelect(status)}
```

The submenu lists every status but the current one, which is disabled. Claimed is offered only for pickups, since a soft copy is claimed when the resident opens it (step 31).

**14.** [document-request-actions-menu.tsx:73-83](../../src/components/document-request/document-request-actions-menu.tsx#L73-L83)

```tsx
function handleStatusSelect(status: DocumentRequest["status"]) {
  // Coming back from Claimed keeps the pickup details that were already filled in.
  if (status === "Ready for Pickup" && request.status !== "Claimed") {
    setReadyForPickupOpen(true);
    return;
  }
  if (status === "Rejected") {
    setRejectOpen(true);
    return;
  }
  changeStatus(status);
}
```

Processing needs no details, so it goes straight to `changeStatus`.

**15.** [document-request-actions-menu.tsx:51-62](../../src/components/document-request/document-request-actions-menu.tsx#L51-L62)

```tsx
const hasPickupAttachments = request.status === "Ready for Pickup" || request.status === "Claimed";
if (hasPickupAttachments && status !== "Ready for Pickup" && status !== "Claimed") {
  // …deleteFile for each pickup attachment
}
if (request.status === "Rejected" && status !== "Rejected") {
  // …deleteFile for each rejection attachment
}
await setDocumentRequestStatus(request.id, status);
```

Moving away from Ready for Pickup or Claimed, or from Rejected, would delete that status's attachments from R2 first. The request is Pending, so nothing is deleted, and it calls the server action.

### On the server

**16.** [document-requests.ts:288](../../src/actions/document-requests.ts#L288)

```ts
const handlerId = await requireAdmin();
```

Throws unless the caller is an admin ([auth.ts:14-19](../../src/lib/auth.ts#L14-L19)), and returns their id.

**17.** [document-requests.ts:290-294](../../src/actions/document-requests.ts#L290-L294)

```ts
const [existing] = await db
  .select()
  .from(documentRequestsTable)
  .where(eq(documentRequestsTable.id, id));
if (!existing) throw new Error("Document request not found");
```

Loads the request as it is before the change, for the old status and the requester.

**18.** [document-requests.ts:296-316](../../src/actions/document-requests.ts#L296-L316)

```ts
await db
  .update(documentRequestsTable)
  .set({
    status,
    handlerId: status === "Pending" ? null : handlerId,
    claimedAt: status === "Claimed" ? new Date() : null,
    updatedAt: new Date(),
    ...(status === "Ready for Pickup" || status === "Claimed"
      ? details
        ? { pickupMessage: details.message, pickupAttachments: details.attachments ?? [] }
        : {}
      : { pickupMessage: null, pickupAttachments: [] }),
    ...(status === "Rejected"
      ? // …the same for the rejection
      : { rejectionReason: null, rejectionAttachments: [] }),
  })
```

Saves Processing, with the admin as its handler. That's what the "Only show requests I'm handling" filter and the AI assistant's `getHandledSubmissions` go by. Processing is neither Ready for Pickup, Claimed nor Rejected, so the pickup and rejection details are cleared (lines 309 and 314).

**19.** [document-requests.ts:318-326](../../src/actions/document-requests.ts#L318-L326)

```ts
await notifyStatusChange({
  userId: existing.requesterId,
  actorId: handlerId,
  type: "document-request",
  referenceId: id,
  subject: `${existing.documentType} request`,
  previousStatus: existing.status,
  status,
});
```

Notifies the requester: "Your Barangay Clearance request is now Processing.", linking to `/portal/document-request?view=12`. From here it's the same code as a complaint's status change, line by line in [Phone notifications](phone-notifications.md#sending-a-status-change) (steps 6-20): it saves the in-app notification, and pushes to the resident's phone after the response has gone out.

**20.** [document-requests.ts:328-334](../../src/actions/document-requests.ts#L328-L334)

```ts
await logAudit({
  action: "status-changed",
  entityType: "document-request",
  entityId: id,
  summary: `Changed ${formatReferenceNumber(id)} (${existing.documentType}) from ${existing.status} to ${status}`,
  changes: details ? [{ label: "Message", from: null, to: details.message }] : [],
});
```

Records "Changed DR-12 (Barangay Clearance) from Pending to Processing" on the Audit Logs page. `logAudit` ([audit.ts:138-149](../../src/lib/audit.ts#L138-L149)) reads the admin and their role from the session and inserts an `audit_logs` row. There's no message, so there are no changes.

### Back in the browser

**21.** [document-request-actions-menu.tsx:64-67](../../src/components/document-request/document-request-actions-menu.tsx#L64-L67)

```tsx
onSuccess: (_data, status) => {
  queryClient.invalidateQueries({ queryKey: ["document-requests"] });
  toast.success(`Request marked as ${status}.`);
},
```

The table fetches again and shows Processing, with the admin as the handler. An error shows its message as a toast (lines 68-70), and the status stays as it was.

## Marking it Ready for Pickup

The admin prepares the clearance, then picks **Set status → Ready for Pickup**.

### In the browser

**22.** [document-request-actions-menu.tsx:75-77](../../src/components/document-request/document-request-actions-menu.tsx#L75-L77)

```tsx
if (status === "Ready for Pickup" && request.status !== "Claimed") {
  setReadyForPickupOpen(true);
  return;
}
```

Ready for Pickup needs a message, so instead of changing the status, this opens `AdminReadyForPickupDialog` (lines 148-152). Coming back from Claimed would skip the dialog and keep the message already given.

**23.** [document-request-pickup-schema.ts:4-7](../../src/schemas/document-request-pickup-schema.ts#L4-L7)

```ts
export const documentRequestPickupFormSchema = z.object({
  message: z.string().min(1, "Enter a message for the requester"),
  attachments: z.array(z.custom<MediaItem>()),
});
```

The admin types a message for the resident and drops the clearance's PDF on the uploader ([document-request-pickup-form.tsx:65-70](../../src/components/document-request/forms/document-request-pickup-form.tsx#L65-L70), up to 5 files). The message is required, and the attachments are optional. For a soft copy, the attachment is the document the resident receives.

**24.** [admin-ready-for-pickup-dialog.tsx:27-33](../../src/components/document-request/dialogs/admin-ready-for-pickup-dialog.tsx#L27-L33)

```tsx
const attachments = await Promise.all(
  data.attachments.map(async (item) => {
    if (!item.file) return item;
    const key = await uploadFile(item.file, "document-requests/pickup-attachments");
    return { ...item, key, file: undefined };
  })
);
```

Uploads the PDF the same way as the receipt in step 8, under `document-requests/pickup-attachments`.

**25.** [admin-ready-for-pickup-dialog.tsx:35-38](../../src/components/document-request/dialogs/admin-ready-for-pickup-dialog.tsx#L35-L38)

```tsx
await setDocumentRequestStatus(request.id, "Ready for Pickup", {
  message: data.message,
  attachments,
});
```

The same server action as step 16, this time with `details`.

### On the server

**26.** Steps 16 and 17 run again. Then, in the update:

[document-requests.ts:305-307](../../src/actions/document-requests.ts#L305-L307)

```ts
...(status === "Ready for Pickup" || status === "Claimed"
  ? details
    ? { pickupMessage: details.message, pickupAttachments: details.attachments ?? [] }
```

The status is Ready for Pickup and there are details, so the message and the PDF's key are saved on the request.

**27.** Step 19 notifies the resident: "Your Barangay Clearance request is now Ready for Pickup." Step 20 logs it with the message as a change (line 333), so the Audit Logs page shows what the admin told the resident.

**28.** [admin-ready-for-pickup-dialog.tsx:40-44](../../src/components/document-request/dialogs/admin-ready-for-pickup-dialog.tsx#L40-L44) The table fetches again, the toast says "Request marked as Ready for Pickup.", and the dialog closes.

## The resident opens it

The resident taps the notification, which opens `/portal/document-request?view=12`.

### In the browser

**29.** [resident-document-request.tsx:107-112](../../src/components/document-request/resident-document-request.tsx#L107-L112)

```tsx
const [viewId, setViewId] = useViewParam();
const { data: fetchedRequest } = useQuery({
  queryKey: ["document-requests", "view", viewId],
  queryFn: () => getDocumentRequestById(viewId!),
  enabled: viewId !== null,
});
```

`useViewParam` reads `12` from `?view=` ([use-view-param.ts:21-23](../../src/hooks/use-view-param.ts#L21-L23)), and the query fetches that request. On the server, `getDocumentRequestById` ([document-requests.ts:138-147](../../src/actions/document-requests.ts#L138-L147)) adds `requesterId = <the user>` for residents (line 143), so a resident can't open someone else's request by changing the number.

**30.** [resident-document-request.tsx:129](../../src/components/document-request/resident-document-request.tsx#L129) and [lines 270-272](../../src/components/document-request/resident-document-request.tsx#L270-L272)

```tsx
const viewedRequest = myRequests.find((request) => request.id === viewId) ?? fetchedRequest;
// …
{viewedRequest && viewId !== null && (
  <ViewDocumentRequestDialog request={viewedRequest} open onOpenChange={(open) => !open && setViewId(null)} />
)}
```

Uses the request from **My Requests** if it's already loaded, or the fetched one, and opens its Submission Info dialog. Clicking the row in **My Requests** sets `?view=12` too (line 202), and lands here the same way.

**31.** [view-document-request-dialog.tsx:75-83](../../src/components/document-request/dialogs/view-document-request-dialog.tsx#L75-L83)

```tsx
const shouldClaimSoftCopy =
  open &&
  request.requesterId === user?.id &&
  request.status === "Ready for Pickup" &&
  request.receiveVia === ONLINE_SOFT_COPY_DELIVERY_METHOD;

useEffect(() => {
  if (shouldClaimSoftCopy) claimSoftCopy();
}, [shouldClaimSoftCopy, claimSoftCopy]);
```

The dialog is open, the viewer is the requester, and it's a Ready for Pickup soft copy, so opening it counts as receiving it. Once the dialog has rendered, the effect calls `claimSoftCopy`, which calls the server action (line 72). An admin opening the same dialog doesn't claim it.

### On the server

**32.** [document-requests.ts:343-353](../../src/actions/document-requests.ts#L343-L353)

```ts
await db
  .update(documentRequestsTable)
  .set({ status: "Claimed", claimedAt: new Date(), updatedAt: new Date() })
  .where(
    and(
      eq(documentRequestsTable.id, id),
      eq(documentRequestsTable.requesterId, userId),
      eq(documentRequestsTable.status, "Ready for Pickup"),
      eq(documentRequestsTable.receiveVia, ONLINE_SOFT_COPY_DELIVERY_METHOD)
    )
  );
```

Marks it Claimed, but only if it's still the caller's own Ready for Pickup soft copy. The conditions are in the `WHERE`, so a call for any other request updates no rows. The pickup message and the PDF stay. This change sends no notification and isn't audit logged.

### Back in the browser

**33.** [view-document-request-dialog.tsx:73](../../src/components/document-request/dialogs/view-document-request-dialog.tsx#L73) `onSuccess` marks `["document-requests"]` stale. Both queries in step 29 fetch again, so the dialog and **My Requests** show Claimed, and `shouldClaimSoftCopy` is now false, so the effect doesn't run again.

**34.** [view-document-request-dialog.tsx:179-195](../../src/components/document-request/dialogs/view-document-request-dialog.tsx#L179-L195)

```tsx
{(request.pickupMessage || pickupAttachments.length > 0) && (
  // …
    {request.pickupMessage && <p className="text-sm">{request.pickupMessage}</p>}

    {pickupAttachments.length > 0 && (
      // …
        <MediaPreviewList items={pickupAttachments} />
```

The **Ready for Pickup** box shows the admin's message and the PDF. Its link is `fetchFile(key)` ([storage.ts:43-45](../../src/lib/storage.ts#L43-L45)), `/api/r2?key=…`. Opening it runs [r2/route.ts:53-73](../../src/app/api/r2/route.ts#L53-L73): a private key needs a signed-in user, and the route redirects to an R2 link signed for an hour.

## Other paths

- **Pickup instead of a soft copy.** At step 5, `isPickup` is true. The receipt is optional, since the resident can pay at the hall, and `PreferredClaimField` asks for a claim day and time, which `checkPreferredClaimAt` requires. Step 11 saves it as `preferredClaimAt`. Opening Submission Info doesn't claim a pickup. Instead, the admin picks **Set status → Claimed** when the resident collects it: step 18 sets `claimedAt` (line 301) and, with no `details`, keeps the pickup message and attachments (line 308).
- **Rejecting.** At step 14, Rejected opens `AdminRejectDocumentRequestDialog`, which works like steps 23-25 with a required reason and the `document-requests/rejection-attachments` prefix. Step 18 saves them as `rejectionReason` and `rejectionAttachments` (lines 310-313).
- **Leaving Ready for Pickup, Claimed or Rejected.** Step 15 deletes that status's attachments from R2 before the status changes, through `DELETE /api/r2` ([r2/route.ts:76-95](../../src/app/api/r2/route.ts#L76-L95)), which lets admins delete any key. Step 18 then clears the message.
- **Deleting.** `deleteDocumentRequest` ([document-requests.ts:246-276](../../src/actions/document-requests.ts#L246-L276)) lets the requester delete their own Pending request and admins delete any. Only an admin's delete notifies the requester (`notifyDeletion` skips the person deleting) and is audit logged.
