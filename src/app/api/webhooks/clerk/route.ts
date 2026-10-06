import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON } from "@clerk/backend";
import type { NextRequest } from "next/server";
import { isNull } from "drizzle-orm";
import { db } from "@/db/config";
import { userSnapshotsTable } from "@/db/schema";

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
      const now = new Date();

      // Placeholder values only apply to users with no snapshot (created before the
      // webhook existed and never backfilled). `setWhere` keeps the original deletion
      // time if Clerk redelivers the event.
      await db
        .insert(userSnapshotsTable)
        .values({ userId, fullName: "Unknown", email: "—", role: null, joinedAt: now, deletedAt: now })
        .onConflictDoUpdate({
          target: userSnapshotsTable.userId,
          set: { deletedAt: now, updatedAt: now },
          setWhere: isNull(userSnapshotsTable.deletedAt),
        });
    }
  }

  return new Response("OK", { status: 200 });
}
