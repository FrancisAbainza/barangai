"use server";

import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { desc, eq } from "drizzle-orm";
import { extractText } from "unpdf";
import { requireAdmin } from "@/lib/auth";
import { getUserDisplayInfo } from "@/lib/clerk-users";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable, knowledgeBaseDocumentsTable } from "@/db/schema";
import { bucket, r2 } from "@/lib/r2";
import { chunkText, KNOWLEDGE_BASE_EMBEDDING_MODEL } from "@/lib/knowledge-base";

export type KnowledgeBaseDocumentInfo = {
  id: number;
  fileName: string;
  fileKey: string;
  chunkCount: number;
  uploadedByName: string;
  createdAt: Date;
};

async function getActiveDocument() {
  const [doc] = await db
    .select()
    .from(knowledgeBaseDocumentsTable)
    .orderBy(desc(knowledgeBaseDocumentsTable.id))
    .limit(1);
  return doc ?? null;
}

export async function getKnowledgeBaseDocument(): Promise<KnowledgeBaseDocumentInfo | null> {
  await requireAdmin();

  const doc = await getActiveDocument();
  if (!doc) return null;

  const uploader = await getUserDisplayInfo(doc.uploadedBy);

  return {
    id: doc.id,
    fileName: doc.fileName,
    fileKey: doc.fileKey,
    chunkCount: doc.chunkCount,
    uploadedByName: uploader.fullName,
    createdAt: doc.createdAt,
  };
}

export async function replaceKnowledgeBaseDocument({
  key,
  fileName,
}: {
  key: string;
  fileName: string;
}): Promise<KnowledgeBaseDocumentInfo> {
  const userId = await requireAdmin();

  const object = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await object.Body!.transformToByteArray();

  const { text } = await extractText(bytes, { mergePages: true });
  const chunks = await chunkText(text);
  if (chunks.length === 0) {
    throw new Error("No extractable text was found in this PDF.");
  }

  const { embeddings } = await embedMany({
    model: openai.embedding(KNOWLEDGE_BASE_EMBEDDING_MODEL),
    values: chunks,
  });

  const previousDoc = await getActiveDocument();

  const [newDoc] = await db
    .insert(knowledgeBaseDocumentsTable)
    .values({
      fileName,
      fileKey: key,
      chunkCount: chunks.length,
      uploadedBy: userId,
    })
    .returning();

  await db.insert(knowledgeBaseChunksTable).values(
    chunks.map((content, index) => ({
      documentId: newDoc.id,
      chunkIndex: index,
      content,
      embedding: embeddings[index],
    }))
  );

  if (previousDoc) {
    await db.delete(knowledgeBaseDocumentsTable).where(eq(knowledgeBaseDocumentsTable.id, previousDoc.id));
    if (previousDoc.fileKey !== key) {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: previousDoc.fileKey })).catch(() => {});
    }
  }

  const uploader = await getUserDisplayInfo(userId);

  return {
    id: newDoc.id,
    fileName: newDoc.fileName,
    fileKey: newDoc.fileKey,
    chunkCount: newDoc.chunkCount,
    uploadedByName: uploader.fullName,
    createdAt: newDoc.createdAt,
  };
}
