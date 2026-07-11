"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BusinessRejectionFormValues } from "@/schemas/business-rejection-schema";
import BusinessRejectionForm from "@/components/community-hub/forms/business-rejection-form";
import { setBusinessStatus } from "@/actions/business";
import { uploadFile } from "@/lib/storage";
import type { Business } from "@/db/schema";

interface RejectBusinessDialogProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RejectBusinessDialog({ business, open, onOpenChange }: RejectBusinessDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitRejection } = useMutation({
    mutationFn: async (data: BusinessRejectionFormValues) => {
      const attachments = await Promise.all(
        data.attachments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "community-hub/rejection-attachments");
          return { ...item, key, file: undefined };
        })
      );

      await setBusinessStatus(business.id, "Rejected", { reason: data.reason, attachments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success("Business rejected.");
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

        <BusinessRejectionForm onSubmit={submitRejection} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
