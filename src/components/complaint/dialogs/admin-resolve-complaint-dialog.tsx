"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ComplaintResolutionFormValues } from "@/schemas/complaint-resolution-schema";
import ComplaintResolutionForm from "@/components/complaint/forms/complaint-resolution-form";
import { uploadFile } from "@/lib/storage";
import { setComplaintStatus } from "@/actions/complaints";
import type { Complaint } from "@/db/schema";

interface AdminResolveComplaintDialogProps {
  complaint: Complaint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminResolveComplaintDialog({
  complaint,
  open,
  onOpenChange,
}: AdminResolveComplaintDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitResolution } = useMutation({
    mutationFn: async (data: ComplaintResolutionFormValues) => {
      const attachments = await Promise.all(
        data.attachments.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "complaints/resolution-attachments");
          return { ...item, key, file: undefined };
        })
      );

      await setComplaintStatus(complaint.id, "Resolved", {
        message: data.message,
        attachments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint marked as Resolved.");
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
          <DialogTitle>Resolution Details</DialogTitle>
        </DialogHeader>

        <ComplaintResolutionForm onSubmit={submitResolution} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
