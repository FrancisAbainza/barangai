# AI features

The portal calls OpenAI in six places, all through the Vercel AI SDK (`ai` and `@ai-sdk/openai`, which reads `OPENAI_API_KEY`). The chat assistant is the largest and has its own document, [AI assistant](ai-assistant.md). This page covers the rest and how they fit together.

| Feature | Model | Where | Who | Trigger |
|---|---|---|---|---|
| Chat assistant | `gpt-4o-mini`, temperature 0.2 | `src/app/api/chat/route.ts` | Signed-in users | Every chat message |
| Knowledge base search query | `gpt-4o-mini`, temperature 0 | `src/lib/ai-assistant/knowledge-base-search.ts` | (part of the chat) | Every chat message, before the reply |
| Embeddings | `text-embedding-3-small`, 1536 dimensions | `knowledge-base-search.ts`, `src/actions/knowledge-base.ts` | (chat), admins | Every chat message; each PDF upload |
| Complaint triage | `gpt-4o-mini`, temperature 0 | `analyzeComplaint`, `src/actions/complaints.ts` | Signed-in users | Submitting a complaint |
| Complaint response plan | `gpt-4o-mini` | `generateComplaintInsight`, `src/actions/complaints.ts` | Admins | "Generate Insight" in a complaint's Submission Info |
| Voice input | `gpt-4o-mini-transcribe` | `transcribeVoiceInput`, `src/actions/ai-assistant.ts` | Signed-in users | The microphone in the chat input |

None of these change data except the response plan, which is saved on the complaint, and the knowledge base upload.

## The chat assistant in brief

A floating widget on every portal page (`AiAssistantWidget`, mounted in `src/app/portal/layout.tsx`). Each message goes to `/api/chat`, which:

1. checks the user is signed in, and whether they're an admin or super admin
2. in parallel, finds the knowledge base excerpts that match the conversation, and loads the barangay settings and both officials lists
3. builds the role's tools (`buildResidentTools` or `buildAdminTools`) and the system prompt
4. streams `gpt-4o-mini` with up to 8 steps and one tool call per step

The tools look up live data (the user's submissions, court availability and fees, businesses, news, projects, and for admins the workload, analytics and audit logs) and return ready-made links. The assistant sends the user somewhere by writing a markdown link to a portal page, which the chat panel shows as a button, and it can open a form with details already filled in through `?dialog=<id>&prefill=<json>`.

Read [AI assistant](ai-assistant.md) before changing it: it explains each tool, the prompt rules and why they're worded as they are.

## Knowledge base ingestion

Admins upload PDFs on the AI Assistant Knowledge Base card in Barangay Settings. The chat searches all of them together.

```
Browser                                Server (addKnowledgeBaseDocument)
───────                                ─────────────────────────────────
uploadFile(pdf, "knowledge-base") ──►  R2
addKnowledgeBaseDocument({ key }) ──►  1. read the PDF back from R2
                                       2. extract its text with unpdf (all pages merged)
                                       3. normalize whitespace and split into chunks
                                          (RecursiveCharacterTextSplitter, 1500 characters, 150 overlap)
                                       4. embed every chunk with embedMany (text-embedding-3-small)
                                       5. insert the document row and one row per chunk with its vector
                                       6. log the upload in the audit log
```

- The browser sends one file at a time, each in its own server action call, so one failure doesn't stop the rest and each file gets the full time limit. `maxDuration = 60` on the portal layout is what gives the action that time.
- Files are limited to 15 MB (`MAX_KNOWLEDGE_BASE_FILE_SIZE`) so a single function invocation can download, parse, chunk and embed one.
- A PDF without a text layer (a scan) fails with "No extractable text was found in this PDF." Run it through OCR first.
- `deleteKnowledgeBaseDocument` deletes the document row (its chunks cascade) and its file in R2.
- Re-uploading a changed document adds a second copy. Remove the old one, or the assistant sees both.

### Search

For each chat message, `getRelevantContext(messages, isAdmin)`:

1. asks `gpt-4o-mini` (temperature 0) to rewrite the latest message and up to 4 before it as one short English question, since the manual is in English and follow-ups often don't say what they're about. An admin's query gets "Admin: " in front so it matches the manual's admin sections.
2. embeds that question
3. ranks every chunk in Postgres by cosine similarity (`1 - cosineDistance(...)`) and keeps the top 5 above 0.2 (`KNOWLEDGE_BASE_TOP_K`), each labeled with its document's file name

The excerpts go into the system prompt. The prompt tells the model to prefer the live barangay settings and officials lists over a PDF that disagrees, and to ignore excerpts that don't fit the question.

### Changing the embedding model

`KNOWLEDGE_BASE_EMBEDDING_MODEL` and `KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS` (`src/lib/ai-assistant/knowledge-base.ts`) are shared by ingestion, search and the `vector(1536)` column. To switch models:

1. Change both constants.
2. Change the column's dimensions in the database (the owner applies it, see [Database](database.md#keeping-the-database-in-sync)). Existing vectors can't be converted.
3. Delete and re-upload every document, since old and new embeddings can't be compared.

## Complaint triage

When a resident submits a complaint, `analyzeComplaint` classifies it with `generateObject` and `complaintInsightsSchema`: one of nine categories and one of four priorities. The prompt's rubric bases the priority on actual danger and how many people are affected, explicitly ignoring all caps, exclamation points and demands, and picks the lower level when in doubt. Temperature 0 keeps the same complaint getting the same answer. The resident never sees or picks these fields. See [Complaints](features/complaints.md#filing-a-complaint) for the rubric.

If the call fails, the complaint isn't filed and the resident sees an error.

## Complaint response planning

`generateComplaintInsight` (admins only) asks for a practical plan with `complaintAiInsightSchema`: a budget range in pesos, manpower, timeframe, a suggested solution, required resources, the public safety risk and prevention advice. The result is stored in the complaint's `aiInsight` column and shown in its Submission Info. Regenerating replaces it. Followers' views have it blanked on the server.

## Voice input

The chat input's microphone (`VoiceInputButton`) records with `MediaRecorder` at a low bitrate and stops at 60 seconds, which keeps a recording around 240 KB, under the 1 MB server action body limit. `transcribeVoiceInput` checks the user is signed in and the audio is non-empty and under 1 MB, then transcribes it with `gpt-4o-mini-transcribe`. No language is set, so Filipino, English and Taglish are detected automatically, and a short prompt names the barangay to help with local names. The text goes into the input box for the user to review before sending.

## Cost and limits

- Each chat message makes at least three OpenAI calls (query rewrite, query embedding, reply) plus one per tool step.
- `/api/chat` and the portal layout both set `maxDuration = 60` seconds.
- There's no rate limiting in the app. Set a usage limit on the OpenAI project.
- `gpt-4.1-mini` was tried for the chat in November 2026 and did no better at about 2.7 times the price.

## Files

| File | What it does |
|---|---|
| `src/app/api/chat/route.ts` | The chat endpoint |
| `src/lib/ai-assistant/` | System prompt, knowledge base search and constants, link registries, tools |
| `src/actions/knowledge-base.ts` | Upload, list and delete knowledge base documents |
| `src/actions/complaints.ts` | `analyzeComplaint`, `generateComplaintInsight` |
| `src/actions/ai-assistant.ts` | `transcribeVoiceInput` |
| `src/schemas/complaint-schema.ts` | The two complaint AI output schemas |
| `src/components/ai-assistant-widget.tsx`, `src/components/ai-assistant/`, `src/components/ai-elements/` | The chat UI |
| `src/components/barangay-settings/knowledge-base-manager.tsx` | The knowledge base card |
