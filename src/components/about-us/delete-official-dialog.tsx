"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { MediaItem } from "@/components/media-uploader";
import { deleteFile } from "@/lib/storage";
import { deleteOfficial } from "@/actions/officials";
import type { Official } from "@/db/schema";

export default function DeleteOfficialDialog({ official }: { official: Official }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: async () => {
      const key = (official.photo as MediaItem[])[0]?.key;
      if (key) await deleteFile(key);
      await deleteOfficial(official.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officials", official.section] });
      toast.success("Official removed successfully.");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove official. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="icon" className="size-7 shrink-0">
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {official.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {official.name} from the list of officials. This action cannot be undone.
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
            {isPending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
