"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setFilipino, useIsFilipino } from "@/components/google-translate";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  className?: string;
  // Shows the language it switches to next to the icon, for the public header.
  showLabel?: boolean;
};

// translate="no" keeps Google from translating the toggle itself, so "English" stays findable.
export function LanguageToggle({ className, showLabel = false }: LanguageToggleProps) {
  const isFilipino = useIsFilipino();
  const label = isFilipino ? "Back to English" : "Translate to Filipino";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? "sm" : "icon-sm"}
          onClick={() => setFilipino(!isFilipino)}
          aria-label={label}
          translate="no"
          className={cn("shrink-0", className)}
        >
          <Languages />
          {showLabel && (isFilipino ? "English" : "Filipino")}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={showLabel ? "bottom" : "right"} translate="no">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
