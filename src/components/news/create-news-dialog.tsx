"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Newspaper } from "lucide-react";
import { NewsFormValues } from "@/schemas/news-schema";
import NewsForm from "./news-form";
import { toast } from "sonner";
import { uploadFile } from "@/lib/storage";
import { createNews } from "@/actions/news";

export default function CreateNewsDialog() {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const { mutateAsync: submitNews } = useMutation({
    mutationFn: async (data: NewsFormValues) => {
      const uploadedMedia = await Promise.all(
        (data.media ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "news/media");
          return { ...item, key, file: undefined };
        })
      );

      const uploadedAttachments = await Promise.all(
        (data.attachments ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "news/attachments");
          return { ...item, key, file: undefined };
        })
      );

      await createNews({ ...data, media: uploadedMedia, attachments: uploadedAttachments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("News post created successfully.");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to create news post. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shrink-0">
          <Newspaper className="size-4" />
          Create News
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create News Post</DialogTitle>
        </DialogHeader>

        <NewsForm
          mode="create"
          onSubmit={submitNews}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
