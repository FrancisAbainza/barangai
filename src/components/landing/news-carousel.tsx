"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { getNews } from "@/actions/news";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import CarouselArrows from "@/components/landing/carousel-arrows";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";

const FEATURED_NEWS_COUNT = 3;

// The latest posts as a photo carousel that peeks at the next photo from md up. The text beside it
// follows whichever post is selected.
export default function NewsCarousel() {
  const { data, isLoading } = useQuery({
    queryKey: ["news", "latest"],
    queryFn: () => getNews({ page: 0 }),
  });
  const news = data?.items.slice(0, FEATURED_NEWS_COUNT) ?? [];

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
        <div className="flex flex-col gap-4 lg:w-104 lg:shrink-0">
          <Skeleton className="h-6 w-40 bg-background/60" />
          <Skeleton className="h-16 w-full bg-background/60" />
          <Skeleton className="h-20 w-full bg-background/60" />
          <Skeleton className="h-12 w-36 bg-background/60" />
        </div>
        <Skeleton className="h-72 flex-1 rounded-xl bg-background/60 sm:h-96 lg:h-104" />
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-primary/30 py-10 text-center text-sm text-foreground/70">
        No news posts yet.
      </p>
    );
  }
  const selected = Math.min(current, news.length - 1);

  return (
    <Carousel setApi={setApi} opts={{ align: "start" }} aria-label="Latest news" className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
        {/* Every post's text shares one grid cell, so the column keeps the height of the longest
            post instead of resizing the section on each slide. Only the selected post's text shows. */}
        <div aria-live="polite" className="grid min-w-0 lg:w-104 lg:shrink-0">
          {news.map((item, index) => (
            // The newly selected post's text rises in. The previous one hides at once.
            <motion.div
              key={item.id}
              initial={false}
              animate={index === selected ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "col-start-1 row-start-1 flex flex-col gap-4",
                // The badge and button transition every property, visibility included, which would keep
                // the previous post's text showing over the new one for a moment.
                index !== selected && "invisible **:transition-none",
              )}
            >
              <div className="flex items-center gap-3 text-sm">
                <Badge className="h-auto rounded-xl bg-background px-3 py-1 text-sm font-semibold text-primary">
                  {item.category}
                </Badge>
                <time dateTime={new Date(item.createdAt).toISOString()} className="text-foreground/80">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
              <h3 className="line-clamp-3 text-2xl leading-snug font-semibold text-pretty">{item.title}</h3>
              <p className="line-clamp-3 text-lg leading-relaxed whitespace-pre-line text-foreground/80">
                {item.content}
              </p>
              <Button asChild size="lg" className="mt-auto h-12 self-start rounded-xl px-5 font-bold">
                <Link href={`/news/${item.id}`}>View full post</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* The vertical padding keeps the photos' shadow inside the carousel's clipping box. */}
          <CarouselContent className="-ml-6 pt-4 pb-8">
            {news.map((item, index) => {
              const image = item.media.find((media) => media.type === "image" && media.key);
              return (
                <CarouselItem
                  key={item.id}
                  className={cn("flex h-72 items-center pl-6 sm:h-96 lg:h-104", news.length > 1 && "md:basis-[85%]")}
                >
                  {/* From md up, the posts peeking beside the selected one are shorter and faded. Their
                      slide keeps its full height, so the carousel doesn't resize while they grow and shrink. */}
                  <div
                    className={cn(
                      "relative h-full w-full overflow-hidden rounded-xl bg-primary/25 shadow-lg shadow-primary-deep/20 transition-[height,opacity] duration-300",
                      index !== selected && "md:h-[82%] md:opacity-60",
                    )}
                  >
                    {/* The whole photo is shown. A blurred copy behind it made swiping lag on phones. */}
                    {image?.key ? (
                      <Image
                        src={fetchFile(image.key)}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 600px, 85vw"
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 text-primary">
                        <ImageIcon className="size-10" />
                        <span className="text-sm">No photo</span>
                      </div>
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </div>
      </div>

      {news.length > 1 && (
        <CarouselArrows className="justify-center gap-4">
          <span className="min-w-16 text-center text-lg font-semibold tabular-nums">
            {selected + 1} / {news.length}
          </span>
        </CarouselArrows>
      )}
    </Carousel>
  );
}
