"use client";

import Image from "next/image";
import { Ban, Download, FileText, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { fetchFile } from "@/lib/storage";
import { statusBadgeVariant, formatDate } from "@/lib/document-requests";
import type { DocumentRequest } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";

interface ViewDocumentRequestDialogProps {
  request: DocumentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MediaPreviewList({ items }: { items: MediaItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const url = item.key ? fetchFile(item.key) : "";
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent"
          >
            {item.type === "image" ? (
              <div className="relative size-12 shrink-0 overflow-hidden rounded">
                <Image src={url} alt={item.name} fill sizes="48px" className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
            )}
            <span className="flex-1 truncate text-sm">{item.name}</span>
            <Download className="size-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}

export default function ViewDocumentRequestDialog({
  request,
  open,
  onOpenChange,
}: ViewDocumentRequestDialogProps) {
  const paymentReceipt = request.paymentReceipt as MediaItem[];
  const supportingDocuments = request.supportingDocuments as MediaItem[];
  const pickupAttachments = request.pickupAttachments as MediaItem[];
  const rejectionAttachments = request.rejectionAttachments as MediaItem[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.documentType} Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <div>
              <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
            </div>
          </Field>

          <Field>
            <FieldLabel>Purpose</FieldLabel>
            <p className="text-sm">
              {request.purpose === "Other" ? request.otherPurpose : request.purpose}
            </p>
          </Field>

          {request.situationDescription && (
            <Field>
              <FieldLabel>Brief Description of the Situation</FieldLabel>
              <p className="text-sm text-muted-foreground">{request.situationDescription}</p>
            </Field>
          )}

          {paymentReceipt.length > 0 && (
            <Field>
              <FieldLabel>Payment Receipt</FieldLabel>
              <MediaPreviewList items={paymentReceipt} />
            </Field>
          )}

          {supportingDocuments.length > 0 && (
            <Field>
              <FieldLabel>Supporting Documents</FieldLabel>
              <MediaPreviewList items={supportingDocuments} />
            </Field>
          )}

          <Field>
            <FieldLabel>Receive Document Via</FieldLabel>
            <p className="text-sm">{request.receiveVia}</p>
          </Field>

          <Field>
            <FieldLabel>Submission Date</FieldLabel>
            <p className="text-sm">{formatDate(request.createdAt)}</p>
          </Field>

          {(request.pickupMessage || pickupAttachments.length > 0) && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-primary" />
                <p className="text-sm font-semibold text-primary">Ready for Pickup</p>
              </div>

              {request.pickupMessage && <p className="text-sm">{request.pickupMessage}</p>}

              {pickupAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                  <MediaPreviewList items={pickupAttachments} />
                </div>
              )}
            </div>
          )}

          {(request.rejectionMessage || rejectionAttachments.length > 0) && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2">
                <Ban className="size-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Rejected</p>
              </div>

              {request.rejectionMessage && <p className="text-sm">{request.rejectionMessage}</p>}

              {rejectionAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                  <MediaPreviewList items={rejectionAttachments} />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
