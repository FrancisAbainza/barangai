# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the current Barangay Settings, the officials list and the uploaded PDF (RAG), and can call **tools**. Residents and admins each get their own assistant: the same widget, but a separate set of tools and system prompt (see [Residents and admins](#residents-and-admins)). Residents get thirteen tools and admins fourteen. Six of them put buttons under the assistant's reply, the rest look up something the model answers from, and one runs in the browser:

- `navigateToPage`: a "Go to X" button that takes the user to a portal page. Each role's version lists only the pages it can open.
- `openFormDialog`: a button like "File a Complaint" that takes the user to the form's page and opens the form there, with any details the user already gave in the chat filled in. Each role's version lists only the forms it can open.
- `openBusinessDetails`: a "View \<business>" button for each of up to 3 businesses, which opens that business's details on the Community Hub (see [Business buttons](#business-buttons)).
- `openSubmissionDetails`: a "View DR-12: …" button for each of up to 3 submissions, which opens it on its page. A resident's version opens only their own submissions, in the Submission Info dialog, and an admin's opens any resident's. A longer list gets no buttons (see [The user's submissions](#the-users-submissions)).
- `openNewsPosts`: a "View \<title>" button for each of up to 3 news posts, which opens the post's own page (see [News and announcements](#news-and-announcements)).
- `openTransparencyProjects`: a "View \<title>" button for each of up to 3 transparency projects, which opens the project's own page (see [Transparency projects](#transparency-projects)).
- `calculateCourtFee`: the fee for reserving the court at given times, billed the same way as the reservation form. No button (see [Court fees](#court-fees)).
- `checkCourtAvailability`: when the court is free on given dates, cut to the hours the user asked about, with the date of "bukas" or "Sabado" taken from a calendar in its description. No button (see [Court availability](#court-availability)).
- `findBusinesses`: the businesses verified in the Community Hub, nearest first once the user has shared their location. No button (see [Local businesses](#local-businesses)).
- `getMySubmissions` (residents only): the user's own document requests, complaints (filed and followed), court reservations and businesses, with their status and the barangay's reply. No button (see [The user's submissions](#the-users-submissions)).
- `getHandledSubmissions` (admins only): the residents' document requests and complaints the admin is handling, and the court reservations and businesses they submitted themselves. No button (see [Admins' own submissions](#admins-own-submissions)).
- `getSubmissionOverview` (admins only): how many of the residents' submissions the barangay has in each status, open complaints by priority, and the home page's Needs Attention list. No button (see [The barangay's submissions (admins)](#the-barangays-submissions-admins)).
- `findNews`: the latest posts on News & Announcements, with today's date. No button (see [News and announcements](#news-and-announcements)).
- `findTransparencyProjects`: the projects on the Transparency page, with their budgets added up in code, overall and per category. No button (see [Transparency projects](#transparency-projects)).
- `getUserLocation`: the user's location from their device, for "what's the nearest karinderya?". It has no server `execute`, because the chat widget answers it.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state, and answers `getUserLocation` calls (`onToolCall`, `sendAutomaticallyWhen`). |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone. Also renders the buttons the button tools return (`getButtons`, with an icon per `kind` from `BUTTON_ICONS`). |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. Sets `stopWhen: stepCountIs(8)` so the model can make several tool calls and still reply, with one tool call per step and `temperature: 0.2` (see [Gotchas](#gotchas)). |
| `src/lib/ai-assistant/tools/` | One file per tool. A tool that needs something about the request exports a `buildXTool(context)`, which takes the `AssistantToolContext` (`userId`, `settings`, `userLocation`), and one that doesn't exports the tool itself. `resident/index.ts` (`buildResidentTools`) and `admin/index.ts` (`buildAdminTools`) list each role's tools, and the route calls one of them. A tool only one role has, or that works differently for each, is in that role's folder: `resident/` (`get-my-submissions.ts`, `navigate-to-page.ts`, `open-form-dialog.ts`, `open-submission-details.ts`) and `admin/` (`get-handled-submissions.ts`, `get-submission-overview.ts`, `navigate-to-page.ts`, `open-form-dialog.ts`, `open-submission-details.ts`). A tool both roles share and that's about one portal page is in that page's folder, named like its route: `community-hub/` (`find-businesses.ts`, `open-business-details.ts`), `court-reservation/` (`calculate-court-fee.ts`, `check-court-availability.ts`), `news/` (`find-news.ts`, `open-news-posts.ts`) and `transparency/` (`find-transparency-projects.ts`, `open-transparency-projects.ts`). At the top: `get-user-location.ts`, which also has `getSharedUserLocation`, which reads the location out of the chat history; `index.ts`, with `AssistantToolContext`; `buttons.ts`, with `buttonTool`, the button types every button tool returns and `HOW_TO_STEPS_NOTE` (see [Button tools](#button-tools)); `form-dialogs.ts`, what both `openFormDialog` tools share (`describeForm`, `prefillInputSchema`, `getFormButton`); and `submissions.ts`, what the submission tools of both roles share (how each kind of submission is shown to the model, `parseReferenceNumber`, `getSubmissionButton`). |
| `src/lib/ai-assistant/system-prompt.ts` | `RESIDENT_PROMPT` and `ADMIN_PROMPT`, with what each says when no knowledge base document has been uploaded, `formatBarangaySettings`, `formatOfficials`, and `buildSystemPrompt`, which picks the user's role's prompt and adds the user's role, the current barangay settings, the barangay and SK officials and the excerpts. |
| `src/lib/ai-assistant/knowledge-base-search.ts` | `getRelevantContext`, which writes an English search query from the conversation, embeds it and finds matching PDF excerpts with pgvector (see [Knowledge base search](#knowledge-base-search)). Imports the DB. |
| `src/lib/ai-assistant/knowledge-base.ts` | The embedding model and dimensions, the upload size limit, and `chunkText`. Shared by the search above, the upload action (`src/actions/knowledge-base.ts`) and the DB schema. |
| `src/lib/ai-assistant/portal-navigation.ts` | Every portal page the assistant's buttons go to, with its `label` and `href`. Each role's `navigateToPage` lists the pages that role can open and what each is for. Used by the server tools and the chat panel's buttons. |
| `src/lib/ai-assistant/portal-dialogs.ts` | Forms the assistant can open, each with its `page`, `audience` (`resident`, `admin` or `all`, which decides which role's `openFormDialog` lists it) and `prefill` schema (the fields the assistant may fill in). Also exports `getPortalDialogHref` (the page plus `?dialog=<id>`, and `&prefill=<json>` when there are values), `parseDialogPrefill`, and `getSubmissionDialogHref` (a submission's page plus `?view=<id>`, which opens its Submission Info dialog), which notifications use too. Used by the server tools and the components that host the forms. |
| `src/components/community-hub/dialogs/linked-business-dialog.tsx` | Opens a business's details (`ViewBusinessDialog`, the dialog its card opens) when the Community Hub's URL has `?business=<id>`. Rendered once on the Community Hub page for both roles, and fetches with `getVerifiedBusinessById`. |
| `src/hooks/use-dialog-param.ts` | `useDialogParam(id)`: a `useState`-like `[open, setOpen]` that stores a form's open state in the URL as `?dialog=<id>`. `useDialogPrefill(id)`: the `?prefill=` values for that form, to spread into its `defaultValues`. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext(messages, isAdmin)` (finds matching PDF excerpts), `getBarangaySettings` and `getOfficials` (once per section) in parallel, then `buildAdminTools` or `buildResidentTools` with `{ userId, settings, userLocation: getSharedUserLocation(messages) }` and `buildSystemPrompt(context, settings, officials, isAdmin)`, and streams `gpt-4o-mini`.
3. If the model calls a tool, its `execute` runs on the server right away. No tool changes anything. The button tools' `execute` returns the buttons to show, or none if the target doesn't exist or, for a resident's `openSubmissionDetails`, isn't theirs. `calculateCourtFee` returns the fee, `checkCourtAvailability` the court's open and booked times, `findBusinesses` the businesses, `getMySubmissions` and `getHandledSubmissions` the user's submissions, `getSubmissionOverview` the barangay's counts, `findNews` the latest posts and `findTransparencyProjects` the projects and their budget totals. `getUserLocation` has no `execute`, so it ends the stream and the browser takes over (see [Local businesses](#local-businesses)).
4. Because of `stopWhen: stepCountIs(8)`, the model gets more steps in the same stream and writes a short reply pointing at the button, or, for a result with no buttons, answering from it. The extra steps cover a lookup followed by a button tool, e.g. `calculateCourtFee` then `openFormDialog` for "how much is 8 to 11 AM? I'd like to reserve", and a message asking for several things at once.
5. `ChatPanel` collects the `buttons` from the message's finished tool parts (`getButtons`) and renders them, but only once the response has finished streaming.
6. Clicking a button navigates with `next/link` and closes the widget (`onNavigate`).

## Button tools

`navigateToPage`, `openFormDialog` and the `open*` tools are built with `buttonTool` (`tools/buttons.ts`) instead of the AI SDK's `tool`, so they all return the same `ButtonToolOutput`:

- `buttons`: the buttons the chat panel shows under the reply. Each has a `key` (unique per target, e.g. `business-4`), a `kind` (`page`, `form`, `submission`, `business`, `news-post` or `project`), the `page` it goes to, its `label` and its `href`. An empty list shows nothing, e.g. for a made-up id.
- `instruction`: what to tell the user, e.g. that a "File a Complaint" button is shown below the reply. `buttonTool` sets `toModelOutput` so the model gets only this. With the hrefs visible, it wrote links like `[View Details](#)` instead of pointing to the buttons.

`getButtons` in the chat panel reads `buttons` from every finished tool part without checking tool names, so a new button tool needs no change there. It keeps the order the tools were called in, shows one button per `key` when the model asks for a target twice, and drops a `page` button when another button goes to the same page (see [navigateToPage vs openFormDialog](#navigatetopage-vs-openformdialog)). `kind` picks the icon (`BUTTON_ICONS`). A page button's icon is an arrow after the label. The tools that show a button per record take up to `MAX_RECORD_BUTTONS` (3) and ignore the rest.

The lookup tools (`calculateCourtFee`, `checkCourtAvailability`, `findBusinesses`, `getMySubmissions`, `getHandledSubmissions`, `getSubmissionOverview`, `findNews`, `findTransparencyProjects`) return no `buttons`. They return `buttonShown: false` instead, which the model sees with the rest of the result.

## How a form gets opened

The form's open state lives in the URL, so the chat doesn't have to talk to the form directly.

1. The form button links to `getPortalDialogHref(id)`, e.g. `/portal/complaint?dialog=report-complaint`.
2. The component that owns that form uses `useDialogParam("report-complaint")` instead of `useState(false)`. Its `open` is true whenever the URL's `dialog` param equals its id, so arriving at that URL opens the form.
3. Closing the form calls `setOpen(false)`, which removes the param. `setOpen` uses `window.history.replaceState` (Next.js keeps `useSearchParams` in sync with it), so opening and closing don't trigger a server round trip.

The page's own buttons use the same `setOpen`, so a form opened any way shows up in the URL and survives a refresh.

Forms that need a resident profile also check it on `open`, e.g. `open={isReportDialogOpen && hasResidentProfile}`. Without that, a resident with no profile could open the form just by visiting the link.

## Prefilling a form

The assistant doesn't collect form details in the chat. Both system prompts tell it to call `openFormDialog` as soon as it knows which form the user needs, and to pass anything the user already said (a business name, what a complaint is about, a purpose) as `prefill`. It never asks for fields it can't fill, like uploads, map locations or most dates. The court reservation's date is the exception (see [Court availability](#court-availability)).

Most requests only name the form. `gpt-4o-mini` used to pick options anyway, even with the `prefill` description saying not to guess: a plain "I want to request a certificate of indigency" got purpose "Other" or "Medical Assistance" and "Pickup at Barangay Hall" every time. `RESIDENT_PROMPT` now gives that request as one that gets no prefill, and "I need a clearance for my new job" as one that does. `ADMIN_PROMPT` does the same with "I want to post an announcement" and "add Juan dela Cruz as a kagawad". It also says to call the tool for each form when the user asks for several. Without that, "I need a barangay clearance and I'd like to reserve the court" got questions about the purpose and times instead of buttons.

1. Each `PORTAL_DIALOG_TARGETS` entry has a `prefill` zod object listing the fields the assistant may fill. The tool description lists them per form (`describeForm` in `tools/form-dialogs.ts`), including the options of enum fields.
2. The model sends `prefill` as a list of `{ field, value }` pairs. `getFormButton` (`tools/form-dialogs.ts`, which both roles' `execute` calls) drops empty values, turns the list into an object and returns a button linking to `getPortalDialogHref(dialog, values)`, e.g. `/portal/community-hub?dialog=submit-business&prefill={"name":"Bakery",...}`. Like every button tool, the model only sees the result's `instruction`: which button is shown, that the form isn't open until the user taps it, and which fields it opens with, if any. With the `href` visible, it wrote links like `[File a Complaint](#)`. With several forms, it wrote "I've opened the forms", which the system prompt now rules out by saying to start with "Tap the buttons below to…" instead.
3. The dialog component calls `useDialogPrefill(id)` and passes the result as the form's `defaultValues`. That runs `parseDialogPrefill`, which checks each field against the `prefill` schema and drops anything else (a made-up category, a broken link), and `z.coerce.number()` turns `"3"` into `3`.
4. `setOpen` removes `prefill` along with `dialog`, so reopening the form from the page's own button starts blank. The form reads `defaultValues` only when it mounts, which happens each time the dialog opens.

Free-text fields in a `prefill` schema are plain `z.string()` rather than the form's own rules (like `min(10)`). A short description still gets filled in, and the form flags it on submit.

## navigateToPage vs openFormDialog

Both tools can point at the same page, so they're kept from overlapping in two places:

- **System prompt:** use `openFormDialog` when the request matches a specific form ("I want to file a complaint"). Use `navigateToPage` for browsing ("show me my complaints") or a request too broad to pick a form ("I want a document"). Never call both for one request. `ADMIN_PROMPT` also says `navigateToPage` isn't for seeing the submissions the admin is handling (see [Admins' own submissions](#admins-own-submissions)).
- **Chat panel:** if the model calls both anyway, `getButtons` drops any page button whose `page` another button in the same message already goes to. Business buttons go to the Community Hub, submission buttons to their submission's page, news post buttons to News & Announcements and project buttons to Transparency.

## How-to questions

"How do I…" questions ("paano ko i-approve yung court reservation?") get the steps from the knowledge base, not only a button. The system prompt has them as a third kind of request, between questions and action intents:

- If one of `openFormDialog`'s forms matches ("paano mag-request ng barangay clearance?"), the model calls it first, then writes the steps. `HOW_TO_STEPS_NOTE` (`tools/buttons.ts`), at the end of the form and page buttons' `instruction`, tells it to still give every step: with only "point the user to it", it showed the button with a one-line reply.
- Otherwise it calls no tool, writes the steps and offers to take the user to the page. Told to call `navigateToPage` first, it often wrote the steps without calling it and said "tap the button below" anyway (3 runs in 4). When the user takes the offer ("sige, buksan mo"), that's an action intent, which gets the button.
- The prompt used to say "Be concise", and the model squeezed a workflow into a sentence. It now keeps replies short except for a how-to question's steps.

## Residents and admins

The route picks the user's assistant by their role (`isAdmin` from `getAuthRole`): `buildAdminTools` and `ADMIN_PROMPT` for admins, `buildResidentTools` and `RESIDENT_PROMPT` for residents. With one set of tools and one prompt for both, admins were answered as if they were residents: "view my complaints" got "Tap the button below to view your complaints", and "what is the status of my complaints?" found none, since admins don't file complaints.

- Tools that work the same for both roles (the court, the Community Hub, news, transparency and `getUserLocation`) are in both lists.
- `navigateToPage`, `openFormDialog` and `openSubmissionDetails` have a version per role, in `tools/resident/` and `tools/admin/`. The admins' `navigateToPage` describes each page as the admin view has it ("Review and resolve residents' complaints…"), and its `instruction` repeats that description. With the residents' descriptions ("File a complaint…"), and then with only the button, the reply still said "to view your complaints".
- Residents have `getMySubmissions`, and admins have `getHandledSubmissions` and `getSubmissionOverview` instead (see [The user's submissions](#the-users-submissions)).
- `ADMIN_PROMPT` says admin accounts don't request documents or file complaints, so "my requests" or "my complaints" means the residents' ones they're handling. Its scope list covers the admin's work in the portal, and with no knowledge base document, it tells the admin they can upload one in the assistant's Knowledge Base tab.
- `AssistantToolContext` has no `isAdmin`, and no tool checks the role. A tool only one role should have goes only in that role's list.

### Targets the user's role can't use

Every form has an `audience`. For example, admins can't use the document request forms or the complaint form, because the admin view doesn't have them, and residents can't post news or add officials. Likewise, residents can't open User Management or Barangay Settings, and admins don't have Notifications (`src/proxy.ts` keeps the user out of those pages).

Each role's `navigateToPage` and `openFormDialog` list only the targets that role can use, so the model can't pass the others. But a target left out unnamed doesn't work: the model handles a request for a missing form by picking the closest one it has, e.g. an admin asking for a Certificate of Indigency got a "Submit a Business" button. So each tool's description names the targets it leaves out, tells the model not to call the tool or pick a different one for them, and says what to tell the user instead:

| User | Asks for | Told |
|---|---|---|
| Admin | A residents-only form (document requests, filing a complaint) | Residents submit it from their own accounts, so admin accounts can't. They can review residents' submissions on the Document Request page, or the Complaint page for complaints. |
| Admin | Notifications | Admin accounts don't have it. |
| Resident | An admins-only form (news, transparency projects, officials) or page (User Management, Barangay Settings) | Only barangay admins can do that. |

`ADMIN_PROMPT` says the same about the residents' forms. Both prompts tell the model to open only a form that matches the request, never the closest one.

## Staying on topic

Only the system prompt keeps the assistant to barangay topics; there's no separate filter. `RESIDENT_PROMPT` and `ADMIN_PROMPT` each list what's in scope (barangay services and information, or for admins their work in the portal, the Community Hub's local businesses, using the portal, how barangays work in general, and concerns residents bring to the barangay). They tell the model to refuse anything else in a sentence or two and to answer only the barangay part of a mixed message. Barangay-specific facts come only from the barangay settings, the officials lists, the knowledge base excerpts, `findBusinesses`, `findNews`, `findTransparencyProjects`, `checkCourtAvailability`, and `getMySubmissions` for residents or `getHandledSubmissions` and `getSubmissionOverview` for admins. The news item in the list names brownouts and water interruptions, so a question about one isn't refused as news outside the barangay. Retrieval uses a low similarity cutoff (0.2), so excerpts show up even for unrelated questions, and the prompt tells the model to ignore excerpts that don't fit. To widen or narrow the scope, edit those lists. If you add a new kind of page or form, add it there too, or the model may treat questions about it as out of scope.

## Barangay settings and officials in the prompt

Every system prompt includes the live `barangay_settings` row, formatted by `formatBarangaySettings`: the hotlines, email, address, GCash number, clearance fees, court day and night rates, and the goal, mission and vision. The prompt tells the model to use these for anything they cover, even when a PDF excerpt says something different, because admins keep the settings current and the PDF can go out of date.

The barangay and SK officials (the `officials` table, edited in Barangay Settings and shown on About Us) are included the same way. The route fetches both sections with `getOfficials`, and `formatOfficials` lists each official as `- Name: Position` in About Us order, or "None listed yet" for an empty section. The prompt treats these lists like the settings, so they also take priority over a PDF that names different officials. Before the lists were in the prompt, the model had no officials data and answered "who are the barangay officials?" with a "Go to About Us" button. The question is now an example in each prompt's "Questions" rule, which tells the model to answer directly instead of pointing to a page.

They're in the prompt rather than behind a tool because they're short, and a lookup tool would add a round trip and use up a step on almost every question about them.

If you add a field to Barangay Settings that residents might ask about, add a line for it in `formatBarangaySettings` and name it in the sentence in `RESIDENT_PROMPT` and `ADMIN_PROMPT` that lists what the settings cover.

## Knowledge base search

`getRelevantContext(messages, isAdmin)` finds the excerpts of the uploaded PDF that go in the system prompt:

1. `writeSearchQuery` has `gpt-4o-mini` (temperature 0) rewrite the user's latest message, with up to 4 messages before it (`SEARCH_QUERY_EARLIER_MESSAGES`), as a short English question that says who does what, e.g. "How does an admin process resident document requests?". An admin's query then gets "Admin: " in front.
2. `searchKnowledgeBase` embeds the query and returns the `KNOWLEDGE_BASE_TOP_K` (5) most similar chunks above a similarity of 0.2.

The user's message as is matched the manual poorly, which is why the query is rewritten:

- The manual is in English. "Meron mga resident na nag-request. So ang tanong ko is, ano yung gagawin ko as an admin para maprocess yung request nila using this portal?" ranked the excerpt with the steps 16th of 74, so the model answered with "go to the Document Request page".
- A follow-up ("eh pag online soft copy, paano ko ibibigay sa kanila?") doesn't say what it's about; the earlier messages do.
- Every excerpt mentions "Barangay Maduya" and "the portal", so a query with them matched the manual's introduction instead (the steps dropped from 2nd to 28th). The rewrite prompt leaves them out and names the portal's features, with "document request" for a request of no stated kind.
- Keyword lists matched worse than questions ("Online Soft Copy distribution process" matched the Knowledge Base tab), so the prompt asks for a question.
- The manual has an admin section for each service. Without "Admin: ", the soft copy follow-up matched how residents receive one, and the reply told the admin to open Submission Info to download it.

This adds a `gpt-4o-mini` call before the reply starts streaming.

## Court fees

The settings give the model the day and night rates, but it can't be trusted to apply them. Asked about 4:30 to 7:30 PM, it billed two hours for ₱150, when the reservation form charges three: 4:30 to 5:30 at the day rate, and 5:30 to 6:30 (which crosses 6 PM) and 6:30 to 7:30 at the night rate, for ₱250.

So both system prompts tell it to call `calculateCourtFee` for the cost of specific times and never work out a fee itself. The tool takes `startTime` and either `endTime` or `durationHours` (24-hour `"HH:MM"`, with `"24:00"` or `"00:00"` as a midnight end) and runs `getCourtHourCharges` and `calculateCourtFee` from `src/lib/court-reservations.ts` with the settings' rates, the same functions the form uses. It returns the hour-by-hour breakdown and the total, or an `error` for a range that ends after midnight or isn't a whole number of hours, which the form doesn't allow either.

The result also carries `buttonShown: false` and an `instruction`: if the user already said they want to reserve, call `openFormDialog` for the reservation form next. Otherwise, offer the form instead of mentioning a button. With only the system prompt saying so, about one reply in six still said "tap the button below" when there was none.

The "call `openFormDialog` next" part is needed because the model makes one call per step (see [Gotchas](#gotchas)). It used to open the form in the same step as the lookup. Once the lookup had to come first, the model followed an instruction that only said to offer the form, and never opened it.

## Court availability

Questions like "bakante ba ang court sa Sabado ng gabi?", "anong oras pa available bukas?" or "free ba sa Sabado 8 to 10 PM?" go to `checkCourtAvailability`. It reads the same data as the Court Availability dialog on the Court Reservation page: `getTakenTimeRanges` (approved reservations, the only ones that block a booking) and `getFreeRanges`.

- **Today's date.** The model has no clock. Without a date, it sent dates from its training years (`2023-10-28` for "sa Sabado") and told the user that day had passed. So the tool is built per request (`buildCheckCourtAvailabilityTool()`), and its description starts with today's date (`getPhilippineTime` in `src/lib/utils.ts`) and lists the coming week, one day of each name: `Monday 2026-10-26 (today), Tuesday 2026-10-27 (tomorrow), …`. The model looks up "bukas" or "Sabado" in that list instead of counting days. When the list was only in the `dates` field's description, the model ignored it. A date further out ("December 25") gets the year from today's date.
- **The hours asked about.** The model passes `dates` (up to 7, for "this weekend"), plus `startTime` and `endTime` when the user asks about specific times or a part of the day. The input description maps umaga, hapon and gabi to 06:00, 12:00 and 18:00. `execute` cuts the open times to those hours (`hoursChecked`) and lists only the bookings that overlap them. Given the whole day, the model answered "sa Sabado ng gabi?" with the whole day, and for "8 to 10 PM?" it listed a 7 - 9 PM booking without saying 8 - 10 PM wasn't free. Each day also has `allAvailable`, whether all of `hoursChecked` is open, and the `instruction` tells the model to answer yes or no from it first.
- Open times shorter than an hour are dropped, since reservations last whole hours. On today's date, times before now (rounded up to the half hour) are dropped too, and the `instruction` says so. A whole free day reads "The whole day", because the model repeated `formatTimeRange`'s "12:00 AM - 12:00 AM" as is. A past or invalid date gets an `error` instead.
- Like `calculateCourtFee`, the result has `buttonShown: false` and an `instruction`: if the user already said they want to reserve and `allAvailable` is true, call `openFormDialog` for the reservation form next, with only the date and times as prefill. Otherwise, offer the form.

### Prefilling the reservation date

The court reservation form's `prefill` has a `date` (`"YYYY-MM-DD"`), so "gusto ko mag-reserve sa Sabado 4 to 6 PM" opens the form with Saturday picked. `openFormDialog` has no calendar of its own. The model takes the date from the coming week in `checkCourtAvailability`'s description, which every request sends with the other tools, so removing that tool would bring back dates from the model's training years. With it, "bukas", "sa Sabado", "December 25" and a follow-up to an availability answer ("sige, i-reserve ko 9 to 11 PM") all got the right date.

- `parseDialogPrefill` keeps a date only if it's real and from today on, since the date picker can't pick a past day but a link opened later would fill one in.
- The `date` and `purpose` fields' descriptions say to fill them in only when the user said which day or what it's for, and the `date` one adds "don't assume today". Without them, the model filled in today for "pa-reserve ako 3 to 5 PM", and a purpose like "Event" or "Court Reservation" for most reservations.
- After `calculateCourtFee`, it still usually fills in today when no day was given ("magkano ang 8 to 11 AM? gusto ko mag-reserve"). Telling it not to in that tool's `instruction` made it stop opening the form, and an example in the system prompt only worked for that exact wording. The form shows the date first, so the user sees it before submitting.

## Local businesses

Questions like "Ano yung pinakamalapit na karinderya sa akin?", "is there a vulcanizing shop?" or "what's Aling Nena's number?" go to `findBusinesses`. Before it existed, the model had no business data and refused them as out of scope.

The tool takes no input. It returns every business with status `Verified`, up to 50, with the category, a description cut to 200 characters, the hours (`formatOperatingHours`), `openNow`, the contact number, the address and, once the user has shared their location, a straight-line distance (`distanceInMeters` in `src/lib/geolocation.ts`).

`openNow` answers "bukas pa ba sila?". It comes from the business's hours and the current Philippine time (`getPhilippineTime`). The server runs in UTC, so this adds 8 hours (the Philippines has no daylight saving time). Like the court fee, it's worked out in code rather than by the model, which has no clock and compares times unreliably. Hours that close at or before they open run past midnight (6:00 PM – 2:00 AM), and the same opening and closing time counts as open all day. The list is sorted by name, or nearest first when there's a location. The model picks the businesses that fit the question itself. A keyword search couldn't match "karinderya" to a business described as "lutong-bahay na ulam", and with an optional category filter the model narrowed "any business or store" down to Others and reported nothing. Like `calculateCourtFee`, the result has `buttonShown: false` and an `instruction`: use only the listed businesses, leave out the ones that don't fit (it padded a list of karinderyas with a motor shop that "has food options nearby", even with a note that it isn't a karinderya), use `openNow` for whether one is open, give distances as approximate, and without a location, never call a business the nearest.

### Business buttons

After answering from `findBusinesses`, the model calls `openBusinessDetails` with the ids of the businesses its answer is about. Both the system prompt and the `findBusinesses` result tell it to. It also calls the tool when the user asks for a business's full details, photos or map location ("patingin ako ng full details"). Before this tool existed, that request got a "Go to Community Hub" button, which left the user to find the business themselves.

- `findBusinesses` returns each business's `id`. The model passes up to 3 ids (more are ignored), from this request's lookup or an earlier one in the conversation.
- `execute` keeps only ids of verified businesses and returns a "View \<name>" button for each, linking to `/portal/community-hub?business=<id>`. A made-up id gets no button, and the label uses the name from the database.
- The model only sees the result's `instruction`: which businesses have a button.
- `?business=<id>` is read by `LinkedBusinessDialog` with `useViewParam(BUSINESS_SEARCH_PARAM)`. It's separate from `?view=<id>`, which opens the Submission Info dialog (permit, review status) that only the owner and admins may see. `getVerifiedBusinessById` returns the same businesses the Community Hub list shows: verified ones and the user's own (admins get any).

### The user's location

"Nearest" needs the user's location, which only the browser has. `getUserLocation` is a client-side tool:

1. The system prompt tells the model to call `getUserLocation` on its own when the user asks what's nearest and hasn't shared their location in the conversation yet.
2. The tool has no `execute`, so the stream ends at the call.
3. The widget's `onToolCall` runs `getCurrentLocation()` (the browser may ask for permission) and answers with `addToolOutput`: the coordinates, or `state: "output-error"` if it fails or takes longer than 30 seconds (`LOCATION_TIMEOUT_MS`). Some browsers never answer when the permission prompt is closed without a choice, which would otherwise leave the question with no reply. It doesn't await this. `onToolCall` holds up the stream, and `addToolOutput` waits for the stream, so awaiting it would deadlock.
4. `sendAutomaticallyWhen: hasAnsweredLocationRequest` sends the chat back once the last step's `getUserLocation` call has an answer. The reply continues the same assistant message, and the new request gets its own eight steps.
5. The route reads the latest coordinates from the history with `getSharedUserLocation` and builds `findBusinesses` with them. The model never handles the coordinates. `toModelOutput` replaces them with "The user shared their location", so they aren't sent to OpenAI and the model can't make some up. Later questions in the same conversation reuse the location without asking again.
6. If the user denies permission, the model still calls `findBusinesses` and gives addresses, saying it couldn't get their location.

If the user sends another message while the permission prompt is still open, the unanswered call stays in the history. `convertToModelMessages(..., { ignoreIncompleteToolCalls: true })` drops it, because OpenAI rejects a tool call with no result.

## The user's submissions

A resident's questions like "ano na status ng clearance ko?", "bakit na-reject yung reservation ko?" or "na-verify na ba yung business ko?" go to `getMySubmissions`, then `openSubmissionDetails` (both in `tools/resident/`). It's the same pattern as `findBusinesses` and `openBusinessDetails`. Admins get their own tools for this (see [Admins' own submissions](#admins-own-submissions)).

- `getMySubmissions` takes no input. The route passes the session's `userId` to the builder, so the model can't ask about anyone else's submissions. It queries the tables directly rather than through the `getMy*` actions, which page their results and fetch names from Clerk. It returns the 10 most recent of each kind (`MAX_PER_KIND`) with the reference number (`DR-12`, `CP-3`, `CR-7`, `CH-5`), status, the barangay's reply (`pickupMessage`, `rejectionReason`, `resolutionMessage`, `dismissalReason`, cut to 300 characters) and the dates. The server runs in UTC, so dates are formatted with `timeZone: "Asia/Manila"`. How each kind is shown to the model is in `tools/submissions.ts`, which `getHandledSubmissions` uses too.
- Complaints the user follows come back as a separate `followedComplaints` list. With a `following: true` flag on each complaint instead, the model answered "may update na ba sa complaint ko?" with only a followed complaint and called it "complaint mo".
- The tool description says it has only the user's own submissions, not other residents' or the barangay's totals.
- The result has `counts`, how many of each kind the user has in all, from separate `count()` queries. Without it, "ilan lahat ng complaints ko?" got the number listed. When a kind has more than the 10 listed, the `instruction` tells the model to say, whenever its answer lists or counts that kind, how many the user has, that it can only show their 10 most recent, and which page lists them all. That's written as reported speech filled in by code (`cutOffNotes`). As a quoted sentence, the model copied it in English into Filipino replies.
- `openSubmissionDetails` takes up to 3 reference numbers. It parses the prefix (`parseReferenceNumber`), checks each one belongs to the user (complaints they follow count), and returns a button labeled from the database that links to `getSubmissionDialogHref(page, id)` (`<page>?view=<id>`), which opens the Submission Info dialog through `useViewParam`. A notification links to the same place. Like `openBusinessDetails`, the model only sees the `instruction`.
- An answer that lists more than 3 submissions ("show me all my requests") gets no buttons: both the system prompt and the `getMySubmissions` instruction tell the model not to call `openSubmissionDetails` then, and to say each one opens from its page. With buttons for the first 3, the model listed only those 3, and when told to keep listing the rest, it dropped the cut-off note, because the button result's note about the rest came last. If the model passes more than 3 anyway, the result names the ones that got no button and tells the model to still list them.
- Both the system prompt and the result's `instruction` say to call `openSubmissionDetails` for businesses too. The model didn't for "na-verify na ba yung business ko?" until the prompt had that question as an example, and once it said "tap the button below" without calling it.

## Admins' own submissions

Admins don't request documents or file complaints, so `getMySubmissions` doesn't fit them: "what is the status of my complaints?" found none and brought up the admin's business instead. Admins get `getHandledSubmissions` (`tools/admin/get-handled-submissions.ts`) instead, then their own `openSubmissionDetails`.

- An admin's requests and complaints are the residents' ones they're handling: the ones whose status they last changed (`handlerId`), which each admin page's "Only show … I'm handling" filter shows. Their court reservations and businesses are the ones they submitted themselves, like a resident's. With the residents' ones they handle listed too, even in separate lists, "what's the status of my business?" sometimes got a business the admin had only verified.
- The result has the same shape as `getMySubmissions` (10 per kind, `counts`, cut-off notes), without followed complaints. The `instruction` tells the model to say the admin is handling the requests and complaints ("You're handling 1 complaint"), never that they have or filed them.
- It doesn't have pending submissions no admin has acted on yet, ones other admins are handling, or residents' court reservations and businesses. Its description and the first line of its `instruction` send questions about those, and about the barangay's totals, to `getSubmissionOverview`. With that line further down, "how many complaints are still pending?" got the one complaint the admin was handling, which was resolved.
- Asking to see them ("I wanna see the document requests I'm handling") goes here too, not to `navigateToPage`. While `navigateToPage`'s example in `ADMIN_PROMPT` was "I wanna view my complaints", that request got only a button to the page.
- An answer that lists or names 1 to 3 submissions, even when they're all the admin has, gets `openSubmissionDetails`. When the rule said "about 1 to 3 specific submissions", a list of all 3 the admin was handling got no buttons.
- The admins' `openSubmissionDetails` (`tools/admin/open-submission-details.ts`) opens any resident's submission, since each admin page's `?view=<id>` loads it by id, with its details and the actions to review it. It still checks the submission exists and labels the button from the database. So "pakita yung DR-12" gets a button right away, and a reference number the user gives that isn't in `getHandledSubmissions`' result goes to it too.

## The barangay's submissions (admins)

Admin questions about the barangay's workload, like "ilan ang pending na document requests?", "ilang high-priority complaints ang open?" or "ano ang kailangan kong asikasuhin ngayon?", go to `getSubmissionOverview` (`tools/admin/get-submission-overview.ts`), which only admins have. `getHandledSubmissions` has only the submissions the admin is handling, so before this tool, these questions got a button to the page instead of an answer. `getHandledSubmissions`'s description and `instruction` now send them here.

- It takes no input. `counts` has how many document requests, complaints, court reservations and businesses there are in each status, with each kind's `total`, from one `GROUP BY` query per table. That covers what `getAdminPendingCounts` and the `get*Stats` actions return (the Pending count and the total), plus the other statuses.
- `openComplaints` counts the complaints that are Pending or In Progress, in all and per priority. The model misread these. It answered 4 High and 1 Urgent as "4, at 1 sa mga ito ay urgent", even when told the High count doesn't include Urgent, and still did about one time in four with a High + Urgent total added to the result. Asked "ilan ang open na complaints?", it gave the total of all complaints. So, like `getHandledSubmissions`' cut-off notes, the `instruction` has those answers as reported speech filled in by code: how many complaints are open, and how many are high priority, counting Urgent, with how many are High and how many Urgent.
- `needsAttention` comes from `getNeedsAttentionQueue`, the admin home page's Needs Attention list (up to 8, urgent complaints first, then the ones that have waited longest), so the answer matches that card. Each item has its reference number (from the queue item's `recordId`), kind, title, and a complaint's priority or the others' status. The residents' names are left out, as in `getHandledSubmissions`.
- Asked what needs attention, the model answered with the counts, and put the open complaints' priorities on the Pending count. The `instruction` now says to list `needsAttention` in order for that question, that Pending means the Pending status only, and that `openComplaints` covers both open statuses.
- An answer that names 1 to 3 submissions gets `openSubmissionDetails` ("pakita yung urgent na complaint" gets "View CP-19: …"). A count of one kind gets `navigateToPage` for that kind's page. The model does this every time for document requests and court reservations, but only about half the time for complaints. Either way, the reply names the page and doesn't mention a button it didn't get. An answer about several kinds, like the Needs Attention list, gets neither. With "more than 3 submissions" as the rule for no button, a count of 5 complaints got none, so the rule goes by the submissions the reply names.

## News and announcements

Questions like "may brownout o water interruption ba ngayong linggo?", "kailan ang susunod na event?" or "any emergency announcements?" go to `findNews`, then `openNewsPosts`. It's the same pattern as `findBusinesses` and `openBusinessDetails`.

- `findNews` takes no input and returns the 20 latest posts in the News & Announcements page's order (pinned first, then newest), each with its id, title, category, `pinned`, the date it was posted and the first 500 characters of its content. Like `findBusinesses`, it leaves the matching to the model, so a post titled "Scheduled Power Interruption" still answers "may brownout ba?".
- The result has `today` (e.g. "Monday, October 26, 2026", in Philippine time) for "ngayong linggo" and "susunod". Its `instruction` says that `posted` is when the post went up, not when the event or interruption happens, so the model takes those dates from the content, or says the post doesn't give one. Content that was cut short ends with "…", and the `instruction` says only that content may have more in the full post. When it said every excerpt was cut short, the model told users to "see the full post" for details a short post didn't have.
- The `instruction` also says to go by each post's `category` for emergencies, events and announcements (the model once called the "Oplan Undas" Announcement an emergency), to leave out posts that don't fit (it listed unrelated posts after saying there were no emergency announcements), and not to mention a button unless it calls `openNewsPosts` (`findTransparencyProjects` says the same for `openTransparencyProjects`, after "how much is the total budget?" got "tap the button below" with no button).
- Dates inside a post's text can't be checked in code the way budgets are, so the model sometimes gets them wrong. Asked for this week's announcements, it included a post whose text gave a date that had already passed.
- `openNewsPosts` takes up to 3 ids, keeps the ones that exist and returns a "View \<title>" button for each, linking to `/portal/news/<id>`. Like `openBusinessDetails`, the model only sees the `instruction`.
- The button goes to the portal's post page rather than the public `/news/<id>` that share links use. Leaving `/portal` would unmount the portal layout, and with it the widget and the conversation. Signed-in users who open a share link are redirected to the portal's page too (`src/proxy.ts`).

## Transparency projects

Questions like "ano ang mga project ng barangay ngayon?", "magkano ang budget ng road project?" or "magkano lahat ng ginastos sa infrastructure?" go to `findTransparencyProjects`, then `openTransparencyProjects`.

- `findTransparencyProjects` takes no input and returns every project (up to 50 listed, newest first) with its id, title, category, budget, a description cut to 200 characters, the address and the date it was posted.
- Like `calculateCourtFee`, it does the arithmetic: `budgetTotals` has the total budget of all projects and of each category that has projects, added up in code over every project, including any past the 50 listed. Projects with no budget listed aren't counted, and `projectsWithNoBudget` says how many there are. The system prompt and the `instruction` tell the model never to add up budgets itself. For a group that isn't all projects or a whole category (e.g. two of the Infrastructure projects), it gives each one's budget without a total.
- The table has a budget, not what was actually spent, so the `instruction` tells the model to call the amounts budgets even when asked "magkano ang ginastos". Projects have no status either, so it's told not to call one ongoing or finished unless the description says so.
- `openTransparencyProjects` works like `openNewsPosts`, with buttons to `/portal/transparency/<id>`.

## Streaming and re-renders

Each streamed chunk updates `messages`, which re-renders `ChatPanel` and re-runs `messages.map` over **every** message, not only the one being streamed.

- A message counts as "streaming" when it's the last one and `status` is `submitted` or `streaming`. Its buttons are held back until `status` becomes `ready`.
- `status` moves one way per request (`submitted` → `streaming` → `ready`). All server steps are part of one stream, so it doesn't drop back to `ready` between the tool call and the reply.
- A `console.log(isStreaming)` inside the map prints one line per message per render (`false` for older messages, `true` for the last one). That's not a value flipping.

## Adding a form the assistant can open

1. Register it in `PORTAL_DIALOG_TARGETS` (`src/lib/ai-assistant/portal-dialogs.ts`) with a `label`, `page`, `description`, `audience` and `prefill`. Only "create" forms belong here; dialogs that act on an existing record (edit, delete, reject) need a specific row. Set `audience` to the role(s) whose view of the page renders the form. It decides which role's `openFormDialog` lists the form, and the other role's names it as one they can't use (see [Targets the user's role can't use](#targets-the-users-role-cant-use)). Put the text, choice and number fields the user could state in a sentence in `prefill`, not uploads, map locations or dates. A date works only where the model knows today's date, like the court reservation's (see [Prefilling the reservation date](#prefilling-the-reservation-date)).
2. In the component that owns the form, replace its `useState(false)` with `useDialogParam("<id>")`. Add `&& hasResidentProfile` to `open` if the form needs a resident profile.
3. In the component that renders the form, pass `useDialogPrefill("<id>")` into its `defaultValues` (cast to `Partial<...FormValues>`).

Both roles' input schemas, their descriptions for the model and the chat button all come from the registry, so there's nothing else to change. If the admin forms change, check the admins' `openFormDialog` description, which names the Document Request and Complaint pages for residents' forms.

## Adding a tool

1. **Server:** add a file to `src/lib/ai-assistant/tools/` exporting the tool, or a `buildXTool(context)` if it needs the user, the settings or their location. Put it in `resident/` or `admin/` if only one role gets it or it works differently for each (then each role gets its own version), otherwise in the page's folder if it's about one page. Add a field to `AssistantToolContext` if it needs something else about the request. Add it to `buildResidentTools` (`tools/resident/index.ts`), `buildAdminTools` (`tools/admin/index.ts`) or both, and mention when to use it in that role's prompt (`RESIDENT_PROMPT`, `ADMIN_PROMPT` in `system-prompt.ts`). If it's a source of barangay facts, also add it to the prompt's list of them and to its note for when no knowledge base document has been uploaded. Give it an `execute` so the call finishes on the server. That's all you need for a lookup tool. Give it `buttonShown: false` and an `instruction` saying which button tool to call next, if any.
   A tool only the browser can answer (like `getUserLocation`) has no `execute`. Answer it in the widget's `onToolCall` and resend the chat with `sendAutomaticallyWhen` (see [The user's location](#the-users-location)).
2. **Buttons (only if the result should show something in the chat):** build the tool with `buttonTool` instead of `tool`, and return `{ buttons, instruction }` (see [Button tools](#button-tools)). Build the buttons from what `execute` checked (the database, whether the record is the user's), not straight from the model's arguments, so a made-up id or someone else's record gets none. The chat panel shows them with no change. A new kind of target needs a `kind` in `AssistantButtonKind` and an icon in the chat panel's `BUTTON_ICONS`, which TypeScript asks for.

## Gotchas

- `getUserLocation`'s name must be the same string in `buildResidentTools`, `buildAdminTools`, the widget (`onToolCall`, `hasAnsweredLocationRequest`) and `getSharedUserLocation`. If it's not, the location request is never answered. The chat panel doesn't go by tool names: it shows the `buttons` of any tool's result.
- Every tool the browser doesn't answer needs an `execute`. A call without a result stops the stream with no reply.
- Parallel tool calls are off (`providerOptions: { openai: { parallelToolCalls: false } }`), so the model makes one call per step. Once `findBusinesses` and `getUserLocation` were added, it sometimes added stray calls next to the one it needed, e.g. `calculateCourtFee` or `getUserLocation` next to the clearance form, in roughly one request in six. Tests showed the tools caused this, not the prompt. A flow that needs two tools (a lookup, then a form) takes two steps instead.
- `temperature` is 0.2. Replies repeat exact details from tools and settings, and at OpenAI's default of 1 the model now and then miscopied one (a plus-code address `83C7+WRC` came out as `81C7+WRC`). A low temperature also means a bad habit shows up nearly every time instead of now and then, so check a prompt or tool change over several runs of the same question.
- `stopWhen` defaults to one step. Without `stepCountIs(...)`, the stream ends at the tool call and the reply has no text. Each tool call takes a step (parallel calls are off), and so does the reply. With 3 steps, "I want to request a certificate of indigency, file a complaint, reserve a court, and open Aling Nena's karinderya business info" got three form buttons, no business button and no reply. 8 covers that (3 forms, `findBusinesses`, `openBusinessDetails`, the reply) with room to spare. `maxDuration` is 60 seconds because each step is another model call.
- Don't use `z.record()` in a tool's input schema. The AI SDK sends every object to OpenAI with `additionalProperties: false`, so a record reaches the model as "an object with no keys". That's why `prefill` is a list of `{ field, value }` pairs.
- Keep tool inputs lenient. If the model's arguments fail the input schema (e.g. a number where only a string is allowed), it retries in its next step, which can use up the last one and leave the reply with no text. That's why a prefill `value` accepts a string or a number, and the real checks happen in `parseDialogPrefill`.
- Authorization belongs on the server. The route picks the tools from the session's role, so an admin-only tool or target goes only in `buildAdminTools` or the admins' version of the tool. When a role's tool leaves a target out, name it in the description with what to tell the user, or the model substitutes the closest one (see [Targets the user's role can't use](#targets-the-users-role-cant-use)). Opening a form is only a UI convenience; the form's server action still checks permissions.
- `useDialogParam` uses `useSearchParams`, which needs a Suspense boundary on statically prerendered pages. `src/app/portal/layout.tsx` wraps the page content in `<Suspense>` for this. A form hosted outside `/portal` needs its own boundary unless that page is dynamic.
- Components may import only `portal-navigation.ts`, `portal-dialogs.ts` and `knowledge-base.ts` from `src/lib/ai-assistant/`. `knowledge-base-search.ts` imports the DB, and `tools/` and `system-prompt.ts` are for the chat route only (an `import type` is fine). There's no `index.ts` for the folder, so nothing pulls in the server files by accident.
