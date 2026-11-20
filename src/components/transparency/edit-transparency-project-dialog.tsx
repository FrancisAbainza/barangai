"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import TransparencyProjectForm from "./transparency-project-form";
import type { TransparencyProjectFormValues } from "@/schemas/transparency-schema";
import type { MediaItem } from "../file-uploader";
import { deleteRemovedFiles, uploadAddedFiles } from "@/lib/storage";
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
      const uploadedMedia = await uploadAddedFiles(data.media ?? [], "transparency/media");
      const uploadedAttachments = await uploadAddedFiles(data.attachments ?? [], "transparency/attachments");

      await updateTransparencyProject(project.id, {
        ...data,
        media: uploadedMedia,
        attachments: uploadedAttachments,
      });
      const cleanupResults = await Promise.all([
        deleteRemovedFiles(project.media as MediaItem[], uploadedMedia),
        deleteRemovedFiles(project.attachments as MediaItem[], uploadedAttachments),
      ]);
      return cleanupResults.some(Boolean);
    },
    onSuccess: (cleanupFailed) => {
      queryClient.invalidateQueries({ queryKey: ["transparency-projects"] });
      toast.success("Project updated successfully.");
      if (cleanupFailed) toast.error("Some removed project files could not be deleted.");
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
          onSubmit={async (data) => {
            await submitProject(data);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
