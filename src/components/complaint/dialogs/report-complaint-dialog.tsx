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
  createComplaint,
  findSimilarComplaints,
  followComplaint,
  type SimilarComplaint,
} from "@/actions/complaints";
import { uploadFile } from "@/lib/storage";
import { formatDate, statusBadgeVariant } from "@/lib/complaints";
import ComplaintForm from "../forms/complaint-form";

interface ReportComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// A submission near existing complaints, held until the resident says whether one of them is the
// same issue.
type PendingSubmission = {
  data: ComplaintFormValues;
  insights: ComplaintInsights;
  matches: SimilarComplaint[];
};

// Evidence is only uploaded once the complaint is actually being created, so following an
// existing complaint instead doesn't leave orphaned files in R2.
async function createWithEvidence(data: ComplaintFormValues, insights: ComplaintInsights) {
  const evidence = await Promise.all(
    data.evidence.map(async (item) => {
      if (!item.file) return item;
      const key = await uploadFile(item.file, "complaints/evidence");
      return { ...item, key, file: undefined };
    })
  );

  await createComplaint({
    subject: data.subject,
    description: data.description,
    location: data.location,
    evidence,
    ...insights,
  });
}

export default function ReportComplaintDialog({ open, onOpenChange }: ReportComplaintDialogProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingSubmission | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setPending(null);
    onOpenChange(nextOpen);
  }

  function handleCreated() {
    queryClient.invalidateQueries({ queryKey: ["complaints"] });
    toast.success("Complaint submitted successfully.");
    handleOpenChange(false);
  }

  const { mutateAsync: submitComplaint } = useMutation({
    mutationFn: async (data: ComplaintFormValues): Promise<PendingSubmission | null> => {
      const [insights, matches] = await Promise.all([
        analyzeComplaint({ subject: data.subject, description: data.description }),
        // The duplicate check is a convenience, so it failing shouldn't stop the resident from filing.
        findSimilarComplaints(data.location).catch((): SimilarComplaint[] => []),
      ]);
      if (matches.length > 0) return { data, insights, matches };

      await createWithEvidence(data, insights);
      return null;
    },
    onSuccess: (submission) => {
      if (submission) setPending(submission);
      else handleCreated();
    },
    onError: () => {
      toast.error("Failed to submit complaint. Please try again.");
    },
  });

  const { mutate: submitAsNew, isPending: isSubmittingAsNew } = useMutation({
    mutationFn: (submission: PendingSubmission) => createWithEvidence(submission.data, submission.insights),
    onSuccess: handleCreated,
    onError: () => {
      toast.error("Failed to submit complaint. Please try again.");
    },
  });

  const {
    mutate: follow,
    isPending: isFollowing,
    variables: followingId,
  } = useMutation({
    mutationFn: (id: number) => followComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Added to My Complaints. You'll be notified when its status changes.");
      handleOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to add the complaint. Please try again.");
    },
  });

  const isBusy = isSubmittingAsNew || isFollowing;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pending ? "Is this the same issue?" : "Report a Complaint"}</DialogTitle>
          {pending && (
            <DialogDescription>
              {pending.matches.length === 1 ? "A complaint has " : "Complaints have "} already been filed near the
              location you picked. If it&apos;s the same issue, add it to My Complaints instead and you&apos;ll be
              notified whenever its status changes. Your own report won&apos;t be submitted.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Stays mounted while the matches are shown, so going back keeps what the resident entered. */}
        <div className={pending ? "hidden" : undefined}>
          <ComplaintForm
            onSubmit={async (data) => {
              await submitComplaint(data);
            }}
            onCancel={() => handleOpenChange(false)}
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
                  onClick={() => follow(match.id)}
                >
                  {isFollowing && followingId === match.id ? (
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
              <Button className="gap-2" disabled={isBusy} onClick={() => submitAsNew(pending)}>
                {isSubmittingAsNew ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Submit as New Complaint
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
