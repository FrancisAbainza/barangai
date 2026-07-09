"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import { documentRequestsTable, type DocumentRequest } from "@/db/schema";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { MediaItem } from "@/components/file-uploader";

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

const MY_DOCUMENT_REQUESTS_PAGE_SIZE = 10;

export type MyDocumentRequestsPage = {
  items: DocumentRequest[];
  nextOffset: number | null;
};

export async function getMyDocumentRequests({
  offset = 0,
}: { offset?: number } = {}): Promise<MyDocumentRequestsPage> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const requests = await db
    .select()
    .from(documentRequestsTable)
    .where(eq(documentRequestsTable.requesterId, userId))
    .orderBy(desc(documentRequestsTable.createdAt), desc(documentRequestsTable.id))
    .limit(MY_DOCUMENT_REQUESTS_PAGE_SIZE)
    .offset(offset);

  return {
    items: requests,
    nextOffset: requests.length < MY_DOCUMENT_REQUESTS_PAGE_SIZE ? null : offset + requests.length,
  };
}

const DOCUMENT_REQUESTS_PAGE_SIZE = 20;

export type DocumentRequestWithRequester = DocumentRequest & {
  requesterName: string;
  requesterEmail: string;
};

export type DocumentRequestsPage = {
  items: DocumentRequestWithRequester[];
  nextOffset: number | null;
};

export async function getDocumentRequests({
  offset = 0,
  search,
  documentType,
  status,
  dateFrom,
  dateTo,
}: {
  offset?: number;
  search?: string;
  documentType?: string;
  status?: DocumentRequest["status"] | "all";
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<DocumentRequestsPage> {
  await requireAdmin();

  const client = await clerkClient();
  const conditions = [];

  if (documentType && documentType !== "all") {
    conditions.push(eq(documentRequestsTable.documentType, documentType as DocumentRequest["documentType"]));
  }
  if (status && status !== "all") {
    conditions.push(eq(documentRequestsTable.status, status));
  }
  if (dateFrom) {
    conditions.push(gte(documentRequestsTable.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(documentRequestsTable.createdAt, end));
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    // Requester name/email lives in Clerk, not the DB, so match it there and filter
    // the DB query down to the matched requester IDs.
    const { data: matchedUsers } = await client.users.getUserList({ query: trimmedSearch, limit: 100 });
    if (matchedUsers.length === 0) return { items: [], nextOffset: null };

    conditions.push(
      inArray(
        documentRequestsTable.requesterId,
        matchedUsers.map((u) => u.id)
      )
    );
  }

  const requests = await db
    .select()
    .from(documentRequestsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documentRequestsTable.createdAt), desc(documentRequestsTable.id))
    .limit(DOCUMENT_REQUESTS_PAGE_SIZE)
    .offset(offset);

  if (requests.length === 0) return { items: [], nextOffset: null };

  // Requester display info lives in Clerk, not the DB, so batch-fetch and join in memory.
  const uniqueRequesterIds = [...new Set(requests.map((r) => r.requesterId))];
  const { data: requesters } = await client.users.getUserList({ userId: uniqueRequesterIds, limit: 100 });
  const requesterMap = new Map(
    requesters.map((u) => [
      u.id,
      {
        requesterName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Unknown",
        requesterEmail:
          u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
          u.emailAddresses[0]?.emailAddress ??
          "—",
      },
    ])
  );

  return {
    items: requests.map((request) => ({
      ...request,
      ...(requesterMap.get(request.requesterId) ?? { requesterName: "Unknown", requesterEmail: "—" }),
    })),
    nextOffset: requests.length < DOCUMENT_REQUESTS_PAGE_SIZE ? null : offset + requests.length,
  };
}

export type DocumentRequestStats = {
  total: number;
  pending: number;
};

export async function getDocumentRequestStats(): Promise<DocumentRequestStats> {
  await requireAdmin();

  const [totalResult, pendingResult] = await Promise.all([
    db.select({ count: count() }).from(documentRequestsTable),
    db
      .select({ count: count() })
      .from(documentRequestsTable)
      .where(eq(documentRequestsTable.status, "Pending")),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
  };
}

export async function deleteDocumentRequest(id: number) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(documentRequestsTable)
    .where(eq(documentRequestsTable.id, id));
  if (!existing) throw new Error("Document request not found");
  if (existing.requesterId !== userId && !isAdmin) throw new Error("Forbidden");

  await db.delete(documentRequestsTable).where(eq(documentRequestsTable.id, id));
}

export type DocumentRequestStatusDetails = {
  message: string;
  attachments?: Omit<MediaItem, "file">[];
};

export async function setDocumentRequestStatus(
  id: number,
  status: DocumentRequest["status"],
  details?: DocumentRequestStatusDetails
) {
  await requireAdmin();

  await db
    .update(documentRequestsTable)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "Ready for Pickup"
        ? details
          ? { pickupMessage: details.message, pickupAttachments: details.attachments ?? [] }
          : {}
        : { pickupMessage: null, pickupAttachments: [] }),
      ...(status === "Rejected"
        ? details
          ? { rejectionMessage: details.message, rejectionAttachments: details.attachments ?? [] }
          : {}
        : { rejectionMessage: null, rejectionAttachments: [] }),
    })
    .where(eq(documentRequestsTable.id, id));
}
