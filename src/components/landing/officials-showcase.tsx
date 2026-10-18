"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, UserRound, UserRoundX } from "lucide-react";
import { getOfficials } from "@/actions/officials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, useCarousel } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/animations";
import CarouselArrows from "@/components/landing/carousel-arrows";
import { barangayLogoSrc } from "@/lib/data";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import type { Official } from "@/db/schema";

function OfficialPhoto({ official, className }: { official: Official; className?: string }) {
  const photoKey = official.photo[0]?.key;

  return (
    <div className={cn("relative overflow-hidden bg-primary/15 text-primary/60", className)}>
      {photoKey ? (
        <Image
          src={fetchFile(photoKey)}
          alt={official.name}
          fill
          sizes="280px"
          className="object-cover object-top"
          unoptimized
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <UserRound className="size-12" />
        </div>
      )}
    </div>
  );
}

// Whole cards per view (2, then 3, 4 and 5 as the screen widens), so the next one never peeks in.
const councilItemClassName = "basis-1/2 pl-4 sm:pl-5 md:basis-1/3 lg:basis-1/4 2xl:basis-1/5";

// Hidden while every card already fits.
function CouncilArrows() {
  const { canScrollPrev, canScrollNext } = useCarousel();
  if (!canScrollPrev && !canScrollNext) return null;

  return <CarouselArrows className="justify-center" />;
}

export default function OfficialsShowcase() {
  const { data: barangayOfficials, isLoading: isBarangayLoading } = useQuery({
    queryKey: ["officials", "barangay"],
    queryFn: () => getOfficials("barangay"),
  });
  const { data: skOfficials, isLoading: isSkLoading } = useQuery({
    queryKey: ["officials", "sk"],
    queryFn: () => getOfficials("sk"),
  });

  if (isBarangayLoading || isSkLoading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-96 w-full rounded-xl" />
        <div className="-ml-4 flex overflow-hidden sm:-ml-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={cn("shrink-0", councilItemClassName)}>
              <Skeleton className="aspect-7/10 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Admins order each section in Barangay Settings, so the first official is the section's head.
  // The carousel lists the rest of the barangay officials, then every SK official.
  const [leader, ...others] = barangayOfficials ?? [];
  if (!leader) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-foreground/70">
        <UserRoundX className="size-8" />
        <p className="text-sm">No officials added yet.</p>
      </div>
    );
  }
  const council = [...others, ...(skOfficials ?? [])];

  return (
    <div className="flex flex-col gap-10">
      {/* Stacked and centered on phones, photo beside the text from sm up. */}
      <Reveal className="relative flex flex-col items-center gap-6 overflow-hidden rounded-xl bg-primary/8 p-6 text-center sm:flex-row sm:gap-8 sm:p-8 sm:text-left">
        {/* Faded full-height logo on the right on desktop, like the portal home's welcome banner. */}
        <Image
          src={barangayLogoSrc}
          alt=""
          aria-hidden
          width={400}
          height={400}
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto opacity-15 select-none lg:block"
        />
        <OfficialPhoto official={leader} className="aspect-14/17 w-full max-w-56 shrink-0 rounded-xl sm:max-w-70" />
        <div className="relative flex min-w-0 flex-col items-center gap-2.5 sm:items-start">
          <Badge className="h-auto rounded-xl px-3 py-1.5 text-[0.8125rem] font-bold tracking-wider uppercase">
            {leader.position}
          </Badge>
          <h3 className="text-2xl leading-tight font-bold text-balance sm:text-3xl">{leader.name}</h3>
          <Button asChild variant="link" className="h-auto px-0 text-base font-semibold">
            <Link href="/about-us">
              Meet all barangay and SK officials
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Reveal>

      {council.length > 0 && (
        <RevealGroup stagger={0.08}>
          <Carousel opts={{ align: "start", slidesToScroll: "auto" }} aria-label="Barangay and SK officials" className="flex flex-col gap-5">
            <CarouselContent className="-ml-4 sm:-ml-5">
              {council.map((official) => (
                <CarouselItem key={official.id} className={councilItemClassName}>
                  <RevealItem className="h-full">
                    <Card className="h-full overflow-hidden shadow-none">
                      <OfficialPhoto official={official} className="aspect-7/8" />
                      <CardContent className="flex flex-col items-center gap-1 p-3 text-center sm:gap-1.5 sm:p-5">
                        <h3 className="text-[0.9375rem] leading-snug font-bold text-balance sm:text-[1.0625rem]">
                          {official.name}
                        </h3>
                        <p className="text-[0.8125rem] text-foreground/70 sm:text-sm">{official.position}</p>
                      </CardContent>
                    </Card>
                  </RevealItem>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CouncilArrows />
          </Carousel>
        </RevealGroup>
      )}
    </div>
  );
}
