"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDialogPrefill } from "@/hooks/use-dialog-param";
import AdditionalTransactionsDocumentRequestForm from "../forms/additional-transactions-document-request-form";
import type { AdditionalTransactionsDocumentRequestFormValues } from "@/schemas/additional-transactions-document-request-schema";
import { uploadFile } from "@/lib/storage";
import { createDocumentRequest } from "@/actions/document-requests";

interface AdditionalTransactionsDocumentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdditionalTransactionsDocumentRequestDialog({
  open,
  onOpenChange,
}: AdditionalTransactionsDocumentRequestDialogProps) {
  const queryClient = useQueryClient();
  const prefill = useDialogPrefill("additional-transactions-request");

  const { mutateAsync: submitRequest } = useMutation({
    mutationFn: async (data: AdditionalTransactionsDocumentRequestFormValues) => {
      const paymentReceipt = await Promise.all(
        data.paymentReceipt.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "document-requests/payment-receipts");
          return { ...item, key, file: undefined };
        })
      );
      const supportingDocuments = await Promise.all(
        data.supportingDocuments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "document-requests/supporting-documents");
          return { ...item, key, file: undefined };
        })
      );

      await createDocumentRequest({
        documentType: "Additional Transactions",
        purpose: data.purpose,
        paymentReceipt,
        supportingDocuments,
        eligibleForFreeCertification: data.eligibleForFreeCertification,
        receiveVia: data.receiveVia,
        preferredClaimAt: new Date(data.preferredClaimAt),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Additional Transactions</DialogTitle>
        </DialogHeader>

        <AdditionalTransactionsDocumentRequestForm
          defaultValues={prefill as Partial<AdditionalTransactionsDocumentRequestFormValues>}
          onSubmit={submitRequest}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
