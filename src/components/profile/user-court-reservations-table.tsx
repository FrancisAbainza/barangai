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
import CourtReservationActionsMenu from "@/components/court-reservation/court-reservation-actions-menu";
import { getCourtReservationsByUser } from "@/actions/court-reservations";
import { statusBadgeVariant, formatTimeSlots, formatFee, formatReservationDate } from "@/lib/court-reservations";

export default function UserCourtReservationsTable({ userId }: { userId: string }) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["court-reservations", "user", userId],
    queryFn: ({ pageParam }) => getCourtReservationsByUser(userId, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const reservations = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time Slots</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Total</TableHead>
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
          ) : reservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                No reservations yet.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">
                    {formatReservationDate(reservation.date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimeSlots(reservation.timeSlots)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{reservation.purpose}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFee(Number(reservation.totalAmount))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(reservation.status)}>{reservation.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <CourtReservationActionsMenu reservation={reservation} />
                  </TableCell>
                </TableRow>
              ))}
              {hasNextPage && (
                <LoadMoreTrigger colSpan={6} onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
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
  );
}
