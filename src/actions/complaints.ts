"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { and, asc, count, desc, eq, gte, ilike, inArray, like, lte, ne, notInArray, or, sql } from "drizzle-orm";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { deleteNotificationsFor, notifyDeletion, notifyStatusChange } from "@/lib/notify";
import { DELETED_USER_DISPLAY_INFO, getUserDisplayInfo, getUserDisplayInfoMap } from "@/lib/clerk-users";
import { logAudit } from "@/lib/audit";
import { formatReferenceNumber, referenceNumberSearchPattern } from "@/lib/complaints";
import { distanceInMeters } from "@/lib/geolocation";
import { db } from "@/db/config";
import { complaintFollowersTable, complaintsTable, type Complaint } from "@/db/schema";
import {
  complaintAiInsightSchema,
  complaintInsightsSchema,
  type ComplaintAiInsight,
  type ComplaintInsights,
} from "@/schemas/complaint-schema";
import type { MediaItem } from "@/components/file-uploader";
import type { LocationValue } from "@/components/map-picker";

interface AnalyzeComplaintInput {
  subject: string;
  description: string;
}

export async function analyzeComplaint(data: AnalyzeComplaintInput): Promise<ComplaintInsights> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: complaintInsightsSchema,
    prompt: `You are triaging a resident complaint submitted to a Philippine barangay (village) administrative office.

Subject: ${data.subject}
Description: ${data.description}

Classify the complaint into the most fitting category and assess how urgently barangay officials should respond.`,
  });

  return object;
}

interface GenerateComplaintInsightInput {
  id: number;
  subject: string;
  description: string;
  category: Complaint["category"];
  priority: Complaint["priority"];
  location: LocationValue;
}

export async function generateComplaintInsight(
  data: GenerateComplaintInsightInput
): Promise<ComplaintAiInsight> {
  await requireAdmin();

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: complaintAiInsightSchema,
    prompt: `You are assisting officials at a Philippine barangay (village) administrative office in planning their response to a resident complaint.

Subject: ${data.subject}
Category: ${data.category}
Priority: ${data.priority}
Location: ${data.location.address || "Unknown"}
Description: ${data.description}

Provide a practical, realistic assessment to help barangay officials plan, budget, and staff their response, and to help prevent similar complaints in the future.`,
  });

  await db.update(complaintsTable).set({ aiInsight: object }).where(eq(complaintsTable.id, data.id));

  return object;
}

export type CreateComplaintInput = {
  subject: string;
  description: string;
  location: LocationValue;
  evidence: Omit<MediaItem, "file">[];
  category: Complaint["category"];
  priority: Complaint["priority"];
};

export async function createComplaint(data: CreateComplaintInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(complaintsTable).values({
    complainantId: userId,
    subject: data.subject,
    description: data.description,
    location: data.location,
    evidence: data.evidence,
    category: data.category,
    priority: data.priority,
  });
}

const MY_COMPLAINTS_PAGE_SIZE = 10;

export type ComplaintWithComplainant = Complaint & {
  complainantName: string;
  complainantEmail: string;
  handlerName: string | null;
  // Other residents who confirmed it's the same issue as theirs (see `followComplaint`).
  followerCount: number;
  // Filed by another resident and followed by the viewer, so the complainant fields are blank.
  isFollowing: boolean;
};

export type MyComplaintsPage = {
  items: ComplaintWithComplainant[];
  nextOffset: number | null;
};

const COMPLAINTS_PAGE_SIZE = 20;

export type ComplaintsPage = {
  items: ComplaintWithComplainant[];
  nextOffset: number | null;
};

async function fetchComplaintsPage(
  conditions: Parameters<typeof and>,
  offset: number,
  pageSize: number,
  orderFn: typeof asc | typeof desc = desc,
  // Set for residents. Complaints not filed by them (the ones they follow) come back with the
  // complainant's details blanked, which the UI can't be trusted to hide.
  viewerId?: string
): Promise<ComplaintsPage> {
  const complaints = await db
    .select()
    .from(complaintsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderFn(complaintsTable.createdAt), orderFn(complaintsTable.id))
    .limit(pageSize)
    .offset(offset);

  if (complaints.length === 0) return { items: [], nextOffset: null };

  const isFollowed = (complaint: Complaint) => viewerId !== undefined && complaint.complainantId !== viewerId;

  // Complainant/handler display info lives in Clerk, not the DB, so batch-fetch and join in memory.
  // Also tolerates a since-deleted Clerk user when every row shares one complainant id.
  const uniqueComplainantIds = [
    ...new Set(complaints.filter((c) => !isFollowed(c)).map((c) => c.complainantId)),
  ];
  const uniqueHandlerIds = [...new Set(complaints.map((c) => c.handlerId).filter((id) => id !== null))];
  const [displayMap, followerCounts] = await Promise.all([
    getUserDisplayInfoMap([...uniqueComplainantIds, ...uniqueHandlerIds]),
    db
      .select({ complaintId: complaintFollowersTable.complaintId, count: count() })
      .from(complaintFollowersTable)
      .where(inArray(complaintFollowersTable.complaintId, complaints.map((c) => c.id)))
      .groupBy(complaintFollowersTable.complaintId),
  ]);
  const followerCountMap = new Map(followerCounts.map((row) => [row.complaintId, row.count]));

  return {
    items: complaints.map((complaint) => {
      const handlerName = complaint.handlerId
        ? (displayMap.get(complaint.handlerId)?.fullName ?? DELETED_USER_DISPLAY_INFO.fullName)
        : null;
      const followerCount = followerCountMap.get(complaint.id) ?? 0;

      if (isFollowed(complaint)) {
        return {
          ...complaint,
          complainantId: "",
          complainantName: "",
          complainantEmail: "",
          aiInsight: null,
          handlerName,
          followerCount,
          isFollowing: true,
        };
      }

      const info = displayMap.get(complaint.complainantId) ?? DELETED_USER_DISPLAY_INFO;
      return {
        ...complaint,
        complainantName: info.fullName,
        complainantEmail: info.email,
        handlerName,
        followerCount,
        isFollowing: false,
      };
    }),
    nextOffset: complaints.length < pageSize ? null : offset + complaints.length,
  };
}

function followedComplaintIds(userId: string) {
  return db
    .select({ id: complaintFollowersTable.complaintId })
    .from(complaintFollowersTable)
    .where(eq(complaintFollowersTable.userId, userId));
}

// A resident's My Complaints: the complaints they filed plus the ones they follow.
function filedOrFollowedBy(userId: string) {
  return or(eq(complaintsTable.complainantId, userId), inArray(complaintsTable.id, followedComplaintIds(userId)))!;
}

export async function getMyComplaints({
  offset = 0,
}: { offset?: number } = {}): Promise<MyComplaintsPage> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return fetchComplaintsPage([filedOrFollowedBy(userId)], offset, MY_COMPLAINTS_PAGE_SIZE, desc, userId);
}

export async function getComplaintsByUser(
  userId: string,
  { offset = 0 }: { offset?: number } = {}
): Promise<MyComplaintsPage> {
  const { userId: authUserId, isAdmin } = await getAuthRole();
  if (!authUserId) throw new Error("Unauthorized");
  if (authUserId !== userId && !isAdmin) throw new Error("Forbidden");

  return fetchComplaintsPage([eq(complaintsTable.complainantId, userId)], offset, MY_COMPLAINTS_PAGE_SIZE);
}

// Backs the `?view=<id>` deep link: the admin page's (e.g. from the home page's Needs Attention
// queue) and the resident page's (from a notification), so residents only get their own and the
// ones they follow.
export async function getComplaintById(id: number): Promise<ComplaintWithComplainant | null> {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [eq(complaintsTable.id, id)];
  if (!isAdmin) conditions.push(filedOrFollowedBy(userId));

  const { items } = await fetchComplaintsPage(conditions, 0, 1, desc, isAdmin ? undefined : userId);
  return items[0] ?? null;
}

// Matching shows a complaint to other residents who report something nearby. These categories
// are usually about a specific person or household, so they're never matched: otherwise filing
// one at your own address would reveal what a neighbor reported about you.
const PRIVATE_COMPLAINT_CATEGORIES: Complaint["category"][] = ["Noise", "Domestic", "Others"];
const OPEN_COMPLAINT_STATUSES: Complaint["status"][] = ["Pending", "In Progress"];
const SIMILAR_COMPLAINT_RADIUS_METERS = 150;
const MAX_SIMILAR_COMPLAINTS = 3;

// Open complaints filed by someone other than `userId`, in a category that's safe to show them.
function matchableBy(userId: string) {
  return [
    inArray(complaintsTable.status, OPEN_COMPLAINT_STATUSES),
    notInArray(complaintsTable.category, PRIVATE_COMPLAINT_CATEGORIES),
    ne(complaintsTable.complainantId, userId),
  ];
}

// What a resident sees of another resident's complaint while filing; never who filed it.
export type SimilarComplaint = Pick<
  Complaint,
  "id" | "subject" | "description" | "category" | "status" | "createdAt"
> & {
  address: string;
  distanceMeters: number;
};

// Runs when a resident submits a complaint, before it's created, so they can follow an existing
// complaint about the same issue instead of filing a duplicate. Matches on distance, not
// category: the AI may label the same clogged drain Sanitation once and Environment the next
// time, and the resident confirms the match anyway.
export async function findSimilarComplaints(location: LocationValue): Promise<SimilarComplaint[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // A barangay only has so many open complaints, so distances are computed in memory.
  const candidates = await db
    .select({
      id: complaintsTable.id,
      subject: complaintsTable.subject,
      description: complaintsTable.description,
      category: complaintsTable.category,
      status: complaintsTable.status,
      location: complaintsTable.location,
      createdAt: complaintsTable.createdAt,
    })
    .from(complaintsTable)
    .where(and(...matchableBy(userId), notInArray(complaintsTable.id, followedComplaintIds(userId))));

  return candidates
    .map(({ location: candidateLocation, ...candidate }) => ({
      ...candidate,
      address: candidateLocation.address,
      distanceMeters: distanceInMeters(location.coordinates, candidateLocation.coordinates),
    }))
    .filter((candidate) => candidate.distanceMeters <= SIMILAR_COMPLAINT_RADIUS_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_SIMILAR_COMPLAINTS);
}

// Adds another resident's complaint to the caller's My Complaints, read-only, and subscribes them
// to its status notifications.
export async function followComplaint(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [complaint] = await db
    .select({ id: complaintsTable.id })
    .from(complaintsTable)
    .where(and(eq(complaintsTable.id, id), ...matchableBy(userId)));
  if (!complaint) throw new Error("This complaint can no longer be followed.");

  await db.insert(complaintFollowersTable).values({ complaintId: id, userId }).onConflictDoNothing();
}

export async function unfollowComplaint(id: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(complaintFollowersTable)
    .where(and(eq(complaintFollowersTable.complaintId, id), eq(complaintFollowersTable.userId, userId)));
  await deleteNotificationsFor("complaint", id, userId);
}

export async function getComplaints({
  offset = 0,
  search,
  category,
  priority,
  status,
  dateFrom,
  dateTo,
  sortOrder = "newest",
  handledByMe = false,
}: {
  offset?: number;
  search?: string;
  category?: Complaint["category"] | "all";
  priority?: Complaint["priority"] | "all";
  status?: Complaint["status"] | "all";
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: "newest" | "oldest";
  handledByMe?: boolean;
} = {}): Promise<ComplaintsPage> {
  const adminId = await requireAdmin();

  const client = await clerkClient();
  const conditions = [];

  if (handledByMe) {
    conditions.push(eq(complaintsTable.handlerId, adminId));
  }

  if (category && category !== "all") {
    conditions.push(eq(complaintsTable.category, category));
  }
  if (priority && priority !== "all") {
    conditions.push(eq(complaintsTable.priority, priority));
  }
  if (status && status !== "all") {
    conditions.push(eq(complaintsTable.status, status));
  }
  if (dateFrom) {
    conditions.push(gte(complaintsTable.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(complaintsTable.createdAt, end));
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    // Complainant name/email lives in Clerk, not the DB, so match it there and combine
    // with a subject search on the DB side. A reference number matches its complaint's id.
    const { data: matchedUsers } = await client.users.getUserList({ query: trimmedSearch, limit: 100 });
    const referencePattern = referenceNumberSearchPattern(trimmedSearch);

    const searchConditions = [ilike(complaintsTable.subject, `%${trimmedSearch}%`)];
    if (matchedUsers.length > 0) {
      searchConditions.push(inArray(complaintsTable.complainantId, matchedUsers.map((u) => u.id)));
    }
    if (referencePattern !== null) {
      searchConditions.push(like(sql`${complaintsTable.id}::text`, referencePattern));
    }

    conditions.push(or(...searchConditions)!);
  }

  const orderFn = sortOrder === "oldest" ? asc : desc;

  return fetchComplaintsPage(conditions, offset, COMPLAINTS_PAGE_SIZE, orderFn);
}

export type ComplaintStats = {
  total: number;
  pending: number;
};

export async function getComplaintStats(): Promise<ComplaintStats> {
  await requireAdmin();

  const [totalResult, pendingResult] = await Promise.all([
    db.select({ count: count() }).from(complaintsTable),
    db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.status, "Pending")),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
  };
}

export type ComplaintStatusDetails = {
  message: string;
  attachments?: Omit<MediaItem, "file">[];
};

export async function setComplaintStatus(
  id: number,
  status: Complaint["status"],
  details?: ComplaintStatusDetails
) {
  const handlerId = await requireAdmin();

  const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!existing) throw new Error("Complaint not found");

  await db
    .update(complaintsTable)
    .set({
      status,
      handlerId: status === "Pending" ? null : handlerId,
      updatedAt: new Date(),
      ...(status === "Resolved"
        ? details
          ? { resolutionMessage: details.message, resolutionAttachments: details.attachments ?? [] }
          : {}
        : { resolutionMessage: null, resolutionAttachments: [] }),
      ...(status === "Dismissed"
        ? details
          ? { dismissalReason: details.message, dismissalAttachments: details.attachments ?? [] }
          : {}
        : { dismissalReason: null, dismissalAttachments: [] }),
    })
    .where(eq(complaintsTable.id, id));

  const followers = await db
    .select({ userId: complaintFollowersTable.userId })
    .from(complaintFollowersTable)
    .where(eq(complaintFollowersTable.complaintId, id));

  await notifyStatusChange({
    userId: existing.complainantId,
    followerIds: followers.map((follower) => follower.userId),
    actorId: handlerId,
    type: "complaint",
    referenceId: id,
    subject: `complaint "${existing.subject}"`,
    previousStatus: existing.status,
    status,
  });

  await logAudit({
    action: "status-changed",
    entityType: "complaint",
    entityId: id,
    summary: `Changed ${formatReferenceNumber(id)} "${existing.subject}" from ${existing.status} to ${status}`,
    changes: details ? [{ label: "Message", from: null, to: details.message }] : [],
  });
}

export async function deleteComplaint(id: number) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!existing) throw new Error("Complaint not found");
  if (existing.complainantId !== userId && !isAdmin) throw new Error("Forbidden");
  if (existing.status !== "Pending" && !isAdmin) throw new Error("Only pending complaints can be deleted.");

  const followers = await db
    .select({ userId: complaintFollowersTable.userId })
    .from(complaintFollowersTable)
    .where(eq(complaintFollowersTable.complaintId, id));

  // Deleting it would silently take it out of its followers' My Complaints too.
  if (!isAdmin && followers.length > 0) {
    throw new Error("Other residents are following this complaint, so it can't be deleted.");
  }

  // Its follower rows cascade, which is why they're read above.
  await db.delete(complaintsTable).where(eq(complaintsTable.id, id));
  await notifyDeletion({
    userId: existing.complainantId,
    followerIds: followers.map((follower) => follower.userId),
    actorId: userId,
    type: "complaint",
    referenceId: id,
    subject: `complaint "${existing.subject}"`,
  });

  if (isAdmin) {
    const complainant = await getUserDisplayInfo(existing.complainantId);
    await logAudit({
      action: "deleted",
      entityType: "complaint",
      entityId: id,
      summary: `Deleted ${formatReferenceNumber(id)} "${existing.subject}" (${existing.status}) filed by ${complainant.fullName}`,
    });
  }
}
