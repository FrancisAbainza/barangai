"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ComplaintDismissalFormValues } from "@/schemas/complaint-dismissal-schema";
import ComplaintDismissalForm from "@/components/complaint/forms/complaint-dismissal-form";
import { uploadFile } from "@/lib/storage";
import { setComplaintStatus } from "@/actions/complaints";
import type { Complaint } from "@/db/schema";

interface AdminDismissComplaintDialogProps {
  complaint: Complaint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminDismissComplaintDialog({
  complaint,
  open,
  onOpenChange,
}: AdminDismissComplaintDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitDismissal } = useMutation({
    mutationFn: async (data: ComplaintDismissalFormValues) => {
      const attachments = await Promise.all(
        data.attachments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "complaints/dismissal-attachments");
          return { ...item, key, file: undefined };
        })
      );

      await setComplaintStatus(complaint.id, "Dismissed", {
        message: data.message,
        attachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint dismissed.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dismissal Details</DialogTitle>
        </DialogHeader>

        <ComplaintDismissalForm onSubmit={submitDismissal} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
