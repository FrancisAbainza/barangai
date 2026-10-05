# AI Assistant: how the code fits together

A floating chat widget in the portal. It answers questions from the uploaded PDF (RAG) and can call **tools**. The one tool today, `navigateToPage`, puts a "Go to X" button under the assistant's reply that takes the user to a portal page.

## Files

| File | What it does |
|---|---|
| `src/components/ai-assistant-widget.tsx` | The widget (mounted in `portal/layout.tsx`). Owns `useChat` and the open/close state. |
| `src/components/ai-assistant/chat-panel.tsx` | Message list, input box, microphone. Also renders the navigation buttons for `navigateToPage` results (`getNavigationTargets`). |
| `src/app/api/chat/route.ts` | The endpoint. Auth, then calls the helpers below and streams. Sets `stopWhen: stepCountIs(2)` so the model can reply after a tool runs. |
| `src/lib/ai-assistant.ts` | Server-only helpers in three sections: **tools**, **knowledge base** (embedding and pgvector search), **system prompt**. |
| `src/lib/portal-navigation.ts` | Pages the assistant can navigate to. Used by both the server tool and the chat panel's buttons. |

## Flow

1. The user sends a message, and `useChat` POSTs the history to `/api/chat`.
2. `route.ts` checks auth, then calls `getRelevantContext` (finds matching PDF excerpts), `buildAssistantTools` and `buildSystemPrompt`, and streams `gpt-4o-mini`.
3. If the model calls `navigateToPage`, its `execute` runs on the server right away. It doesn't navigate; it only marks the call as finished.
4. Because of `stopWhen: stepCountIs(2)`, the model gets a second step in the same stream and writes a short reply pointing at the button.
5. `ChatPanel` finds the finished `tool-navigateToPage` part on the message and renders a "Go to X" button, but only once the response has finished streaming.
6. Clicking the button navigates with `next/link` and closes the widget (`onNavigate`).

## Streaming and re-renders

Each streamed chunk updates `messages`, which re-renders `ChatPanel` and re-runs `messages.map` over **every** message, not only the one being streamed.

- A message counts as "streaming" when it's the last one and `status` is `submitted` or `streaming`. Its buttons are held back until `status` becomes `ready`.
- `status` moves one way per request (`submitted` → `streaming` → `ready`). Both server steps are part of one stream, so it doesn't drop back to `ready` between the tool call and the reply.
- A `console.log(isStreaming)` inside the map prints one line per message per render (`false` for older messages, `true` for the last one). That's not a value flipping.

## Adding a tool

1. **Server:** in `src/lib/ai-assistant.ts`, write a `buildXTool` function, add it to `buildAssistantTools`, and mention when to use it in `SYSTEM_PROMPT`. Give it an `execute` so the call finishes on the server. That's all you need for a tool that doesn't change the UI.
2. **Browser (only if the result should show something in the chat):** in `chat-panel.tsx`, read the message's `tool-<name>` parts whose `state` is `"output-available"`. The return value of `execute` is in `part.output` and the model's arguments are in `part.input`. Use `getNavigationTargets` as the template, and keep the same "not while streaming" check.

## Gotchas

- The tool name must be the same string in `buildAssistantTools` and the chat panel (`tool-navigateToPage`). If it's not, the panel never finds the result and no button shows.
- Every tool needs an `execute`. A call without a result leaves the chat history incomplete, and the model's next request fails.
- `stopWhen` defaults to one step. Without `stepCountIs(2)`, the stream ends at the tool call and the reply has no text.
- Authorization belongs on the server. Anything admin-only has to be checked from `isAdmin` in the tool builder.
- `src/lib/ai-assistant.ts` imports the DB, so never import it from a component (an `import type` is fine).
