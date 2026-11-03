# Barangay settings and About Us

Barangay Settings (`/portal/barangay-settings`, admins only) is where staff edit everything about the barangay that the rest of the portal displays: fees, rates, contact details, the goal, mission and vision, the officials, and the AI assistant's knowledge base. About Us (`/about-us` and `/portal/about-us`) shows the officials and the goal, mission and vision.

## The settings row

All the plain settings live in one row of `barangay_settings`, always with `id = 1`.

- **Reading.** `getBarangaySettings()` (`src/actions/settings.ts`) returns the row, or the defaults from `src/lib/data.ts` when it doesn't exist yet. It has no auth check, since the public pages need it.
- **Writing.** `updateBarangaySettings(partial)` requires an admin, merges the partial object into the current values and upserts the row. Each settings card submits only its own fields, so saving one card can't overwrite another.
- **Refreshing.** After saving, it calls `revalidatePath("/", "layout")`, because the landing page, About Us, the legal pages and the hotline bar render settings on the server. Client pages refetch through the `["barangay-settings"]` query.
- **Logging.** It logs one `updated` audit entry listing each changed field, including each clearance fee (`Clearance Fee (Business Clearance)`), or nothing if no value changed.

### The cards

| Card | Fields | Validation | Where the values appear |
|---|---|---|---|
| Document Pricing | GCash number, the three paid clearance fees | GCash number 10–13 characters, fees ≥ 0 | Barangay Clearance form (fees and GCash number), Court Reservation form (GCash number) |
| Court Reservation Fees | Day rate (6 AM–6 PM), night rate | ≥ 0 | Court Reservation form, the fee stored with each new reservation |
| Goal, Mission & Vision | Goal, mission, vision | Required, ≤ 2000 characters each | Landing page, About Us |
| Contact Information | Hotline 1, hotline 2 (optional), email, address | Phone numbers are 7–20 characters of digits, spaces and `()+-` | The signed-out hotline bar, the landing page hero and footer, the Privacy and Terms pages |
| Barangay Officials | See [Officials](#officials) | | Landing page, About Us |
| Sangguniang Kabataan | See [Officials](#officials) | | Landing page, About Us |
| AI Assistant Knowledge Base | PDFs | PDF, ≤ 15 MB each | The AI assistant's answers |

Every value in the first four cards is also given to the AI assistant in its system prompt (`formatBarangaySettings`), and the prompt tells it to trust them over a PDF that disagrees. If you add a setting residents might ask about, add it there too (see [AI assistant](../ai-assistant.md#barangay-settings-and-officials-in-the-prompt)).

Each card's form is keyed on its own values (`key={JSON.stringify(pricing)}`), so saving one card and refetching the row doesn't reset unsaved edits in another.

### Defaults

The barangay's name, logo and city are constants in `src/lib/data.ts`. The rest of `data.ts` holds the fallback values used before the first save and as the database column defaults:

| Constant | Default |
|---|---|
| `DEFAULT_GCASH_NUMBER` | `0917-123-4567` (a placeholder) |
| `DEFAULT_CLEARANCE_PURPOSE_FEES` | Local Employment ₱60, Bank / Loan ₱80, Business ₱1,000 |
| `DEFAULT_COURT_DAY_RATE`, `DEFAULT_COURT_NIGHT_RATE` | ₱50, ₱100 per hour |
| `barangayHotline1`, `barangayHotline2`, `barangayEmail`, `barangayAddress` | The barangay's real contact details |
| `barangayGoal`, `barangayMission`, `barangayVision` | The barangay's statements |
| `GCASH_ACCOUNT_NAME` | "Barangay Maduya", shown next to the GCash number |

Components should import the name, logo and city from `data.ts`, and read anything admins can edit from `getBarangaySettings()`.

## Officials

The `officials` table holds two sections, `barangay` (Barangay Officials) and `sk` (Sangguniang Kabataan). Each official has a name, a position and one photo (`officials` prefix, public).

- **Adding** (`createOfficial`) puts the official at the end of their section.
- **Reordering.** Each section's list in Barangay Settings can be dragged (`@hello-pangea/dnd`). `reorderOfficials(section, orderedIds)` writes the new `sortOrder` of every official in one `db.batch`, so the order is saved all or nothing, and logs one `reordered` entry.
- **Editing and deleting** are logged with the name and position. Photo changes aren't compared.

The order matters: the landing page's officials showcase features the first barangay official as the head, then lists the other barangay officials and every SK official. About Us shows each section in its own carousel (`OfficialsCarousel`).

The AI assistant gets both lists in its system prompt (`formatOfficials`), so it answers "who is the barangay captain?" directly. Its admin `getFormLink` can open the add-official forms (`add-barangay-official`, `add-sk-official`).

## Knowledge base

The AI Assistant Knowledge Base card (`KnowledgeBaseManager`) lists every uploaded PDF with its uploader, date and chunk count, and accepts more by drag and drop. Each file is uploaded to R2 and then processed by `addKnowledgeBaseDocument` one at a time, so a failed file doesn't stop the rest. Removing a document deletes its chunks and its file. See [AI features](../ai-features.md#knowledge-base-ingestion) for the pipeline.

Upload the portal user manual (`docs/barangay-maduya-portal-user-manual.pdf`) here so the assistant can answer how-to questions. When the manual changes, upload the new version and remove the old one, or the assistant will see both.

## About Us

`/about-us` (signed out) and `/portal/about-us` render the same server components: `AboutHero`, `GoalMissionVisionSection` (which calls `getBarangaySettings()` on the server) and two `OfficialsCarousel`s. Nothing on About Us is edited there.

## Files

| File | What it does |
|---|---|
| `src/actions/settings.ts` | `getBarangaySettings`, `updateBarangaySettings`, `BarangaySettingsValues` |
| `src/actions/officials.ts` | `getOfficials`, `createOfficial`, `reorderOfficials`, `updateOfficial`, `deleteOfficial` |
| `src/actions/knowledge-base.ts` | `getKnowledgeBaseDocuments`, `addKnowledgeBaseDocument`, `deleteKnowledgeBaseDocument` |
| `src/schemas/settings-schema.ts` | One schema per settings card |
| `src/schemas/about-us-schema.ts` | The official form |
| `src/lib/data.ts` | Constants and defaults |
| `src/components/barangay-settings/` | The page, its forms, `OfficialsList`, the official dialogs, `KnowledgeBaseManager` |
| `src/components/about-us/`, `src/components/landing/officials-showcase.tsx` | Where officials and the statements are shown |
