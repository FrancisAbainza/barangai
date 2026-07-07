"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { OfficialFormValues } from "@/schemas/about-us-schema";
import type { MediaItem } from "@/components/file-uploader";
import { uploadFile, deleteFile } from "@/lib/storage";
import { updateOfficial } from "@/actions/officials";
import type { Official } from "@/db/schema";
import OfficialForm from "./official-form";

interface EditOfficialDialogProps {
  official: Official;
  hasLeader: boolean;
}

export default function EditOfficialDialog({ official, hasLeader }: EditOfficialDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutateAsync: submitOfficial } = useMutation({
    mutationFn: async (data: OfficialFormValues) => {
      const uploadedPhoto: MediaItem[] = await Promise.all(
        data.photo.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "officials");
          return { ...item, key, file: undefined };
        })
      );

      const originalKey = (official.photo as MediaItem[])[0]?.key;
      const finalKey = uploadedPhoto[0]?.key;
      if (originalKey && originalKey !== finalKey) {
        await deleteFile(originalKey);
      }

      await updateOfficial(official.id, { ...data, photo: uploadedPhoto });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officials", official.section] });
      toast.success("Official updated successfully.");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update official. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="size-7 shrink-0">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {official.name}</DialogTitle>
        </DialogHeader>

        <OfficialForm
          defaultValues={{
            name: official.name,
            position: official.position,
            photo: official.photo as MediaItem[],
            isLeader: official.isLeader,
          }}
          leaderDisabled={hasLeader && !official.isLeader}
          onSubmit={submitOfficial}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
