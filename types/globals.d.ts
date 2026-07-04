export { }

export type Roles = "admin" | "superadmin";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
    }
  }
}