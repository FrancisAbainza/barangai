# Complaints

Residents report problems pinned to a map. The AI suggests a category and priority, nearby duplicates can be followed instead of re-filed, and admins resolve or dismiss each one, optionally with an AI-written response plan. Page: `/portal/complaint`.

## Filing a complaint

The form (`ComplaintForm`, `complaintFormSchema`) asks for:

| Field | Rules |
|---|---|
| Subject | At least 3 characters |
| Description | At least 10 characters |
| Location | Required, picked on a map (`MapPicker`), which also looks up the address |
| Evidence | Up to 5 photos or videos |

The form has no category or priority field. On submit, `ReportComplaintDialog` runs two calls in parallel:

1. **`analyzeComplaint`** sends the subject and description to `gpt-4o-mini` (`generateObject`, temperature 0) and gets back a category and a priority. The prompt's rubric bases priority only on the facts described, not on the resident's tone:
   - **Urgent**: an emergency happening now with immediate danger to life or property (fire, live wires on the ground, floodwater in homes, violence in progress)
   - **High**: a hazard that already caused an injury or accident, or cuts off water or electricity for many households for a long time
   - **Medium**: an ongoing problem that disrupts daily life or could get worse (potholes, clogged drainage, uncollected garbage, recurring noise)
   - **Low**: a minor nuisance or a suggestion
   - Between two levels, it picks the lower one unless the description states a harm that already happened.
2. **`findSimilarComplaints`** looks for open complaints near the picked location (see below). If this fails, filing continues without it.

If there are no similar complaints, the dialog uploads the evidence (`complaints/evidence`) and calls `createComplaint` with the AI's category and priority. If there are, it shows them first.

## Duplicates and followers

When a resident files near an existing complaint, the dialog asks "Is this the same issue?" and lists up to 3 matches with their subject, description, status, category, filing date, address and rough distance. The resident can:

- **This is the same issue**: `followComplaint` adds the existing complaint to their My Complaints and subscribes them to its notifications. Their own report isn't submitted, and its evidence is never uploaded.
- **Submit as New Complaint**: files theirs as usual.
- **Back**: returns to the form with what they typed.

### Matching rules

`findSimilarComplaints(location)` returns complaints that are:

- open (Pending or In Progress)
- filed by someone else and not already followed by this resident
- not in the Noise, Domestic or Others categories (`PRIVATE_COMPLAINT_CATEGORIES`), which are usually about a specific person or household. Matching them would let someone file at their own address and see what a neighbor reported about them
- within 150 m (`SIMILAR_COMPLAINT_RADIUS_METERS`), nearest first, at most 3

Matching uses distance only, not category, because the AI may label the same clogged drain Sanitation once and Environment the next time, and the resident confirms the match anyway. Distances are computed in memory with the haversine formula. The complainant's identity is never part of a match.

### What followers see

A followed complaint appears in the follower's My Complaints as read-only. `fetchComplaintsPage` blanks the complainant's id, name and email and the AI insight on the server for any complaint the viewer didn't file (`isFollowing: true`), so the UI can't leak them. Followers:

- get the same status and deletion notifications as the complainant, worded "A complaint "…" you're following is now Resolved."
- can **Unfollow**, which removes the complaint from their list and deletes their notifications about it
- show up as a count on the complaint for admins and the complainant ("Also reported by 2 other residents")

A resident can't delete their own complaint once someone follows it, since that would silently remove it from the followers' lists. Admins can, and the followers are notified.

## Statuses

```
Pending ──► In Progress ──► Resolved
   └──────────────┴────────► Dismissed
```

Admins can set any status from the actions menu.

| Status | What happens |
|---|---|
| Pending | Clears `handlerId` and any resolution or dismissal details |
| In Progress | Sets `handlerId` to the admin |
| Resolved | Opens a dialog for a resolution message (required) and up to 5 attachments |
| Dismissed | Opens a dialog for a dismissal reason (required) and up to 5 attachments |

Leaving Resolved or Dismissed clears that message and deletes its attachments from R2.

## AI response planning

Admins can generate an insight for any complaint from its Submission Info. `generateComplaintInsight` (admin only) sends the subject, category, priority, address and description to `gpt-4o-mini` and stores the result in the complaint's `aiInsight` column:

| Field | Content |
|---|---|
| `budgetEstimate` | A budget range in pesos |
| `estimatedManpower` | How many people of which kind |
| `estimatedTimeframe` | How long it should take |
| `suggestedSolution` | A recommended course of action |
| `requiredResources` | A list of materials and equipment |
| `publicSafetyRisk` | None, Low, Medium or High, if left unresolved |
| `preventionAdvice` | How to prevent similar complaints |

Generating again replaces the stored insight. It isn't audit logged. Residents never see it.

## Resident view

`ResidentComplaint`:

- Without Resident Credentials, a banner replaces the report button.
- **Report a Complaint** opens `ReportComplaintDialog` (`?dialog=report-complaint`, prefillable by the assistant with a subject and description).
- **My Complaints** (`MyComplaintsTable`) lists the complaints they filed and the ones they follow (10 per page, `getMyComplaints`), with a table view and a map view.
- A resident can delete their own complaint only while it's Pending and has no followers.

## Admin view

`AdminComplaint`:

- Stat cards with the total and Pending count.
- A table and a map (`ComplaintsMapView`, pins colored by status) of every complaint (20 per page, `getComplaints`), with filters: search (subject, complainant name or email, or reference number), category, priority, status, date range, newest/oldest, and "Only show complaints I'm handling".
- The actions menu: **Submission Info**, **Set status**, **Delete**, and for super admins **Audit Logs**.

Submission Info shows the complaint, its location on a map, evidence, follower count, the resolution or dismissal, the AI insight, and the complainant's Resident Credentials.

Urgent complaints go to the top of the admin home's Needs Attention queue.

## Side effects

| Event | Notified | Audit log |
|---|---|---|
| Status changed by an admin | Complainant and followers | `status-changed` with the message |
| Deleted by an admin | Complainant and followers | `deleted` |
| Deleted by the complainant | none | none |
| Unfollowed | The follower's notifications about it are deleted | none |

## Files

| File | What it does |
|---|---|
| `src/actions/complaints.ts` | `analyzeComplaint`, `generateComplaintInsight`, `createComplaint`, `findSimilarComplaints`, `followComplaint`, `unfollowComplaint`, the list and by-id actions, `setComplaintStatus`, `deleteComplaint` |
| `src/lib/complaints.ts` | Badge variants for status, priority and safety risk, `handlerLabel`, `formatReferenceNumber` (`CP-<id>`), `otherResidentsLabel` |
| `src/schemas/complaint-schema.ts` | Category, priority and status lists, the form schema, and the two AI output schemas |
| `src/components/complaint/` | Views, `ReportComplaintDialog`, the resolve and dismiss dialogs, `ComplaintsMapView`, the actions menu |
