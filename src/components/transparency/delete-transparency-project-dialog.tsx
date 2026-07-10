"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFile } from "@/lib/storage";
import { deleteTransparencyProject } from "@/actions/transparency";
import type { TransparencyProjectWithAuthor } from "@/actions/transparency";
import type { MediaItem } from "../file-uploader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface DeleteTransparencyProjectDialogProps {
  project: TransparencyProjectWithAuthor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteTransparencyProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteTransparencyProjectDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const media = project.media as MediaItem[];
      const attachments = project.attachments as MediaItem[];
      const keys = [
        ...media.map((m) => m.key),
        ...attachments.map((a) => a.key),
      ].filter(Boolean) as string[];

      await Promise.all(keys.map((key) => deleteFile(key)));
      await deleteTransparencyProject(project.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transparency-projects"] });
      toast.success("Project deleted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete project. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{project.title}&rdquo; and all its files. This
            action cannot be undone.
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
