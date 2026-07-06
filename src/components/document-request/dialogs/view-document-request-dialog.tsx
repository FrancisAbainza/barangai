"use client";

import Image from "next/image";
import { Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { fetchFile } from "@/lib/storage";
import type { DocumentRequest } from "@/db/schema";
import type { MediaItem } from "@/components/media-uploader";

interface ViewDocumentRequestDialogProps {
  request: DocumentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusBadgeVariant(status: DocumentRequest["status"]) {
  if (status === "Ready for Pickup") return "default";
  if (status === "Rejected") return "destructive";
  return "outline";
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
