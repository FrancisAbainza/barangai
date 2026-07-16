"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteAllUserData } from "@/actions/user-management";
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

interface DeleteUserDataDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteUserDataDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: DeleteUserDataDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleConfirm, isPending } = useMutation({
    mutationFn: () => deleteAllUserData(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletedUsers"] });
      toast.success(`All data for ${userName} has been deleted.`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all data for {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes every record {userName} left behind across the
            portal — news posts, comments, reactions, resident profile, document
            requests, complaints, transparency posts, businesses, court reservations,
            and their entry in the deleted users list — along with any files they
            uploaded. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {isPending ? "Deleting…" : "Delete All Data"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
