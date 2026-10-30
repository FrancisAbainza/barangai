"use client";

import { useEffect, useState } from "react";
import { ListFilter, ScrollText, Search } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
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
import DatePicker from "@/components/date-picker";
import EmptyState from "@/components/empty-state";
import LoadMoreTrigger from "@/components/load-more-trigger";
import ViewAuditLogDialog from "@/components/audit-logs/view-audit-log-dialog";
import { getAuditLogs } from "@/actions/audit-logs";
import type { AuditLogWithActor } from "@/lib/audit";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  auditActionBadgeVariant,
  type AuditAction,
  type AuditEntityType,
} from "@/lib/audit-logs";
import { roleLabel } from "@/lib/roles";

const CATEGORY_FILTERS = [
  { value: "all", label: "All Categories" },
  ...Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({ value, label })),
];

const ACTION_FILTERS = [
  { value: "all", label: "All Actions" },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function formatLogDate(date: Date) {
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LogRowSkeleton({ showActor }: { showActor: boolean }) {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      {showActor && (
        <TableCell>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </TableCell>
      )}
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-64" />
      </TableCell>
    </TableRow>
  );
}

// With `actorId`, only that admin's actions, for the Audit Logs on their profile.
export default function AuditLogsTable({ actorId }: { actorId?: string }) {
  const showActor = !actorId;
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewedLog, setViewedLog] = useState<AuditLogWithActor | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const activeFilterCount = [entityType !== "all", action !== "all", dateFrom !== "", dateTo !== ""].filter(
    Boolean
  ).length;

  function clearFilters() {
    setEntityType("all");
    setAction("all");
    setDateFrom("");
    setDateTo("");
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["audit-logs", { actorId, search: debouncedSearch, entityType, action, dateFrom, dateTo }],
    queryFn: ({ pageParam }) =>
      getAuditLogs({
        offset: pageParam,
        actorId,
        search: debouncedSearch,
        entityType: entityType as AuditEntityType | "all",
        action: action as AuditAction | "all",
        dateFrom,
        dateTo,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const logs = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={showActor ? "Search by admin, reference no., or details…" : "Search by reference no. or details…"}
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filter Audit Logs</DialogTitle>
              <DialogDescription>Narrow down audit logs by category, action, or date range.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={entityType} onValueChange={setEntityType}>
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
                <Label>Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_FILTERS.map((filter) => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date-from">From</Label>
                <DatePicker id="date-from" value={dateFrom} onChange={setDateFrom} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date-to">To</Label>
                <DatePicker id="date-to" value={dateTo} onChange={setDateTo} />
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

      {!isLoading && logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs found"
          description={
            showActor
              ? "Changes made by admins that match your search and filters will appear here."
              : "Changes made by this admin that match your search and filters will appear here."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm [&_thead]:bg-muted/50 [&_th]:text-muted-foreground">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                {showActor && <TableHead>Done By</TableHead>}
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  <LogRowSkeleton showActor={showActor} />
                  <LogRowSkeleton showActor={showActor} />
                  <LogRowSkeleton showActor={showActor} />
                </>
              ) : (
                <>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => setViewedLog(log)}>
                      <TableCell className="text-muted-foreground">{formatLogDate(log.createdAt)}</TableCell>
                      {showActor && (
                        <TableCell>
                          <p className="font-medium truncate">{log.actorName}</p>
                          <p className="text-xs text-muted-foreground truncate">{roleLabel(log.actorRole)}</p>
                        </TableCell>
                      )}
                      <TableCell>{AUDIT_ENTITY_LABELS[log.entityType]}</TableCell>
                      <TableCell>
                        <Badge variant={auditActionBadgeVariant(log.action)}>{AUDIT_ACTION_LABELS[log.action]}</Badge>
                      </TableCell>
                      <TableCell className="min-w-72 whitespace-normal">{log.summary}</TableCell>
                    </TableRow>
                  ))}
                  {hasNextPage && (
                    <LoadMoreTrigger
                      colSpan={showActor ? 5 : 4}
                      onIntersect={fetchNextPage}
                      disabled={isFetchingNextPage}
                    />
                  )}
                  {isFetchingNextPage && <LogRowSkeleton showActor={showActor} />}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {viewedLog && (
        <ViewAuditLogDialog log={viewedLog} open onOpenChange={(open) => !open && setViewedLog(null)} />
      )}
    </div>
  );
}
