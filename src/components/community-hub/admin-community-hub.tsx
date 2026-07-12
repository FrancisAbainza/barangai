"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Hourglass, Inbox, ListFilter, Map, MapPinOff, Search, Store } from "lucide-react";
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
import VerifiedBusinessGrid from "@/components/community-hub/verified-business-grid";
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

export default function AdminCommunityHub() {
  const [tab, setTab] = useState<"submissions" | "verified" | "map">("submissions");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [verifiedSearch, setVerifiedSearch] = useState("");
  const debouncedSubmissionSearch = useDebouncedValue(submissionSearch, 300);
  const debouncedVerifiedSearch = useDebouncedValue(verifiedSearch, 300);

  const [submissionCategory, setSubmissionCategory] = useState("all");
  const [submissionStatus, setSubmissionStatus] = useState("all");
  const [submissionDateFrom, setSubmissionDateFrom] = useState("");
  const [submissionDateTo, setSubmissionDateTo] = useState("");
  const [submissionFiltersOpen, setSubmissionFiltersOpen] = useState(false);

  const submissionActiveFilterCount = [
    submissionCategory !== "all",
    submissionStatus !== "all",
    submissionDateFrom !== "",
    submissionDateTo !== "",
  ].filter(Boolean).length;

  function clearSubmissionFilters() {
    setSubmissionCategory("all");
    setSubmissionStatus("all");
    setSubmissionDateFrom("");
    setSubmissionDateTo("");
  }

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["businesses", "admin", "stats"],
    queryFn: () => getBusinessStats(),
  });

  const {
    data: submissionsData,
    isLoading: isSubmissionsLoading,
    fetchNextPage: fetchNextSubmissionsPage,
    hasNextPage: hasNextSubmissionsPage,
    isFetchingNextPage: isFetchingNextSubmissionsPage,
  } = useInfiniteQuery({
    queryKey: [
      "businesses",
      "admin",
      "submissions",
      {
        search: debouncedSubmissionSearch,
        category: submissionCategory,
        status: submissionStatus,
        dateFrom: submissionDateFrom,
        dateTo: submissionDateTo,
      },
    ],
    queryFn: ({ pageParam }) =>
      getBusinesses({
        offset: pageParam,
        search: debouncedSubmissionSearch,
        category: submissionCategory as Business["category"] | "all",
        status: submissionStatus as Business["status"] | "all",
        dateFrom: submissionDateFrom,
        dateTo: submissionDateTo,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const {
    data: verifiedData,
    isLoading: isVerifiedLoading,
    fetchNextPage: fetchNextVerifiedPage,
    hasNextPage: hasNextVerifiedPage,
    isFetchingNextPage: isFetchingNextVerifiedPage,
  } = useInfiniteQuery({
    queryKey: ["businesses", "admin", "verified", { search: debouncedVerifiedSearch }],
    queryFn: ({ pageParam }) =>
      getBusinesses({ offset: pageParam, search: debouncedVerifiedSearch, status: "Verified" }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const submissions = submissionsData?.pages.flatMap((page) => page.items) ?? [];
  const verifiedBusinesses = verifiedData?.pages.flatMap((page) => page.items) ?? [];
  const businessesWithLocation = verifiedBusinesses.filter(
    (business): business is typeof business & { location: LocationValue } => !!business.location
  );

  // The map should plot every verified business, not just the first page, so keep paging
  // through the same infinite query once the admin switches to the map tab.
  useEffect(() => {
    if (tab === "map" && hasNextVerifiedPage && !isFetchingNextVerifiedPage) {
      fetchNextVerifiedPage();
    }
  }, [tab, hasNextVerifiedPage, isFetchingNextVerifiedPage, fetchNextVerifiedPage]);

  const isMapLoading = isVerifiedLoading || (isFetchingNextVerifiedPage && hasNextVerifiedPage);

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
          <TabsTrigger value="submissions">
            <Inbox />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="verified">
            <BadgeCheck />
            Verified
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4 pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                placeholder="Search by business name…"
                className="pl-8"
              />
            </div>

            <Dialog open={submissionFiltersOpen} onOpenChange={setSubmissionFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <ListFilter />
                  Filters
                  {submissionActiveFilterCount > 0 && (
                    <Badge variant="secondary" className="rounded-full px-1.5">
                      {submissionActiveFilterCount}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter Submissions</DialogTitle>
                  <DialogDescription>
                    Narrow down business submissions by category, status, or date range.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={submissionCategory} onValueChange={setSubmissionCategory}>
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
                    <Select value={submissionStatus} onValueChange={setSubmissionStatus}>
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
                    <Label htmlFor="submission-date-from">From</Label>
                    <Input
                      id="submission-date-from"
                      type="date"
                      value={submissionDateFrom}
                      onChange={(e) => setSubmissionDateFrom(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="submission-date-to">To</Label>
                    <Input
                      id="submission-date-to"
                      type="date"
                      value={submissionDateTo}
                      onChange={(e) => setSubmissionDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={clearSubmissionFilters}
                    disabled={submissionActiveFilterCount === 0}
                  >
                    Clear filters
                  </Button>
                  <Button onClick={() => setSubmissionFiltersOpen(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <BusinessSubmissionsTable
            businesses={submissions}
            isLoading={isSubmissionsLoading}
            hasNextPage={!!hasNextSubmissionsPage}
            fetchNextPage={fetchNextSubmissionsPage}
            isFetchingNextPage={isFetchingNextSubmissionsPage}
          />
        </TabsContent>

        <TabsContent value="verified" className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={verifiedSearch}
              onChange={(e) => setVerifiedSearch(e.target.value)}
              placeholder="Search by business name…"
              className="pl-8"
            />
          </div>

          <VerifiedBusinessGrid
            businesses={verifiedBusinesses}
            isLoading={isVerifiedLoading}
            hasNextPage={!!hasNextVerifiedPage}
            fetchNextPage={fetchNextVerifiedPage}
            isFetchingNextPage={isFetchingNextVerifiedPage}
          />
        </TabsContent>

        <TabsContent value="map" className="pt-2">
          {isMapLoading ? (
            <Skeleton className="h-128 w-full rounded-lg" />
          ) : businessesWithLocation.length === 0 ? (
            <div className="flex h-128 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
              <MapPinOff className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No verified businesses to display</p>
              <p className="text-sm text-muted-foreground">
                Businesses with a saved location will appear here once verified.
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
