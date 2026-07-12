"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFile } from "@/lib/storage";
import { deleteCourtReservation, type CourtReservationWithRequester } from "@/actions/court-reservations";
import type { MediaItem } from "@/components/file-uploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteCourtReservationDialogProps {
  reservation: CourtReservationWithRequester;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteCourtReservationDialog({
  reservation,
  open,
  onOpenChange,
}: DeleteCourtReservationDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const attachments = [
        ...(reservation.gcashPayment as MediaItem[]),
        ...(reservation.rejectionAttachments as MediaItem[]),
      ];
      const keys = attachments.map((item) => item.key).filter(Boolean) as string[];

      await Promise.all(keys.map((key) => deleteFile(key)));
      await deleteCourtReservation(reservation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
      toast.success("Reservation deleted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete reservation. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this reservation?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this court reservation and all its files. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
