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
import EmptyState from "@/components/empty-state";
import LoadMoreTrigger from "@/components/load-more-trigger";
import ResidentCredentialsBanner from "@/components/resident-credentials-banner";
import CourtReservationActionsMenu from "@/components/court-reservation/court-reservation-actions-menu";
import CourtReservationDialog from "@/components/court-reservation/dialogs/court-reservation-dialog";
import CourtAvailabilityDialog from "@/components/court-reservation/dialogs/court-availability-dialog";
import ViewCourtReservationDialog from "@/components/court-reservation/dialogs/view-court-reservation-dialog";
import { getResidentProfile } from "@/actions/resident-profile";
import { useDialogParam } from "@/hooks/use-dialog-param";
import { useViewParam } from "@/hooks/use-view-param";
import { getCourtReservationById, getMyCourtReservations } from "@/actions/court-reservations";
import { statusBadgeVariant, formatReferenceNumber, formatReservationTime, formatFee } from "@/lib/court-reservations";
import { CalendarCheck, Clock, SportShoe } from "lucide-react";

function formatReservationDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResidentCourtReservation() {
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useDialogParam("court-reservation");
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);

  // `?view=<id>` (set by clicking a row, or by links like a notification) opens that submission's
  // Submission Info dialog. It's fetched by id since it may not be in the loaded list.
  const [viewId, setViewId] = useViewParam();
  const { data: fetchedReservation } = useQuery({
    queryKey: ["court-reservations", "view", viewId],
    queryFn: () => getCourtReservationById(viewId!),
    enabled: viewId !== null,
  });

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
  // A clicked row is already loaded, so its dialog opens without waiting on that fetch.
  const viewedReservation = myReservations.find((reservation) => reservation.id === viewId) ?? fetchedReservation;

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
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center self-center rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Want to use the barangay court?</p>
              <p className="text-sm text-muted-foreground">
                Reserve the court for your sports activities or events.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setIsAvailabilityDialogOpen(true)}>
              <Clock className="size-4" />
              Availability
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
        {!isReservationsLoading && myReservations.length === 0 ? (
          <EmptyState
            icon={SportShoe}
            title="No reservations yet"
            description="Court reservations you make will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm [&_thead]:bg-muted/50 [&_th]:text-muted-foreground">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isReservationsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {myReservations.map((reservation) => (
                      <TableRow key={reservation.id} className="cursor-pointer" onClick={() => setViewId(reservation.id)}>
                        <TableCell className="font-medium">{formatReferenceNumber(reservation.id)}</TableCell>
                        <TableCell className="font-medium">
                          {formatReservationDate(reservation.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatReservationTime(reservation)}
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
                        {/* Clicks in the menu (and its portaled dialogs) bubble to the row, which would open its dialog too. */}
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <CourtReservationActionsMenu reservation={reservation} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {hasNextPage && (
                      <LoadMoreTrigger
                        colSpan={7}
                        onIntersect={fetchNextPage}
                        disabled={isFetchingNextPage}
                      />
                    )}
                    {isFetchingNextPage && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CourtReservationDialog open={isReserveDialogOpen && hasResidentProfile} onOpenChange={setIsReserveDialogOpen} />
      <CourtAvailabilityDialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen} />

      {viewedReservation && viewId !== null && (
        <ViewCourtReservationDialog reservation={viewedReservation} open onOpenChange={(open) => !open && setViewId(null)} />
      )}
    </>
  );
}
