import type { ReactNode } from "react";
import { CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

// Blue while the arrow can move the carousel, white once it can't.
const arrowClassName =
  "static size-11 rounded-xl disabled:border-primary/30 disabled:bg-background disabled:text-primary-deep/40 disabled:opacity-100 [&_svg:not([class*='size-'])]:size-5";

// The landing page's carousel arrows, with anything passed as children (e.g. a slide counter) between them.
export default function CarouselArrows({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CarouselPrevious variant="default" className={arrowClassName} />
      {children}
      <CarouselNext variant="default" className={arrowClassName} />
    </div>
  );
}
