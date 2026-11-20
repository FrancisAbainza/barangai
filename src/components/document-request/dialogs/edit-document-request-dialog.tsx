"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { DocumentRequestWithRequester, UpdateDocumentRequestInput } from "@/actions/document-requests";
import { updateDocumentRequest } from "@/actions/document-requests";
import type { MediaItem } from "@/components/file-uploader";
import type { ClearanceDocumentRequestFormValues } from "@/schemas/clearance-document-request-schema";
import type { AdditionalTransactionsDocumentRequestFormValues } from "@/schemas/additional-transactions-document-request-schema";
import type { IndigencyDocumentRequestFormValues } from "@/schemas/indigency-document-request-schema";
import type { MedicalAssistanceDocumentRequestFormValues } from "@/schemas/medical-assistance-document-request-schema";
import type { NoObjectionDocumentRequestFormValues } from "@/schemas/no-objection-document-request-schema";
import type { ResidencyDocumentRequestFormValues } from "@/schemas/residency-document-request-schema";
import type { SoloParentDocumentRequestFormValues } from "@/schemas/solo-parent-document-request-schema";
import { PICKUP_DELIVERY_METHOD } from "@/lib/document-requests";
import { deleteRemovedFiles, uploadAddedFiles } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdditionalTransactionsDocumentRequestForm from "../forms/additional-transactions-document-request-form";
import ClearanceDocumentRequestForm from "../forms/clearance-document-request-form";
import IndigencyDocumentRequestForm from "../forms/indigency-document-request-form";
import MedicalAssistanceDocumentRequestForm from "../forms/medical-assistance-document-request-form";
import NoObjectionDocumentRequestForm from "../forms/no-objection-document-request-form";
import ResidencyDocumentRequestForm from "../forms/residency-document-request-form";
import SoloParentDocumentRequestForm from "../forms/solo-parent-document-request-form";

interface EditDocumentRequestDialogProps {
  request: DocumentRequestWithRequester;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EditableDocumentRequestValues = {
  purpose: string;
  otherPurpose?: string;
  situationDescription?: string;
  paymentReceipt?: MediaItem[];
  supportingDocuments?: MediaItem[];
  eligibleForFreeCertification?: boolean;
  receiveVia: string;
  preferredClaimAt: string;
};

function toPreferredClaimInput(value: Date | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export default function EditDocumentRequestDialog({
  request,
  open,
  onOpenChange,
}: EditDocumentRequestDialogProps) {
  const queryClient = useQueryClient();
  const paymentReceipt = request.paymentReceipt as MediaItem[];
  const supportingDocuments = request.supportingDocuments as MediaItem[];
  const preferredClaimAt = toPreferredClaimInput(request.preferredClaimAt);

  const { mutateAsync: saveRequest } = useMutation({
    mutationFn: async (data: EditableDocumentRequestValues) => {
      const nextPaymentReceipt = await uploadAddedFiles(
        data.paymentReceipt ?? [],
        "document-requests/payment-receipts"
      );
      const nextSupportingDocuments = await uploadAddedFiles(
        data.supportingDocuments ?? [],
        "document-requests/supporting-documents"
      );
      const input: UpdateDocumentRequestInput = {
        ...data,
        paymentReceipt: nextPaymentReceipt,
        supportingDocuments: nextSupportingDocuments,
        preferredClaimAt:
          data.receiveVia === PICKUP_DELIVERY_METHOD && data.preferredClaimAt
            ? new Date(data.preferredClaimAt)
            : null,
      };
      const result = await updateDocumentRequest(request.id, input);
      if (result?.error) throw new Error(result.error);

      const cleanupResults = await Promise.all([
        deleteRemovedFiles(paymentReceipt, nextPaymentReceipt),
        deleteRemovedFiles(supportingDocuments, nextSupportingDocuments),
      ]);
      return cleanupResults.some(Boolean);
    },
    onSuccess: async (cleanupFailed) => {
      await queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success("Request updated successfully.");
      if (cleanupFailed) toast.error("Some removed request files could not be deleted.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update request. Please try again.");
    },
  });

  const commonValues = { preferredClaimAt };
  const commonProps = {
    onCancel: () => onOpenChange(false),
    submitLabel: "Save Changes",
  };

  async function onSubmit(data: EditableDocumentRequestValues) {
    await saveRequest(data);
  }

  let form: ReactNode;
  switch (request.documentType) {
    case "Barangay Clearance":
      form = (
        <ClearanceDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as ClearanceDocumentRequestFormValues["purpose"],
            paymentReceipt,
            eligibleForFreeCertification: request.eligibleForFreeCertification,
            supportingDocuments,
            receiveVia: request.receiveVia as ClearanceDocumentRequestFormValues["receiveVia"],
            preferredClaimAt,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
    case "Additional Transactions":
      form = (
        <AdditionalTransactionsDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as AdditionalTransactionsDocumentRequestFormValues["purpose"],
            paymentReceipt,
            eligibleForFreeCertification: request.eligibleForFreeCertification,
            supportingDocuments,
            receiveVia: request.receiveVia as AdditionalTransactionsDocumentRequestFormValues["receiveVia"],
            preferredClaimAt,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
    case "Certificate of Residency":
      form = (
        <ResidencyDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as ResidencyDocumentRequestFormValues["purpose"],
            otherPurpose: request.otherPurpose ?? "",
            receiveVia: request.receiveVia as ResidencyDocumentRequestFormValues["receiveVia"],
            ...commonValues,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
    case "Certificate of No Objection":
      form = (
        <NoObjectionDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as NoObjectionDocumentRequestFormValues["purpose"],
            otherPurpose: request.otherPurpose ?? "",
            receiveVia: request.receiveVia as NoObjectionDocumentRequestFormValues["receiveVia"],
            ...commonValues,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
    case "Certificate of Indigency":
      form = (
        <IndigencyDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as IndigencyDocumentRequestFormValues["purpose"],
            otherPurpose: request.otherPurpose ?? "",
            situationDescription: request.situationDescription ?? "",
            supportingDocuments,
            receiveVia: request.receiveVia as IndigencyDocumentRequestFormValues["receiveVia"],
            ...commonValues,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
    case "Solo Parent Certification":
      form = (
        <SoloParentDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as SoloParentDocumentRequestFormValues["purpose"],
            otherPurpose: request.otherPurpose ?? "",
            situationDescription: request.situationDescription ?? "",
            supportingDocuments,
            receiveVia: request.receiveVia as SoloParentDocumentRequestFormValues["receiveVia"],
            ...commonValues,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
    case "Medical / Lab Assistance":
      form = (
        <MedicalAssistanceDocumentRequestForm
          {...commonProps}
          defaultValues={{
            purpose: request.purpose as MedicalAssistanceDocumentRequestFormValues["purpose"],
            otherPurpose: request.otherPurpose ?? "",
            situationDescription: request.situationDescription ?? "",
            supportingDocuments,
            receiveVia: request.receiveVia as MedicalAssistanceDocumentRequestFormValues["receiveVia"],
            ...commonValues,
          }}
          onSubmit={onSubmit}
        />
      );
      break;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {request.documentType} Request</DialogTitle>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
