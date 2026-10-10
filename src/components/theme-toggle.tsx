"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setMyThemePreference } from "@/actions/user-preferences";
import { THEME_PREFERENCE_QUERY_KEY } from "@/components/theme-preference-sync";
import type { ThemePreference } from "@/db/schema";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { mutate: saveTheme } = useMutation({
    mutationFn: (theme: ThemePreference) => setMyThemePreference(theme),
    onSuccess: (_, theme) => queryClient.setQueryData(THEME_PREFERENCE_QUERY_KEY, theme),
    onError: () => toast.error("Couldn't save your theme preference."),
  });

  const handleToggle = () => {
    const next: ThemePreference = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
  };

  // The icon switches on the `.dark` class rather than resolvedTheme, which is
  // undefined during SSR and would cause a hydration mismatch.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggle}
          aria-label="Toggle dark mode"
          className="shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Toggle dark mode</TooltipContent>
    </Tooltip>
  );
}
