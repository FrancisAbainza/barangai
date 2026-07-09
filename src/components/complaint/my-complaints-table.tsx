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
import ComplaintActionsMenu from "@/components/complaint/complaint-actions-menu";
import { getMyComplaints } from "@/actions/complaints";
import { statusBadgeVariant, priorityBadgeVariant, formatDate } from "@/lib/complaints";

export default function MyComplaintsTable() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["complaints"],
    queryFn: ({ pageParam }) => getMyComplaints({ offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const myComplaints = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">My Complaints</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ) : myComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  No complaints filed yet.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {myComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">{complaint.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{complaint.category}</TableCell>
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
                      <ComplaintActionsMenu complaint={complaint} />
                    </TableCell>
                  </TableRow>
                ))}
                {hasNextPage && (
                  <LoadMoreTrigger
                    colSpan={6}
                    onIntersect={fetchNextPage}
                    disabled={isFetchingNextPage}
                  />
                )}
                {isFetchingNextPage && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
