"use client";

import { Ban, CheckCircle2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import MediaPreviewList from "@/components/media-preview-list";
import MapView from "@/components/map-view";
import { statusBadgeVariant, priorityBadgeVariant, formatDate } from "@/lib/complaints";
import type { Complaint } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";

interface ViewComplaintDialogProps {
  complaint: Complaint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewComplaintDialog({ complaint, open, onOpenChange }: ViewComplaintDialogProps) {
  const evidence = complaint.evidence as MediaItem[];
  const resolutionAttachments = complaint.resolutionAttachments as MediaItem[];
  const dismissalAttachments = complaint.dismissalAttachments as MediaItem[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{complaint.subject}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <div>
              <Badge variant={statusBadgeVariant(complaint.status)}>{complaint.status}</Badge>
            </div>
          </Field>

          <Field>
            <FieldLabel>Category</FieldLabel>
            <p className="text-sm">{complaint.category}</p>
          </Field>

          <Field>
            <FieldLabel>Priority</FieldLabel>
            <div>
              <Badge variant={priorityBadgeVariant(complaint.priority)}>{complaint.priority}</Badge>
            </div>
          </Field>

          <Field>
            <FieldLabel>Description</FieldLabel>
            <p className="text-sm text-muted-foreground">{complaint.description}</p>
          </Field>

          <Field>
            <FieldLabel>Location</FieldLabel>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>{complaint.location.address || "Address unavailable"}</span>
              </div>
              <MapView location={complaint.location} />
            </div>
          </Field>

          {evidence.length > 0 && (
            <Field>
              <FieldLabel>Evidence</FieldLabel>
              <MediaPreviewList items={evidence} />
            </Field>
          )}

          <Field>
            <FieldLabel>Submission Date</FieldLabel>
            <p className="text-sm">{formatDate(complaint.createdAt)}</p>
          </Field>

          {(complaint.resolutionMessage || resolutionAttachments.length > 0) && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Resolved</p>
              </div>

              {complaint.resolutionMessage && <p className="text-sm">{complaint.resolutionMessage}</p>}

              {resolutionAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                  <MediaPreviewList items={resolutionAttachments} />
                </div>
              )}
            </div>
          )}

          {(complaint.dismissalMessage || dismissalAttachments.length > 0) && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2">
                <Ban className="size-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Dismissed</p>
              </div>

              {complaint.dismissalMessage && <p className="text-sm">{complaint.dismissalMessage}</p>}

              {dismissalAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                  <MediaPreviewList items={dismissalAttachments} />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
