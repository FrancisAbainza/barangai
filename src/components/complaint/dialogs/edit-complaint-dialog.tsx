"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListPlus, Loader2, MapPin, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ComplaintFormValues, ComplaintInsights } from "@/schemas/complaint-schema";
import {
  analyzeComplaint,
  findSimilarComplaints,
  resolveDuplicateComplaint,
  updateComplaint,
  type ComplaintWithComplainant,
  type SimilarComplaint,
} from "@/actions/complaints";
import { deleteRemovedFiles, uploadAddedFiles } from "@/lib/storage";
import { formatDate, statusBadgeVariant } from "@/lib/complaints";
import type { MediaItem } from "@/components/file-uploader";
import ComplaintForm from "../forms/complaint-form";

interface EditComplaintDialogProps {
  complaint: ComplaintWithComplainant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PendingEdit = {
  data: ComplaintFormValues;
  insights: ComplaintInsights;
  matches: SimilarComplaint[];
};

async function saveEditedComplaint(
  complaint: ComplaintWithComplainant,
  data: ComplaintFormValues,
  insights: ComplaintInsights
) {
  const evidence = await uploadAddedFiles(data.evidence, "complaints/evidence");
  const result = await updateComplaint(complaint.id, { ...data, evidence, ...insights });
  if (result?.error) throw new Error(result.error);
  return deleteRemovedFiles(complaint.evidence as MediaItem[], evidence);
}

export default function EditComplaintDialog({
  complaint,
  open,
  onOpenChange,
}: EditComplaintDialogProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingEdit | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setPending(null);
    onOpenChange(nextOpen);
  }

  async function handleSaved(cleanupFailed: boolean) {
    await queryClient.invalidateQueries({ queryKey: ["complaints"] });
    toast.success("Complaint updated successfully.");
    if (cleanupFailed) toast.error("Some removed evidence files could not be deleted.");
    handleOpenChange(false);
  }

  const { mutateAsync: submitEdit } = useMutation({
    mutationFn: async (data: ComplaintFormValues) => {
      const [insights, matches] = await Promise.all([
        analyzeComplaint({ subject: data.subject, description: data.description }),
        // The duplicate check is a convenience, so it failing shouldn't block an edit.
        findSimilarComplaints(data.location).catch((): SimilarComplaint[] => []),
      ]);
      if (matches.length > 0) return { pending: { data, insights, matches } };

      return { cleanupFailed: await saveEditedComplaint(complaint, data, insights) };
    },
    onSuccess: (result) => {
      if (result.pending) setPending(result.pending);
      else void handleSaved(result.cleanupFailed);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update complaint. Please try again.");
    },
  });

  const { mutate: saveAsSeparate, isPending: isSavingAsSeparate } = useMutation({
    mutationFn: (submission: PendingEdit) =>
      saveEditedComplaint(complaint, submission.data, submission.insights),
    onSuccess: (cleanupFailed) => void handleSaved(cleanupFailed),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update complaint. Please try again.");
    },
  });

  const {
    mutate: confirmDuplicate,
    isPending: isConfirmingDuplicate,
    variables: confirmingDuplicateId,
  } = useMutation({
    mutationFn: async (match: SimilarComplaint) => {
      await resolveDuplicateComplaint(complaint.id, match.id);
      return deleteRemovedFiles(complaint.evidence as MediaItem[], []);
    },
    onSuccess: async (cleanupFailed) => {
      await queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Your complaint was deleted and you were added to the existing complaint.");
      if (cleanupFailed) toast.error("Some removed evidence files could not be deleted.");
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to confirm the duplicate. Please try again.");
    },
  });

  const isBusy = isSavingAsSeparate || isConfirmingDuplicate;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pending ? "Is this the same issue?" : "Edit Complaint"}</DialogTitle>
          {pending && (
            <DialogDescription>
              Complaints have already been filed near the location you picked. If it&apos;s the same issue, add
              the existing complaint to My Complaints. Your edited complaint will be deleted, and its followers
              will be notified.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className={pending ? "hidden" : undefined}>
          <ComplaintForm
            defaultValues={{
              subject: complaint.subject,
              description: complaint.description,
              location: complaint.location,
              evidence: complaint.evidence as MediaItem[],
            }}
            onSubmit={async (data) => {
              await submitEdit(data);
            }}
            onCancel={() => handleOpenChange(false)}
            submitLabel="Save Changes"
          />
        </div>

        {pending && (
          <div className="space-y-4">
            {pending.matches.map((match) => (
              <div key={match.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium wrap-break-word">{match.subject}</p>
                  <Badge variant={statusBadgeVariant(match.status)}>{match.status}</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground wrap-break-word">{match.description}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-px size-3.5 shrink-0" />
                    <span>
                      {match.address || "Address unavailable"} (about{" "}
                      {Math.max(10, Math.round(match.distanceMeters / 10) * 10)} m away)
                    </span>
                  </p>
                  <p>
                    {match.category} · Filed {formatDate(match.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full gap-2"
                  disabled={isBusy}
                  onClick={() => confirmDuplicate(match)}
                >
                  {isConfirmingDuplicate && confirmingDuplicateId?.id === match.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ListPlus className="size-4" />
                  )}
                  This is the same issue
                </Button>
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isBusy} onClick={() => setPending(null)}>
                Back
              </Button>
              <Button className="gap-2" disabled={isBusy} onClick={() => saveAsSeparate(pending)}>
                {isSavingAsSeparate ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Save as Separate Complaint
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
