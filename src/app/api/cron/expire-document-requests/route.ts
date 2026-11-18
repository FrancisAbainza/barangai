import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/config";
import { documentRequestsTable } from "@/db/schema";
import { PICKUP_DELIVERY_METHOD } from "@/lib/document-requests";

const PICKUP_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - PICKUP_EXPIRATION_MS);
  const expiredRequests = await db
    .update(documentRequestsTable)
    .set({ status: "Expired", updatedAt: new Date() })
    .where(
      and(
        eq(documentRequestsTable.status, "Ready for Pickup"),
        eq(documentRequestsTable.receiveVia, PICKUP_DELIVERY_METHOD),
        sql`COALESCE(${documentRequestsTable.readyForPickupAt}, ${documentRequestsTable.updatedAt}) <= ${cutoff}`
      )
    )
    .returning({ id: documentRequestsTable.id });

  return NextResponse.json({ expiredCount: expiredRequests.length });
}
