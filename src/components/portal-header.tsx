"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { barangayLogoSrc, barangayName } from "@/lib/data";

export default function PortalHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card py-2 px-4 md:hidden">
      <div className="container flex h-full m-auto items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={barangayLogoSrc}
            alt={`${barangayName} logo`}
            width={50}
            height={50}
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Republic of the Philippines
            </p>
            <p className="text-base font-bold leading-tight text-foreground">
              {barangayName}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
