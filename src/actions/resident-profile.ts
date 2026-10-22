"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { residentProfilesTable, type ResidentProfile } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthRole } from "@/lib/auth";
import type { ResidentProfileFormValues } from "@/schemas/resident-profile-schema";
import type { MediaItem } from "@/components/file-uploader";

type SaveResidentProfileInput = Omit<ResidentProfileFormValues, "validIdFront" | "validIdBack"> & {
  validIdFront: Omit<MediaItem, "file">[];
  validIdBack: Omit<MediaItem, "file">[];
};

// A profile holds the resident's contact details and valid ID, so only they and admins can read it.
export async function getResidentProfile(userId: string): Promise<ResidentProfile | null> {
  const { userId: authUserId, isAdmin } = await getAuthRole();
  if (!authUserId) throw new Error("Unauthorized");
  if (authUserId !== userId && !isAdmin) throw new Error("Forbidden");

  const [profile] = await db
    .select()
    .from(residentProfilesTable)
    .where(eq(residentProfilesTable.userId, userId));

  return profile ?? null;
}

export async function saveResidentProfile(userId: string, data: SaveResidentProfileInput) {
  const { userId: authUserId } = await auth();
  if (!authUserId) throw new Error("Unauthorized");
  if (authUserId !== userId) throw new Error("Forbidden");

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    firstName: data.firstName,
    lastName: data.lastName,
  });

  const values = {
    firstName: data.firstName,
    middleName: data.middleName || null,
    lastName: data.lastName,
    birthdate: data.birthdate,
    sex: data.sex,
    civilStatus: data.civilStatus,
    contactNumber: data.contactNumber,
    address: data.address,
    validIdType: data.validIdType,
    validIdFront: data.validIdFront,
    validIdBack: data.validIdBack,
    updatedAt: new Date(),
  };

  await db
    .insert(residentProfilesTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: residentProfilesTable.userId, set: values });
}
