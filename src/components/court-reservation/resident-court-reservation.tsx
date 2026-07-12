"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import ResidentCredentialsBanner from "@/components/resident-credentials-banner";
import CourtReservationActionsMenu from "@/components/court-reservation/court-reservation-actions-menu";
import CourtReservationDialog from "@/components/court-reservation/dialogs/court-reservation-dialog";
import TimeSlotsDialog from "@/components/court-reservation/dialogs/time-slots-dialog";
import { getResidentProfile } from "@/actions/resident-profile";
import { getMyCourtReservations } from "@/actions/court-reservations";
import { statusBadgeVariant, formatTimeSlots, formatFee } from "@/lib/court-reservations";
import { CalendarCheck, Clock } from "lucide-react";

function formatReservationDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResidentCourtReservation() {
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [isTimeSlotsDialogOpen, setIsTimeSlotsDialogOpen] = useState(false);

  const { user } = useUser();
  const { data: residentProfile, isLoading: isResidentProfileLoading } = useQuery({
    queryKey: ["resident-profile", user?.id],
    queryFn: () => getResidentProfile(user!.id),
    enabled: !!user?.id,
  });

  const hasResidentProfile = !!residentProfile;

  const {
    data,
    isLoading: isReservationsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["court-reservations"],
    queryFn: ({ pageParam }) => getMyCourtReservations({ offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const myReservations = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      {isResidentProfileLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !hasResidentProfile ? (
        <ResidentCredentialsBanner
          userId={user?.id}
          description="You need to fill up your Resident Credentials form before you can reserve the court."
        />
      ) : (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <CalendarCheck className="self-center size-8 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-semibold leading-tight">Want to use the barangay court?</p>
              <p className="text-sm text-muted-foreground">
                Reserve the court for your sports activities or events.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setIsTimeSlotsDialogOpen(true)}>
              <Clock className="size-4" />
              Time Slots
            </Button>
            <Button className="flex-1 gap-2" onClick={() => setIsReserveDialogOpen(true)}>
              <CalendarCheck className="size-4" />
              Reserve Court
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">My Reservations</h2>
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
              {isReservationsLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ) : myReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No reservations yet.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {myReservations.map((reservation) => (
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
                        <Badge variant={statusBadgeVariant(reservation.status)}>
                          {reservation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CourtReservationActionsMenu reservation={reservation} />
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

      <CourtReservationDialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen} />
      <TimeSlotsDialog open={isTimeSlotsDialogOpen} onOpenChange={setIsTimeSlotsDialogOpen} />
    </>
  );
}
