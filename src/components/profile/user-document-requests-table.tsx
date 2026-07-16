"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadMoreTrigger from "@/components/load-more-trigger";
import DocumentRequestActionsMenu from "@/components/document-request/document-request-actions-menu";
import { getDocumentRequestsByUser } from "@/actions/document-requests";
import { statusBadgeVariant, formatDate } from "@/lib/document-requests";

export default function UserDocumentRequestsTable({ userId }: { userId: string }) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["document-requests", "user", userId],
    queryFn: ({ pageParam }) => getDocumentRequestsByUser(userId, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const requests = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Type</TableHead>
            <TableHead>Submission Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Skeleton className="h-5 w-full" />
              </TableCell>
            </TableRow>
          ) : requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                No requests yet.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.documentType}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DocumentRequestActionsMenu request={request} />
                  </TableCell>
                </TableRow>
              ))}
              {hasNextPage && (
                <LoadMoreTrigger colSpan={4} onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
              )}
              {isFetchingNextPage && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
