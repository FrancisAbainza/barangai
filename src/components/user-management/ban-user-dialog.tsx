"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { setUserBanned } from "@/actions/user-management";
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

interface BanUserDialogProps {
  userId: string;
  userName: string;
  isBanned: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BanUserDialog({
  userId,
  userName,
  isBanned,
  open,
  onOpenChange,
}: BanUserDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleConfirm, isPending } = useMutation({
    mutationFn: () => setUserBanned(userId, !isBanned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(isBanned ? `${userName} has been unbanned.` : `${userName} has been banned.`);
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
          <AlertDialogTitle>
            {isBanned ? "Unban" : "Ban"} {userName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBanned
              ? `This will restore ${userName}'s access to sign in to the portal.`
              : `This will prevent ${userName} from signing in to the portal. This action can be reversed later.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isBanned ? "default" : "destructive"}
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {isPending ? "Please wait…" : isBanned ? "Unban User" : "Ban User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
