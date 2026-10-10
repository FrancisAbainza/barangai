"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { themePreferenceEnum, userPreferencesTable, type ThemePreference } from "@/db/schema";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// null when the user has never toggled the theme, so the client keeps its local value.
export async function getMyThemePreference(): Promise<ThemePreference | null> {
  const userId = await requireUserId();

  const [row] = await db
    .select({ theme: userPreferencesTable.theme })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  return row?.theme ?? null;
}

export async function setMyThemePreference(theme: ThemePreference) {
  const userId = await requireUserId();
  if (!themePreferenceEnum.enumValues.includes(theme)) throw new Error("Invalid theme");

  await db
    .insert(userPreferencesTable)
    .values({ userId, theme })
    .onConflictDoUpdate({
      target: userPreferencesTable.userId,
      set: { theme, updatedAt: new Date() },
    });
}
