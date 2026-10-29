"use server";

import { and, eq, max } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getAuditChanges, logAudit } from "@/lib/audit";
import { db } from "@/db/config";
import { officialsTable, type Official } from "@/db/schema";
import type { OfficialFormValues } from "@/schemas/about-us-schema";
import type { MediaItem } from "@/components/file-uploader";

export type OfficialSection = "barangay" | "sk";

type SaveOfficialInput = Omit<OfficialFormValues, "photo"> & {
  photo: Omit<MediaItem, "file">[];
};

const SECTION_LABELS: Record<OfficialSection, string> = {
  barangay: "Barangay Officials",
  sk: "Sangguniang Kabataan",
};

// The fields an official's audit log entries keep. The photo isn't compared.
const OFFICIAL_AUDIT_LABELS = {
  name: "Name",
  position: "Position",
};

export async function getOfficials(section: OfficialSection): Promise<Official[]> {
  return db
    .select()
    .from(officialsTable)
    .where(eq(officialsTable.section, section))
    // Ties (rows never reordered share the default 0) fall back to creation order.
    .orderBy(officialsTable.sortOrder, officialsTable.id);
}

export async function createOfficial(section: OfficialSection, data: SaveOfficialInput) {
  await requireAdmin();

  // New officials go to the end of their section's order.
  const [{ lastOrder }] = await db
    .select({ lastOrder: max(officialsTable.sortOrder) })
    .from(officialsTable)
    .where(eq(officialsTable.section, section));

  const [official] = await db
    .insert(officialsTable)
    .values({
      section,
      name: data.name,
      position: data.position,
      photo: data.photo,
      sortOrder: (lastOrder ?? -1) + 1,
    })
    .returning({ id: officialsTable.id });

  await logAudit({
    action: "created",
    entityType: "official",
    entityId: official.id,
    summary: `Added ${data.name} (${data.position}) to ${SECTION_LABELS[section]}`,
    changes: getAuditChanges({}, data, OFFICIAL_AUDIT_LABELS),
  });
}

// `orderedIds` is the section's full list in its new order.
export async function reorderOfficials(section: OfficialSection, orderedIds: number[]) {
  await requireAdmin();

  const [first, ...rest] = orderedIds.map((id, index) =>
    db
      .update(officialsTable)
      .set({ sortOrder: index })
      .where(and(eq(officialsTable.id, id), eq(officialsTable.section, section)))
  );
  if (!first) return;

  // A batch runs as one transaction, so the new order is saved all or nothing.
  await db.batch([first, ...rest]);

  await logAudit({
    action: "reordered",
    entityType: "official",
    entityId: section,
    summary: `Reordered ${SECTION_LABELS[section]}`,
  });
}

export async function updateOfficial(id: number, data: SaveOfficialInput) {
  await requireAdmin();

  const [existing] = await db.select().from(officialsTable).where(eq(officialsTable.id, id));
  if (!existing) throw new Error("Official not found");

  await db
    .update(officialsTable)
    .set({
      name: data.name,
      position: data.position,
      photo: data.photo,
      updatedAt: new Date(),
    })
    .where(eq(officialsTable.id, id));

  await logAudit({
    action: "updated",
    entityType: "official",
    entityId: id,
    summary: `Edited official ${data.name}`,
    changes: getAuditChanges(existing, data, OFFICIAL_AUDIT_LABELS),
  });
}

export async function deleteOfficial(id: number) {
  await requireAdmin();

  const [existing] = await db.select().from(officialsTable).where(eq(officialsTable.id, id));
  if (!existing) throw new Error("Official not found");

  await db.delete(officialsTable).where(eq(officialsTable.id, id));

  await logAudit({
    action: "deleted",
    entityType: "official",
    entityId: id,
    summary: `Removed ${existing.name} (${existing.position}) from ${SECTION_LABELS[existing.section]}`,
    changes: getAuditChanges(existing, {}, OFFICIAL_AUDIT_LABELS),
  });
}
