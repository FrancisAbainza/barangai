# Community Hub businesses, line by line

This traces the code behind [Community Hub](../features/community-hub.md) businesses in the order it runs, jumping between files when the code does. It covers a resident submitting their business, an admin verifying it so everyone can see it, and the owner editing it later, which sends it back for review.

Line numbers are as of November 4, 2026. If they've shifted, search for the quoted code.

## Submitting a business

The resident has saved their Resident Credentials. On `/portal/community-hub`, they tap **Add Business** and fill in "Aling Nena's Karinderya": a description, the Food & Beverage category, a contact number, the days and hours they're open, two photos, their business permit and a pin on the map. Then they submit.

### In the browser

**1.** [create-business-dialog.tsx:19](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L19)

```tsx
const [open, setOpen] = useDialogParam("submit-business");
```

The dialog is on the Community Hub page for both roles ([page.tsx:23](../../src/app/portal/community-hub/page.tsx#L23)). Its open state lives in the URL as `?dialog=submit-business`, like the other services' forms, so the AI assistant can link to it.

**2.** [create-business-dialog.tsx:25-29](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L25-L29) and [line 67](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L67)

```tsx
const { data: residentProfile, isLoading: isResidentProfileLoading } = useQuery({
  queryKey: ["resident-profile", user?.id],
  queryFn: () => getResidentProfile(user!.id),
  enabled: !!user?.id && !isAdmin,
});
// …
const canSubmit = isAdmin || (!isResidentProfileLoading && !!residentProfile);
```

Residents need Resident Credentials to submit, and admins don't. Without them, the **Add Business** button is disabled (line 73) with a link to fill them in (lines 78-85), and line 70 keeps the dialog shut even on a `?dialog=` link. Only the browser checks this: `createBusiness` doesn't (step 8).

**3.** [create-business-dialog.tsx:72-77](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L72-L77)

```tsx
<DialogTrigger asChild>
  <Button size="lg" className="gap-2" disabled={!canSubmit}>
    <Store className="size-4" />
    Add Business
  </Button>
</DialogTrigger>
```

Tapping it calls the dialog's `onOpenChange`, which is `setOpen` (line 70), so `?dialog=submit-business` is added and the dialog opens.

**4.** [business-form.tsx:46-49](../../src/components/community-hub/forms/business-form.tsx#L46-L49)

```tsx
} = useForm<BusinessFormValues>({
  resolver: zodResolver(businessFormSchema),
  defaultValues: { ...baseDefaults, ...defaultValues },
});
```

The form starts empty with Food & Beverage picked (`baseDefaults`, lines 28-38), unless the AI assistant's link filled some fields in (`useDialogPrefill`, [create-business-dialog.tsx:20](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L20)).

**5.** The resident fills it in:

- Operating hours are three fields, `operatingHours.days`, `.opens` and `.closes` ([business-form.tsx:134](../../src/components/community-hub/forms/business-form.tsx#L134), [168](../../src/components/community-hub/forms/business-form.tsx#L168) and [185](../../src/components/community-hub/forms/business-form.tsx#L185)), saved together as `{ days, opens, closes }`.
- Photos take up to 10 images ([business-form.tsx:211-215](../../src/components/community-hub/forms/business-form.tsx#L211-L215)), and the permit exactly 1 document ([business-form.tsx:229-233](../../src/components/community-hub/forms/business-form.tsx#L229-L233)). Both stay in the browser until submit, like a document request's receipt ([Document requests](document-requests.md), step 6).
- The location is the same `MapPicker` as a complaint's ([business-form.tsx:248](../../src/components/community-hub/forms/business-form.tsx#L248); see [Complaints](complaints.md), steps 3-4), but optional. A business without one isn't on the map.

**6.** [business-form.tsx:52](../../src/components/community-hub/forms/business-form.tsx#L52)

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
```

**Submit** checks the values against `businessFormSchema` ([business-schema.ts:30-44](../../src/schemas/business-schema.ts#L30-L44)): a name of at least 3 characters, a description of at least 10, a contact number of 10 to 12 digits with an optional `+`, a valid link or none, at least one day with opening and closing times (lines 22-26), at most 10 photos, and exactly one permit. Then it calls the dialog's `submitBusiness`.

**7.** [create-business-dialog.tsx:35-55](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L35-L55)

```tsx
const uploadedPhotos = await Promise.all(
  (data.photos ?? []).map(async (item) => {
    if (!item.file) return item;
    const key = await uploadFile(item.file, "community-hub/photos");
    return { ...item, key, file: undefined };
  })
);

const uploadedPermit = await Promise.all(
  data.permit.map(async (item) => {
    if (!item.file) return item;
    const key = await uploadFile(item.file, "community-hub/permits");
    return { ...item, key, file: undefined };
  })
);

await createBusiness({
  ...data,
  photos: uploadedPhotos,
  permit: uploadedPermit,
});
```

Uploads the photos under `community-hub/photos` and the permit under `community-hub/permits` (how `uploadFile` works is in [Document requests](document-requests.md), step 8), then calls the server action with their keys.

### On the server

**8.** [business.ts:21-22](../../src/actions/business.ts#L21-L22)

```ts
const { userId, isAdmin } = await getAuthRole();
if (!userId) throw new Error("Unauthorized");
```

Only checks that the caller is signed in. Unlike the other services' create actions, it doesn't use `requireSubmitter`, so Resident Credentials are required only by the dialog (step 2), and a call made without the dialog doesn't need them.

**9.** [business.ts:24-36](../../src/actions/business.ts#L24-L36)

```ts
await db.insert(businessesTable).values({
  name: data.name,
  // …description, category, contactNumber
  socialMediaLink: data.socialMediaLink || null,
  operatingHours: data.operatingHours,
  photos: data.photos,
  permit: data.permit,
  location: data.location || null,
  ownerId: userId,
  ...(isAdmin ? { status: "Verified" as const, handlerId: userId } : {}),
});
```

Saves the business, with the session's user as its owner. A resident's starts as Pending ([schema.ts:287](../../src/db/schema.ts#L287)). An admin's is Verified straight away, with them as its handler. Submitting sends no notification and isn't audit logged.

### Back in the browser

**10.** [create-business-dialog.tsx:57-61](../../src/components/community-hub/dialogs/create-business-dialog.tsx#L57-L61)

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["businesses"] });
  toast.success("Business submitted successfully.");
  setOpen(false);
},
```

Every `["businesses"]` query fetches again, and the dialog closes. If anything in steps 7-9 threw, lines 62-64 show "Failed to submit business. Please try again." and the form keeps what the resident entered.

**11.** [resident-community-hub.tsx:69-77](../../src/components/community-hub/resident-community-hub.tsx#L69-L77)

```tsx
const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ["businesses", "verified", { search: debouncedSearch, category, ownedByMe }],
  queryFn: ({ pageParam }) =>
    getVerifiedBusinesses({
```

The resident's list is one of those queries. On the server, `getVerifiedBusinesses`:

- [business.ts:214-215](../../src/actions/business.ts#L214-L215) `const conditions = [ownedByMe ? isOwn : or(isOwn, eq(businessesTable.status, "Verified"))];` lists Verified businesses plus the caller's own in any status, so other residents never see a Pending one.
- [business.ts:226](../../src/actions/business.ts#L226) `return fetchBusinessesPage(conditions, offset, desc, isOwn);` passes `isOwn` as `pinFirst`, which [lines 63-67](../../src/actions/business.ts#L63-L67) sort ahead of the rest.

"Aling Nena's Karinderya" is first in the grid, with a badge saying it isn't verified yet. `fetchBusinessesPage` returns each business's whole row and its owner's name and email (lines 84-89). For other people's Verified businesses, that includes the permit's key, which any signed-in user can open through `/api/r2`, though the page only shows the permit to the owner and admins.

## Verifying it

An admin opens `/portal/community-hub`, checks the permit in the business's Submission Info, and picks **Set status → Verified** from its actions menu, in the table ([business-submissions-table.tsx:123](../../src/components/community-hub/business-submissions-table.tsx#L123)) or on its card.

### In the browser

**12.** [business-actions-menu.tsx:61-66](../../src/components/community-hub/business-actions-menu.tsx#L61-L66)

```tsx
function handleStatusSelect(status: Business["status"]) {
  if (status === "Rejected") {
    setRejectOpen(true);
    return;
  }
  changeStatus(status);
```

Verified needs no details, so it goes straight to `changeStatus`. Rejected opens a dialog for a reason and attachments instead.

**13.** [business-actions-menu.tsx:45-50](../../src/components/community-hub/business-actions-menu.tsx#L45-L50)

```tsx
if (business.status === "Rejected" && status !== "Rejected") {
  const rejectionAttachments = business.rejectionAttachments as MediaItem[];
  const keys = rejectionAttachments.map((item) => item.key).filter(Boolean) as string[];
  await Promise.all(keys.map((key) => deleteFile(key)));
}
await setBusinessStatus(business.id, status);
```

Moving away from Rejected would delete the rejection's attachments from R2 first. The business is Pending, so it calls the server action.

### On the server

**14.** [business.ts:258-261](../../src/actions/business.ts#L258-L261)

```ts
const handlerId = await requireAdmin();

const [existing] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
if (!existing) throw new Error("Business not found");
```

Throws unless the caller is an admin, and loads the business as it is before the change.

**15.** [business.ts:263-275](../../src/actions/business.ts#L263-L275)

```ts
await db
  .update(businessesTable)
  .set({
    status,
    handlerId: status === "Pending" ? null : handlerId,
    ...(status === "Rejected"
      ? // …the reason and attachments
      : { rejectionReason: null, rejectionAttachments: [] }),
    updatedAt: new Date(),
  })
  .where(eq(businessesTable.id, id));
```

Saves Verified with the admin as its handler, and clears any rejection.

**16.** [business.ts:277-285](../../src/actions/business.ts#L277-L285)

```ts
await notifyStatusChange({
  userId: existing.ownerId,
  actorId: handlerId,
  type: "community-hub",
  referenceId: id,
  subject: `business "${existing.name}"`,
  previousStatus: existing.status,
  status,
});
```

Notifies the owner: `Your business "Aling Nena's Karinderya" is now Verified.`, linking to `/portal/community-hub?view=<id>`, its Submission Info. From here it's the same code as a complaint's status change, line by line in [Phone notifications](phone-notifications.md#sending-a-status-change) (steps 6-20).

**17.** [business.ts:287-293](../../src/actions/business.ts#L287-L293)

```ts
await logAudit({
  action: "status-changed",
  entityType: "business",
  entityId: id,
  summary: `Changed ${formatReferenceNumber(id)} "${existing.name}" from ${existing.status} to ${status}`,
  changes: details ? [{ label: "Message", from: null, to: details.reason }] : [],
});
```

Records "Changed CH-5 "Aling Nena's Karinderya" from Pending to Verified" on the Audit Logs page ([audit.ts:138-149](../../src/lib/audit.ts#L138-L149)).

### Back in the browser

**18.** [business-actions-menu.tsx:52-55](../../src/components/community-hub/business-actions-menu.tsx#L52-L55)

```tsx
onSuccess: (_data, status) => {
  queryClient.invalidateQueries({ queryKey: ["businesses"] });
  toast.success(`Business marked as ${status}.`);
},
```

The admin's lists fetch again. From now on the business is Verified, so step 11's condition includes it for every resident, the map pins it at its location, and the AI assistant's `findBusinesses` lists it, since it loads every Verified business.

## Editing it

A month later, the owner changes their hours. They pick **Edit** from their business's actions menu, which only the owner gets ([business-actions-menu.tsx:95-98](../../src/components/community-hub/business-actions-menu.tsx#L95-L98)).

### In the browser

**19.** [edit-business-dialog.tsx:39](../../src/components/community-hub/dialogs/edit-business-dialog.tsx#L39)

```tsx
const needsConfirmation = !isAdmin && business.status === "Verified";
```

A resident's edit sends the business back for review, so for a Verified one they confirm first. The form opens with the business's current values (lines 97-107).

**20.** [edit-business-dialog.tsx:108-111](../../src/components/community-hub/dialogs/edit-business-dialog.tsx#L108-L111)

```tsx
onSubmit={async (data) => {
  if (needsConfirmation) setConfirmingData(data);
  else await submitBusiness(data);
}}
```

The owner saves. The business is Verified, so the values are held in `confirmingData`, which opens "Submit your business for review again?" (lines 116-124), saying other residents won't see it until it's verified again. **Save Changes** calls `saveBusiness(confirmingData!)` (line 132).

**21.** [edit-business-dialog.tsx:48-68](../../src/components/community-hub/dialogs/edit-business-dialog.tsx#L48-L68)

```tsx
const uploadedPhotos = await Promise.all(
  (data.photos ?? []).map(async (item) => {
    if (!item.file) return item;
    // …uploadFile to community-hub/photos
  })
);
// …the same for the permit

await updateBusiness(business.id, {
  ...data,
  photos: uploadedPhotos,
  permit: uploadedPermit,
});
```

The photos and permit that were already saved have no `file`, so they keep their keys. Only new ones are uploaded. A photo the owner removed, or a permit they replaced, isn't deleted from R2, so it stays in the bucket with nothing pointing to it.

### On the server

**22.** [business.ts:318](../../src/actions/business.ts#L318)

```ts
const { business, isAdmin } = await requireBusinessOwnerOrAdmin(id);
```

Runs `requireBusinessOwnerOrAdmin` ([business.ts:306-315](../../src/actions/business.ts#L306-L315)): the caller must be signed in, the business must exist, and the caller must own it or be an admin.

**23.** [business.ts:320-345](../../src/actions/business.ts#L320-L345)

```ts
await db
  .update(businessesTable)
  .set({
    name: data.name,
    // …every other field
    // A resident's edit is a resubmission: it goes back to Pending for review, and its submission
    // date becomes now so it's listed first in the admin's newest-first list.
    ...(isAdmin
      ? {}
      : {
          status: "Pending" as const,
          handlerId: null,
          rejectionReason: null,
          rejectionAttachments: [],
          createdAt: new Date(),
        }),
    updatedAt: new Date(),
  })
```

Saves the new values. The owner isn't an admin, so the business goes back to Pending with no handler, as if just submitted. It drops out of other residents' lists until an admin verifies it again (steps 12-18). The resident's edit sends no notification and isn't audit logged.

**24.** [business.ts:347-355](../../src/actions/business.ts#L347-L355)

```ts
if (isAdmin) {
  await logAudit({
    action: "updated",
    entityType: "business",
    entityId: id,
    summary: `Edited ${formatReferenceNumber(id)} "${data.name}"`,
    changes: getAuditChanges(business, data, BUSINESS_AUDIT_LABELS),
  });
}
```

Skipped for the owner. An admin's edit keeps the status and is logged with the name, description, category, contact number and social link that changed (`BUSINESS_AUDIT_LABELS`, lines 297-303).

### Back in the browser

**25.** [edit-business-dialog.tsx:72-76](../../src/components/community-hub/dialogs/edit-business-dialog.tsx#L72-L76)

```tsx
if (!isAdmin && business.status === "Rejected") {
  const rejectionAttachments = business.rejectionAttachments as MediaItem[];
  const keys = rejectionAttachments.map((item) => item.key).filter(Boolean) as string[];
  await Promise.all(keys.map((key) => deleteFile(key)));
}
```

Had the business been Rejected, step 23 would have cleared the rejection, so its attachments are deleted from R2 here. It was Verified, so nothing is deleted.

**26.** [edit-business-dialog.tsx:78-83](../../src/components/community-hub/dialogs/edit-business-dialog.tsx#L78-L83) The lists fetch again, the toast says "Business updated successfully.", and the dialogs close. The owner's card is badged as not verified again.

## Other paths

- **Rejecting.** `RejectBusinessDialog` asks for a reason and up to 5 attachments, uploads them under `community-hub/rejection-attachments`, and calls `setBusinessStatus(id, "Rejected", { reason, attachments })`. Step 15 saves them (lines 268-270), and steps 16-17 notify and log with the reason. The owner sees the reason in Submission Info, edits the business, and step 23 resubmits it.
- **Opening a business from a link.** `?business=<id>` opens the details dialog everyone sees, and `?view=<id>` opens the Submission Info with the permit and review status, for the owner and admins. How the AI assistant's `?business=` links open is in [AI assistant](ai-assistant.md#asking-for-the-nearest-business), step 19.
- **Deleting.** `deleteBusiness` lets the owner delete their business in any status and admins delete any. Only an admin's delete notifies the owner and is audit logged.
