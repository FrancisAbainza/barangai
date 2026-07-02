"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Calendar, LayoutList, Megaphone, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNews } from "@/actions/news";
import NewsCard from "./news-card";

type FilterTab = "All" | "Announcement" | "Event" | "Emergency";

const TABS: { label: string; value: FilterTab; icon: LucideIcon }[] = [
  { label: "All", value: "All", icon: LayoutList },
  { label: "Announcements", value: "Announcement", icon: Megaphone },
  { label: "Events", value: "Event", icon: Calendar },
  { label: "Emergency", value: "Emergency", icon: TriangleAlert },
];

function NewsCardSkeleton() {
  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-5 w-28 rounded-full" />
      <Skeleton className="h-5 w-3/4" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

function LoadMoreTrigger({ onIntersect, disabled }: { onIntersect: () => void; disabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onIntersect();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);

  return <div ref={ref} className="h-1" />;
}

export default function NewsList() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["news"],
    queryFn: ({ pageParam }) => getNews({ page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const news = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Tabs defaultValue="All">
      <TabsList className="w-full">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
            <tab.icon className="size-3.5" />
            <span className="hidden md:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((tab) => {
        const filtered =
          tab.value === "All"
            ? news
            : news.filter((n) => n.category === tab.value);

        return (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4 mt-4">
            {isLoading ? (
              <>
                <NewsCardSkeleton />
                <NewsCardSkeleton />
                <NewsCardSkeleton />
              </>
            ) : filtered.length === 0 ? (
              <p className="text-center py-16 text-sm text-muted-foreground">
                No news posts found.
              </p>
            ) : (
              <>
                {filtered.map((item) => (
                  <NewsCard key={item.id} news={item} />
                ))}
                {hasNextPage && (
                  <LoadMoreTrigger onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
                )}
                {isFetchingNextPage && <NewsCardSkeleton />}
              </>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
