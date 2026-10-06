"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Hourglass, LayoutGrid, ListFilter, Map, MapPinOff, Search, Store, Table } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/stat-card";
import BusinessSubmissionsTable from "@/components/community-hub/business-submissions-table";
import BusinessGrid from "@/components/community-hub/business-grid";
import BusinessesMapView from "@/components/community-hub/businesses-map-view";
import { getBusinesses, getBusinessStats } from "@/actions/business";
import { BUSINESS_CATEGORIES, BUSINESS_STATUSES } from "@/schemas/business-schema";
import type { Business } from "@/db/schema";
import type { LocationValue } from "@/components/map-picker";

const CATEGORY_FILTERS = [
  { value: "all", label: "All Categories" },
  ...BUSINESS_CATEGORIES.map((category) => ({ value: category, label: category })),
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  ...BUSINESS_STATUSES.map((status) => ({ value: status, label: status })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

export default function AdminCommunityHub() {
  const [tab, setTab] = useState<"table" | "grid" | "map">("table");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    category !== "all",
    status !== "all",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setCategory("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
  }

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["businesses", "admin", "stats"],
    queryFn: () => getBusinessStats(),
  });

  // The table, grid and map are different views of the same filtered list, so they share
  // one query (and its cache) as the admin switches between tabs.
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [
      "businesses",
      "admin",
      { search: debouncedSearch, category, status, dateFrom, dateTo, sortOrder },
    ],
    queryFn: ({ pageParam }) =>
      getBusinesses({
        offset: pageParam,
        search: debouncedSearch,
        category: category as Business["category"] | "all",
        status: status as Business["status"] | "all",
        dateFrom,
        dateTo,
        sortOrder,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const businesses = data?.pages.flatMap((page) => page.items) ?? [];
  const businessesWithLocation = businesses.filter(
    (business): business is typeof business & { location: LocationValue } => !!business.location
  );

  // The map should plot every matching business, not just the first page, so keep paging
  // through the same infinite query once the admin switches to the map tab.
  useEffect(() => {
    if (tab === "map" && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [tab, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isMapLoading = isLoading || (isFetchingNextPage && hasNextPage);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <StatCard
          label="Total Businesses"
          value={stats?.total ?? 0}
          description="All businesses in system"
          icon={Store}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Pending Review"
          value={stats?.pending ?? 0}
          description="Awaiting verification"
          icon={Hourglass}
          isLoading={isStatsLoading}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="table">
            <Table />
            Table
          </TabsTrigger>
          <TabsTrigger value="grid">
            <LayoutGrid />
            Grid
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map />
            Map
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name…"
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {tab !== "map" && (
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
                <SelectTrigger className="w-40 shrink-0">
                  <ArrowUpDown className="size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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
                  <DialogDescription>
                    Narrow down businesses by category, status, or date range.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FILTERS.map((filter) => (
                          <SelectItem key={filter.value} value={filter.value}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="business-date-from">From</Label>
                    <Input
                      id="business-date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="business-date-to">To</Label>
                    <Input
                      id="business-date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={clearFilters} disabled={activeFilterCount === 0}>
                    Clear filters
                  </Button>
                  <Button onClick={() => setFiltersOpen(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="table" className="pt-2">
          <BusinessSubmissionsTable
            businesses={businesses}
            isLoading={isLoading}
            hasNextPage={!!hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        </TabsContent>

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
                Businesses with a saved location that match your search and filters will appear here.
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
