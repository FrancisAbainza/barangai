"use client";

import Image from "next/image";
import { ExternalLink, MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Field, FieldLabel } from "@/components/ui/field";
import MediaLightbox from "@/components/media-lightbox";
import MapView from "@/components/map-view";
import { fetchFile } from "@/lib/storage";
import { formatOperatingHours } from "@/lib/business";
import type { BusinessWithOwner } from "@/actions/business";
import type { MediaItem } from "@/components/file-uploader";

interface ViewBusinessDialogProps {
  business: BusinessWithOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewBusinessDialog({
  business,
  open,
  onOpenChange,
}: ViewBusinessDialogProps) {
  const photos = (business.photos as MediaItem[]).filter((item) => item.type === "image" && item.key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl **:data-[slot=dialog-close]:bg-black/50 **:data-[slot=dialog-close]:text-white **:data-[slot=dialog-close]:hover:bg-black/70"
      >
        {photos.length > 0 ? (
          <Carousel opts={{ loop: photos.length > 1 }} className="w-full">
            <CarouselContent className="ml-0">
              {photos.map((photo, index) => {
                const url = fetchFile(photo.key!);
                return (
                  <CarouselItem key={index} className="pl-0">
                    <MediaLightbox src={url} alt={photo.name} className="w-full">
                      <div className="relative aspect-video w-full bg-muted">
                        <Image
                          src={url}
                          alt={photo.name}
                          fill
                          sizes="(min-width: 640px) 42rem, 100vw"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </MediaLightbox>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <Store className="size-10 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-4 p-6">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-2xl font-bold">{business.name}</DialogTitle>
            <div>
              <Badge variant="outline">{business.category}</Badge>
            </div>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">{business.description}</p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`tel:${business.contactNumber}`}>
                <Phone className="size-4" />
                {business.contactNumber}
              </a>
            </Button>
            {business.socialMediaLink && (
              <Button asChild variant="outline">
                <a href={business.socialMediaLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Visit Page
                </a>
              </Button>
            )}
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
                <MapView location={business.location} className="h-96" />
              </div>
            </Field>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
