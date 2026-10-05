import { embed, tool, type UIMessage } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import z from "zod";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable } from "@/db/schema";
import { barangayName } from "@/lib/data";
import { KNOWLEDGE_BASE_EMBEDDING_MODEL, KNOWLEDGE_BASE_TOP_K } from "@/lib/knowledge-base";
import {
  getPortalDialogHref,
  isPortalDialogAvailable,
  PORTAL_DIALOG_TARGETS,
  type PortalDialogTargetId,
} from "@/lib/portal-dialogs";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";

// Server-only: everything the /api/chat route needs. Sections: tools, knowledge base, system prompt.

// ── Tools ───────────────────────────────────────────────────────────────────
// To add a tool: write a builder like `buildNavigateToPageTool`, add it to
// `buildAssistantTools`, and describe when to use it in the system prompt below.
// Neither tool acts by itself: each output is rendered as a button in the chat panel
// (components/ai-assistant/chat-panel.tsx) that the user clicks — navigateToPage's goes
// to a page, openFormDialog's goes to the form's page with `?dialog=<id>`, which opens it.

function buildNavigateToPageTool(isAdmin: boolean) {
  const availableTargets = (
    Object.entries(PORTAL_NAVIGATION_TARGETS) as [
      PortalNavigationTargetId,
      (typeof PORTAL_NAVIGATION_TARGETS)[PortalNavigationTargetId],
    ][]
  ).filter(([, target]) => isAdmin || !target.adminOnly);

  const pageIds = availableTargets.map(([id]) => id) as [
    PortalNavigationTargetId,
    ...PortalNavigationTargetId[],
  ];

  return tool({
    description:
      "Navigate the resident to a specific page of the portal so they can perform an action there. Available pages:\n" +
      availableTargets.map(([id, target]) => `- ${id}: ${target.label} — ${target.description}`).join("\n"),
    inputSchema: z.object({
      page: z.enum(pageIds).describe("The portal page to navigate to."),
      reason: z
        .string()
        .describe('A short, resident-facing reason for the navigation, e.g. "to request a barangay clearance".'),
    }),
    execute: async ({ page }) => ({ page, href: PORTAL_NAVIGATION_TARGETS[page].href, buttonShown: true }),
  });
}

function buildOpenFormDialogTool(isAdmin: boolean) {
  const dialogIds = (Object.keys(PORTAL_DIALOG_TARGETS) as PortalDialogTargetId[]).filter((id) =>
    isPortalDialogAvailable(id, isAdmin),
  ) as [PortalDialogTargetId, ...PortalDialogTargetId[]];

  return tool({
    description:
      "Open a specific form so the user can fill it out right away. Prefer this over navigateToPage whenever " +
      "the user's intent matches one of these forms. Available forms:\n" +
      dialogIds.map((id) => `- ${id}: ${PORTAL_DIALOG_TARGETS[id].label} — ${PORTAL_DIALOG_TARGETS[id].description}`).join("\n"),
    inputSchema: z.object({
      dialog: z.enum(dialogIds).describe("The form to open."),
      reason: z
        .string()
        .describe('A short, user-facing reason for opening the form, e.g. "to file your complaint".'),
    }),
    execute: async ({ dialog }) => ({
      dialog,
      href: getPortalDialogHref(dialog),
      buttonShown: true,
    }),
  });
}

export function buildAssistantTools({ isAdmin }: { isAdmin: boolean }) {
  return {
    navigateToPage: buildNavigateToPageTool(isAdmin),
    openFormDialog: buildOpenFormDialogTool(isAdmin),
  };
}

// ── Knowledge base ──────────────────────────────────────────────────────────

export function getLastUserText(messages: UIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) return "";

  return lastUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export async function getRelevantContext(query: string): Promise<string | null> {
  if (!query.trim()) return null;

  const { embedding: queryEmbedding } = await embed({
    model: openai.embedding(KNOWLEDGE_BASE_EMBEDDING_MODEL),
    value: query,
  });

  // Ranking happens in Postgres via pgvector rather than pulling every chunk's
  // embedding over the wire and scoring it in memory.
  const similarity = sql<number>`1 - (${cosineDistance(knowledgeBaseChunksTable.embedding, queryEmbedding)})`;

  const chunks = await db
    .select({ content: knowledgeBaseChunksTable.content, similarity })
    .from(knowledgeBaseChunksTable)
    .where(gt(similarity, 0.2))
    .orderBy(desc(similarity))
    .limit(KNOWLEDGE_BASE_TOP_K);

  if (chunks.length === 0) return null;

  return chunks.map((chunk, index) => `[Excerpt ${index + 1}]\n${chunk.content}`).join("\n\n");
}

// ── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI assistant for ${barangayName}'s resident portal. Help residents and staff with questions about barangay services — document requests, complaints, court reservations, community hub listings, and general barangay information.

Be concise and friendly. If a knowledge base excerpt is provided below and answers the question, prefer it over general knowledge and mention it came from the barangay's uploaded reference document. If nothing relevant is provided or the question falls outside what you know, say so honestly instead of guessing.

You have two kinds of requests to handle:
- Questions ("what is the barangay hotline?") — answer directly using the knowledge base excerpts or general knowledge.
- Action intents — use a tool instead of describing where to click. Neither tool acts on its own: the interface shows the user a button beneath your reply. Call the tool directly once their intent is clear, then reply with one short sentence telling them to use the button below (don't paste links or URLs). Pick exactly one tool per intent:
  - openFormDialog — when the intent matches a specific form ("I want to file a complaint", "how do I request a barangay clearance?", "I'd like to reserve the court"). This takes them straight to the form, so prefer it whenever a matching form exists.
  - navigateToPage — when they want to browse or manage a page rather than fill out one specific form ("show me my complaints", "where can I see the news?"), or when the intent is too broad to pick a form ("I want to request a document" without saying which — ask which document, or navigate to the page if they'd rather browse).
  Never call both tools for the same intent.`;

export function buildSystemPrompt(knowledgeBaseContext: string | null): string {
  return knowledgeBaseContext
    ? `${SYSTEM_PROMPT}\n\nKnowledge base excerpts:\n${knowledgeBaseContext}`
    : `${SYSTEM_PROMPT}\n\nNo knowledge base document has been uploaded yet — answer using general knowledge only, and let the user know an admin hasn't set one up yet if they ask about a specific barangay policy or document.`;
}
