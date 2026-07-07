"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DocumentRequestPickupFormValues } from "@/schemas/document-request-pickup-schema";
import DocumentRequestPickupForm from "@/components/document-request/forms/document-request-pickup-form";
import { uploadFile } from "@/lib/storage";
import { setDocumentRequestStatus } from "@/actions/document-requests";
import type { DocumentRequest } from "@/db/schema";

interface AdminReadyForPickupDialogProps {
  request: DocumentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminReadyForPickupDialog({
  request,
  open,
  onOpenChange,
}: AdminReadyForPickupDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitPickupDetails } = useMutation({
    mutationFn: async (data: DocumentRequestPickupFormValues) => {
      const attachments = await Promise.all(
        data.attachments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "document-requests/pickup-attachments");
          return { ...item, key, file: undefined };
        })
      );

      await setDocumentRequestStatus(request.id, "Ready for Pickup", {
        message: data.message,
        attachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success("Request marked as Ready for Pickup.");
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
          <DialogTitle>Pickup Details</DialogTitle>
        </DialogHeader>

        <DocumentRequestPickupForm onSubmit={submitPickupDetails} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
