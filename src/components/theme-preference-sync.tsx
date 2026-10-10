"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { getMyThemePreference } from "@/actions/user-preferences";

export const THEME_PREFERENCE_QUERY_KEY = ["user-preferences", "theme"];

// Applies the signed-in user's saved theme once on load, so it follows them to devices
// whose localStorage doesn't have it yet. Later changes come from ThemeToggle.
export function ThemePreferenceSync() {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  const { data: savedTheme } = useQuery({
    queryKey: THEME_PREFERENCE_QUERY_KEY,
    queryFn: () => getMyThemePreference(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (applied.current || savedTheme === undefined) return;
    applied.current = true;
    if (savedTheme) setTheme(savedTheme);
  }, [savedTheme, setTheme]);

  return null;
}
