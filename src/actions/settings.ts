"use server";

import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import { barangaySettingsTable } from "@/db/schema";
import {
  DEFAULT_CLEARANCE_PURPOSE_FEES,
  DEFAULT_COURT_DAY_RATE,
  DEFAULT_COURT_NIGHT_RATE,
  DEFAULT_GCASH_NUMBER,
  type ClearancePurposeFees,
} from "@/lib/data";

export type BarangaySettingsValues = {
  gcashNumber: string;
  clearancePurposeFees: ClearancePurposeFees;
  courtDayRate: number;
  courtNightRate: number;
};

const DEFAULT_SETTINGS: BarangaySettingsValues = {
  gcashNumber: DEFAULT_GCASH_NUMBER,
  clearancePurposeFees: DEFAULT_CLEARANCE_PURPOSE_FEES,
  courtDayRate: DEFAULT_COURT_DAY_RATE,
  courtNightRate: DEFAULT_COURT_NIGHT_RATE,
};

export async function getBarangaySettings(): Promise<BarangaySettingsValues> {
  const [settings] = await db.select().from(barangaySettingsTable).where(eq(barangaySettingsTable.id, 1));
  if (!settings) return DEFAULT_SETTINGS;

  return {
    gcashNumber: settings.gcashNumber,
    clearancePurposeFees: settings.clearancePurposeFees,
    courtDayRate: settings.courtDayRate,
    courtNightRate: settings.courtNightRate,
  };
}

// Accepts a partial update so callers (the document request settings dialog, the court
// reservation settings dialog) can each submit only the fields they own without clobbering
// the rest of this single shared settings row.
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
}
