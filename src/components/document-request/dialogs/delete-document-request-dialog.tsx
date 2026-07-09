"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFile } from "@/lib/storage";
import { deleteDocumentRequest } from "@/actions/document-requests";
import type { DocumentRequest } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteDocumentRequestDialogProps {
  request: DocumentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteDocumentRequestDialog({
  request,
  open,
  onOpenChange,
}: DeleteDocumentRequestDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const attachments = [
        ...(request.paymentReceipt as MediaItem[]),
        ...(request.supportingDocuments as MediaItem[]),
        ...(request.pickupAttachments as MediaItem[]),
        ...(request.rejectionAttachments as MediaItem[]),
      ];
      const keys = attachments.map((item) => item.key).filter(Boolean) as string[];

      await Promise.all(keys.map((key) => deleteFile(key)));
      await deleteDocumentRequest(request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success("Request deleted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete request. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this request?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your {request.documentType} request and all its files.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
