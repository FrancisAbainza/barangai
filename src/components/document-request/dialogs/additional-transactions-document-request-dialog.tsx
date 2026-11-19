"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDialogPrefill } from "@/hooks/use-dialog-param";
import AdditionalTransactionsDocumentRequestForm, {
  type AdditionalTransactionsDocumentRequestFormValues,
} from "../forms/additional-transactions-document-request-form";

interface AdditionalTransactionsDocumentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdditionalTransactionsDocumentRequestDialog({
  open,
  onOpenChange,
}: AdditionalTransactionsDocumentRequestDialogProps) {
  const prefill = useDialogPrefill("additional-transactions-request");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Additional Transactions</DialogTitle>
        </DialogHeader>

        <AdditionalTransactionsDocumentRequestForm
          defaultValues={prefill as Partial<AdditionalTransactionsDocumentRequestFormValues>}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
