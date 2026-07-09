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
import LoadMoreTrigger from "@/components/load-more-trigger";
import AdminDocumentRequestActionsMenu from "@/components/document-request/admin-document-request-actions-menu";
import { getDocumentRequests } from "@/actions/document-requests";
import { statusBadgeVariant } from "@/lib/document-requests";
import { documentRequestStatusEnum, documentRequestTypeEnum, type DocumentRequest } from "@/db/schema";

const DOCUMENT_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  ...documentRequestTypeEnum.enumValues.map((type) => ({ value: type, label: type })),
];

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  ...documentRequestStatusEnum.enumValues.map((status) => ({ value: status, label: status })),
];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function formatSubmittedDate(date: Date) {
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function RequestRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
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

export default function AdminDocumentRequest() {
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [
      "document-requests",
      "admin",
      { search: debouncedSearch, documentType, status, dateFrom, dateTo },
    ],
    queryFn: ({ pageParam }) =>
      getDocumentRequests({
        offset: pageParam,
        search: debouncedSearch,
        documentType,
        status: status as DocumentRequest["status"] | "all",
        dateFrom,
        dateTo,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const requests = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by requester…"
            className="pl-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPE_FILTERS.map((filter) => (
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <RequestRowSkeleton />
                <RequestRowSkeleton />
                <RequestRowSkeleton />
              </>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-medium truncate">{request.requesterName}</p>
                      <p className="text-xs text-muted-foreground truncate">{request.requesterEmail}</p>
                    </TableCell>
                    <TableCell>{request.documentType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatSubmittedDate(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AdminDocumentRequestActionsMenu request={request} />
                    </TableCell>
                  </TableRow>
                ))}
                {hasNextPage && (
                  <LoadMoreTrigger colSpan={5} onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
                )}
                {isFetchingNextPage && <RequestRowSkeleton />}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
