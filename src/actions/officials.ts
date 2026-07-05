"use server";

import { and, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import { officialsTable, type Official } from "@/db/schema";
import type { OfficialFormValues } from "@/schemas/about-us-schema";
import type { MediaItem } from "@/components/media-uploader";

export type OfficialSection = "barangay" | "sk";

type SaveOfficialInput = Omit<OfficialFormValues, "photo"> & {
  photo: Omit<MediaItem, "file">[];
};

export async function getOfficials(section: OfficialSection): Promise<Official[]> {
  return db
    .select()
    .from(officialsTable)
    .where(eq(officialsTable.section, section))
    .orderBy(desc(officialsTable.isLeader), officialsTable.id);
}

async function assertLeaderAvailable(section: OfficialSection, excludeId?: number) {
  const [existingLeader] = await db
    .select()
    .from(officialsTable)
    .where(and(eq(officialsTable.section, section), eq(officialsTable.isLeader, true)));

  if (existingLeader && existingLeader.id !== excludeId) {
    throw new Error("A leader is already set for this section");
  }
}

export async function createOfficial(section: OfficialSection, data: SaveOfficialInput) {
  await requireAdmin();

  if (data.isLeader) await assertLeaderAvailable(section);

  await db.insert(officialsTable).values({
    section,
    name: data.name,
    position: data.position,
    photo: data.photo,
    isLeader: data.isLeader,
  });
}

export async function updateOfficial(id: number, data: SaveOfficialInput) {
  await requireAdmin();

  const [existing] = await db.select().from(officialsTable).where(eq(officialsTable.id, id));
  if (!existing) throw new Error("Official not found");

  if (data.isLeader) await assertLeaderAvailable(existing.section, id);

  await db
    .update(officialsTable)
    .set({
      name: data.name,
      position: data.position,
      photo: data.photo,
      isLeader: data.isLeader,
      updatedAt: new Date(),
    })
    .where(eq(officialsTable.id, id));
}

export async function deleteOfficial(id: number) {
  await requireAdmin();

  await db.delete(officialsTable).where(eq(officialsTable.id, id));
}
