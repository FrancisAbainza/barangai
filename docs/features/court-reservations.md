# Court reservations

Residents book the barangay court for whole hours and pay through GCash, and admins approve or reject each booking. Admins can also book the court directly. Page: `/portal/court-reservation`.

For the code that runs when a resident reserves the court and an admin approves it, in order and line by line, see [Court reservations, line by line](../walkthroughs/court-reservations.md).

## How times are stored

A reservation has a `date` (`"YYYY-MM-DD"`), a `startTime` in minutes after midnight (0–1439) and a `durationHours`. It can start at any minute, lasts a whole number of hours, and must end by midnight of its date:

```
startTime + durationHours * 60 <= 1440
```

So 10:30 PM for 1 hour is allowed, and 11:30 PM for 1 hour isn't. The helpers in `src/lib/court-reservations.ts` convert between the `TimePicker`'s `"HH:MM"` and minutes (`parseTimeInput`, `toTimeInput`), format times (`formatCourtTime`, `formatTimeRange`, `formatReservationTime`), and turn a reservation into a `{ start, end }` range (`getReservationRange`).

## Billing

The day rate covers 6:00 AM to 6:00 PM and the night rate the rest. Both are admin-editable in Barangay Settings (`courtDayRate`, `courtNightRate`, defaults ₱50 and ₱100).

`getCourtHourCharges` bills each hour of the reservation separately. An hour is a day-rate hour only if all of it falls between 6:00 AM and 6:00 PM:

| Booking | Hours | Fee at ₱50 / ₱100 |
|---|---|---|
| 12:10 PM – 3:10 PM | 3 day | ₱150 |
| 5:00 PM – 7:00 PM | 1 day (5–6), 1 night (6–7) | ₱150 |
| 5:01 PM – 7:01 PM | 2 night (5:01–6:01 crosses 6 PM) | ₱200 |
| 4:30 PM – 7:30 PM | 1 day, 2 night | ₱250 |

`calculateCourtFee` adds the charges up. The form shows the breakdown as the resident picks times, and `createCourtReservation` computes the fee again on the server from the current settings and stores it in `totalAmount`. A later rate change doesn't change existing reservations.

## Overlaps

Only **Approved** reservations block a time. `getTakenTimeRanges(date)` returns their ranges, and `rangesOverlap` compares two ranges (touching ends don't overlap, so 1–3 PM and 3–5 PM can both be booked).

- The form fetches the taken ranges for the picked date and shows a conflict before submitting.
- `createCourtReservation` checks again on the server and returns `{ error: "The selected time overlaps an existing reservation." }`.
- `setCourtReservationStatus(id, "Approved")` checks again, ignoring the reservation itself, and returns `{ error: "This reservation's time overlaps another approved reservation." }`.

Pending reservations don't block each other, so two residents can request the same slot. Once an admin approves one, the other can no longer be approved and should be rejected.

The overlap messages are returned rather than thrown because production builds replace a thrown server action error's message with a generic one.

The **Court Availability** dialog (`CourtAvailabilityDialog`) lets anyone pick a date and see the approved bookings and the free times around them (`getFreeRanges`).

## Residents and admins

| | Resident | Admin |
|---|---|---|
| Needs Resident Credentials | Yes | No |
| GCash payment screenshot | Required, 1 image | Hidden: admins don't pay |
| Starting status | Pending | Approved, with the admin as handler |
| Delete | Own, while Pending | Any reservation |

The form is `CourtReservationForm` with `getCourtReservationFormSchema(isAdmin)`. Its date picker disables past days, and the duration choices stop at the hours left before midnight (`maxDurationHours`). Both views open it with `useDialogParam("court-reservation")`. The AI assistant can link to it with the date, start time, duration and purpose filled in.

## Statuses

`Pending`, `Approved`, `Rejected`. Admins change them from the actions menu's **Set status**:

- **Approved** checks for overlaps first, then sets `handlerId`.
- **Rejected** opens a dialog for a reason (required) and up to 5 attachments.
- **Pending** clears `handlerId`.

Leaving Rejected clears the reason and deletes its attachments from R2. Every status change also invalidates the `court-reservation-taken-ranges` queries, so open forms see the new availability.

## Views

**Resident** (`ResidentCourtReservation`): a banner without Resident Credentials, the **Reserve Court** and **Court Availability** buttons, and **My Reservations** (10 per page).

**Admin** (`AdminCourtReservation`): stat cards (total and Pending), the same two buttons, and a table of every reservation (20 per page) with filters: search (requester name or email, or reference number), a reservation date, status, newest/oldest, and "Only show reservations I'm handling". Submission Info shows the booking, the fee breakdown, the payment screenshot, the rejection, and the requester's Resident Credentials.

## Side effects

| Event | Notification | Audit log |
|---|---|---|
| Status changed by an admin | "Your court reservation for Nov 8, 2026 is now Approved." | `status-changed` |
| Deleted by an admin | to the requester | `deleted` |
| Created by an admin (auto-approved) | none | none |
| Created or deleted by the resident | none | none |

## AI assistant

- `calculateCourtFee` prices given times with the same `getCourtHourCharges` and `calculateCourtFee`, because the model miscounts day and night hours.
- `checkCourtAvailability` answers "is the court free on Saturday night?" from `getTakenTimeRanges` and `getFreeRanges`.

See [AI assistant](../ai-assistant.md#court-fees).

## Files

| File | What it does |
|---|---|
| `src/actions/court-reservations.ts` | `getTakenTimeRanges`, `createCourtReservation`, the list and by-id actions, `setCourtReservationStatus`, `deleteCourtReservation` |
| `src/lib/court-reservations.ts` | Time math, billing, free ranges, formatting, `formatReferenceNumber` (`CR-<id>`) |
| `src/lib/data.ts` | `DEFAULT_COURT_DAY_RATE`, `DEFAULT_COURT_NIGHT_RATE` |
| `src/schemas/court-reservation-schema.ts` | The statuses and `getCourtReservationFormSchema(isAdmin)` |
| `src/components/court-reservation/` | Views, the reservation and availability dialogs, forms, the actions menu |
