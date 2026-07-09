"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFile } from "@/lib/storage";
import { deleteComplaint } from "@/actions/complaints";
import type { ComplaintWithComplainant } from "@/actions/complaints";
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

interface AdminDeleteComplaintDialogProps {
  complaint: ComplaintWithComplainant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminDeleteComplaintDialog({
  complaint,
  open,
  onOpenChange,
}: AdminDeleteComplaintDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const attachments = [
        ...(complaint.evidence as MediaItem[]),
        ...(complaint.resolutionAttachments as MediaItem[]),
        ...(complaint.dismissalAttachments as MediaItem[]),
      ];
      const keys = attachments.map((item) => item.key).filter(Boolean) as string[];

      await Promise.all(keys.map((key) => deleteFile(key)));
      await deleteComplaint(complaint.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint deleted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete complaint. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this complaint?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the &quot;{complaint.subject}&quot; complaint and all its
            files. This action cannot be undone.
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
