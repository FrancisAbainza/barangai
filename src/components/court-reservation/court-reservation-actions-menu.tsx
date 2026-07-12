"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ListChecks, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setCourtReservationStatus, type CourtReservationWithRequester } from "@/actions/court-reservations";
import { courtReservationStatusEnum, type CourtReservation } from "@/db/schema";
import { isAdminRole } from "@/lib/roles";
import { deleteFile } from "@/lib/storage";
import ViewCourtReservationDialog from "@/components/court-reservation/dialogs/view-court-reservation-dialog";
import DeleteCourtReservationDialog from "@/components/court-reservation/dialogs/delete-court-reservation-dialog";
import RejectCourtReservationDialog from "@/components/court-reservation/dialogs/reject-court-reservation-dialog";
import type { MediaItem } from "@/components/file-uploader";

export default function CourtReservationActionsMenu({
  reservation,
}: {
  reservation: CourtReservationWithRequester;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const queryClient = useQueryClient();

  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  const isOwnReservation = reservation.requesterId === user?.id;

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    mutationFn: async (status: CourtReservation["status"]) => {
      if (reservation.status === "Rejected" && status !== "Rejected") {
        const rejectionAttachments = reservation.rejectionAttachments as MediaItem[];
        const keys = rejectionAttachments.map((item) => item.key).filter(Boolean) as string[];
        await Promise.all(keys.map((key) => deleteFile(key)));
      }
      await setCourtReservationStatus(reservation.id, status);
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
      toast.success(`Reservation marked as ${status}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status. Please try again.");
    },
  });

  function handleStatusSelect(status: CourtReservation["status"]) {
    if (status === "Rejected") {
      setRejectOpen(true);
      return;
    }
    changeStatus(status);
  }

  if (!isAdmin && !isOwnReservation) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setViewOpen(true)}>
            <Eye />
            Submission Info
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListChecks />
                Set status
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {courtReservationStatusEnum.enumValues.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={status === reservation.status || isChangingStatus}
                      onSelect={() => handleStatusSelect(status)}
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete reservation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewCourtReservationDialog reservation={reservation} open={viewOpen} onOpenChange={setViewOpen} />
      <DeleteCourtReservationDialog reservation={reservation} open={deleteOpen} onOpenChange={setDeleteOpen} />
      {isAdmin && (
        <RejectCourtReservationDialog reservation={reservation} open={rejectOpen} onOpenChange={setRejectOpen} />
      )}
    </>
  );
}
