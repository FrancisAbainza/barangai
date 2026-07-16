"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { DELETED_USER_DISPLAY_INFO, getUserDisplayInfoMap } from "@/lib/clerk-users";
import { db } from "@/db/config";
import { courtReservationsTable, type CourtReservation } from "@/db/schema";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { MediaItem } from "@/components/file-uploader";
import { getCourtRateForHour } from "@/lib/data";

export async function getTakenTimeSlots(date: string, excludeReservationId?: number): Promise<number[]> {
  const conditions = [eq(courtReservationsTable.date, date), eq(courtReservationsTable.status, "Approved")];
  if (excludeReservationId !== undefined) {
    conditions.push(ne(courtReservationsTable.id, excludeReservationId));
  }

  const reservations = await db
    .select({ timeSlots: courtReservationsTable.timeSlots })
    .from(courtReservationsTable)
    .where(and(...conditions));

  return [...new Set(reservations.flatMap((reservation) => reservation.timeSlots))];
}

export type CreateCourtReservationInput = {
  date: string;
  purpose: string;
  timeSlots: number[];
  gcashPayment: Omit<MediaItem, "file">[];
};

export async function createCourtReservation(data: CreateCourtReservationInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const takenSlots = await getTakenTimeSlots(data.date);
  if (data.timeSlots.some((hour) => takenSlots.includes(hour))) {
    throw new Error("One or more selected time slots are no longer available.");
  }

  const totalAmount = data.timeSlots.reduce((sum, hour) => sum + getCourtRateForHour(hour), 0);

  await db.insert(courtReservationsTable).values({
    requesterId: userId,
    date: data.date,
    timeSlots: data.timeSlots,
    purpose: data.purpose,
    totalAmount: totalAmount.toString(),
    gcashPayment: data.gcashPayment,
  });
}

export type CourtReservationWithRequester = CourtReservation & {
  requesterName: string;
  requesterEmail: string;
};

const MY_COURT_RESERVATIONS_PAGE_SIZE = 10;

export type MyCourtReservationsPage = {
  items: CourtReservationWithRequester[];
  nextOffset: number | null;
};

const COURT_RESERVATIONS_PAGE_SIZE = 20;

export type CourtReservationsPage = {
  items: CourtReservationWithRequester[];
  nextOffset: number | null;
};

async function fetchCourtReservationsPage(
  conditions: Parameters<typeof and>,
  offset: number,
  pageSize: number,
  orderFn: typeof asc | typeof desc = desc
): Promise<CourtReservationsPage> {
  const reservations = await db
    .select()
    .from(courtReservationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderFn(courtReservationsTable.createdAt), orderFn(courtReservationsTable.id))
    .limit(pageSize)
    .offset(offset);

  if (reservations.length === 0) return { items: [], nextOffset: null };

  // Requester display info lives in Clerk, not the DB, so batch-fetch and join in memory.
  // Also tolerates a since-deleted Clerk user when every row shares one requester id.
  const uniqueRequesterIds = [...new Set(reservations.map((r) => r.requesterId))];
  const displayMap = await getUserDisplayInfoMap(uniqueRequesterIds);

  return {
    items: reservations.map((reservation) => {
      const info = displayMap.get(reservation.requesterId) ?? DELETED_USER_DISPLAY_INFO;
      return {
        ...reservation,
        requesterName: info.fullName,
        requesterEmail: info.email,
      };
    }),
    nextOffset: reservations.length < pageSize ? null : offset + reservations.length,
  };
}

export async function getMyCourtReservations({
  offset = 0,
}: { offset?: number } = {}): Promise<MyCourtReservationsPage> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return fetchCourtReservationsPage(
    [eq(courtReservationsTable.requesterId, userId)],
    offset,
    MY_COURT_RESERVATIONS_PAGE_SIZE
  );
}

export async function getCourtReservationsByUser(
  userId: string,
  { offset = 0 }: { offset?: number } = {}
): Promise<MyCourtReservationsPage> {
  const { userId: authUserId, isAdmin } = await getAuthRole();
  if (!authUserId) throw new Error("Unauthorized");
  if (authUserId !== userId && !isAdmin) throw new Error("Forbidden");

  return fetchCourtReservationsPage(
    [eq(courtReservationsTable.requesterId, userId)],
    offset,
    MY_COURT_RESERVATIONS_PAGE_SIZE
  );
}

export async function getCourtReservations({
  offset = 0,
  search,
  date,
  timeSlot,
  sortOrder = "newest",
}: {
  offset?: number;
  search?: string;
  date?: string;
  timeSlot?: number | "all";
  sortOrder?: "newest" | "oldest";
} = {}): Promise<CourtReservationsPage> {
  await requireAdmin();

  const client = await clerkClient();
  const conditions = [];

  if (date) {
    conditions.push(eq(courtReservationsTable.date, date));
  }
  if (timeSlot !== undefined && timeSlot !== "all") {
    conditions.push(
      sql`${courtReservationsTable.timeSlots}::jsonb @> ${JSON.stringify([timeSlot])}::jsonb`
    );
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    // Requester name/email lives in Clerk, not the DB, so match it there and filter
    // the DB query down to the matched requester IDs.
    const { data: matchedUsers } = await client.users.getUserList({ query: trimmedSearch, limit: 100 });
    if (matchedUsers.length === 0) return { items: [], nextOffset: null };

    conditions.push(
      inArray(
        courtReservationsTable.requesterId,
        matchedUsers.map((u) => u.id)
      )
    );
  }

  const orderFn = sortOrder === "oldest" ? asc : desc;

  return fetchCourtReservationsPage(conditions, offset, COURT_RESERVATIONS_PAGE_SIZE, orderFn);
}

export type CourtReservationStats = {
  total: number;
  pending: number;
};

export async function getCourtReservationStats(): Promise<CourtReservationStats> {
  await requireAdmin();

  const [totalResult, pendingResult] = await Promise.all([
    db.select({ count: count() }).from(courtReservationsTable),
    db
      .select({ count: count() })
      .from(courtReservationsTable)
      .where(eq(courtReservationsTable.status, "Pending")),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
  };
}

export type CourtReservationRejectionDetails = {
  reason: string;
  attachments?: Omit<MediaItem, "file">[];
};

export async function setCourtReservationStatus(
  id: number,
  status: CourtReservation["status"],
  details?: CourtReservationRejectionDetails
) {
  await requireAdmin();

  if (status === "Approved") {
    const [reservation] = await db
      .select()
      .from(courtReservationsTable)
      .where(eq(courtReservationsTable.id, id));
    if (!reservation) throw new Error("Court reservation not found");

    const takenSlots = await getTakenTimeSlots(reservation.date, id);
    if (reservation.timeSlots.some((hour) => takenSlots.includes(hour))) {
      throw new Error(
        "One or more of this reservation's time slots are already approved for another reservation."
      );
    }
  }

  await db
    .update(courtReservationsTable)
    .set({
      status,
      ...(status === "Rejected"
        ? details
          ? { rejectionReason: details.reason, rejectionAttachments: details.attachments ?? [] }
          : {}
        : { rejectionReason: null, rejectionAttachments: [] }),
      updatedAt: new Date(),
    })
    .where(eq(courtReservationsTable.id, id));
}

export async function deleteCourtReservation(id: number) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db
    .select()
    .from(courtReservationsTable)
    .where(eq(courtReservationsTable.id, id));
  if (!existing) throw new Error("Court reservation not found");
  if (existing.requesterId !== userId && !isAdmin) throw new Error("Forbidden");

  await db.delete(courtReservationsTable).where(eq(courtReservationsTable.id, id));
}
