# AI assistant, line by line

This traces the code behind the [AI assistant](../ai-assistant.md) in the order it runs, jumping between files when the code does. It covers two flows: a resident asking to file a complaint and getting a link that opens the form partly filled in, and a resident asking for the nearest karinderya, where the browser has to answer one of the assistant's tool calls with their location.

The first flow covers what every message goes through: the knowledge base search, the tools, the system prompt, the steps of the stream and how links become buttons. The second covers only what's different.

Line numbers are as of November 4, 2026. If they've shifted, search for the quoted code.

## Asking for a form

A resident opens the chat with the round button at the bottom right of every portal page and sends "Gusto kong mag-file ng complaint tungkol sa sirang streetlight." It's their first message.

### In the browser

**1.** [chat-panel.tsx:244](../../src/components/ai-assistant/chat-panel.tsx#L244)

```tsx
<PromptInput onSubmit={handleSubmit}>
```

Pressing Enter or the send button submits the form. `PromptInput` reads the text box, calls `handleSubmit` with `{ text, files }` ([prompt-input.tsx:878](../../src/components/ai-elements/prompt-input.tsx#L878)) and clears the box. Tapping one of the example questions skips this and calls `sendMessage({ text })` directly ([chat-panel.tsx:204](../../src/components/ai-assistant/chat-panel.tsx#L204)).

**2.** [chat-panel.tsx:196](../../src/components/ai-assistant/chat-panel.tsx#L196)

```tsx
if (!message.text.trim()) return;
```

A blank message isn't sent.

**3.** [chat-panel.tsx:197](../../src/components/ai-assistant/chat-panel.tsx#L197)

```tsx
sendMessage(message);
```

`sendMessage` comes from `useChat` in the widget ([ai-assistant-widget.tsx:56](../../src/components/ai-assistant-widget.tsx#L56)). It adds the resident's message to `messages`, sets `status` to `"submitted"`, and POSTs the **whole conversation** to `/api/chat`, the AI SDK's default endpoint. The server keeps no chat history, so every request carries all of it.

`useChat` is called in `AiAssistantWidget`, above the `Dialog`, so the conversation survives closing the chat (the dialog unmounts its content). The widget is in the portal layout ([layout.tsx:25](../../src/app/portal/layout.tsx#L25)), so it also survives moving between portal pages. A refresh clears it.

**4.** [chat-panel.tsx:193](../../src/components/ai-assistant/chat-panel.tsx#L193)

```tsx
const isTyping = (isResponding && lastPart?.type !== "text") || isGettingLocation;
```

The panel re-renders. `messages` is no longer empty, so the conversation replaces the welcome screen (line 202). `status` is `"submitted"`, so `isResponding` is true (line 184). The last message is the resident's, so `lastPart` is undefined (line 190). `isTyping` is true, and the three bouncing dots show (lines 233-237).

### On the server: getting ready

**5.** [route.ts:17](../../src/app/api/chat/route.ts#L17)

```ts
const { userId, isAdmin, isSuperAdmin } = await getAuthRole();
```

Runs `getAuthRole()`:

- [auth.ts:9](../../src/lib/auth.ts#L9) `const { userId, sessionClaims } = await auth();` reads the Clerk session from the request's cookies.
- [auth.ts:10](../../src/lib/auth.ts#L10) `const role = sessionClaims?.metadata?.role;` reads the role saved in Clerk: `resident`, `admin` or `superadmin`.
- [auth.ts:11](../../src/lib/auth.ts#L11) returns the user id and two flags. For a resident, both are false.

**6.** [route.ts:18-20](../../src/app/api/chat/route.ts#L18-L20)

```ts
if (!userId) {
  return new Response("Unauthorized", { status: 401 });
}
```

A signed-out request stops here, and the widget's `onError` ([ai-assistant-widget.tsx:57](../../src/components/ai-assistant-widget.tsx#L57)) shows a toast.

**7.** [route.ts:22](../../src/app/api/chat/route.ts#L22)

```ts
const { messages }: { messages: UIMessage[] } = await req.json();
```

The conversation as the browser has it. Each message is a list of `parts`: its text, and in the assistant's messages, the tools it called and their results.

**8.** [route.ts:24-29](../../src/app/api/chat/route.ts#L24-L29)

```ts
const [context, settings, barangayOfficials, skOfficials] = await Promise.all([
  getRelevantContext(messages, isAdmin),
  getBarangaySettings(),
  getOfficials("barangay"),
  getOfficials("sk"),
]);
```

Starts four lookups at once and waits for all of them. The settings and each officials list are one database query ([settings.ts:54](../../src/actions/settings.ts#L54), [officials.ts:29-34](../../src/actions/officials.ts#L29-L34)). The knowledge base search takes longest, because it makes two OpenAI calls (steps 9-15).

### On the server: the knowledge base search

**9.** [knowledge-base-search.ts:79-80](../../src/lib/ai-assistant/knowledge-base-search.ts#L79-L80)

```ts
const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
if (lastUserIndex === -1 || !getMessageText(messages[lastUserIndex])) return null;
```

Finds the resident's latest message. Without one, or with no text in it, there's nothing to search for.

**10.** [knowledge-base-search.ts:82-84](../../src/lib/ai-assistant/knowledge-base-search.ts#L82-L84)

```ts
const conversation = messages
  .slice(Math.max(0, lastUserIndex - SEARCH_QUERY_EARLIER_MESSAGES), lastUserIndex + 1)
  .filter((message) => getMessageText(message));
```

Takes the latest message and up to 4 before it (`SEARCH_QUERY_EARLIER_MESSAGES`, line 12), leaving out any without text. This is the first message, so it's only that one.

**11.** [knowledge-base-search.ts:89](../../src/lib/ai-assistant/knowledge-base-search.ts#L89)

```ts
const query = await writeSearchQuery(conversation, isAdmin);
```

Runs `writeSearchQuery`:

- [knowledge-base-search.ts:30-32](../../src/lib/ai-assistant/knowledge-base-search.ts#L30-L32) turns the messages into a transcript: `User: Gusto kong mag-file ng complaint tungkol sa sirang streetlight.`
- [knowledge-base-search.ts:34-46](../../src/lib/ai-assistant/knowledge-base-search.ts#L34-L46) asks `gpt-4o-mini`, at temperature 0, to rewrite it as one short English question in the manual's terms (the rules are at lines 37-44). It returns something like "How does a resident file a complaint about a broken streetlight?"

The manual is in English, and Filipino or Taglish messages match it poorly as they are, as do follow-ups like "eh yung soft copy?" that don't say what they're about (see [Knowledge base search](../ai-assistant.md#knowledge-base-search)).

**12.** [knowledge-base-search.ts:90](../../src/lib/ai-assistant/knowledge-base-search.ts#L90)

```ts
return searchKnowledgeBase(isAdmin ? `Admin: ${query}` : query);
```

A resident's query is searched as is. An admin's gets "Admin: " in front, to match the manual's admin sections.

**13.** [knowledge-base-search.ts:52-55](../../src/lib/ai-assistant/knowledge-base-search.ts#L52-L55)

```ts
const { embedding: queryEmbedding } = await embed({
  model: openai.embedding(KNOWLEDGE_BASE_EMBEDDING_MODEL),
  value: query,
});
```

The second OpenAI call. `text-embedding-3-small` ([knowledge-base.ts:5](../../src/lib/ai-assistant/knowledge-base.ts#L5)) turns the query into a list of 1,536 numbers, an embedding. Every chunk of the uploaded PDFs was turned into one the same way when an admin uploaded it, and text with similar meaning gets similar numbers.

**14.** [knowledge-base-search.ts:59-68](../../src/lib/ai-assistant/knowledge-base-search.ts#L59-L68)

```ts
const similarity = sql<number>`1 - (${cosineDistance(knowledgeBaseChunksTable.embedding, queryEmbedding)})`;

// Every uploaded document's chunks are ranked together.
const chunks = await db
  .select({ content: knowledgeBaseChunksTable.content, fileName: knowledgeBaseDocumentsTable.fileName, similarity })
  .from(knowledgeBaseChunksTable)
  .innerJoin(knowledgeBaseDocumentsTable, eq(knowledgeBaseChunksTable.documentId, knowledgeBaseDocumentsTable.id))
  .where(gt(similarity, 0.2))
  .orderBy(desc(similarity))
  .limit(KNOWLEDGE_BASE_TOP_K);
```

pgvector ranks every chunk of every document by how close its embedding is to the query's, inside Postgres. The query returns the 5 closest (`KNOWLEDGE_BASE_TOP_K`, [knowledge-base.ts:13](../../src/lib/ai-assistant/knowledge-base.ts#L13)) with a similarity above 0.2.

**15.** [knowledge-base-search.ts:70-75](../../src/lib/ai-assistant/knowledge-base-search.ts#L70-L75)

```ts
if (chunks.length === 0) return null;

// Labeled with their document, so the model can tell which one says what when two disagree.
return chunks
  .map((chunk, index) => `[Excerpt ${index + 1}, from "${chunk.fileName}"]\n${chunk.content}`)
  .join("\n\n");
```

No matches gives `null`. Otherwise the excerpts are joined into one string, each labeled with its file name. This is `context` back in the route.

### On the server: the tools and the system prompt

**16.** [route.ts:31](../../src/app/api/chat/route.ts#L31)

```ts
const toolContext = { userId, isSuperAdmin, settings, userLocation: getSharedUserLocation(messages) };
```

What the tools may know about the request. All of it comes from the session, the database and the chat history, never from the model. `getSharedUserLocation` ([get-user-location.ts:27-35](../../src/lib/ai-assistant/tools/get-user-location.ts#L27-L35)) looks for a location the browser shared earlier in the conversation. There isn't one, so `userLocation` is `null`. The [second flow](#asking-for-the-nearest-business) has one.

**17.** [route.ts:32](../../src/app/api/chat/route.ts#L32)

```ts
const tools = isAdmin ? buildAdminTools(toolContext) : buildResidentTools(toolContext);
```

The resident gets [buildResidentTools](../../src/lib/ai-assistant/tools/resident/index.ts#L13-L31): eight tools, keyed by the name the model calls each one by. Each builder runs now and returns a tool definition: a `description` for the model, an `inputSchema` for what the model sends, and an `execute` function that runs if the model calls it. Nothing is looked up yet. Admins get `buildAdminTools` instead ([admin/index.ts:16-41](../../src/lib/ai-assistant/tools/admin/index.ts#L16-L41)). This line is the only place the role decides what the assistant can do; no tool checks it.

For `getFormLink`, `buildGetFormLinkTool("resident")` runs:

- [get-form-link.ts:47-50](../../src/lib/ai-assistant/tools/get-form-link.ts#L47-L50) `formIds` keeps the forms whose `audience` isn't `"admin"`: the complaint, the six document requests, the court reservation and the business. They're registered in `PORTAL_DIALOG_TARGETS` ([portal-dialogs.ts:37-204](../../src/lib/ai-assistant/portal-dialogs.ts#L37-L204)).
- [get-form-link.ts:51-53](../../src/lib/ai-assistant/tools/get-form-link.ts#L51-L53) `otherFormLabels` names the admins' forms, so the description can say the resident can't use them.
- [get-form-link.ts:56-63](../../src/lib/ai-assistant/tools/get-form-link.ts#L56-L63) writes the description. `describeForm` (lines 10-20) gives each form a line with the fields it can fill in, e.g. `- report-complaint: File a Complaint — Report a non-emergency community concern or incident to the barangay. Prefill fields: subject, description.`
- [get-form-link.ts:65](../../src/lib/ai-assistant/tools/get-form-link.ts#L65) `form: z.enum(formIds)` means the model can only pick one of those forms.

**18.** [route.ts:39-45](../../src/app/api/chat/route.ts#L39-L45)

```ts
system: buildSystemPrompt(
  context,
  settings,
  { barangay: barangayOfficials, sk: skOfficials },
  isAdmin,
  isSuperAdmin,
),
```

`streamText`'s arguments are worked out before it runs. `buildSystemPrompt` writes the instructions the model reads before the conversation:

[system-prompt.ts:148](../../src/lib/ai-assistant/system-prompt.ts#L148)

```ts
const audience: PortalAudience = isSuperAdmin ? "superAdmin" : isAdmin ? "admin" : "resident";
```

`"resident"`.

[system-prompt.ts:149-160](../../src/lib/ai-assistant/system-prompt.ts#L149-L160) joins these sections with blank lines, in this order:

- `buildInstructions(isAdmin)` (lines 39-57): who the assistant is, what it helps with (`SCOPE.resident` then `SCOPE.shared`, lines 16-34) and to turn down everything else, which facts to trust (the settings and officials over the PDF excerpts), how to answer questions, how-to questions and "do it now" requests, and the rules for links.
- `isAdmin && ADMIN_NOTES` (line 151): `false` for a resident, which `.filter(Boolean)` at line 159 drops.
- `describeRole` (line 134): "The user is signed in as a resident."
- `formatPages("resident")` (lines 75-96): every page the resident can open, as a link with what it's for, e.g. `- [Complaint](/portal/complaint): File a complaint or report an issue to the barangay.`, from `PORTAL_NAVIGATION_TARGETS` ([portal-navigation.ts:9-107](../../src/lib/ai-assistant/portal-navigation.ts#L9-L107)). Then the pages they can't open, by name: "Analytics (only for barangay admins), …".
- `formatBarangaySettings` (lines 105-122): the hotlines, email, address, GCash number, clearance fees, court rates, goal, mission and vision, from step 8's `settings`.
- `formatOfficials` (lines 126-129), once per list: the barangay and SK officials as `- Name: Position`.
- Step 15's excerpts under "Knowledge base excerpts:", or `noKnowledgeBase` (lines 99-101) if there were none.

The prompt doesn't list the tools. The model learns them from each tool's description.

**19.** [route.ts:48](../../src/app/api/chat/route.ts#L48)

```ts
messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
```

Turns the browser's messages into the form OpenAI takes. Earlier tool calls go in with their results, so the model sees what it looked up before.

**20.** [route.ts:34-58](../../src/app/api/chat/route.ts#L34-L58)

```ts
const result = streamText({
  model: openai("gpt-4o-mini"),
  temperature: 0.2,
  // …system, messages, tools
  stopWhen: stepCountIs(8),
  providerOptions: { openai: { parallelToolCalls: false } },
});
```

Starts the model. `temperature: 0.2` keeps it copying details exactly. `stopWhen: stepCountIs(8)` lets it take up to 8 **steps**: each step is one call to OpenAI, which either calls a tool or writes the reply. `parallelToolCalls: false` limits it to one tool per step.

**21.** [route.ts:60](../../src/app/api/chat/route.ts#L60)

```ts
return result.toUIMessageStreamResponse();
```

Returns a streaming response right away. `streamText` keeps running, and everything it produces from here (tool calls, their results, the reply's words) goes to the browser as it happens.

### On the server: step 1, the tool call

**22.** OpenAI gets the system prompt, the conversation and the tools' names, descriptions and input schemas. The prompt's rule for "do it now" requests ([system-prompt.ts:54](../../src/lib/ai-assistant/system-prompt.ts#L54)) says to call `getFormLink` when one of its forms fits, and the tool's description lists `report-complaint` with `subject` and `description` as prefill fields. So the first step is a tool call rather than text, for example:

```json
{ "form": "report-complaint", "prefill": [{ "field": "subject", "value": "Sirang streetlight" }] }
```

The AI SDK checks it against the `inputSchema` ([get-form-link.ts:64-82](../../src/lib/ai-assistant/tools/get-form-link.ts#L64-L82)). If it doesn't fit, such as a form that isn't in the list, the error goes back to the model as the tool's result and it tries again in its next step.

**23.** [get-form-link.ts:83-84](../../src/lib/ai-assistant/tools/get-form-link.ts#L83-L84)

```ts
execute: async ({ form, prefill = [] }) => {
  const { label } = PORTAL_DIALOG_TARGETS[form];
```

The AI SDK runs the tool's `execute` with the model's input. `label` is "File a Complaint".

**24.** [get-form-link.ts:85-87](../../src/lib/ai-assistant/tools/get-form-link.ts#L85-L87)

```ts
const values = Object.fromEntries(
  prefill.filter(({ value }) => value !== "").map(({ field, value }) => [field, value]),
);
```

Turns the list into `{ subject: "Sirang streetlight" }`, dropping empty values. The model sends a list of pairs rather than an object, because the AI SDK can't describe an object with open-ended keys to OpenAI (the comment at lines 66-67).

**25.** [get-form-link.ts:92](../../src/lib/ai-assistant/tools/get-form-link.ts#L92)

```ts
link: markdownLink(label, getPortalDialogHref(form, values)),
```

`getPortalDialogHref` runs first:

- [portal-dialogs.ts:214](../../src/lib/ai-assistant/portal-dialogs.ts#L214) `const { href } = PORTAL_NAVIGATION_TARGETS[PORTAL_DIALOG_TARGETS[id].page];` gives `/portal/complaint`, the page the form is on.
- [portal-dialogs.ts:215](../../src/lib/ai-assistant/portal-dialogs.ts#L215) adds `dialog=report-complaint`.
- [portal-dialogs.ts:216-218](../../src/lib/ai-assistant/portal-dialogs.ts#L216-L218) adds the values as JSON in `prefill`, since there are some.
- [portal-dialogs.ts:219](../../src/lib/ai-assistant/portal-dialogs.ts#L219) returns `/portal/complaint?dialog=report-complaint&prefill=%7B%22subject%22%3A%22Sirang+streetlight%22%7D`.

Then `markdownLink` ([links.ts:4-7](../../src/lib/ai-assistant/tools/links.ts#L4-L7)) wraps it as `[File a Complaint](/portal/complaint?dialog=…)`, escaping any `[` or `]` in the label so it can't end the link early.

**26.** [get-form-link.ts:93-97](../../src/lib/ai-assistant/tools/get-form-link.ts#L93-L97)

```ts
instruction:
  "Put this link in your reply exactly as it is. The form opens when the user taps it, so don't say you've opened it. " +
  (filledIn.length > 0
    ? `It opens with these filled in for them to review: ${filledIn.join(", ")}.`
    : "Nothing will be filled in, so don't say it will be."),
```

The result is `{ link, instruction }`. Every tool returns an `instruction` like this. The model reads it right before writing the reply, and follows it more closely than the tool's description.

**27.** Meanwhile, in the browser, the stream has delivered the call and its result. The chat has an assistant message whose parts are a `step-start` and a `tool-getFormLink` part, with no text yet.

- [ai-assistant-widget.tsx:60-61](../../src/components/ai-assistant-widget.tsx#L60-L61) The widget's `onToolCall` runs for every tool call, and returns right away for any but `getUserLocation`.
- [chat-panel.tsx:211-213](../../src/components/ai-assistant/chat-panel.tsx#L211-L213) `getMessageText` finds no text in the assistant message, so it isn't rendered.
- `lastPart` is the tool part, not text, so the typing dots stay (step 4's line).

### On the server: step 2, the reply

**28.** The step ended with a tool call that has its result, and only 1 of the 8 steps is used, so `streamText` calls OpenAI again with the `getFormLink` result after the call. Following the result's `instruction` and the prompt's link rules (put links at the end, each on its own line, and never say you've opened anything), the model writes the reply, for example:

```md
Sige! I-tap ang link sa ibaba para ma-file ang complaint mo. Naka-fill in na ang subject, kaya idagdag mo na lang ang detalye at ang lokasyon.

[File a Complaint](/portal/complaint?dialog=report-complaint&prefill=%7B%22subject%22%3A%22Sirang+streetlight%22%7D)
```

Each piece of text goes to the browser as it's written. This step has no tool call, so the run ends and the stream closes.

### Back in the browser

**29.** [chat-panel.tsx:210-232](../../src/components/ai-assistant/chat-panel.tsx#L210-L232)

```tsx
{messages.map((message) => {
  const text = getMessageText(message);
  if (!text) return null;
  // …
        <MessageResponse
          components={{
            a: ({ href, children }) => (
              <AssistantLink href={href} onNavigate={onNavigate}>
```

Each piece of text adds to the message's text part and re-renders the panel. `getMessageText` (lines 41-46) now returns text, so the message renders with `MessageResponse`, which formats the markdown with Streamdown. `MessageResponse` is memoized on its text ([message.tsx:326-340](../../src/components/ai-elements/message.tsx#L326-L340)), so earlier messages aren't formatted again on every piece.

**30.** [chat-panel.tsx:193](../../src/components/ai-assistant/chat-panel.tsx#L193) The last part is now text, so `isTyping` is false and the reply replaces the dots.

**31.** [chat-panel.tsx:70](../../src/components/ai-assistant/chat-panel.tsx#L70)

```tsx
return <span>{children}</span>;
```

Streamdown renders each markdown link with the `a` override, `AssistantLink`. While the link is still streaming in, e.g. `[File a Complaint](/portal/compl`, Streamdown gives it the href `streamdown:incomplete-link`. That isn't a portal path, so the label shows as plain text.

**32.** Once the link is complete, `AssistantLink` gets the real href:

- [chat-panel.tsx:55-56](../../src/components/ai-assistant/chat-panel.tsx#L55-L56) parses it and keeps only the path and query. A website address the model put in front (`https://barangaymaduya.com/portal/…`) is dropped here.
- [chat-panel.tsx:57](../../src/components/ai-assistant/chat-panel.tsx#L57) `isPortalHref(path)` ([portal-navigation.ts:119-122](../../src/lib/ai-assistant/portal-navigation.ts#L119-L122)) is true, since the path starts with `/portal/complaint?`. Any other link, such as a made-up page or an outside site, stays plain text (step 31).
- [chat-panel.tsx:58](../../src/components/ai-assistant/chat-panel.tsx#L58) `isPage` is false, since the path has a query.
- [chat-panel.tsx:59](../../src/components/ai-assistant/chat-panel.tsx#L59) It has `?dialog=`, so the icon is a pen. A link to a record gets an eye, and a link to a page gets an arrow after its label.
- [chat-panel.tsx:60-68](../../src/components/ai-assistant/chat-panel.tsx#L60-L68) renders a `Button` with a `next/link` `Link` inside.

**33.** The stream has closed, so `status` becomes `"ready"`, and the stop button turns back into the send button.

### Tapping the link

**34.** [chat-panel.tsx:62](../../src/components/ai-assistant/chat-panel.tsx#L62)

```tsx
<Link href={path} onClick={onNavigate}>
```

`onNavigate` is `() => setOpen(false)` ([ai-assistant-widget.tsx:102](../../src/components/ai-assistant-widget.tsx#L102)), which closes the chat so the resident sees the page. `Link` then goes to `/portal/complaint?dialog=report-complaint&prefill=…` without reloading. The portal layout stays mounted, and with it the widget and the conversation.

**35.** [resident-complaint.tsx:15](../../src/components/complaint/resident-complaint.tsx#L15)

```tsx
const [isReportDialogOpen, setIsReportDialogOpen] = useDialogParam("report-complaint");
```

The complaint page renders `ResidentComplaint` for residents ([page.tsx:22](../../src/app/portal/complaint/page.tsx#L22)). `useDialogParam` works like `useState(false)`, except that the value lives in the URL:

[use-dialog-param.ts:24](../../src/hooks/use-dialog-param.ts#L24)

```ts
const open = searchParams.get(DIALOG_SEARCH_PARAM) === dialog;
```

The URL's `dialog` is `report-complaint`, so `isReportDialogOpen` is true.

**36.** [resident-complaint.tsx:60](../../src/components/complaint/resident-complaint.tsx#L60)

```tsx
<ReportComplaintDialog open={isReportDialogOpen && hasResidentProfile} onOpenChange={setIsReportDialogOpen} />
```

The form opens once the resident's profile has loaded (lines 18-24). A resident without Resident Credentials gets the banner asking for them instead, and the form stays closed, the same as with the page's own button.

**37.** [report-complaint-dialog.tsx:58](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L58)

```tsx
const prefill = useDialogPrefill("report-complaint");
```

Runs `useDialogPrefill`:

- [use-dialog-param.ts:47](../../src/hooks/use-dialog-param.ts#L47) The URL opens this dialog, so it continues.
- [use-dialog-param.ts:48](../../src/hooks/use-dialog-param.ts#L48) calls `parseDialogPrefill` with the `prefill` JSON.
- [portal-dialogs.ts:235](../../src/lib/ai-assistant/portal-dialogs.ts#L235) parses `{"subject":"Sirang streetlight"}`. Broken JSON gives `{}` (lines 236-238).
- [portal-dialogs.ts:240-245](../../src/lib/ai-assistant/portal-dialogs.ts#L240-L245) checks each field in the form's `prefill` schema ([portal-dialogs.ts:43-46](../../src/lib/ai-assistant/portal-dialogs.ts#L43-L46): `subject` and `description`) and keeps the values that pass. A field the schema doesn't have, or an option an enum field doesn't have, is dropped. Anyone could write a link like this, so this is what keeps anything else out of the form.

`prefill` is `{ subject: "Sirang streetlight" }`.

**38.** [report-complaint-dialog.tsx:136](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L136), then [complaint-form.tsx:34](../../src/components/complaint/forms/complaint-form.tsx#L34)

```tsx
defaultValues: { ...baseDefaults, ...defaultValues },
```

The form opens with the subject filled in. The resident adds the description and location and submits it as usual. The assistant never submits anything.

**39.** [use-dialog-param.ts:26-35](../../src/hooks/use-dialog-param.ts#L26-L35)

```ts
const setOpen = (nextOpen: boolean) => {
  const params = new URLSearchParams(searchParams);
  if (nextOpen) params.set(DIALOG_SEARCH_PARAM, dialog);
  else params.delete(DIALOG_SEARCH_PARAM);
  // The assistant's values only apply to the form it opened.
  params.delete(PREFILL_SEARCH_PARAM);
```

Closing the form calls `setIsReportDialogOpen(false)` through `handleOpenChange` ([report-complaint-dialog.tsx:61-64](../../src/components/complaint/dialogs/report-complaint-dialog.tsx#L61-L64)). It removes `dialog` and `prefill` from the URL with `window.history.replaceState` (line 34), which doesn't reload the page. The page's own **File a Complaint** button then opens a blank form.

## Asking for the nearest business

Later in the same conversation, the resident asks "Saan ang pinakamalapit na karinderya?" Finding the nearest needs their location, which only the browser has. It takes two requests: the first ends at a tool call for the browser to answer, and the second carries the answer.

### The first request

**1.** The message is sent as in steps 1-4 of [Asking for a form](#asking-for-a-form), and steps 5-21 run again on the server. The knowledge base search now also gets the earlier messages about the complaint, and `userLocation` is still `null`.

**2.** [get-user-location.ts:13-17](../../src/lib/ai-assistant/tools/get-user-location.ts#L13-L17)

```ts
description:
  "Get the user's current location from their device, so findBusinesses can list businesses nearest first. " +
  "Call it on its own, and only when the user asks what's nearest or close to them and hasn't shared their " +
  // …
```

The model's first step calls `getUserLocation`, with no input, as its description says to.

**3.** [get-user-location.ts:12-24](../../src/lib/ai-assistant/tools/get-user-location.ts#L12-L24)

```ts
export const getUserLocationTool = tool({
  description: /* … */,
  inputSchema: z.object({}),
  toModelOutput: () => ({ /* … */ }),
});
```

This tool has no `execute`, so the server has no result for it. `streamText` goes on to another step only when every tool call in the step has a result, so the stream ends here with the call unanswered.

### In the browser

**4.** [ai-assistant-widget.tsx:60-62](../../src/components/ai-assistant-widget.tsx#L60-L62)

```tsx
onToolCall: ({ toolCall }) => {
  if (toolCall.toolName !== "getUserLocation") return;
  const { toolCallId } = toolCall;
```

`onToolCall` runs as soon as the call arrives. This time it's `getUserLocation`, so it goes on, and keeps the call's id to answer it with.

**5.** [ai-assistant-widget.tsx:63](../../src/components/ai-assistant-widget.tsx#L63)

```tsx
getLocationForAssistant().then(
```

Runs `getLocationForAssistant`:

[ai-assistant-widget.tsx:27-32](../../src/components/ai-assistant-widget.tsx#L27-L32)

```tsx
return Promise.race([
  getCurrentLocation(),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Timed out waiting for the user's location.")), LOCATION_TIMEOUT_MS),
  ),
]);
```

Whichever comes first: the location, or a timeout after 30 seconds (`LOCATION_TIMEOUT_MS`, line 24). Some browsers never answer when the permission prompt is closed without a choice. Inside `getCurrentLocation`, [geolocation.ts:21](../../src/lib/geolocation.ts#L21) `navigator.geolocation.getCurrentPosition(` makes the browser ask "Allow location?" the first time.

`onToolCall` doesn't wait for this (`.then`, not `await`). As the comment at line 59 says, the stream waits for `onToolCall` to finish, and `addToolOutput` (step 8) waits for the stream, so awaiting the location here would leave each waiting for the other.

**6.** [chat-panel.tsx:191-193](../../src/components/ai-assistant/chat-panel.tsx#L191-L193)

```tsx
const isGettingLocation =
  lastPart?.type === "tool-getUserLocation" && isToolUIPart(lastPart) && lastPart.state === "input-available";
const isTyping = (isResponding && lastPart?.type !== "text") || isGettingLocation;
```

The stream has ended, so `status` is `"ready"` and `isResponding` is false. But the last part is the unanswered `getUserLocation` call, so `isGettingLocation` keeps the typing dots on while the resident decides.

**7.** When the stream ended, the AI SDK asked `sendAutomaticallyWhen` (step 9) whether to send the chat back. The call had no answer yet, so it said no.

**8.** [ai-assistant-widget.tsx:64](../../src/components/ai-assistant-widget.tsx#L64)

```tsx
(location) => addToolOutput({ tool: "getUserLocation", toolCallId, output: location }),
```

The resident taps **Allow**, and `getCurrentLocation` resolves with `{ lat, lng }` ([geolocation.ts:23-26](../../src/lib/geolocation.ts#L23-L26)). `addToolOutput` saves it as the call's result: the `tool-getUserLocation` part's `state` becomes `"output-available"`, with the coordinates as its `output`.

**9.** [ai-assistant-widget.tsx:69](../../src/components/ai-assistant-widget.tsx#L69) `sendAutomaticallyWhen: hasAnsweredLocationRequest,`, which runs:

[ai-assistant-widget.tsx:37-44](../../src/components/ai-assistant-widget.tsx#L37-L44)

```tsx
function hasAnsweredLocationRequest({ messages }: { messages: UIMessage[] }) {
  const parts = messages.at(-1)?.parts ?? [];
  const lastStep = parts.slice(parts.findLastIndex((part) => part.type === "step-start") + 1);
  return (
    lastAssistantMessageIsCompleteWithToolCalls({ messages }) &&
    lastStep.some((part) => part.type === "tool-getUserLocation")
  );
}
```

After `addToolOutput`, the AI SDK asks this again. `lastStep` is the parts after the last `step-start`, the last step's. Every tool call in it now has a result, and one of them is `getUserLocation`, so it returns true. The second check is why only a location answer sends the chat back: a reply that used up its 8 steps on server tool calls also ends with every call answered, and without the check it would be sent again and again.

The AI SDK posts the conversation to `/api/chat` again. Because the last message is the assistant's, the new reply continues it instead of starting a new message, and the typing dots show again, since `status` is `"submitted"`.

If the location came back before the first stream had closed (permission granted earlier, and a quick fix), `addToolOutput` doesn't check, and the check in step 7 sends it instead.

### The second request

**10.** [route.ts:17-29](../../src/app/api/chat/route.ts#L17-L29) Auth, the knowledge base search, the settings and the officials run again, as in steps 5-15 of the first flow.

**11.** [route.ts:31](../../src/app/api/chat/route.ts#L31) calls `getSharedUserLocation(messages)`:

- [get-user-location.ts:28](../../src/lib/ai-assistant/tools/get-user-location.ts#L28) goes through every part of every message, newest first.
- [get-user-location.ts:29](../../src/lib/ai-assistant/tools/get-user-location.ts#L29) stops at the first `getUserLocation` call with a result.
- [get-user-location.ts:30-31](../../src/lib/ai-assistant/tools/get-user-location.ts#L30-L31) checks it's `{ lat, lng }` and returns it.

`toolContext.userLocation` now has the resident's coordinates. Later questions in the same conversation find them here too, so the browser isn't asked again.

**12.** [route.ts:32](../../src/app/api/chat/route.ts#L32), then [find-businesses.ts:38](../../src/lib/ai-assistant/tools/community-hub/find-businesses.ts#L38)

```ts
export function buildFindBusinessesTool({ userLocation }: AssistantToolContext) {
```

`findBusinesses` is built with the coordinates inside it. The model never sends or sees them; it can only call the tool.

**13.** [route.ts:48](../../src/app/api/chat/route.ts#L48), then [get-user-location.ts:20-23](../../src/lib/ai-assistant/tools/get-user-location.ts#L20-L23)

```ts
toModelOutput: () => ({
  type: "text",
  value: "The user shared their location. Call findBusinesses, which now lists businesses nearest first.",
}),
```

`convertToModelMessages` gives the model this text as `getUserLocation`'s result instead of the coordinates. They aren't sent to OpenAI, and the model has no numbers to copy wrong or make up.

**14.** The model's first step calls `findBusinesses`, with no input, as that text says.

**15.** [find-businesses.ts:48-60](../../src/lib/ai-assistant/tools/community-hub/find-businesses.ts#L48-L60) loads every business with status `Verified`, sorted by name.

**16.** [find-businesses.ts:62-67](../../src/lib/ai-assistant/tools/community-hub/find-businesses.ts#L62-L67)

```ts
const businesses = rows.map((business) => ({
  ...business,
  distance: userLocation && business.location ? distanceInMeters(userLocation, business.location.coordinates) : null,
}));
// Nearest first, with businesses that have no saved location last.
if (userLocation) businesses.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
```

Works out each business's straight-line distance from the resident ([geolocation.ts:4-12](../../src/lib/geolocation.ts#L4-L12)) and sorts them nearest first.

**17.** [find-businesses.ts:80-102](../../src/lib/ai-assistant/tools/community-hub/find-businesses.ts#L80-L102) returns up to 50 businesses, each with its category, description, hours, contact number, address and:

- `openNow`: whether it's open right now in Philippine time (`getPhilippineTime` at line 80, and `isOpenAt` at lines 26-33). The model has no clock, so this is worked out in code.
- `distance`: e.g. "340 m" or "1.3 km" (`formatDistance`, lines 20-22).
- `link`: `[View <name>](/portal/community-hub?business=<id>)`.

The `instruction` (lines 69-78, joined at line 101) says to give distances as approximate, mention only the businesses that fit the question, go by `openNow` for whether one is open, and give up to 3 links. The tool doesn't search for "karinderya": the model picks the businesses that fit from their names, categories and descriptions.

**18.** The second step writes the reply: the karinderyas, nearest first, about how far each is, with their links at the end. The browser shows it as in steps 29-33 of the first flow. A `?business=` link isn't a form or a page, so its button gets the eye icon.

**19.** Tapping one goes to the Community Hub with `?business=<id>`:

- [linked-business-dialog.tsx:12](../../src/components/community-hub/dialogs/linked-business-dialog.tsx#L12) `useViewParam(BUSINESS_SEARCH_PARAM)` reads the id from the URL ([use-view-param.ts:21-23](../../src/hooks/use-view-param.ts#L21-L23)).
- [linked-business-dialog.tsx:13-17](../../src/components/community-hub/dialogs/linked-business-dialog.tsx#L13-L17) fetches that business.
- [linked-business-dialog.tsx:20](../../src/components/community-hub/dialogs/linked-business-dialog.tsx#L20) opens the details dialog its card opens, with its photos, contact links and map.

### When there's no location

- **The resident taps Block, or the device can't get a fix.** `getCurrentLocation` rejects ([geolocation.ts:28-30](../../src/lib/geolocation.ts#L28-L30)), and [ai-assistant-widget.tsx:65-66](../../src/components/ai-assistant-widget.tsx#L65-L66) answers the call with `state: "output-error"` and the error's message. An error counts as an answer, so step 9 sends the chat back. Step 11 takes only `"output-available"`, so `findBusinesses` is built without a location. Its instruction (line 72) then says not to call any business the nearest, to say the location wasn't available, and to give each one's address. `getUserLocation`'s description tells the model to still call `findBusinesses`.
- **The resident never answers the prompt.** The timeout in step 5 rejects after 30 seconds, and the same happens.
- **The resident sends another message instead.** The unanswered call stays in the history, and `ignoreIncompleteToolCalls: true` ([route.ts:48](../../src/app/api/chat/route.ts#L48)) leaves it out of what goes to OpenAI, which rejects a tool call with no result.

## Other tools

Every other tool runs on the server like `getFormLink` in steps 22-28 of the first flow, with its own `execute`. Each one looks something up, does any counting, arithmetic or date handling in code, and returns the result with an `instruction` and ready links for the model to copy. The [AI assistant](../ai-assistant.md) reference describes each one, and why it works the way it does.
