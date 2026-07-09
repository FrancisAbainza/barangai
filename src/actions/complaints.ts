"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { and, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import { complaintsTable, type Complaint } from "@/db/schema";
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

export type MyComplaintsPage = {
  items: Complaint[];
  nextOffset: number | null;
};

export async function getMyComplaints({
  offset = 0,
}: { offset?: number } = {}): Promise<MyComplaintsPage> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const complaints = await db
    .select()
    .from(complaintsTable)
    .where(eq(complaintsTable.complainantId, userId))
    .orderBy(desc(complaintsTable.createdAt), desc(complaintsTable.id))
    .limit(MY_COMPLAINTS_PAGE_SIZE)
    .offset(offset);

  return {
    items: complaints,
    nextOffset: complaints.length < MY_COMPLAINTS_PAGE_SIZE ? null : offset + complaints.length,
  };
}

const COMPLAINTS_PAGE_SIZE = 20;

export type ComplaintWithComplainant = Complaint & {
  complainantName: string;
  complainantEmail: string;
};

export type ComplaintsPage = {
  items: ComplaintWithComplainant[];
  nextOffset: number | null;
};

export async function getComplaints({
  offset = 0,
  search,
  category,
  priority,
  status,
  dateFrom,
  dateTo,
}: {
  offset?: number;
  search?: string;
  category?: Complaint["category"] | "all";
  priority?: Complaint["priority"] | "all";
  status?: Complaint["status"] | "all";
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<ComplaintsPage> {
  await requireAdmin();

  const client = await clerkClient();
  const conditions = [];

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
    // with a subject search on the DB side.
    const { data: matchedUsers } = await client.users.getUserList({ query: trimmedSearch, limit: 100 });
    const subjectMatch = ilike(complaintsTable.subject, `%${trimmedSearch}%`);

    conditions.push(
      matchedUsers.length === 0
        ? subjectMatch
        : or(subjectMatch, inArray(complaintsTable.complainantId, matchedUsers.map((u) => u.id)))!
    );
  }

  const complaints = await db
    .select()
    .from(complaintsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(complaintsTable.createdAt), desc(complaintsTable.id))
    .limit(COMPLAINTS_PAGE_SIZE)
    .offset(offset);

  if (complaints.length === 0) return { items: [], nextOffset: null };

  // Complainant display info lives in Clerk, not the DB, so batch-fetch and join in memory.
  const uniqueComplainantIds = [...new Set(complaints.map((c) => c.complainantId))];
  const { data: complainants } = await client.users.getUserList({ userId: uniqueComplainantIds, limit: 100 });
  const complainantMap = new Map(
    complainants.map((u) => [
      u.id,
      {
        complainantName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Unknown",
        complainantEmail:
          u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
          u.emailAddresses[0]?.emailAddress ??
          "—",
      },
    ])
  );

  return {
    items: complaints.map((complaint) => ({
      ...complaint,
      ...(complainantMap.get(complaint.complainantId) ?? {
        complainantName: "Unknown",
        complainantEmail: "—",
      }),
    })),
    nextOffset: complaints.length < COMPLAINTS_PAGE_SIZE ? null : offset + complaints.length,
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
  await requireAdmin();

  await db
    .update(complaintsTable)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "Resolved"
        ? details
          ? { resolutionMessage: details.message, resolutionAttachments: details.attachments ?? [] }
          : {}
        : { resolutionMessage: null, resolutionAttachments: [] }),
      ...(status === "Dismissed"
        ? details
          ? { dismissalMessage: details.message, dismissalAttachments: details.attachments ?? [] }
          : {}
        : { dismissalMessage: null, dismissalAttachments: [] }),
    })
    .where(eq(complaintsTable.id, id));
}

export async function deleteComplaint(id: number) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!existing) throw new Error("Complaint not found");
  if (existing.complainantId !== userId && !isAdmin) throw new Error("Forbidden");

  await db.delete(complaintsTable).where(eq(complaintsTable.id, id));
}
