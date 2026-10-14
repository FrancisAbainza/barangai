"use client";

import { useEffect, useState } from "react";
import { UserRoundX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { getOfficials, type OfficialSection } from "@/actions/officials";
import OfficialCard, { OfficialCardSkeleton } from "./official-card";
import SectionHeading, { type SectionHeadingProps } from "./section-heading";

interface OfficialsCarouselProps extends SectionHeadingProps {
  section: OfficialSection;
}

// Slides are sized off the section's width (container queries) rather than the viewport's,
// since the portal sidebar takes a varying share of the screen.
const slideClassName = "basis-full @md:basis-1/2 @3xl:basis-1/3 @5xl:basis-1/4";

// Below @lg the arrows sit under the cards, beside the page bars, so they never cover a photo.
// From @lg up they flank the cards, hidden (but still holding their column) when disabled.
const arrowClassName =
  "static row-2 shadow-md disabled:opacity-30 @lg:row-1 @lg:disabled:opacity-0 [&_svg:not([class*='size-'])]:size-5";

export default function OfficialsCarousel({ title, highlight, description, section }: OfficialsCarouselProps) {
  const { data: officials, isLoading } = useQuery({
    queryKey: ["officials", section],
    queryFn: () => getOfficials(section),
  });

  const [api, setApi] = useState<CarouselApi>();
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentPage(api.selectedScrollSnap());
    // Each scroll snap is a page of cards, and the cards per page follow the section's width.
    const onReInit = () => {
      setPageCount(api.scrollSnapList().length);
      onSelect();
    };
    onReInit();
    api.on("select", onSelect);
    api.on("reInit", onReInit);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onReInit);
    };
  }, [api]);

  return (
    <section className="@container space-y-8 py-6">
      <SectionHeading title={title} highlight={highlight} description={description} />

      {isLoading ? (
        <div className="overflow-hidden @lg:mx-14">
          <div className="-ml-4 flex py-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={cn("min-w-0 shrink-0 pl-4", slideClassName)}>
                <OfficialCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      ) : !officials?.length ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 py-10 text-center text-muted-foreground">
          <UserRoundX className="size-8" />
          <p className="text-sm">No officials added yet.</p>
        </div>
      ) : (
        <Carousel
          setApi={setApi}
          opts={{ align: "start", slidesToScroll: "auto" }}
          aria-label={`${title} ${highlight}`}
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 @lg:gap-x-4">
            <div className="col-span-full row-1 @lg:col-2">
              {/* Centers the cards while they all fit. "safe" falls back to start alignment once
                  they overflow, which is what Embla's scroll math expects. */}
              <CarouselContent className="justify-center-safe py-2">
                {officials.map((official) => (
                  <CarouselItem key={official.id} className={slideClassName}>
                    <OfficialCard official={official} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </div>

            <CarouselPrevious
              variant="default"
              size="icon-lg"
              className={cn(arrowClassName, "col-1", pageCount <= 1 && "@max-lg:hidden")}
            />
            <CarouselNext
              variant="default"
              size="icon-lg"
              className={cn(arrowClassName, "col-3", pageCount <= 1 && "@max-lg:hidden")}
            />

            {pageCount > 1 && (
              <div className="col-2 row-2 flex justify-center gap-2">
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to page ${index + 1}`}
                    aria-current={index === currentPage}
                    onClick={() => api?.scrollTo(index)}
                    className="group/page max-w-28 min-w-0 flex-1 py-2"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-colors",
                        index === currentPage
                          ? "bg-primary"
                          : "bg-muted-foreground/25 group-hover/page:bg-muted-foreground/40"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Carousel>
      )}
    </section>
  );
}
