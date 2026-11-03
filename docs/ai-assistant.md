# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the current Barangay Settings, the officials list and the uploaded PDFs (RAG), and can call **tools**. Residents and admins each get their own assistant: the same widget, but a separate set of tools and their own part of the system prompt (see [Residents and admins](#residents-and-admins)). Residents get eight tools and admins eleven.

The assistant sends the user to a page, a form or a record by writing a markdown link in its reply, and the chat panel shows each link to a portal page as a button (see [Links](#links)). No tool shows a button by itself. The tools either look something up for the model to answer from, return the link to a form, or (one of them) run in the browser:

- `getFormLink`: the link that opens a form on its page, like "File a Complaint", with any details the user already gave in the chat filled in. Each role gets the forms its view has (see [Prefilling a form](#prefilling-a-form)).
- `calculateCourtFee`: the fee for reserving the court at given times, billed the same way as the reservation form (see [Court fees](#court-fees)).
- `checkCourtAvailability`: when the court is free on given dates, cut to the hours the user asked about, with the date of "bukas" or "Sabado" taken from a calendar in its description (see [Court availability](#court-availability)).
- `findBusinesses`: the businesses verified in the Community Hub, nearest first once the user has shared their location, each with a link to its details (see [Local businesses](#local-businesses)).
- `getMySubmissions` (residents only): the user's own document requests, complaints (filed and followed), court reservations and businesses, with their status, the barangay's reply and a link to each (see [The user's submissions](#the-users-submissions)).
- `getHandledSubmissions` (admins only): the residents' document requests and complaints the admin is handling, and the court reservations and businesses they submitted themselves (see [Admins' own submissions](#admins-own-submissions)).
- `getSubmissionOverview` (admins only): how many of the residents' submissions the barangay has in each status, open complaints by priority, and the home page's Needs Attention list (see [The barangay's submissions (admins)](#the-barangays-submissions-admins)).
- `getAnalytics` (admins only): the Analytics page's report for a month, compared with the month before, with the 12 months up to it and the totals over a span of months, all worked out in code (see [Analytics (admins)](#analytics-admins)).
- `findAuditLogs` (admins only): the audit log entries matching a search, category, action, admin and date range, with how many match in all. Super admins search every admin's entries, and other admins only their own (see [Audit logs (admins)](#audit-logs-admins)).
- `findNews`: the latest posts on News & Announcements, with today's date and a link to each (see [News and announcements](#news-and-announcements)).
- `findTransparencyProjects`: the projects on the Transparency page, with their budgets added up in code, overall and per category, and a link to each (see [Transparency projects](#transparency-projects)).
- `getUserLocation`: the user's location from their device, for "what's the nearest karinderya?". It has no server `execute`, because the chat widget answers it.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state, and answers `getUserLocation` calls (`onToolCall`, `sendAutomaticallyWhen`). |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone and typing indicator. Renders each reply with `MessageResponse` (Streamdown), whose `a` is `AssistantLink`: a link to a portal page becomes a button (see [Links](#links)). |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. Sets `stopWhen: stepCountIs(8)` so the model can make several tool calls and still reply, with one tool call per step and `temperature: 0.2` (see [Gotchas](#gotchas)). |
| `src/lib/ai-assistant/tools/` | One file per tool. A tool that needs something about the request exports a `buildXTool(context)`, which takes the `AssistantToolContext` (`userId`, `isSuperAdmin`, `settings`, `userLocation`), and one that doesn't exports the tool itself. `resident/index.ts` (`buildResidentTools`) and `admin/index.ts` (`buildAdminTools`) list each role's tools, and the route calls one of them. A tool only one role has is in that role's folder: `resident/get-my-submissions.ts` and `admin/` (`find-audit-logs.ts`, `get-analytics.ts`, `get-handled-submissions.ts`, `get-submission-overview.ts`). A tool both roles share and that's about one portal page is in that page's folder, named like its route: `community-hub/find-businesses.ts`, `court-reservation/` (`calculate-court-fee.ts`, `check-court-availability.ts`), `news/find-news.ts` and `transparency/find-transparency-projects.ts`. At the top: `get-form-link.ts`, `buildGetFormLinkTool(role)`; `get-user-location.ts`, which also has `getSharedUserLocation`, which reads the location out of the chat history; `links.ts`, `markdownLink`, which every tool builds its links with; `submissions.ts`, how each kind of submission is shown to the model, with its link (`submissionLink`), shared by the submission tools of both roles; and `index.ts`, with `AssistantToolContext`. |
| `src/lib/ai-assistant/system-prompt.ts` | `buildSystemPrompt`. The instructions both roles share (`buildInstructions`, with each role's `SCOPE`), the admins' notes (`ADMIN_NOTES`), the user's role (`describeRole`), the pages the role can link (`formatPages`), the current barangay settings (`formatBarangaySettings`), the barangay and SK officials (`formatOfficials`), and the knowledge base excerpts, or what to say when none has been uploaded. |
| `src/lib/audit.ts` | Server-only. Besides `logAudit`, which the server actions call to record a change, `getAuditLogsWhere` (the Audit Logs page's filters as a `WHERE` clause) and `getAuditActors` (who did each entry, from Clerk or a deleted admin's snapshot). `getAuditLogs` (`src/actions/audit-logs.ts`) and `findAuditLogs` both use them, so the page and the assistant find the same entries. |
| `src/lib/ai-assistant/knowledge-base-search.ts` | `getRelevantContext`, which writes an English search query from the conversation, embeds it and finds matching PDF excerpts with pgvector (see [Knowledge base search](#knowledge-base-search)). Imports the DB. |
| `src/lib/ai-assistant/knowledge-base.ts` | The embedding model and dimensions, the upload size limit, and `chunkText`. Shared by the search above, the upload action (`src/actions/knowledge-base.ts`) and the DB schema. |
| `src/lib/ai-assistant/portal-navigation.ts` | Every portal page the assistant links to, with its `label`, `href` and `for`: what the page is for in each role's view (`resident`, `admin`, `superAdmin`), leaving out the roles that can't open it. `describePortalPage` and `isPortalHref` read it. Used by the system prompt, the tools and the chat panel. |
| `src/lib/ai-assistant/portal-dialogs.ts` | Forms the assistant can link to, each with its `page`, `audience` (`resident`, `admin` or `all`, which decides which role's `getFormLink` lists it) and `prefill` schema (the fields the assistant may fill in). Also exports `getPortalDialogHref` (the page plus `?dialog=<id>`, and `&prefill=<json>` when there are values), `parseDialogPrefill`, and `getSubmissionDialogHref` (a submission's page plus `?view=<id>`, which opens its Submission Info dialog), which notifications use too. Used by the server tools and the components that host the forms. |
| `src/components/community-hub/dialogs/linked-business-dialog.tsx` | Opens a business's details (`ViewBusinessDialog`, the dialog its card opens) when the Community Hub's URL has `?business=<id>`. Rendered once on the Community Hub page for both roles, and fetches with `getVerifiedBusinessById`. |
| `src/hooks/use-dialog-param.ts` | `useDialogParam(id)`: a `useState`-like `[open, setOpen]` that stores a form's open state in the URL as `?dialog=<id>`. `useDialogPrefill(id)`: the `?prefill=` values for that form, to spread into its `defaultValues`. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext(messages, isAdmin)` (finds matching PDF excerpts), `getBarangaySettings` and `getOfficials` (once per section) in parallel, then `buildAdminTools` or `buildResidentTools` with `{ userId, isSuperAdmin, settings, userLocation: getSharedUserLocation(messages) }` and `buildSystemPrompt(context, settings, officials, isAdmin, isSuperAdmin)`, and streams `gpt-4o-mini`.
3. If the model calls a tool, its `execute` runs on the server right away. No tool changes anything. `getUserLocation` has no `execute`, so it ends the stream and the browser takes over (see [The user's location](#the-users-location)).
4. Because of `stopWhen: stepCountIs(8)`, the model gets more steps in the same stream and writes its reply from the results. The extra steps cover a lookup followed by `getFormLink`, e.g. `calculateCourtFee` then the reservation form for "how much is 8 to 11 AM? I'd like to reserve", and a message asking for several things at once.
5. `ChatPanel` renders the reply as it streams, and each complete link to a portal page shows as a button. Clicking one navigates with `next/link` and closes the widget (`onNavigate`).

For the code that runs, in order and line by line, when a resident asks for a form and when they ask for the nearest business, see [AI assistant, line by line](walkthroughs/ai-assistant.md).

## Links

The assistant used to show buttons through tools of their own (`navigateToPage`, `openFormDialog` and an `open*` tool per kind of record), which the model had to call after answering. When it didn't, it still told the user to "tap the button below", and there was no button: after a how-to answer about 1 run in 4, and after other lookups now and then, despite a rule against it in the system prompt and in each result. Every new kind of record also needed another button tool and more rules about when to call it.

Now the button is the link in the reply's own text, so a reply can't point to a button it doesn't have.

- **Where links come from.** The system prompt lists the pages the user's role can open, each as a link with what it's for (`formatPages`, from `PORTAL_NAVIGATION_TARGETS`). `getFormLink` returns a form's link. Lookup tools give each record a ready `link`, e.g. `[View DR-12: Barangay Clearance request](/portal/document-request?view=12)`, built with `markdownLink` (`tools/links.ts`), which escapes brackets in titles. The model copies links as they are instead of building them from ids. The one link an admin's assistant builds itself is a submission's from its reference number (see [Admins' own submissions](#admins-own-submissions)).
- **What the prompt says.** Link what the answer is about: the form or page for what the user wants to do, the page a how-to's steps start on, or the records the answer names, up to 3 (for more, their page). Put links at the end, each on its own line, so they sit under the reply like the old buttons. Never make up or change a link, and never mention a button or link the reply doesn't have.
- **The chat panel.** `AssistantLink` turns a link whose path is a portal page (`isPortalHref`) into a `Button` with a `next/link` inside. Its icon comes from where it goes: a pen for a form (`?dialog=`), an eye for a record, and an arrow after the label for a page itself. Any other link renders as plain text, since the assistant only links to the portal: a link still streaming in (Streamdown's `streamdown:incomplete-link`), or one the model made up.
- **Made-up website addresses.** `gpt-4o-mini` sometimes put a domain in front of a page's path (`https://barangaymaduya.com/portal/news`). The prompt says links are paths starting with `/portal`, which stopped most of it, and `AssistantLink` drops the domain from the rest, so they still work.
- **Wrong ids.** A record's page loads it only if it exists and the user may see it (e.g. `getDocumentRequestById` checks the requester for residents), so a link to a made-up or someone else's record opens nothing. The old button tools checked the database before showing a button, which was for the label, not for security.

## How a form gets opened

The form's open state lives in the URL, so the chat doesn't have to talk to the form directly.

1. The form's link is `getPortalDialogHref(id)`, e.g. `/portal/complaint?dialog=report-complaint`.
2. The component that owns that form uses `useDialogParam("report-complaint")` instead of `useState(false)`. Its `open` is true whenever the URL's `dialog` param equals its id, so arriving at that URL opens the form.
3. Closing the form calls `setOpen(false)`, which removes the param. `setOpen` uses `window.history.replaceState` (Next.js keeps `useSearchParams` in sync with it), so opening and closing don't trigger a server round trip.

The page's own buttons use the same `setOpen`, so a form opened any way shows up in the URL and survives a refresh.

Forms that need a resident profile also check it on `open`, e.g. `open={isReportDialogOpen && hasResidentProfile}`. Without that, a resident with no profile could open the form just by visiting the link.

## Prefilling a form

The assistant doesn't collect form details in the chat. The system prompt tells it to call `getFormLink` as soon as it knows which form the user needs, for doing it now or asking how, and the tool's description says to pass anything the user already said (a business name, what a complaint is about, a purpose) as `prefill`, and to call it for each form when the user asks for several. It never asks for fields it can't fill, like uploads, map locations or most dates. The court reservation's date is the exception (see [Court availability](#court-availability)).

Most requests only name the form. `gpt-4o-mini` used to pick options anyway: a plain "I want to request a certificate of indigency" got purpose "Other" or "Medical Assistance" and "Pickup at Barangay Hall" every time, and a how-to question about the clearance got "Pickup at Barangay Hall". The `prefill` description now says most requests only name the form and gives one that does fill a field ("I need a clearance for my new job" for residents, "add Juan dela Cruz as a kagawad" for admins), and the how-to rule says no prefill unless the user's own words give a value. Without the rule to call it per form, "I need a barangay clearance and I'd like to reserve the court" got questions about the purpose and times instead of links. Text fields still get more than the user said: "mag-post ng announcement tungkol sa clean-up drive sa Sabado" got a whole paragraph of `content`. The form opens for the admin to review it.

1. Each `PORTAL_DIALOG_TARGETS` entry has a `prefill` zod object listing the fields the assistant may fill. The tool description lists them per form (`describeForm` in `tools/get-form-link.ts`), including the options of enum fields.
2. The model sends `prefill` as a list of `{ field, value }` pairs. `execute` drops empty values, turns the list into an object and returns the form's `link` to `getPortalDialogHref(form, values)`, e.g. `/portal/community-hub?dialog=submit-business&prefill={"name":"Bakery",...}` (URL-encoded). Its `instruction` says to put the link in the reply as is, that the form opens when the user taps it, and which fields it opens with, if any. With several forms, the model said "I've opened the forms", and it claimed fields were filled in when it had sent none, so the result spells out both. In testing, the model copied the long encoded links exactly.
3. The dialog component calls `useDialogPrefill(id)` and passes the result as the form's `defaultValues`. That runs `parseDialogPrefill`, which checks each field against the `prefill` schema and drops anything else (a made-up category, a broken link), and `z.coerce.number()` turns `"3"` into `3`.
4. `setOpen` removes `prefill` along with `dialog`, so reopening the form from the page's own button starts blank. The form reads `defaultValues` only when it mounts, which happens each time the dialog opens.

Free-text fields in a `prefill` schema are plain `z.string()` rather than the form's own rules (like `min(10)`). A short description still gets filled in, and the form flags it on submit.

## How-to questions

"How do I…" questions ("paano ko i-approve yung court reservation?") get the steps from the knowledge base, not only a link:

- If one of `getFormLink`'s forms is what they'd fill in ("paano mag-request ng barangay clearance?"), the model calls it first, then writes every step as a numbered list and ends with the form's link. With "end with the form's link" only at the end of the rule, it skipped the tool and linked the page; with "call it first" at the start, it calls it every time.
- Otherwise it writes the steps and ends with the link to the page they start on. That's a link from the pages list, so no tool call is needed, which is why it no longer says "tap the button below" with no button, as the old `navigateToPage` did 3 runs in 4.
- The prompt used to say "Be concise", and the model squeezed a workflow into a sentence. It now keeps replies short except for a how-to question's steps.

## Residents and admins

The route picks the user's tools by their role (`isAdmin` from `getAuthRole`): `buildAdminTools` for admins, `buildResidentTools` for residents. With one set of tools for both, "what is the status of my complaints?" found none for admins, since admins don't file complaints.

- Tools that work the same for both roles (the court, the Community Hub, news, transparency and `getUserLocation`) are in both lists. `getFormLink` is too, built per role (`buildGetFormLinkTool("resident")` or `("admin")`), with the forms that role's view has.
- Residents have `getMySubmissions`, and admins have `getHandledSubmissions` and `getSubmissionOverview` instead (see [The user's submissions](#the-users-submissions)). Admins also have `getAnalytics` and `findAuditLogs`.
- The system prompt is one prompt for both (`buildInstructions`), with a few role-specific parts: the scope list (`SCOPE.resident` or `SCOPE.admin`, then `SCOPE.shared`), the hotlines as a fallback for residents, examples, `ADMIN_NOTES` for admins (admin accounts don't request documents or file complaints, so "my requests" means the ones they're handling, and how to link a submission by its reference number), the pages list, and the note for when no knowledge base document has been uploaded (admins are told they can upload one in Barangay Settings).
- `AssistantToolContext` has no `isAdmin`, and no tool checks whether the user is a resident or an admin. A tool only one role should have goes only in that role's list.
- Super admins and the other admins share `buildAdminTools` and the admin prompt. Only the audit logs differ between them, so the context has `isSuperAdmin` for `findAuditLogs`, which searches only the user's own entries unless they're a super admin. The pages list gets Audit Logs only for super admins (its `for` has only `superAdmin`), and the role line (`describeRole`) says what the user can see in the audit logs.

### Targets the user's role can't use

Every form has an `audience`. For example, admins can't use the document request forms or the complaint form, because the admin view doesn't have them, and residents can't post news or add officials. Likewise, residents can't open Analytics, User Management, Barangay Settings or Audit Logs, and admins don't have Notifications (`src/proxy.ts` keeps the user out of those pages).

A target left out unnamed doesn't work: the model handles a request for a missing one by picking the closest one it has, e.g. an admin asking for a Certificate of Indigency got "Submit a Business", and "go to the audit logs page" got About Us. So the pages list ends with the pages the user can't open and who can (`formatPages`), and `getFormLink`'s description names the other role's forms and what to tell the user:

| User | Asks for | Told |
|---|---|---|
| Admin | A residents-only form (document requests, filing a complaint) | Residents submit it from their own accounts, so admin accounts can't, with a link to the page where they review residents' ones. `ADMIN_NOTES` says this too: with only the tool description, the admin got the residents' steps. |
| Admin | Notifications | Only residents can open it. |
| Admin (not a super admin) | The Audit Logs page, or another admin's changes (`findAuditLogs` with `admin`) | Only super admins can see them. Their own changes are on the Audit Logs tab on their profile. |
| Resident | An admins-only form (news, transparency projects, officials) or page | Only barangay admins (or super admins) can do that. |

## Staying on topic

Only the system prompt keeps the assistant to barangay topics; there's no separate filter. `SCOPE` lists what's in scope for each role (barangay services and information, or for admins their work in the portal, the Community Hub's local businesses, using the portal, how barangays work in general, and concerns residents bring to the barangay). The prompt tells the model to refuse anything else in a sentence or two and to answer only the barangay part of a mixed message. Barangay-specific facts come only from the barangay settings, the officials lists, the knowledge base excerpts and the tools' results. The news item in the list names brownouts and water interruptions, so a question about one isn't refused as news outside the barangay. Retrieval uses a low similarity cutoff (0.2), so excerpts show up even for unrelated questions, and the prompt tells the model to ignore excerpts that don't fit. To widen or narrow the scope, edit `SCOPE`. A tool for a new kind of question needs its area there too, or the model may treat those questions as out of scope.

## Barangay settings and officials in the prompt

Every system prompt includes the live `barangay_settings` row, formatted by `formatBarangaySettings`: the hotlines, email, address, GCash number, clearance fees, court day and night rates, and the goal, mission and vision. The prompt tells the model to use these for anything they cover, even when a PDF excerpt says something different, because admins keep the settings current and the PDF can go out of date.

The barangay and SK officials (the `officials` table, edited in Barangay Settings and shown on About Us) are included the same way. The route fetches both sections with `getOfficials`, and `formatOfficials` lists each official as `- Name: Position` in About Us order, or "None listed yet" for an empty section. The prompt treats these lists like the settings, so they also take priority over a PDF that names different officials. Before the lists were in the prompt, the model had no officials data and answered "who are the barangay officials?" with a link to About Us. The prompt's "Questions" rule now tells the model to answer directly instead of pointing to a page.

They're in the prompt rather than behind a tool because they're short, and a lookup tool would add a round trip and use up a step on almost every question about them.

If you add a field to Barangay Settings that residents might ask about, add a line for it in `formatBarangaySettings` and name it in the prompt's sentence that lists what the settings cover.

## Knowledge base search

`getRelevantContext(messages, isAdmin)` finds the excerpts of the uploaded PDFs that go in the system prompt:

1. `writeSearchQuery` has `gpt-4o-mini` (temperature 0) rewrite the user's latest message, with up to 4 messages before it (`SEARCH_QUERY_EARLIER_MESSAGES`), as a short English question that says who does what, e.g. "How does an admin process resident document requests?". An admin's query then gets "Admin: " in front.
2. `searchKnowledgeBase` embeds the query and returns the `KNOWLEDGE_BASE_TOP_K` (5) most similar chunks above a similarity of 0.2, ranking every document's chunks together. Each excerpt is labeled with its document's file name (`[Excerpt 1, from "…"]`), so the model can tell which document says what when two disagree. In testing, replies didn't quote the file names.

The user's message as is matched the manual poorly, which is why the query is rewritten:

- The manual is in English. "Meron mga resident na nag-request. So ang tanong ko is, ano yung gagawin ko as an admin para maprocess yung request nila using this portal?" ranked the excerpt with the steps 16th of 74, so the model answered with "go to the Document Request page".
- A follow-up ("eh pag online soft copy, paano ko ibibigay sa kanila?") doesn't say what it's about; the earlier messages do.
- Every excerpt mentions "Barangay Maduya" and "the portal", so a query with them matched the manual's introduction instead (the steps dropped from 2nd to 28th). The rewrite prompt leaves them out and names the portal's features, with "document request" for a request of no stated kind.
- Keyword lists matched worse than questions ("Online Soft Copy distribution process" matched the Knowledge Base tab), so the prompt asks for a question.
- The manual has an admin section for each service. Without "Admin: ", the soft copy follow-up matched how residents receive one, and the reply told the admin to open Submission Info to download it.
- Admins can upload other documents besides the manual. Told only about the manual, the rewrite turned questions about the barangay itself into portal ones ("magkano ang multa sa pag-iingay sa gabi?" became "What is the fine for noise complaints at night?"), so the prompt says not to. Rewording the prompt further lost "document request" on the admin question above, and with it the manual's steps, so the rest is unchanged. An admin's question about the barangay can still come back framed as reviewing a submission ("requirements for reviewing a Barangay Clearance for a business").

This adds a `gpt-4o-mini` call before the reply starts streaming.

## Court fees

The settings give the model the day and night rates, but it can't be trusted to apply them. Asked about 4:30 to 7:30 PM, it billed two hours for ₱150, when the reservation form charges three: 4:30 to 5:30 at the day rate, and 5:30 to 6:30 (which crosses 6 PM) and 6:30 to 7:30 at the night rate, for ₱250.

So `calculateCourtFee`'s description says to always use it for a court fee and never work one out, and the prompt says never to do arithmetic the tools can do. The tool takes `startTime` and either `endTime` or `durationHours` (24-hour `"HH:MM"`, with `"24:00"` or `"00:00"` as a midnight end) and runs `getCourtHourCharges` and `calculateCourtFee` from `src/lib/court-reservations.ts` with the settings' rates, the same functions the form uses. It returns the hour-by-hour breakdown and the total, or an `error` for a range that ends after midnight or isn't a whole number of hours, which the form doesn't allow either.

The result's `instruction` says that if the user already said they want to reserve, call `getFormLink` for the reservation form next, and otherwise ask whether they'd like it. The "call it next" part is needed because the model makes one call per step (see [Gotchas](#gotchas)): it used to open the form in the same step as the lookup, and once the lookup had to come first, it followed an instruction that only said to offer the form, and never opened it. Before the how-to and form rules were reworded, it linked the Court Reservation page here instead of the form.

## Court availability

Questions like "bakante ba ang court sa Sabado ng gabi?", "anong oras pa available bukas?" or "free ba sa Sabado 8 to 10 PM?" go to `checkCourtAvailability`. It reads the same data as the Court Availability dialog on the Court Reservation page: `getTakenTimeRanges` (approved reservations, the only ones that block a booking) and `getFreeRanges`.

- **Today's date.** The model has no clock. Without a date, it sent dates from its training years (`2023-10-28` for "sa Sabado") and told the user that day had passed. So the tool is built per request (`buildCheckCourtAvailabilityTool()`), and its description starts with today's date (`getPhilippineTime` in `src/lib/utils.ts`) and lists the coming week, one day of each name: `Monday 2026-10-26 (today), Tuesday 2026-10-27 (tomorrow), …`. The model looks up "bukas" or "Sabado" in that list instead of counting days. When the list was only in the `dates` field's description, the model ignored it. A date further out ("December 25") gets the year from today's date.
- **The hours asked about.** The model passes `dates` (up to 7, for "this weekend"), plus `startTime` and `endTime` when the user asks about specific times or a part of the day. The input description maps umaga, hapon and gabi to 06:00, 12:00 and 18:00. `execute` cuts the open times to those hours (`hoursChecked`) and lists only the bookings that overlap them. Given the whole day, the model answered "sa Sabado ng gabi?" with the whole day, and for "8 to 10 PM?" it listed a 7 - 9 PM booking without saying 8 - 10 PM wasn't free. Each day also has `allAvailable`, whether all of `hoursChecked` is open, and the `instruction` tells the model to answer yes or no from it first.
- Open times shorter than an hour are dropped, since reservations last whole hours. On today's date, times before now (rounded up to the half hour) are dropped too, and the `instruction` says so. A whole free day reads "The whole day", because the model repeated `formatTimeRange`'s "12:00 AM - 12:00 AM" as is. A past or invalid date gets an `error` instead.
- Like `calculateCourtFee`, the `instruction` says that if the user already said they want to reserve and `allAvailable` is true, call `getFormLink` for the reservation form next, with only the date and times as prefill. Otherwise, offer the form.

### Prefilling the reservation date

The court reservation form's `prefill` has a `date` (`"YYYY-MM-DD"`), so "gusto ko mag-reserve sa Sabado 4 to 6 PM" opens the form with Saturday picked. `getFormLink` has no calendar of its own. The model takes the date from the coming week in `checkCourtAvailability`'s description, which every request sends with the other tools, so removing that tool would bring back dates from the model's training years. With it, "bukas", "sa Sabado", "December 25" and a follow-up to an availability answer ("sige, i-reserve ko 9 to 11 PM") all got the right date.

- `parseDialogPrefill` keeps a date only if it's real and from today on, since the date picker can't pick a past day but a link opened later would fill one in.
- The `date` and `purpose` fields' descriptions say to fill them in only when the user said which day or what it's for, and the `date` one adds "don't assume today". Without them, the model filled in today for "pa-reserve ako 3 to 5 PM", and a purpose like "Event" or "Court Reservation" for most reservations.
- After `calculateCourtFee`, it still usually fills in today when no day was given ("magkano ang 8 to 11 AM? gusto ko mag-reserve"). Telling it not to in that tool's `instruction` made it stop opening the form, and an example in the system prompt only worked for that exact wording. The form shows the date first, so the user sees it before submitting.

## Local businesses

Questions like "Ano yung pinakamalapit na karinderya sa akin?", "is there a vulcanizing shop?" or "what's Aling Nena's number?" go to `findBusinesses`. Before it existed, the model had no business data and refused them as out of scope.

The tool takes no input. It returns every business with status `Verified`, up to 50, with the category, a description cut to 200 characters, the hours (`formatOperatingHours`), `openNow`, the contact number, the address, once the user has shared their location a straight-line distance (`distanceInMeters` in `src/lib/geolocation.ts`), and a `link` to its details.

`openNow` answers "bukas pa ba sila?". It comes from the business's hours and the current Philippine time (`getPhilippineTime`). The server runs in UTC, so this adds 8 hours (the Philippines has no daylight saving time). Like the court fee, it's worked out in code rather than by the model, which has no clock and compares times unreliably. Hours that close at or before they open run past midnight (6:00 PM – 2:00 AM), and the same opening and closing time counts as open all day. The list is sorted by name, or nearest first when there's a location. The model picks the businesses that fit the question itself. A keyword search couldn't match "karinderya" to a business described as "lutong-bahay na ulam", and with an optional category filter the model narrowed "any business or store" down to Others and reported nothing. The result's `instruction` says to use only the listed businesses, leave out the ones that don't fit (it padded a list of karinderyas with a motor shop that "has food options nearby", even with a note that it isn't a karinderya), use `openNow` for whether one is open, give distances as approximate, without a location never call a business the nearest, and give the links of the businesses the answer is about, up to 3.

Each business's `link` (`View <name>`) goes to `/portal/community-hub?business=<id>`, which `LinkedBusinessDialog` reads with `useViewParam(BUSINESS_SEARCH_PARAM)` to open the dialog its card opens: photos, contact links and the map. It's separate from `?view=<id>`, which opens the Submission Info dialog (permit, review status) that only the owner and admins may see. `getVerifiedBusinessById` returns the same businesses the Community Hub list shows: verified ones and the user's own (admins get any). Before businesses had links, "patingin ng full details" got a link to the Community Hub, which left the user to find the business themselves.

### The user's location

"Nearest" needs the user's location, which only the browser has. `getUserLocation` is a client-side tool:

1. Its description tells the model to call it on its own when the user asks what's nearest and hasn't shared their location in the conversation yet.
2. The tool has no `execute`, so the stream ends at the call.
3. The widget's `onToolCall` runs `getCurrentLocation()` (the browser may ask for permission) and answers with `addToolOutput`: the coordinates, or `state: "output-error"` if it fails or takes longer than 30 seconds (`LOCATION_TIMEOUT_MS`). Some browsers never answer when the permission prompt is closed without a choice, which would otherwise leave the question with no reply. It doesn't await this. `onToolCall` holds up the stream, and `addToolOutput` waits for the stream, so awaiting it would deadlock.
4. `sendAutomaticallyWhen: hasAnsweredLocationRequest` sends the chat back once the last step's `getUserLocation` call has an answer. The reply continues the same assistant message, and the new request gets its own eight steps. The typing indicator shows while the browser answers.
5. The route reads the latest coordinates from the history with `getSharedUserLocation` and builds `findBusinesses` with them. The model never handles the coordinates. `toModelOutput` replaces them with "The user shared their location", so they aren't sent to OpenAI and the model can't make some up. Later questions in the same conversation reuse the location without asking again.
6. If the user denies permission, the model still calls `findBusinesses` and gives addresses, saying it couldn't get their location (`getUserLocation`'s description says to).

If the user sends another message while the permission prompt is still open, the unanswered call stays in the history. `convertToModelMessages(..., { ignoreIncompleteToolCalls: true })` drops it, because OpenAI rejects a tool call with no result.

## The user's submissions

A resident's questions like "ano na status ng clearance ko?", "bakit na-reject yung reservation ko?" or "na-verify na ba yung business ko?" go to `getMySubmissions` (`tools/resident/`). Admins get their own tools for this (see [Admins' own submissions](#admins-own-submissions)).

- It takes no input. The route passes the session's `userId` to the builder, so the model can't ask about anyone else's submissions. It queries the tables directly rather than through the `getMy*` actions, which page their results and fetch names from Clerk. It returns the 10 most recent of each kind (`MAX_PER_KIND`) with the reference number (`DR-12`, `CP-3`, `CR-7`, `CH-5`), status, the barangay's reply (`pickupMessage`, `rejectionReason`, `resolutionMessage`, `dismissalReason`, cut to 300 characters), the dates and a `link`. The server runs in UTC, so dates are formatted with `timeZone: "Asia/Manila"`. How each kind is shown to the model is in `tools/submissions.ts`, which `getHandledSubmissions` uses too.
- Each submission's `link` (`View DR-12: Barangay Clearance request`, from `submissionLink`) goes to `getSubmissionDialogHref(page, id)` (`<page>?view=<id>`), which opens its Submission Info dialog through `useViewParam`: the barangay's reply, attachments, and a ready soft copy. A notification links to the same place.
- Complaints the user follows come back as a separate `followedComplaints` list. With a `following: true` flag on each complaint instead, the model answered "may update na ba sa complaint ko?" with only a followed complaint and called it "complaint mo".
- The tool description says it has only the user's own submissions, not other residents' or the barangay's totals.
- The result has `counts`, how many of each kind the user has in all, from separate `count()` queries. Without it, "ilan lahat ng complaints ko?" got the number listed. When a kind has more than the 10 listed, the `instruction` tells the model to say, whenever its answer lists or counts that kind, how many the user has, that it can only show their 10 most recent, and which page lists them all. That's written as reported speech filled in by code (`cutOffNotes`). As a quoted sentence, the model copied it in English into Filipino replies.
- The `instruction` says to give the links of the submissions the answer is about, up to 3, and none for a longer list ("show me all my requests"), saying each one opens from its page instead. With buttons for the first 3 of a longer list, the model listed only those 3, and when told to keep listing the rest, it dropped the cut-off note.

## Admins' own submissions

Admins don't request documents or file complaints, so `getMySubmissions` doesn't fit them: "what is the status of my complaints?" found none and brought up the admin's business instead. Admins get `getHandledSubmissions` (`tools/admin/get-handled-submissions.ts`) instead.

- An admin's requests and complaints are the residents' ones they're handling: the ones whose status they last changed (`handlerId`), which each admin page's "Only show … I'm handling" filter shows. Their court reservations and businesses are the ones they submitted themselves, like a resident's. With the residents' ones they handle listed too, even in separate lists, "what's the status of my business?" sometimes got a business the admin had only verified.
- The result has the same shape as `getMySubmissions` (10 per kind, `counts`, cut-off notes, links), without followed complaints. The `instruction` tells the model to say the admin is handling the requests and complaints ("You're handling 1 complaint"), never that they have or filed them.
- It doesn't have pending submissions no admin has acted on yet, ones other admins are handling, or residents' court reservations and businesses. Its description and the first line of its `instruction` send questions about those, and about the barangay's totals, to `getSubmissionOverview`. With that line further down, "how many complaints are still pending?" got the one complaint the admin was handling, which was resolved.
- Asking to see them ("I wanna see the document requests I'm handling") goes here too, as its description says: it lists them in the chat. When an example in the old admin prompt sent "I wanna view my complaints" to a page, that request got only a link to the page.
- An answer that lists or names 1 to 3 submissions, even when they're all the admin has, gets their links. When the rule said "about 1 to 3 specific submissions", a list of all 3 the admin was handling got none.
- **By reference number.** An admin can open any resident's submission, since each admin page's `?view=<id>` loads it by id, with its details and the actions to review it. So "pakita yung DR-12" gets a link even when no tool returned it: `ADMIN_NOTES` shows how to build one from a reference number (`DR-12` → `/portal/document-request?view=12`, with the page for each prefix from `getSubmissionDialogHref`), and the `instruction` says to do that for a reference number that isn't in the result. Without that line, the model looked the number up in `getHandledSubmissions` and said it couldn't find it.

## The barangay's submissions (admins)

Admin questions about the barangay's workload, like "ilan ang pending na document requests?", "ilang high-priority complaints ang open?" or "ano ang kailangan kong asikasuhin ngayon?", go to `getSubmissionOverview` (`tools/admin/get-submission-overview.ts`), which only admins have. `getHandledSubmissions` has only the submissions the admin is handling, so before this tool, these questions got a link to the page instead of an answer. `getHandledSubmissions`'s description and `instruction` now send them here.

- It takes no input. `counts` has how many document requests, complaints, court reservations and businesses there are in each status, with each kind's `total`, from one `GROUP BY` query per table. That covers what `getAdminPendingCounts` and the `get*Stats` actions return (the Pending count and the total), plus the other statuses. `pageLinks` has the link to each kind's page.
- `openComplaints` counts the complaints that are Pending or In Progress, in all and per priority. The model misread these. It answered 4 High and 1 Urgent as "4, at 1 sa mga ito ay urgent", even when told the High count doesn't include Urgent, and still did about one time in four with a High + Urgent total added to the result. Asked "ilan ang open na complaints?", it gave the total of all complaints. So, like `getHandledSubmissions`' cut-off notes, the `instruction` has those answers as reported speech filled in by code: how many complaints are open, and how many are high priority, counting Urgent, with how many are High and how many Urgent.
- `needsAttention` comes from `getNeedsAttentionQueue`, the admin home page's Needs Attention list (up to 8, urgent complaints first, then the ones that have waited longest), so the answer matches that card. Each item has its reference number (from the queue item's `recordId`), kind, title, a complaint's priority or the others' status, and a `link`. The residents' names are left out, as in `getHandledSubmissions`.
- Asked what needs attention, the model answered with the counts, and put the open complaints' priorities on the Pending count. The `instruction` now says to list `needsAttention` in order for that question, that Pending means the Pending status only, and that `openComplaints` covers both open statuses.
- An answer that names 1 to 3 submissions gets their links ("pakita yung urgent na complaint" gets "View CP-19: …"). A count of one kind gets that kind's `pageLinks` link. An answer about several kinds, like the Needs Attention list, gets neither. With "more than 3 submissions" as the rule for no link, a count of 5 complaints got none, so the rule goes by the submissions the reply names.
- `getNeedsAttentionQueue` is a server action that checks the user is an admin, so it fails outside a Next request: a test script that calls this tool gets an error, and the model says it can't get the information.

## Analytics (admins)

Questions about the Analytics page's numbers, like "ilang document requests ngayong buwan?", "dumami ba ang complaints kumpara noong nakaraang buwan?", "magkano ang kinita ng court noong September?", "ilan ang bagong users ngayong taon?" or "anong buwan ang may pinakamaraming request?", go to `getAnalytics` (`tools/admin/get-analytics.ts`), which only admins have.

- **Same numbers as the page.** It calls the page's own `getMonthlyAnalytics(month)` (`src/actions/analytics.ts`), so records count toward the Philippine-time month they were submitted in, and the breakdowns show each one's current status. `getSubmissionOverview` has how many are in each status now, whenever they were submitted. Each tool's description sends the other's questions to it.
- **Input.** `month` (`"YYYY-MM"`, this month when empty) and, for a span of months ("ngayong taon", "mula July hanggang October"), `fromMonth`, at most 11 months before `month`. Like `findAuditLogs`, the tool is built per request, and its description lists the past 12 months with their values (`2026-11 (November 2026, this month), 2026-10 (October 2026, last month), …`), so the model looks up "noong Setyembre" instead of working out the year. A month that hasn't come yet, one before the portal's first records (`getAnalyticsFirstMonth`, where the page's month picker starts), a span longer than 12 months or a malformed value gets an `error` for the model to pass on. A reversed span is swapped.
- **Output.** `counts` has the page's six summary tiles, each with `comparedWithLastMonth` written by code ("1 fewer than October 2026, which had 1"). Then come the month's breakdowns and the approved reservations' hours booked and fees. `trend` has each month's counts, starting at the first records rather than with months of zeros. `span` has the totals from `fromMonth` to `month` (the whole trend when there's no `fromMonth`) and each kind's busiest month. Like `findTransparencyProjects`' budget totals, the arithmetic is done in code, and the `instruction` says never to add up, subtract or compare the numbers. The current month is labeled "(so far)". With that only in the `instruction`, replies said it some of the time.
- **High priority.** Like `getSubmissionOverview`, the `instruction` gives the high-priority complaint count, Urgent included, as reported speech filled in by code.
- **Statuses are current.** "ilan ang na-verify na businesses noong October?" got "2 businesses were verified in October" every time, though the report only knows that the 2 businesses submitted in October are Verified now. The `instruction` now starts with that kind of question and how to word the answer ("Of the 2 businesses submitted in October 2026, 2 are now Verified"). The model follows it about 2 times in 3 for businesses, but "ilang court reservations ang na-approve last month?" still gets "1 was approved". Questions about when something was reviewed ("how many complaints were resolved in October?") go to `findAuditLogs`, which has the dates.
- A summary called October the busiest month "for all categories" when new users peaked in July, until the `instruction` said each kind's busiest month can differ.
- Told not to work out percentages, the model did anyway ("100% were approved"), so that rule was dropped. Percentages and averages are the model's own arithmetic.
- "patingin ng analytics charts" got a written summary instead of a link to the page until the tool's description named that request. The link opens the page on the current month, since the page doesn't keep the picked month in the URL.

## Audit logs (admins)

Questions about what admins changed in the portal, like "sino ang nag-reject ng DR-12?", "ano ang mga binago ko kahapon?", "who changed the clearance fees?" or "ilang complaint ang na-resolve ngayong linggo?", go to `findAuditLogs` (`tools/admin/find-audit-logs.ts`). It searches the same entries as the Audit Logs page, with the page's filters (`getAuditLogsWhere` in `src/lib/audit.ts`). Its description says it's the only tool that knows who posted a news post or project, and that a submission's current status comes from the submission tools.

- **Who can see what.** Super admins search every admin's entries, like on the Audit Logs page, and `onlyMine` narrows them to their own. The other admins only get their own, like the Audit Logs tab on their profile, because that's all `getAuditLogs` lets them read. Passing `admin` as one of them returns an `error` telling the model to say only super admins can see other admins' changes. Without that, "ano ang ginawa ni Maria?" would get the user's own changes, given as Maria's.
- **Input.** `search` matches the entries' English summaries (reference numbers, titles, names, and statuses as "to Rejected"), and also the admin who did it, like the page's search box. `admin` matches only the admin who did it (their Clerk name or email), so "how many changes did Juan make?" doesn't also count entries that mention Juan. `category` and `action` are the page's Category and Action filters, with their labels in the descriptions. `dateFrom` and `dateTo` are Philippine days, as `"YYYY-MM-DD"`. Like `checkCourtAvailability`, the tool is built per request and its description has today's date and the past week (`Friday 2026-10-30 (today), Thursday 2026-10-29 (yesterday), …`), so the model looks up "kahapon" or "noong Lunes".
- **Output.** The 30 most recent matching entries (`MAX_ENTRIES`), each with when, who did it (with their role at the time), the category, the action, the summary, and the changed fields' values before and after, each cut to 200 characters. `total` is how many entries match in all, from a `count()` query, and for super admins `byAdmin` is how many each admin did, from a `GROUP BY`. The `instruction` gives the total as reported speech filled in by code, like `getSubmissionOverview`, and says to never count the entries. When more match than are listed, it tells the model to say the Audit Logs page (or the profile's tab) has them all.
- When a super admin wants to browse the entries, the `instruction` says to link the Audit Logs page. The other admins are told where their profile's tab is, since the profile's tabs aren't in the URL.
- The date filters used to read `"YYYY-MM-DD"` with `new Date(...)`, which takes it as UTC midnight. So the page's "From" day started at 8:00 AM Philippine time, and the end of "To" depended on the server's time zone. `getAuditLogsWhere` now uses the Philippine day's start and end (`+08:00`) on both the page and the assistant.

## News and announcements

Questions like "may brownout o water interruption ba ngayong linggo?", "kailan ang susunod na event?" or "any emergency announcements?" go to `findNews`.

- It takes no input and returns the 20 latest posts in the News & Announcements page's order (pinned first, then newest), each with its title, category, `pinned`, the date it was posted, the first 500 characters of its content and a `link`. Like `findBusinesses`, it leaves the matching to the model, so a post titled "Scheduled Power Interruption" still answers "may brownout ba?".
- The result has `today` (e.g. "Monday, October 26, 2026", in Philippine time) for "ngayong linggo" and "susunod". Its `instruction` says that `posted` is when the post went up, not when the event or interruption happens, so the model takes those dates from the content, or says the post doesn't give one. Content that was cut short ends with "…", and the `instruction` says only that content may have more in the full post. When it said every excerpt was cut short, the model told users to "see the full post" for details a short post didn't have.
- The `instruction` also says to go by each post's `category` for emergencies, events and announcements (the model once called the "Oplan Undas" Announcement an emergency), to leave out posts that don't fit (it listed unrelated posts after saying there were no emergency announcements), and to give the links of the posts the answer is about, up to 3.
- Dates inside a post's text can't be checked in code the way budgets are, so the model sometimes gets them wrong. Asked for this week's announcements, it included a post whose text gave a date that had already passed.
- A post's `link` (`View <title>`) goes to `/portal/news/<id>` rather than the public `/news/<id>` that share links use. Leaving `/portal` would unmount the portal layout, and with it the widget and the conversation. Signed-in users who open a share link are redirected to the portal's page too (`src/proxy.ts`).

## Transparency projects

Questions like "ano ang mga project ng barangay ngayon?", "magkano ang budget ng road project?" or "magkano lahat ng ginastos sa infrastructure?" go to `findTransparencyProjects`.

- It takes no input and returns every project (up to 50 listed, newest first) with its title, category, budget, a description cut to 200 characters, the address, the date it was posted and a `link` to `/portal/transparency/<id>`.
- Like `calculateCourtFee`, it does the arithmetic: `budgetTotals` has the total budget of all projects and of each category that has projects, added up in code over every project, including any past the 50 listed. Projects with no budget listed aren't counted, and `projectsWithNoBudget` says how many there are. The system prompt and the `instruction` tell the model never to add up budgets itself. For a group that isn't all projects or a whole category (e.g. two of the Infrastructure projects), it gives each one's budget without a total.
- The table has a budget, not what was actually spent, so the `instruction` tells the model to call the amounts budgets even when asked "magkano ang ginastos". Projects have no status either, so it's told not to call one ongoing or finished unless the description says so.

## Streaming and re-renders

Each streamed chunk updates `messages`, which re-renders `ChatPanel` and re-runs `messages.map` over **every** message, not only the one being streamed.

- `status` moves one way per request (`submitted` → `streaming` → `ready`). All server steps are part of one stream, so it doesn't drop back to `ready` between the tool call and the reply.
- A link becomes a button as soon as its markdown is complete. Until then Streamdown gives it the href `streamdown:incomplete-link`, which `AssistantLink` shows as plain text.
- The typing indicator (`isTyping`) shows while a response is in progress and the last part of the reply isn't text: before the first word, and while a tool runs between steps. It also shows while the browser answers a `getUserLocation` call, when `status` is already `ready`. A reply with no text yet isn't rendered, so the indicator takes its place.
- `MessageResponse` is memoized on its text, so its `components` (the `a` override) are read when the text changes, not on every render.

## Adding a form the assistant can open

1. Register it in `PORTAL_DIALOG_TARGETS` (`src/lib/ai-assistant/portal-dialogs.ts`) with a `label`, `page`, `description`, `audience` and `prefill`. Only "create" forms belong here; dialogs that act on an existing record (edit, delete, reject) need a specific row. Set `audience` to the role(s) whose view of the page renders the form. It decides which role's `getFormLink` lists the form, and the other role's names it as one they can't use (see [Targets the user's role can't use](#targets-the-users-role-cant-use)). Put the text, choice and number fields the user could state in a sentence in `prefill`, not uploads, map locations or dates. A date works only where the model knows today's date, like the court reservation's (see [Prefilling the reservation date](#prefilling-the-reservation-date)).
2. In the component that owns the form, replace its `useState(false)` with `useDialogParam("<id>")`. Add `&& hasResidentProfile` to `open` if the form needs a resident profile.
3. In the component that renders the form, pass `useDialogPrefill("<id>")` into its `defaultValues` (cast to `Partial<...FormValues>`).

`getFormLink`'s input schema, its description and the link all come from the registry, so there's nothing else to change.

## Adding a page the assistant can link to

Add it to `PORTAL_NAVIGATION_TARGETS` (`src/lib/ai-assistant/portal-navigation.ts`) with a `label`, `href` and `for`: what it's for in the view of each role that can open it. The system prompt lists it for those roles and names it for the others, and the chat panel shows links to it as buttons.

## Adding a tool

1. Add a file to `src/lib/ai-assistant/tools/` exporting the tool, or a `buildXTool(context)` if it needs the user, the settings or their location. Put it in `resident/` or `admin/` if only one role gets it, otherwise in the page's folder if it's about one page. Add a field to `AssistantToolContext` if it needs something else about the request.
2. Write its description for the model: what it returns and the questions it answers, with a few examples in English and Filipino. The system prompt doesn't list the tools, so the description is where the model learns when to use it. If the tool is for a new kind of question, add its area to `SCOPE` in `system-prompt.ts`.
3. Give it an `execute` so the call finishes on the server, and return an `instruction` with anything the model needs to answer right. Do arithmetic, counting and date handling in code and give the model the result. If the result has records the user may want to open, give each a `link` made with `markdownLink` (`tools/links.ts`), and say in the `instruction` when to include them.
4. Add it to `buildResidentTools` (`tools/resident/index.ts`), `buildAdminTools` (`tools/admin/index.ts`) or both.

A tool only the browser can answer (like `getUserLocation`) has no `execute`. Answer it in the widget's `onToolCall` and resend the chat with `sendAutomaticallyWhen` (see [The user's location](#the-users-location)).

## Gotchas

- `getUserLocation`'s name must be the same string in `buildResidentTools`, `buildAdminTools`, the widget (`onToolCall`, `hasAnsweredLocationRequest`) and `getSharedUserLocation`. If it's not, the location request is never answered.
- Every tool the browser doesn't answer needs an `execute`. A call without a result stops the stream with no reply.
- Parallel tool calls are off (`providerOptions: { openai: { parallelToolCalls: false } }`), so the model makes one call per step. Once `findBusinesses` and `getUserLocation` were added, it sometimes added stray calls next to the one it needed, e.g. `calculateCourtFee` or `getUserLocation` next to the clearance form, in roughly one request in six. Tests showed the tools caused this, not the prompt. A flow that needs two tools (a lookup, then a form) takes two steps instead.
- `temperature` is 0.2. Replies repeat exact details from tools and settings, and at OpenAI's default of 1 the model now and then miscopied one (a plus-code address `83C7+WRC` came out as `81C7+WRC`). A low temperature also means a bad habit shows up nearly every time instead of now and then, so check a prompt or tool change over several runs of the same question.
- `stopWhen` defaults to one step. Without `stepCountIs(...)`, the stream ends at the tool call and the reply has no text. Each tool call takes a step (parallel calls are off), and so does the reply. 8 covers a message asking for several forms and a lookup with room to spare. `maxDuration` is 60 seconds because each step is another model call.
- `gpt-4o-mini` follows the system prompt much more closely than the tool descriptions. Moving the form rules from the prompt into `getFormLink`'s description made it link pages instead of forms, until the prompt's how-to and "do it now" rules named `getFormLink` again. A rule the model keeps missing usually belongs in the prompt or in the tool result's `instruction`.
- `gpt-4.1-mini` was tried on the same questions (November 2026) and did no better with the current prompt, at about 2.7 times the price, so the assistant stays on `gpt-4o-mini`.
- Don't use `z.record()` in a tool's input schema. The AI SDK sends every object to OpenAI with `additionalProperties: false`, so a record reaches the model as "an object with no keys". That's why `prefill` is a list of `{ field, value }` pairs.
- Keep tool inputs lenient. If the model's arguments fail the input schema (e.g. a number where only a string is allowed), it retries in its next step, which can use up the last one and leave the reply with no text. That's why a prefill `value` accepts a string or a number, and the real checks happen in `parseDialogPrefill`.
- Authorization belongs on the server. The route picks the tools from the session's role, so an admin-only tool goes only in `buildAdminTools`. When a role can't use a page or form, name it in the prompt or the description with what to tell the user, or the model substitutes the closest one (see [Targets the user's role can't use](#targets-the-users-role-cant-use)). A link is only a UI convenience; the page's server actions still check permissions.
- `useDialogParam` uses `useSearchParams`, which needs a Suspense boundary on statically prerendered pages. `src/app/portal/layout.tsx` wraps the page content in `<Suspense>` for this. A form hosted outside `/portal` needs its own boundary unless that page is dynamic.
- Components may import only `portal-navigation.ts`, `portal-dialogs.ts` and `knowledge-base.ts` from `src/lib/ai-assistant/`. `knowledge-base-search.ts` imports the DB, and `tools/` and `system-prompt.ts` are for the chat route only (an `import type` is fine). There's no `index.ts` for the folder, so nothing pulls in the server files by accident.
