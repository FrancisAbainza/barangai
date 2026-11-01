"use server";

import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { desc, eq } from "drizzle-orm";
import { extractText } from "unpdf";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { DELETED_USER_DISPLAY_INFO, getUserDisplayInfo, getUserDisplayInfoMap } from "@/lib/clerk-users";
import { db } from "@/db/config";
import { knowledgeBaseChunksTable, knowledgeBaseDocumentsTable } from "@/db/schema";
import { bucket, r2 } from "@/lib/r2";
import { chunkText, KNOWLEDGE_BASE_EMBEDDING_MODEL } from "@/lib/ai-assistant/knowledge-base";

export type KnowledgeBaseDocumentInfo = {
  id: number;
  fileName: string;
  fileKey: string;
  chunkCount: number;
  uploadedByName: string;
  createdAt: Date;
};

export async function getKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocumentInfo[]> {
  await requireAdmin();

  const docs = await db.select().from(knowledgeBaseDocumentsTable).orderBy(desc(knowledgeBaseDocumentsTable.id));
  const uploaders = await getUserDisplayInfoMap(docs.map((doc) => doc.uploadedBy));

  return docs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileKey: doc.fileKey,
    chunkCount: doc.chunkCount,
    uploadedByName: (uploaders.get(doc.uploadedBy) ?? DELETED_USER_DISPLAY_INFO).fullName,
    createdAt: doc.createdAt,
  }));
}

export async function addKnowledgeBaseDocument({
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

  await logAudit({
    action: "created",
    entityType: "knowledge-base",
    entityId: newDoc.id,
    summary: `Added "${fileName}" to the AI assistant's knowledge base`,
    changes: [{ label: "Document", from: null, to: fileName }],
  });

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

export async function deleteKnowledgeBaseDocument(id: number) {
  await requireAdmin();

  const [doc] = await db.select().from(knowledgeBaseDocumentsTable).where(eq(knowledgeBaseDocumentsTable.id, id));
  if (!doc) throw new Error("This document was already removed.");

  // Its chunks go with it (onDelete: "cascade").
  await db.delete(knowledgeBaseDocumentsTable).where(eq(knowledgeBaseDocumentsTable.id, id));
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: doc.fileKey })).catch(() => {});

  await logAudit({
    action: "deleted",
    entityType: "knowledge-base",
    entityId: doc.id,
    summary: `Removed "${doc.fileName}" from the AI assistant's knowledge base`,
    changes: [{ label: "Document", from: doc.fileName, to: null }],
  });
}
