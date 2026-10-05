# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the uploaded PDF (RAG) and can call **tools**. It has two tools, and each one puts a button under the assistant's reply:

- `navigateToPage`: a "Go to X" button that takes the user to a portal page.
- `openFormDialog`: a button like "File a Complaint" that takes the user to the form's page and opens the form there.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state. |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone. Also renders the buttons for tool results: form buttons (`getDialogTargets`) and navigation buttons (`getNavigationTargets`). |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. Sets `stopWhen: stepCountIs(2)` so the model can reply after a tool runs. |
| `src/lib/ai-assistant.ts` | Server-only helpers in three sections: **tools**, **knowledge base** (embedding and pgvector search), **system prompt**. |
| `src/lib/portal-navigation.ts` | Pages the assistant can navigate to. Used by both the server tool and the chat panel's buttons. |
| `src/lib/portal-dialogs.ts` | Forms the assistant can open, each with its `page` and `audience` (`resident`, `admin` or `all`). Also exports `getPortalDialogHref` (the page plus `?dialog=<id>`). Used by the server tool, the chat panel and the components that host the forms. |
| `src/hooks/use-dialog-param.ts` | `useDialogParam(id)`: a `useState`-like `[open, setOpen]` that stores a form's open state in the URL as `?dialog=<id>`. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext` (finds matching PDF excerpts), `buildAssistantTools` and `buildSystemPrompt`, and streams `gpt-4o-mini`.
3. If the model calls a tool, its `execute` runs on the server right away. Neither tool changes anything; `execute` only echoes the target so the call is marked finished.
4. Because of `stopWhen: stepCountIs(2)`, the model gets a second step in the same stream and writes a short reply pointing at the button.
5. `ChatPanel` finds the finished `tool-openFormDialog` / `tool-navigateToPage` parts on the message and renders the buttons, but only once the response has finished streaming.
6. Clicking a button navigates with `next/link` and closes the widget (`onNavigate`).

## How a form gets opened

The form's open state lives in the URL, so the chat doesn't have to talk to the form directly.

1. The form button links to `getPortalDialogHref(id)`, e.g. `/portal/complaint?dialog=report-complaint`.
2. The component that owns that form uses `useDialogParam("report-complaint")` instead of `useState(false)`. Its `open` is true whenever the URL's `dialog` param equals its id, so arriving at that URL opens the form.
3. Closing the form calls `setOpen(false)`, which removes the param. `setOpen` uses `window.history.replaceState` (Next.js keeps `useSearchParams` in sync with it), so opening and closing don't trigger a server round trip.

The page's own buttons use the same `setOpen`, so a form opened any way shows up in the URL and survives a refresh.

Forms that need a resident profile also check it on `open`, e.g. `open={isReportDialogOpen && hasResidentProfile}`. Without that, a resident with no profile could open the form just by visiting the link.

## navigateToPage vs openFormDialog

Both tools can point at the same page, so they're kept from overlapping in two places:

- **System prompt:** use `openFormDialog` when the request matches a specific form ("I want to file a complaint"). Use `navigateToPage` for browsing ("show me my complaints") or a request too broad to pick a form ("I want a document"). Never call both for one request.
- **Chat panel:** if the model calls both anyway, `getNavigationTargets` drops any page that a form button in the same message already goes to.

Each tool only offers what the user's role can use. `navigateToPage` filters on `adminOnly`, and `openFormDialog` filters on `audience` (`isPortalDialogAvailable`). For example, admins aren't offered the document request forms, because the admin view doesn't have them.

## Streaming and re-renders

Each streamed chunk updates `messages`, which re-renders `ChatPanel` and re-runs `messages.map` over **every** message, not only the one being streamed.

- A message counts as "streaming" when it's the last one and `status` is `submitted` or `streaming`. Its buttons are held back until `status` becomes `ready`.
- `status` moves one way per request (`submitted` → `streaming` → `ready`). Both server steps are part of one stream, so it doesn't drop back to `ready` between the tool call and the reply.
- A `console.log(isStreaming)` inside the map prints one line per message per render (`false` for older messages, `true` for the last one). That's not a value flipping.

## Adding a form the assistant can open

1. Register it in `PORTAL_DIALOG_TARGETS` (`src/lib/portal-dialogs.ts`) with a `label`, `page`, `description` and `audience`. Only "create" forms belong here; dialogs that act on an existing record (edit, delete, reject) need a specific row.
2. In the component that owns the form, replace its `useState(false)` with `useDialogParam("<id>")`. Add `&& hasResidentProfile` to `open` if the form needs a resident profile.

The tool's input schema, its description for the model and the chat button all come from the registry, so there's nothing else to change.

## Adding a tool

1. **Server:** in `src/lib/ai-assistant.ts`, write a `buildXTool` function, add it to `buildAssistantTools`, and mention when to use it in `SYSTEM_PROMPT`. Give it an `execute` so the call finishes on the server. That's all you need for a tool that doesn't change the UI.
2. **Browser (only if the result should show something in the chat):** in `chat-panel.tsx`, read the message's `tool-<name>` parts whose `state` is `"output-available"`. The return value of `execute` is in `part.output` and the model's arguments are in `part.input`. Use `getDialogTargets` or `getNavigationTargets` as the template, and keep the same "not while streaming" check.

## Gotchas

- The tool name must be the same string in `buildAssistantTools` and the chat panel (`tool-navigateToPage`, `tool-openFormDialog`). If it's not, the panel never finds the result and no button shows.
- Every tool needs an `execute`. A call without a result leaves the chat history incomplete, and the model's next request fails.
- `stopWhen` defaults to one step. Without `stepCountIs(2)`, the stream ends at the tool call and the reply has no text.
- Authorization belongs on the server. Anything admin-only has to be checked from `isAdmin` in the tool builder. Opening a form is only a UI convenience; the form's server action still checks permissions.
- `useDialogParam` uses `useSearchParams`, which needs a Suspense boundary on statically prerendered pages. `src/app/portal/layout.tsx` wraps the page content in `<Suspense>` for this. A form hosted outside `/portal` needs its own boundary unless that page is dynamic.
- `src/lib/ai-assistant.ts` imports the DB, so never import it from a component (an `import type` is fine).
