"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFile } from "@/lib/storage";
import { deleteNews } from "@/actions/news";
import type { NewsWithAuthor } from "@/actions/news";
import type { MediaItem } from "../media-uploader";
import type { AttachmentItem } from "../attachment-picker";
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

interface DeleteNewsDialogProps {
  news: NewsWithAuthor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteNewsDialog({ news, open, onOpenChange }: DeleteNewsDialogProps) {
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const media = news.media as MediaItem[];
      const attachments = news.attachments as AttachmentItem[];
      const keys = [
        ...media.map((m) => m.key),
        ...attachments.map((a) => a.key),
      ].filter(Boolean) as string[];

      await Promise.all(keys.map((key) => deleteFile(key)));
      await deleteNews(news.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("News post deleted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete news post. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete news post?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{news.title}&rdquo; and all its files. This action
            cannot be undone.
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
