"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import NewsCard from "@/components/news/news-card";
import { getNews } from "@/actions/news";

const LATEST_NEWS_COUNT = 3;

export default function LatestNewsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["news", "latest"],
    queryFn: () => getNews({ page: 0 }),
  });

  const latestNews = data?.items.slice(0, LATEST_NEWS_COUNT) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest News</h2>
        <Link
          href="/portal/news"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : latestNews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No news posts yet.
        </p>
      ) : (
        <div className="space-y-4">
          {latestNews.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      )}
    </div>
  );
}
