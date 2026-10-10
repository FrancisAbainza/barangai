"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Dark mode is a portal-only feature: the public pages always render light, even when
// the visitor's saved preference is dark.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme={isPortal ? undefined : "light"}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
