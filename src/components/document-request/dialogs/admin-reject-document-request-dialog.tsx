"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DocumentRequestRejectionFormValues } from "@/schemas/document-request-rejection-schema";
import DocumentRequestRejectionForm from "@/components/document-request/forms/document-request-rejection-form";
import { uploadFile } from "@/lib/storage";
import { setDocumentRequestStatus } from "@/actions/document-requests";
import type { DocumentRequest } from "@/db/schema";

interface AdminRejectDocumentRequestDialogProps {
  request: DocumentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminRejectDocumentRequestDialog({
  request,
  open,
  onOpenChange,
}: AdminRejectDocumentRequestDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitRejection } = useMutation({
    mutationFn: async (data: DocumentRequestRejectionFormValues) => {
      const attachments = await Promise.all(
        data.attachments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "document-requests/rejection-attachments");
          return { ...item, key, file: undefined };
        })
      );

      await setDocumentRequestStatus(request.id, "Rejected", {
        message: data.message,
        attachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success("Request rejected.");
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

        <DocumentRequestRejectionForm onSubmit={submitRejection} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
