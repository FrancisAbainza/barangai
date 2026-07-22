"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { DELETED_USER_DISPLAY_INFO, getUserDisplayInfoMap } from "@/lib/clerk-users";
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

export type DocumentRequestWithRequester = DocumentRequest & {
  requesterName: string;
  requesterEmail: string;
  handlerName: string | null;
};

const MY_DOCUMENT_REQUESTS_PAGE_SIZE = 10;

export type MyDocumentRequestsPage = {
  items: DocumentRequestWithRequester[];
  nextOffset: number | null;
};

const DOCUMENT_REQUESTS_PAGE_SIZE = 20;

export type DocumentRequestsPage = {
  items: DocumentRequestWithRequester[];
  nextOffset: number | null;
};

async function fetchDocumentRequestsPage(
  conditions: Parameters<typeof and>,
  offset: number,
  pageSize: number
): Promise<DocumentRequestsPage> {
  const requests = await db
    .select()
    .from(documentRequestsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documentRequestsTable.createdAt), desc(documentRequestsTable.id))
    .limit(pageSize)
    .offset(offset);

  if (requests.length === 0) return { items: [], nextOffset: null };

  // Requester/handler display info lives in Clerk, not the DB, so batch-fetch and join in memory.
  // Also tolerates a since-deleted Clerk user when every row shares one requester id.
  const uniqueRequesterIds = [...new Set(requests.map((r) => r.requesterId))];
  const uniqueHandlerIds = [...new Set(requests.map((r) => r.handlerId).filter((id) => id !== null))];
  const displayMap = await getUserDisplayInfoMap([...uniqueRequesterIds, ...uniqueHandlerIds]);

  return {
    items: requests.map((request) => {
      const info = displayMap.get(request.requesterId) ?? DELETED_USER_DISPLAY_INFO;
      const handlerName = request.handlerId
        ? (displayMap.get(request.handlerId)?.fullName ?? DELETED_USER_DISPLAY_INFO.fullName)
        : null;
      return {
        ...request,
        requesterName: info.fullName,
        requesterEmail: info.email,
        handlerName,
      };
    }),
    nextOffset: requests.length < pageSize ? null : offset + requests.length,
  };
}

export async function getMyDocumentRequests({
  offset = 0,
}: { offset?: number } = {}): Promise<MyDocumentRequestsPage> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return fetchDocumentRequestsPage(
    [eq(documentRequestsTable.requesterId, userId)],
    offset,
    MY_DOCUMENT_REQUESTS_PAGE_SIZE
  );
}

export async function getDocumentRequestsByUser(
  userId: string,
  { offset = 0 }: { offset?: number } = {}
): Promise<MyDocumentRequestsPage> {
  const { userId: authUserId, isAdmin } = await getAuthRole();
  if (!authUserId) throw new Error("Unauthorized");
  if (authUserId !== userId && !isAdmin) throw new Error("Forbidden");

  return fetchDocumentRequestsPage(
    [eq(documentRequestsTable.requesterId, userId)],
    offset,
    MY_DOCUMENT_REQUESTS_PAGE_SIZE
  );
}

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

  return fetchDocumentRequestsPage(conditions, offset, DOCUMENT_REQUESTS_PAGE_SIZE);
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
  const handlerId = await requireAdmin();

  await db
    .update(documentRequestsTable)
    .set({
      status,
      handlerId: status === "Pending" ? null : handlerId,
      updatedAt: new Date(),
      ...(status === "Ready for Pickup"
        ? details
          ? { pickupMessage: details.message, pickupAttachments: details.attachments ?? [] }
          : {}
        : { pickupMessage: null, pickupAttachments: [] }),
      ...(status === "Rejected"
        ? details
          ? { rejectionReason: details.message, rejectionAttachments: details.attachments ?? [] }
          : {}
        : { rejectionReason: null, rejectionAttachments: [] }),
    })
    .where(eq(documentRequestsTable.id, id));
}
