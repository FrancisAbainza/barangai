"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Ban, CalendarCheck, IdCard, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import MediaLightbox from "@/components/media-lightbox";
import MediaPreviewList from "@/components/media-preview-list";
import { fetchFile } from "@/lib/storage";
import { getResidentProfile } from "@/actions/resident-profile";
import type { CourtReservationWithRequester } from "@/actions/court-reservations";
import type { MediaItem } from "@/components/file-uploader";
import {
  statusBadgeVariant,
  handlerLabel,
  formatTimeSlots,
  formatFee,
  formatReservationDate,
  formatSubmissionDate,
} from "@/lib/court-reservations";

interface ViewCourtReservationDialogProps {
  reservation: CourtReservationWithRequester;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ValidIdPreview({ label, item }: { label: string; item: MediaItem | undefined }) {
  if (!item?.key) return null;
  const url = fetchFile(item.key);

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <MediaLightbox src={url} alt={label} className="w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border">
          <Image src={url} alt={label} fill sizes="240px" className="object-cover" unoptimized />
        </div>
      </MediaLightbox>
    </Field>
  );
}

export default function ViewCourtReservationDialog({
  reservation,
  open,
  onOpenChange,
}: ViewCourtReservationDialogProps) {
  const gcashPayment = reservation.gcashPayment as MediaItem[];
  const rejectionAttachments = reservation.rejectionAttachments as MediaItem[];

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["resident-profile", reservation.requesterId],
    queryFn: () => getResidentProfile(reservation.requesterId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Court Reservation</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="reservation">
          <TabsList className="w-full">
            <TabsTrigger value="reservation" className="flex-1" aria-label="Reservation Info">
              <CalendarCheck />
              <span className="hidden sm:inline">Reservation Info</span>
            </TabsTrigger>
            <TabsTrigger value="requester" className="flex-1" aria-label="Requester Info">
              <IdCard />
              <span className="hidden sm:inline">Requester Info</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservation" className="space-y-4 pt-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div>
                <Badge variant={statusBadgeVariant(reservation.status)}>{reservation.status}</Badge>
              </div>
            </Field>

            {reservation.handlerName && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                <UserCog className="size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  {handlerLabel(reservation.status)}{" "}
                  <span className="font-semibold">{reservation.handlerName}</span>
                </p>
              </div>
            )}

            <Field>
              <FieldLabel>Date</FieldLabel>
              <p className="text-sm">{formatReservationDate(reservation.date)}</p>
            </Field>

            <Field>
              <FieldLabel>Time Slots</FieldLabel>
              <p className="text-sm">{formatTimeSlots(reservation.timeSlots)}</p>
            </Field>

            <Field>
              <FieldLabel>Purpose</FieldLabel>
              <p className="text-sm">{reservation.purpose}</p>
            </Field>

            <Field>
              <FieldLabel>Total Amount</FieldLabel>
              <p className="text-sm">{formatFee(Number(reservation.totalAmount))}</p>
            </Field>

            {gcashPayment.length > 0 && (
              <Field>
                <FieldLabel>GCash Payment</FieldLabel>
                <MediaPreviewList items={gcashPayment} />
              </Field>
            )}

            <Field>
              <FieldLabel>Submission Date</FieldLabel>
              <p className="text-sm">{formatSubmissionDate(reservation.createdAt)}</p>
            </Field>

            {(reservation.rejectionReason || rejectionAttachments.length > 0) && (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2">
                  <Ban className="size-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">Rejected</p>
                </div>

                {reservation.rejectionReason && <p className="text-sm">{reservation.rejectionReason}</p>}

                {rejectionAttachments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                    <MediaPreviewList items={rejectionAttachments} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

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
                    <p className="text-sm">{reservation.requesterEmail}</p>
                  </Field>
                  <Field>
                    <FieldLabel>Birthdate</FieldLabel>
                    <p className="text-sm">{formatReservationDate(profile.birthdate)}</p>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
