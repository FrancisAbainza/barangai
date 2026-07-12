"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CourtReservationFormValues } from "@/schemas/court-reservation-schema";
import { createCourtReservation } from "@/actions/court-reservations";
import { uploadFile } from "@/lib/storage";
import CourtReservationForm from "../forms/court-reservation-form";

interface CourtReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CourtReservationDialog({
  open,
  onOpenChange,
}: CourtReservationDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitReservation } = useMutation({
    mutationFn: async (data: CourtReservationFormValues) => {
      const gcashPayment = await Promise.all(
        data.gcashPayment.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "court-reservations/gcash-payments");
          return { ...item, key, file: undefined };
        })
      );

      await createCourtReservation({
        date: data.date,
        purpose: data.purpose,
        timeSlots: data.timeSlots,
        gcashPayment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["court-reservation-taken-slots"] });
      toast.success("Reservation submitted successfully.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit reservation. Please try again."
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reserve the Court</DialogTitle>
        </DialogHeader>

        <CourtReservationForm onSubmit={submitReservation} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
