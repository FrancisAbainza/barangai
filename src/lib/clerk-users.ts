// Server-only — never import in Client Components.
import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

export type UserDisplayInfo = {
  fullName: string;
  email: string;
  imageUrl: string;
  role: string;
};

// Returned when a userId has no matching Clerk user at all (i.e. the account was
// since deleted), as opposed to `toDisplayInfo`'s "Unknown" fallback below, which
// only covers an existing user with no name data set.
export const DELETED_USER_DISPLAY_INFO: UserDisplayInfo = {
  fullName: "Deleted User",
  email: "—",
  imageUrl: "",
  role: "resident",
};

function toDisplayInfo(user: User): UserDisplayInfo {
  return {
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Unknown",
    email:
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "—",
    imageUrl: user.imageUrl,
    role: (user.publicMetadata?.role as string | undefined) ?? "resident",
  };
}

// Author/requester/owner display info (name, email, avatar, role) lives in Clerk, not
// the DB, so every domain action needs the same batch-fetch-and-join-in-memory step.
// Dedupes IDs so repeated authors/requesters across a page cost one Clerk call.
export async function getUserDisplayInfoMap(userIds: string[]): Promise<Map<string, UserDisplayInfo>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ userId: uniqueIds, limit: 100 });

  return new Map(users.map((user) => [user.id, toDisplayInfo(user)]));
}

export async function getUserDisplayInfo(userId: string): Promise<UserDisplayInfo> {
  const map = await getUserDisplayInfoMap([userId]);
  return map.get(userId) ?? DELETED_USER_DISPLAY_INFO;
}
