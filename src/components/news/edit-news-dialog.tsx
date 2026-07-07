"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import NewsForm from "./news-form";
import type { NewsFormValues } from "@/schemas/news-schema";
import type { MediaItem } from "../file-uploader";
import { uploadFile, deleteFile } from "@/lib/storage";
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
      const uploadedMedia: MediaItem[] = await Promise.all(
        (data.media ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "news/media");
          return { ...item, key, file: undefined };
        })
      );

      const uploadedAttachments: MediaItem[] = await Promise.all(
        (data.attachments ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "news/attachments");
          return { ...item, key, file: undefined };
        })
      );

      const originalMediaKeys = (news.media as MediaItem[]).map((i) => i.key).filter(Boolean);
      const finalMediaKeys = new Set(uploadedMedia.map((i) => i.key).filter(Boolean));
      const removedMediaKeys = originalMediaKeys.filter((k) => !finalMediaKeys.has(k));

      const originalAttachmentKeys = (news.attachments as MediaItem[]).map((i) => i.key).filter(Boolean);
      const finalAttachmentKeys = new Set(uploadedAttachments.map((i) => i.key).filter(Boolean));
      const removedAttachmentKeys = originalAttachmentKeys.filter((k) => !finalAttachmentKeys.has(k));

      await Promise.all(
        [...removedMediaKeys, ...removedAttachmentKeys].map((key) => deleteFile(key!))
      );

      await updateNews(news.id, { ...data, media: uploadedMedia, attachments: uploadedAttachments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("News post updated successfully.");
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
          onSubmit={submitNews}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
