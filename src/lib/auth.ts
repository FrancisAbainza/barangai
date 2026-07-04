// Server-only — never import in Client Components.
import { auth } from "@clerk/nextjs/server";
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
