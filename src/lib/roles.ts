export type Role = "admin" | "superadmin";

export function isAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === "superadmin";
}
