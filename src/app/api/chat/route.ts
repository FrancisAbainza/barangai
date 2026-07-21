import { auth } from "@clerk/nextjs/server";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, embed, streamText, type UIMessage } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable } from "@/db/schema";
import { barangayName } from "@/lib/data";
import { KNOWLEDGE_BASE_EMBEDDING_MODEL, KNOWLEDGE_BASE_TOP_K } from "@/lib/knowledge-base";

// Embedding the query and streaming the completion can take a few seconds combined.
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the AI assistant for ${barangayName}'s resident portal. Help residents and staff with questions about barangay services — document requests, complaints, court reservations, community hub listings, and general barangay information.

Be concise and friendly. If a knowledge base excerpt is provided below and answers the question, prefer it over general knowledge and mention it came from the barangay's uploaded reference document. If nothing relevant is provided or the question falls outside what you know, say so honestly instead of guessing.`;

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
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const context = await getRelevantContext(getLastUserText(messages));

  const system = context
    ? `${SYSTEM_PROMPT}\n\nKnowledge base excerpts:\n${context}`
    : `${SYSTEM_PROMPT}\n\nNo knowledge base document has been uploaded yet — answer using general knowledge only, and let the user know an admin hasn't set one up yet if they ask about a specific barangay policy or document.`;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
