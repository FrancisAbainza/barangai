"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getAuditChanges, logAudit } from "@/lib/audit";
import { db } from "@/db/config";
import { barangaySettingsTable } from "@/db/schema";
import {
  barangayAddress,
  barangayEmail,
  barangayGoal,
  barangayHotline1,
  barangayHotline2,
  barangayMission,
  barangayVision,
  DEFAULT_CLEARANCE_PURPOSE_FEES,
  DEFAULT_COURT_DAY_RATE,
  DEFAULT_COURT_NIGHT_RATE,
  DEFAULT_GCASH_NUMBER,
  PAID_CLEARANCE_PURPOSES,
  type ClearancePurposeFees,
} from "@/lib/data";

export type BarangaySettingsValues = {
  gcashNumber: string;
  clearancePurposeFees: ClearancePurposeFees;
  courtDayRate: number;
  courtNightRate: number;
  goal: string;
  mission: string;
  vision: string;
  hotline1: string;
  hotline2: string;
  email: string;
  address: string;
};

const DEFAULT_SETTINGS: BarangaySettingsValues = {
  gcashNumber: DEFAULT_GCASH_NUMBER,
  clearancePurposeFees: DEFAULT_CLEARANCE_PURPOSE_FEES,
  courtDayRate: DEFAULT_COURT_DAY_RATE,
  courtNightRate: DEFAULT_COURT_NIGHT_RATE,
  goal: barangayGoal,
  mission: barangayMission,
  vision: barangayVision,
  hotline1: barangayHotline1,
  hotline2: barangayHotline2,
  email: barangayEmail,
  address: barangayAddress,
};

export async function getBarangaySettings(): Promise<BarangaySettingsValues> {
  const [settings] = await db.select().from(barangaySettingsTable).where(eq(barangaySettingsTable.id, 1));
  if (!settings) return DEFAULT_SETTINGS;

  return {
    gcashNumber: settings.gcashNumber,
    clearancePurposeFees: settings.clearancePurposeFees,
    courtDayRate: settings.courtDayRate,
    courtNightRate: settings.courtNightRate,
    goal: settings.goal,
    mission: settings.mission,
    vision: settings.vision,
    hotline1: settings.hotline1,
    hotline2: settings.hotline2,
    email: settings.email,
    address: settings.address,
  };
}

const SETTINGS_AUDIT_LABELS = {
  gcashNumber: "GCash Number",
  courtDayRate: "Court Day Rate",
  courtNightRate: "Court Night Rate",
  goal: "Goal",
  mission: "Mission",
  vision: "Vision",
  hotline1: "Hotline 1",
  hotline2: "Hotline 2",
  email: "Email",
  address: "Address",
};

const CLEARANCE_FEE_AUDIT_LABELS = Object.fromEntries(
  PAID_CLEARANCE_PURPOSES.map((purpose) => [purpose, `Clearance Fee (${purpose})`])
);

// Accepts a partial update so each Barangay Settings page section can submit only the
// fields it owns without clobbering the rest of this single shared settings row.
export async function updateBarangaySettings(data: Partial<BarangaySettingsValues>) {
  await requireAdmin();

  const current = await getBarangaySettings();
  const merged = { ...current, ...data };

  await db
    .insert(barangaySettingsTable)
    .values({ id: 1, ...merged, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: barangaySettingsTable.id,
      set: { ...merged, updatedAt: new Date() },
    });

  // Every public page's hotline bar, plus the landing and About Us pages, renders these
  // settings on the server.
  revalidatePath("/", "layout");

  const changes = [
    ...getAuditChanges(current, merged, SETTINGS_AUDIT_LABELS),
    ...getAuditChanges(current.clearancePurposeFees, merged.clearancePurposeFees, CLEARANCE_FEE_AUDIT_LABELS),
  ];
  if (changes.length > 0) {
    await logAudit({
      action: "updated",
      entityType: "barangay-settings",
      entityId: 1,
      summary: `Updated ${changes.map((change) => change.label).join(", ")}`,
      changes,
    });
  }
}
