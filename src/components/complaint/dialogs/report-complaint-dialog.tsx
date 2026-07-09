"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ComplaintFormValues } from "@/schemas/complaint-schema";
import { analyzeComplaint, createComplaint } from "@/actions/complaints";
import { uploadFile } from "@/lib/storage";
import ComplaintForm from "../forms/complaint-form";

interface ReportComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReportComplaintDialog({ open, onOpenChange }: ReportComplaintDialogProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: submitComplaint } = useMutation({
    mutationFn: async (data: ComplaintFormValues) => {
      const [insights, evidence] = await Promise.all([
        analyzeComplaint({ subject: data.subject, description: data.description }),
        Promise.all(
          data.evidence.map(async (item) => {
            if (!item.file) return item;
            const key = await uploadFile(item.file, "complaints/evidence");
            return { ...item, key, file: undefined };
          })
        ),
      ]);

      await createComplaint({
        subject: data.subject,
        description: data.description,
        location: data.location,
        evidence,
        ...insights,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint submitted successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to submit complaint. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Complaint</DialogTitle>
        </DialogHeader>

        <ComplaintForm onSubmit={submitComplaint} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
