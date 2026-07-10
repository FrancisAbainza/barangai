"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getNews } from "@/actions/news";
import { newsCategoryEnum, type News } from "@/db/schema";
import NewsCard from "./news-card";

const CATEGORY_FILTERS = [
  { value: "all", label: "All Categories" },
  ...newsCategoryEnum.enumValues.map((category) => ({ value: category, label: category })),
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<News["category"] | "all">("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["news", { search: debouncedSearch, category }],
    queryFn: ({ pageParam }) => getNews({ page: pageParam, search: debouncedSearch, category }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const news = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or content…"
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value as News["category"] | "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <NewsCardSkeleton />
          <NewsCardSkeleton />
          <NewsCardSkeleton />
        </div>
      ) : news.length === 0 ? (
        <p className="text-center py-16 text-sm text-muted-foreground">No news posts found.</p>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
          {hasNextPage && (
            <LoadMoreTrigger onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
          )}
          {isFetchingNextPage && <NewsCardSkeleton />}
        </div>
      )}
    </div>
  );
}
