import { embed, generateText, type UIMessage } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable } from "@/db/schema";
import { KNOWLEDGE_BASE_EMBEDDING_MODEL, KNOWLEDGE_BASE_TOP_K } from "@/lib/ai-assistant/knowledge-base";

// Server-only: imports the DB. Finds the knowledge base excerpts the chat route puts in the system prompt.

// The messages before the user's latest one that the search query is written from, so a follow-up
// like "eh yung soft copy?" still finds excerpts about what it refers to.
const SEARCH_QUERY_EARLIER_MESSAGES = 4;

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

// The knowledge base is in English, so the excerpts are matched against an English search query
// written from the conversation, not the user's message as is. As is, "Meron mga resident na
// nag-request. So ang tanong ko is, ano yung gagawin ko as an admin para maprocess yung request nila
// using this portal?" ranked the manual's excerpt with the steps 16th of 74, and the model only sees
// the top few, so it answered with "go to the Document Request page". The query leaves out
// "Barangay Maduya" and "portal": every excerpt has them, so with them in, "How to process resident
// requests as an admin in the Barangay Maduya Portal?" matched the manual's introduction instead.
async function writeSearchQuery(conversation: UIMessage[], isAdmin: boolean): Promise<string> {
  const transcript = conversation
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${getMessageText(message)}`)
    .join("\n\n");

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0,
    system: `You write search queries for the user manual of a barangay's online portal. The manual is in English. Given a conversation, write one short English search query for what the user's last message asks about:
- Write it as a plain question that says who does what, e.g. "How does a resident cancel a pending court reservation?", not a list of keywords.
- Translate Filipino or Taglish into English.
- Use the earlier messages only to work out what the last one refers to.
- Name the specific feature and what the user wants to do with it, in the portal's terms where they apply: Document Request, Barangay Clearance, Certificate of Residency, Certificate of No Objection, Certificate of Indigency, Solo Parent Certification, Medical / Lab Assistance, Pickup at Barangay Hall, Online Soft Copy, Complaint, blotter, Court Reservation, Community Hub business, News & Announcements, Transparency project, Resident Credentials, Notifications, Submission Info, Barangay Settings, User Management, AI Assistant, Knowledge Base. When the user says "request" without saying what kind, write "document request".
- Leave out "Barangay Maduya" and "portal": every part of the manual mentions them.
The user is signed in as ${isAdmin ? "a barangay admin, so a question about requests, complaints, reservations or businesses is about reviewing and processing residents' submissions, not submitting one" : "a resident"}. Reply with the query only.`,
    prompt: transcript,
  });

  return text.trim();
}

async function searchKnowledgeBase(query: string): Promise<string | null> {
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

export async function getRelevantContext(messages: UIMessage[], isAdmin: boolean): Promise<string | null> {
  const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (lastUserIndex === -1 || !getMessageText(messages[lastUserIndex])) return null;

  const conversation = messages
    .slice(Math.max(0, lastUserIndex - SEARCH_QUERY_EARLIER_MESSAGES), lastUserIndex + 1)
    .filter((message) => getMessageText(message));

  // The manual has an admin section for each service, so an admin's query says so even when the model
  // leaves it out: "eh pag online soft copy, paano ko ibibigay sa kanila?" came back as "Online Soft
  // Copy distribution process" and matched how residents receive one.
  const query = await writeSearchQuery(conversation, isAdmin);
  return searchKnowledgeBase(isAdmin ? `Admin: ${query}` : query);
}
