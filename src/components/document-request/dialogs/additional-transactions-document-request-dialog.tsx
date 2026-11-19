"use client";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDialogPrefill } from "@/hooks/use-dialog-param";
import AdditionalTransactionsDocumentRequestForm from "../forms/additional-transactions-document-request-form";
import type { AdditionalTransactionsDocumentRequestFormValues } from "@/schemas/additional-transactions-document-request-schema";

interface AdditionalTransactionsDocumentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdditionalTransactionsDocumentRequestDialog({
  open,
  onOpenChange,
}: AdditionalTransactionsDocumentRequestDialogProps) {
  const prefill = useDialogPrefill("additional-transactions-request");
  const handleSubmitRequest = async (data: AdditionalTransactionsDocumentRequestFormValues) => {
    toast.info(`${data.purpose} request submission isn't connected yet.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Additional Transactions</DialogTitle>
        </DialogHeader>

        <AdditionalTransactionsDocumentRequestForm
          defaultValues={prefill as Partial<AdditionalTransactionsDocumentRequestFormValues>}
          onSubmit={handleSubmitRequest}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
