# Community Hub

A directory and map of local businesses. Residents submit their own businesses with a permit, admins verify them, and verified businesses are listed for everyone signed in. Page: `/portal/community-hub`.

For the code that runs when a resident submits or edits a business and an admin verifies it, in order and line by line, see [Community Hub businesses, line by line](../walkthroughs/community-hub-businesses.md).

## A business

The form (`BusinessForm`, `businessFormSchema` in `src/schemas/business-schema.ts`):

| Field | Rules |
|---|---|
| Name | At least 3 characters |
| Description | At least 10 characters |
| Category | Food & Beverage, Retail, Services, Health & Wellness, Beauty & Personal Care, Education, Automotive, Agriculture, Technology, Others |
| Contact number | 10–12 digits, optional leading `+` |
| Social media link | Optional URL |
| Operating hours | One or more days (Mon–Sun), an opening time and a closing time |
| Photos | Up to 10 images (`community-hub/photos`) |
| Business permit | Exactly 1 document (`community-hub/permits`). Only the owner and admins see it |
| Location | Optional map pin. Businesses without one don't appear on the map |

Operating hours are stored as `{ days, opens, closes }` and shown by `formatOperatingHours` ("Mon, Tue, Wed · 8:00 AM – 5:00 PM"). A closing time at or before the opening time runs past midnight, which the AI assistant's `openNow` accounts for.

Unlike the other services, submitting a business doesn't need Resident Credentials.

## Statuses

`Pending`, `Processing`, `Verified`, `Rejected`.

| Who submits | Starting status |
|---|---|
| A resident | Pending |
| An admin | Verified, with the admin as handler |

Admins change the status from the actions menu. **Rejected** opens a dialog for a reason and up to 5 attachments. Leaving Rejected clears them and deletes the attachments from R2.

### Editing is resubmitting

When a resident edits their business (`updateBusiness`), it goes back to Pending for review: the handler and any rejection are cleared, and `createdAt` is set to the edit time so it's listed first in the admins' newest-first list. An admin editing keeps the status and is audit logged. The UI only offers **Edit** to the owner, though the action also allows admins.

Owners can delete their business in any status. Admins can delete any business.

## Who sees what

`getVerifiedBusinesses` backs the resident list. It returns every Verified business plus the caller's own in any status, with their own pinned to the top and badged when not yet verified. Other residents' unverified businesses are never listed.

Two different links open a business:

| Link | Opens | Who can open it |
|---|---|---|
| `?business=<id>` | The public details dialog the card opens (`ViewBusinessDialog`): photos, description, hours, contact, social link and map. `LinkedBusinessDialog` reads it with `getVerifiedBusinessById` | Anyone signed in, for a Verified business or their own. Admins: any |
| `?view=<id>` | The Submission Info dialog (`ViewSubmissionDialog`): permit, status, rejection and the handler | The owner and admins (`getBusinessById`) |

Notifications and the Needs Attention queue use `?view=`. The AI assistant's business links use `?business=`.

## Resident view

`ResidentCommunityHub`:

- **Submit a Business** (`CreateBusinessDialog`, `?dialog=submit-business`, prefillable by the assistant).
- Search by name, filter by category, and "Only show my businesses".
- A **Grid** of cards (`BusinessGrid`, `BusinessCard`) and a **Map** (`BusinessesMapView`).

### The map and directions

`BusinessesMapView` pins every business with a location, draws the barangay boundary, and has a current-location button. Selecting a pin opens an info window with a **Directions** button, which:

1. gets the user's position from the browser (`getCurrentLocation`)
2. asks the Routes library for a driving route (`computeRoute` in `src/lib/directions.ts`, which needs the Routes API enabled)
3. draws it with `RouteOverlay`, which also shows the distance and travel time in a card that stays visible in full-screen mode

Pressing Directions again refreshes the route from the user's new position. `useDirections` only applies the latest request, so a slow one can't bring back a route that was cleared.

## Admin view

`AdminCommunityHub`:

- Stat cards: total businesses and Pending Review, which counts businesses in the Pending status (`getBusinessStats`), the same count as the admin home's Pending Requests card.
- **Table**, **Grid** and **Map** tabs over every business (20 per page, `getBusinesses`).
- Filters: search (name or reference number), category, status (including "unverified", meaning anything but Verified), date range, newest/oldest, "Only show businesses I'm handling" and "Only show my businesses".
- The actions menu: **Submission Info**, **Set status**, **Delete**, **Audit Logs** for super admins, and **Edit** on the admin's own businesses.

## Side effects

| Event | Notification to the owner | Audit log |
|---|---|---|
| Status changed by an admin | "Your business "Aling Nena's" is now Verified." | `status-changed` |
| Edited by an admin | none | `updated`, with name, description, category, contact number and social link changes |
| Deleted by an admin | yes | `deleted`, with the deleted values |
| Submitted by an admin (auto-verified) | none | none |
| Edited or deleted by the owner | none | none |

## AI assistant

`findBusinesses` returns up to 50 verified businesses with whether each is open now (worked out in Philippine time) and, once the user shares their location, the distance to each, nearest first. See [AI assistant](../ai-assistant.md#local-businesses).

## Files

| File | What it does |
|---|---|
| `src/actions/business.ts` | `createBusiness`, `getBusinesses` (admin), `getVerifiedBusinesses`, `getBusinessesByUser`, `getBusinessById`, `getVerifiedBusinessById`, `getBusinessStats`, `setBusinessStatus`, `updateBusiness`, `deleteBusiness` |
| `src/lib/business.ts` | Badges, `handlerLabel`, `formatReferenceNumber` (`CH-<id>`), `formatOperatingHours`, `BUSINESS_SEARCH_PARAM` |
| `src/schemas/business-schema.ts` | Categories, statuses, days, and the form and hours schemas |
| `src/components/community-hub/` | Views, grid, card, map, dialogs, forms, the actions menu |
| `src/hooks/use-directions.ts`, `src/lib/directions.ts`, `src/components/route-overlay.tsx` | Directions |
