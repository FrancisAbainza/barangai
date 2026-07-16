import "dotenv/config";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/config";
import { userSnapshotsTable } from "@/db/schema";

// One-time backfill for users created before the Clerk webhook
// (src/app/api/webhooks/clerk/route.ts) started mirroring user data into
// `user_snapshots`. Run with: npx tsx scripts/backfill-user-snapshots.ts
const BATCH_SIZE = 500;

type BackfillUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
  primaryEmailAddressId: string | null;
  publicMetadata: Record<string, unknown>;
  createdAt: number;
};

function extractFullName(user: Pick<BackfillUser, "firstName" | "lastName" | "username">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Unknown";
}

function extractEmail(user: Pick<BackfillUser, "emailAddresses" | "primaryEmailAddressId">) {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "—"
  );
}

async function main() {
  const client = await clerkClient();
  let cursor = 0;
  let total = 0;

  while (true) {
    const { data: users, totalCount } = await client.users.getUserList({
      limit: BATCH_SIZE,
      offset: cursor,
    });

    if (users.length === 0) break;

    for (const user of users) {
      const values = {
        fullName: extractFullName(user),
        email: extractEmail(user),
        role: (user.publicMetadata?.role as string | undefined) ?? null,
        joinedAt: new Date(user.createdAt),
        updatedAt: new Date(),
      };

      await db
        .insert(userSnapshotsTable)
        .values({ userId: user.id, ...values })
        .onConflictDoUpdate({ target: userSnapshotsTable.userId, set: values });
    }

    total += users.length;
    cursor += users.length;
    console.log(`Synced ${total}/${totalCount} users…`);

    if (cursor >= totalCount) break;
  }

  console.log(`Done. Backfilled ${total} user snapshot(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
