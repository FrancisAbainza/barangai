# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the uploaded PDF (RAG) and can call **tools**. It has two tools, and each one puts a button under the assistant's reply:

- `navigateToPage`: a "Go to X" button that takes the user to a portal page.
- `openFormDialog`: a button like "File a Complaint" that takes the user to the form's page and opens the form there, with any details the user already gave in the chat filled in.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state. |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone. Also renders the buttons for tool results: form buttons (`getDialogTargets`) and navigation buttons (`getNavigationTargets`). |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. Sets `stopWhen: stepCountIs(2)` so the model can reply after a tool runs. |
| `src/lib/ai-assistant.ts` | Server-only helpers in three sections: **tools** (including the role check), **knowledge base** (embedding and pgvector search), **system prompt** (`buildSystemPrompt` adds the user's role and the excerpts). |
| `src/lib/portal-navigation.ts` | Pages the assistant can navigate to, each with its `audience` (`resident`, `admin` or `all`). Also exports `isPortalNavigationTargetAvailable`. Used by both the server tool and the chat panel's buttons. |
| `src/lib/portal-dialogs.ts` | Forms the assistant can open, each with its `page`, `audience` (`resident`, `admin` or `all`) and `prefill` schema (the fields the assistant may fill in). Also exports `getPortalDialogHref` (the page plus `?dialog=<id>`, and `&prefill=<json>` when there are values), `parseDialogPrefill` and `isPortalDialogAvailable`. Used by the server tool, the chat panel and the components that host the forms. |
| `src/hooks/use-dialog-param.ts` | `useDialogParam(id)`: a `useState`-like `[open, setOpen]` that stores a form's open state in the URL as `?dialog=<id>`. `useDialogPrefill(id)`: the `?prefill=` values for that form, to spread into its `defaultValues`. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext` (finds matching PDF excerpts), `buildAssistantTools({ isAdmin })` and `buildSystemPrompt(context, { isAdmin })`, and streams `gpt-4o-mini`.
3. If the model calls a tool, its `execute` runs on the server right away. Neither tool changes anything; `execute` only echoes the target so the call is marked finished, or returns `buttonShown: false` if the user's role can't use it (see [below](#targets-the-users-role-cant-use)).
4. Because of `stopWhen: stepCountIs(2)`, the model gets a second step in the same stream and writes a short reply pointing at the button, or, for a `buttonShown: false` result, saying why the user can't use that form or page.
5. `ChatPanel` finds the finished `tool-openFormDialog` / `tool-navigateToPage` parts with `buttonShown: true` on the message and renders the buttons, but only once the response has finished streaming.
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
- **Chat panel:** if the model calls both anyway, `getNavigationTargets` drops any page that a form button in the same message already goes to.

## Targets the user's role can't use

Every page and form has an `audience`. For example, admins can't use the document request forms or the complaint form, because the admin view doesn't have them, and residents can't post news or open User Management.

Both tools still list **every** target. The restricted ones are marked "(residents only)" or "(admins only)" (`AUDIENCE_NOTES`), and forms the user can't use are listed without their prefill fields. The system prompt states the user's role (`The user is signed in as a barangay admin.`) and tells the model to open only a form that matches the request, never the closest one.

Leaving restricted targets out of the tools doesn't work. The model handles a request for a missing form by picking the closest one it has: an admin asking for a Certificate of Indigency got a "Submit a Business" button, and a complaint got the court reservation form. Spelling out in the system prompt what each role can't do wasn't reliable either. `gpt-4o-mini` overgeneralized it and told an admin they couldn't reserve the court.

So the role check happens in `execute` (`isPortalDialogAvailable`, `isPortalNavigationTargetAvailable`). For a target the user can't use, it returns `buttonShown: false` and an `instruction` telling the model what to say and not to call another tool (the second step is the last one, so another tool call would leave the reply without text):

| User | Asks for | Told |
|---|---|---|
| Admin | A residents-only form | Residents submit it from their own accounts, so admin accounts can't. They can review the submissions on the form's page (e.g. Document Request). |
| Admin | A residents-only page (Notifications) | Admin accounts don't have that page. |
| Resident | An admins-only form or page | Only barangay admins can do that. |

The chat panel shows no button for a `buttonShown: false` result. The model sometimes declines straight away without calling the tool, which is fine, since it still doesn't open a different form.

## Staying on topic

Only the system prompt keeps the assistant to barangay topics; there's no separate filter. `SYSTEM_PROMPT` lists what's in scope (barangay services and information, using the portal, how barangays work in general, and concerns residents bring to the barangay). It tells the model to refuse anything else in a sentence or two and to answer only the barangay part of a mixed message. Barangay-specific facts come only from the knowledge base excerpts. Retrieval uses a low similarity cutoff (0.2), so excerpts show up even for unrelated questions, and the prompt tells the model to ignore excerpts that don't fit. To widen or narrow the scope, edit that list. If you add a new kind of page or form, add it there too, or the model may treat questions about it as out of scope.

## Streaming and re-renders

Each streamed chunk updates `messages`, which re-renders `ChatPanel` and re-runs `messages.map` over **every** message, not only the one being streamed.

- A message counts as "streaming" when it's the last one and `status` is `submitted` or `streaming`. Its buttons are held back until `status` becomes `ready`.
- `status` moves one way per request (`submitted` → `streaming` → `ready`). Both server steps are part of one stream, so it doesn't drop back to `ready` between the tool call and the reply.
- A `console.log(isStreaming)` inside the map prints one line per message per render (`false` for older messages, `true` for the last one). That's not a value flipping.

## Adding a form the assistant can open

1. Register it in `PORTAL_DIALOG_TARGETS` (`src/lib/portal-dialogs.ts`) with a `label`, `page`, `description`, `audience` and `prefill`. Only "create" forms belong here; dialogs that act on an existing record (edit, delete, reject) need a specific row. Set `audience` to the role(s) whose view of the page renders the form. Users outside it are told they can't use it instead of getting a button. Put the text, choice and number fields the user could state in a sentence in `prefill`, not uploads, map locations or dates.
2. In the component that owns the form, replace its `useState(false)` with `useDialogParam("<id>")`. Add `&& hasResidentProfile` to `open` if the form needs a resident profile.
3. In the component that renders the form, pass `useDialogPrefill("<id>")` into its `defaultValues` (cast to `Partial<...FormValues>`).

The tool's input schema, its description for the model, the role check and the chat button all come from the registry, so there's nothing else to change.

## Adding a tool

1. **Server:** in `src/lib/ai-assistant.ts`, write a `buildXTool` function, add it to `buildAssistantTools`, and mention when to use it in `SYSTEM_PROMPT`. Give it an `execute` so the call finishes on the server. That's all you need for a tool that doesn't change the UI.
2. **Browser (only if the result should show something in the chat):** in `chat-panel.tsx`, read the message's `tool-<name>` parts whose `state` is `"output-available"`. The return value of `execute` is in `part.output` and the model's arguments are in `part.input`. Use `getDialogTargets` or `getNavigationTargets` as the template, and keep the same "not while streaming" check. Build the button from `part.output`, not `part.input`, so `execute` can refuse (`buttonShown: false`).

## Gotchas

- The tool name must be the same string in `buildAssistantTools` and the chat panel (`tool-navigateToPage`, `tool-openFormDialog`). If it's not, the panel never finds the result and no button shows.
- Every tool needs an `execute`. A call without a result leaves the chat history incomplete, and the model's next request fails.
- `stopWhen` defaults to one step. Without `stepCountIs(2)`, the stream ends at the tool call and the reply has no text.
- Don't use `z.record()` in a tool's input schema. The AI SDK sends every object to OpenAI with `additionalProperties: false`, so a record reaches the model as "an object with no keys". That's why `prefill` is a list of `{ field, value }` pairs.
- Keep tool inputs lenient. If the model's arguments fail the input schema (e.g. a number where only a string is allowed), it retries in its second step and the reply ends up with no text. That's why a prefill `value` accepts a string or a number, and the real checks happen in `parseDialogPrefill`.
- Authorization belongs on the server. Anything admin-only has to be checked from `isAdmin` in the tool's `execute`. Don't do it by leaving targets out of the tool's list, because the model then substitutes the closest one (see [Targets the user's role can't use](#targets-the-users-role-cant-use)). Opening a form is only a UI convenience; the form's server action still checks permissions.
- `useDialogParam` uses `useSearchParams`, which needs a Suspense boundary on statically prerendered pages. `src/app/portal/layout.tsx` wraps the page content in `<Suspense>` for this. A form hosted outside `/portal` needs its own boundary unless that page is dynamic.
- `src/lib/ai-assistant.ts` imports the DB, so never import it from a component (an `import type` is fine).
