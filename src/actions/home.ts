"use server";

import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth";
import { getUserDisplayInfoMap } from "@/lib/clerk-users";
import { db } from "@/db/config";
import { businessesTable, complaintsTable, courtReservationsTable, documentRequestsTable } from "@/db/schema";
import { and, asc, count, eq, inArray } from "drizzle-orm";

export type MyActivitySummary = {
  documentRequests: { total: number; active: number };
  complaints: { total: number; active: number };
  courtReservations: { total: number; active: number };
};

export async function getMyActivitySummary(): Promise<MyActivitySummary> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [
    documentRequestTotal,
    documentRequestActive,
    complaintTotal,
    complaintActive,
    courtReservationTotal,
    courtReservationActive,
  ] = await Promise.all([
    db.select({ count: count() }).from(documentRequestsTable).where(eq(documentRequestsTable.requesterId, userId)),
    db
      .select({ count: count() })
      .from(documentRequestsTable)
      .where(
        and(
          eq(documentRequestsTable.requesterId, userId),
          inArray(documentRequestsTable.status, ["Pending", "Processing"])
        )
      ),
    db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.complainantId, userId)),
    db
      .select({ count: count() })
      .from(complaintsTable)
      .where(
        and(eq(complaintsTable.complainantId, userId), inArray(complaintsTable.status, ["Pending", "In Progress"]))
      ),
    db.select({ count: count() }).from(courtReservationsTable).where(eq(courtReservationsTable.requesterId, userId)),
    db
      .select({ count: count() })
      .from(courtReservationsTable)
      .where(and(eq(courtReservationsTable.requesterId, userId), eq(courtReservationsTable.status, "Pending"))),
  ]);

  return {
    documentRequests: { total: documentRequestTotal[0]?.count ?? 0, active: documentRequestActive[0]?.count ?? 0 },
    complaints: { total: complaintTotal[0]?.count ?? 0, active: complaintActive[0]?.count ?? 0 },
    courtReservations: {
      total: courtReservationTotal[0]?.count ?? 0,
      active: courtReservationActive[0]?.count ?? 0,
    },
  };
}

export type AdminActivityKind = "document-request" | "complaint" | "court-reservation" | "business" | "news";

export type NeedsAttentionItem = {
  id: string;
  kind: Exclude<AdminActivityKind, "news">;
  title: string;
  subtitle: string;
  badge: string;
  createdAt: Date;
  href: string;
};

const NEEDS_ATTENTION_CANDIDATE_LIMIT = 5;
const NEEDS_ATTENTION_TOTAL_LIMIT = 8;

// Batch-fetches display names for a set of Clerk user IDs; display info lives in
// Clerk, not the DB, so every domain here needs the same join-in-memory step.
async function getNameMap(userIds: string[]): Promise<Map<string, string>> {
  const displayMap = await getUserDisplayInfoMap(userIds);
  return new Map([...displayMap].map(([id, info]) => [id, info.fullName]));
}

export async function getNeedsAttentionQueue(): Promise<NeedsAttentionItem[]> {
  await requireAdmin();

  const [documentRequests, complaints, courtReservations, businesses] = await Promise.all([
    db
      .select()
      .from(documentRequestsTable)
      .where(inArray(documentRequestsTable.status, ["Pending", "Processing"]))
      .orderBy(asc(documentRequestsTable.createdAt))
      .limit(NEEDS_ATTENTION_CANDIDATE_LIMIT),
    db
      .select()
      .from(complaintsTable)
      .where(inArray(complaintsTable.status, ["Pending", "In Progress"]))
      .orderBy(asc(complaintsTable.createdAt))
      .limit(NEEDS_ATTENTION_CANDIDATE_LIMIT),
    db
      .select()
      .from(courtReservationsTable)
      .where(eq(courtReservationsTable.status, "Pending"))
      .orderBy(asc(courtReservationsTable.createdAt))
      .limit(NEEDS_ATTENTION_CANDIDATE_LIMIT),
    db
      .select()
      .from(businessesTable)
      .where(inArray(businessesTable.status, ["Pending", "Processing"]))
      .orderBy(asc(businessesTable.createdAt))
      .limit(NEEDS_ATTENTION_CANDIDATE_LIMIT),
  ]);

  const nameMap = await getNameMap([
    ...new Set([
      ...documentRequests.map((r) => r.requesterId),
      ...complaints.map((c) => c.complainantId),
      ...courtReservations.map((r) => r.requesterId),
      ...businesses.map((b) => b.ownerId),
    ]),
  ]);

  // Urgent complaints always float to the top; everything else (including lower-priority
  // complaints) competes purely by how long it's been waiting, oldest first.
  const items: (NeedsAttentionItem & { rank: number })[] = [
    ...documentRequests.map((r) => ({
      id: `document-request-${r.id}`,
      kind: "document-request" as const,
      title: r.documentType,
      subtitle: `Requested by ${nameMap.get(r.requesterId) ?? "Unknown"}`,
      badge: r.status,
      createdAt: r.createdAt,
      href: "/portal/document-request",
      rank: 1,
    })),
    ...complaints.map((c) => ({
      id: `complaint-${c.id}`,
      kind: "complaint" as const,
      title: c.subject,
      subtitle: `Filed by ${nameMap.get(c.complainantId) ?? "Unknown"}`,
      badge: c.priority,
      createdAt: c.createdAt,
      href: "/portal/complaint",
      rank: c.priority === "Urgent" ? 0 : 1,
    })),
    ...courtReservations.map((r) => ({
      id: `court-reservation-${r.id}`,
      kind: "court-reservation" as const,
      title: r.purpose,
      subtitle: `Requested by ${nameMap.get(r.requesterId) ?? "Unknown"}`,
      badge: r.status,
      createdAt: r.createdAt,
      href: "/portal/court-reservation",
      rank: 1,
    })),
    ...businesses.map((b) => ({
      id: `business-${b.id}`,
      kind: "business" as const,
      title: b.name,
      subtitle: `Submitted by ${nameMap.get(b.ownerId) ?? "Unknown"}`,
      badge: b.status,
      createdAt: b.createdAt,
      href: "/portal/community-hub",
      rank: 1,
    })),
  ];

  return items
    .sort((a, b) => a.rank - b.rank || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, NEEDS_ATTENTION_TOTAL_LIMIT)
    .map(({ rank: _rank, ...item }) => item);
}

export type AdminPendingCounts = {
  documentRequests: number;
  communityHub: number;
  courtReservations: number;
  complaints: number;
};

export async function getAdminPendingCounts(): Promise<AdminPendingCounts> {
  await requireAdmin();

  const [documentRequests, communityHub, courtReservations, complaints] = await Promise.all([
    db.select({ count: count() }).from(documentRequestsTable).where(eq(documentRequestsTable.status, "Pending")),
    db.select({ count: count() }).from(businessesTable).where(eq(businessesTable.status, "Pending")),
    db.select({ count: count() }).from(courtReservationsTable).where(eq(courtReservationsTable.status, "Pending")),
    db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.status, "Pending")),
  ]);

  return {
    documentRequests: documentRequests[0]?.count ?? 0,
    communityHub: communityHub[0]?.count ?? 0,
    courtReservations: courtReservations[0]?.count ?? 0,
    complaints: complaints[0]?.count ?? 0,
  };
}
