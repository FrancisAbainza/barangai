"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { documentRequestsTable, type DocumentRequest } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { MediaItem } from "@/components/media-uploader";

export type CreateDocumentRequestInput = {
  documentType: DocumentRequest["documentType"];
  purpose: string;
  otherPurpose?: string;
  situationDescription?: string;
  paymentReceipt?: Omit<MediaItem, "file">[];
  supportingDocuments?: Omit<MediaItem, "file">[];
  receiveVia: string;
};

export async function createDocumentRequest(data: CreateDocumentRequestInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(documentRequestsTable).values({
    documentType: data.documentType,
    requesterId: userId,
    purpose: data.purpose,
    otherPurpose: data.otherPurpose,
    situationDescription: data.situationDescription,
    paymentReceipt: data.paymentReceipt ?? [],
    supportingDocuments: data.supportingDocuments ?? [],
    receiveVia: data.receiveVia,
  });
}

export async function getMyDocumentRequests(): Promise<DocumentRequest[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select()
    .from(documentRequestsTable)
    .where(eq(documentRequestsTable.requesterId, userId))
    .orderBy(desc(documentRequestsTable.createdAt));
}

export async function deleteDocumentRequest(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(documentRequestsTable)
    .where(eq(documentRequestsTable.id, id));
  if (!existing) throw new Error("Document request not found");
  if (existing.requesterId !== userId) throw new Error("Forbidden");

  await db.delete(documentRequestsTable).where(eq(documentRequestsTable.id, id));
}
