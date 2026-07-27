import { convertToModelMessages, embed, streamText, tool, type UIMessage } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable } from "@/db/schema";
import { getAuthRole } from "@/lib/auth";
import { barangayName } from "@/lib/data";
import { KNOWLEDGE_BASE_EMBEDDING_MODEL, KNOWLEDGE_BASE_TOP_K } from "@/lib/knowledge-base";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";
import { openai } from "@ai-sdk/openai";

// Embedding the query and streaming the completion can take a few seconds combined.
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the AI assistant for ${barangayName}'s resident portal. Help residents and staff with questions about barangay services — document requests, complaints, court reservations, community hub listings, and general barangay information.

Be concise and friendly. If a knowledge base excerpt is provided below and answers the question, prefer it over general knowledge and mention it came from the barangay's uploaded reference document. If nothing relevant is provided or the question falls outside what you know, say so honestly instead of guessing.

You have two kinds of requests to handle:
- Questions ("what is the barangay hotline?") — answer directly using the knowledge base excerpts or general knowledge.
- Action intents ("I want to request a document", "I'd like to reserve the court") — call the navigateToPage tool with the matching page instead of describing where to click. The interface shows the resident a confirmation dialog before actually navigating, so call the tool directly once their intent is clear; don't ask them to confirm in your text reply first. If a tool result says they cancelled, don't call it again unless they restate the request.`;

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

function getLastUserText(messages: UIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) return "";

  return lastUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

async function getRelevantContext(query: string): Promise<string | null> {
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

export async function POST(req: Request) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const context = await getRelevantContext(getLastUserText(messages));

  const system = context
    ? `${SYSTEM_PROMPT}\n\nKnowledge base excerpts:\n${context}`
    : `${SYSTEM_PROMPT}\n\nNo knowledge base document has been uploaded yet — answer using general knowledge only, and let the user know an admin hasn't set one up yet if they ask about a specific barangay policy or document.`;

  // No `execute` — navigation has to happen in the browser, so the tool call is left
  // pending until the client confirms it (see ai-assistant-widget.tsx) and reports back.
  const tools = { navigateToPage: buildNavigateToPageTool(isAdmin) };

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
