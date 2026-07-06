"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ResidencyDocumentRequestFormValues } from "@/schemas/residency-document-request-schema";
import ResidencyDocumentRequestForm from "../forms/residency-document-request-form";
import { createDocumentRequest } from "@/actions/document-requests";

interface ResidencyDocumentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResidencyDocumentRequestDialog({
  open,
  onOpenChange,
}: ResidencyDocumentRequestDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitRequest } = useMutation({
    mutationFn: async (data: ResidencyDocumentRequestFormValues) => {
      await createDocumentRequest({
        documentType: "Certificate of Residency",
        purpose: data.purpose,
        otherPurpose: data.otherPurpose,
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
          <DialogTitle>Request Certificate of Residency</DialogTitle>
        </DialogHeader>

        <ResidencyDocumentRequestForm onSubmit={submitRequest} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
