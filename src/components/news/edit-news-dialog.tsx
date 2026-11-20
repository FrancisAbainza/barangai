"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import NewsForm from "./news-form";
import type { NewsFormValues } from "@/schemas/news-schema";
import type { MediaItem } from "../file-uploader";
import { deleteRemovedFiles, uploadAddedFiles } from "@/lib/storage";
import { updateNews } from "@/actions/news";
import type { NewsWithAuthor } from "@/actions/news";
import { toast } from "sonner";

interface EditNewsDialogProps {
  news: NewsWithAuthor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditNewsDialog({ news, open, onOpenChange }: EditNewsDialogProps) {
  const queryClient = useQueryClient();

  const defaultValues: NewsFormValues = {
    title: news.title,
    category: news.category,
    content: news.content,
    media: news.media as MediaItem[],
    attachments: news.attachments as MediaItem[],
    pinned: news.pinned,
  };

  const { mutateAsync: submitNews } = useMutation({
    mutationFn: async (data: NewsFormValues) => {
      const uploadedMedia = await uploadAddedFiles(data.media ?? [], "news/media");
      const uploadedAttachments = await uploadAddedFiles(data.attachments ?? [], "news/attachments");

      await updateNews(news.id, { ...data, media: uploadedMedia, attachments: uploadedAttachments });
      const cleanupResults = await Promise.all([
        deleteRemovedFiles(news.media as MediaItem[], uploadedMedia),
        deleteRemovedFiles(news.attachments as MediaItem[], uploadedAttachments),
      ]);
      return cleanupResults.some(Boolean);
    },
    onSuccess: (cleanupFailed) => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("News post updated successfully.");
      if (cleanupFailed) toast.error("Some removed news files could not be deleted.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update news post. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit News Post</DialogTitle>
        </DialogHeader>
        <NewsForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={async (data) => {
            await submitNews(data);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
