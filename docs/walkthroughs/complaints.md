# Complaints, line by line

This traces the code behind [complaints](../features/complaints.md) in the order it runs, jumping between files when the code does. It covers a resident filing a complaint (the AI picks its category and priority, and the app looks for complaints already filed nearby), a second resident following that complaint instead of filing their own, and an admin resolving it, which notifies both of them.

Line numbers are as of November 4, 2026. If they've shifted, search for the quoted code.

## Filing a complaint

The resident has saved their Resident Credentials. On `/portal/complaint`, they tap **File a Complaint**, enter "Clogged drainage" and a description, tap the spot on the map, add a photo and submit. Nobody has reported anything near it.

### In the browser

**1.** [resident-complaint.tsx:51](../../src/components/complaint/resident-complaint.tsx#L51)

```tsx
<Button onClick={() => setIsReportDialogOpen(true)} className="gap-2">
```

`setIsReportDialogOpen` comes from `useDialogParam("report-complaint")` (line 15), so it adds `?dialog=report-complaint` to the URL, and line 60 opens `ReportComplaintDialog` with `open={isReportDialogOpen && hasResidentProfile}`. A resident without Resident Credentials sees a banner instead of the button (lines 30-34).

**2.** [complaint-form.tsx:32-35](../../src/components/complaint/forms/complaint-form.tsx#L32-L35)

```tsx
} = useForm<ComplaintFormValues>({
  resolver: zodResolver(complaintFormSchema),
  defaultValues: { ...baseDefaults, ...defaultValues },
});
```

The form starts empty (`baseDefaults`, lines 20-24), unless the AI assistant's link filled in the subject or description ([report-complaint-dialog.tsx:58](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L58), passed in at line 136). There's no category or priority field: the AI picks them in step 8.

**3.** [map-picker.tsx:92-94](../../src/components/map-picker.tsx#L92-L94)

```tsx
const handleMapClick = (ev: MapMouseEvent) => {
  if (!ev.detail.latLng) return;
  resolveLocation(ev.detail.latLng);
```

The resident taps the map. Dragging the pin (line 97) or **Use current location** (line 83) end up in the same function.

**4.** [map-picker.tsx:74-75](../../src/components/map-picker.tsx#L74-L75)

```tsx
const address = geocoder ? await coordinatesToAddress(geocoder, coordinates) : "";
onChange({ coordinates, address });
```

Asks Google's Geocoder for the address at those coordinates ([geocoding.ts:12-15](../../src/lib/geocoding.ts#L12-L15)), then sets the form's `location` to `{ coordinates, address }`. If the lookup fails, the address is empty and the location still counts.

**5.** [complaint-form.tsx:81-86](../../src/components/complaint/forms/complaint-form.tsx#L81-L86)

```tsx
<FileUploader
  files={field.value}
  onFilesChange={field.onChange}
  maxFiles={5}
  accept={["images", "videos"]}
/>
```

The photo is kept in the browser as a `MediaItem` holding the `File`, the same as a document request's receipt ([Document requests](document-requests.md), step 6). It isn't uploaded yet, and won't be at all if the resident ends up following another complaint.

**6.** [complaint-form.tsx:38](../../src/components/complaint/forms/complaint-form.tsx#L38)

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
```

**Submit Complaint** checks the values against `complaintFormSchema` ([complaint-schema.ts:54-61](../../src/schemas/complaint-schema.ts#L54-L61)): a subject of at least 3 characters, a description of at least 10, a location, and at most 5 files. They pass, so it calls `onSubmit`, which is [report-complaint-dialog.tsx:137-138](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L137-L138), `await submitComplaint(data)`.

**7.** [report-complaint-dialog.tsx:74-78](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L74-L78)

```tsx
const [insights, matches] = await Promise.all([
  analyzeComplaint({ subject: data.subject, description: data.description }),
  // The duplicate check is a convenience, so it failing shouldn't stop the resident from filing.
  findSimilarComplaints(data.location).catch((): SimilarComplaint[] => []),
]);
```

Calls two server actions at once and waits for both. If the duplicate check fails, it counts as no matches. If the AI call fails, the whole submit fails (see step 14).

### On the server: the AI's category and priority

**8.** [complaints.ts:33-52](../../src/actions/complaints.ts#L33-L52)

```ts
const { object } = await generateObject({
  model: openai("gpt-4o-mini"),
  schema: complaintInsightsSchema,
  temperature: 0,
  prompt: `You are triaging a resident complaint submitted to a Philippine barangay (village) administrative office. …
```

After checking the user is signed in (lines 30-31), it sends the subject and description to `gpt-4o-mini`. `generateObject` makes the reply fit `complaintInsightsSchema` ([complaint-schema.ts:21-24](../../src/schemas/complaint-schema.ts#L21-L24)): one of the categories and one of Low, Medium, High or Urgent. The rubric at lines 44-51 bases the priority on what happened, not on how upset the resident sounds. Temperature 0 gives the same answer for the same text. For a clogged drain it returns something like `{ category: "Sanitation", priority: "Medium" }`.

### On the server, at the same time: complaints nearby

**9.** [complaints.ts:289-300](../../src/actions/complaints.ts#L289-L300)

```ts
const candidates = await db
  .select({ /* id, subject, description, category, status, location, createdAt */ })
  .from(complaintsTable)
  .where(and(...matchableBy(userId), notInArray(complaintsTable.id, followedComplaintIds(userId))));
```

Loads the complaints this resident could be shown. `matchableBy` (lines 263-269) keeps the ones that are Pending or In Progress, filed by someone else, and not about Noise, Domestic or Others (lines 254-257 say why). Complaints they already follow are left out. The complainant isn't selected, so it can't reach the browser.

**10.** [complaints.ts:302-310](../../src/actions/complaints.ts#L302-L310)

```ts
return candidates
  .map(({ location: candidateLocation, ...candidate }) => ({
    ...candidate,
    address: candidateLocation.address,
    distanceMeters: distanceInMeters(location.coordinates, candidateLocation.coordinates),
  }))
  .filter((candidate) => candidate.distanceMeters <= SIMILAR_COMPLAINT_RADIUS_METERS)
  .sort((a, b) => a.distanceMeters - b.distanceMeters)
  .slice(0, MAX_SIMILAR_COMPLAINTS);
```

Works out each one's straight-line distance from the picked spot ([geolocation.ts:4-12](../../src/lib/geolocation.ts#L4-L12)), keeps those within 150 m, and returns the nearest 3. It matches by distance only, since the AI may call the same drain Sanitation once and Environment the next time (lines 280-283). Nothing is within 150 m, so it returns `[]`.

### Back in the browser

**11.** [report-complaint-dialog.tsx:79-82](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L79-L82)

```tsx
if (matches.length > 0) return { data, insights, matches };

await createWithEvidence(data, insights);
return null;
```

No matches, so it files the complaint right away. With matches, it would stop here and ask (see [Following an existing complaint](#following-an-existing-complaint)).

**12.** [report-complaint-dialog.tsx:38-53](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L38-L53)

```tsx
async function createWithEvidence(data: ComplaintFormValues, insights: ComplaintInsights) {
  const evidence = await Promise.all(
    data.evidence.map(async (item) => {
      if (!item.file) return item;
      const key = await uploadFile(item.file, "complaints/evidence");
      return { ...item, key, file: undefined };
    })
  );

  await createComplaint({
    subject: data.subject,
    description: data.description,
    location: data.location,
    evidence,
    ...insights,
  });
}
```

Uploads the photo under `complaints/evidence` (how `uploadFile` works is in [Document requests](document-requests.md), step 8), then calls `createComplaint` with the form's values and the AI's category and priority.

### On the server

**13.** [complaints.ts:100-110](../../src/actions/complaints.ts#L100-L110)

```ts
const { userId } = await requireSubmitter();

await db.insert(complaintsTable).values({
  complainantId: userId,
  subject: data.subject,
  description: data.description,
  location: data.location,
  evidence: data.evidence,
  category: data.category,
  priority: data.priority,
});
```

`requireSubmitter` stops a signed-out caller, or a resident without Resident Credentials ([auth.ts:30-41](../../src/lib/auth.ts#L30-L41)). Then it saves the complaint, with the session's user as the complainant. `status` defaults to Pending ([schema.ts:184](../../src/db/schema.ts#L184)). Filing sends no notification and isn't audit logged.

### Back in the browser

**14.** [report-complaint-dialog.tsx:84-86](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L84-L86), then [lines 66-70](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L66-L70)

```tsx
function handleCreated() {
  queryClient.invalidateQueries({ queryKey: ["complaints"] });
  toast.success("Complaint submitted successfully.");
  handleOpenChange(false);
}
```

`onSuccess` gets `null` from step 11, so it calls `handleCreated`. **My Complaints** fetches again and shows the complaint as Pending, and the dialog closes. If anything in steps 7-13 threw, lines 88-90 show "Failed to submit complaint. Please try again." and the form keeps what the resident entered.

## Following an existing complaint

A second resident reports the same drain, and taps a spot 40 m from the first complaint. Steps 1-10 run again for them. This time step 10 returns the first complaint.

### In the browser

**15.** [report-complaint-dialog.tsx:79](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L79)

```tsx
if (matches.length > 0) return { data, insights, matches };
```

Returns before anything is uploaded or created, holding the resident's entries, the AI's answer and the matches.

**16.** [report-complaint-dialog.tsx:84-85](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L84-L85)

```tsx
onSuccess: (submission) => {
  if (submission) setPending(submission);
```

`pending` is set, and the dialog re-renders:

- [report-complaint-dialog.tsx:123](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L123) The title becomes "Is this the same issue?".
- [report-complaint-dialog.tsx:134](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L134) The form is hidden, not removed, so **Back** returns to it with what the resident typed.
- [report-complaint-dialog.tsx:146](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L146) Each match shows its subject, status, description, address, distance (rounded to 10 m), category and filing date. It doesn't show who filed it.

**17.** [report-complaint-dialog.tsx:170](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L170)

```tsx
onClick={() => follow(match.id)}
```

The resident taps **This is the same issue**, which calls `followComplaint` (lines 105-106).

### On the server

**18.** [complaints.ts:319-323](../../src/actions/complaints.ts#L319-L323)

```ts
const [complaint] = await db
  .select({ id: complaintsTable.id })
  .from(complaintsTable)
  .where(and(eq(complaintsTable.id, id), ...matchableBy(userId)));
if (!complaint) throw new Error("This complaint can no longer be followed.");
```

Checks again that the complaint is one this resident may follow (step 9's rules), since the id came from the browser and the complaint may have been resolved in the meantime.

**19.** [complaints.ts:325](../../src/actions/complaints.ts#L325)

```ts
await db.insert(complaintFollowersTable).values({ complaintId: id, userId }).onConflictDoNothing();
```

Adds a `complaint_followers` row. Following twice changes nothing.

### Back in the browser

**20.** [report-complaint-dialog.tsx:107-111](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L107-L111)

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["complaints"] });
  toast.success("Added to My Complaints. You'll be notified when its status changes.");
  handleOpenChange(false);
},
```

The dialog closes. The second resident's own report was never created, and their photo was never uploaded.

**21.** **My Complaints** fetches again, through `getMyComplaints`:

- [complaints.ts:226](../../src/actions/complaints.ts#L226) `return fetchComplaintsPage([filedOrFollowedBy(userId)], offset, MY_COMPLAINTS_PAGE_SIZE, desc, userId);`
- [complaints.ts:216-218](../../src/actions/complaints.ts#L216-L218) `filedOrFollowedBy` matches the complaints they filed and the ones in `complaint_followers` for them, so the first resident's complaint is included.
- [complaints.ts:156](../../src/actions/complaints.ts#L156) `isFollowed` is true for a complaint someone else filed.
- [complaints.ts:181-191](../../src/actions/complaints.ts#L181-L191) For those, the complainant's id, name and email and the AI response plan are blanked on the server, and `isFollowing` is set, so the browser never receives them.

The complaint shows in their list read-only. Its actions menu offers **Remove from My Complaints** ([complaint-actions-menu.tsx:147-152](../../src/components/complaint/complaint-actions-menu.tsx#L147-L152)) instead of **Delete complaint**, which calls `unfollowComplaint` and deletes their notifications about it.

### The other choices

- **Submit as New Complaint** ([report-complaint-dialog.tsx:186](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L186)) calls `createWithEvidence` with the held entries and the AI's answer (lines 93-94), which runs steps 12-14.
- **Back** ([report-complaint-dialog.tsx:183](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L183)) clears `pending`, which shows the form again.

## Resolving it

An admin clears the drain, opens `/portal/complaint`, and picks **Set status → Resolved** from the complaint's actions menu ([admin-complaint.tsx:427](../../src/components/complaint/admin-complaint.tsx#L427)).

### In the browser

**22.** [complaint-actions-menu.tsx:81-85](../../src/components/complaint/complaint-actions-menu.tsx#L81-L85)

```tsx
function handleStatusSelect(status: Complaint["status"]) {
  if (status === "Resolved") {
    setResolveOpen(true);
    return;
  }
```

Resolved needs a message for the complainant, so this opens `AdminResolveComplaintDialog` instead of changing the status. Dismissed opens its own dialog the same way (lines 86-89). Pending and In Progress go straight to `changeStatus` (line 90), which first deletes the attachments of a Resolved or Dismissed status it's leaving (lines 49-58).

**23.** [complaint-resolution-schema.ts:5-6](../../src/schemas/complaint-resolution-schema.ts#L5-L6)

```ts
message: z.string().min(1, "Enter a message for the complainant"),
attachments: z.array(z.custom<MediaItem>()),
```

The admin writes what was done and adds a photo of the cleared drain. The message is required, and the attachments are optional.

**24.** [admin-resolve-complaint-dialog.tsx:27-38](../../src/components/complaint/dialogs/admin-resolve-complaint-dialog.tsx#L27-L38)

```tsx
const attachments = await Promise.all(
  data.attachments.map(async (item) => {
    if (!item.file) return item;
    const key = await uploadFile(item.file, "complaints/resolution-attachments");
    return { ...item, key, file: undefined };
  })
);

await setComplaintStatus(complaint.id, "Resolved", {
  message: data.message,
  attachments,
});
```

Uploads the photo under `complaints/resolution-attachments`, then calls the server action with the message and the photo's key.

### On the server

**25.** [complaints.ts:436-439](../../src/actions/complaints.ts#L436-L439)

```ts
const handlerId = await requireAdmin();

const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
if (!existing) throw new Error("Complaint not found");
```

Throws unless the caller is an admin, and loads the complaint as it is before the change.

**26.** [complaints.ts:441-458](../../src/actions/complaints.ts#L441-L458)

```ts
await db
  .update(complaintsTable)
  .set({
    status,
    handlerId: status === "Pending" ? null : handlerId,
    updatedAt: new Date(),
    ...(status === "Resolved"
      ? details
        ? { resolutionMessage: details.message, resolutionAttachments: details.attachments ?? [] }
        : {}
      : { resolutionMessage: null, resolutionAttachments: [] }),
    ...(status === "Dismissed"
      ? // …the same for the dismissal
      : { dismissalReason: null, dismissalAttachments: [] }),
  })
  .where(eq(complaintsTable.id, id));
```

Saves Resolved with the admin as its handler, and the message and photo as the resolution. The dismissal fields are cleared.

**27.** [complaints.ts:460-474](../../src/actions/complaints.ts#L460-L474)

```ts
const followers = await db
  .select({ userId: complaintFollowersTable.userId })
  .from(complaintFollowersTable)
  .where(eq(complaintFollowersTable.complaintId, id));

await notifyStatusChange({
  userId: existing.complainantId,
  followerIds: followers.map((follower) => follower.userId),
  // …
```

Loads the followers, the second resident among them, and notifies everyone. The complainant gets `Your complaint "Clogged drainage" is now Resolved.` and the follower gets `A complaint "Clogged drainage" you're following is now Resolved.` Each links to `/portal/complaint?view=<id>`. [Phone notifications](phone-notifications.md#sending-a-status-change) traces this line by line, from this call (its step 5) to the push reaching their phones.

**28.** [complaints.ts:476-482](../../src/actions/complaints.ts#L476-L482)

```ts
await logAudit({
  action: "status-changed",
  entityType: "complaint",
  entityId: id,
  summary: `Changed ${formatReferenceNumber(id)} "${existing.subject}" from ${existing.status} to ${status}`,
  changes: details ? [{ label: "Message", from: null, to: details.message }] : [],
});
```

Records the change on the Audit Logs page, with the resolution message ([audit.ts:138-149](../../src/lib/audit.ts#L138-L149)).

### Back in the browser

**29.** [admin-resolve-complaint-dialog.tsx:40-44](../../src/components/complaint/dialogs/admin-resolve-complaint-dialog.tsx#L40-L44) The table fetches again, the toast says "Complaint marked as Resolved.", and the dialog closes. When either resident opens the complaint from their notification, its Submission Info shows the resolution message and photo. The follower's copy still has no complainant details (step 21).

## Generating a response plan

Before acting on a complaint, an admin can open its Submission Info and tap **Generate Insight** on the AI Insight tab ([view-complaint-dialog.tsx:348](../../src/components/complaint/dialogs/view-complaint-dialog.tsx#L348)).

**30.** [view-complaint-dialog.tsx:90-98](../../src/components/complaint/dialogs/view-complaint-dialog.tsx#L90-L98)

```tsx
mutationFn: () =>
  generateComplaintInsight({
    id: complaint.id,
    subject: complaint.subject,
    description: complaint.description,
    category: complaint.category,
    priority: complaint.priority,
    location: complaint.location,
  }),
```

Sends the complaint's details to the server action.

**31.** [complaints.ts:69-85](../../src/actions/complaints.ts#L69-L85)

```ts
await requireAdmin();

const { object } = await generateObject({
  model: openai("gpt-4o-mini"),
  schema: complaintAiInsightSchema,
  prompt: `You are assisting officials at a Philippine barangay (village) administrative office in planning their response to a resident complaint. …`,
});

await db.update(complaintsTable).set({ aiInsight: object }).where(eq(complaintsTable.id, data.id));
```

Admins only. `gpt-4o-mini` fills in `complaintAiInsightSchema` ([complaint-schema.ts:30-50](../../src/schemas/complaint-schema.ts#L30-L50)): a budget range, manpower, a timeframe, a suggested solution, resources, a public safety risk level and prevention advice. The result is saved on the complaint, replacing any earlier one. It isn't audit logged.

**32.** [view-complaint-dialog.tsx:107](../../src/components/complaint/dialogs/view-complaint-dialog.tsx#L107)

```tsx
const insight = generatedInsight ?? complaint.aiInsight;
```

The dialog shows the new plan straight from the mutation's result, while `onSuccess` (lines 99-101) refetches the lists so the saved one is there next time. Residents never see it, since the AI Insight tab is only rendered for admins (line 331). A follower's copy of the complaint doesn't have it at all (step 21), but the complainant's own copy does, hidden only by that check.
