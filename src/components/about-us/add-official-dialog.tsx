"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { OfficialFormValues } from "@/schemas/about-us-schema";
import type { MediaItem } from "@/components/file-uploader";
import { uploadFile } from "@/lib/storage";
import { createOfficial, type OfficialSection } from "@/actions/officials";
import OfficialForm from "./official-form";

const EMPTY_VALUES: OfficialFormValues = { name: "", position: "", photo: [], isLeader: false };

interface AddOfficialDialogProps {
  title: string;
  addLabel: string;
  section: OfficialSection;
  hasLeader: boolean;
}

export default function AddOfficialDialog({ title, addLabel, section, hasLeader }: AddOfficialDialogProps) {
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

      await createOfficial(section, { ...data, photo: uploadedPhoto });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officials", section] });
      toast.success("Official added successfully.");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add official. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to {title}</DialogTitle>
        </DialogHeader>

        <OfficialForm
          defaultValues={EMPTY_VALUES}
          leaderDisabled={hasLeader}
          submitLabel="Add Official"
          onSubmit={submitOfficial}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
