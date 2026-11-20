"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourtReservationFormValues } from "@/schemas/court-reservation-schema";
import {
  updateCourtReservation,
  type CourtReservationWithRequester,
} from "@/actions/court-reservations";
import { deleteRemovedFiles, uploadAddedFiles } from "@/lib/storage";
import { parseTimeInput, toTimeInput } from "@/lib/court-reservations";
import type { MediaItem } from "@/components/file-uploader";
import CourtReservationForm from "../forms/court-reservation-form";

interface EditCourtReservationDialogProps {
  reservation: CourtReservationWithRequester;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCourtReservationDialog({
  reservation,
  open,
  onOpenChange,
}: EditCourtReservationDialogProps) {
  const queryClient = useQueryClient();
  const { mutateAsync: saveReservation } = useMutation({
    mutationFn: async (data: CourtReservationFormValues) => {
      const gcashPayment = await uploadAddedFiles(
        data.gcashPayment,
        "court-reservations/gcash-payments"
      );
      const result = await updateCourtReservation(reservation.id, {
        date: data.date,
        purpose: data.purpose,
        startTime: parseTimeInput(data.startTime)!,
        durationHours: data.durationHours,
        gcashPayment,
      });
      if (result?.error) throw new Error(result.error);
      return deleteRemovedFiles(reservation.gcashPayment as MediaItem[], gcashPayment);
    },
    onSuccess: async (cleanupFailed) => {
      await queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["court-reservation-taken-ranges"] });
      toast.success("Reservation updated successfully.");
      if (cleanupFailed) toast.error("Some removed payment files could not be deleted.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update reservation. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Court Reservation</DialogTitle>
        </DialogHeader>
        <CourtReservationForm
          defaultValues={{
            date: reservation.date,
            purpose: reservation.purpose,
            startTime: toTimeInput(reservation.startTime),
            durationHours: reservation.durationHours,
            gcashPayment: reservation.gcashPayment as MediaItem[],
          }}
          onSubmit={async (data) => {
            await saveReservation(data);
          }}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
