import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Shared between the ingestion action (src/actions/knowledge-base.ts) and the chat
// route (src/app/api/chat/route.ts) so both agree on the embedding model/dimensions.
export const KNOWLEDGE_BASE_EMBEDDING_MODEL = "text-embedding-3-small";
export const KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS = 1536;

// Kept small enough that a single Vercel function invocation can download, parse,
// chunk, and embed the whole document within its execution time/memory limits.
export const MAX_KNOWLEDGE_BASE_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// Number of most-similar chunks pulled into the system prompt per chat turn.
export const KNOWLEDGE_BASE_TOP_K = 5;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 150,
});

export async function chunkText(text: string): Promise<string[]> {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return textSplitter.splitText(cleaned);
}
