"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Ban, IdCard, MapPin, Store, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import MediaLightbox from "@/components/media-lightbox";
import MediaPreviewList from "@/components/media-preview-list";
import MapView from "@/components/map-view";
import { fetchFile } from "@/lib/storage";
import { statusBadgeVariant, handlerLabel, formatDate, formatOperatingHours } from "@/lib/business";
import { getResidentProfile } from "@/actions/resident-profile";
import type { BusinessWithOwner } from "@/actions/business";
import type { MediaItem } from "@/components/file-uploader";

interface ViewSubmissionDialogProps {
  business: BusinessWithOwner;
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

export default function ViewSubmissionDialog({
  business,
  open,
  onOpenChange,
}: ViewSubmissionDialogProps) {
  const photos = business.photos as MediaItem[];
  const permit = business.permit as MediaItem[];

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["resident-profile", business.ownerId],
    queryFn: () => getResidentProfile(business.ownerId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{business.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="business">
          <TabsList className="w-full">
            <TabsTrigger value="business" className="flex-1" aria-label="Business Info">
              <Store />
              <span className="hidden sm:inline">Business Info</span>
            </TabsTrigger>
            <TabsTrigger value="owner" className="flex-1" aria-label="Owner Info">
              <IdCard />
              <span className="hidden sm:inline">Owner Info</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4 pt-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div>
                <Badge variant={statusBadgeVariant(business.status)}>{business.status}</Badge>
              </div>
            </Field>

            {business.handlerName && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                <UserCog className="size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  {handlerLabel(business.status)} <span className="font-semibold">{business.handlerName}</span>
                </p>
              </div>
            )}

            {business.status === "Rejected" &&
              (business.rejectionReason || (business.rejectionAttachments as MediaItem[]).length > 0) && (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2">
                    <Ban className="size-4 text-destructive" />
                    <p className="text-sm font-semibold text-destructive">Rejected</p>
                  </div>

                  {business.rejectionReason && <p className="text-sm">{business.rejectionReason}</p>}

                  {(business.rejectionAttachments as MediaItem[]).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                      <MediaPreviewList items={business.rejectionAttachments as MediaItem[]} />
                    </div>
                  )}
                </div>
              )}

            <Field>
              <FieldLabel>Category</FieldLabel>
              <p className="text-sm">{business.category}</p>
            </Field>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <p className="text-sm text-muted-foreground">{business.description}</p>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Contact Number</FieldLabel>
                <p className="text-sm">{business.contactNumber}</p>
              </Field>
              <Field>
                <FieldLabel>Social Media Link</FieldLabel>
                {business.socialMediaLink ? (
                  <a
                    href={business.socialMediaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline underline-offset-4"
                  >
                    {business.socialMediaLink}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </Field>
            </div>

            <Field>
              <FieldLabel>Operating Hours</FieldLabel>
              <p className="text-sm">{formatOperatingHours(business.operatingHours)}</p>
            </Field>

            {business.location && (
              <Field>
                <FieldLabel>Location</FieldLabel>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span>{business.location.address || "Address unavailable"}</span>
                  </div>
                  <MapView location={business.location} />
                </div>
              </Field>
            )}

            {photos.length > 0 && (
              <Field>
                <FieldLabel>Photos</FieldLabel>
                <MediaPreviewList items={photos} />
              </Field>
            )}

            <Field>
              <FieldLabel>Business Permit</FieldLabel>
              <MediaPreviewList items={permit} />
            </Field>

            <Field>
              <FieldLabel>Submission Date</FieldLabel>
              <p className="text-sm">{formatDate(business.createdAt)}</p>
            </Field>
          </TabsContent>

          <TabsContent value="owner" className="space-y-4 pt-2">
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
                    <p className="text-sm">{business.ownerEmail}</p>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
