"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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
import AdminComplaintActionsMenu from "@/components/complaint/admin-complaint-actions-menu";
import ComplaintsMapView from "@/components/complaint/complaints-map-view";
import { getComplaints } from "@/actions/complaints";
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
  const debouncedSearch = useDebouncedValue(search, 300);

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
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject or complainant…"
            className="pl-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

          <div className="flex gap-2 space-y-1">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="flex gap-2 space-y-1">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as "table" | "map")}>
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
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
          ) : (
            <ComplaintsMapView complaints={complaints} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
