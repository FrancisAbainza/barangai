"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClearanceDocumentRequestFormValues } from "@/schemas/clearance-document-request-schema";
import ClearanceDocumentRequestForm from "../forms/clearance-document-request-form";
import { uploadFile } from "@/lib/storage";
import { createDocumentRequest } from "@/actions/document-requests";

interface ClearanceDocumentRequestDialogProps {
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClearanceDocumentRequestDialog({
  documentName,
  open,
  onOpenChange,
}: ClearanceDocumentRequestDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitRequest } = useMutation({
    mutationFn: async (data: ClearanceDocumentRequestFormValues) => {
      const paymentReceipt = await Promise.all(
        data.paymentReceipt.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "document-requests/payment-receipts");
          return { ...item, key, file: undefined };
        })
      );

      await createDocumentRequest({
        documentType: "Barangay Clearance",
        purpose: data.purpose,
        paymentReceipt,
        receiveVia: data.receiveVia,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success("Request submitted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to submit request. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request {documentName}</DialogTitle>
        </DialogHeader>

        <ClearanceDocumentRequestForm onSubmit={submitRequest} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
