# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the current Barangay Settings, the officials list and the uploaded PDF (RAG), and can call **tools**. It has six tools. Three of them put buttons under the assistant's reply, two look up something the model answers from, and one runs in the browser:

- `navigateToPage`: a "Go to X" button that takes the user to a portal page.
- `openFormDialog`: a button like "File a Complaint" that takes the user to the form's page and opens the form there, with any details the user already gave in the chat filled in.
- `openBusinessDetails`: a "View <business>" button for each of up to 3 businesses, which opens that business's details on the Community Hub (see [Business buttons](#business-buttons)).
- `calculateCourtFee`: the fee for reserving the court at given times, billed the same way as the reservation form. No button (see [Court fees](#court-fees)).
- `findBusinesses`: the businesses verified in the Community Hub, nearest first once the user has shared their location. No button (see [Local businesses](#local-businesses)).
- `getUserLocation`: the user's location from their device, for "what's the nearest karinderya?". It has no server `execute`, because the chat widget answers it.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state, and answers `getUserLocation` calls (`onToolCall`, `sendAutomaticallyWhen`). |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone. Also renders the buttons for tool results: form buttons (`getDialogTargets`), business buttons (`getBusinessTargets`) and navigation buttons (`getNavigationTargets`). |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. Sets `stopWhen: stepCountIs(3)` so the model can look something up, show a button and still reply, with one tool call per step and `temperature: 0.2` (see [Gotchas](#gotchas)). |
| `src/lib/ai-assistant/tools/` | One file per tool (`navigate-to-page.ts`, `open-form-dialog.ts`, `calculate-court-fee.ts`, `find-businesses.ts`, `open-business-details.ts`, `get-user-location.ts`), each exporting a `buildXTool` (or, for the tools with no per-request settings, the tool itself). `get-user-location.ts` also has `getSharedUserLocation`, which reads the location out of the chat history. `index.ts` has `buildAssistantTools`, which the route calls. `audience.ts` has `AUDIENCE_NOTES`, the "(residents only)" / "(admins only)" labels both button tools use. |
| `src/lib/ai-assistant/system-prompt.ts` | `SYSTEM_PROMPT`, `formatBarangaySettings`, `formatOfficials`, and `buildSystemPrompt`, which adds the user's role, the current barangay settings, the barangay and SK officials and the excerpts. |
| `src/lib/ai-assistant/knowledge-base-search.ts` | `getRelevantContext` (embeds the question and finds matching PDF excerpts with pgvector) and `getLastUserText`. Imports the DB. |
| `src/lib/ai-assistant/knowledge-base.ts` | The embedding model and dimensions, the upload size limit, and `chunkText`. Shared by the search above, the upload action (`src/actions/knowledge-base.ts`) and the DB schema. |
| `src/lib/ai-assistant/portal-navigation.ts` | Pages the assistant can navigate to, each with its `audience` (`resident`, `admin` or `all`). Also exports `isPortalNavigationTargetAvailable`. Used by both the server tool and the chat panel's buttons. |
| `src/lib/ai-assistant/portal-dialogs.ts` | Forms the assistant can open, each with its `page`, `audience` (`resident`, `admin` or `all`) and `prefill` schema (the fields the assistant may fill in). Also exports `getPortalDialogHref` (the page plus `?dialog=<id>`, and `&prefill=<json>` when there are values), `parseDialogPrefill` and `isPortalDialogAvailable`. Used by the server tool, the chat panel and the components that host the forms. |
| `src/components/community-hub/dialogs/linked-business-dialog.tsx` | Opens a business's details (`ViewBusinessDialog`, the dialog its card opens) when the Community Hub's URL has `?business=<id>`. Rendered once on the Community Hub page for both roles, and fetches with `getVerifiedBusinessById`. |
| `src/hooks/use-dialog-param.ts` | `useDialogParam(id)`: a `useState`-like `[open, setOpen]` that stores a form's open state in the URL as `?dialog=<id>`. `useDialogPrefill(id)`: the `?prefill=` values for that form, to spread into its `defaultValues`. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext` (finds matching PDF excerpts), `getBarangaySettings` and `getOfficials` (once per section) in parallel, then `buildAssistantTools(isAdmin, settings, getSharedUserLocation(messages))` and `buildSystemPrompt(context, settings, officials, isAdmin)`, and streams `gpt-4o-mini`.
3. If the model calls a tool, its `execute` runs on the server right away. No tool changes anything. The button tools' `execute` only echoes the target so the call is marked finished, or returns `buttonShown: false` if the user's role can't use it (see [below](#targets-the-users-role-cant-use)). `calculateCourtFee` returns the fee and `findBusinesses` the businesses. `getUserLocation` has no `execute`, so it ends the stream and the browser takes over (see [Local businesses](#local-businesses)).
4. Because of `stopWhen: stepCountIs(3)`, the model gets more steps in the same stream and writes a short reply pointing at the button, or, for a `buttonShown: false` result, saying why the user can't use that form or page. The third step covers a lookup followed by a button tool, e.g. `calculateCourtFee` then `openFormDialog` for "how much is 8 to 11 AM? I'd like to reserve".
5. `ChatPanel` finds the finished `tool-openFormDialog` / `tool-openBusinessDetails` / `tool-navigateToPage` parts with `buttonShown: true` on the message and renders the buttons, but only once the response has finished streaming.
6. Clicking a button navigates with `next/link` and closes the widget (`onNavigate`).

## How a form gets opened

The form's open state lives in the URL, so the chat doesn't have to talk to the form directly.

1. The form button links to `getPortalDialogHref(id)`, e.g. `/portal/complaint?dialog=report-complaint`.
2. The component that owns that form uses `useDialogParam("report-complaint")` instead of `useState(false)`. Its `open` is true whenever the URL's `dialog` param equals its id, so arriving at that URL opens the form.
3. Closing the form calls `setOpen(false)`, which removes the param. `setOpen` uses `window.history.replaceState` (Next.js keeps `useSearchParams` in sync with it), so opening and closing don't trigger a server round trip.

The page's own buttons use the same `setOpen`, so a form opened any way shows up in the URL and survives a refresh.

Forms that need a resident profile also check it on `open`, e.g. `open={isReportDialogOpen && hasResidentProfile}`. Without that, a resident with no profile could open the form just by visiting the link.

## Prefilling a form

The assistant doesn't collect form details in the chat. The system prompt tells it to call `openFormDialog` as soon as it knows which form the user needs, and to pass anything the user already said (a business name, what a complaint is about, a purpose) as `prefill`. It never asks for fields it can't fill, like uploads, map locations or dates.

1. Each `PORTAL_DIALOG_TARGETS` entry has a `prefill` zod object listing the fields the assistant may fill. The tool description lists them per form (`describePrefillFields`), including the options of enum fields.
2. The model sends `prefill` as a list of `{ field, value }` pairs. For a form the user's role can use, `execute` drops empty values, turns the list into an object and returns `getPortalDialogHref(dialog, values)`, e.g. `/portal/community-hub?dialog=submit-business&prefill={"name":"Bakery",...}`. The chat button links to that `href`.
3. The dialog component calls `useDialogPrefill(id)` and passes the result as the form's `defaultValues`. That runs `parseDialogPrefill`, which checks each field against the `prefill` schema and drops anything else (a made-up category, a broken link), and `z.coerce.number()` turns `"3"` into `3`.
4. `setOpen` removes `prefill` along with `dialog`, so reopening the form from the page's own button starts blank. The form reads `defaultValues` only when it mounts, which happens each time the dialog opens.

Free-text fields in a `prefill` schema are plain `z.string()` rather than the form's own rules (like `min(10)`). A short description still gets filled in, and the form flags it on submit.

## navigateToPage vs openFormDialog

Both tools can point at the same page, so they're kept from overlapping in two places:

- **System prompt:** use `openFormDialog` when the request matches a specific form ("I want to file a complaint"). Use `navigateToPage` for browsing ("show me my complaints") or a request too broad to pick a form ("I want a document"). Never call both for one request.
- **Chat panel:** if the model calls both anyway, `getNavigationTargets` drops any page that a form button in the same message already goes to. Business buttons count as going to the Community Hub.

## Targets the user's role can't use

Every page and form has an `audience`. For example, admins can't use the document request forms or the complaint form, because the admin view doesn't have them, and residents can't post news or open User Management.

Both tools still list **every** target. The restricted ones are marked "(residents only)" or "(admins only)" (`AUDIENCE_NOTES`), and forms the user can't use are listed without their prefill fields. The system prompt states the user's role (`The user is signed in as a barangay admin.`) and tells the model to open only a form that matches the request, never the closest one.

Leaving restricted targets out of the tools doesn't work. The model handles a request for a missing form by picking the closest one it has: an admin asking for a Certificate of Indigency got a "Submit a Business" button, and a complaint got the court reservation form. Spelling out in the system prompt what each role can't do wasn't reliable either. `gpt-4o-mini` overgeneralized it and told an admin they couldn't reserve the court.

So the role check happens in `execute` (`isPortalDialogAvailable`, `isPortalNavigationTargetAvailable`). For a target the user can't use, it returns `buttonShown: false` and an `instruction` telling the model what to say and not to call another tool (it may already be the last step, so another tool call could leave the reply without text):

| User | Asks for | Told |
|---|---|---|
| Admin | A residents-only form | Residents submit it from their own accounts, so admin accounts can't. They can review the submissions on the form's page (e.g. Document Request). |
| Admin | A residents-only page (Notifications) | Admin accounts don't have that page. |
| Resident | An admins-only form or page | Only barangay admins can do that. |

The chat panel shows no button for a `buttonShown: false` result. The model sometimes declines straight away without calling the tool, which is fine, since it still doesn't open a different form.

## Staying on topic

Only the system prompt keeps the assistant to barangay topics; there's no separate filter. `SYSTEM_PROMPT` lists what's in scope (barangay services and information, the Community Hub's local businesses, using the portal, how barangays work in general, and concerns residents bring to the barangay). It tells the model to refuse anything else in a sentence or two and to answer only the barangay part of a mixed message. Barangay-specific facts come only from the barangay settings, the officials lists, the knowledge base excerpts and `findBusinesses`. Retrieval uses a low similarity cutoff (0.2), so excerpts show up even for unrelated questions, and the prompt tells the model to ignore excerpts that don't fit. To widen or narrow the scope, edit that list. If you add a new kind of page or form, add it there too, or the model may treat questions about it as out of scope.

## Barangay settings and officials in the prompt

Every system prompt includes the live `barangay_settings` row, formatted by `formatBarangaySettings`: the hotlines, email, address, GCash number, clearance fees, court day and night rates, and the goal, mission and vision. The prompt tells the model to use these for anything they cover, even when a PDF excerpt says something different, because admins keep the settings current and the PDF can go out of date.

The barangay and SK officials (the `officials` table, edited in Barangay Settings and shown on About Us) are included the same way. The route fetches both sections with `getOfficials`, and `formatOfficials` lists each official as `- Name: Position` in About Us order, or "None listed yet" for an empty section. The prompt treats these lists like the settings, so they also take priority over a PDF that names different officials. Before the lists were in the prompt, the model had no officials data and answered "who are the barangay officials?" with a "Go to About Us" button. The question is now an example in the prompt's "Questions" rule, which tells the model to answer directly instead of pointing to a page.

They're in the prompt rather than behind a tool because they're short, and a lookup tool would add a round trip and use up a step on almost every question about them.

If you add a field to Barangay Settings that residents might ask about, add a line for it in `formatBarangaySettings` and name it in the `SYSTEM_PROMPT` sentence that lists what the settings cover.

## Court fees

The settings give the model the day and night rates, but it can't be trusted to apply them. Asked about 4:30 to 7:30 PM, it billed two hours for ₱150, when the reservation form charges three: 4:30 to 5:30 at the day rate, and 5:30 to 6:30 (which crosses 6 PM) and 6:30 to 7:30 at the night rate, for ₱250.

So `SYSTEM_PROMPT` tells it to call `calculateCourtFee` for the cost of specific times and never work out a fee itself. The tool takes `startTime` and either `endTime` or `durationHours` (24-hour `"HH:MM"`, with `"24:00"` or `"00:00"` as a midnight end) and runs `getCourtHourCharges` and `calculateCourtFee` from `src/lib/court-reservations.ts` with the settings' rates, the same functions the form uses. It returns the hour-by-hour breakdown and the total, or an `error` for a range that ends after midnight or isn't a whole number of hours, which the form doesn't allow either.

The result also carries `buttonShown: false` and an `instruction`: if the user already said they want to reserve, call `openFormDialog` for the reservation form next. Otherwise, offer the form instead of mentioning a button. With only the system prompt saying so, about one reply in six still said "tap the button below" when there was none. The chat panel ignores `tool-calculateCourtFee` parts.

The "call `openFormDialog` next" part is needed because the model makes one call per step (see [Gotchas](#gotchas)). It used to open the form in the same step as the lookup. Once the lookup had to come first, the model followed an instruction that only said to offer the form, and never opened it.

## Local businesses

Questions like "Ano yung pinakamalapit na karinderya sa akin?", "is there a vulcanizing shop?" or "what's Aling Nena's number?" go to `findBusinesses`. Before it existed, the model had no business data and refused them as out of scope.

The tool takes no input. It returns every business with status `Verified`, up to 50, with the category, a description cut to 200 characters, the hours (`formatOperatingHours`), `openNow`, the contact number, the address and, once the user has shared their location, a straight-line distance (`distanceInMeters` in `src/lib/geolocation.ts`).

`openNow` answers "bukas pa ba sila?". It comes from the business's hours and the current Philippine time (`getPhilippineTime`). The server runs in UTC, so this adds 8 hours (the Philippines has no daylight saving time). Like the court fee, it's worked out in code rather than by the model, which has no clock and compares times unreliably. Hours that close at or before they open run past midnight (6:00 PM – 2:00 AM), and the same opening and closing time counts as open all day. The list is sorted by name, or nearest first when there's a location. The model picks the businesses that fit the question itself. A keyword search couldn't match "karinderya" to a business described as "lutong-bahay na ulam", and with an optional category filter the model narrowed "any business or store" down to Others and reported nothing. Like `calculateCourtFee`, the result has `buttonShown: false` and an `instruction`: use only the listed businesses, leave out the ones that don't fit (it padded a list of karinderyas with a motor shop that "has food options nearby", even with a note that it isn't a karinderya), use `openNow` for whether one is open, give distances as approximate, and without a location, never call a business the nearest.

### Business buttons

After answering from `findBusinesses`, the model calls `openBusinessDetails` with the ids of the businesses its answer is about. Both the system prompt and the `findBusinesses` result tell it to. It also calls the tool when the user asks for a business's full details, photos or map location ("patingin ako ng full details"). Before this tool existed, that request got a "Go to Community Hub" button, which left the user to find the business themselves.

- `findBusinesses` returns each business's `id`. The model passes up to 3 ids (more are ignored), from this request's lookup or an earlier one in the conversation.
- `execute` keeps only ids of verified businesses and returns each one's `id`, `name` and `href` (`/portal/community-hub?business=<id>`) for the chat panel. A made-up id gets no button, and the label uses the name from the database.
- The model only sees the result's `instruction` (`toModelOutput`): which businesses have a button. With the hrefs visible, it wrote fake links like `[View Details](#)` under its reply.
- `?business=<id>` is read by `LinkedBusinessDialog` with `useViewParam(BUSINESS_SEARCH_PARAM)`. It's separate from `?view=<id>`, which opens the Submission Info dialog (permit, review status) that only the owner and admins may see. `getVerifiedBusinessById` returns the same businesses the Community Hub list shows: verified ones and the user's own (admins get any).

### The user's location

"Nearest" needs the user's location, which only the browser has. `getUserLocation` is a client-side tool:

1. The system prompt tells the model to call `getUserLocation` on its own when the user asks what's nearest and hasn't shared their location in the conversation yet.
2. The tool has no `execute`, so the stream ends at the call.
3. The widget's `onToolCall` runs `getCurrentLocation()` (the browser may ask for permission) and answers with `addToolOutput`: the coordinates, or `state: "output-error"` if it fails or takes longer than 30 seconds (`LOCATION_TIMEOUT_MS`). Some browsers never answer when the permission prompt is closed without a choice, which would otherwise leave the question with no reply. It doesn't await this. `onToolCall` holds up the stream, and `addToolOutput` waits for the stream, so awaiting it would deadlock.
4. `sendAutomaticallyWhen: hasAnsweredLocationRequest` sends the chat back once the last step's `getUserLocation` call has an answer. The reply continues the same assistant message, and the new request gets its own three steps.
5. The route reads the latest coordinates from the history with `getSharedUserLocation` and builds `findBusinesses` with them. The model never handles the coordinates. `toModelOutput` replaces them with "The user shared their location", so they aren't sent to OpenAI and the model can't make some up. Later questions in the same conversation reuse the location without asking again.
6. If the user denies permission, the model still calls `findBusinesses` and gives addresses, saying it couldn't get their location.

If the user sends another message while the permission prompt is still open, the unanswered call stays in the history. `convertToModelMessages(..., { ignoreIncompleteToolCalls: true })` drops it, because OpenAI rejects a tool call with no result.

## Streaming and re-renders

Each streamed chunk updates `messages`, which re-renders `ChatPanel` and re-runs `messages.map` over **every** message, not only the one being streamed.

- A message counts as "streaming" when it's the last one and `status` is `submitted` or `streaming`. Its buttons are held back until `status` becomes `ready`.
- `status` moves one way per request (`submitted` → `streaming` → `ready`). All server steps are part of one stream, so it doesn't drop back to `ready` between the tool call and the reply.
- A `console.log(isStreaming)` inside the map prints one line per message per render (`false` for older messages, `true` for the last one). That's not a value flipping.

## Adding a form the assistant can open

1. Register it in `PORTAL_DIALOG_TARGETS` (`src/lib/ai-assistant/portal-dialogs.ts`) with a `label`, `page`, `description`, `audience` and `prefill`. Only "create" forms belong here; dialogs that act on an existing record (edit, delete, reject) need a specific row. Set `audience` to the role(s) whose view of the page renders the form. Users outside it are told they can't use it instead of getting a button. Put the text, choice and number fields the user could state in a sentence in `prefill`, not uploads, map locations or dates.
2. In the component that owns the form, replace its `useState(false)` with `useDialogParam("<id>")`. Add `&& hasResidentProfile` to `open` if the form needs a resident profile.
3. In the component that renders the form, pass `useDialogPrefill("<id>")` into its `defaultValues` (cast to `Partial<...FormValues>`).

The tool's input schema, its description for the model, the role check and the chat button all come from the registry, so there's nothing else to change.

## Adding a tool

1. **Server:** add a file to `src/lib/ai-assistant/tools/` with a `buildXTool` function, add it to `buildAssistantTools` in `tools/index.ts`, and mention when to use it in `SYSTEM_PROMPT` (`system-prompt.ts`). Give it an `execute` so the call finishes on the server. That's all you need for a tool that doesn't change the UI.
   A tool only the browser can answer (like `getUserLocation`) has no `execute`. Answer it in the widget's `onToolCall` and resend the chat with `sendAutomaticallyWhen` (see [The user's location](#the-users-location)).
2. **Browser (only if the result should show something in the chat):** in `chat-panel.tsx`, read the message's `tool-<name>` parts whose `state` is `"output-available"`. The return value of `execute` is in `part.output` and the model's arguments are in `part.input`. Use `getDialogTargets` or `getNavigationTargets` as the template, and keep the same "not while streaming" check. Build the button from `part.output`, not `part.input`, so `execute` can refuse (`buttonShown: false`).

## Gotchas

- The tool name must be the same string in `buildAssistantTools` and the chat panel (`tool-navigateToPage`, `tool-openFormDialog`, `tool-openBusinessDetails`) or widget (`getUserLocation`). If it's not, the panel never finds the result and no button shows, or the location request is never answered.
- Every tool the browser doesn't answer needs an `execute`. A call without a result stops the stream with no reply.
- Parallel tool calls are off (`providerOptions: { openai: { parallelToolCalls: false } }`), so the model makes one call per step. Once `findBusinesses` and `getUserLocation` were added, it sometimes added stray calls next to the one it needed, e.g. `calculateCourtFee` or `getUserLocation` next to the clearance form, in roughly one request in six. Tests showed the tools caused this, not the prompt. A flow that needs two tools (a lookup, then a form) takes two steps instead.
- `temperature` is 0.2. Replies repeat exact details from tools and settings, and at OpenAI's default of 1 the model now and then miscopied one (a plus-code address `83C7+WRC` came out as `81C7+WRC`). A low temperature also means a bad habit shows up nearly every time instead of now and then, so check a prompt or tool change over several runs of the same question.
- `stopWhen` defaults to one step. Without `stepCountIs(3)`, the stream ends at the tool call and the reply has no text. Three steps leave room for a lookup, a button tool and the reply.
- Don't use `z.record()` in a tool's input schema. The AI SDK sends every object to OpenAI with `additionalProperties: false`, so a record reaches the model as "an object with no keys". That's why `prefill` is a list of `{ field, value }` pairs.
- Keep tool inputs lenient. If the model's arguments fail the input schema (e.g. a number where only a string is allowed), it retries in its next step, which can use up the last one and leave the reply with no text. That's why a prefill `value` accepts a string or a number, and the real checks happen in `parseDialogPrefill`.
- Authorization belongs on the server. Anything admin-only has to be checked from `isAdmin` in the tool's `execute`. Don't do it by leaving targets out of the tool's list, because the model then substitutes the closest one (see [Targets the user's role can't use](#targets-the-users-role-cant-use)). Opening a form is only a UI convenience; the form's server action still checks permissions.
- `useDialogParam` uses `useSearchParams`, which needs a Suspense boundary on statically prerendered pages. `src/app/portal/layout.tsx` wraps the page content in `<Suspense>` for this. A form hosted outside `/portal` needs its own boundary unless that page is dynamic.
- Components may import only `portal-navigation.ts`, `portal-dialogs.ts` and `knowledge-base.ts` from `src/lib/ai-assistant/`. `knowledge-base-search.ts` imports the DB, and `tools/` and `system-prompt.ts` are for the chat route only (an `import type` is fine). There's no `index.ts` for the folder, so nothing pulls in the server files by accident.
