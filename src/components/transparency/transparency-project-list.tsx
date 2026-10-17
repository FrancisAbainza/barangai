"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, List, Map, MapPinOff, Search } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import EmptyState from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTransparencyProjects } from "@/actions/transparency";
import type { TransparencyProject } from "@/db/schema";
import { TRANSPARENCY_CATEGORIES } from "@/schemas/transparency-schema";
import TransparencyProjectCard from "./transparency-project-card";
import TransparencyProjectsMapView from "./transparency-projects-map-view";

const CATEGORY_FILTERS = [
  { value: "all", label: "All Categories" },
  ...TRANSPARENCY_CATEGORIES.map((category) => ({ value: category, label: category })),
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function ProjectCardSkeleton() {
  return (
    <div className="-mx-6 border-b p-4 space-y-3 md:mx-0 md:border md:rounded-xl">
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

export default function TransparencyProjectList() {
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TransparencyProject["category"] | "all">("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["transparency-projects", { search: debouncedSearch, category }],
    queryFn: ({ pageParam }) =>
      getTransparencyProjects({ page: pageParam, search: debouncedSearch, category }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const projects = data?.pages.flatMap((page) => page.items) ?? [];

  // The map should plot every matching project, not just the first page, so keep
  // paging through the same infinite query once the admin switches to the map tab.
  useEffect(() => {
    if (view === "map" && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [view, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description…"
            className="pl-8"
          />
        </div>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as TransparencyProject["category"] | "all")}
        >
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

      <Tabs value={view} onValueChange={(value) => setView(value as "list" | "map")}>
        <TabsList>
          <TabsTrigger value="list">
            <List />
            List
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="pt-2">
          {isLoading ? (
            <div className="space-y-4">
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="No transparency projects found"
              description="Projects that match your search will appear here."
            />
          ) : (
            <div className="space-y-4">
              {projects.map((item) => (
                <TransparencyProjectCard key={item.id} project={item} />
              ))}
              {hasNextPage && (
                <LoadMoreTrigger onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
              )}
              {isFetchingNextPage && <ProjectCardSkeleton />}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="pt-2">
          {isLoading || (isFetchingNextPage && hasNextPage) ? (
            <Skeleton className="h-128 w-full rounded-lg" />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={MapPinOff}
              title="No projects to display"
              description="Projects with a location will appear here once they're added."
              className="h-128"
            />
          ) : (
            <TransparencyProjectsMapView projects={projects} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
