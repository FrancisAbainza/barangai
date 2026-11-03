// Server-only — never import in Client Components.
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { residentProfilesTable } from "@/db/schema";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";

export async function getAuthRole() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;
  return { userId, isAdmin: isAdminRole(role), isSuperAdmin: isSuperAdminRole(role) };
}

export async function requireAdmin() {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");
  if (!isAdmin) throw new Error("Forbidden");
  return userId;
}

export async function requireSuperAdmin() {
  const { userId, isSuperAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");
  if (!isSuperAdmin) throw new Error("Forbidden");
  return userId;
}

// For actions that submit a request. Residents need saved Resident Credentials, which the service
// pages also require before showing their forms. Admins have none and are let through.
export async function requireSubmitter() {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");
  if (!isAdmin) {
    const [profile] = await db
      .select({ userId: residentProfilesTable.userId })
      .from(residentProfilesTable)
      .where(eq(residentProfilesTable.userId, userId));
    if (!profile) throw new Error("Resident Credentials required");
  }
  return { userId, isAdmin };
}
