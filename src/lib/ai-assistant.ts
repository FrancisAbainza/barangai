import { embed, tool, type UIMessage } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import z from "zod";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable } from "@/db/schema";
import { barangayName } from "@/lib/data";
import { KNOWLEDGE_BASE_EMBEDDING_MODEL, KNOWLEDGE_BASE_TOP_K } from "@/lib/knowledge-base";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";

// Server-only: everything the /api/chat route needs. Sections: tools, knowledge base, system prompt.

// ── Tools ───────────────────────────────────────────────────────────────────
// To add a tool: write a builder like `buildNavigateToPageTool`, add it to
// `buildAssistantTools`, and describe when to use it in the system prompt below.
// A tool without `execute` is resolved in the browser — see components/ai-assistant/navigation-dialog.tsx.

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
  });
}

export function buildAssistantTools({ isAdmin }: { isAdmin: boolean }) {
  return {
    navigateToPage: buildNavigateToPageTool(isAdmin),
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
- Action intents ("I want to request a document", "I'd like to reserve the court") — call the navigateToPage tool with the matching page instead of describing where to click. The interface shows the resident a confirmation dialog before actually navigating, so call the tool directly once their intent is clear; don't ask them to confirm in your text reply first. If a tool result says they cancelled, don't call it again unless they restate the request.`;

export function buildSystemPrompt(knowledgeBaseContext: string | null): string {
  return knowledgeBaseContext
    ? `${SYSTEM_PROMPT}\n\nKnowledge base excerpts:\n${knowledgeBaseContext}`
    : `${SYSTEM_PROMPT}\n\nNo knowledge base document has been uploaded yet — answer using general knowledge only, and let the user know an admin hasn't set one up yet if they ask about a specific barangay policy or document.`;
}
