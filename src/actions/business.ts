"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, count, desc, eq, ilike, ne } from "drizzle-orm";
import { getAuthRole, requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import { businessesTable, type Business } from "@/db/schema";
import type { BusinessFormValues } from "@/schemas/business-schema";
import type { MediaItem } from "@/components/file-uploader";

type CreateBusinessInput = Omit<BusinessFormValues, "photos" | "permit"> & {
  photos: Omit<MediaItem, "file">[];
  permit: Omit<MediaItem, "file">[];
};

export async function createBusiness(data: CreateBusinessInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(businessesTable).values({
    name: data.name,
    description: data.description,
    category: data.category,
    contactNumber: data.contactNumber,
    socialMediaLink: data.socialMediaLink || null,
    operatingHours: data.operatingHours,
    photos: data.photos,
    permit: data.permit,
    location: data.location || null,
    ownerId: userId,
  });
}

export type BusinessWithOwner = Business & {
  ownerName: string;
  ownerEmail: string;
};

const BUSINESSES_PAGE_SIZE = 20;

export type BusinessesPage = {
  items: BusinessWithOwner[];
  nextOffset: number | null;
};

async function fetchBusinessesPage(conditions: Parameters<typeof and>, offset: number): Promise<BusinessesPage> {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(businessesTable.createdAt), desc(businessesTable.id))
    .limit(BUSINESSES_PAGE_SIZE)
    .offset(offset);

  if (businesses.length === 0) return { items: [], nextOffset: null };

  // Owner display info lives in Clerk, not the DB, so batch-fetch and join in memory.
  const uniqueOwnerIds = [...new Set(businesses.map((b) => b.ownerId))];
  const client = await clerkClient();
  const { data: owners } = await client.users.getUserList({ userId: uniqueOwnerIds, limit: 100 });
  const ownerMap = new Map(
    owners.map((u) => [
      u.id,
      {
        ownerName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Unknown",
        ownerEmail:
          u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
          u.emailAddresses[0]?.emailAddress ??
          "—",
      },
    ])
  );

  return {
    items: businesses.map((business) => ({
      ...business,
      ...(ownerMap.get(business.ownerId) ?? { ownerName: "Unknown", ownerEmail: "—" }),
    })),
    nextOffset: businesses.length < BUSINESSES_PAGE_SIZE ? null : offset + businesses.length,
  };
}

export async function getBusinesses({
  offset = 0,
  search,
  category,
  status,
}: {
  offset?: number;
  search?: string;
  category?: Business["category"] | "all";
  status?: Business["status"] | "unverified" | "all";
} = {}): Promise<BusinessesPage> {
  await requireAdmin();

  const conditions = [];

  if (category && category !== "all") {
    conditions.push(eq(businessesTable.category, category));
  }
  if (status && status !== "all") {
    conditions.push(
      status === "unverified" ? ne(businessesTable.status, "Verified") : eq(businessesTable.status, status)
    );
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    conditions.push(ilike(businessesTable.name, `%${trimmedSearch}%`));
  }

  return fetchBusinessesPage(conditions, offset);
}

export async function getVerifiedBusinesses({
  offset = 0,
  search,
  category,
  mine,
}: {
  offset?: number;
  search?: string;
  category?: Business["category"] | "all";
  mine?: boolean;
} = {}): Promise<BusinessesPage> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // "My Business" should surface every status so the owner can track pending/rejected
  // submissions too; everyone else only ever sees Verified listings.
  const conditions = mine
    ? [eq(businessesTable.ownerId, userId)]
    : [eq(businessesTable.status, "Verified")];

  if (category && category !== "all") {
    conditions.push(eq(businessesTable.category, category));
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    conditions.push(ilike(businessesTable.name, `%${trimmedSearch}%`));
  }

  return fetchBusinessesPage(conditions, offset);
}

export type BusinessStats = {
  total: number;
  pending: number;
};

export async function getBusinessStats(): Promise<BusinessStats> {
  await requireAdmin();

  const [totalResult, pendingResult] = await Promise.all([
    db.select({ count: count() }).from(businessesTable),
    db.select({ count: count() }).from(businessesTable).where(ne(businessesTable.status, "Verified")),
  ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
  };
}

export type BusinessRejectionDetails = {
  reason: string;
  attachments?: Omit<MediaItem, "file">[];
};

export async function setBusinessStatus(
  id: number,
  status: Business["status"],
  details?: BusinessRejectionDetails
) {
  await requireAdmin();

  await db
    .update(businessesTable)
    .set({
      status,
      ...(status === "Rejected"
        ? details
          ? { rejectionReason: details.reason, rejectionAttachments: details.attachments ?? [] }
          : {}
        : { rejectionReason: null, rejectionAttachments: [] }),
      updatedAt: new Date(),
    })
    .where(eq(businessesTable.id, id));
}

async function requireBusinessOwnerOrAdmin(id: number) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");
  if (isAdmin) return;

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, id));

  if (!business || business.ownerId !== userId) throw new Error("Forbidden");
}

export async function updateBusiness(id: number, data: CreateBusinessInput) {
  await requireBusinessOwnerOrAdmin(id);

  await db
    .update(businessesTable)
    .set({
      name: data.name,
      description: data.description,
      category: data.category,
      contactNumber: data.contactNumber,
      socialMediaLink: data.socialMediaLink || null,
      operatingHours: data.operatingHours,
      photos: data.photos,
      permit: data.permit,
      location: data.location || null,
      updatedAt: new Date(),
    })
    .where(eq(businessesTable.id, id));
}

export async function deleteBusiness(id: number) {
  await requireBusinessOwnerOrAdmin(id);

  await db.delete(businessesTable).where(eq(businessesTable.id, id));
}
