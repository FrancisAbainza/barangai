"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LayoutGrid, Map, MapPinOff, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VerifiedBusinessGrid from "@/components/community-hub/verified-business-grid";
import BusinessesMapView from "@/components/community-hub/businesses-map-view";
import { getVerifiedBusinesses } from "@/actions/business";
import { BUSINESS_CATEGORIES } from "@/schemas/business-schema";
import type { Business } from "@/db/schema";
import type { LocationValue } from "@/components/map-picker";

const CATEGORY_FILTERS = [{ value: "all", label: "All Categories" }, ...BUSINESS_CATEGORIES.map((category) => ({ value: category, label: category }))];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

export default function ResidentCommunityHub() {
  const [tab, setTab] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [mine, setMine] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["businesses", "verified", { search: debouncedSearch, category, mine }],
    queryFn: ({ pageParam }) =>
      getVerifiedBusinesses({
        offset: pageParam,
        search: debouncedSearch,
        category: category as Business["category"] | "all",
        mine,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const businesses = data?.pages.flatMap((page) => page.items) ?? [];
  const businessesWithLocation = businesses.filter(
    (business): business is typeof business & { location: LocationValue } => !!business.location
  );

  // The map should plot every matching business, not just the first page, so keep paging
  // through the same infinite query once the resident switches to the map tab.
  useEffect(() => {
    if (tab === "map" && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [tab, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isMapLoading = isLoading || (isFetchingNextPage && hasNextPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name…"
            className="pl-8"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-52">
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

        <Button
          type="button"
          variant={mine ? "default" : "outline"}
          onClick={() => setMine((prev) => !prev)}
          className="shrink-0"
        >
          <User />
          My Business
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="grid">
            <LayoutGrid />
            Grid
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="pt-2">
          <VerifiedBusinessGrid
            businesses={businesses}
            isLoading={isLoading}
            hasNextPage={!!hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </TabsContent>

        <TabsContent value="map" className="pt-2">
          {isMapLoading ? (
            <Skeleton className="h-128 w-full rounded-lg" />
          ) : businessesWithLocation.length === 0 ? (
            <div className="flex h-128 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
              <MapPinOff className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No businesses to display</p>
              <p className="text-sm text-muted-foreground">
                Businesses with a saved location will appear here.
              </p>
            </div>
          ) : (
            <BusinessesMapView businesses={businessesWithLocation} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
