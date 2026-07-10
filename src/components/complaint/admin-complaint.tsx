"use client";

import { useEffect, useState } from "react";
import { FileText, Hourglass, ListFilter, Map, MapPinOff, Search, Table as TableIcon } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadMoreTrigger from "@/components/load-more-trigger";
import StatCard from "@/components/stat-card";
import AdminComplaintActionsMenu from "@/components/complaint/admin-complaint-actions-menu";
import ComplaintsMapView from "@/components/complaint/complaints-map-view";
import { getComplaintStats, getComplaints } from "@/actions/complaints";
import { statusBadgeVariant, priorityBadgeVariant, formatDate } from "@/lib/complaints";
import { complaintCategoryEnum, complaintPriorityEnum, complaintStatusEnum, type Complaint } from "@/db/schema";

const CATEGORY_FILTERS = [
  { value: "all", label: "All Categories" },
  ...complaintCategoryEnum.enumValues.map((category) => ({ value: category, label: category })),
];

const PRIORITY_FILTERS = [
  { value: "all", label: "All Priorities" },
  ...complaintPriorityEnum.enumValues.map((priority) => ({ value: priority, label: priority })),
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  ...complaintStatusEnum.enumValues.map((status) => ({ value: status, label: status })),
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function ComplaintRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
      </TableCell>
    </TableRow>
  );
}

export default function AdminComplaint() {
  const [view, setView] = useState<"table" | "map">("table");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const activeFilterCount = [
    category !== "all",
    priority !== "all",
    status !== "all",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setCategory("all");
    setPriority("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
  }

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["complaints", "admin", "stats"],
    queryFn: () => getComplaintStats(),
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [
      "complaints",
      "admin",
      { search: debouncedSearch, category, priority, status, dateFrom, dateTo },
    ],
    queryFn: ({ pageParam }) =>
      getComplaints({
        offset: pageParam,
        search: debouncedSearch,
        category: category as Complaint["category"] | "all",
        priority: priority as Complaint["priority"] | "all",
        status: status as Complaint["status"] | "all",
        dateFrom,
        dateTo,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const complaints = data?.pages.flatMap((page) => page.items) ?? [];

  // The map should plot every matching complaint, not just the first page, so keep
  // paging through the same infinite query once the admin switches to the map tab.
  useEffect(() => {
    if (view === "map" && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [view, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <StatCard
          label="Total Complaints"
          value={stats?.total ?? 0}
          description="All complaints in system"
          icon={FileText}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Pending"
          value={stats?.pending ?? 0}
          description="Awaiting review"
          icon={Hourglass}
          isLoading={isStatsLoading}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or complainant…"
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
              <DialogTitle>Filter Complaints</DialogTitle>
              <DialogDescription>
                Narrow down complaints by category, priority, status, or date range.
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
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_FILTERS.map((filter) => (
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
                <Label htmlFor="date-from">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date-to">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                Clear filters
              </Button>
              <Button onClick={() => setFiltersOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as "table" | "map")}>
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon />
            Table
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="pt-2">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    <ComplaintRowSkeleton />
                    <ComplaintRowSkeleton />
                    <ComplaintRowSkeleton />
                  </>
                ) : complaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {complaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell>
                          <p className="font-medium truncate">{complaint.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {complaint.complainantName}
                          </p>
                        </TableCell>
                        <TableCell>{complaint.category}</TableCell>
                        <TableCell>
                          <Badge variant={priorityBadgeVariant(complaint.priority)}>
                            {complaint.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(complaint.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(complaint.status)}>{complaint.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AdminComplaintActionsMenu complaint={complaint} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {hasNextPage && (
                      <LoadMoreTrigger colSpan={6} onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
                    )}
                    {isFetchingNextPage && <ComplaintRowSkeleton />}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="map" className="pt-2">
          {isLoading || (isFetchingNextPage && hasNextPage) ? (
            <Skeleton className="h-128 w-full rounded-lg" />
          ) : complaints.length === 0 ? (
            <div className="flex h-128 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
              <MapPinOff className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No complaints to display</p>
              <p className="text-sm text-muted-foreground">
                Complaints will appear here once residents file them.
              </p>
            </div>
          ) : (
            <ComplaintsMapView complaints={complaints} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
