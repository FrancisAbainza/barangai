"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LayoutGrid, ListFilter, Map, MapPinOff, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BusinessGrid from "@/components/community-hub/business-grid";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const activeFilterCount = category !== "all" ? 1 : 0;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["businesses", "verified", { search: debouncedSearch, category }],
    queryFn: ({ pageParam }) =>
      getVerifiedBusinesses({
        offset: pageParam,
        search: debouncedSearch,
        category: category as Business["category"] | "all",
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

        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name…"
              className="pl-8"
            />
          </div>

          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <ListFilter />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-1.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Businesses</DialogTitle>
                <DialogDescription>Narrow down businesses by category.</DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setCategory("all")} disabled={activeFilterCount === 0}>
                  Clear filters
                </Button>
                <Button onClick={() => setFiltersOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="grid" className="pt-2">
          <BusinessGrid
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
