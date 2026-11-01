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
import { deleteKnowledgeBaseDocument, type KnowledgeBaseDocumentInfo } from "@/actions/knowledge-base";

export default function DeleteKnowledgeBaseDocumentDialog({ kbDocument }: { kbDocument: KnowledgeBaseDocumentInfo }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: handleDelete, isPending } = useMutation({
    mutationFn: () => deleteKnowledgeBaseDocument(kbDocument.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base-documents"] });
      toast.success(`"${kbDocument.fileName}" was removed from the knowledge base.`);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove the document. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="icon" className="size-7 shrink-0" aria-label={`Remove ${kbDocument.fileName}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {kbDocument.fileName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The AI Assistant will no longer answer questions from this document. This action cannot be undone.
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
