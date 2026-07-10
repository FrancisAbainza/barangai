"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { FolderKanban } from "lucide-react";
import { TransparencyProjectFormValues } from "@/schemas/transparency-schema";
import TransparencyProjectForm from "./transparency-project-form";
import { toast } from "sonner";
import { uploadFile } from "@/lib/storage";
import { createTransparencyProject } from "@/actions/transparency";

export default function CreateTransparencyProjectDialog() {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const { mutateAsync: submitProject } = useMutation({
    mutationFn: async (data: TransparencyProjectFormValues) => {
      const uploadedMedia = await Promise.all(
        (data.media ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "transparency/media");
          return { ...item, key, file: undefined };
        })
      );

      const uploadedAttachments = await Promise.all(
        (data.attachments ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "transparency/attachments");
          return { ...item, key, file: undefined };
        })
      );

      await createTransparencyProject({
        ...data,
        media: uploadedMedia,
        attachments: uploadedAttachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transparency-projects"] });
      toast.success("Project created successfully.");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to create project. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shrink-0">
          <FolderKanban className="size-4" />
          Add Project
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transparency Project</DialogTitle>
        </DialogHeader>

        <TransparencyProjectForm
          mode="create"
          onSubmit={submitProject}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
