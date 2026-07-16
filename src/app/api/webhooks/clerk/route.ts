import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON } from "@clerk/backend";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { deletedUsersTable, userSnapshotsTable } from "@/db/schema";

function extractFullName(user: Pick<UserJSON, "first_name" | "last_name" | "username">) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Unknown";
}

function extractEmail(user: Pick<UserJSON, "email_addresses" | "primary_email_address_id">) {
  return (
    user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ??
    user.email_addresses[0]?.email_address ??
    "—"
  );
}

export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return new Response("Webhook verification failed", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const user = event.data;
    const values = {
      fullName: extractFullName(user),
      email: extractEmail(user),
      role: (user.public_metadata?.role as string | undefined) ?? null,
      joinedAt: new Date(user.created_at),
      updatedAt: new Date(),
    };

    await db
      .insert(userSnapshotsTable)
      .values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: userSnapshotsTable.userId, set: values });
  }

  if (event.type === "user.deleted") {
    const userId = event.data.id;
    if (userId) {
      const [snapshot] = await db
        .select()
        .from(userSnapshotsTable)
        .where(eq(userSnapshotsTable.userId, userId));

      await db
        .insert(deletedUsersTable)
        .values({
          userId,
          fullName: snapshot?.fullName ?? "Unknown",
          email: snapshot?.email ?? "—",
          role: snapshot?.role ?? null,
          joinedAt: snapshot?.joinedAt ?? new Date(),
        })
        .onConflictDoNothing({ target: deletedUsersTable.userId });

      await db.delete(userSnapshotsTable).where(eq(userSnapshotsTable.userId, userId));
    }
  }

  return new Response("OK", { status: 200 });
}
