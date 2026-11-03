# Court reservations, line by line

This traces the code behind [court reservations](../features/court-reservations.md) in the order it runs, jumping between files when the code does. It covers a resident reserving the court (the form prices each hour and checks for clashes as they pick, and the server checks both again) and an admin approving the reservation, which checks again for clashes with other approved bookings.

Line numbers are as of November 4, 2026. If they've shifted, search for the quoted code.

## Reserving the court

The resident has saved their Resident Credentials. On `/portal/court-reservation`, they tap **Reserve Court**, pick Saturday, November 7, 2026, enter "Basketball practice", start at 4:30 PM for 3 hours, pay through GCash, upload the screenshot and submit. An approved booking from 8:00 to 10:00 PM is already on that day. The rates are the defaults, ₱50 an hour by day and ₱100 by night.

### In the browser

**1.** [resident-court-reservation.tsx:105](../../src/components/court-reservation/resident-court-reservation.tsx#L105)

```tsx
<Button className="flex-1 gap-2" onClick={() => setIsReserveDialogOpen(true)}>
```

`setIsReserveDialogOpen` comes from `useDialogParam("court-reservation")` (line 40), so it adds `?dialog=court-reservation` to the URL. Line 190 opens `CourtReservationDialog` with `open={isReserveDialogOpen && hasResidentProfile}`. A resident without Resident Credentials sees a banner instead of the buttons (line 82).

**2.** [court-reservation-form.tsx:79-82](../../src/components/court-reservation/forms/court-reservation-form.tsx#L79-L82)

```tsx
} = useForm<CourtReservationFormValues>({
  resolver: zodResolver(getCourtReservationFormSchema(isAdmin)),
  defaultValues: { ...baseDefaults, ...defaultValues },
});
```

The form starts with no date, purpose or start time and 1 hour (`baseDefaults`, lines 55-61), unless the AI assistant's link filled some in ([court-reservation-dialog.tsx:23](../../src/components/court-reservation/dialogs/court-reservation-dialog.tsx#L23)). The schema depends on the role: a resident must upload a payment screenshot, and an admin, who doesn't pay, has none to upload (`isAdmin` from Clerk, line 69).

**3.** [court-reservation-form.tsx:143](../../src/components/court-reservation/forms/court-reservation-form.tsx#L143)

```tsx
disabledDays={{ before: today }}
```

The date picker won't pick a day before today. Picking Saturday stores it as `"2026-11-07"` ([date-picker.tsx:48](../../src/components/date-picker.tsx#L48), using `toDateValue` from [utils.ts:10-13](../../src/lib/utils.ts#L10-L13)), the browser's own calendar day rather than UTC.

**4.** [court-reservation-form.tsx:89-93](../../src/components/court-reservation/forms/court-reservation-form.tsx#L89-L93)

```tsx
const { data: takenRanges = [] } = useQuery({
  queryKey: ["court-reservation-taken-ranges", date],
  queryFn: () => getTakenTimeRanges(date),
  enabled: !!date,
});
```

Once there's a date, fetches the times already taken that day. On the server, `getTakenTimeRanges`:

- [court-reservations.ts:26-27](../../src/actions/court-reservations.ts#L26-L27) stops a signed-out caller.
- [court-reservations.ts:29](../../src/actions/court-reservations.ts#L29) `const conditions = [eq(courtReservationsTable.date, date), eq(courtReservationsTable.status, "Approved")];` Only **Approved** reservations take a time. Pending ones don't, so two residents can ask for the same slot.
- [court-reservations.ts:34-40](../../src/actions/court-reservations.ts#L34-L40) loads their start times and durations and turns each into a `{ start, end }` range in minutes after midnight (`getReservationRange`, [lib/court-reservations.ts:29-34](../../src/lib/court-reservations.ts#L29-L34)). The 8:00 to 10:00 PM booking is `{ start: 1200, end: 1320 }`.

Line 226 shows "Already booked on this date: 8:00 PM - 10:00 PM".

**5.** [court-reservation-form.tsx:95-101](../../src/components/court-reservation/forms/court-reservation-form.tsx#L95-L101)

```tsx
const { data: settings } = useQuery({
  queryKey: ["barangay-settings"],
  queryFn: () => getBarangaySettings(),
});
const gcashNumber = settings?.gcashNumber ?? DEFAULT_GCASH_NUMBER;
const dayRate = settings?.courtDayRate ?? DEFAULT_COURT_DAY_RATE;
const nightRate = settings?.courtNightRate ?? DEFAULT_COURT_NIGHT_RATE;
```

Loads the rates and GCash number from Barangay Settings, falling back to the defaults until they arrive.

**6.** [court-reservation-form.tsx:84-87](../../src/components/court-reservation/forms/court-reservation-form.tsx#L84-L87)

```tsx
const date = watch("date");
const startTimeInput = watch("startTime");
const durationHours = watch("durationHours");
const startTime = parseTimeInput(startTimeInput);
```

The resident picks 4:30 PM and 3 hours. The form re-renders on every change, and everything below is worked out again. The `TimePicker` gives `"16:30"`, which `parseTimeInput` ([lib/court-reservations.ts:94-101](../../src/lib/court-reservations.ts#L94-L101)) turns into 990 minutes after midnight.

**7.** [court-reservation-form.tsx:103-106](../../src/components/court-reservation/forms/court-reservation-form.tsx#L103-L106)

```tsx
const durationOptions = Array.from(
  { length: startTime === null ? 24 : maxDurationHours(startTime) },
  (_, i) => i + 1
);
```

A reservation must end by midnight of its date. `maxDurationHours` ([lib/court-reservations.ts:40-42](../../src/lib/court-reservations.ts#L40-L42)) gives the whole hours left after the start, 7 for 4:30 PM, so the duration list stops at 7 hours.

**8.** [court-reservation-form.tsx:107-114](../../src/components/court-reservation/forms/court-reservation-form.tsx#L107-L114)

```tsx
const selectedRange =
  startTime !== null && startTime + durationHours * 60 <= MINUTES_PER_DAY
    ? { start: startTime, end: startTime + durationHours * 60 }
    : null;
const charges = selectedRange
  ? getCourtHourCharges(selectedRange.start, durationHours, dayRate, nightRate)
  : [];
const totalAmount = charges.reduce((sum, charge) => sum + charge.rate, 0);
```

The picked range is `{ start: 990, end: 1170 }`, 4:30 to 7:30 PM. `getCourtHourCharges` bills each hour on its own:

[lib/court-reservations.ts:56-61](../../src/lib/court-reservations.ts#L56-L61)

```ts
return Array.from({ length: durationHours }, (_, i) => {
  const start = startTime + i * 60;
  const end = start + 60;
  const isDayRate = start >= COURT_DAY_START && end <= COURT_DAY_END;
  return { start, end, isDayRate, rate: isDayRate ? dayRate : nightRate };
});
```

An hour gets the day rate only if all of it is between 6:00 AM and 6:00 PM (`COURT_DAY_START` and `COURT_DAY_END`, [lib/court-reservations.ts:22-23](../../src/lib/court-reservations.ts#L22-L23)):

| Hour | Day rate? | Charge |
|---|---|---|
| 4:30 - 5:30 PM | Yes | ₱50 |
| 5:30 - 6:30 PM | No, it crosses 6:00 PM | ₱100 |
| 6:30 - 7:30 PM | No | ₱100 |

`totalAmount` is ₱250. Lines 241-252 list the hours and lines 254-257 the total, and line 268 tells the resident to send ₱250 to the GCash number.

**9.** [court-reservation-form.tsx:115-117](../../src/components/court-reservation/forms/court-reservation-form.tsx#L115-L117)

```tsx
const conflict = selectedRange
  ? takenRanges.find((taken) => rangesOverlap(selectedRange, taken))
  : undefined;
```

`rangesOverlap` ([lib/court-reservations.ts:36-38](../../src/lib/court-reservations.ts#L36-L38)) is `a.start < b.end && b.start < a.end`. 4:30 to 7:30 PM ends before 8:00 PM, so there's no conflict. Ranges that only touch don't overlap, so 6:00 to 8:00 PM would also be free. A conflict would show in red right away (lines 233-237).

**10.** [court-reservation-form.tsx:271-276](../../src/components/court-reservation/forms/court-reservation-form.tsx#L271-L276)

```tsx
<FileUploader
  files={field.value}
  onFilesChange={field.onChange}
  maxFiles={1}
  accept={["images"]}
/>
```

The resident adds the GCash screenshot, which stays in the browser until submit, like a document request's receipt ([Document requests](document-requests.md), step 6). Admins don't see this field (line 260).

**11.** [court-reservation-form.tsx:130](../../src/components/court-reservation/forms/court-reservation-form.tsx#L130)

```tsx
<form onSubmit={handleSubmit(submit)}>
```

**Reserve Court** checks the values against the schema first:

- [court-reservation-schema.ts:10-17](../../src/schemas/court-reservation-schema.ts#L10-L17) A date, a purpose, a valid start time and at least 1 hour.
- [court-reservation-schema.ts:21-24](../../src/schemas/court-reservation-schema.ts#L21-L24) Exactly 1 payment screenshot, for residents.
- [court-reservation-schema.ts:26-32](../../src/schemas/court-reservation-schema.ts#L26-L32) It ends by midnight.

**12.** [court-reservation-form.tsx:119-127](../../src/components/court-reservation/forms/court-reservation-form.tsx#L119-L127)

```tsx
async function submit(values: CourtReservationFormValues) {
  if (conflict) {
    setError("startTime", {
      message: `This overlaps an existing reservation (${formatTimeRange(conflict)}).`,
    });
    return;
  }
  await onSubmit(values);
}
```

A conflict stops the submit here. There's none, so it calls `onSubmit`, the dialog's `submitReservation`.

**13.** [court-reservation-dialog.tsx:27-33](../../src/components/court-reservation/dialogs/court-reservation-dialog.tsx#L27-L33)

```tsx
const gcashPayment = await Promise.all(
  data.gcashPayment.map(async (item) => {
    if (!item.file) return item;
    const key = await uploadFile(item.file, "court-reservations/gcash-payments");
    return { ...item, key, file: undefined };
  })
);
```

Uploads the screenshot under `court-reservations/gcash-payments`. How `uploadFile` works is in [Document requests](document-requests.md), step 8.

**14.** [court-reservation-dialog.tsx:35-43](../../src/components/court-reservation/dialogs/court-reservation-dialog.tsx#L35-L43)

```tsx
const result = await createCourtReservation({
  date: data.date,
  purpose: data.purpose,
  // The schema already validated the "HH:MM" format.
  startTime: parseTimeInput(data.startTime)!,
  durationHours: data.durationHours,
  gcashPayment,
});
if (result?.error) throw new Error(result.error);
```

Sends the start as minutes (990). The fee isn't sent: the server works it out itself. The action returns `{ error }` for problems the resident should read, since a production build would replace the message of a thrown error with a generic one (the comment at [court-reservations.ts:51-52](../../src/actions/court-reservations.ts#L51-L52)). Line 43 throws it here in the browser, where the message survives, and step 19 shows it.

### On the server

**15.** [court-reservations.ts:54](../../src/actions/court-reservations.ts#L54)

```ts
const { userId, isAdmin } = await requireSubmitter();
```

Stops a signed-out caller, or a resident without Resident Credentials ([auth.ts:30-41](../../src/lib/auth.ts#L30-L41)). Admins are let through.

**16.** [court-reservations.ts:56-64](../../src/actions/court-reservations.ts#L56-L64)

```ts
if (
  !Number.isInteger(data.startTime) ||
  !Number.isInteger(data.durationHours) ||
  data.startTime < 0 ||
  data.durationHours < 1 ||
  data.startTime + data.durationHours * 60 > MINUTES_PER_DAY
) {
  return { error: "Invalid reservation time. Reservations must end by midnight." };
}
```

Checks the times again, since anyone can call a server action without the form. 990 + 180 = 1170, before midnight (1440). The date isn't checked here, so a call made without the form could book a day that has passed.

**17.** [court-reservations.ts:66-70](../../src/actions/court-reservations.ts#L66-L70)

```ts
const range = getReservationRange(data);
const takenRanges = await getTakenTimeRanges(data.date);
if (takenRanges.some((taken) => rangesOverlap(range, taken))) {
  return { error: "The selected time overlaps an existing reservation." };
}
```

Checks for a clash again, with the same function as step 4. An admin may have approved a booking for that time since the form loaded.

**18.** [court-reservations.ts:72-90](../../src/actions/court-reservations.ts#L72-L90)

```ts
const settings = await getBarangaySettings();
const totalAmount = calculateCourtFee(
  data.startTime,
  data.durationHours,
  settings.courtDayRate,
  settings.courtNightRate
);

await db.insert(courtReservationsTable).values({
  requesterId: userId,
  // …date, startTime, durationHours, purpose
  totalAmount: totalAmount.toString(),
  gcashPayment: data.gcashPayment,
  // Reservations created from the admin panel skip the approval queue since an admin is the one creating them.
  ...(isAdmin ? { status: "Approved" as const, handlerId: userId } : {}),
});
```

Works out the fee from the current rates with `calculateCourtFee` ([lib/court-reservations.ts:64-74](../../src/lib/court-reservations.ts#L64-L74)), which adds up the same hour-by-hour charges as step 8, and saves ₱250 with the reservation. A later change to the rates doesn't change it. The resident's reservation starts as Pending ([schema.ts:310](../../src/db/schema.ts#L310)). An admin's is Approved straight away, with them as its handler. Creating one sends no notification and isn't audit logged.

### Back in the browser

**19.** [court-reservation-dialog.tsx:45-55](../../src/components/court-reservation/dialogs/court-reservation-dialog.tsx#L45-L55)

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
  queryClient.invalidateQueries({ queryKey: ["court-reservation-taken-ranges"] });
  toast.success("Reservation submitted successfully.");
  onOpenChange(false);
},
onError: (error) => {
  toast.error(
    error instanceof Error ? error.message : "Failed to submit reservation. Please try again."
  );
},
```

**My Reservations** fetches again and shows the reservation as Pending, and the dialog closes. The taken times are fetched again too, which matters for an admin's reservation, since it's approved at once. If step 16 or 17 returned an error, it's the toast's message, and the form stays open.

## Approving it

An admin opens `/portal/court-reservation`, checks the screenshot against the ₱250 in the reservation's Submission Info, and picks **Set status → Approved** from its actions menu ([admin-court-reservation.tsx:347](../../src/components/court-reservation/admin-court-reservation.tsx#L347)).

### In the browser

**20.** [court-reservation-actions-menu.tsx:67-72](../../src/components/court-reservation/court-reservation-actions-menu.tsx#L67-L72)

```tsx
function handleStatusSelect(status: CourtReservation["status"]) {
  if (status === "Rejected") {
    setRejectOpen(true);
    return;
  }
  changeStatus(status);
}
```

Approved needs no details, so it goes straight to `changeStatus`. Rejected opens a dialog for a reason and attachments instead.

**21.** [court-reservation-actions-menu.tsx:47-48](../../src/components/court-reservation/court-reservation-actions-menu.tsx#L47-L48)

```tsx
const result = await setCourtReservationStatus(reservation.id, status);
if (result?.error) throw new Error(result.error);
```

Calls the server action, and turns an `{ error }` it returns into a thrown error, as in step 14.

### On the server

**22.** [court-reservations.ts:285-291](../../src/actions/court-reservations.ts#L285-L291)

```ts
const handlerId = await requireAdmin();

const [reservation] = await db
  .select()
  .from(courtReservationsTable)
  .where(eq(courtReservationsTable.id, id));
if (!reservation) throw new Error("Court reservation not found");
```

Throws unless the caller is an admin, and loads the reservation as it is before the change.

**23.** [court-reservations.ts:293-300](../../src/actions/court-reservations.ts#L293-L300)

```ts
if (status === "Approved") {
  const range = getReservationRange(reservation);
  const takenRanges = await getTakenTimeRanges(reservation.date, id);
  if (takenRanges.some((taken) => rangesOverlap(range, taken))) {
    // Returned, not thrown, so the message survives production builds (see createCourtReservation).
    return { error: "This reservation's time overlaps another approved reservation." };
  }
}
```

Approving takes the time, so it checks first that no other approved reservation holds it. Passing `id` leaves this reservation out of the taken times (lines 30-32 of `getTakenTimeRanges`), in case it was approved before. Nothing else is approved for 4:30 to 7:30 PM, so it continues. If another resident's request for the same slot had been approved first, this one would stop here, and the admin should reject it.

**24.** [court-reservations.ts:302-314](../../src/actions/court-reservations.ts#L302-L314)

```ts
await db
  .update(courtReservationsTable)
  .set({
    status,
    handlerId: status === "Pending" ? null : handlerId,
    ...(status === "Rejected"
      ? // …the reason and attachments
      : { rejectionReason: null, rejectionAttachments: [] }),
    updatedAt: new Date(),
  })
  .where(eq(courtReservationsTable.id, id));
```

Saves Approved with the admin as its handler, and clears any rejection.

**25.** [court-reservations.ts:316-329](../../src/actions/court-reservations.ts#L316-L329)

```ts
const reservationDate = new Date(`${reservation.date}T00:00:00`).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
await notifyStatusChange({
  userId: reservation.requesterId,
  actorId: handlerId,
  type: "court-reservation",
  referenceId: id,
  subject: `court reservation for ${reservationDate}`,
  previousStatus: reservation.status,
  status,
});
```

Formats the date as "Nov 7, 2026" and notifies the resident: "Your court reservation for Nov 7, 2026 is now Approved.", linking to `/portal/court-reservation?view=<id>`. From here it's the same code as a complaint's status change, line by line in [Phone notifications](phone-notifications.md#sending-a-status-change) (steps 6-20).

**26.** [court-reservations.ts:331-337](../../src/actions/court-reservations.ts#L331-L337)

```ts
await logAudit({
  action: "status-changed",
  entityType: "court-reservation",
  entityId: id,
  summary: `Changed ${formatReferenceNumber(id)} (${reservationDate}) from ${reservation.status} to ${status}`,
  changes: details ? [{ label: "Message", from: null, to: details.reason }] : [],
});
```

Records "Changed CR-7 (Nov 7, 2026) from Pending to Approved" on the Audit Logs page ([audit.ts:138-149](../../src/lib/audit.ts#L138-L149)).

### Back in the browser

**27.** [court-reservation-actions-menu.tsx:50-60](../../src/components/court-reservation/court-reservation-actions-menu.tsx#L50-L60)

```tsx
// Only once the status change went through, since a refused approval keeps the rejection.
if (reservation.status === "Rejected" && status !== "Rejected") {
  // …deleteFile for each rejection attachment
}
},
onSuccess: (_data, status) => {
  queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
  queryClient.invalidateQueries({ queryKey: ["court-reservation-taken-ranges"] });
  toast.success(`Reservation marked as ${status}.`);
},
```

Approving a reservation that had been rejected deletes the rejection's attachments from R2, but only after the server accepted the change: an approval refused in step 23 leaves the rejection as it was. Unlike the other submission types, this happens after the action rather than before.

Then the table fetches again, and so does every open form's list of taken times. A resident with the form open for November 7 now sees "Already booked on this date: 4:30 PM - 7:30 PM, 8:00 PM - 10:00 PM", and step 9 flags any overlap with it. If step 23 returned an error, `onError` (lines 62-64) shows "This reservation's time overlaps another approved reservation." as a toast.

## Other paths

- **Rejecting.** `RejectCourtReservationDialog` asks for a reason and up to 5 attachments, uploads them under `court-reservations/rejection-attachments`, and calls `setCourtReservationStatus(id, "Rejected", { reason, attachments })`. Step 24 saves them (lines 307-310), and steps 25-26 notify and log with the reason.
- **Checking availability.** **Court Availability** opens `CourtAvailabilityDialog`, which uses the same `getTakenTimeRanges` as step 4 and `getFreeRanges` ([lib/court-reservations.ts:108](../../src/lib/court-reservations.ts#L108)) to show the free stretches around the approved bookings. The AI assistant's `checkCourtAvailability` reads the same data.
- **An admin reserving.** The form has no payment field and step 18 saves the reservation as Approved. It doesn't notify anyone, and there's no review step.
