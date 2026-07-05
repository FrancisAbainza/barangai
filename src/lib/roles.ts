export type Role = "admin" | "superadmin";

export function isAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === "superadmin";
}

export function roleLabel(role?: string | null): string {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "Resident";
}
