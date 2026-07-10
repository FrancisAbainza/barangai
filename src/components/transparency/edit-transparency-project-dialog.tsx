"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TransparencyProjectForm from "./transparency-project-form";
import type { TransparencyProjectFormValues } from "@/schemas/transparency-schema";
import type { MediaItem } from "../file-uploader";
import { uploadFile, deleteFile } from "@/lib/storage";
import { updateTransparencyProject } from "@/actions/transparency";
import type { TransparencyProjectWithAuthor } from "@/actions/transparency";
import { toast } from "sonner";

interface EditTransparencyProjectDialogProps {
  project: TransparencyProjectWithAuthor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTransparencyProjectDialog({
  project,
  open,
  onOpenChange,
}: EditTransparencyProjectDialogProps) {
  const queryClient = useQueryClient();

  const defaultValues: TransparencyProjectFormValues = {
    title: project.title,
    category: project.category,
    description: project.description,
    budget: project.budget ? Number(project.budget) : undefined,
    location: project.location ?? undefined,
    media: project.media as MediaItem[],
    attachments: project.attachments as MediaItem[],
  };

  const { mutateAsync: submitProject } = useMutation({
    mutationFn: async (data: TransparencyProjectFormValues) => {
      const uploadedMedia: MediaItem[] = await Promise.all(
        (data.media ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "transparency/media");
          return { ...item, key, file: undefined };
        })
      );

      const uploadedAttachments: MediaItem[] = await Promise.all(
        (data.attachments ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "transparency/attachments");
          return { ...item, key, file: undefined };
        })
      );

      const originalMediaKeys = (project.media as MediaItem[]).map((i) => i.key).filter(Boolean);
      const finalMediaKeys = new Set(uploadedMedia.map((i) => i.key).filter(Boolean));
      const removedMediaKeys = originalMediaKeys.filter((k) => !finalMediaKeys.has(k));

      const originalAttachmentKeys = (project.attachments as MediaItem[])
        .map((i) => i.key)
        .filter(Boolean);
      const finalAttachmentKeys = new Set(uploadedAttachments.map((i) => i.key).filter(Boolean));
      const removedAttachmentKeys = originalAttachmentKeys.filter((k) => !finalAttachmentKeys.has(k));

      await Promise.all(
        [...removedMediaKeys, ...removedAttachmentKeys].map((key) => deleteFile(key!))
      );

      await updateTransparencyProject(project.id, {
        ...data,
        media: uploadedMedia,
        attachments: uploadedAttachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transparency-projects"] });
      toast.success("Project updated successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update project. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transparency Project</DialogTitle>
        </DialogHeader>
        <TransparencyProjectForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={submitProject}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
