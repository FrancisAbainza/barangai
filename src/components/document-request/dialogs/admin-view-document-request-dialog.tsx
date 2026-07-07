"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Ban, Download, FileText, IdCard, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import ImageLightbox from "@/components/image-lightbox";
import { fetchFile } from "@/lib/storage";
import { statusBadgeVariant, formatDate } from "@/lib/document-requests";
import { getResidentProfile } from "@/actions/resident-profile";
import type { DocumentRequestWithRequester } from "@/actions/document-requests";
import type { MediaItem } from "@/components/file-uploader";

interface AdminViewDocumentRequestDialogProps {
  request: DocumentRequestWithRequester;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MediaPreviewList({ items }: { items: MediaItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const url = item.key ? fetchFile(item.key) : "";

        if (item.type === "image") {
          return (
            <ImageLightbox key={index} src={url} alt={item.name} className="w-full">
              <div className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent">
                <div className="relative size-12 shrink-0 overflow-hidden rounded">
                  <Image src={url} alt={item.name} fill sizes="48px" className="object-cover" unoptimized />
                </div>
                <span className="flex-1 truncate text-sm">{item.name}</span>
              </div>
            </ImageLightbox>
          );
        }

        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <span className="flex-1 truncate text-sm">{item.name}</span>
            <Download className="size-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}

function ValidIdPreview({ label, item }: { label: string; item: MediaItem | undefined }) {
  if (!item?.key) return null;
  const url = fetchFile(item.key);

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <ImageLightbox src={url} alt={label} className="w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border">
          <Image src={url} alt={label} fill sizes="240px" className="object-cover" unoptimized />
        </div>
      </ImageLightbox>
    </Field>
  );
}

export default function AdminViewDocumentRequestDialog({
  request,
  open,
  onOpenChange,
}: AdminViewDocumentRequestDialogProps) {
  const paymentReceipt = request.paymentReceipt as MediaItem[];
  const supportingDocuments = request.supportingDocuments as MediaItem[];
  const pickupAttachments = request.pickupAttachments as MediaItem[];
  const rejectionAttachments = request.rejectionAttachments as MediaItem[];

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["resident-profile", request.requesterId],
    queryFn: () => getResidentProfile(request.requesterId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{request.documentType} Request</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="requester">
          <TabsList className="w-full">
            <TabsTrigger value="requester" className="flex-1">
              Requester Info
            </TabsTrigger>
            <TabsTrigger value="request" className="flex-1">
              Request Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requester" className="space-y-4 pt-2">
            {isProfileLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : !profile ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <IdCard className="size-6" />
                This resident hasn&apos;t completed their profile yet.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Full Name</FieldLabel>
                    <p className="text-sm">
                      {[profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")}
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <p className="text-sm">{request.requesterEmail}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Birthdate</FieldLabel>
                    <p className="text-sm">{formatDate(profile.birthdate)}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Sex</FieldLabel>
                    <p className="text-sm">{profile.sex}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Civil Status</FieldLabel>
                    <p className="text-sm">{profile.civilStatus}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Contact Number</FieldLabel>
                    <p className="text-sm">{profile.contactNumber}</p>
                  </Field>
                </div>

                <Field>
                  <FieldLabel>Address</FieldLabel>
                  <p className="text-sm">{profile.address}</p>
                </Field>

                <Field>
                  <FieldLabel>Valid ID Type</FieldLabel>
                  <p className="text-sm">{profile.validIdType}</p>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <ValidIdPreview
                    label="Valid ID (Front)"
                    item={(profile.validIdFront as MediaItem[])[0]}
                  />
                  <ValidIdPreview label="Valid ID (Back)" item={(profile.validIdBack as MediaItem[])[0]} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="request" className="space-y-4 pt-2">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
