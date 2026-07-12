"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourtReservationRejectionFormValues } from "@/schemas/court-reservation-rejection-schema";
import CourtReservationRejectionForm from "@/components/court-reservation/forms/court-reservation-rejection-form";
import { uploadFile } from "@/lib/storage";
import { setCourtReservationStatus } from "@/actions/court-reservations";
import type { CourtReservation } from "@/db/schema";

interface RejectCourtReservationDialogProps {
  reservation: CourtReservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RejectCourtReservationDialog({
  reservation,
  open,
  onOpenChange,
}: RejectCourtReservationDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitRejection } = useMutation({
    mutationFn: async (data: CourtReservationRejectionFormValues) => {
      const attachments = await Promise.all(
        data.attachments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "court-reservations/rejection-attachments");
          return { ...item, key, file: undefined };
        })
      );

      await setCourtReservationStatus(reservation.id, "Rejected", { reason: data.reason, attachments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
      toast.success("Reservation rejected.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rejection Details</DialogTitle>
        </DialogHeader>

        <CourtReservationRejectionForm onSubmit={submitRejection} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
