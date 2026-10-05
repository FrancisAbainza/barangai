# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the uploaded PDF (RAG) and can call **tools**. The one tool today, `navigateToPage`, sends the user to a portal page after they confirm.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state. |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone. |
| `src/components/ai-assistant/navigation-dialog.tsx` | Everything for the `navigateToPage` tool in the browser: finds the pending call, shows the "Go to X?" dialog, reports the answer back, and navigates. |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. |
| `src/lib/ai-assistant.ts` | Server-only helpers in three sections: **tools**, **knowledge base** (embedding and pgvector search), **system prompt**. |
| `src/lib/portal-navigation.ts` | Pages the assistant can navigate to. Used by both the server tool and the client handler. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext` (finds matching PDF excerpts), `buildAssistantTools` and `buildSystemPrompt`, and streams `gpt-4o-mini`.
3. If the model calls `navigateToPage` (it has no `execute` on the server), the stream delivers a pending tool call.
4. `NavigationDialog` finds the pending call and asks the user.
5. On Continue it reports `{ navigated: true }`, closes the widget and calls `router.push`. On Cancel it reports `{ navigated: false }`.
6. `sendAutomaticallyWhen` re-sends so the model can reply to the result.

## Adding a tool

1. **Server:** in `src/lib/ai-assistant.ts`, write a `buildXTool` function, add it to `buildAssistantTools`, and mention when to use it in `SYSTEM_PROMPT`. Give it an `execute` if the server can finish the job. That's all you need for a server-only tool.
2. **Browser (only if there is no `execute`):** create a small dialog component next to `navigation-dialog.tsx` that finds the pending call by its `tool-<name>` part type, then reports back with `addToolOutput`, and render it in the widget. Use `navigation-dialog.tsx` as the template.

## Gotchas

- The tool name must be the same string in `buildAssistantTools` and the client dialog (`tool-navigateToPage`). If it's not, the client never sees a pending call and the chat stalls.
- Authorization belongs on the server. Anything admin-only has to be checked from `isAdmin` in the tool builder.
- `src/lib/ai-assistant.ts` imports the DB, so never import it from a component.
