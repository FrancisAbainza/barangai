"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SoloParentDocumentRequestFormValues } from "@/schemas/solo-parent-document-request-schema";
import SoloParentDocumentRequestForm from "../forms/solo-parent-document-request-form";
import { useDialogPrefill } from "@/hooks/use-dialog-param";
import { uploadFile } from "@/lib/storage";
import { createDocumentRequest } from "@/actions/document-requests";

interface SoloParentDocumentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SoloParentDocumentRequestDialog({
  open,
  onOpenChange,
}: SoloParentDocumentRequestDialogProps) {
  const queryClient = useQueryClient();
  const prefill = useDialogPrefill("solo-parent-request");

  const { mutateAsync: submitRequest } = useMutation({
    mutationFn: async (data: SoloParentDocumentRequestFormValues) => {
      const supportingDocuments = await Promise.all(
        data.supportingDocuments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "document-requests/supporting-documents");
          return { ...item, key, file: undefined };
        })
      );

      await createDocumentRequest({
        documentType: "Solo Parent Certification",
        purpose: data.purpose,
        otherPurpose: data.otherPurpose,
        situationDescription: data.situationDescription,
        supportingDocuments,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Solo Parent Certification</DialogTitle>
        </DialogHeader>

        <SoloParentDocumentRequestForm
          defaultValues={prefill as Partial<SoloParentDocumentRequestFormValues>}
          onSubmit={submitRequest}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
