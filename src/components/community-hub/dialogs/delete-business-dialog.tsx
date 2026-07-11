"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFile } from "@/lib/storage";
import { deleteBusiness } from "@/actions/business";
import type { Business } from "@/db/schema";
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

interface DeleteBusinessDialogProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteBusinessDialog({ business, open, onOpenChange }: DeleteBusinessDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const files = [
        ...(business.photos as MediaItem[]),
        ...(business.permit as MediaItem[]),
        ...(business.rejectionAttachments as MediaItem[]),
      ];
      const keys = files.map((item) => item.key).filter(Boolean) as string[];

      await Promise.all(keys.map((key) => deleteFile(key)));
      await deleteBusiness(business.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success("Business deleted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete business. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this business?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{business.name}&quot; and all its files. This action cannot
            be undone.
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
